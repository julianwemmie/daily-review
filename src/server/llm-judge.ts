export interface JudgeResult {
  score: number;
  feedback: string;
}

export interface LlmJudge {
  evaluate(
    front: string,
    context: string | null,
    answer: string
  ): Promise<JudgeResult>;
}

/**
 * Map a 0–1 LLM score to an FSRS rating string.
 *
 *   0.0  – 0.3  → Again
 *   0.3  – 0.6  → Hard
 *   0.6  – 0.85 → Good
 *   0.85 – 1.0  → Easy
 */
export function scoreToRating(
  score: number
): "Again" | "Hard" | "Good" | "Easy" {
  if (score < 0.3) return "Again";
  if (score < 0.6) return "Hard";
  if (score < 0.85) return "Good";
  return "Easy";
}
