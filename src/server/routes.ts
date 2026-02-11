import { type Express, type Request, type Response } from "express";
import crypto from "crypto";
import {
  fsrs,
  createEmptyCard,
  Rating,
  State,
  type Card as FSRSCard,
  type Grade,
} from "ts-fsrs";
import db from "./db.js";

const f = fsrs();

// -- Mapping helpers --

const ratingMap: Record<string, Grade> = {
  Again: Rating.Again,
  Hard: Rating.Hard,
  Good: Rating.Good,
  Easy: Rating.Easy,
};

const stateToString: Record<number, string> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

const stringToState: Record<string, State> = {
  new: State.New,
  accepted: State.New, // accepted cards are treated as New for FSRS
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/** Convert a database row into an FSRS Card object for ts-fsrs operations. */
function dbRowToFSRSCard(row: Record<string, unknown>): FSRSCard {
  return {
    due: new Date(row.due as string),
    stability: row.stability as number,
    difficulty: row.difficulty as number,
    elapsed_days: row.elapsed_days as number,
    scheduled_days: row.scheduled_days as number,
    learning_steps: row.learning_steps as number,
    reps: row.reps as number,
    lapses: row.lapses as number,
    state: stringToState[row.state as string] ?? State.New,
    last_review: row.last_review
      ? new Date(row.last_review as string)
      : undefined,
  };
}

/** Convert FSRS card fields back to DB-friendly values. */
function fsrsCardToDbFields(card: FSRSCard) {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: stateToString[card.state] ?? "new",
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

// -- Prepared statements --

const insertCard = db.prepare(`
  INSERT INTO cards (id, front, context, source_conversation, tags, created_at,
    due, stability, difficulty, elapsed_days, scheduled_days, learning_steps,
    reps, lapses, state, last_review)
  VALUES (@id, @front, @context, @source_conversation, @tags, @created_at,
    @due, @stability, @difficulty, @elapsed_days, @scheduled_days, @learning_steps,
    @reps, @lapses, @state, @last_review)
`);

const getCardById = db.prepare(`SELECT * FROM cards WHERE id = ?`);

const deleteReviewLogsByCardId = db.prepare(
  `DELETE FROM review_logs WHERE card_id = ?`
);

const deleteCardById = db.prepare(`DELETE FROM cards WHERE id = ?`);

const insertReviewLog = db.prepare(`
  INSERT INTO review_logs (id, card_id, rating, answer, llm_score, llm_feedback, reviewed_at)
  VALUES (@id, @card_id, @rating, @answer, @llm_score, @llm_feedback, @reviewed_at)
`);

const insertCardsBatch = db.transaction(
  (cards: Record<string, unknown>[]) => {
    for (const card of cards) {
      insertCard.run(card);
    }
  }
);

export function mountRoutes(app: Express): void {
  // -------------------------------------------------------
  // POST /api/cards -- Create one or more cards
  // -------------------------------------------------------
  app.post("/api/cards", (req: Request, res: Response) => {
    try {
      const body = req.body;

      // Normalise: accept { cards: [...] } or a single card object
      let inputCards: Array<{
        front: string;
        context?: string;
        source_conversation?: string;
        tags?: string[];
      }>;

      if (Array.isArray(body.cards)) {
        inputCards = body.cards;
      } else if (typeof body.front === "string") {
        inputCards = [body];
      } else {
        res
          .status(400)
          .json({ error: "Body must include 'cards' array or a 'front' field" });
        return;
      }

      const now = new Date();
      const createdCards: Record<string, unknown>[] = [];

      for (const input of inputCards) {
        if (!input.front) {
          res.status(400).json({ error: "Each card must have a 'front' field" });
          return;
        }

        const card = {
          id: crypto.randomUUID(),
          front: input.front,
          context: input.context ?? null,
          source_conversation: input.source_conversation ?? null,
          tags: input.tags ? JSON.stringify(input.tags) : null,
          created_at: now.toISOString(),
          due: now.toISOString(),
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          learning_steps: 0,
          reps: 0,
          lapses: 0,
          state: "new",
          last_review: null,
        };

        createdCards.push(card);
      }

      insertCardsBatch(createdCards);

      // Parse tags back to arrays for the response
      const responseCards = createdCards.map((c) => ({
        ...c,
        tags: c.tags ? JSON.parse(c.tags as string) : null,
      }));

      if (responseCards.length === 1) {
        res.status(201).json(responseCards[0]);
      } else {
        res.status(201).json({ cards: responseCards });
      }
    } catch (err) {
      console.error("POST /api/cards error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/cards/counts -- Lightweight tab badge counts
  // -------------------------------------------------------
  app.get("/api/cards/counts", (_req: Request, res: Response) => {
    try {
      const now = new Date().toISOString();
      const newCount = (
        db.prepare(`SELECT COUNT(*) as count FROM cards WHERE state = 'new'`).get() as { count: number }
      ).count;
      const dueCount = (
        db.prepare(
          `SELECT COUNT(*) as count FROM cards
           WHERE state = 'accepted' OR (state NOT IN ('new', 'accepted') AND due <= ?)`
        ).get(now) as { count: number }
      ).count;
      res.json({ new: newCount, due: dueCount });
    } catch (err) {
      console.error("GET /api/cards/counts error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/cards -- List cards with optional state filter
  // -------------------------------------------------------
  app.get("/api/cards", (req: Request, res: Response) => {
    try {
      const stateParam = req.query.state as string | undefined;

      let rows: unknown[];
      if (stateParam) {
        const states = stateParam.split(",").map((s) => s.trim());
        const placeholders = states.map(() => "?").join(", ");
        const stmt = db.prepare(
          `SELECT * FROM cards WHERE state IN (${placeholders}) ORDER BY created_at DESC`
        );
        rows = stmt.all(...states);
      } else {
        rows = db
          .prepare(`SELECT * FROM cards ORDER BY created_at DESC`)
          .all();
      }

      const cards = (rows as Record<string, unknown>[]).map((row) => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags as string) : null,
      }));

      res.json(cards);
    } catch (err) {
      console.error("GET /api/cards error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/cards/due -- Cards due for review
  // -------------------------------------------------------
  app.get("/api/cards/due", (_req: Request, res: Response) => {
    try {
      const now = new Date().toISOString();
      // "accepted" cards are always due (first review). Other non-new cards use due date.
      const dueRows = db
        .prepare(
          `SELECT * FROM cards
           WHERE state = 'accepted' OR (state NOT IN ('new', 'accepted') AND due <= ?)
           ORDER BY due ASC`
        )
        .all(now);

      const cards = (dueRows as Record<string, unknown>[]).map((row) => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags as string) : null,
      }));

      // Also include upcoming (not yet due) count + next due time
      const upcoming = db
        .prepare(
          `SELECT COUNT(*) as count, MIN(due) as next_due FROM cards
           WHERE state NOT IN ('new', 'accepted') AND due > ?`
        )
        .get(now) as { count: number; next_due: string | null };

      res.json({
        cards,
        upcoming_count: upcoming.count,
        next_due: upcoming.next_due,
      });
    } catch (err) {
      console.error("GET /api/cards/due error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // PATCH /api/cards/:id -- Update a card
  // -------------------------------------------------------
  app.patch("/api/cards/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = getCardById.get(id) as
        | Record<string, unknown>
        | undefined;

      if (!existing) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const updates = req.body as Record<string, unknown>;

      // Triage accept: mark as "accepted" with due=now so it shows in the review queue.
      // FSRS treats it as a New card when the user actually reviews it.
      if (existing.state === "new" && updates.state === "learning") {
        updates.state = "accepted";
        updates.due = new Date().toISOString();
      }

      // Serialise tags if provided as an array
      if (Array.isArray(updates.tags)) {
        updates.tags = JSON.stringify(updates.tags);
      }

      // Build dynamic UPDATE statement
      const allowedFields = [
        "front",
        "context",
        "source_conversation",
        "tags",
        "due",
        "stability",
        "difficulty",
        "elapsed_days",
        "scheduled_days",
        "learning_steps",
        "reps",
        "lapses",
        "state",
        "last_review",
      ];

      const setClauses: string[] = [];
      const values: unknown[] = [];

      for (const field of allowedFields) {
        if (field in updates) {
          setClauses.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }

      if (setClauses.length === 0) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      values.push(id);
      db.prepare(
        `UPDATE cards SET ${setClauses.join(", ")} WHERE id = ?`
      ).run(...values);

      const updated = getCardById.get(id) as Record<string, unknown>;
      res.json({
        ...updated,
        tags: updated.tags ? JSON.parse(updated.tags as string) : null,
      });
    } catch (err) {
      console.error("PATCH /api/cards/:id error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // DELETE /api/cards/:id -- Delete a card
  // -------------------------------------------------------
  app.delete("/api/cards/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Delete associated review logs first, then the card
      deleteReviewLogsByCardId.run(id);
      const result = deleteCardById.run(id);

      if (result.changes === 0) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      res.json({ deleted: true, id });
    } catch (err) {
      console.error("DELETE /api/cards/:id error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // POST /api/cards/:id/review -- Submit a review
  // -------------------------------------------------------
  app.post("/api/cards/:id/review", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        rating: ratingStr,
        answer,
        llm_score,
        llm_feedback,
      } = req.body as {
        rating: string;
        answer?: string;
        llm_score?: number;
        llm_feedback?: string;
      };

      // Validate rating
      const grade = ratingMap[ratingStr];
      if (grade === undefined) {
        res
          .status(400)
          .json({ error: "rating must be one of: Again, Hard, Good, Easy" });
        return;
      }

      // Fetch current card
      const row = getCardById.get(id) as Record<string, unknown> | undefined;
      if (!row) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const now = new Date();

      // For accepted cards (first review), use a fresh FSRS empty card
      // so FSRS gets properly initialized values instead of zeroed-out fields.
      const fsrsCard =
        row.state === "accepted"
          ? createEmptyCard(now)
          : dbRowToFSRSCard(row);

      // Run FSRS scheduling
      const result = f.next(fsrsCard, now, grade);
      const updatedFields = fsrsCardToDbFields(result.card);

      // Update the card in the database
      db.prepare(
        `UPDATE cards SET
          due = @due,
          stability = @stability,
          difficulty = @difficulty,
          elapsed_days = @elapsed_days,
          scheduled_days = @scheduled_days,
          learning_steps = @learning_steps,
          reps = @reps,
          lapses = @lapses,
          state = @state,
          last_review = @last_review
        WHERE id = @id`
      ).run({ ...updatedFields, id });

      // Create review log entry
      const reviewLog = {
        id: crypto.randomUUID(),
        card_id: id,
        rating: ratingStr,
        answer: answer ?? null,
        llm_score: llm_score ?? null,
        llm_feedback: llm_feedback ?? null,
        reviewed_at: now.toISOString(),
      };

      insertReviewLog.run(reviewLog);

      // Return the updated card
      const updatedRow = getCardById.get(id) as Record<string, unknown>;
      res.json({
        card: {
          ...updatedRow,
          tags: updatedRow.tags
            ? JSON.parse(updatedRow.tags as string)
            : null,
        },
        review_log: reviewLog,
      });
    } catch (err) {
      console.error("POST /api/cards/:id/review error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
