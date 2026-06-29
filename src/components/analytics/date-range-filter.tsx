// PASTE LOCATION: src/components/analytics/date-range-filter.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

const PRESETS: { key: string; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "30 days" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRange = searchParams.get("range") ?? "7d";
  const [showCustom, setShowCustom] = useState(activeRange === "custom");
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") ?? "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");

  function applyRange(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    if (key !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`/analytics?${params.toString()}`);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.push(`/analytics?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(({ key, label }) => (
        <Button
          key={key}
          variant="outline"
          size="sm"
          className={cn(activeRange === key && "border-primary bg-accent text-accent-foreground")}
          onClick={() => {
            setShowCustom(false);
            applyRange(key);
          }}
        >
          {label}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        className={cn(activeRange === "custom" && "border-primary bg-accent text-accent-foreground")}
        onClick={() => setShowCustom((v) => !v)}
      >
        Custom
      </Button>

      {showCustom && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 w-36 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 w-36 text-xs"
          />
          <Button size="sm" onClick={applyCustom} disabled={!customFrom || !customTo}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}