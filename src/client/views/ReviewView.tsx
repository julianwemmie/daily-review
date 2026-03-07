import { useCallback, useEffect, useState } from "react";
import { Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/Kbd.js";
import { evaluateCard } from "@/lib/api.js";
import { Rating } from "@/lib/types.js";
import { useDueCards, useReviewCard } from "@/hooks/useCards.js";
import { useHotkey } from "@/lib/useHotkey.js";
import { useVoiceInput } from "@/hooks/useVoiceInput.js";

function formatTimeUntil(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return "now";
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.ceil(hours / 24);
  return `${days}d`;
}

interface Evaluation {
  score: number;
  feedback: string;
}

type GradeMode = "self" | "ai";

export default function ReviewView() {
  const { data: dueData, isLoading: loading, error: queryError, refetch } = useDueCards();
  const cards = dueData?.cards ?? [];
  const nextDue = dueData?.next_due ?? null;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [gradeMode, setGradeMode] = useState<GradeMode>(
    () => (localStorage.getItem("gradeMode") as GradeMode) || "self"
  );
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [selfGraded, setSelfGraded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clamp currentIndex when the cards array shrinks (e.g., after query refetch)
  useEffect(() => {
    if (cards.length > 0) {
      setCurrentIndex((prev) => Math.min(prev, cards.length - 1));
    }
  }, [cards.length]);

  const reviewMutation = useReviewCard();
  const submitting = reviewMutation.isPending;

  function resetCardState() {
    setAnswer("");
    setEvaluation(null);
    setSelfGraded(false);
    setError(null);
  }

  const showingResult = !!evaluation || selfGraded;

  const voice = useVoiceInput(
    useCallback((text: string) => {
      setAnswer((prev) => (prev ? prev + " " + text : text));
    }, [])
  );

  const handleEvaluate = useCallback(async () => {
    const card = cards[currentIndex];
    if (!card || !answer.trim()) return;
    try {
      setEvaluating(true);
      setError(null);
      const result = await evaluateCard(card.id, answer);
      setEvaluation({
        score: result.score,
        feedback: result.feedback,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to evaluate answer"
      );
    } finally {
      setEvaluating(false);
    }
  }, [cards, currentIndex, answer]);

  const handleSelfGrade = useCallback(() => {
    if (!answer.trim()) return;
    setSelfGraded(true);
  }, [answer]);

  const handleSubmit = useCallback(() => {
    if (gradeMode === "ai") {
      handleEvaluate();
    } else {
      handleSelfGrade();
    }
  }, [gradeMode, handleEvaluate, handleSelfGrade]);

  const handleRate = useCallback(async (rating: Rating) => {
    const card = cards[currentIndex];
    if (!card || submitting) return;
    try {
      setError(null);
      await reviewMutation.mutateAsync({
        id: card.id,
        rating,
        answer: answer || undefined,
        llmScore: evaluation?.score,
        llmFeedback: evaluation?.feedback,
      });
      setCurrentIndex((prev) => prev + 1);
      resetCardState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    }
  }, [cards, currentIndex, answer, evaluation, submitting, reviewMutation]);

  const RATING_ORDER = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;

  const hasCard = !!cards[currentIndex];
  useHotkey({ key: "Enter", meta: true, onPress: handleSubmit, enabled: hasCard && !showingResult });
  useHotkey({
    key: "Escape",
    allowInInput: true,
    onPress: () => (document.activeElement as HTMLElement)?.blur(),
  });
  useHotkey({ key: "1", onPress: () => handleRate(RATING_ORDER[0]), enabled: hasCard && showingResult });
  useHotkey({ key: "2", onPress: () => handleRate(RATING_ORDER[1]), enabled: hasCard && showingResult });
  useHotkey({ key: "3", onPress: () => handleRate(RATING_ORDER[2]), enabled: hasCard && showingResult });
  useHotkey({ key: "4", onPress: () => handleRate(RATING_ORDER[3]), enabled: hasCard && showingResult });
  useHotkey({ key: "m", onPress: voice.toggle, enabled: hasCard && !showingResult });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading cards...</p>
      </div>
    );
  }

  const displayError = error ?? (queryError ? queryError.message : null);

  if (displayError && !showingResult) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-destructive">{displayError}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const remaining = cards.length - currentIndex;

  if (!currentCard || remaining <= 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <p className="text-muted-foreground">No cards due for review</p>
        {nextDue && (
          <p className="text-sm text-muted-foreground">
            Next due in {formatTimeUntil(nextDue)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <p className="text-sm text-muted-foreground italic">
          {remaining} card{remaining !== 1 ? "s" : ""} due
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${gradeMode === "self" ? "text-foreground font-medium" : "text-muted-foreground"}`}>Self</span>
          <button
            type="button"
            role="switch"
            aria-checked={gradeMode === "ai"}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setGradeMode((m) => {
              const next = m === "self" ? "ai" : "self";
              localStorage.setItem("gradeMode", next);
              return next;
            })}
          >
            <span
              className={`pointer-events-none block h-4 w-4 rounded-full bg-foreground shadow-sm transition-transform ${
                gradeMode === "ai" ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-xs ${gradeMode === "ai" ? "text-foreground font-medium" : "text-muted-foreground"}`}>AI</span>
        </div>
      </div>

      <Card className="w-full max-w-2xl">
        <CardContent className="flex flex-col gap-4">
          <div className="drop-cap whitespace-pre-wrap text-base font-semibold leading-relaxed font-serif">
            {currentCard.front}
          </div>

          {voice.error && (
            <p className="text-sm text-destructive">{voice.error}</p>
          )}

          <div className="relative">
            <Textarea
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              disabled={evaluating || showingResult}
            />
            <button
              type="button"
              onClick={voice.toggle}
              disabled={evaluating || showingResult}
              className={`absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                voice.recording
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                  : voice.transcribing
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              } disabled:opacity-50 disabled:pointer-events-none`}
              title={voice.recording ? "Stop recording" : voice.transcribing ? "Transcribing..." : "Record answer (M)"}
            >
              {voice.recording ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <rect x="4" y="8" width="2" rx="1" className="fill-red-300 animate-[voice-wave_0.8s_ease-in-out_infinite]" />
                  <rect x="11" y="5" width="2" rx="1" className="fill-red-300 animate-[voice-wave_0.8s_ease-in-out_0.15s_infinite]" />
                  <rect x="18" y="8" width="2" rx="1" className="fill-red-300 animate-[voice-wave_0.8s_ease-in-out_0.3s_infinite]" />
                </svg>
              ) : voice.transcribing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>

          {evaluation && (
            <div className="rounded-sm border border-border p-4 space-y-2">
              <p className="text-sm font-serif font-semibold">
                Accuracy: {Math.round(evaluation.score * 100)}%
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {evaluation.feedback}
              </p>
            </div>
          )}

          {showingResult && currentCard.back && (
            <div className="border-t border-border pt-4 space-y-1">
              <p className="text-xs font-serif font-semibold text-muted-foreground uppercase tracking-widest">
                Reference Answer
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {currentCard.back}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 items-start">
          {!showingResult ? (
            <Button
              onClick={handleSubmit}
              disabled={!answer.trim() || evaluating}
            >
              {evaluating ? "Evaluating..." : <>Submit<Kbd>&#8984;&#9166;</Kbd></>}
            </Button>
          ) : (
            <div className="flex gap-2">
              {RATING_ORDER.map((rating, i) => (
                <Button
                  key={rating}
                  variant={rating === Rating.Again ? "destructive" : "outline"}
                  onClick={() => handleRate(rating)}
                  disabled={submitting}
                >
                  {rating}<Kbd>{i + 1}</Kbd>
                </Button>
              ))}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
