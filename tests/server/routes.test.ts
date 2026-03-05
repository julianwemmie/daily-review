import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { mountRoutes } from "../../src/server/routes.js";
import { CardStatus, CardState } from "../../src/shared/types.js";
import type { Card } from "../../src/shared/types.js";
import type { DbProvider } from "../../src/server/db/db-provider.js";
import type { LlmGrader } from "../../src/server/grader/llm.js";

const TEST_USER_ID = "test-user-id";

function makeCard(overrides?: Partial<Card>): Card {
  return {
    id: "card-1",
    user_id: TEST_USER_ID,
    front: "Q",
    back: "A",
    source_conversation: null,
    tags: null,
    created_at: "2026-03-04T12:00:00.000Z",
    due: "2026-03-04T12:00:00.000Z",
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: CardState.New,
    last_review: null,
    status: CardStatus.Triaging,
    ...overrides,
  };
}

function createMockDb(): DbProvider {
  return {
    createCards: vi.fn(async (cards) => cards),
    getCardById: vi.fn(async () => makeCard()),
    listCards: vi.fn(async () => [makeCard()]),
    getDueCards: vi.fn(async () => ({ cards: [makeCard()], next_due: null })),
    getCounts: vi.fn(async () => ({ new: 5, due: 3 })),
    editCard: vi.fn(async (_id, _uid, fields) => makeCard(fields as any)),
    updateSchedule: vi.fn(async () => makeCard()),
    deleteCard: vi.fn(async () => true),
    batchAcceptCards: vi.fn(async (ids) => ids.length),
    batchDeleteCards: vi.fn(async (ids) => ids.length),
    createReviewLog: vi.fn(async () => {}),
    updateLastReviewAt: vi.fn(async () => {}),
    getEmailNotificationsEnabled: vi.fn(async () => false),
    setEmailNotificationsEnabled: vi.fn(async () => {}),
    getOnboardingCompleted: vi.fn(async () => false),
    setOnboardingCompleted: vi.fn(async () => {}),
  };
}

function createApp(db: DbProvider, grader?: LlmGrader) {
  const app = express();
  app.use(express.json());
  // Skip real auth — inject fake user
  app.use((req, _res, next) => {
    req.user = { id: TEST_USER_ID } as any;
    next();
  });
  mountRoutes(app, db, grader);
  return app;
}

