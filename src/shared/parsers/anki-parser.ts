import JSZip from "jszip";
import initSqlJs, { type Database } from "sql.js";
import type { ImportedCard, ImportedScheduling, ParseResult } from "./types.js";

// ── HTML stripping ──────────────────────────────────────────────────────

/** Strip HTML tags and decode common entities. */
function stripHtml(html: string): string {
  let text = html
    // Replace <br>, <br/>, <br /> with newlines
    .replace(/<br\s*\/?>/gi, "\n")
    // Replace <div> openers with newlines (Anki uses divs for line breaks)
    .replace(/<div[^>]*>/gi, "\n")
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

// ── Cloze handling ──────────────────────────────────────────────────────

interface ClozeOccurrence {
  /** The cloze number (e.g. 1 for {{c1::...}}) */
  num: number;
  /** The answer text inside the cloze */
  answer: string;
  /** Optional hint text */
  hint?: string;
}

/** Extract all cloze occurrences from a field string. */
function extractClozes(text: string): ClozeOccurrence[] {
  const clozes: ClozeOccurrence[] = [];
  const regex = /\{\{c(\d+)::([^}]*?)(?:::([^}]*?))?\}\}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    clozes.push({
      num: parseInt(match[1], 10),
      answer: match[2],
      hint: match[3],
    });
  }
  return clozes;
}

/** Get the distinct cloze numbers present in a text. */
function getClozeNumbers(text: string): number[] {
  const clozes = extractClozes(text);
  return [...new Set(clozes.map((c) => c.num))].sort((a, b) => a - b);
}

/**
 * Generate a card for a specific cloze number.
 * - The front replaces the target cloze with `___` (or `___ (hint)`) and
 *   reveals all other clozes.
 * - The back is the answer for the target cloze.
 */
function makeClozeCard(text: string, targetNum: number): { front: string; back: string } {
  const answers: string[] = [];
  const front = text.replace(
    /\{\{c(\d+)::([^}]*?)(?:::([^}]*?))?\}\}/g,
    (_match, numStr, answer, hint) => {
      const num = parseInt(numStr, 10);
      if (num === targetNum) {
        answers.push(answer);
        return hint ? `___ (${hint})` : "___";
      }
      // Reveal other clozes
      return answer;
    },
  );

  return {
    front: stripHtml(front),
    back: answers.join(", "),
  };
}

// ── Deck tag flattening ─────────────────────────────────────────────────

/** Flatten Anki deck hierarchy (`Biology::Cell Biology`) into separate tags. */
function flattenDeckName(deckName: string): string[] {
  return deckName
    .split("::")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Media detection ─────────────────────────────────────────────────────

function hasMediaReferences(text: string): boolean {
  return /<img[^>]+src="[^"]*"/i.test(text) || /\[sound:[^\]]+\]/i.test(text);
}

// ── Main parser ─────────────────────────────────────────────────────────

export async function parseAnkiFile(data: ArrayBuffer, options?: { sqlJsWasmUrl?: string }): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(data);
  const warnings: string[] = [];

  // Find the SQLite database file — prefer collection.anki21 over collection.anki2
  const dbFileName =
    zip.file("collection.anki21") ? "collection.anki21" :
    zip.file("collection.anki2") ? "collection.anki2" :
    null;

  if (!dbFileName) {
    throw new Error("Invalid .apkg file: no collection database found");
  }

  const dbBuffer = await zip.file(dbFileName)!.async("arraybuffer");

  // Initialize sql.js
  const SQL = await initSqlJs(
    options?.sqlJsWasmUrl ? { locateFile: () => options.sqlJsWasmUrl! } : undefined,
  );
  const db: Database = new SQL.Database(new Uint8Array(dbBuffer));

  try {
    return extractCards(db, warnings);
  } finally {
    db.close();
  }
}

