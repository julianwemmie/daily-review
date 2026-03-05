import JSZip from "jszip";
import transit from "transit-js";
import type { ImportedCard, ImportedScheduling, ParseResult } from "./types.js";

// ── Transit JSON decoding ───────────────────────────────────────────────

/**
 * Decode Mochi's Transit JSON format into plain JS objects.
 * Transit encodes maps as `["^ ", key, val, ...]` and keywords as `"~:name"`.
 */
function decodeTransit(json: string): any {
  const reader = transit.reader("json");
  const raw = reader.read(json);
  return transitToPlain(raw);
}

/** Recursively convert Transit values to plain JS. */
function transitToPlain(val: any): any {
  if (val == null) return null;

  // Date objects — transit dates may be invalid
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString();
  }

  // Transit tagged values (tag + rep) — e.g. list, set, date literals
  // These are opaque objects with { tag, rep, hashCode } and no forEach/get/has.
  if (val.tag != null && val.rep != null) {
    return transitToPlain(val.rep);
  }

  // transit-js TransitMap → plain object (has .get, .has, .forEach)
  if (
    typeof val.forEach === "function" &&
    typeof val.get === "function" &&
    typeof val.has === "function" &&
    !Array.isArray(val)
  ) {
    const obj: Record<string, any> = {};
    val.forEach((v: any, k: any) => {
      const key = String(k).replace(/^~?:/, "");
      obj[key] = transitToPlain(v);
    });
    return obj;
  }

  // Plain arrays
  if (Array.isArray(val)) {
    return val.map(transitToPlain);
  }

  // Any other iterable with forEach (TransitSet, TransitList, etc) → array
  if (typeof val.forEach === "function") {
    const arr: any[] = [];
    val.forEach((v: any) => arr.push(transitToPlain(v)));
    return arr;
  }

  // Transit keyword strings
  if (typeof val === "string" && val.startsWith("~:")) {
    return val.slice(2);
  }

  return val;
}

// ── Simple EDN subset parser ────────────────────────────────────────────

/**
 * Very minimal EDN parser — enough for the subset Mochi uses.
 * Handles: maps, vectors, strings, keywords, numbers, booleans, nil, sets.
 */
function parseEdn(input: string): any {
  let pos = 0;

  function skipWhitespace() {
    while (pos < input.length) {
      const ch = input[pos];
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === ",") {
        pos++;
      } else if (ch === ";") {
        // Comment — skip to end of line
        while (pos < input.length && input[pos] !== "\n") pos++;
      } else {
        break;
      }
    }
  }

  function readValue(): any {
    skipWhitespace();
    if (pos >= input.length) throw new Error("Unexpected end of EDN");

    const ch = input[pos];

    if (ch === "{") return readMap();
    if (ch === "[") return readVector();
    if (ch === "#") {
      if (input[pos + 1] === "{") return readSet();
      // tagged literal — skip tag, read value
      pos++;
      readSymbol();
      skipWhitespace();
      return readValue();
    }
    if (ch === '"') return readString();
    if (ch === ":") return readKeyword();
    if (ch === "-" || ch === "+" || (ch >= "0" && ch <= "9")) return readNumber();

    // Symbol or boolean/nil
    const sym = readSymbol();
    if (sym === "true") return true;
    if (sym === "false") return false;
    if (sym === "nil") return null;
    return sym;
  }

  function readMap(): Record<string, any> {
    pos++; // skip {
    const obj: Record<string, any> = {};
    while (true) {
      skipWhitespace();
      if (input[pos] === "}") { pos++; return obj; }
      const key = readValue();
      const val = readValue();
      obj[typeof key === "string" ? key : String(key)] = val;
    }
  }

  function readVector(): any[] {
    pos++; // skip [
    const arr: any[] = [];
    while (true) {
      skipWhitespace();
      if (input[pos] === "]") { pos++; return arr; }
      arr.push(readValue());
    }
  }

  function readSet(): any[] {
    pos += 2; // skip #{
    const arr: any[] = [];
    while (true) {
      skipWhitespace();
      if (input[pos] === "}") { pos++; return arr; }
      arr.push(readValue());
    }
  }

  function readString(): string {
    pos++; // skip opening "
    let str = "";
    while (pos < input.length) {
      const ch = input[pos];
      if (ch === "\\") {
        pos++;
        const esc = input[pos];
        if (esc === "n") str += "\n";
        else if (esc === "t") str += "\t";
        else if (esc === "r") str += "\r";
        else if (esc === '"') str += '"';
        else if (esc === "\\") str += "\\";
        else str += esc;
        pos++;
      } else if (ch === '"') {
        pos++;
        return str;
      } else {
        str += ch;
        pos++;
      }
    }
    return str;
  }

  function readKeyword(): string {
    pos++; // skip :
    let kw = "";
    while (pos < input.length) {
      const ch = input[pos];
      if (" \t\n\r,{}[]()\"".includes(ch)) break;
      kw += ch;
      pos++;
    }
    return kw;
  }

  function readNumber(): number {
    const start = pos;
    if (input[pos] === "-" || input[pos] === "+") pos++;
    while (pos < input.length && input[pos] >= "0" && input[pos] <= "9") pos++;
    if (pos < input.length && input[pos] === ".") {
      pos++;
      while (pos < input.length && input[pos] >= "0" && input[pos] <= "9") pos++;
    }
    // Skip trailing M or N (BigDecimal / BigInt markers in EDN)
    if (pos < input.length && (input[pos] === "M" || input[pos] === "N")) pos++;
    return Number(input.slice(start, pos));
  }

  function readSymbol(): string {
    const start = pos;
    while (pos < input.length) {
      const ch = input[pos];
      if (" \t\n\r,{}[]()\"".includes(ch)) break;
      pos++;
    }
    return input.slice(start, pos);
  }

  const result = readValue();
  return result;
}

