import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseMochiFile } from "../../../src/shared/parsers/mochi-parser.js";

/** Create a minimal .mochi file (zip with data.edn). */
async function createMochiEdn(edn: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("data.edn", edn);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("parseMochiFile", () => {
  it("parses basic cards from EDN", async () => {
    const edn = `{
      :decks [{:id "d1" :name "My Deck"}]
      :cards [{:id "c1" :deck-id "d1" :content "What is 2+2?\\n---\\n4" :tags []}]
    }`;
    const data = await createMochiEdn(edn);
    const result = await parseMochiFile(data);

    expect(result.format).toBe("mochi");
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].front).toBe("What is 2+2?");
    expect(result.cards[0].back).toBe("4");
    expect(result.cards[0].tags).toContain("My Deck");
  });

  it("handles cloze deletions", async () => {
    const edn = `{
      :decks [{:id "d1" :name "Deck"}]
      :cards [{:id "c1" :deck-id "d1" :content "The {{1::cat}} sat on the {{2::mat}}" :tags []}]
    }`;
    const data = await createMochiEdn(edn);
    const result = await parseMochiFile(data);

    expect(result.cards).toHaveLength(2);

    const c1 = result.cards.find((c) => c.back === "cat");
    const c2 = result.cards.find((c) => c.back === "mat");

    expect(c1).toBeDefined();
    expect(c1!.front).toContain("___");
    expect(c1!.front).toContain("mat");

    expect(c2).toBeDefined();
    expect(c2!.front).toContain("cat");
    expect(c2!.front).toContain("___");
  });

  it("handles ungrouped cloze deletions", async () => {
    const edn = `{
      :decks [{:id "d1" :name "Deck"}]
      :cards [{:id "c1" :deck-id "d1" :content "The {{cat}} and the {{dog}}" :tags []}]
    }`;
    const data = await createMochiEdn(edn);
    const result = await parseMochiFile(data);

    // Each ungrouped cloze becomes its own card
    expect(result.cards).toHaveLength(2);
  });

  it("builds deck hierarchy tags", async () => {
    const edn = `{
      :decks [
        {:id "d1" :name "Science"}
        {:id "d2" :name "Biology" :parent-id "d1"}
      ]
      :cards [{:id "c1" :deck-id "d2" :content "Q\\n---\\nA" :tags []}]
    }`;
    const data = await createMochiEdn(edn);
    const result = await parseMochiFile(data);

    expect(result.cards[0].tags).toContain("Science");
    expect(result.cards[0].tags).toContain("Biology");
  });

  it("warns about media references", async () => {
    const edn = `{
      :decks [{:id "d1" :name "Deck"}]
      :cards [{:id "c1" :deck-id "d1" :content "![img](@media/photo.png)\\n---\\nA" :tags []}]
    }`;
    const data = await createMochiEdn(edn);
    const result = await parseMochiFile(data);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("media");
  });

  it("skips empty cards", async () => {
    const edn = `{
      :decks [{:id "d1" :name "Deck"}]
      :cards [
        {:id "c1" :deck-id "d1" :content "Q\\n---\\nA" :tags []}
        {:id "c2" :deck-id "d1" :content "" :tags []}
        {:id "c3" :deck-id "d1" :content "   " :tags []}
      ]
    }`;
    const data = await createMochiEdn(edn);
    const result = await parseMochiFile(data);

    expect(result.cards).toHaveLength(1);
  });

  it("extracts scheduling from review history", async () => {
    const edn = `{
      :decks [{:id "d1" :name "Deck"}]
      :cards [{
        :id "c1"
        :deck-id "d1"
        :content "Q\\n---\\nA"
        :tags []
        :reviews [
          {:interval 1 :remembered? true}
          {:interval 3 :remembered? true}
          {:interval 7 :remembered? false}
        ]
      }]
    }`;
    const data = await createMochiEdn(edn);
    const result = await parseMochiFile(data);

    expect(result.cards[0].scheduling).toBeDefined();
    expect(result.cards[0].scheduling!.reps).toBe(3);
    expect(result.cards[0].scheduling!.lapses).toBe(1);
  });

  it("throws on invalid .mochi file", async () => {
    const zip = new JSZip();
    zip.file("readme.txt", "not mochi data");
    const data = await zip.generateAsync({ type: "arraybuffer" });

    await expect(parseMochiFile(data)).rejects.toThrow("no data.json or data.edn");
  });
});
