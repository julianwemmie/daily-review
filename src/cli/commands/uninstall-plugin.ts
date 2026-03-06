import { Command } from "commander";
import * as p from "@clack/prompts";
import fs from "fs";
import path from "path";
import os from "os";

const PLUGIN_NAME = "amber-flashcards";

function getPluginDest(local: boolean): string {
  if (local) {
    return path.join(process.cwd(), ".claude", "plugins", PLUGIN_NAME);
  }
  return path.join(os.homedir(), ".claude", "plugins", PLUGIN_NAME);
}

export const uninstallPluginCommand = new Command("uninstall-plugin")
  .description("Remove the Amber auto-flashcard Claude Code plugin")
  .option("--local", "Remove from the current repo instead of globally")
  .option("--yes", "Skip confirmation")
  .action(async (opts) => {
    let dest = getPluginDest(opts.local);

    // If not found globally, check locally as a fallback
    if (!opts.local && !fs.existsSync(dest)) {
      const localDest = getPluginDest(true);
      if (fs.existsSync(localDest)) {
        dest = localDest;
        p.log.info("Plugin not found globally, found local install.");
      }
    }

    if (!fs.existsSync(dest)) {
      p.log.info("Plugin is not installed.");
      return;
    }

    if (!opts.yes) {
      const confirmed = await p.confirm({
        message: `Remove the auto-flashcard plugin${opts.local ? " from this repo" : ""}?`,
      });
      if (p.isCancel(confirmed) || !confirmed) {
        p.log.info("Cancelled.");
        return;
      }
    }

    // Removes plugin dir including config, locks, and logs
    fs.rmSync(dest, { recursive: true });

    p.log.success("Plugin uninstalled.");
  });
