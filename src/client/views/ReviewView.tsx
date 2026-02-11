import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchDueCards, reviewCard } from "@/lib/api.js";
import type { Card as CardType, Rating } from "@/lib/types.js";
import { useRefreshCounts } from "@/App.js";

const RATINGS: Rating[] = ["Easy", "Good", "Hard", "Again"];

const ratingStyles: Record<Rating, string> = {
  Again: "destructive",
  Hard: "outline",
  Good: "secondary",
  Easy: "default",
} as const;

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

export default function ReviewView() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [nextDue, setNextDue] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [showRating, setShowRating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const refreshCounts = useRefreshCounts();
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
      setUpcomingCount(data.upcoming_count);
      setNextDue(data.next_due);
      setCurrentIndex(0);
      setAnswer("");
      setShowRating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }

  async function handleRate(rating: Rating) {
    const card = cards[currentIndex];
    if (!card) return;
    try {
      setActionLoading(true);
      await reviewCard(card.id, rating, answer || undefined);
      refreshCounts();
      setCurrentIndex((prev) => prev + 1);
      setAnswer("");
      setShowRating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading cards...</p>
      </div>
    );
  }

  if (error) {
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
        {upcomingCount > 0 && nextDue && (
          <p className="text-sm text-muted-foreground">
            {upcomingCount} card{upcomingCount !== 1 ? "s" : ""} scheduled, next
            due in {formatTimeUntil(nextDue)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">
        {remaining} card{remaining !== 1 ? "s" : ""} due
        {upcomingCount > 0 && (
          <span> &middot; {upcomingCount} more scheduled</span>
        )}
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
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 items-start">
          {!showRating ? (
            <Button
              onClick={() => setShowRating(true)}
              disabled={!answer.trim()}
            >
              Show Rating
            </Button>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {RATINGS.map((rating) => (
                <Button
                  key={rating}
                  variant={
                    ratingStyles[rating] as
                      | "destructive"
                      | "outline"
                      | "secondary"
                      | "default"
                  }
                  onClick={() => handleRate(rating)}
                  disabled={actionLoading}
                >
                  {rating}
                </Button>
              ))}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
