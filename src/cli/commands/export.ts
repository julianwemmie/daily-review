import { Command } from "commander";
import * as p from "@clack/prompts";
import fs from "fs";
import path from "path";
import { ApiClient } from "../api.js";
import { getAuth, getServerUrl } from "../config.js";

export const exportCommand = new Command("export")
  .description("Export all flashcards to a JSON file")
  .option("-o, --output <file>", "Output file path (default: daily-review-export.json)")
  .option("--include-scheduling", "Include FSRS scheduling data (default: true)")
  .option("--no-include-scheduling", "Exclude FSRS scheduling data")
  .option("--include-review-history", "Include review history (default: true)")
  .option("--no-include-review-history", "Exclude review history")
  .option("--api-key <key>", "API key")
  .option("--server <url>", "Server URL")
  .action(async (opts) => {
    const api = new ApiClient({
      auth: getAuth(opts.apiKey),
      serverUrl: getServerUrl(opts.server),
    });

    const spinner = p.spinner();
    spinner.start("Exporting cards...");

    try {
      const data = await api.exportCards({
        includeScheduling: opts.includeScheduling,
        includeReviewHistory: opts.includeReviewHistory,
      });

      const outputPath = path.resolve(opts.output ?? "daily-review-export.json");
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

      spinner.stop(
        `Exported ${data.cards.length} card${data.cards.length !== 1 ? "s" : ""} to ${outputPath}`,
      );
    } catch (err: any) {
      spinner.stop("Failed");
      p.log.error(err.message);
      process.exit(1);
    }
  });
