// PASTE LOCATION: src/lib/analytics/date-range.ts
export type RangeKey = "7d" | "30d" | "quarter" | "year" | "custom";

export function resolveDateRange(
  range: RangeKey,
  customFrom?: string | null,
  customTo?: string | null
): { from: Date; to: Date; label: string } {
  const now = new Date();
  const to = new Date(now);

  if (range === "custom" && customFrom && customTo) {
    return {
      from: new Date(customFrom),
      to: new Date(customTo),
      label: "Custom range",
    };
  }

  const from = new Date(now);
  let label = "Last 7 days";

  switch (range) {
    case "30d":
      from.setDate(from.getDate() - 30);
      label = "Last 30 days";
      break;
    case "quarter":
      from.setMonth(from.getMonth() - 3);
      label = "Last quarter";
      break;
    case "year":
      from.setFullYear(from.getFullYear() - 1);
      label = "Last year";
      break;
    case "7d":
    default:
      from.setDate(from.getDate() - 7);
      label = "Last 7 days";
  }

  from.setHours(0, 0, 0, 0);
  return { from, to, label };
}

export function buildBuckets(from: Date, to: Date): { start: Date; end: Date; label: string }[] {
  const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  const bucketDays = totalDays <= 31 ? 1 : totalDays <= 120 ? 7 : 30;

  const buckets: { start: Date; end: Date; label: string }[] = [];
  let cursor = new Date(from);

  while (cursor < to) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + bucketDays);

    buckets.push({
      start,
      end: end > to ? to : end,
      label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });

    cursor = end;
  }

  return buckets;
}