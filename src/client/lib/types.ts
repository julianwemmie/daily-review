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

export type Rating = "Again" | "Hard" | "Good" | "Easy";
