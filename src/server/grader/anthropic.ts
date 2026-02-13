import Anthropic from "@anthropic-ai/sdk";
import type { LlmGrader, GraderResult } from "./llm.js";

const SYSTEM_PROMPT = `You are a flashcard answer evaluator for a spaced repetition learning system. Your job is to assess how well a learner's free-form answer demonstrates understanding of the concept being tested.

You will receive:
- QUESTION: The flashcard prompt the learner was shown
- CONTEXT: Reference material about the correct answer (may be absent)
- ANSWER: The learner's free-form response

Scoring guidelines:
- 0.0-0.2: Completely wrong, no relevant understanding demonstrated
- 0.2-0.4: Major gaps or significant misconceptions, but some vague awareness
- 0.4-0.6: Partial understanding, gets the gist but misses important details or has minor errors
- 0.6-0.8: Good understanding, covers the key points with minor omissions
- 0.8-0.9: Strong understanding, accurate and fairly complete
- 0.9-1.0: Excellent, demonstrates thorough and precise understanding

Be fair but rigorous. A vague or hand-wavy answer that hits the right keywords but lacks specificity should score lower than a precise, concrete answer. Focus on whether the learner actually understands the concept, not just whether they used the right words.

Keep feedback to 1-2 sentences. Be specific about what was good or what was missed.`;

const OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    score: {
      type: "number" as const,
      description: "Accuracy score from 0.0 to 1.0",
    },
    feedback: {
      type: "string" as const,
      description: "1-2 sentence explanation of what was good or missed",
    },
  },
  required: ["score", "feedback"],
  additionalProperties: false,
};

const client = new Anthropic();

export const anthropicGrader: LlmGrader = {
  async evaluate(front, context, answer): Promise<GraderResult> {
    let userMessage = `QUESTION:\n${front}\n\n`;
    if (context) {
      userMessage += `CONTEXT:\n${context}\n\n`;
    }
    userMessage += `ANSWER:\n${answer}`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      output_config: {
        format: {
          type: "json_schema",
          schema: OUTPUT_SCHEMA,
        },
      },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("LLM response contained no text content");
    }

    const { score, feedback } = JSON.parse(textBlock.text) as {
      score: number;
      feedback: string;
    };

    return {
      score: Math.max(0, Math.min(1, score)),
      feedback,
    };
  },
};
