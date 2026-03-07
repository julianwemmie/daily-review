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
    <div className="rounded-lg border border-border/60 bg-card px-4 py-4 flex items-start gap-3">
      <div className="rounded-md bg-terracotta/10 p-2">
        <Icon className="h-4 w-4 text-terracotta" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function HomeView() {
  const { data: stats, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading stats...</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active Cards" value={String(stats.totalActiveCards)} icon={BookOpen} />
        <StatCard label="Current Streak" value={`${stats.currentStreak}d`} icon={Flame} />
        <StatCard label="Longest Streak" value={`${stats.longestStreak}d`} icon={TrendingUp} />
        <StatCard label="Total Reviews" value={String(stats.totalReviews)} icon={BarChart3} />
      </div>

      {/* Contribution grid */}
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <p className="text-sm font-medium mb-3">Review Activity</p>
        <ContributionGrid data={stats.contributionGrid} />
      </div>
    </div>
  );
}
