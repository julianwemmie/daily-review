import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  data: { date: string; count: number }[];
}

const CELL = 11;
const GAP = 2;
const COL = CELL + GAP; // 13px per column
const LABEL_W = 28; // day-label column width

const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getIntensity(count: number, max: number): string {
  if (count === 0) return "bg-muted";
  const ratio = count / max;
  if (ratio <= 0.25) return "bg-amber-200/70 dark:bg-amber-900/60";
  if (ratio <= 0.5) return "bg-amber-300/80 dark:bg-amber-700/70";
  if (ratio <= 0.75) return "bg-amber-400/85 dark:bg-amber-600/80";
  return "bg-amber-500 dark:bg-amber-500";
}

export default function ContributionGrid({ data }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const { weeks, monthLabels, maxCount } = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const d of data) countMap.set(d.date, d.count);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Go back ~52 weeks, align start to Sunday
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    const weeks: { date: Date; count: number }[][] = [];
    let currentWeek: { date: Date; count: number }[] = [];
    const d = new Date(start);
    let max = 0;

    while (d <= today) {
      const key = d.toISOString().slice(0, 10);
      const count = countMap.get(key) ?? 0;
      if (count > max) max = count;
      currentWeek.push({ date: new Date(d), count });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Month labels: place at the week where a month first appears
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      for (const day of weeks[w]) {
        const month = day.date.getMonth();
        if (month !== lastMonth) {
          labels.push({ label: MONTHS[month], weekIndex: w });
          lastMonth = month;
          break;
        }
      }
    }

    return { weeks, monthLabels: labels, maxCount: max };
  }, [data]);

  // Scroll to the right (today) on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <div className="inline-flex flex-col gap-0.5 min-w-fit">
        {/* Month labels — absolutely positioned to align with columns */}
        <div className="relative" style={{ height: 16, marginLeft: LABEL_W }}>
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="absolute text-[10px] text-muted-foreground"
              style={{ left: m.weekIndex * COL }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1">
            {DAYS.map((label, i) => (
              <div key={i} className="h-[11px] w-6 flex items-center justify-end pr-1">
                <span className="text-[9px] text-muted-foreground leading-none">{label}</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`h-[11px] w-[11px] rounded-[2px] ${getIntensity(day.count, maxCount)} cursor-default`}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const dateStr = day.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    setTooltip({
                      text: day.count === 0 ? `No reviews on ${dateStr}` : `${day.count} review${day.count !== 1 ? "s" : ""} on ${dateStr}`,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 mt-1 ml-8">
          <span className="text-[10px] text-muted-foreground mr-0.5">Less</span>
          <div className="h-[11px] w-[11px] rounded-[2px] bg-muted" />
          <div className="h-[11px] w-[11px] rounded-[2px] bg-amber-200/70 dark:bg-amber-900/60" />
          <div className="h-[11px] w-[11px] rounded-[2px] bg-amber-300/80 dark:bg-amber-700/70" />
          <div className="h-[11px] w-[11px] rounded-[2px] bg-amber-400/85 dark:bg-amber-600/80" />
          <div className="h-[11px] w-[11px] rounded-[2px] bg-amber-500 dark:bg-amber-500" />
          <span className="text-[10px] text-muted-foreground ml-0.5">More</span>
        </div>
      </div>

      {/* Tooltip via portal to avoid scroll container clipping */}
      {tooltip && createPortal(
        <div
          className="fixed z-50 px-2 py-1 rounded bg-foreground text-background text-xs pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          {tooltip.text}
        </div>,
        document.body,
      )}
    </div>
  );
}
