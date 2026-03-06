
// app
export const CardStatus = {
  Triaging: "triaging",
  Active: "active",
  Suspended: "suspended",
} as const;
export type CardStatus = (typeof CardStatus)[keyof typeof CardStatus];

// fsrs
export const CardState = {
  New: "new",
  Learning: "learning",
  Review: "review",
  Relearning: "relearning",
} as const;
export type CardState = (typeof CardState)[keyof typeof CardState];

export const Rating = {
  Again: "Again",
  Hard: "Hard",
  Good: "Good",
  Easy: "Easy",
} as const;
export type Rating = (typeof Rating)[keyof typeof Rating];

export interface Card {
  id: string;
  user_id: string;
  front: string;
  back: string | null;
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

export interface ReviewLog {
  id: string;
  card_id: string;
  rating: string;
  answer: string | null;
  llm_score: number | null;
  llm_feedback: string | null;
  reviewed_at: string;
}

export interface UserStats {
  totalActiveCards: number;
  totalReviews: number;
  averageLlmScore: number | null;
  currentStreak: number;
  longestStreak: number;
  contributionGrid: { date: string; count: number }[];
}
