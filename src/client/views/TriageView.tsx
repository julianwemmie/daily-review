import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchCards, acceptCard, skipCard } from "@/lib/api.js";
import { useCounts } from "@/contexts/CountsContext.js";
import { CardStatus, type Card as CardType } from "@/lib/types.js";

export default function TriageView() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { refreshCounts } = useCounts();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    try {
      setLoading(true);
      setError(null);
      const newCards = await fetchCards({ status: CardStatus.Triaging });
      setCards(newCards);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    const card = cards[currentIndex];
    if (!card) return;
    try {
      setActionLoading(true);
      await acceptCard(card.id);
      refreshCounts();
      advanceCardIndex();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept card");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSkip() {
    const card = cards[currentIndex];
    if (!card) return;
    try {
      setActionLoading(true);
      await skipCard(card.id);
      refreshCounts();
      advanceCardIndex();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip card");
    } finally {
      setActionLoading(false);
    }
  }

  function advanceCardIndex() {
    setCurrentIndex((prev) => prev + 1);
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
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No new cards to review</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">
        {remaining} card{remaining !== 1 ? "s" : ""} remaining
      </p>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">New Card</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {currentCard.front}
          </div>
          {currentCard.tags && currentCard.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {currentCard.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-3">
          <Button onClick={handleAccept} disabled={actionLoading}>
            Accept
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={actionLoading}
          >
            Skip
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
