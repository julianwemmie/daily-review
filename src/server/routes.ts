import { type Express, type Request, type Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { CardStatus, CardState, Rating as AppRating, type DbProvider, type Card, type CardEdit } from "./db/db-provider.js";
import { type LlmGrader } from "./grader/llm.js";
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

export function mountRoutes(app: Express, db: DbProvider, grader?: LlmGrader): void {
  // -------------------------------------------------------
  // POST /api/cards -- Create a single card
  // -------------------------------------------------------
  app.post("/api/cards", validate(CreateCardBody), async (req: Request, res: Response) => {
    try {
      const { front, context, tags } = req.body;
      const now = new Date();
      const fsrsFields = newCardSchedule(now);

      const card: Card = {
        id: crypto.randomUUID(),
        user_id: req.user!.id,
        front,
        context: context ?? null,
        source_conversation: null,
        tags: tags ?? null,
        created_at: now.toISOString(),
        ...fsrsFields,
        state: CardState.New,
        status: CardStatus.Triaging,
      };

      const created = await db.createCards([card]);
      res.status(201).json(created[0]);
    } catch (err) {
      console.error("POST /api/cards error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/cards/counts -- Lightweight tab badge counts
  // -------------------------------------------------------
  app.get("/api/cards/counts", async (req: Request, res: Response) => {
    try {
      const now = new Date().toISOString();
      const counts = await db.getCounts(req.user!.id, now);
      res.json(counts);
    } catch (err) {
      console.error("GET /api/cards/counts error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/cards -- List cards with optional status filter
  // -------------------------------------------------------
  app.get("/api/cards", async (req: Request, res: Response) => {
    try {
      const status = Object.values(CardStatus).find(s => s === req.query.status);
      const filters = status ? { status } : undefined;

      const cards = await db.listCards(req.user!.id, filters);
      res.json(cards);
    } catch (err) {
      console.error("GET /api/cards error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/cards/due -- Cards due for review
  // -------------------------------------------------------
  app.get("/api/cards/due", async (req: Request, res: Response) => {
    try {
      const now = new Date().toISOString();
      const result = await db.getDueCards(req.user!.id, now);
      res.json(result);
    } catch (err) {
      console.error("GET /api/cards/due error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // PATCH /api/cards/:id -- Update a card
  // -------------------------------------------------------
  app.patch("/api/cards/:id", validate(UpdateCardBody), async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;

      const cardEdit: CardEdit = req.body;
      if (Object.keys(cardEdit).length === 0) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      const updated = await db.editCard(id, req.user!.id, cardEdit);
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
  app.delete("/api/cards/:id", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await db.deleteCard(id, req.user!.id);

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
  // POST /api/cards/:id/evaluate -- LLM grader only (no scheduling)
  // -------------------------------------------------------
  app.post("/api/cards/:id/evaluate", validate(EvaluateBody), async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!grader) {
        res.status(501).json({ error: "LLM grader not configured" });
        return;
      }

      const { id } = req.params;
      const card = await db.getCardById(id, req.user!.id);
      if (!card) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const result = await grader.evaluate(card.front, card.context, req.body.answer);

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
  app.post("/api/cards/:id/review", validate(ReviewBody), async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const card = await db.getCardById(id, req.user!.id);
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

      const updatedCard = await db.updateSchedule(id, req.user!.id, updatedFields);
      await db.createReviewLog(reviewLog);

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
