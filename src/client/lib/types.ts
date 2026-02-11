export interface Card {
  id: string;
  front: string;
  context?: string;
  source_conversation?: string;
  tags?: string[];
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
  last_review?: string;
  status: "triaging" | "active" | "suspended";
}

export type Rating = "Again" | "Hard" | "Good" | "Easy";
