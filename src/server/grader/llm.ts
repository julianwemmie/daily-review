export interface GraderResult {
  score: number;
  feedback: string;
}

export interface LlmGrader {
  evaluate(
    front: string,
    back: string | null,
    answer: string
  ): Promise<GraderResult>;
}
