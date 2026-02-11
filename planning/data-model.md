# Data Model

## Card (core primitive)

```typescript
id: string
front: string              // the prompt shown to the user
context?: string           // hidden; reference material for the LLM judge
source_conversation?: string
tags?: string[]
created_at: Date

// FSRS-owned scheduling fields
due: Date
stability: number
difficulty: number
elapsed_days: number
scheduled_days: number
learning_steps: number
reps: number
lapses: number
state: "new" | "learning" | "review" | "relearning"
last_review?: Date
```

Key decisions:
- **No `back` field.** An LLM judges the user's free-form answer instead of showing a rigid correct answer.
- **`context` is hidden from the user** but passed to the LLM judge as reference material for conversation-specific knowledge.
- **FSRS fields are stored on the card** but managed by the ts-fsrs library.
- Dashboard stats, due cards, retention rates, topic breakdowns - all derived from Card fields.

## ReviewLog (for stats/history)

```typescript
id: string
card_id: string
rating: Rating             // FSRS rating (Again, Hard, Good, Easy)
answer: string             // what the user said
llm_score: number          // 0-1 from the LLM judge
llm_feedback?: string
reviewed_at: Date
```

LLM score → FSRS rating mapping:
- 0.0 - 0.3 → Again
- 0.3 - 0.6 → Hard
- 0.6 - 0.85 → Good
- 0.85 - 1.0 → Easy

Cards only store current scheduling state; the ReviewLog preserves full history for analytics.
