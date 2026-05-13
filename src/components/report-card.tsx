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
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h3 className="font-serif text-2xl font-bold text-ink">{report.title}</h3>
          <p className="text-xs text-muted">{formatDateTimeLocal(report.createdAt)}</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            onClick={() => onDownload(report.id)}
            className="button-pop inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-accent bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:border-accent-strong hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 dark:border-accent dark:bg-accent dark:hover:border-accent-strong dark:hover:bg-accent-strong sm:flex-none"
            title="Download report"
            aria-label={`Download ${report.title}`}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M10 2a1 1 0 0 1 1 1v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414L9 10.586V3a1 1 0 0 1 1-1Z" />
              <path d="M4 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
            </svg>
            <span>Download</span>
          </button>
          <button
            onClick={() => onRemove(report.id)}
            className="button-pop inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-signal bg-white px-4 py-2 text-xs font-semibold text-signal transition hover:-translate-y-0.5 hover:border-red-600 hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 dark:border-red-600 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 sm:flex-none"
            title="Delete report"
            aria-label={`Delete ${report.title}`}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M8.5 2a1 1 0 0 0-.8.4L7 3H4a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2h-3l-.7-.6a1 1 0 0 0-.8-.4h-3Z" />
              <path d="M5 6a1 1 0 0 1 1 1v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7a1 1 0 1 1 2 0v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V7a1 1 0 0 1 1-1Z" />
            </svg>
            <span>Delete</span>
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
          <p className="mt-2 rounded-2xl border border-dashed border-line bg-panel-strong px-3 py-2 text-xs text-muted">
            These are the headline findings only. Download the report to read the full reasoning, clause-by-clause evidence, and recommended edits.
          </p>
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
