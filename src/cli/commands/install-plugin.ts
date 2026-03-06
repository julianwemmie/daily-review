import { Command } from "commander";
import * as p from "@clack/prompts";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGIN_NAME = "amber-flashcards";

function getPluginDest(local: boolean): string {
  if (local) {
    return path.join(process.cwd(), ".claude", "plugins", PLUGIN_NAME);
  }
  return path.join(os.homedir(), ".claude", "plugins", PLUGIN_NAME);
}

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      // Preserve executable bit for scripts
      if (entry.name.endsWith(".sh")) {
        fs.chmodSync(destPath, 0o755);
      }
    }
  }
}

export const installPluginCommand = new Command("install-plugin")
  .description("Install the Amber auto-flashcard Claude Code plugin")
  .option("--local", "Install into the current repo (.claude/plugins/) instead of globally")
  .action(async (opts) => {
    const dest = getPluginDest(opts.local);

    // Find the plugin source directory (shipped alongside the CLI)
    const pluginSrc = path.resolve(__dirname, "../../plugin");
    // When running from source (tsx), __dirname is src/cli/commands
    const altSrc = path.resolve(__dirname, "../../../plugin");
    const src = fs.existsSync(pluginSrc) ? pluginSrc : altSrc;

    if (!fs.existsSync(src) || !fs.existsSync(path.join(src, ".claude-plugin", "plugin.json"))) {
      p.log.error("Plugin source files not found. Reinstall amber-cards.");
      process.exit(1);
    }

    if (fs.existsSync(dest)) {
      const overwrite = await p.confirm({
        message: "Plugin already installed. Overwrite?",
      });
      if (p.isCancel(overwrite) || !overwrite) {
        p.log.info("Cancelled.");
        return;
      }
      fs.rmSync(dest, { recursive: true });
    }

    const spinner = p.spinner();
    spinner.start("Installing plugin");

    copyDirSync(src, dest);

    // Ship a default config if one doesn't already exist
    const configPath = path.join(dest, "config.json");
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify({
        debounce_minutes: 10,
        included_directories: [],
        excluded_directories: [],
      }, null, 2) + "\n");
    }

    spinner.stop(`Plugin installed to ${dest}`);
    p.log.success("Auto-flashcard generation is now active.");

    if (opts.local) {
      p.log.info("Installed for this repo only. Add .claude/plugins/ to .gitignore if needed.");
    }

    p.log.info(`Configure at ${configPath}`);
  });
