// Database provider interface — program to this, swap implementations freely.

export const CardStatus = {
  Triaging: "triaging",
  Active: "active",
  Suspended: "suspended",
} as const;
export type CardStatus = (typeof CardStatus)[keyof typeof CardStatus];

export const CardState = {
  New: "new",
  Learning: "learning",
  Review: "review",
  Relearning: "relearning",
} as const;
export type CardState = (typeof CardState)[keyof typeof CardState];

export interface Card {
  id: string;
  front: string;
  context: string | null;
  source_conversation: string | null;
  tags: string[] | null;
  created_at: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review: string | null;
  status: CardStatus;
}

export interface CardUpdate {
  front?: string;
  context?: string | null;
  source_conversation?: string | null;
  tags?: string[] | null;
  due?: string;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  learning_steps?: number;
  reps?: number;
  lapses?: number;
  state?: CardState;
  last_review?: string | null;
  status?: CardStatus;
}

export interface ReviewLogInsert {
  id: string;
  card_id: string;
  rating: string;
  answer: string | null;
  llm_score: number | null;
  llm_feedback: string | null;
  reviewed_at: string;
}

export interface CardListFilters {
  state?: CardState[];
  status?: CardStatus[];
}

export interface DueCardsResult {
  cards: Card[];
  upcoming_count: number;
  next_due: string | null;
}

export interface CardCounts {
  new: number;
  due: number;
}

export interface DbProvider {
  createCards(cards: Card[]): Card[];
  getCardById(id: string): Card | undefined;
  listCards(filters?: CardListFilters): Card[];
  getDueCards(now: string): DueCardsResult;
  getCounts(now: string): CardCounts;
  updateCard(id: string, fields: CardUpdate): Card | undefined;
  deleteCard(id: string): boolean;
  createReviewLog(log: ReviewLogInsert): void;
}
