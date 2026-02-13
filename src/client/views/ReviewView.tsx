import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/Kbd.js";
import { fetchDueCards, evaluateCard, reviewCard } from "@/lib/api.js";
import { Rating, type Card as CardType } from "@/lib/types.js";
import { useCounts } from "@/contexts/CountsContext.js";
import { useHotkey } from "@/lib/useHotkey.js";

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

export default function ReviewView() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextDue, setNextDue] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { refreshCounts } = useCounts();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDueCards();
      setCards(data.cards);
      setNextDue(data.next_due);
      setCurrentIndex(0);
      resetCardState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }

  function resetCardState() {
    setAnswer("");
    setEvaluation(null);
    setError(null);
  }

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

  const handleRate = useCallback(async (rating: Rating) => {
    const card = cards[currentIndex];
    if (!card || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      await reviewCard(
        card.id,
        rating,
        answer || undefined,
        evaluation?.score,
        evaluation?.feedback
      );
      refreshCounts();
      setCurrentIndex((prev) => prev + 1);
      resetCardState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }, [cards, currentIndex, answer, evaluation, submitting, refreshCounts]);

  const RATING_ORDER = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;

  const hasCard = !!cards[currentIndex];
  useHotkey({ key: "Enter", meta: true, onPress: handleEvaluate, enabled: hasCard && !evaluation });
  useHotkey({ key: "1", onPress: () => handleRate(RATING_ORDER[0]), enabled: hasCard && !!evaluation });
  useHotkey({ key: "2", onPress: () => handleRate(RATING_ORDER[1]), enabled: hasCard && !!evaluation });
  useHotkey({ key: "3", onPress: () => handleRate(RATING_ORDER[2]), enabled: hasCard && !!evaluation });
  useHotkey({ key: "4", onPress: () => handleRate(RATING_ORDER[3]), enabled: hasCard && !!evaluation });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading cards...</p>
      </div>
    );
  }

  if (error && !evaluation) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={loadCards}>
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
      <p className="text-sm text-muted-foreground">
        {remaining} card{remaining !== 1 ? "s" : ""} due
      </p>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Review</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {currentCard.front}
          </div>

          <Textarea
            placeholder="Type your answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            disabled={evaluating || !!evaluation}
          />

          {evaluation && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">
                Accuracy: {Math.round(evaluation.score * 100)}%
              </p>
              <p className="text-sm text-muted-foreground">
                {evaluation.feedback}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 items-start">
          {!evaluation ? (
            <Button
              onClick={handleEvaluate}
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
