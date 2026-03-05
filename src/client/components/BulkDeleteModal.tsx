import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Card } from "@/lib/types.js";

interface BulkDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: Card[];
  onDelete: (ids: string[]) => void;
  isDeleting: boolean;
}

export default function BulkDeleteModal({
  open,
  onOpenChange,
  cards,
  onDelete,
  isDeleting,
}: BulkDeleteModalProps) {
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());

  const checkedCount = cards.length - unchecked.size;
  const allChecked = unchecked.size === 0 && cards.length > 0;

  const toggleCard = useCallback((id: string) => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setUnchecked(new Set(cards.map((c) => c.id)));
    } else {
      setUnchecked(new Set());
    }
  }, [allChecked, cards]);

  const handleDelete = useCallback(() => {
    const ids = cards.filter((c) => !unchecked.has(c.id)).map((c) => c.id);
    if (ids.length > 0) onDelete(ids);
  }, [cards, unchecked, onDelete]);

  // Reset unchecked state when modal opens
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) setUnchecked(new Set());
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Delete {cards.length} card{cards.length !== 1 ? "s" : ""}?
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {/* Select all */}
          <label className="flex items-center gap-2 py-1 cursor-pointer">
            <Checkbox
              checked={allChecked}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium">Select all</span>
          </label>

          <div className="border-t" />

          {/* Card list */}
          <div className="max-h-[50vh] overflow-y-auto flex flex-col gap-1">
            {cards.map((card) => (
              <label
                key={card.id}
                className="flex items-start gap-2 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={!unchecked.has(card.id)}
                  onCheckedChange={() => toggleCard(card.id)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm break-words">{card.front}</p>
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {card.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={checkedCount === 0 || isDeleting}
          >
            {isDeleting
              ? "Deleting..."
              : `Delete (${checkedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
