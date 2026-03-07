import { useStats } from "@/hooks/useCards.js";
import ContributionGrid from "@/components/ContributionGrid.js";
import { Flame, TrendingUp, BookOpen, BarChart3 } from "lucide-react";

const statColors = [
  "bg-pastel-lavender text-[oklch(0.45_0.10_300)] dark:bg-pastel-lavender dark:text-[oklch(0.80_0.08_300)]",
  "bg-pastel-rose text-[oklch(0.50_0.10_10)] dark:bg-pastel-rose dark:text-[oklch(0.80_0.06_10)]",
  "bg-pastel-mint text-[oklch(0.45_0.10_155)] dark:bg-pastel-mint dark:text-[oklch(0.80_0.08_155)]",
  "bg-pastel-peach text-[oklch(0.50_0.08_65)] dark:bg-pastel-peach dark:text-[oklch(0.80_0.06_65)]",
];

function StatCard({
  label,
  value,
  icon: Icon,
  colorIndex = 0,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  colorIndex?: number;
}) {
  const color = statColors[colorIndex % statColors.length];
  return (
    <div className="rounded-2xl border bg-card px-4 py-4 flex items-start gap-3 shadow-[0_2px_12px_oklch(0.62_0.12_300/0.06)] dark:shadow-[0_2px_12px_oklch(0.78_0.10_300/0.04)]">
      <div className={`rounded-xl p-2 ${color}`}>
        <Icon className="h-4 w-4" />
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
        <StatCard label="Active Cards" value={String(stats.totalActiveCards)} icon={BookOpen} colorIndex={0} />
        <StatCard label="Current Streak" value={`${stats.currentStreak}d`} icon={Flame} colorIndex={1} />
        <StatCard label="Longest Streak" value={`${stats.longestStreak}d`} icon={TrendingUp} colorIndex={2} />
        <StatCard label="Total Reviews" value={String(stats.totalReviews)} icon={BarChart3} colorIndex={3} />
      </div>

      {/* Contribution grid */}
      <div className="rounded-2xl border bg-card p-4 shadow-[0_2px_12px_oklch(0.62_0.12_300/0.06)] dark:shadow-[0_2px_12px_oklch(0.78_0.10_300/0.04)]">
        <p className="text-sm font-semibold mb-3">Review Activity</p>
        <ContributionGrid data={stats.contributionGrid} />
      </div>
    </div>
  );
}
