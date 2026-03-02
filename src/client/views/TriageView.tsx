import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/Kbd.js";
import { fetchCards, acceptCard, deleteCard } from "@/lib/api.js";
import { useCounts } from "@/contexts/CountsContext.js";
import { useHotkey } from "@/lib/useHotkey.js";
import { CardStatus, type Card as CardType } from "@/lib/types.js";

export default function TriageView() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { refreshCounts } = useCounts();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);

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

  // Remove a card from the local list and adjust the index
  function removeCard(id: string) {
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setCurrentIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
      return next;
    });
    setShowBack(false);
  }

  const handleAccept = useCallback(async () => {
    const card = cards[currentIndex];
    if (!card || actionLoading) return;
    try {
      setActionLoading(true);
      await acceptCard(card.id);
      refreshCounts();
      removeCard(card.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept card");
    } finally {
      setActionLoading(false);
    }
  }, [cards, currentIndex, actionLoading, refreshCounts]);

  const handleDiscard = useCallback(async () => {
    const card = cards[currentIndex];
    if (!card || actionLoading) return;
    try {
      setActionLoading(true);
      await deleteCard(card.id);
      refreshCounts();
      removeCard(card.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard card");
    } finally {
      setActionLoading(false);
    }
  }, [cards, currentIndex, actionLoading, refreshCounts]);

  const handleAcceptAll = useCallback(async () => {
    if (actionLoading || cards.length === 0) return;
    try {
      setActionLoading(true);
      await Promise.all(cards.map((c) => acceptCard(c.id)));
      refreshCounts();
      setCards([]);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept all");
    } finally {
      setActionLoading(false);
    }
  }, [cards, actionLoading, refreshCounts]);

  const handleDiscardAll = useCallback(async () => {
    if (actionLoading || cards.length === 0) return;
    try {
      setActionLoading(true);
      await Promise.all(cards.map((c) => deleteCard(c.id)));
      refreshCounts();
      setCards([]);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard all");
    } finally {
      setActionLoading(false);
    }
  }, [cards, actionLoading, refreshCounts]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % cards.length);
    setShowBack(false);
  }, [cards.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + cards.length) % cards.length);
    setShowBack(false);
  }, [cards.length]);

  const hasCard = cards.length > 0;
  useHotkey({ key: "1", onPress: handleAccept, enabled: hasCard });
  useHotkey({ key: "2", onPress: handleDiscard, enabled: hasCard });
  useHotkey({ key: "ArrowDown", onPress: goNext, enabled: hasCard });
  useHotkey({ key: "ArrowUp", onPress: goPrev, enabled: hasCard });

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

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No new cards to review</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Counter + bulk actions */}
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {currentIndex + 1} of {cards.length}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAcceptAll}
            disabled={actionLoading}
          >
            Accept All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscardAll}
            disabled={actionLoading}
          >
            Discard All
          </Button>
        </div>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">New Card</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={goPrev}>
              <Kbd>&#8593;</Kbd>
            </Button>
            <Button variant="ghost" size="sm" onClick={goNext}>
              <Kbd>&#8595;</Kbd>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {currentCard.front}
          </div>
          {currentCard.back && (
            showBack ? (
              <div className="rounded-lg border border-dashed p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Back
                </p>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                  {currentCard.back}
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowBack(true)}
              >
                Show back
              </Button>
            )
          )}
          {currentCard.tags && currentCard.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
            Accept<Kbd>1</Kbd>
          </Button>
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={actionLoading}
          >
            Discard<Kbd>2</Kbd>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
