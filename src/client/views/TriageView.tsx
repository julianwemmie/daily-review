import { useCallback, useEffect, useRef, useState } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/Kbd.js";
import { useTriageCards, useInvalidateCards, useBatchAcceptCards, useBatchDeleteCards } from "@/hooks/useCards.js";
import { acceptCard, deleteCard } from "@/lib/api.js";
import { useHotkey } from "@/lib/useHotkey.js";

const STACK_SIZE = 3;

const stackStyles = [
  { y: 0, scale: 1, opacity: 1 },
  { y: -8, scale: 0.97, opacity: 0.7 },
  { y: -16, scale: 0.94, opacity: 0.45 },
] as const;

const springTransition = {
  type: "spring" as const,
  stiffness: 500,
  damping: 35,
  mass: 0.8,
};

export default function TriageView() {
  const { data: cards = [], isLoading: loading, error: queryError, refetch } = useTriageCards();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);

  // Local removals to allow optimistic card-by-card dismissal
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const visibleCards = cards.filter((c) => !removedIds.has(c.id));

  // Reset removedIds when server data refreshes (stale IDs no longer needed)
  const prevCardsRef = useRef(cards);
  useEffect(() => {
    if (cards !== prevCardsRef.current) {
      prevCardsRef.current = cards;
      setRemovedIds(new Set());
    }
  }, [cards]);

  const error = actionError ?? (queryError ? queryError.message : null);

  const removeCard = useCallback((id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id));
    setCurrentIndex((idx) => Math.min(idx, Math.max(0, visibleCards.length - 2)));
    setShowBack(false);
  }, [visibleCards.length]);

  const restoreCard = useCallback((id: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const invalidate = useInvalidateCards();
  const batchAccept = useBatchAcceptCards();
  const batchDelete = useBatchDeleteCards();

  const handleAccept = useCallback(async () => {
    const card = visibleCards[currentIndex];
    if (!card || actionLoading) return;
    try {
      setActionLoading(true);
      setActionError(null);
      removeCard(card.id);
      await acceptCard(card.id);
      invalidate();
    } catch (err) {
      restoreCard(card.id);
      setActionError(err instanceof Error ? err.message : "Failed to accept card");
    } finally {
      setActionLoading(false);
    }
  }, [visibleCards, currentIndex, actionLoading, invalidate, removeCard, restoreCard]);

  const handleDiscard = useCallback(async () => {
    const card = visibleCards[currentIndex];
    if (!card || actionLoading) return;
    try {
      setActionLoading(true);
      setActionError(null);
      removeCard(card.id);
      await deleteCard(card.id);
      invalidate();
    } catch (err) {
      restoreCard(card.id);
      setActionError(err instanceof Error ? err.message : "Failed to discard card");
    } finally {
      setActionLoading(false);
    }
  }, [visibleCards, currentIndex, actionLoading, invalidate, removeCard, restoreCard]);

  const handleAcceptAll = useCallback(async () => {
    if (actionLoading || visibleCards.length === 0) return;
    const ids = visibleCards.map((c) => c.id);
    try {
      setActionLoading(true);
      setActionError(null);
      setRemovedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      await batchAccept.mutateAsync(ids);
      setCurrentIndex(0);
    } catch (err) {
      setRemovedIds(new Set());
      setActionError(err instanceof Error ? err.message : "Failed to accept all");
    } finally {
      setActionLoading(false);
    }
  }, [visibleCards, actionLoading, batchAccept]);

  const handleDiscardAll = useCallback(async () => {
    if (actionLoading || visibleCards.length === 0) return;
    const ids = visibleCards.map((c) => c.id);
    try {
      setActionLoading(true);
      setActionError(null);
      setRemovedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      await batchDelete.mutateAsync(ids);
      setCurrentIndex(0);
    } catch (err) {
      setRemovedIds(new Set());
      setActionError(err instanceof Error ? err.message : "Failed to discard all");
    } finally {
      setActionLoading(false);
    }
  }, [visibleCards, actionLoading, batchDelete]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % visibleCards.length);
    setShowBack(false);
  }, [visibleCards.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + visibleCards.length) % visibleCards.length);
    setShowBack(false);
  }, [visibleCards.length]);

  const hasCard = visibleCards.length > 0;
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
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (visibleCards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No new cards to review</p>
      </div>
    );
  }

  // Build the visible stack: current card + up to 2 behind it
  const stackIndices: number[] = [];
  for (let offset = 0; offset < Math.min(STACK_SIZE, visibleCards.length); offset++) {
    stackIndices.push((currentIndex + offset) % visibleCards.length);
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col items-center gap-6">
        {/* Counter + nav + bulk actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={goPrev}>
              <Kbd className="ml-0">&#8593;</Kbd>
            </Button>
            <p className="text-sm text-muted-foreground">
              {currentIndex + 1} of {visibleCards.length}
            </p>
            <Button variant="ghost" size="sm" onClick={goNext}>
              <Kbd className="ml-0">&#8595;</Kbd>
            </Button>
          </div>
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

        {/* Animated card stack */}
        <div className="relative w-full max-w-2xl" style={{ minHeight: 200 }}>
          <AnimatePresence mode="popLayout">
            {stackIndices
              .slice()
              .reverse()
              .map((cardIdx) => {
                const offset = stackIndices.indexOf(cardIdx);
                const card = visibleCards[cardIdx];
                const style = stackStyles[offset];
                const isFront = offset === 0;

                return (
                  <m.div
                    key={card.id}
                    initial={false}
                    animate={{
                      y: style.y,
                      scale: style.scale,
                      opacity: style.opacity,
                    }}
                    exit={{
                      x: 300,
                      opacity: 0,
                      transition: { duration: 0.25 },
                    }}
                    transition={springTransition}
                    style={{
                      position: isFront ? "relative" : "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      zIndex: STACK_SIZE - offset,
                      pointerEvents: isFront ? "auto" : "none",
                    }}
                  >
                    <Card className="w-full">
                      <CardContent className="space-y-4">
                        <div className="whitespace-pre-wrap text-base font-semibold leading-relaxed">
                          {card.front}
                        </div>
                        {isFront && card.back && (
                          showBack ? (
                            <div
                              className="rounded border border-dashed p-3 cursor-pointer"
                              onClick={() => setShowBack(false)}
                            >
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                Back
                              </p>
                              <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                                {card.back}
                              </p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="w-full rounded border border-dashed p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => setShowBack(true)}
                            >
                              Show answer
                            </button>
                          )
                        )}
                        {isFront && card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {card.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      {isFront && (
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
                      )}
                    </Card>
                  </m.div>
                );
              })}
          </AnimatePresence>
        </div>
      </div>
    </LazyMotion>
  );
}
