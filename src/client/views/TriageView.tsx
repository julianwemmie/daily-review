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
import { useStorage } from "@/lib/storage/context.js";
import { useHotkey } from "@/lib/useHotkey.js";

const STACK_SIZE = 3;

const stackStyles = [
  { y: 0, scale: 1, opacity: 1 },
  { y: -8, scale: 0.97, opacity: 0.7 },
  { y: -16, scale: 0.94, opacity: 0.45 },
] as const;

const springTransition = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
  mass: 1,
};

export default function TriageView() {
  const storage = useStorage();
  const { data: cards = [], isLoading: loading, error: queryError, refetch } = useTriageCards();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Inline editing state
  const [editingFront, setEditingFront] = useState(false);
  const [editingBack, setEditingBack] = useState(false);
  const [editedFront, setEditedFront] = useState<string | null>(null);
  const [editedBack, setEditedBack] = useState<string | null>(null);

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

  const resetEditState = useCallback(() => {
    setEditingFront(false);
    setEditingBack(false);
    setEditedFront(null);
    setEditedBack(null);
  }, []);

  const removeCard = useCallback((id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id));
    setCurrentIndex((idx) => Math.min(idx, Math.max(0, visibleCards.length - 2)));
    resetEditState();
  }, [visibleCards.length, resetEditState]);

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

  const hasEdits = editedFront !== null || editedBack !== null;

  const saveEdits = useCallback(async (cardId: string) => {
    if (!hasEdits) return;
    const patch: { front?: string; back?: string } = {};
    if (editedFront !== null) patch.front = editedFront;
    if (editedBack !== null) patch.back = editedBack;
    await storage.updateCard(cardId, patch);
  }, [hasEdits, editedFront, editedBack, storage]);

  const handleAccept = useCallback(async () => {
    const card = visibleCards[currentIndex];
    if (!card || actionLoading) return;
    try {
      setActionLoading(true);
      setActionError(null);
      if (hasEdits) await saveEdits(card.id);
      removeCard(card.id);
      await storage.acceptCard(card.id);
      invalidate();
    } catch (err) {
      restoreCard(card.id);
      setActionError(err instanceof Error ? err.message : "Failed to accept card");
    } finally {
      setActionLoading(false);
    }
  }, [visibleCards, currentIndex, actionLoading, invalidate, removeCard, restoreCard, hasEdits, saveEdits]);

  const handleDiscard = useCallback(async () => {
    const card = visibleCards[currentIndex];
    if (!card || actionLoading) return;
    try {
      setActionLoading(true);
      setActionError(null);
      removeCard(card.id);
      await storage.deleteCard(card.id);
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
      resetEditState();
    } catch (err) {
      setRemovedIds(new Set());
      setActionError(err instanceof Error ? err.message : "Failed to accept all");
    } finally {
      setActionLoading(false);
    }
  }, [visibleCards, actionLoading, batchAccept, resetEditState]);

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
      resetEditState();
    } catch (err) {
      setRemovedIds(new Set());
      setActionError(err instanceof Error ? err.message : "Failed to discard all");
    } finally {
      setActionLoading(false);
    }
  }, [visibleCards, actionLoading, batchDelete, resetEditState]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((i) => (i + 1) % visibleCards.length);
    resetEditState();
  }, [visibleCards.length, resetEditState]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((i) => (i - 1 + visibleCards.length) % visibleCards.length);
    resetEditState();
  }, [visibleCards.length, resetEditState]);

  const hasCard = visibleCards.length > 0;
  useHotkey({ key: "1", onPress: handleAccept, enabled: hasCard });
  useHotkey({ key: "2", onPress: handleDiscard, enabled: hasCard });
  useHotkey({ key: "ArrowDown", onPress: goNext, enabled: hasCard });
  useHotkey({ key: "ArrowUp", onPress: goPrev, enabled: hasCard });
  useHotkey({
    key: "Escape",
    allowInInput: true,
    onPress: () => (document.activeElement as HTMLElement)?.blur(),
  });

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
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <p className="text-lg font-medium">All caught up!</p>
        <p className="text-sm text-muted-foreground">No new cards to triage</p>
      </div>
    );
  }

  // Build the visible stack: current card + up to 2 behind it
  const stackIndices: number[] = [];
  for (let offset = 0; offset < Math.min(STACK_SIZE, visibleCards.length); offset++) {
    stackIndices.push((currentIndex + offset) % visibleCards.length);
  }

  const currentCard = visibleCards[currentIndex];
  const displayFront = editedFront ?? currentCard?.front ?? "";
  const displayBack = editedBack ?? currentCard?.back ?? "";

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
          <AnimatePresence mode="popLayout" custom={direction}>
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
                    custom={direction}
                    initial={{ y: direction * 20, scale: 0.97, opacity: 0 }}
                    animate={{
                      y: style.y,
                      scale: style.scale,
                      opacity: style.opacity,
                    }}
                    exit={{
                      y: -40,
                      opacity: 0,
                      transition: { duration: 0.35 },
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
                        {isFront && !editingFront && !editingBack && (
                          <p className="text-xs text-muted-foreground/60 text-center">click card text to edit</p>
                        )}
                        {isFront && editingFront ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                              Front
                            </p>
                            <textarea
                              className="w-full resize-none rounded border border-input bg-background p-2 text-base font-semibold leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                              value={displayFront}
                              onChange={(e) => setEditedFront(e.target.value)}

                              onBlur={() => setEditingFront(false)}
                              autoFocus
                              rows={3}
                            />
                          </div>
                        ) : (
                          <div
                            className={isFront ? "cursor-text rounded p-1 -m-1 hover:bg-muted/50 transition-colors" : ""}
                            onClick={isFront ? () => setEditingFront(true) : undefined}
                          >
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                              Front
                            </p>
                            <div className="whitespace-pre-wrap text-base font-semibold leading-relaxed">
                              {isFront ? displayFront : card.front}
                            </div>
                          </div>
                        )}
                        {isFront && card.back && (
                          editingBack ? (
                            <div className="pt-6">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                Back
                              </p>
                              <textarea
                                className="w-full resize-none rounded border border-input bg-background p-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                                value={displayBack}
                                onChange={(e) => setEditedBack(e.target.value)}
  
                                onBlur={() => setEditingBack(false)}
                                autoFocus
                                rows={3}
                              />
                            </div>
                          ) : (
                            <div
                              className="pt-6 cursor-text rounded p-1 -m-1 hover:bg-muted/50 transition-colors"
                              onClick={() => setEditingBack(true)}
                            >
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                Back
                              </p>
                              <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                                {displayBack}
                              </p>
                            </div>
                          )
                        )}
                        {isFront && card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-4">
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
