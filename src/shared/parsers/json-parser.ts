import type { ImportedCard, ParseResult } from "./types.js";

interface ExportedCard {
  front?: string;
  back?: string | null;
  tags?: string[] | null;
  status?: string;
}

interface ExportPayload {
  version?: number;
  cards?: ExportedCard[];
}

/**
 * Parse a Daily Review JSON export file back into ImportedCards.
 * Accepts either a string or ArrayBuffer.
 */
export function parseJsonFile(input: ArrayBuffer | string): ParseResult {
  const text = typeof input === "string"
    ? input
    : new TextDecoder().decode(input);

  let data: ExportPayload;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file. Could not parse the file contents.");
  }

  if (!data.cards || !Array.isArray(data.cards)) {
    throw new Error('Invalid export file. Expected a "cards" array.');
  }

  const warnings: string[] = [];
  const cards: ImportedCard[] = [];

  for (let i = 0; i < data.cards.length; i++) {
    const raw = data.cards[i];
    if (!raw.front || typeof raw.front !== "string") {
      warnings.push(`Card ${i + 1}: skipped — missing "front" field.`);
      continue;
    }

    cards.push({
      front: raw.front,
      back: raw.back ?? "",
      tags: Array.isArray(raw.tags) ? raw.tags : [],
    });
  }

  return { cards, warnings, format: "json" };
}
