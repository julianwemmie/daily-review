import { useStats } from "@/hooks/useCards.js";
import ContributionGrid from "@/components/ContributionGrid.js";
import { Flame, TrendingUp, BookOpen, BarChart3 } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="border-t border-border px-3 py-4 flex items-start gap-3">
      <div className="rounded-sm bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="font-serif text-2xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

export default function HomeView() {
  const { data: stats, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground italic">Loading stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-destructive">{error.message}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-border">
        <StatCard label="Active Cards" value={String(stats.totalActiveCards)} icon={BookOpen} />
        <StatCard label="Current Streak" value={`${stats.currentStreak}d`} icon={Flame} />
        <StatCard label="Longest Streak" value={`${stats.longestStreak}d`} icon={TrendingUp} />
        <StatCard label="Total Reviews" value={String(stats.totalReviews)} icon={BarChart3} />
      </div>

      {/* Contribution grid */}
      <div className="border border-border bg-card p-4 rounded-sm">
        <p className="font-serif text-sm font-semibold mb-3 uppercase tracking-wider">Review Activity</p>
        <div className="ruled-line mb-3" />
        <ContributionGrid data={stats.contributionGrid} />
      </div>
    </div>
  );
}
