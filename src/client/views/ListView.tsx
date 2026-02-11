import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchCards, deleteCard } from "@/lib/api.js";
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

export default function ListView() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    try {
      setLoading(true);
      setError(null);
      const all = await fetchCards();
      setCards(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete card");
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

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No cards yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {cards.length} card{cards.length !== 1 ? "s" : ""}
      </p>
      {cards.map((card) => (
        <Card key={card.id} className="w-full">
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
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(card.id)}
            >
              Delete
            </Button>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {card.front}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
