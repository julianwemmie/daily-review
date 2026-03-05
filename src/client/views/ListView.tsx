import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutList, LayoutGrid, MoreVertical, Download } from "lucide-react";
import { useListCards, useDeleteCard, useUpdateCard } from "@/hooks/useCards.js";
import ImportModal from "@/components/ImportModal.js";
import type { Card as CardType } from "@/lib/types.js";

type ViewMode = "list" | "grid";
const VIEW_MODE_KEY = "dailyReview:listViewMode";

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

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      if (stored === "list" || stored === "grid") return stored;
    } catch {}
    return "list";
  });

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {}
  }, [viewMode]);

  // Fetch all cards once, filter client-side
  const { data: allCards = [], isLoading: loading, error: queryError, refetch } = useListCards();
  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? (queryError ? queryError.message : null);

  // Client-side filtering: status first, then search within that subset
  const cards = allCards.filter((card) => {
    if (statusFilter !== "all" && card.status !== statusFilter) return false;
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      const inFront = card.front.toLowerCase().includes(q);
      const inBack = card.back?.toLowerCase().includes(q);
      const inTags = card.tags?.some((t) => t.toLowerCase().includes(q));
      if (!inFront && !inBack && !inTags) return false;
    }
    return true;
  });

  // Revealed answers state
  const [revealedBacks, setRevealedBacks] = useState<Set<string>>(new Set());

  // Flipped grid cards state
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const suppressFlipRef = useRef(false);
  const toggleFlip = useCallback((id: string) => {
    if (suppressFlipRef.current) return;
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Import modal state
  const [importOpen, setImportOpen] = useState(false);

  // Delete confirmation state
  const [deletingCard, setDeletingCard] = useState<CardType | null>(null);

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
      {/* Category filters – pulled up to align with nav tabs */}
      <div className="flex md:-mt-[4.3rem] md:justify-end">
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

      {/* Search + Import */}
      <div className="flex gap-2">
        <Input
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Download className="h-4 w-4 mr-1.5" />
          Import
        </Button>
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {cards.length} card{cards.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                aria-label="List view"
                onClick={() => { setViewMode("list"); setFlippedCards(new Set()); }}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                aria-label="Grid view"
                onClick={() => { setViewMode("grid"); setFlippedCards(new Set()); }}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {viewMode === "grid" ? (
            /* ── Grid View ── */
            <LazyMotion features={domAnimation}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {cards.map((card) => {
                  const isFlipped = flippedCards.has(card.id);
                  return (
                    <div
                      key={card.id}
                      className="relative min-h-[200px] cursor-pointer"
                      style={{ perspective: "800px" }}
                      onClick={() => toggleFlip(card.id)}
                    >
                      <m.div
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                        style={{ transformStyle: "preserve-3d" }}
                        className="relative w-full min-h-[200px]"
                      >
                        {/* Front face */}
                        <Card
                          className="absolute inset-0 flex flex-col gap-0 hover:ring-2 hover:ring-ring/30 transition-shadow"
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant={statusVariants[card.status]} className="text-[10px]">
                                  {statusLabels[card.status]}
                                </Badge>
                                {card.status === "active" && card.state !== "new" && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {fsrsStateLabels[card.state]}
                                  </Badge>
                                )}
                                {card.tags?.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-[10px]">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <DropdownMenu onOpenChange={(open) => { suppressFlipRef.current = open; }}>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(card)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeletingCard(card)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 overflow-hidden">
                            <p className="whitespace-pre-wrap text-sm font-semibold leading-snug line-clamp-4">
                              {card.front?.trim() || <span className="text-muted-foreground font-normal italic">No content</span>}
                            </p>
                          </CardContent>
                        </Card>

                        {/* Back face */}
                        <Card
                          className="absolute inset-0 flex flex-col gap-0 hover:ring-2 hover:ring-ring/30 transition-shadow"
                          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Back
                              </p>
                              <DropdownMenu onOpenChange={(open) => { suppressFlipRef.current = open; }}>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(card)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeletingCard(card)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 overflow-hidden">
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed line-clamp-4">
                              {card.back || "No back content"}
                            </p>
                          </CardContent>
                        </Card>
                      </m.div>
                    </div>
                  );
                })}
              </div>
            </LazyMotion>
          ) : (
            /* ── List View ── */
            <div className="flex flex-col gap-4">
              {cards.map((card) => (
                <Card key={card.id} className="w-full gap-1">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
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
                    <div className="flex shrink-0 gap-1">
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
                        onClick={() => setDeletingCard(card)}
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
            </div>
          )}
        </>
      )}

      {/* Import modal */}
      <ImportModal open={importOpen} onOpenChange={setImportOpen} />

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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingCard} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Card</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this card? This action cannot be undone.
          </p>
          {deletingCard && (
            <div className="rounded border p-3">
              <p className="text-sm font-medium line-clamp-3">{deletingCard.front}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCard(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deletingCard) return;
                await handleDelete(deletingCard.id);
                setDeletingCard(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
