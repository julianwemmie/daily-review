import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useCardReviewLogs } from "@/hooks/useCards.js";
import { analyzeCard } from "@/lib/api.js";
import type { Card } from "@/lib/types.js";

interface Props {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ratingColors: Record<string, string> = {
  Again: "text-red-500",
  Hard: "text-orange-500",
  Good: "text-amber-600 dark:text-amber-400",
  Easy: "text-blue-500",
};

const stateLabels: Record<string, string> = {
  new: "New",
  learning: "Learning",
  review: "Review",
  relearning: "Relearning",
};

function formatScore(score: number | null): string {
  if (score == null) return "--";
  return `${Math.round(score * 100)}%`;
}

export default function CardStatsModal({ card, open, onOpenChange }: Props) {
  const { data: logs = [], isLoading: logsLoading } = useCardReviewLogs(open ? card?.id ?? null : null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!card) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeCard(card.id);
      setAnalysis(result.analysis);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [card]);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setAnalysis(null);
      setAnalyzeError(null);
    }
    onOpenChange(open);
  }

  if (!card) return null;

  const totalLapses = logs.filter((l) => l.rating === "Again").length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold leading-snug pr-6">
            {card.front}
          </DialogTitle>
        </DialogHeader>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Reviews" value={String(logs.length)} />
          <StatBox label="Lapses" value={String(totalLapses)} />
          <StatBox label="FSRS State" value={stateLabels[card.state] ?? card.state} />
        </div>

        <div className="rounded-md border px-3 py-2">
          <p className="text-[11px] text-muted-foreground mb-0.5">Next Due</p>
          <p className="text-sm font-medium">
            {new Date(card.due).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* AI Analysis */}
        <div className="rounded-md border px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI Analysis
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing || logs.length === 0}
            >
              {analyzing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {analysis ? "Re-analyze" : "Analyze"}
            </Button>
          </div>
          {analyzeError && (
            <p className="text-sm text-destructive">{analyzeError}</p>
          )}
          {analysis && (
            <p className="text-sm text-muted-foreground leading-relaxed">{analysis}</p>
          )}
          {!analysis && !analyzeError && (
            <p className="text-xs text-muted-foreground">
              {logs.length === 0
                ? "No review history to analyze yet."
                : "Click Analyze to get an AI assessment of your answer quality over time."}
            </p>
          )}
        </div>

        {/* Review history timeline */}
        <div>
          <p className="text-sm font-medium mb-2">Review History</p>
          {logsLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No reviews yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.reviewed_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${ratingColors[log.rating] ?? ""}`}>
                        {log.rating}
                      </Badge>
                      {log.llm_score != null && (
                        <span className="text-xs text-muted-foreground">
                          {formatScore(log.llm_score)}
                        </span>
                      )}
                    </div>
                  </div>
                  {log.answer && (
                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 mt-1">
                      {log.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2 text-center">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