function extractCards(db: Database, warnings: string[]): ParseResult {
  // ── Read models (note types) from col table ──
  const colRows = db.exec("SELECT models, decks FROM col");
  if (colRows.length === 0 || colRows[0].values.length === 0) {
    throw new Error("Invalid Anki database: empty col table");
  }

  const modelsJson = JSON.parse(colRows[0].values[0][0] as string);
  const decksJson = JSON.parse(colRows[0].values[0][1] as string);

  // Build deck ID → name map
  const deckNames: Record<string, string> = {};
  for (const [id, deck] of Object.entries(decksJson)) {
    deckNames[id] = (deck as any).name ?? "";
  }

  // Build model ID → model info map
  const models: Record<string, { name: string; isCloze: boolean; fieldNames: string[] }> = {};
  for (const [id, model] of Object.entries(modelsJson)) {
    const m = model as any;
    models[id] = {
      name: m.name ?? "",
      isCloze: m.type === 1,
      fieldNames: (m.flds ?? []).map((f: any) => f.name as string),
    };
  }

  // ── Read notes ──
  const noteRows = db.exec(
    "SELECT id, mid, flds, tags FROM notes",
  );
  if (noteRows.length === 0) {
    return { cards: [], warnings, format: "anki" };
  }

  // Build note ID → note data map
  const notes: Record<string, {
    mid: string;
    fields: string[];
    tags: string[];
  }> = {};
  for (const row of noteRows[0].values) {
    const noteId = String(row[0]);
    const mid = String(row[1]);
    const flds = (row[2] as string).split("\x1f");
    const tagStr = (row[3] as string ?? "").trim();
    const tags = tagStr ? tagStr.split(/\s+/).filter(Boolean) : [];

    notes[noteId] = { mid, fields: flds, tags };
  }

  // ── Read cards (for scheduling + deck assignment) ──
  const cardRows = db.exec(
    "SELECT id, nid, did, type, queue, ivl, factor, due, reps, lapses FROM cards",
  );
  if (cardRows.length === 0) {
    return { cards: [], warnings, format: "anki" };
  }

  let hasMedia = false;
  const importedCards: ImportedCard[] = [];

  for (const row of cardRows[0].values) {
    const nid = String(row[1]);
    const did = String(row[2]);
    const cardType = row[3] as number;
    const ivl = row[5] as number;
    const factor = row[6] as number;
    const reps = row[8] as number;
    const lapses = row[9] as number;

    const note = notes[nid];
    if (!note) continue;

    const model = models[note.mid];
    if (!model) continue;

    // Deck tags
    const deckName = deckNames[did] ?? "";
    const deckTags = deckName ? flattenDeckName(deckName) : [];
    // Merge with note tags (flatten any :: in tags too)
    const allTags = [
      ...deckTags,
      ...note.tags.flatMap((t) => t.split("::").map((s) => s.trim()).filter(Boolean)),
    ];
    // Deduplicate
    const tags = [...new Set(allTags)];

    // Check for media
    const rawFields = note.fields.join(" ");
    if (!hasMedia && hasMediaReferences(rawFields)) {
      hasMedia = true;
    }

    // Build scheduling info
    const scheduling: ImportedScheduling | undefined =
      cardType >= 1
        ? {
            interval: Math.max(0, ivl),
            easeFactor: factor > 0 ? factor / 1000 : 2.5,
            reps,
            lapses,
          }
        : undefined;

    // ── Handle cloze notes ──
    if (model.isCloze) {
      // The first field is the cloze source
      const clozeSource = note.fields[0] ?? "";
      const clozeNums = getClozeNumbers(clozeSource);

      if (clozeNums.length === 0) {
        // Not actually cloze-formatted, treat as basic
        const front = stripHtml(note.fields[0] ?? "");
        const back = stripHtml(note.fields.slice(1).join("\n"));
        if (front) {
          importedCards.push({ front, back, tags, scheduling });
        }
        continue;
      }

      for (const num of clozeNums) {
        const { front, back } = makeClozeCard(clozeSource, num);
        if (front) {
          importedCards.push({ front, back, tags, scheduling });
        }
      }
      continue;
    }

    // ── Handle basic / basic+reversed notes ──
    const front = stripHtml(note.fields[0] ?? "");
    const back = stripHtml(note.fields.slice(1).join("\n"));
    if (front) {
      importedCards.push({ front, back, tags, scheduling });
    }
  }

  if (hasMedia) {
    warnings.push(
      "Some cards contain media references (images/audio). Media files are not imported and won't display.",
    );
  }

  return { cards: importedCards, warnings, format: "anki" };
}
