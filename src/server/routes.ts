import { type Express, type Request, type Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { CardStatus, CardState, Rating as AppRating, type DbProvider, type Card, type CardEdit, type CardListFilters } from "./db/db-provider.js";
import { type LlmGrader } from "./grader/llm.js";
import { type SttProvider } from "./stt/stt.js";
import { newCardSchedule, reschedule } from "./scheduling.js";
import { validate } from "./middleware/validate.js";

const CreateCardBody = z.object({
  front: z.string().min(1),
  back: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateCardBody = z.object({
  front: z.string().min(1).optional(),
  back: z.string().nullable().optional(),
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

const BatchCreateBody = z.object({
  cards: z.array(CreateCardBody).min(1).max(500),
});

const BatchIdsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export function mountRoutes(app: Express, db: DbProvider, grader?: LlmGrader, stt?: SttProvider): void {
  // -------------------------------------------------------
  // POST /api/cards -- Create a single card
  // -------------------------------------------------------
  app.post("/api/cards", validate(CreateCardBody), async (req: Request, res: Response) => {
    try {
      const { front, back, tags } = req.body;
      const now = new Date();
      const fsrsFields = newCardSchedule(now);

      const card: Card = {
        id: crypto.randomUUID(),
        user_id: req.user!.id,
        front,
        back: back ?? null,
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
  // POST /api/cards/batch-create -- Create multiple cards
  // -------------------------------------------------------
  app.post("/api/cards/batch-create", validate(BatchCreateBody), async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const fsrsFields = newCardSchedule(now);

      const cards: Card[] = req.body.cards.map((c: { front: string; back?: string; tags?: string[] }) => ({
        id: crypto.randomUUID(),
        user_id: req.user!.id,
        front: c.front,
        back: c.back ?? null,
        source_conversation: null,
        tags: c.tags ?? null,
        created_at: now.toISOString(),
        ...fsrsFields,
        state: CardState.New,
        status: CardStatus.Triaging,
      }));

      const created = await db.createCards(cards);
      res.status(201).json({ created: created.length, cards: created });
    } catch (err) {
      console.error("POST /api/cards/batch-create error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/cards/export -- Export all cards as JSON
  // -------------------------------------------------------
  app.get("/api/cards/export", async (req: Request, res: Response) => {
    try {
      const includeScheduling = req.query.includeScheduling === "true";
      const includeReviewHistory = req.query.includeReviewHistory === "true";
      const cards = await db.listCards(req.user!.id);

      // Fetch review logs only if requested
      const logsByCard = new Map<string, Awaited<ReturnType<typeof db.getReviewLogsForCards>>>();
      if (includeReviewHistory) {
        const cardIds = cards.map((c) => c.id);
        const reviewLogs = await db.getReviewLogsForCards(cardIds);
        for (const log of reviewLogs) {
          const arr = logsByCard.get(log.card_id) ?? [];
          arr.push(log);
          logsByCard.set(log.card_id, arr);
        }
      }

      const exportCards = cards.map((card) => {
        const base: Record<string, unknown> = {
          front: card.front,
          back: card.back,
          tags: card.tags,
          status: card.status,
          createdAt: card.created_at,
        };

        if (includeScheduling) {
          base.state = card.state;
          base.due = card.due;
          base.stability = card.stability;
          base.difficulty = card.difficulty;
          base.elapsedDays = card.elapsed_days;
          base.scheduledDays = card.scheduled_days;
          base.learningSteps = card.learning_steps;
          base.reps = card.reps;
          base.lapses = card.lapses;
          base.lastReview = card.last_review;
        }

        if (includeReviewHistory) {
          base.reviewLogs = (logsByCard.get(card.id) ?? []).map((log) => ({
            rating: log.rating,
            answer: log.answer,
            llmScore: log.llm_score,
            llmFeedback: log.llm_feedback,
            reviewedAt: log.reviewed_at,
          }));
        }

        return base;
      });

      const payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        includesScheduling: includeScheduling,
        includesReviewHistory: includeReviewHistory,
        cards: exportCards,
      };

      res.setHeader("Content-Disposition", `attachment; filename="amber-cards-export.json"`);
      res.json(payload);
    } catch (err) {
      console.error("GET /api/cards/export error:", err);
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
  // GET /api/cards -- Consolidated card endpoint
  //   ?view=triage  -> cards with status "triaging"
  //   ?view=due     -> FSRS due cards (with next_due)
  //   ?view=list    -> all cards (default), supports status & q filters
  //   (no view)     -> same as list (backwards compatible)
  // -------------------------------------------------------
  app.get("/api/cards", async (req: Request, res: Response) => {
    try {
      const view = req.query.view as string | undefined;

      if (view === "triage") {
        const cards = await db.listCards(req.user!.id, { status: CardStatus.Triaging });
        res.json(cards);
        return;
      }

      if (view === "due") {
        const now = new Date().toISOString();
        const result = await db.getDueCards(req.user!.id, now);
        res.json(result);
        return;
      }

      // view=list or no view (backwards compatible)
      const status = Object.values(CardStatus).find(s => s === req.query.status);
      const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
      const filters: CardListFilters = {};
      if (status) filters.status = status;
      if (q) filters.q = q;

      const cards = await db.listCards(req.user!.id, Object.keys(filters).length > 0 ? filters : undefined);
      res.json(cards);
    } catch (err) {
      console.error("GET /api/cards error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // POST /api/cards/batch-accept -- Accept multiple triage cards
  // -------------------------------------------------------
  app.post("/api/cards/batch-accept", validate(BatchIdsBody), async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      const count = await db.batchAcceptCards(ids, req.user!.id);
      res.json({ accepted: count });
    } catch (err) {
      console.error("POST /api/cards/batch-accept error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // POST /api/cards/batch-delete -- Delete multiple cards
  // -------------------------------------------------------
  app.post("/api/cards/batch-delete", validate(BatchIdsBody), async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      const count = await db.batchDeleteCards(ids, req.user!.id);
      res.json({ deleted: count });
    } catch (err) {
      console.error("POST /api/cards/batch-delete error:", err);
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

      const result = await grader.evaluate(card.front, card.back, req.body.answer);

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

      // Update last_review_at for email nudge tracking
      await db.updateLastReviewAt(req.user!.id, now.toISOString());

      res.json({
        card: updatedCard,
        review_log: reviewLog,
      });
    } catch (err) {
      console.error("POST /api/cards/:id/review error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/notifications -- Get notification preference
  // -------------------------------------------------------
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const enabled = await db.getEmailNotificationsEnabled(req.user!.id);
      res.json({ email_notifications_enabled: enabled });
    } catch (err) {
      console.error("GET /api/notifications error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // PUT /api/notifications -- Update notification preference
  // -------------------------------------------------------
  app.put("/api/notifications", validate(z.object({ enabled: z.boolean() })), async (req: Request, res: Response) => {
    try {
      await db.setEmailNotificationsEnabled(req.user!.id, req.body.enabled);
      res.json({ email_notifications_enabled: req.body.enabled });
    } catch (err) {
      console.error("PUT /api/notifications error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // GET /api/onboarding/status -- Get onboarding completion status
  // -------------------------------------------------------
  app.get("/api/onboarding/status", async (req: Request, res: Response) => {
    try {
      const completed = await db.getOnboardingCompleted(req.user!.id);
      res.json({ completed });
    } catch (err) {
      console.error("GET /api/onboarding/status error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // POST /api/onboarding/complete -- Mark onboarding as completed
  // -------------------------------------------------------
  app.post("/api/onboarding/complete", async (req: Request, res: Response) => {
    try {
      await db.setOnboardingCompleted(req.user!.id);
      res.json({ completed: true });
    } catch (err) {
      console.error("POST /api/onboarding/complete error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // -------------------------------------------------------
  // POST /api/transcribe -- Speech-to-text via Whisper
  // Accepts raw audio body with Content-Type header
  // -------------------------------------------------------
  app.post("/api/transcribe", async (req: Request, res: Response) => {
    try {
      if (!stt) {
        res.status(501).json({ error: "Speech-to-text not configured (set OPENAI_API_KEY)" });
        return;
      }

      const contentType = req.headers["content-type"] || "audio/webm";
      const audio = req.body as Buffer;

      if (audio.length === 0) {
        res.status(400).json({ error: "No audio data received" });
        return;
      }

      const result = await stt.transcribe(audio, contentType);
      res.json({ text: result.text });
    } catch (err) {
      console.error("POST /api/transcribe error:", err);
      res.status(502).json({ error: "Transcription failed" });
    }
  });
}
