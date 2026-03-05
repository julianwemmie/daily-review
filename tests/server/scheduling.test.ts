import { describe, it, expect } from "vitest";
import { newCardSchedule, reschedule } from "../../src/server/scheduling.js";
import { CardState, Rating, CardStatus } from "../../src/shared/types.js";
import type { Card } from "../../src/shared/types.js";

function makeCard(overrides?: Partial<Card>): Card {
  const now = new Date("2026-03-04T12:00:00Z");
  const defaults = newCardSchedule(now);
  return {
    id: "card-1",
    user_id: "user-1",
    front: "Test question",
    back: "Test answer",
    source_conversation: null,
    tags: null,
    created_at: now.toISOString(),
    status: CardStatus.Active,
    ...defaults,
    ...overrides,
  };
}

describe("newCardSchedule", () => {
  it("returns valid scheduling fields for a new card", () => {
    const now = new Date("2026-03-04T12:00:00Z");
    const schedule = newCardSchedule(now);

    expect(schedule.state).toBe(CardState.New);
    expect(schedule.reps).toBe(0);
    expect(schedule.lapses).toBe(0);
    expect(schedule.stability).toBe(0);
    expect(schedule.due).toBe(now.toISOString());
    expect(schedule.last_review).toBeNull();
  });
});

describe("reschedule", () => {
  it("returns updated fields and a review log", () => {
    const card = makeCard();
    const now = new Date("2026-03-04T13:00:00Z");

    const { updatedFields, reviewLog } = reschedule(card, Rating.Good, now);

    expect(updatedFields.reps).toBe(1);
    expect(updatedFields.last_review).toBe(now.toISOString());
    expect(typeof updatedFields.stability).toBe("number");
    expect(typeof updatedFields.difficulty).toBe("number");
    expect(updatedFields.due).toBeDefined();

    expect(reviewLog.card_id).toBe("card-1");
    expect(reviewLog.rating).toBe(Rating.Good);
    expect(reviewLog.reviewed_at).toBe(now.toISOString());
    expect(reviewLog.answer).toBeNull();
    expect(reviewLog.llm_score).toBeNull();
    expect(reviewLog.llm_feedback).toBeNull();
  });

  it("includes optional review data in the log", () => {
    const card = makeCard();
    const now = new Date("2026-03-04T13:00:00Z");

    const { reviewLog } = reschedule(card, Rating.Hard, now, {
      answer: "my answer",
      llm_score: 0.8,
      llm_feedback: "Good job",
    });

    expect(reviewLog.answer).toBe("my answer");
    expect(reviewLog.llm_score).toBe(0.8);
    expect(reviewLog.llm_feedback).toBe("Good job");
  });

  it("transitions state from New after first review", () => {
    const card = makeCard({ state: CardState.New });
    const now = new Date("2026-03-04T13:00:00Z");

    const { updatedFields } = reschedule(card, Rating.Good, now);

    expect(updatedFields.state).not.toBe(CardState.New);
  });

  it("schedules further out for Easy than Again", () => {
    const card = makeCard();
    const now = new Date("2026-03-04T13:00:00Z");

    const easy = reschedule(card, Rating.Easy, now);
    const again = reschedule(card, Rating.Again, now);

    const easyDue = new Date(easy.updatedFields.due).getTime();
    const againDue = new Date(again.updatedFields.due).getTime();

    expect(easyDue).toBeGreaterThan(againDue);
  });

  it("generates unique review log IDs", () => {
    const card = makeCard();
    const now = new Date("2026-03-04T13:00:00Z");

    const r1 = reschedule(card, Rating.Good, now);
    const r2 = reschedule(card, Rating.Good, now);

    expect(r1.reviewLog.id).not.toBe(r2.reviewLog.id);
  });
});
