export interface GraderResult {
  score: number;
  feedback: string;
}

export interface LlmGrader {
  evaluate(
    front: string,
    context: string | null,
    answer: string
  ): Promise<GraderResult>;
}
