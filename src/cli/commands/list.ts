import { Command } from "commander";
import * as p from "@clack/prompts";
import { ApiClient } from "../api.js";
import { getAuth, getServerUrl } from "../config.js";
import type { Card } from "../../shared/types.js";

function formatCard(card: Card, index: number): string {
  const tags = card.tags?.length ? ` [${card.tags.join(", ")}]` : "";
  const status = card.status === "active" ? "" : ` (${card.status})`;
  const front = card.front.length > 80 ? card.front.slice(0, 77) + "..." : card.front;
  return `  ${index + 1}. ${front}${tags}${status}`;
}

export const listCommand = new Command("list")
  .description("List flashcards")
  .option("-s, --status <status>", "Filter by status (active, triaging, suspended)")
  .option("-q, --query <text>", "Search cards")
  .option("--json", "Output as JSON")
  .option("--api-key <key>", "API key")
  .option("--server <url>", "Server URL")
  .action(async (opts) => {
    const api = new ApiClient({
      auth: getAuth(opts.apiKey),
      serverUrl: getServerUrl(opts.server),
    });

    let cards: Card[];
    if (opts.json) {
      cards = await api.listCards({ status: opts.status, q: opts.query });
    } else {
      const spinner = p.spinner();
      spinner.start("Fetching cards");
      cards = await api.listCards({ status: opts.status, q: opts.query });
      spinner.stop(`Found ${cards.length} card${cards.length === 1 ? "" : "s"}`);
    }

    if (cards.length === 0) return;

    if (opts.json) {
      console.log(JSON.stringify(cards, null, 2));
      return;
    }

    for (let i = 0; i < cards.length; i++) {
      console.log(formatCard(cards[i], i));
    }
  });
