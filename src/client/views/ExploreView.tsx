import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LazyMotion, domAnimation, m } from "motion/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutList, LayoutGrid, MoreVertical, Download, Trash2, X, Settings, Upload, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { useListCards, useDeleteCard, useUpdateCard, useBatchDeleteCards } from "@/hooks/useCards.js";
import { exportCards } from "@/lib/api.js";
import ImportModal from "@/components/ImportModal.js";
import BulkDeleteModal from "@/components/BulkDeleteModal.js";
import CardStatsModal from "@/components/CardStatsModal.js";
import { CardStatus, type Card as CardType } from "@/lib/types.js";

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

function formatRelativeDue(dueStr: string): { text: string; overdue: boolean } {
  const now = new Date();
  const due = new Date(dueStr);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return { text: `Overdue by ${Math.abs(diffDays)}d`, overdue: true };
  if (diffDays === -1) return { text: "Overdue by 1d", overdue: true };
  if (diffDays === 0) return { text: "Due today", overdue: false };
  if (diffDays === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `Due in ${diffDays}d`, overdue: false };
}

type SortColumn = "front" | "status" | "due" | "created" | "reps" | "tags";
type SortDirection = "asc" | "desc";

type StatusFilter = "all" | CardType["status"];

export default function ExploreView() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [tagPills, setTagPills] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(-1);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportIncludeScheduling, setExportIncludeScheduling] = useState(true);
  const [exportIncludeReviewHistory, setExportIncludeReviewHistory] = useState(true);
  const [exporting, setExporting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Sort state for table view
  const [sortColumn, setSortColumn] = useState<SortColumn>("due");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const toggleSort = useCallback((col: SortColumn) => {
    if (col === sortColumn) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  }, [sortColumn]);

  // Fetch all cards once, filter client-side
  const { data: allCards = [], isLoading: loading, error: queryError, refetch } = useListCards();
  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? (queryError ? queryError.message : null);

  // Collect all unique tags across all cards
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const card of allCards) {
      card.tags?.forEach((t) => tagSet.add(t));
    }
    return Array.from(tagSet).sort();
  }, [allCards]);

  // Tag suggestions based on current search input
  const tagSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allTags.filter(
      (tag) => tag.toLowerCase().includes(q) && !tagPills.includes(tag),
    );
  }, [searchQuery, allTags, tagPills]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedTagIndex(-1);
  }, [tagSuggestions.length]);

  // Client-side filtering: status + tag pills + search
  const cards = allCards.filter((card) => {
    if (statusFilter !== "all" && card.status !== statusFilter) return false;
    // All tag pills must match
    for (const pill of tagPills) {
      if (!card.tags?.includes(pill)) return false;
    }
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      const inFront = card.front.toLowerCase().includes(q);
      const inBack = card.back?.toLowerCase().includes(q);
      const inTags = card.tags?.some((t) => t.toLowerCase().includes(q));
      if (!inFront && !inBack && !inTags) return false;
    }
    return true;
  });

  // Sorted cards for table view
  const sortedCards = useMemo(() => {
    const sorted = [...cards];
    const dir = sortDirection === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortColumn) {
        case "front":
          return dir * a.front.localeCompare(b.front);
        case "status":
          return dir * a.status.localeCompare(b.status);
        case "due":
          return dir * (new Date(a.due).getTime() - new Date(b.due).getTime());
        case "created":
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case "reps":
          return dir * (a.reps - b.reps);
        case "tags": {
          const aTag = [...(a.tags ?? [])].sort().join(",");
          const bTag = [...(b.tags ?? [])].sort().join(",");
          return dir * aTag.localeCompare(bTag);
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [cards, sortColumn, sortDirection]);

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

  // Import modal state — auto-open when navigated with ?action=import
  const [searchParams, setSearchParams] = useSearchParams();
  const actionParam = searchParams.get("action");
  const [importOpen, setImportOpen] = useState(actionParam === "import");

  useEffect(() => {
    if (actionParam === "import") {
      setImportOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("action");
        return next;
      }, { replace: true });
    }
  }, [actionParam, setSearchParams]);

  // Card stats modal state
  const [statsCard, setStatsCard] = useState<CardType | null>(null);

  // Delete confirmation state
  const [deletingCard, setDeletingCard] = useState<CardType | null>(null);

  // Edit dialog state
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  const deleteMutation = useDeleteCard();
  const updateMutation = useUpdateCard();
  const batchDeleteMutation = useBatchDeleteCards();

  const addTagPill = useCallback((tag: string) => {
    setTagPills((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setSearchQuery("");
    setShowTagSuggestions(false);
    searchInputRef.current?.focus();
  }, []);

  const removeTagPill = useCallback((tag: string) => {
    setTagPills((prev) => prev.filter((t) => t !== tag));
  }, []);

  const visibleSuggestions = tagSuggestions.slice(0, 8);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown" && visibleSuggestions.length > 0) {
        e.preventDefault();
        setHighlightedTagIndex((prev) =>
          prev < visibleSuggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp" && visibleSuggestions.length > 0) {
        e.preventDefault();
        setHighlightedTagIndex((prev) =>
          prev > 0 ? prev - 1 : visibleSuggestions.length - 1,
        );
      } else if (e.key === "Enter" && highlightedTagIndex >= 0 && visibleSuggestions[highlightedTagIndex]) {
        e.preventDefault();
        addTagPill(visibleSuggestions[highlightedTagIndex]);
      } else if (e.key === "Tab" && visibleSuggestions.length > 0 && searchQuery.trim()) {
        e.preventDefault();
        const index = highlightedTagIndex >= 0 ? highlightedTagIndex : 0;
        addTagPill(visibleSuggestions[index]);
      } else if (e.key === "Backspace" && searchQuery === "" && tagPills.length > 0) {
        removeTagPill(tagPills[tagPills.length - 1]);
      } else if (e.key === "Escape") {
        setShowTagSuggestions(false);
        setHighlightedTagIndex(-1);
      }
    },
    [visibleSuggestions, highlightedTagIndex, searchQuery, tagPills, addTagPill, removeTagPill],
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      try {
        setActionError(null);
        await batchDeleteMutation.mutateAsync(ids);
        setBulkDeleteOpen(false);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete cards");
      }
    },
    [batchDeleteMutation],
  );

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      setActionError(null);
      await exportCards({ includeScheduling: exportIncludeScheduling, includeReviewHistory: exportIncludeReviewHistory });
      setExportOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to export cards");
    } finally {
      setExporting(false);
    }
  }, [exportIncludeScheduling, exportIncludeReviewHistory]);

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
    setEditTags(card.tags ?? []);
    setNewTagInput("");
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
          tags: editTags.length > 0 ? editTags : null,
        },
      });
      setEditingCard(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save card");
    }
  }, [editingCard, editFront, editBack, editTags, editSaving, updateMutation]);

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

      {/* Search + Delete + Import */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-4 h-9 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
            onClick={() => searchInputRef.current?.focus()}
          >
            {tagPills.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-full bg-pastel-lavender/50 px-2.5 py-0.5 text-xs font-semibold text-[oklch(0.45_0.10_300)] dark:bg-pastel-lavender/30 dark:text-[oklch(0.80_0.08_300)]"
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTagPill(tag);
                  }}
                  className="ml-0.5 hover:text-destructive cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={searchInputRef}
              placeholder={tagPills.length === 0 ? "Search cards..." : ""}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowTagSuggestions(true);
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowTagSuggestions(false), 150);
              }}
              onKeyDown={handleSearchKeyDown}
              className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* Tag suggestions dropdown */}
          {showTagSuggestions && visibleSuggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border bg-popover shadow-[0_4px_16px_oklch(0.62_0.12_300/0.10)] dark:shadow-[0_4px_16px_oklch(0.78_0.10_300/0.06)] py-1 overflow-hidden">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground">Tags</p>
              {visibleSuggestions.map((tag, i) => (
                <button
                  key={tag}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 text-sm cursor-pointer ${i === highlightedTagIndex ? "bg-muted" : "hover:bg-muted"}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightedTagIndex(i)}
                  onClick={() => addTagPill(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Settings className="h-4 w-4 -mr-1" />
              Manage
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setBulkDeleteOpen(true)} disabled={cards.length === 0}>
              <Trash2 className="h-4 w-4" />
              Bulk Delete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImportOpen(true)}>
              <Download className="h-4 w-4" />
              Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportOpen(true)}>
              <Upload className="h-4 w-4" />
              Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                          className="absolute inset-0 flex flex-col gap-0 hover:shadow-[0_4px_20px_oklch(0.62_0.12_300/0.15)] dark:hover:shadow-[0_4px_20px_oklch(0.78_0.10_300/0.10)] transition-shadow"
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
                                  {card.status !== CardStatus.Triaging && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        updateMutation.mutate({
                                          id: card.id,
                                          data: {
                                            status: card.status === CardStatus.Suspended
                                              ? CardStatus.Active
                                              : CardStatus.Suspended,
                                          },
                                        });
                                      }}
                                    >
                                      {card.status === CardStatus.Suspended ? "Unsuspend" : "Suspend"}
                                    </DropdownMenuItem>
                                  )}
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
                          className="absolute inset-0 flex flex-col gap-0 hover:shadow-[0_4px_20px_oklch(0.62_0.12_300/0.15)] dark:hover:shadow-[0_4px_20px_oklch(0.78_0.10_300/0.10)] transition-shadow"
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
                                  {card.status !== CardStatus.Triaging && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        updateMutation.mutate({
                                          id: card.id,
                                          data: {
                                            status: card.status === CardStatus.Suspended
                                              ? CardStatus.Active
                                              : CardStatus.Suspended,
                                          },
                                        });
                                      }}
                                    >
                                      {card.status === CardStatus.Suspended ? "Unsuspend" : "Suspend"}
                                    </DropdownMenuItem>
                                  )}
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
            <>
            {/* ── Table View (desktop) ── */}
            <div className="hidden sm:block rounded-2xl border overflow-hidden shadow-[0_2px_12px_oklch(0.62_0.12_300/0.06)] dark:shadow-[0_2px_12px_oklch(0.78_0.10_300/0.04)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {([
                      ["front", "Front"],
                      ["status", "Status"],
                      ["due", "Due"],
                      ["created", "Created"],
                      ["reps", "Reps"],
                      ["tags", "Tags"],
                    ] as const).map(([col, label]) => (
                      <th
                        key={col}
                        className={`text-left font-medium text-muted-foreground px-4 py-2 cursor-pointer select-none hover:text-foreground transition-colors ${col === "front" ? "w-[50%]" : ""} ${col === "reps" ? "w-[60px]" : ""}`}
                        onClick={() => toggleSort(col)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {sortColumn === col ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="w-[60px] px-4 py-2"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCards.map((card) => {
                    const dueInfo = card.status === "triaging"
                      ? { text: "\u2014", overdue: false }
                      : formatRelativeDue(card.due);
                    const isOverdue = dueInfo.overdue && card.status !== "suspended";
                    return (
                      <tr
                        key={card.id}
                        className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setStatsCard(card)}
                      >
                        <td className="px-4 py-2.5 max-w-0">
                          <p className="truncate font-medium">{card.front}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={statusVariants[card.status]} className="text-[10px]">
                            {statusLabels[card.status]}
                          </Badge>
                        </td>
                        <td className={`px-4 py-2.5 whitespace-nowrap ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {dueInfo.text}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {new Date(card.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                          {card.reps}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {card.tags?.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(card)}>
                                Edit
                              </DropdownMenuItem>
                              {card.status !== CardStatus.Triaging && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    updateMutation.mutate({
                                      id: card.id,
                                      data: {
                                        status: card.status === CardStatus.Suspended
                                          ? CardStatus.Active
                                          : CardStatus.Suspended,
                                      },
                                    });
                                  }}
                                >
                                  {card.status === CardStatus.Suspended ? "Unsuspend" : "Suspend"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletingCard(card)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile card list fallback ── */}
            <div className="flex sm:hidden flex-col gap-4">
              {cards.map((card) => (
                <Card key={card.id} className="w-full gap-1 cursor-pointer" onClick={() => setStatsCard(card)}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <Badge variant={statusVariants[card.status]}>
                        {statusLabels[card.status]}
                      </Badge>
                      {card.tags?.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium line-clamp-2">{card.front}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            </>
          )}
        </>
      )}

      {/* Card stats modal */}
      <CardStatsModal
        card={statsCard}
        open={!!statsCard}
        onOpenChange={(open) => !open && setStatsCard(null)}
      />

      {/* Bulk delete modal */}
      <BulkDeleteModal
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        cards={cards}
        onDelete={handleBulkDelete}
        isDeleting={batchDeleteMutation.isPending}
        statusFilter={statusFilter}
        tagPills={tagPills}
        searchQuery={debouncedQuery}
      />

      {/* Import modal */}
      <ImportModal open={importOpen} onOpenChange={setImportOpen} />

      {/* Export modal */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Cards</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Download all {allCards.length} card{allCards.length !== 1 ? "s" : ""} as a JSON file.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={exportIncludeScheduling}
                  onCheckedChange={(v) => setExportIncludeScheduling(v === true)}
                />
                <span className="text-sm">Include scheduling data</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">
                FSRS parameters like stability, difficulty, reps, and due dates.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={exportIncludeReviewHistory}
                  onCheckedChange={(v) => setExportIncludeReviewHistory(v === true)}
                />
                <span className="text-sm">Include review history</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">
                Past review ratings, answers, and LLM feedback for each card.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={exporting || allCards.length === 0}>
              {exporting ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                {editTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 rounded-full bg-pastel-lavender/50 px-2.5 py-0.5 text-xs font-semibold text-[oklch(0.45_0.10_300)] dark:bg-pastel-lavender/30 dark:text-[oklch(0.80_0.08_300)]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setEditTags((prev) => prev.filter((t) => t !== tag))}
                      className="ml-0.5 hover:text-destructive cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  placeholder={editTags.length === 0 ? "Add a tag..." : ""}
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && newTagInput.trim()) {
                      e.preventDefault();
                      const tag = newTagInput.trim().replace(/,/g, "");
                      if (tag && !editTags.includes(tag)) {
                        setEditTags((prev) => [...prev, tag]);
                      }
                      setNewTagInput("");
                    } else if (e.key === "Backspace" && newTagInput === "" && editTags.length > 0) {
                      setEditTags((prev) => prev.slice(0, -1));
                    }
                  }}
                  className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
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
            <div className="rounded-xl border p-3">
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
