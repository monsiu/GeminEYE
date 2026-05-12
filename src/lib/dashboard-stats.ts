export type SavedReport = {
  id: string;
  title: string;
  score?: number | null;
  label: string;
  createdAt: string;
  findings?: Array<{
    id: string;
    risk: "Low" | "Medium" | "High";
    category: string;
    evidence: string;
    recommendation: string;
  }>;
  html: string;
};

export interface DashboardStat {
  label: string;
  value: string;
  helper: string;
}

export function calculateDashboardStats(reports: SavedReport[]): DashboardStat[] {
  const total = reports.length;
  const highRisk = reports.filter((report) => (report.label || "").toLowerCase().includes("high")).length;
  const averageScore =
    reports.length === 0
      ? null
      : reports.reduce((sum, report) => sum + Number(report.score ?? 0), 0) / reports.length;

  return [
    { label: "Saved reports", value: total.toString(), helper: total === 1 ? "One report stored" : "Reports stored locally" },
    { label: "High risk", value: highRisk.toString(), helper: highRisk === 1 ? "Report flagged as high risk" : "Reports flagged as high risk" },
    { label: "Average score", value: averageScore === null ? "-" : `${averageScore.toFixed(1)} / 10`, helper: averageScore === null ? "No score yet" : "Across saved reports" },
  ];
}
