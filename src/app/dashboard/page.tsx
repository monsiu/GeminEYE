"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SNACKBAR_CSS = `
  @keyframes gemineye-slide-up { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .gemineye-snackbar { animation: gemineye-slide-up 280ms cubic-bezier(.22,.9,.27,1); }
`;

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

function formatDateTimeLocal(iso?: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function DashboardPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [filterRisk, setFilterRisk] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [deletedReport, setDeletedReport] = useState<SavedReport | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<number | null>(null);
  const [deletedReportsBulk, setDeletedReportsBulk] = useState<SavedReport[] | null>(null);
  const [showBulkUndo, setShowBulkUndo] = useState(false);
  const bulkUndoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gemineye_reports") || "[]";
      const arr = JSON.parse(raw) as SavedReport[];
      setReports(arr);
    } catch (e) {
      setReports([]);
    }
  }, []);

  function persistReports(arr: SavedReport[]) {
    try {
      localStorage.setItem("gemineye_reports", JSON.stringify(arr));
    } catch (e) {
      // ignore
    }
  }

  function removeReportById(id: string) {
    const found = reports.find((r) => r.id === id) || null;
    if (!found) return;

    // remove immediately from UI and storage
    const next = reports.filter((r) => r.id !== id);
    setReports(next);
    persistReports(next);

    // set deleted report for undo
    setDeletedReport(found);
    setShowUndo(true);

    // clear any existing timer
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }
    // after 6s, clear the deletedReport (permanent)
    undoTimerRef.current = window.setTimeout(() => {
      setDeletedReport(null);
      setShowUndo(false);
      undoTimerRef.current = null;
    }, 6000);
  }

  function clearAllReports() {
    if (!window.confirm("Clear all saved reports? This will remove all items permanently.")) return;
    // keep copy for undo
    setDeletedReportsBulk(reports.slice());
    setReports([]);
    try {
      localStorage.removeItem("gemineye_reports");
    } catch (e) {
      // ignore
    }

    setShowBulkUndo(true);
    if (bulkUndoTimerRef.current) {
      window.clearTimeout(bulkUndoTimerRef.current);
    }
    bulkUndoTimerRef.current = window.setTimeout(() => {
      setDeletedReportsBulk(null);
      setShowBulkUndo(false);
      bulkUndoTimerRef.current = null;
    }, 6000);
  }

  function undoDelete() {
    if (!deletedReport) return;
    const next = [deletedReport, ...reports];
    setReports(next);
    persistReports(next);
    setDeletedReport(null);
    setShowUndo(false);
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  function undoClearAll() {
    if (!deletedReportsBulk || deletedReportsBulk.length === 0) return;
    const next = [...deletedReportsBulk, ...reports];
    setReports(next);
    persistReports(next);
    setDeletedReportsBulk(null);
    setShowBulkUndo(false);
    if (bulkUndoTimerRef.current) {
      window.clearTimeout(bulkUndoTimerRef.current);
      bulkUndoTimerRef.current = null;
    }
  }

  function badgeClass(label?: string) {
    if (!label) return "rounded-full border px-3 py-1 text-xs font-semibold";
    const key = label.toLowerCase();
    if (key.includes("high")) return "rounded-full px-3 py-1 text-xs font-semibold bg-red-600 text-white";
    if (key.includes("moderate") || key.includes("medium")) return "rounded-full px-3 py-1 text-xs font-semibold bg-amber-600 text-white";
    if (key.includes("lower") || key.includes("low")) return "rounded-full px-3 py-1 text-xs font-semibold bg-emerald-600 text-white";
    return "rounded-full border px-3 py-1 text-xs font-semibold";
  }

  const filteredAndSortedReports = useMemo(() => {
    let list = [...reports];
    if (filterRisk && filterRisk !== "All") {
      list = list.filter((r) => (r.label || "").toLowerCase().includes(filterRisk.toLowerCase()));
    }
    if (sortBy === "newest") {
      list.sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else if (sortBy === "oldest") {
      list.sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } else if (sortBy === "score-high") {
      list.sort((a, b) => (Number(b.score ?? -Infinity) - Number(a.score ?? -Infinity)));
    } else if (sortBy === "score-low") {
      list.sort((a, b) => (Number(a.score ?? Infinity) - Number(b.score ?? Infinity)));
    }
    return list;
  }, [reports, filterRisk, sortBy]);

  function downloadSavedReport(r: SavedReport) {
    const blob = new Blob([r.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const previewWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (previewWindow) previewWindow.opener = null;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.title ? r.title.replace(/[^a-z0-9\- ]/gi, "") : "report"}-gemineye-report.html`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="paper-hero rounded-3xl border border-line p-8 md:p-10 soft-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-semibold">Report dashboard</h1>
              <p className="mt-2 text-sm text-muted">View and download previously generated GeminEYE reports.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={clearAllReports} className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Clear all</button>
              <a href="/" className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Back to Analyzer</a>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-line bg-panel p-6">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-muted">No saved reports yet. Generate a report and download it to add it here.</div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted">Filter:</label>
                  <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="rounded-md border border-line bg-white px-3 py-1 text-sm">
                    <option>All</option>
                    <option>High</option>
                    <option>Moderate</option>
                    <option>Lower</option>
                  </select>
                  <label className="ml-4 text-sm text-muted">Sort:</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-md border border-line bg-white px-3 py-1 text-sm">
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="score-high">Score (high)</option>
                    <option value="score-low">Score (low)</option>
                  </select>
                </div>
              </div>

              {filteredAndSortedReports.map((r) => (
                <div key={r.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-ink">{r.title}</h3>
                        <span className="text-xs text-muted">{formatDateTimeLocal(r.createdAt)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-sm text-muted">
                        <span className={badgeClass(r.label)}>{r.label}</span>
                        <span>Score: {r.score === null || r.score === undefined ? "-" : `${Number(r.score).toFixed(1)} / 10`}</span>
                        <span>{r.findings?.length ?? 0} flagged clauses</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => downloadSavedReport(r)} className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Download</button>
                      <button onClick={() => removeReportById(r.id)} className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Delete</button>
                    </div>
                  </div>

                  <details className="mt-4 rounded-xl border border-line bg-panel px-4 py-3">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden="true" className="text-xs text-muted">▼</span>
                        <span>Flagged clauses {r.findings?.length ? `(${r.findings.length})` : "(none)"}</span>
                        <span className="text-xs font-medium text-muted">Click to expand</span>
                      </span>
                    </summary>
                    <div className="mt-3 grid gap-3">
                      {r.findings && r.findings.length > 0 ? (
                        r.findings.map((finding) => (
                          <article key={finding.id} className="rounded-xl border border-line bg-white p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-line bg-panel px-2 py-1 text-xs font-semibold text-muted">{finding.id}</span>
                              <span className={badgeClass(finding.risk)}>{finding.risk} risk</span>
                              <span className="text-sm font-medium text-ink">{finding.category}</span>
                            </div>
                            <div className="mt-3 grid gap-3 text-sm text-muted">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink">Flagged clause</p>
                                <p className="mt-1 whitespace-pre-wrap">{finding.evidence}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink">Recommendation</p>
                                <p className="mt-1 whitespace-pre-wrap">{finding.recommendation}</p>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="text-sm text-muted">No flagged clauses were captured for this report.</p>
                      )}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </section>

        {showUndo && deletedReport ? (
          <div className="fixed right-6 bottom-6 z-50 flex items-center gap-4 rounded-lg border border-line bg-white px-4 py-3 shadow-lg gemineye-snackbar">
            <style dangerouslySetInnerHTML={{ __html: SNACKBAR_CSS }} />
            <div className="text-sm text-ink">Deleted "{deletedReport.title}"</div>
            <button onClick={undoDelete} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Undo</button>
            <button onClick={() => { setShowUndo(false); setDeletedReport(null); if (undoTimerRef.current) { window.clearTimeout(undoTimerRef.current); undoTimerRef.current = null; } }} className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted">Dismiss</button>
          </div>
        ) : null}

        {showBulkUndo && deletedReportsBulk && deletedReportsBulk.length > 0 ? (
          <div className="fixed right-6 bottom-6 z-50 flex items-center gap-4 rounded-lg border border-line bg-white px-4 py-3 shadow-lg gemineye-snackbar">
            <style dangerouslySetInnerHTML={{ __html: SNACKBAR_CSS }} />
            <div className="text-sm text-ink">Cleared {deletedReportsBulk.length} reports</div>
            <button onClick={undoClearAll} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Undo</button>
            <button onClick={() => { setShowBulkUndo(false); setDeletedReportsBulk(null); if (bulkUndoTimerRef.current) { window.clearTimeout(bulkUndoTimerRef.current); bulkUndoTimerRef.current = null; } }} className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted">Dismiss</button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
