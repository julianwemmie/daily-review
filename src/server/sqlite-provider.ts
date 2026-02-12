import type {
  DbProvider,
  Card,
  CardEdit,
  SchedulingUpdate,
  ReviewLogInsert,
  CardListFilters,
  DueCardsResult,
  CardCounts,
} from "./db-provider.js";
import db from "./db.js";

function rowToCard(row: Record<string, unknown>): Card {
  return {
    ...row,
    tags: row.tags ? JSON.parse(row.tags as string) : null,
  } as Card;
}

function serializeTags(tags: string[] | null | undefined): string | null {
  return tags ? JSON.stringify(tags) : null;
}

// -- Prepared statements --

const insertCardStmt = db.prepare(`
  INSERT INTO cards (id, front, context, source_conversation, tags, created_at,
    due, stability, difficulty, elapsed_days, scheduled_days, learning_steps,
    reps, lapses, state, last_review, status)
  VALUES (@id, @front, @context, @source_conversation, @tags, @created_at,
    @due, @stability, @difficulty, @elapsed_days, @scheduled_days, @learning_steps,
    @reps, @lapses, @state, @last_review, @status)
`);

const getCardByIdStmt = db.prepare(`SELECT * FROM cards WHERE id = ?`);

const deleteReviewLogsByCardIdStmt = db.prepare(
  `DELETE FROM review_logs WHERE card_id = ?`
);

const deleteCardByIdStmt = db.prepare(`DELETE FROM cards WHERE id = ?`);

const insertReviewLogStmt = db.prepare(`
  INSERT INTO review_logs (id, card_id, rating, answer, llm_score, llm_feedback, reviewed_at)
  VALUES (@id, @card_id, @rating, @answer, @llm_score, @llm_feedback, @reviewed_at)
`);

const insertCardsBatch = db.transaction(
  (rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      insertCardStmt.run(row);
    }
  }
);

// -- Provider implementation --

export const sqliteProvider: DbProvider = {
  createCards(cards: Card[]): Card[] {
    const rows = cards.map((c) => ({
      ...c,
      tags: serializeTags(c.tags),
    }));
    insertCardsBatch(rows);
    return cards;
  },

  getCardById(id: string): Card | undefined {
    const row = getCardByIdStmt.get(id) as Record<string, unknown> | undefined;
    return row ? rowToCard(row) : undefined;
  },

  listCards(filters?: CardListFilters): Card[] {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filters?.status) {
      conditions.push(`status = ?`);
      params.push(filters.status);
    }

    const where =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const rows = db
      .prepare(`SELECT * FROM cards${where} ORDER BY created_at DESC`)
      .all(...params) as Record<string, unknown>[];

    return rows.map(rowToCard);
  },

  getDueCards(now: string): DueCardsResult {
    const dueRows = db
      .prepare(
        `SELECT * FROM cards
         WHERE status = 'active' AND due <= ?
         ORDER BY due ASC`
      )
      .all(now) as Record<string, unknown>[];

    const upcoming = db
      .prepare(
        `SELECT COUNT(*) as count, MIN(due) as next_due FROM cards
         WHERE status = 'active' AND due > ?`
      )
      .get(now) as { count: number; next_due: string | null };

    return {
      cards: dueRows.map(rowToCard),
      upcoming_count: upcoming.count,
      next_due: upcoming.next_due,
    };
  },

  getCounts(now: string): CardCounts {
    const newCount = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM cards WHERE status = 'triaging'`
        )
        .get() as { count: number }
    ).count;

    const dueCount = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM cards
           WHERE status = 'active' AND due <= ?`
        )
        .get(now) as { count: number }
    ).count;

    return { new: newCount, due: dueCount };
  },

  editCard(id: string, fields: CardEdit): Card | undefined {
    const allowedColumns = new Set([
      "front", "context", "source_conversation", "tags", "status",
    ]);

    const existing = getCardByIdStmt.get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) return undefined;

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (!allowedColumns.has(key)) continue;
      setClauses.push(`${key} = ?`);
      values.push(key === "tags" ? serializeTags(value as string[] | null) : value);
    }

    if (setClauses.length === 0) return rowToCard(existing);

    values.push(id);
    db.prepare(
      `UPDATE cards SET ${setClauses.join(", ")} WHERE id = ?`
    ).run(...values);

    const updated = getCardByIdStmt.get(id) as Record<string, unknown>;
    return rowToCard(updated);
  },

  updateSchedule(id: string, fields: SchedulingUpdate): Card | undefined {
    const allowedColumns = new Set([
      "due", "stability", "difficulty", "elapsed_days", "scheduled_days",
      "learning_steps", "reps", "lapses", "state", "last_review",
    ]);

    const existing = getCardByIdStmt.get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) return undefined;

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (!allowedColumns.has(key)) continue;
      setClauses.push(`${key} = ?`);
      values.push(value);
    }

    if (setClauses.length === 0) return rowToCard(existing);

    values.push(id);
    db.prepare(
      `UPDATE cards SET ${setClauses.join(", ")} WHERE id = ?`
    ).run(...values);

    const updated = getCardByIdStmt.get(id) as Record<string, unknown>;
    return rowToCard(updated);
  },

  deleteCard(id: string): boolean {
    deleteReviewLogsByCardIdStmt.run(id);
    const result = deleteCardByIdStmt.run(id);
    return result.changes > 0;
  },

  createReviewLog(log: ReviewLogInsert): void {
    insertReviewLogStmt.run(log);
  },
};
