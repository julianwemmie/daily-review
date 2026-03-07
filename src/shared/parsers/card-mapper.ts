import type { ImportedCard } from "./types.js";

/** Max cards per batch-create API call (must match server validation). */
export const IMPORT_BATCH_SIZE = 500;

/** Max import file size in bytes (500 MB). */
export const MAX_IMPORT_FILE_SIZE = 500 * 1024 * 1024;

/** Shape expected by POST /api/cards/batch-create */
export interface CardCreatePayload {
  front: string;
  back: string;
  tags?: string[];
}

/**
 * Map imported cards to the shape the API expects for batch creation.
 *
 * When `preserveScheduling` is false (default), cards are created fresh and
 * the server assigns default FSRS values. When true, we still send the same
 * payload (the API doesn't accept scheduling overrides), but the option is
 * kept for future extension.
 */
export function mapImportedCards(
  cards: ImportedCard[],
  opts?: { extraTags?: string[]; preserveScheduling?: boolean },
): CardCreatePayload[] {
  const extra = opts?.extraTags ?? [];

  return cards.map((card) => {
    const tags = [...card.tags, ...extra].filter(Boolean);
    return {
      front: card.front,
      back: card.back,
      tags: tags.length > 0 ? tags : undefined,
    };
  });
}
