import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import initSqlJs from "sql.js";
import { parseAnkiFile } from "../../../src/shared/parsers/anki-parser.js";

/** Create a minimal .apkg (zip containing an SQLite database). */
async function createApkg(opts: {
  models: Record<string, { name: string; type: number; flds: { name: string }[] }>;
  decks: Record<string, { name: string }>;
  notes: Array<{ id: number; mid: string; flds: string; tags: string }>;
  cards: Array<{
    id: number;
    nid: number;
    did: string;
    type: number;
    queue: number;
    ivl: number;
    factor: number;
    due: number;
    reps: number;
    lapses: number;
  }>;
}): Promise<ArrayBuffer> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE col (id INTEGER, models TEXT, decks TEXT);
    CREATE TABLE notes (id INTEGER, mid TEXT, flds TEXT, tags TEXT);
    CREATE TABLE cards (id INTEGER, nid INTEGER, did TEXT, type INTEGER, queue INTEGER, ivl INTEGER, factor INTEGER, due INTEGER, reps INTEGER, lapses INTEGER);
  `);

  db.run("INSERT INTO col VALUES (1, ?, ?)", [
    JSON.stringify(opts.models),
    JSON.stringify(opts.decks),
  ]);

  for (const note of opts.notes) {
    db.run("INSERT INTO notes VALUES (?, ?, ?, ?)", [
      note.id,
      note.mid,
      note.flds,
      note.tags,
    ]);
  }

  for (const card of opts.cards) {
    db.run("INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      card.id,
      card.nid,
      card.did,
      card.type,
      card.queue,
      card.ivl,
      card.factor,
      card.due,
      card.reps,
      card.lapses,
    ]);
  }

  const dbData = db.export();
  db.close();

  const zip = new JSZip();
  zip.file("collection.anki21", dbData);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("parseAnkiFile", () => {
  it("parses basic cards", async () => {
    const apkg = await createApkg({
      models: {
        "1": { name: "Basic", type: 0, flds: [{ name: "Front" }, { name: "Back" }] },
      },
      decks: {
        "1": { name: "My Deck" },
      },
      notes: [
        { id: 1, mid: "1", flds: "What is 2+2?\x1f4", tags: "" },
        { id: 2, mid: "1", flds: "Capital of France?\x1fParis", tags: "geography" },
      ],
      cards: [
        { id: 1, nid: 1, did: "1", type: 0, queue: 0, ivl: 0, factor: 0, due: 0, reps: 0, lapses: 0 },
        { id: 2, nid: 2, did: "1", type: 0, queue: 0, ivl: 0, factor: 0, due: 0, reps: 0, lapses: 0 },
      ],
    });

    const result = await parseAnkiFile(apkg);

    expect(result.format).toBe("anki");
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].front).toBe("What is 2+2?");
    expect(result.cards[0].back).toBe("4");
    expect(result.cards[0].tags).toContain("My Deck");
    expect(result.cards[1].tags).toContain("geography");
  });

  it("handles cloze deletions", async () => {
    const apkg = await createApkg({
      models: {
        "1": { name: "Cloze", type: 1, flds: [{ name: "Text" }] },
      },
      decks: { "1": { name: "Vocab" } },
      notes: [
        { id: 1, mid: "1", flds: "The {{c1::cat}} sat on the {{c2::mat}}", tags: "" },
      ],
      cards: [
        { id: 1, nid: 1, did: "1", type: 0, queue: 0, ivl: 0, factor: 0, due: 0, reps: 0, lapses: 0 },
      ],
    });

    const result = await parseAnkiFile(apkg);

    // Should produce 2 cards (one per cloze number)
    expect(result.cards).toHaveLength(2);

    const c1 = result.cards.find((c) => c.front.includes("___") && c.front.includes("mat"));
    const c2 = result.cards.find((c) => c.front.includes("cat") && c.front.includes("___"));

    expect(c1).toBeDefined();
    expect(c1!.back).toBe("cat");
    expect(c2).toBeDefined();
    expect(c2!.back).toBe("mat");
  });

  it("strips HTML from fields", async () => {
    const apkg = await createApkg({
      models: {
        "1": { name: "Basic", type: 0, flds: [{ name: "Front" }, { name: "Back" }] },
      },
      decks: { "1": { name: "HTML" } },
      notes: [
        { id: 1, mid: "1", flds: "<b>Bold</b> &amp; <i>italic</i>\x1f<div>Answer</div>", tags: "" },
      ],
      cards: [
        { id: 1, nid: 1, did: "1", type: 0, queue: 0, ivl: 0, factor: 0, due: 0, reps: 0, lapses: 0 },
      ],
    });

    const result = await parseAnkiFile(apkg);

    expect(result.cards[0].front).toBe("Bold & italic");
    expect(result.cards[0].back).toContain("Answer");
    expect(result.cards[0].back).not.toContain("<div>");
  });

  it("flattens deck hierarchy into tags", async () => {
    const apkg = await createApkg({
      models: {
        "1": { name: "Basic", type: 0, flds: [{ name: "Front" }, { name: "Back" }] },
      },
      decks: { "1": { name: "Biology::Cell Biology" } },
      notes: [
        { id: 1, mid: "1", flds: "Q\x1fA", tags: "" },
      ],
      cards: [
        { id: 1, nid: 1, did: "1", type: 0, queue: 0, ivl: 0, factor: 0, due: 0, reps: 0, lapses: 0 },
      ],
    });

    const result = await parseAnkiFile(apkg);

    expect(result.cards[0].tags).toContain("Biology");
    expect(result.cards[0].tags).toContain("Cell Biology");
  });

  it("warns about media references", async () => {
    const apkg = await createApkg({
      models: {
        "1": { name: "Basic", type: 0, flds: [{ name: "Front" }, { name: "Back" }] },
      },
      decks: { "1": { name: "Media" } },
      notes: [
        { id: 1, mid: "1", flds: '<img src="image.jpg">Q\x1fA', tags: "" },
      ],
      cards: [
        { id: 1, nid: 1, did: "1", type: 0, queue: 0, ivl: 0, factor: 0, due: 0, reps: 0, lapses: 0 },
      ],
    });

    const result = await parseAnkiFile(apkg);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("media");
  });

  it("includes scheduling data for reviewed cards", async () => {
    const apkg = await createApkg({
      models: {
        "1": { name: "Basic", type: 0, flds: [{ name: "Front" }, { name: "Back" }] },
      },
      decks: { "1": { name: "Deck" } },
      notes: [
        { id: 1, mid: "1", flds: "Q\x1fA", tags: "" },
      ],
      cards: [
        { id: 1, nid: 1, did: "1", type: 2, queue: 2, ivl: 30, factor: 2500, due: 0, reps: 10, lapses: 2 },
      ],
    });

    const result = await parseAnkiFile(apkg);

    expect(result.cards[0].scheduling).toBeDefined();
    expect(result.cards[0].scheduling!.interval).toBe(30);
    expect(result.cards[0].scheduling!.easeFactor).toBe(2.5);
    expect(result.cards[0].scheduling!.reps).toBe(10);
    expect(result.cards[0].scheduling!.lapses).toBe(2);
  });

  it("throws on invalid apkg (no database file)", async () => {
    const zip = new JSZip();
    zip.file("readme.txt", "not a database");
    const data = await zip.generateAsync({ type: "arraybuffer" });

    await expect(parseAnkiFile(data)).rejects.toThrow("no collection database");
  });
});
