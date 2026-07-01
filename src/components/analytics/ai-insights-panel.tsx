// PASTE LOCATION: src/components/analytics/ai-insights-panel.tsx (overwrite entire file)
"use client";

import { useState } from "react";

type AIFeature = "insights" | "risk" | "delayedTasks" | "suggestedSprint";

const FEATURES: { key: AIFeature; label: string }[] = [
  { key: "insights", label: "AI Insights" },
  { key: "risk", label: "Project Risk" },
  { key: "delayedTasks", label: "Delayed Tasks" },
  { key: "suggestedSprint", label: "Suggested Sprint" },
];

type InsightsResult = { insights: string[] };
type RiskResult = { overallRisk: "low" | "medium" | "high"; projects: { name: string; risk: number; factors: string[] }[] };
type DelayedTasksResult = { delayedTasks: { title: string; assigneeName: string; ageDays: number; concern: string; suggestion: string }[] };
type SuggestedSprintResult = { suggestions: { focus: string; reason: string }[] };

const RISK_COLOR: Record<string, string> = {
  low: "text-emerald-600 bg-emerald-50",
  medium: "text-amber-600 bg-amber-50",
  high: "text-red-600 bg-red-50",
};

export function AIInsightsPanel({ range }: { range: string }) {
  const [active, setActive] = useState<AIFeature | null>(null);
  const [results, setResults] = useState<Partial<Record<AIFeature, unknown>>>({});
  const [loading, setLoading] = useState<AIFeature | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runFeature(feature: AIFeature) {
    setActive(feature);
    setError(null);
    if (results[feature]) return;

    setLoading(feature);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, range }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "AI analysis failed");
      setResults((prev) => ({ ...prev, [feature]: json.data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  function renderResult() {
    if (!active || results[active] == null) return null;
    const data = results[active];

    if (active === "insights") {
      const { insights } = data as InsightsResult;
      return (
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-primary mt-0.5">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (active === "risk") {
      const { overallRisk, projects } = data as RiskResult;
      return (
        <div className="space-y-3">
          <div className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${RISK_COLOR[overallRisk]}`}>
            Overall risk: {overallRisk}
          </div>
          {projects.map((p, i) => (
            <div key={i} className="border rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.risk}/100</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-0.5">
                {p.factors.map((f, j) => (
                  <li key={j}>– {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    if (active === "delayedTasks") {
      const { delayedTasks } = data as DelayedTasksResult;
      if (delayedTasks.length === 0) return <p className="text-sm text-muted-foreground">No delayed tasks found.</p>;
      return (
        <div className="space-y-3">
          {delayedTasks.map((t, i) => (
            <div key={i} className="border rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.ageDays}d old · {t.assigneeName}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.concern}</p>
              <p className="text-sm mt-1"><span className="font-medium">Suggestion:</span> {t.suggestion}</p>
            </div>
          ))}
        </div>
      );
    }

    if (active === "suggestedSprint") {
      const { suggestions } = data as SuggestedSprintResult;
      return (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={i} className="border rounded-md p-3">
              <p className="font-medium text-sm">{s.focus}</p>
              <p className="text-sm text-muted-foreground">{s.reason}</p>
            </div>
          ))}
        </div>
      );
    }

    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-lg font-semibold mb-3">AI Analysis</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {FEATURES.map((f) => (
          <button
            key={f.key}
            onClick={() => runFeature(f.key)}
            disabled={loading === f.key}
            className={`text-sm px-3 py-1.5 rounded-md border transition ${
              active === f.key ? "bg-primary text-primary-foreground" : "bg-background"
            }`}
          >
            {loading === f.key ? "Analyzing..." : f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive mb-2">{error}</p>}

      {active && results[active] == null && loading !== active && !error && (
        <p className="text-sm text-muted-foreground">Click a button above to run that analysis.</p>
      )}

      {renderResult()}
    </div>
  );
}