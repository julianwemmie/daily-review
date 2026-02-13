import crypto from "crypto";
import {
  fsrs,
  createEmptyCard,
  Rating,
  State,
  type Card as FSRSCard,
  type Grade,
} from "ts-fsrs";
import {
  CardState,
  Rating as AppRating,
  type Card,
  type SchedulingUpdate,
  type ReviewLogInsert,
} from "./db/db-provider.js";

const f = fsrs();

// ts-fsrs uses numeric enums; our app uses string literals. These maps bridge between the two.
const ratingMap: Record<AppRating, Grade> = {
  [AppRating.Again]: Rating.Again,
  [AppRating.Hard]: Rating.Hard,
  [AppRating.Good]: Rating.Good,
  [AppRating.Easy]: Rating.Easy,
};

const stateToString: Record<number, CardState> = {
  [State.New]: CardState.New,
  [State.Learning]: CardState.Learning,
  [State.Review]: CardState.Review,
  [State.Relearning]: CardState.Relearning,
};

const stringToState: Record<CardState, State> = {
  [CardState.New]: State.New,
  [CardState.Learning]: State.Learning,
  [CardState.Review]: State.Review,
  [CardState.Relearning]: State.Relearning,
};

function cardToFSRS(card: Card): FSRSCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: stringToState[card.state] ?? State.New,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

function fsrsToSchedulingUpdate(fsrsCard: FSRSCard): SchedulingUpdate {
  return {
    due: fsrsCard.due.toISOString(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsed_days: fsrsCard.elapsed_days,
    scheduled_days: fsrsCard.scheduled_days,
    learning_steps: fsrsCard.learning_steps,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: stateToString[fsrsCard.state] ?? CardState.New,
    last_review: fsrsCard.last_review
      ? fsrsCard.last_review.toISOString()
      : null,
  };
}

/** Create the FSRS scheduling fields for a brand-new card. */
export function newCardSchedule(now: Date): SchedulingUpdate {
  return fsrsToSchedulingUpdate(createEmptyCard(now));
}

/** Run FSRS scheduling on an existing card and build the review log entry. */
export function reschedule(
  card: Card,
  rating: AppRating,
  now: Date,
  opts?: { answer?: string; llm_score?: number; llm_feedback?: string },
): { updatedFields: SchedulingUpdate; reviewLog: ReviewLogInsert } {
  const grade = ratingMap[rating];
  const fsrsCard = cardToFSRS(card);
  const result = f.next(fsrsCard, now, grade);
  const updatedFields = fsrsToSchedulingUpdate(result.card);

  const reviewLog: ReviewLogInsert = {
    id: crypto.randomUUID(),
    card_id: card.id,
    rating,
    answer: opts?.answer ?? null,
    llm_score: opts?.llm_score ?? null,
    llm_feedback: opts?.llm_feedback ?? null,
    reviewed_at: now.toISOString(),
  };

  return { updatedFields, reviewLog };
}
