import { CardStatus, CardState, Rating, type Card, type ReviewLog, type UserStats } from "../types.js";
import type { DueCardsResponse, EvaluateResponse } from "../api.js";
import type { StorageProvider } from "./types.js";

// ---- Sample cards ----

const SAMPLE_CARDS: { front: string; back: string; tags: string[] }[] = [
  {
    front: "What is spaced repetition?",
    back: "A learning technique where review intervals increase over time based on how well you remember each item. Items you struggle with are shown more frequently.",
    tags: ["learning"],
  },
  {
    front: "What does FSRS stand for?",
    back: "Free Spaced Repetition Scheduler — an open-source, adaptive algorithm that optimizes review timing based on your personal memory patterns.",
    tags: ["learning"],
  },
  {
    front: "What is the mitochondria's primary function?",
    back: "Generating ATP (adenosine triphosphate) through cellular respiration — often called the 'powerhouse of the cell'.",
    tags: ["biology"],
  },
  {
    front: "What is the time complexity of binary search?",
    back: "O(log n) — it halves the search space with each comparison.",
    tags: ["computer-science"],
  },
  {
    front: "¿Cómo se dice 'thank you' en español?",
    back: "Gracias",
    tags: ["spanish"],
  },
];

function makeId(): string {
  return `demo-${crypto.randomUUID()}`;
}

function makeCard(data: { front: string; back: string; tags?: string[] }, index: number): Card {
  const now = new Date();
  // Stagger due dates so some are due now and some are in the future
  const due = new Date(now.getTime() - (index < 3 ? 1000 : -86400000 * index));
  return {
    id: makeId(),
    user_id: "demo",
    front: data.front,
    back: data.back,
    source_conversation: null,
    tags: data.tags ?? null,
    created_at: now.toISOString(),
    due: due.toISOString(),
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
  };
}

// Simple FSRS-like scheduling for demo mode
function scheduleReview(card: Card, rating: Rating): Card {
  const now = new Date();
  const intervals: Record<Rating, number> = {
    [Rating.Again]: 1 / 1440, // 1 minute
    [Rating.Hard]: 0.5,       // 12 hours
    [Rating.Good]: 1,         // 1 day
    [Rating.Easy]: 4,         // 4 days
  };
  const intervalDays = intervals[rating] * Math.max(1, card.reps + 1);
  const nextDue = new Date(now.getTime() + intervalDays * 86400000);

  return {
    ...card,
    due: nextDue.toISOString(),
    reps: card.reps + 1,
    last_review: now.toISOString(),
    state: rating === Rating.Again ? CardState.Relearning : CardState.Review,
    lapses: rating === Rating.Again ? card.lapses + 1 : card.lapses,
    elapsed_days: card.last_review
      ? (now.getTime() - new Date(card.last_review).getTime()) / 86400000
      : 0,
    scheduled_days: intervalDays,
  };
}

export class MemoryStorageProvider implements StorageProvider {
  private cards: Map<string, Card>;
  private reviewLogs: Map<string, ReviewLog[]>;

  constructor() {
    this.cards = new Map();
    this.reviewLogs = new Map();

    // Seed with sample cards
    SAMPLE_CARDS.forEach((data, i) => {
      const card = makeCard(data, i);
      this.cards.set(card.id, card);
    });
  }

  async fetchCounts(): Promise<{ new: number; due: number }> {
    const now = new Date();
    let newCount = 0;
    let dueCount = 0;
    for (const card of this.cards.values()) {
      if (card.status === CardStatus.Triaging) {
        newCount++;
      } else if (card.status === CardStatus.Active && new Date(card.due) <= now) {
        dueCount++;
      }
    }
    return { new: newCount, due: dueCount };
  }

  async fetchTriageCards(): Promise<Card[]> {
    return [...this.cards.values()].filter((c) => c.status === CardStatus.Triaging);
  }

  async fetchDueCards(): Promise<DueCardsResponse> {
    const now = new Date();
    const dueCards = [...this.cards.values()]
      .filter((c) => c.status === CardStatus.Active && new Date(c.due) <= now)
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

    const nextFuture = [...this.cards.values()]
      .filter((c) => c.status === CardStatus.Active && new Date(c.due) > now)
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

    return {
      cards: dueCards,
      next_due: nextFuture.length > 0 ? nextFuture[0].due : null,
    };
  }

