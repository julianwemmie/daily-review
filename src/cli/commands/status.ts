import { Command } from "commander";
import * as p from "@clack/prompts";
import { ApiClient } from "../api.js";
import { getAuth, getServerUrl } from "../config.js";

export const statusCommand = new Command("status")
  .description("Show card counts and review status")
  .option("--json", "Output as JSON")
  .option("--api-key <key>", "API key")
  .option("--server <url>", "Server URL")
  .action(async (opts) => {
    const api = new ApiClient({
      auth: getAuth(opts.apiKey),
      serverUrl: getServerUrl(opts.server),
    });

    const spinner = p.spinner();
    spinner.start("Fetching status");

    const counts = await api.getCounts();

    spinner.stop("Done");

    if (opts.json) {
      console.log(JSON.stringify(counts, null, 2));
      return;
    }

    console.log(`  New cards to triage: ${counts.new}`);
    console.log(`  Cards due for review: ${counts.due}`);
  });
