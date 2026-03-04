import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListCards, useDeleteCard, useUpdateCard } from "@/hooks/useCards.js";
import type { Card as CardType } from "@/lib/types.js";

const statusLabels: Record<CardType["status"], string> = {
  triaging: "Triaging",
  active: "Active",
  suspended: "Suspended",
};

const statusVariants: Record<CardType["status"], "default" | "secondary" | "outline"> = {
  triaging: "outline",
  active: "default",
  suspended: "secondary",
};

const fsrsStateLabels: Record<CardType["state"], string> = {
  new: "New",
  learning: "Learning",
  review: "Review",
  relearning: "Relearning",
};

type StatusFilter = "all" | CardType["status"];

export default function ListView() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const filters = {
    ...(statusFilter !== "all" ? { status: statusFilter as CardType["status"] } : {}),
    ...(debouncedQuery ? { q: debouncedQuery } : {}),
  };
  const hasFilters = Object.keys(filters).length > 0;
  const { data: cards = [], isLoading: loading, error: queryError, refetch } = useListCards(
    hasFilters ? filters : undefined
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? (queryError ? queryError.message : null);

  // Revealed answers state
  const [revealedBacks, setRevealedBacks] = useState<Set<string>>(new Set());

  // Edit dialog state
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const deleteMutation = useDeleteCard();
  const updateMutation = useUpdateCard();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  async function handleDelete(id: string) {
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete card");
    }
  }

  function openEdit(card: CardType) {
    setEditingCard(card);
    setEditFront(card.front);
    setEditBack(card.back ?? "");
  }

  const editSaving = updateMutation.isPending;

  const handleEditSave = useCallback(async () => {
    if (!editingCard || editSaving) return;
    try {
      setActionError(null);
      await updateMutation.mutateAsync({
        id: editingCard.id,
        data: {
          front: editFront.trim(),
          back: editBack.trim() || null,
        },
      });
      setEditingCard(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save card");
    }
  }, [editingCard, editFront, editBack, editSaving, updateMutation]);

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search + filter controls */}
      <div className="flex flex-col gap-3">
        <Input
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="triaging">Triaging</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading cards...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            {debouncedQuery ? "No cards match your search" : "No cards yet"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </p>
          {cards.map((card) => (
            <Card key={card.id} className="w-full gap-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariants[card.status]}>
                    {statusLabels[card.status]}
                  </Badge>
                  {card.status === "active" && card.state !== "new" && (
                    <Badge variant="outline">
                      {fsrsStateLabels[card.state]}
                    </Badge>
                  )}
                  {card.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => openEdit(card)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(card.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap text-base font-semibold leading-relaxed">
                  {card.front}
                </p>
                {card.back && (
                  revealedBacks.has(card.id) ? (
                    <div
                      className="rounded border border-dashed p-3 cursor-pointer"
                      onClick={() =>
                        setRevealedBacks((prev) => {
                          const next = new Set(prev);
                          next.delete(card.id);
                          return next;
                        })
                      }
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
                      onClick={() =>
                        setRevealedBacks((prev) => new Set(prev).add(card.id))
                      }
                    >
                      Show answer
                    </button>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Front</label>
              <Textarea
                value={editFront}
                onChange={(e) => setEditFront(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Back</label>
              <Textarea
                value={editBack}
                onChange={(e) => setEditBack(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCard(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving || !editFront.trim()}>
              {editSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
