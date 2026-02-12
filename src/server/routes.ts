import { type Express, type Request, type Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { CardStatus, CardState, Rating as AppRating, type DbProvider, type Card, type CardEdit } from "./db-provider.js";
import { type LlmJudge } from "./llm-judge.js";
import { newCardSchedule, reschedule } from "./scheduling.js";
import { validate } from "./middleware/validate.js";

const CreateCardBody = z.object({
  front: z.string().min(1),
  context: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateCardBody = z.object({
  front: z.string().min(1).optional(),
  context: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  status: z.enum([CardStatus.Triaging, CardStatus.Active, CardStatus.Suspended]).optional(),
});

const EvaluateBody = z.object({
  answer: z.string().trim().min(1),
});

const ReviewBody = z.object({
  rating: z.enum([AppRating.Again, AppRating.Hard, AppRating.Good, AppRating.Easy]),
  answer: z.string().optional(),
  llm_score: z.number().min(0).max(1).optional(),
  llm_feedback: z.string().optional(),
});

export function mountRoutes(app: Express, db: DbProvider, judge?: LlmJudge): void {
  // -------------------------------------------------------
  // POST /api/cards -- Create a single card
  // -------------------------------------------------------
  app.post("/api/cards", validate(CreateCardBody), (req: Request, res: Response) => {
    try {
      const { front, context, tags } = req.body;
      const now = new Date();
      const fsrsFields = newCardSchedule(now);

      const card: Card = {
        id: crypto.randomUUID(),
        front,
        context: context ?? null,
        source_conversation: null,
        tags: tags ?? null,
        created_at: now.toISOString(),
        ...fsrsFields,
        state: CardState.New,
        status: CardStatus.Triaging,
      };

      const created = db.createCards([card]);
      res.status(201).json(created[0]);
    } catch (err) {
      console.error("POST /api/cards error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/cards/counts -- Lightweight tab badge counts
  // -------------------------------------------------------
  app.get("/api/cards/counts", (_, res: Response) => {
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
  // GET /api/cards -- List cards with optional status filter
  // -------------------------------------------------------
  app.get("/api/cards", (req: Request, res: Response) => {
    try {
      const status = Object.values(CardStatus).find(s => s === req.query.status);
      const filters = status ? { status } : undefined;

      const cards = db.listCards(filters);
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
  app.patch("/api/cards/:id", validate(UpdateCardBody), (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;

      const cardEdit: CardEdit = req.body;
      if (Object.keys(cardEdit).length === 0) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      const updated = db.editCard(id, cardEdit);
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
  app.post("/api/cards/:id/evaluate", validate(EvaluateBody), async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!judge) {
        res.status(501).json({ error: "LLM judge not configured" });
        return;
      }

      const { id } = req.params;
      const card = db.getCardById(id);
      if (!card) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const result = await judge.evaluate(card.front, card.context, req.body.answer);

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
  app.post("/api/cards/:id/review", validate(ReviewBody), (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const card = db.getCardById(id);
      if (!card) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const { rating, answer, llm_score, llm_feedback } = req.body;
      const now = new Date();

      const { updatedFields, reviewLog } = reschedule(card, rating, now, {
        answer,
        llm_score,
        llm_feedback,
      });

      const updatedCard = db.updateSchedule(id, updatedFields);
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
