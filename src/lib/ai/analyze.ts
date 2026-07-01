// PASTE LOCATION: src/lib/ai/analyze.ts (new file)
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { getAnalyticsData } from "@/lib/analytics/get-analytics-data";

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;

export type AIFeature = "insights" | "risk" | "delayedTasks" | "suggestedSprint";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
});

const PROMPTS: Record<AIFeature, (data: AnalyticsData) => string> = {
  insights: (data) => `You are analyzing project management data for a team dashboard.
Return 3-5 concise, actionable insights as JSON: { "insights": string[] }.
Base it on completion rate trends, team productivity, and project comparison data.

Data:
${JSON.stringify({
  kpis: data.kpis,
  teamProductivity: data.charts.teamProductivity,
  projectComparison: data.projectComparison,
})}`,

  risk: (data) => `Each project below has a precomputed risk score (0-100, higher = riskier) based on overdue tasks and completion rate.
Explain the top risk factors per project and give an overall portfolio risk level.
Return JSON: { "overallRisk": "low" | "medium" | "high", "projects": { "name": string, "risk": number, "factors": string[] }[] }.

Project data:
${JSON.stringify(data.projectComparison)}`,

  delayedTasks: (data) => `Given these open tasks with their age in days and assignee, explain why each is concerning and suggest a next step.
Return JSON: { "delayedTasks": { "title": string, "assigneeName": string, "ageDays": number, "concern": string, "suggestion": string }[] }.

Data:
${JSON.stringify(data.teamPerformance.slowestTasks)}`,

  suggestedSprint: (data) => `Based on average completion time, team productivity, and project risk levels, suggest priorities for next sprint.
Return JSON: { "suggestions": { "focus": string, "reason": string }[] }.

Data:
${JSON.stringify({
  avgCompletionDays: data.teamPerformance.avgCompletionDays,
  teamProductivity: data.charts.teamProductivity,
  projectComparison: data.projectComparison,
})}`,
};

export async function runAIAnalysis(feature: AIFeature, data: AnalyticsData) {
  const prompt = PROMPTS[feature](data);
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}