describe("API routes", () => {
  let db: ReturnType<typeof createMockDb>;
  let app: express.Express;

  beforeEach(() => {
    db = createMockDb();
    app = createApp(db);
  });

  // ── POST /api/cards ──

  describe("POST /api/cards", () => {
    it("creates a card and returns 201", async () => {
      const res = await request(app)
        .post("/api/cards")
        .send({ front: "Hello" });

      expect(res.status).toBe(201);
      expect(db.createCards).toHaveBeenCalledTimes(1);
      const card = (db.createCards as any).mock.calls[0][0][0];
      expect(card.front).toBe("Hello");
      expect(card.user_id).toBe(TEST_USER_ID);
      expect(card.status).toBe(CardStatus.Triaging);
    });

    it("returns 400 when front is missing", async () => {
      const res = await request(app)
        .post("/api/cards")
        .send({ back: "answer" });

      expect(res.status).toBe(400);
    });

    it("returns 400 when front is empty string", async () => {
      const res = await request(app)
        .post("/api/cards")
        .send({ front: "" });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/cards/batch-create ──

  describe("POST /api/cards/batch-create", () => {
    it("creates multiple cards", async () => {
      const res = await request(app)
        .post("/api/cards/batch-create")
        .send({ cards: [{ front: "Q1" }, { front: "Q2" }] });

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(2);
    });

    it("returns 400 with empty cards array", async () => {
      const res = await request(app)
        .post("/api/cards/batch-create")
        .send({ cards: [] });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/cards ──

  describe("GET /api/cards", () => {
    it("returns cards list", async () => {
      const res = await request(app).get("/api/cards");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(db.listCards).toHaveBeenCalledWith(TEST_USER_ID, undefined);
    });

    it("filters by view=triage", async () => {
      const res = await request(app).get("/api/cards?view=triage");

      expect(res.status).toBe(200);
      expect(db.listCards).toHaveBeenCalledWith(TEST_USER_ID, {
        status: CardStatus.Triaging,
      });
    });

    it("returns due cards with view=due", async () => {
      const res = await request(app).get("/api/cards?view=due");

      expect(res.status).toBe(200);
      expect(db.getDueCards).toHaveBeenCalled();
    });

    it("passes status filter for list view", async () => {
      const res = await request(app).get("/api/cards?status=active");

      expect(res.status).toBe(200);
      expect(db.listCards).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({ status: "active" }),
      );
    });
  });

  // ── GET /api/cards/counts ──

  describe("GET /api/cards/counts", () => {
    it("returns card counts", async () => {
      const res = await request(app).get("/api/cards/counts");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ new: 5, due: 3 });
    });
  });

  // ── PATCH /api/cards/:id ──

  describe("PATCH /api/cards/:id", () => {
    it("updates a card", async () => {
      const res = await request(app)
        .patch("/api/cards/card-1")
        .send({ front: "Updated" });

      expect(res.status).toBe(200);
      expect(db.editCard).toHaveBeenCalledWith("card-1", TEST_USER_ID, {
        front: "Updated",
      });
    });

    it("returns 400 with empty body", async () => {
      const res = await request(app)
        .patch("/api/cards/card-1")
        .send({});

      expect(res.status).toBe(400);
    });

    it("returns 404 when card not found", async () => {
      (db.editCard as any).mockResolvedValue(undefined);

      const res = await request(app)
        .patch("/api/cards/card-1")
        .send({ front: "Updated" });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/cards/:id ──

  describe("DELETE /api/cards/:id", () => {
    it("deletes a card", async () => {
      const res = await request(app).delete("/api/cards/card-1");

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("returns 404 when card not found", async () => {
      (db.deleteCard as any).mockResolvedValue(false);

      const res = await request(app).delete("/api/cards/card-1");

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/cards/batch-accept ──

  describe("POST /api/cards/batch-accept", () => {
    it("accepts cards by IDs", async () => {
      const ids = ["a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"];
      const res = await request(app)
        .post("/api/cards/batch-accept")
        .send({ ids });

      expect(res.status).toBe(200);
      expect(res.body.accepted).toBe(1);
    });

    it("returns 400 with invalid UUIDs", async () => {
      const res = await request(app)
        .post("/api/cards/batch-accept")
        .send({ ids: ["not-a-uuid"] });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/cards/batch-delete ──

  describe("POST /api/cards/batch-delete", () => {
    it("deletes cards by IDs", async () => {
      const ids = ["a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"];
      const res = await request(app)
        .post("/api/cards/batch-delete")
        .send({ ids });

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(1);
    });
  });

  // ── POST /api/cards/:id/review ──

  describe("POST /api/cards/:id/review", () => {
    it("submits a review", async () => {
      const res = await request(app)
        .post("/api/cards/card-1/review")
        .send({ rating: "Good" });

      expect(res.status).toBe(200);
      expect(res.body.card).toBeDefined();
      expect(res.body.review_log).toBeDefined();
      expect(db.updateSchedule).toHaveBeenCalled();
      expect(db.createReviewLog).toHaveBeenCalled();
      expect(db.updateLastReviewAt).toHaveBeenCalled();
    });

    it("returns 400 with invalid rating", async () => {
      const res = await request(app)
        .post("/api/cards/card-1/review")
        .send({ rating: "Invalid" });

      expect(res.status).toBe(400);
    });

    it("returns 404 when card not found", async () => {
      (db.getCardById as any).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/api/cards/card-1/review")
        .send({ rating: "Good" });

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/cards/:id/evaluate ──

  describe("POST /api/cards/:id/evaluate", () => {
    it("returns 501 when grader not configured", async () => {
      const res = await request(app)
        .post("/api/cards/card-1/evaluate")
        .send({ answer: "test" });

      expect(res.status).toBe(501);
    });

    it("returns LLM evaluation when grader is configured", async () => {
      const grader: LlmGrader = {
        evaluate: vi.fn(async () => ({ score: 0.9, feedback: "Great!" })),
      };
      const appWithGrader = createApp(db, grader);

      const res = await request(appWithGrader)
        .post("/api/cards/card-1/evaluate")
        .send({ answer: "my answer" });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(0.9);
      expect(res.body.feedback).toBe("Great!");
    });
  });

  // ── Notifications ──

  describe("GET /api/notifications", () => {
    it("returns notification preference", async () => {
      const res = await request(app).get("/api/notifications");

      expect(res.status).toBe(200);
      expect(res.body.email_notifications_enabled).toBe(false);
    });
  });

  describe("PUT /api/notifications", () => {
    it("updates notification preference", async () => {
      const res = await request(app)
        .put("/api/notifications")
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(db.setEmailNotificationsEnabled).toHaveBeenCalledWith(
        TEST_USER_ID,
        true,
      );
    });

    it("returns 400 with non-boolean enabled", async () => {
      const res = await request(app)
        .put("/api/notifications")
        .send({ enabled: "yes" });

      expect(res.status).toBe(400);
    });
  });

  // ── Onboarding ──

  describe("GET /api/onboarding/status", () => {
    it("returns onboarding status", async () => {
      const res = await request(app).get("/api/onboarding/status");

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(false);
    });
  });

  describe("POST /api/onboarding/complete", () => {
    it("marks onboarding complete", async () => {
      const res = await request(app).post("/api/onboarding/complete");

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(db.setOnboardingCompleted).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });
});
