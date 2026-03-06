import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "../../src/cli/api.js";
import { CardState, CardStatus } from "../../src/shared/types.js";
import type { Card } from "../../src/shared/types.js";

function makeCard(overrides?: Partial<Card>): Card {
  return {
    id: "card-1",
    user_id: "user-1",
    front: "What is X?",
    back: "X is Y",
    source_conversation: null,
    tags: ["test"],
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
    status: CardStatus.Active,
    ...overrides,
  };
}

describe("ApiClient", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  function mockFetch(body: unknown, status = 200) {
    fetchSpy.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: () => Promise.resolve(body),
    });
  }

  function makeClient() {
    return new ApiClient({
      serverUrl: "http://localhost:3000",
      auth: { type: "api-key", token: "test-key" },
    });
  }

  it("sends api-key header", async () => {
    const card = makeCard();
    mockFetch(card);
    const client = makeClient();
    await client.createCard({ front: "Q" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/cards",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "test-key" }),
      }),
    );
  });

  it("sends bearer header", async () => {
    mockFetch(makeCard());
    const client = new ApiClient({
      serverUrl: "http://localhost:3000",
      auth: { type: "bearer", token: "session-tok" },
    });
    await client.createCard({ front: "Q" });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer session-tok" }),
      }),
    );
  });

  it("strips trailing slash from server URL", async () => {
    mockFetch(makeCard());
    const client = new ApiClient({
      serverUrl: "http://localhost:3000/",
      auth: { type: "api-key", token: "k" },
    });
    await client.createCard({ front: "Q" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/cards",
      expect.anything(),
    );
  });

  it("throws on non-ok response with error message", async () => {
    mockFetch({ error: "Unauthorized" }, 401);
    const client = makeClient();
    await expect(client.createCard({ front: "Q" })).rejects.toThrow("Unauthorized");
  });

  it("throws with HTTP status when no error body", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("no json")),
    });
    const client = makeClient();
    await expect(client.createCard({ front: "Q" })).rejects.toThrow("HTTP 500");
  });

  it("throws a clear message when server is unreachable", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));
    const client = makeClient();
    await expect(client.createCard({ front: "Q" })).rejects.toThrow("Could not reach server");
  });

  describe("createCard", () => {
    it("posts to /api/cards", async () => {
      const card = makeCard();
      mockFetch(card);
      const result = await makeClient().createCard({ front: "Q", back: "A", tags: ["t"] });

      expect(result).toEqual(card);
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3000/api/cards",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ front: "Q", back: "A", tags: ["t"] }),
        }),
      );
    });
  });

  describe("batchCreateCards", () => {
    it("posts to /api/cards/batch-create", async () => {
      mockFetch({ created: 2, cards: [makeCard(), makeCard({ id: "card-2" })] });
      const result = await makeClient().batchCreateCards([{ front: "Q1" }, { front: "Q2" }]);

      expect(result.created).toBe(2);
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3000/api/cards/batch-create",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("listCards", () => {
    it("fetches with view=list and optional filters", async () => {
      mockFetch([makeCard()]);
      await makeClient().listCards({ status: "active", q: "test" });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain("view=list");
      expect(url).toContain("status=active");
      expect(url).toContain("q=test");
    });
  });

  describe("getDueCards", () => {
    it("fetches with view=due", async () => {
      mockFetch({ cards: [], next_due: null });
      await makeClient().getDueCards();

      expect(fetchSpy.mock.calls[0][0]).toContain("view=due");
    });
  });

  describe("getCounts", () => {
    it("fetches /api/cards/counts", async () => {
      mockFetch({ new: 5, due: 3 });
      const result = await makeClient().getCounts();

      expect(result).toEqual({ new: 5, due: 3 });
    });
  });

  describe("deleteCard", () => {
    it("sends DELETE to /api/cards/:id", async () => {
      mockFetch(undefined);
      await makeClient().deleteCard("card-1");

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3000/api/cards/card-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("batchDeleteCards", () => {
    it("posts to /api/cards/batch-delete", async () => {
      mockFetch({ deleted: 2 });
      await makeClient().batchDeleteCards(["a", "b"]);

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3000/api/cards/batch-delete",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("updateCard", () => {
    it("patches /api/cards/:id", async () => {
      mockFetch(makeCard({ front: "Updated" }));
      await makeClient().updateCard("card-1", { front: "Updated" });

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:3000/api/cards/card-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  describe("evaluateCard", () => {
    it("posts answer to /api/cards/:id/evaluate", async () => {
      mockFetch({ score: 0.8, feedback: "Good" });
      const result = await makeClient().evaluateCard("card-1", "my answer");

      expect(result).toEqual({ score: 0.8, feedback: "Good" });
    });
  });

  describe("reviewCard", () => {
    it("posts rating to /api/cards/:id/review", async () => {
      mockFetch(undefined);
      await makeClient().reviewCard("card-1", "Good", { answer: "A", llm_score: 0.9 });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.rating).toBe("Good");
      expect(body.answer).toBe("A");
      expect(body.llm_score).toBe(0.9);
    });
  });

  describe("exportCards", () => {
    it("fetches /api/cards/export with options", async () => {
      mockFetch({ exportedAt: "now", version: 1, includesScheduling: true, cards: [] });
      await makeClient().exportCards({ includeScheduling: true, includeReviewHistory: true });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain("includeScheduling=true");
      expect(url).toContain("includeReviewHistory=true");
    });
  });

  describe("batchAcceptCards", () => {
    it("posts to /api/cards/batch-accept", async () => {
      mockFetch({ accepted: 2 });
      const result = await makeClient().batchAcceptCards(["a", "b"]);

      expect(result.accepted).toBe(2);
    });
  });
});
