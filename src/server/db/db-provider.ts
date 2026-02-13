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
  next_due: string | null;
}

export interface CardCounts {
  new: number;
  due: number;
}

export interface DbProvider {
  createCards(cards: Card[]): Promise<Card[]>;
  getCardById(id: string, userId: string): Promise<Card | undefined>;
  listCards(userId: string, filters?: CardListFilters): Promise<Card[]>;
  getDueCards(userId: string, now: string): Promise<DueCardsResult>;
  getCounts(userId: string, now: string): Promise<CardCounts>;
  editCard(id: string, userId: string, fields: CardEdit): Promise<Card | undefined>;
  updateSchedule(id: string, userId: string, fields: SchedulingUpdate): Promise<Card | undefined>;
  deleteCard(id: string, userId: string): Promise<boolean>;
  createReviewLog(log: ReviewLogInsert): Promise<void>;
}
