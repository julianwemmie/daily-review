import { describe, it, expect } from "vitest";
import { mapImportedCards } from "../../../src/shared/parsers/card-mapper.js";
import type { ImportedCard } from "../../../src/shared/parsers/types.js";

describe("mapImportedCards", () => {
  const cards: ImportedCard[] = [
    { front: "What is 2+2?", back: "4", tags: ["math"] },
    { front: "Capital of France?", back: "Paris", tags: ["geography"] },
  ];

  it("maps basic cards to API payload", () => {
    const result = mapImportedCards(cards);
    expect(result).toEqual([
      { front: "What is 2+2?", back: "4", tags: ["math"] },
      { front: "Capital of France?", back: "Paris", tags: ["geography"] },
    ]);
  });

  it("merges extra tags", () => {
    const result = mapImportedCards(cards, { extraTags: ["imported"] });
    expect(result[0].tags).toEqual(["math", "imported"]);
    expect(result[1].tags).toEqual(["geography", "imported"]);
  });

  it("omits tags when empty", () => {
    const noTagCards: ImportedCard[] = [
      { front: "Q", back: "A", tags: [] },
    ];
    const result = mapImportedCards(noTagCards);
    expect(result[0].tags).toBeUndefined();
  });

  it("preserves empty string back", () => {
    const noBackCards: ImportedCard[] = [
      { front: "Q", back: "", tags: [] },
    ];
    const result = mapImportedCards(noBackCards);
    expect(result[0].back).toBe("");
  });

  it("filters falsy tag values", () => {
    const cards: ImportedCard[] = [
      { front: "Q", back: "A", tags: ["valid", ""] },
    ];
    const result = mapImportedCards(cards);
    expect(result[0].tags).toEqual(["valid"]);
  });
});
