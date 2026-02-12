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