  async fetchListCards(options?: { status?: string; q?: string }): Promise<Card[]> {
    let cards = [...this.cards.values()].filter((c) => c.status === CardStatus.Active);
    if (options?.status) {
      cards = cards.filter((c) => c.status === options.status);
    }
    if (options?.q) {
      const q = options.q.toLowerCase();
      cards = cards.filter(
        (c) =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return cards;
  }

  async fetchStats(): Promise<UserStats> {
    const allLogs: ReviewLog[] = [];
    for (const logs of this.reviewLogs.values()) {
      allLogs.push(...logs);
    }
    const scores = allLogs.map((l) => l.llm_score).filter((s): s is number => s !== null);
    return {
      totalActiveCards: [...this.cards.values()].filter((c) => c.status === CardStatus.Active).length,
      totalReviews: allLogs.length,
      averageLlmScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      currentStreak: 0,
      longestStreak: 0,
      contributionGrid: [],
    };
  }

  async fetchCardReviewLogs(cardId: string): Promise<ReviewLog[]> {
    return this.reviewLogs.get(cardId) ?? [];
  }

  async createCard(data: { front: string; back: string; tags?: string[] }): Promise<Card> {
    const card = makeCard(data, 0);
    this.cards.set(card.id, card);
    return card;
  }

  async updateCard(
    id: string,
    data: { front?: string; back?: string; tags?: string[] | null; status?: string },
  ): Promise<Card> {
    const card = this.cards.get(id);
    if (!card) throw new Error("Card not found");
    const updated = { ...card, ...data };
    this.cards.set(id, updated);
    return updated;
  }

  async deleteCard(id: string): Promise<void> {
    this.cards.delete(id);
    this.reviewLogs.delete(id);
  }

  async acceptCard(id: string): Promise<Card> {
    return this.updateCard(id, { status: CardStatus.Active });
  }

  async reviewCard(
    id: string,
    rating: Rating,
    answer?: string,
    llmScore?: number,
    llmFeedback?: string,
  ): Promise<void> {
    const card = this.cards.get(id);
    if (!card) throw new Error("Card not found");

    const updated = scheduleReview(card, rating);
    this.cards.set(id, updated);

    const log: ReviewLog = {
      id: makeId(),
      card_id: id,
      rating,
      answer: answer ?? null,
      llm_score: llmScore ?? null,
      llm_feedback: llmFeedback ?? null,
      reviewed_at: new Date().toISOString(),
    };
    const logs = this.reviewLogs.get(id) ?? [];
    logs.push(log);
    this.reviewLogs.set(id, logs);
  }

  async batchAcceptCards(ids: string[]): Promise<{ accepted: number }> {
    let accepted = 0;
    for (const id of ids) {
      if (this.cards.has(id)) {
        await this.acceptCard(id);
        accepted++;
      }
    }
    return { accepted };
  }

  async batchDeleteCards(ids: string[]): Promise<{ deleted: number }> {
    let deleted = 0;
    for (const id of ids) {
      if (this.cards.has(id)) {
        this.cards.delete(id);
        this.reviewLogs.delete(id);
        deleted++;
      }
    }
    return { deleted };
  }

  async batchCreateCards(
    cards: { front: string; back: string; tags?: string[] }[],
  ): Promise<{ created: number; cards: Card[] }> {
    const created: Card[] = [];
    for (const data of cards) {
      const card = await this.createCard(data);
      created.push(card);
    }
    return { created: created.length, cards: created };
  }

  async exportCards(): Promise<void> {
    const cards = [...this.cards.values()];
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "amber-cards-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async evaluateCard(_id: string, _answer: string): Promise<EvaluateResponse> {
    throw new Error("AI grading requires a logged-in account");
  }

  async analyzeCard(_cardId: string): Promise<{ analysis: string }> {
    throw new Error("AI analysis requires a logged-in account");
  }

  async transcribeAudio(_audioBlob: Blob): Promise<{ text: string }> {
    throw new Error("Audio transcription requires a logged-in account");
  }

  async getNotificationPreference(): Promise<boolean> {
    return false;
  }

  async setNotificationPreference(_enabled: boolean): Promise<void> {
    // No-op in demo mode
  }
}
