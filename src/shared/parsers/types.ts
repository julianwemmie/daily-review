/** Scheduling data extracted from the source app. */
export interface ImportedScheduling {
  /** Interval in days */
  interval: number;
  /** Ease factor (2.5 = default Anki ease) */
  easeFactor: number;
  /** Number of reviews */
  reps: number;
  /** Number of lapses */
  lapses: number;
  /** Due date ISO string (if available) */
  due?: string;
}

/** A card extracted from an .apkg or .mochi file. */
export interface ImportedCard {
  front: string;
  back: string;
  tags: string[];
  scheduling?: ImportedScheduling;
}

/** Result of parsing an import file. */
export interface ParseResult {
  cards: ImportedCard[];
  /** Warnings (e.g. media references that won't display) */
  warnings: string[];
  /** Source format identifier */
  format: "anki" | "mochi" | "json";
}
