import { memo } from "react";

type SavedReport = {
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

interface ReportCardProps {
  report: SavedReport;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
  badgeClass: (label: string) => string;
}

function formatDateTimeLocal(iso?: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const ReportCard = memo(function ReportCard({ report, onDownload, onRemove, badgeClass }: ReportCardProps) {
  return (
    <div className="rounded-3xl border border-line bg-panel p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-serif text-2xl font-bold text-ink">{report.title}</h3>
          <p className="text-xs text-muted">{formatDateTimeLocal(report.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onDownload(report.id)}
            className="text-xs text-accent hover:text-accent-strong transition-colors"
            title="Download report"
          >
            Download
          </button>
          <button
            onClick={() => onRemove(report.id)}
            className="text-xs text-signal hover:text-red-700 transition-colors"
            title="Delete report"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(report.label)}`}>
          {report.label}
        </span>
        {report.score !== null && report.score !== undefined && (
          <span className="inline-flex rounded-full bg-panel-strong px-3 py-1 text-xs font-semibold text-ink">
            {report.score.toFixed(1)} / 10
          </span>
        )}
        {report.findings && report.findings.length > 0 && (
          <span className="inline-flex rounded-full bg-panel-strong px-3 py-1 text-xs font-semibold text-ink">
            {report.findings.length} findings
          </span>
        )}
      </div>

      {report.findings && report.findings.length > 0 && (
        <details className="mt-4 cursor-pointer">
          <summary className="text-sm font-semibold text-ink">View findings</summary>
          <ul className="mt-3 space-y-2">
            {report.findings.map((finding) => (
              <li key={finding.id} className="text-xs text-muted pl-4 border-l border-line">
                <strong>{finding.category}:</strong> {finding.evidence}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
});

export default ReportCard;
