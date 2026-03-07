import { Command } from "commander";
import * as p from "@clack/prompts";
import fs from "fs";
import { ApiClient } from "../api.js";
import { getAuth, getServerUrl } from "../config.js";

export const uploadCommand = new Command("upload")
  .description("Create flashcards from a JSON file or inline")
  .argument("[file]", "JSON file with cards (array of {front, back, tags?})")
  .option("--front <text>", "Card front (for single card)")
  .option("--back <text>", "Card back (for single card)")
  .option("--tags <tags>", "Comma-separated tags")
  .option("--api-key <key>", "API key")
  .option("--server <url>", "Server URL")
  .action(async (file, opts) => {
    const api = new ApiClient({
      auth: getAuth(opts.apiKey),
      serverUrl: getServerUrl(opts.server),
    });

    const cards: { front: string; back: string; tags?: string[] }[] = [];

    if (file) {
      const raw = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      cards.push(...arr);
    } else if (opts.front) {
      if (!opts.back) {
        p.log.error("--back is required when using --front");
        return process.exit(1);
      }
      cards.push({
        front: opts.front,
        back: opts.back,
        tags: opts.tags?.split(",").map((t: string) => t.trim()),
      });
    } else {
      // Interactive mode
      const front = await p.text({ message: "Card front (question):", validate: (v) => v.length === 0 ? "Required" : undefined });
      if (p.isCancel(front)) return process.exit(0);
      const back = await p.text({ message: "Card back (answer):", validate: (v) => v.length === 0 ? "Required" : undefined });
      if (p.isCancel(back)) return process.exit(0);
      const tags = await p.text({ message: "Tags (comma-separated):", placeholder: "Optional" });
      if (p.isCancel(tags)) return process.exit(0);

      cards.push({
        front: front as string,
        back: back as string,
        tags: (tags as string) ? (tags as string).split(",").map(t => t.trim()) : undefined,
      });
    }

    const spinner = p.spinner();
    spinner.start(`Uploading ${cards.length} card${cards.length === 1 ? "" : "s"}`);

    try {
      if (cards.length === 1) {
        await api.createCard(cards[0]);
      } else {
        await api.batchCreateCards(cards);
      }
      spinner.stop(`Uploaded ${cards.length} card${cards.length === 1 ? "" : "s"}`);
    } catch (err: any) {
      spinner.stop("Upload failed");
      p.log.error(err.message);
      process.exit(1);
    }
  });
