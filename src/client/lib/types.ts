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
  state: "new" | "learning" | "review" | "relearning";
  last_review: string | null;
  status: "triaging" | "active" | "suspended";
}

export type Rating = "Again" | "Hard" | "Good" | "Easy";
