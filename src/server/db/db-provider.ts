// Database provider interface — program to this, swap implementations freely.

export { CardStatus, CardState, Rating, type Card } from "../../shared/types.js";
import type { CardStatus, CardState, Card } from "../../shared/types.js";

export interface CardEdit {
  front?: string;
  context?: string | null;
  source_conversation?: string | null;
  tags?: string[] | null;
  status?: CardStatus;
}

export interface SchedulingUpdate {
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
  status?: CardStatus;
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
  editCard(id: string, fields: CardEdit): Card | undefined;
  updateSchedule(id: string, fields: SchedulingUpdate): Card | undefined;
  deleteCard(id: string): boolean;
  createReviewLog(log: ReviewLogInsert): void;
}
