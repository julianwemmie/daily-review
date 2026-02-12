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
import type { DbProvider, Card, CardUpdate } from "./db-provider.js";
import type { LlmJudge } from "./llm-judge.js";

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
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/** Convert a Card into an FSRS Card object for ts-fsrs operations. */
function cardToFSRS(card: Card): FSRSCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: stringToState[card.state] ?? State.New,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

/** Convert FSRS card fields back to CardUpdate values. */
function fsrsToCardUpdate(fsrsCard: FSRSCard): CardUpdate {
  return {
    due: fsrsCard.due.toISOString(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsed_days: fsrsCard.elapsed_days,
    scheduled_days: fsrsCard.scheduled_days,
    learning_steps: fsrsCard.learning_steps,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: stateToString[fsrsCard.state] ?? "new",
    last_review: fsrsCard.last_review
      ? fsrsCard.last_review.toISOString()
      : null,
  };
}

export function mountRoutes(app: Express, db: DbProvider, judge?: LlmJudge): void {
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
      const cards: Card[] = [];

      for (const input of inputCards) {
        if (!input.front) {
          res.status(400).json({ error: "Each card must have a 'front' field" });
          return;
        }

        const emptyCard = createEmptyCard(now);
        const fsrsFields = fsrsToCardUpdate(emptyCard);

        cards.push({
          id: crypto.randomUUID(),
          front: input.front,
          context: input.context ?? null,
          source_conversation: input.source_conversation ?? null,
          tags: input.tags ?? null,
          created_at: now.toISOString(),
          due: fsrsFields.due!,
          stability: fsrsFields.stability!,
          difficulty: fsrsFields.difficulty!,
          elapsed_days: fsrsFields.elapsed_days!,
          scheduled_days: fsrsFields.scheduled_days!,
          learning_steps: fsrsFields.learning_steps!,
          reps: fsrsFields.reps!,
          lapses: fsrsFields.lapses!,
          state: "new",
          last_review: fsrsFields.last_review ?? null,
          status: "triaging",
        });
      }

      const created = db.createCards(cards);

      if (created.length === 1) {
        res.status(201).json(created[0]);
      } else {
        res.status(201).json({ cards: created });
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
      const counts = db.getCounts(now);
      res.json(counts);
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
      const statusParam = req.query.status as string | undefined;

      const filters: { state?: string[]; status?: string[] } = {};
      if (stateParam) {
        filters.state = stateParam.split(",").map((s) => s.trim());
      }
      if (statusParam) {
        filters.status = statusParam.split(",").map((s) => s.trim());
      }

      const cards = db.listCards(
        Object.keys(filters).length > 0 ? filters : undefined
      );
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
      const result = db.getDueCards(now);
      res.json(result);
    } catch (err) {
      console.error("GET /api/cards/due error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // PATCH /api/cards/:id -- Update a card
  // -------------------------------------------------------
  app.patch("/api/cards/:id", (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body as Record<string, unknown>;

      // Whitelist allowed fields
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
        "status",
      ];

      const cardUpdate: CardUpdate = {};
      for (const field of allowedFields) {
        if (field in updates) {
          (cardUpdate as Record<string, unknown>)[field] = updates[field];
        }
      }

      if (Object.keys(cardUpdate).length === 0) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      const updated = db.updateCard(id, cardUpdate);
      if (!updated) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/cards/:id error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // DELETE /api/cards/:id -- Delete a card
  // -------------------------------------------------------
  app.delete("/api/cards/:id", (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = db.deleteCard(id);

      if (!deleted) {
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
  // POST /api/cards/:id/evaluate -- LLM judge only (no scheduling)
  // -------------------------------------------------------
  app.post("/api/cards/:id/evaluate", async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!judge) {
        res.status(501).json({ error: "LLM judge not configured" });
        return;
      }

      const { id } = req.params;
      const { answer } = req.body as { answer?: string };

      if (!answer?.trim()) {
        res.status(400).json({ error: "'answer' is required" });
        return;
      }

      const card = db.getCardById(id);
      if (!card) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const result = await judge.evaluate(card.front, card.context, answer);

      res.json({
        score: result.score,
        feedback: result.feedback,
      });
    } catch (err) {
      console.error("POST /api/cards/:id/evaluate error:", err);
      res.status(502).json({ error: "LLM evaluation failed" });
    }
  });

  // -------------------------------------------------------
  // POST /api/cards/:id/review -- Submit a review
  // -------------------------------------------------------
  app.post("/api/cards/:id/review", (req: Request<{ id: string }>, res: Response) => {
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
      const card = db.getCardById(id);
      if (!card) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const now = new Date();
      const fsrsCard = cardToFSRS(card);

      // Run FSRS scheduling
      const result = f.next(fsrsCard, now, grade);
      const updatedFields = fsrsToCardUpdate(result.card);

      // Update the card
      const updatedCard = db.updateCard(id, updatedFields);

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

      db.createReviewLog(reviewLog);

      res.json({
        card: updatedCard,
        review_log: reviewLog,
      });
    } catch (err) {
      console.error("POST /api/cards/:id/review error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
