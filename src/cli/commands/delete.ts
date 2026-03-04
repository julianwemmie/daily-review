import { Command } from "commander";
import * as p from "@clack/prompts";
import { ApiClient } from "../api.js";
import { getAuth, getServerUrl } from "../config.js";

export const deleteCommand = new Command("delete")
  .description("Delete flashcards by ID")
  .argument("<ids...>", "Card IDs to delete")
  .option("--yes", "Skip confirmation")
  .option("--api-key <key>", "API key")
  .option("--server <url>", "Server URL")
  .action(async (ids: string[], opts) => {
    const api = new ApiClient({
      auth: getAuth(opts.apiKey),
      serverUrl: getServerUrl(opts.server),
    });

    if (!opts.yes) {
      const confirmed = await p.confirm({
        message: `Delete ${ids.length} card${ids.length === 1 ? "" : "s"}?`,
      });
      if (p.isCancel(confirmed) || !confirmed) {
        p.log.info("Cancelled.");
        return;
      }
    }

    const spinner = p.spinner();
    spinner.start("Deleting cards");

    if (ids.length === 1) {
      await api.deleteCard(ids[0]);
    } else {
      await api.batchDeleteCards(ids);
    }

    spinner.stop(`Deleted ${ids.length} card${ids.length === 1 ? "" : "s"}`);
  });