// ── Cloze handling ──────────────────────────────────────────────────────

/** Check if text contains Mochi cloze syntax. */
function hasClozes(text: string): boolean {
  return /\{\{(?:\d+::)?[^}]+\}\}/.test(text);
}

/** Get distinct cloze group numbers. Ungrouped clozes each get their own number. */
function getClozeGroups(text: string): number[] {
  const groups = new Set<number>();
  const regex = /\{\{(?:(\d+)::)?([^}]+)\}\}/g;
  let match;
  let autoNum = 1000; // high number for ungrouped clozes
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      groups.add(parseInt(match[1], 10));
    } else {
      groups.add(autoNum++);
    }
  }
  return [...groups].sort((a, b) => a - b);
}

/**
 * Generate a card for a specific cloze group.
 * Replaces matching clozes with `___`, reveals others.
 */
function makeMochiClozeCard(
  text: string,
  targetGroup: number,
): { front: string; back: string } {
  const answers: string[] = [];
  let autoNum = 1000;

  const front = text.replace(
    /\{\{(?:(\d+)::)?([^}]+)\}\}/g,
    (_match, numStr, answer) => {
      const num = numStr ? parseInt(numStr, 10) : autoNum++;
      if (num === targetGroup) {
        answers.push(answer);
        return "___";
      }
      return answer;
    },
  );

  return { front: front.trim(), back: answers.join(", ") };
}

// ── Deck hierarchy flattening ───────────────────────────────────────────

interface MochiDeck {
  id: string;
  name: string;
  "parent-id"?: string;
  cards?: any[];
}

/** Build deck ID → flattened tag list map. */
function buildDeckTags(decks: MochiDeck[]): Record<string, string[]> {
  const deckMap = new Map<string, MochiDeck>();
  for (const d of decks) {
    deckMap.set(d.id, d);
  }

  const cache: Record<string, string[]> = {};

  function resolve(id: string): string[] {
    if (cache[id]) return cache[id];
    const deck = deckMap.get(id);
    if (!deck) return [];

    const parts: string[] = [];
    if (deck["parent-id"] && deckMap.has(deck["parent-id"])) {
      parts.push(...resolve(deck["parent-id"]));
    }
    parts.push(deck.name);
    cache[id] = parts;
    return parts;
  }

  for (const deck of decks) {
    resolve(deck.id);
  }
  return cache;
}

// ── Media detection ─────────────────────────────────────────────────────

function hasMediaReferences(text: string): boolean {
  return /!\[.*?\]\(@media\/[^)]+\)/.test(text);
}

// ── Field extraction ─────────────────────────────────────────────────────

/**
 * Extract card content from template fields when `content` is empty.
 * Mochi template cards store front/back in named fields with `value` and `pos`.
 * We sort fields by `pos` and join with `---` to create front/back content.
 */
function getContentFromFields(card: any): string {
  const fields = card.fields;
  if (!fields || typeof fields !== "object") return card.name ?? "";

  const entries = Object.values(fields) as any[];
  const sorted = entries
    .filter((f: any) => f?.value != null && String(f.value).trim() !== "")
    .sort((a: any, b: any) => (a.pos ?? "").localeCompare(b.pos ?? ""));

  if (sorted.length === 0) return card.name ?? "";
  if (sorted.length === 1) return String(sorted[0].value);

  // First field is front, rest joined as back
  return sorted.map((f: any) => String(f.value)).join("\n---\n");
}

// ── Main parser ─────────────────────────────────────────────────────────

export async function parseMochiFile(data: ArrayBuffer): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(data);
  const warnings: string[] = [];

  // Try data.json first (Transit JSON), then data.edn
  let rawData: any;
  const jsonFile = zip.file("data.json");
  const ednFile = zip.file("data.edn");

  if (jsonFile) {
    const jsonStr = await jsonFile.async("string");
    rawData = decodeTransit(jsonStr);
  } else if (ednFile) {
    const ednStr = await ednFile.async("string");
    rawData = parseEdn(ednStr);
  } else {
    throw new Error("Invalid .mochi file: no data.json or data.edn found");
  }

  return extractMochiCards(rawData, warnings);
}

function extractMochiCards(data: any, warnings: string[]): ParseResult {
  const decks: MochiDeck[] = data.decks ?? [];
  const topLevelCards: any[] = data.cards ?? [];

  // Build deck tags
  const deckTags = buildDeckTags(decks);

  // Gather all cards — some may be nested in decks, some at top level
  const allRawCards: { card: any; deckId: string | null }[] = [];

  for (const card of topLevelCards) {
    allRawCards.push({
      card,
      deckId: card["deck-id"] ?? null,
    });
  }

  // Also check cards nested within decks
  for (const deck of decks) {
    if (deck.cards && Array.isArray(deck.cards)) {
      for (const card of deck.cards) {
        allRawCards.push({ card, deckId: card["deck-id"] ?? deck.id });
      }
    }
  }

  let hasMedia = false;
  const importedCards: ImportedCard[] = [];

  for (const { card, deckId } of allRawCards) {
    // Mochi template-based cards store content in fields, not in `content`.
    // Extract front/back from fields sorted by position.
    const content: string = card.content?.trim()
      ? card.content
      : getContentFromFields(card);
    if (!content.trim()) continue;

    // Check for media
    if (!hasMedia && hasMediaReferences(content)) {
      hasMedia = true;
    }

    // Tags: card tags + deck hierarchy tags
    const cardTags: string[] = Array.isArray(card.tags) ? card.tags : [];
    // Flatten tag hierarchy (Mochi uses / for hierarchy)
    const flatCardTags = cardTags.flatMap((t: string) =>
      t.split("/").map((s: string) => s.trim()).filter(Boolean),
    );
    const dTags = deckId ? (deckTags[deckId] ?? []) : [];
    const allTags = [...new Set([...dTags, ...flatCardTags])];

    // Build scheduling from review history if available
    const reviews = card.reviews ?? card["review-history"] ?? [];
    let scheduling: ImportedScheduling | undefined;
    if (Array.isArray(reviews) && reviews.length > 0) {
      const lastReview = reviews[reviews.length - 1];
      scheduling = {
        interval: lastReview.interval ?? 1,
        easeFactor: 2.5, // Mochi doesn't store ease factor
        reps: reviews.length,
        lapses: reviews.filter((r: any) => r["remembered?"] === false).length,
      };
    }

    // Split front/back on --- separator
    if (hasClozes(content)) {
      // Cloze card — generate one card per group
      const groups = getClozeGroups(content);
      for (const group of groups) {
        const { front, back } = makeMochiClozeCard(content, group);
        if (front) {
          importedCards.push({ front, back, tags: allTags, scheduling });
        }
      }
    } else {
      // Standard card — split on ---
      const parts = content.split(/^---$/m);
      const front = parts[0]?.trim() ?? "";
      const back = parts.slice(1).join("\n---\n").trim();

      if (front) {
        importedCards.push({ front, back, tags: allTags, scheduling });
      }
    }
  }

  if (hasMedia) {
    warnings.push(
      "Some cards contain media references (images). Media files are not imported and won't display.",
    );
  }

  return { cards: importedCards, warnings, format: "mochi" };
}
