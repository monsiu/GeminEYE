"use client";

import { useEffect, useRef, useState } from "react";
import ErrorAlert from "../../components/error-alert";
import ReportCard from "../../components/report-card";
import { SkeletonGrid } from "../../components/skeleton-loader";
import { debounce } from "../../lib/debounce";
import { calculateDashboardStats } from "../../lib/dashboard-stats";
import { saveScrollPosition, restoreScrollPosition } from "../../lib/scroll-position";

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


const ITEMS_PER_PAGE = 6;

export default function DashboardPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletedReport, setDeletedReport] = useState<SavedReport | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<number | null>(null);
  const [deletedReportsBulk, setDeletedReportsBulk] = useState<SavedReport[] | null>(null);
  const [showBulkUndo, setShowBulkUndo] = useState(false);
  const bulkUndoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    restoreScrollPosition();
  }, []);

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

  const [filteredRisk, setFilteredRisk] = useState("All");
  const [sortMethod, setSortMethod] = useState("newest");

  const debouncedFilterRisk = useRef(debounce((value: string) => setFilteredRisk(value), 200)).current;
  const debouncedSortBy = useRef(debounce((value: string) => setSortMethod(value), 200)).current;

  const filteredAndSortedReports = (() => {
    saveScrollPosition();
    let list = [...reports];
    if (filteredRisk && filteredRisk !== "All") {
      list = list.filter((r) => (r.label || "").toLowerCase().includes(filteredRisk.toLowerCase()));
    }
    if (sortMethod === "newest") {
      list.sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else if (sortMethod === "oldest") {
      list.sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } else if (sortMethod === "score-high") {
      list.sort((a, b) => (Number(b.score ?? -Infinity) - Number(a.score ?? -Infinity)));
    } else if (sortMethod === "score-low") {
      list.sort((a, b) => (Number(a.score ?? Infinity) - Number(b.score ?? Infinity)));
    }
    return list;
  })();

  const totalPages = Math.ceil(filteredAndSortedReports.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReports = filteredAndSortedReports.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const dashboardStats = calculateDashboardStats(reports);

  function downloadSavedReport(id: string) {
    const r = reports.find(report => report.id === id);
    if (!r) return;
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
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="paper-hero rounded-3xl border border-line p-5 sm:p-8 md:p-10 soft-shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-serif text-3xl font-semibold">Report dashboard</h1>
              <p className="mt-2 text-sm text-muted">View and download previously generated GeminEYE reports.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={clearAllReports} className="button-pop rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Clear all</button>
              <a href="/" className="button-pop rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Back to Analyzer</a>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-line bg-panel p-4 sm:p-6">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-ink font-semibold mb-2">No saved reports yet</h3>
              <p className="text-muted text-sm mb-4">Generate a report from the analyzer to view it here.</p>
              <a href="/" className="button-pop rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Go to Analyzer</a>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-muted">Filter:</label>
                  <select defaultValue={filteredRisk} onChange={(e) => debouncedFilterRisk(e.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-1 text-sm sm:w-auto">
                    <option>All</option>
                    <option>High</option>
                    <option>Moderate</option>
                    <option>Lower</option>
                  </select>
                  <label className="text-sm text-muted">Sort:</label>
                  <select defaultValue={sortMethod} onChange={(e) => debouncedSortBy(e.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-1 text-sm sm:w-auto">
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="score-high">Score (high)</option>
                    <option value="score-low">Score (low)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6 mb-6">
                {paginatedReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onDownload={downloadSavedReport}
                    onRemove={removeReportById}
                    badgeClass={badgeClass}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line pt-6">
                  <button
                    onClick={() => { setCurrentPage(1); restoreScrollPosition(); }}
                    disabled={currentPage === 1}
                    className="text-xs px-3 py-1 rounded border border-line disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent hover:text-accent transition"
                  >
                    ← First
                  </button>
                  <button
                    onClick={() => { setCurrentPage(c => Math.max(1, c - 1)); restoreScrollPosition(); }}
                    disabled={currentPage === 1}
                    className="text-xs px-3 py-1 rounded border border-line disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent hover:text-accent transition"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-muted px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => { setCurrentPage(c => Math.min(totalPages, c + 1)); restoreScrollPosition(); }}
                    disabled={currentPage === totalPages}
                    className="text-xs px-3 py-1 rounded border border-line disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent hover:text-accent transition"
                  >
                    Next →
                  </button>
                  <button
                    onClick={() => { setCurrentPage(totalPages); restoreScrollPosition(); }}
                    disabled={currentPage === totalPages}
                    className="text-xs px-3 py-1 rounded border border-line disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent hover:text-accent transition"
                  >
                    Last →
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <div className="mt-8 rounded-2xl border border-line bg-panel px-5 py-4 text-xs text-muted">
          GeminEYE is provided for informational support only and does not replace legal advice. This report should be reviewed by a qualified professional before use in business or legal decisions.
        </div>

        {showUndo && deletedReport ? (
          <div className="fixed inset-x-3 bottom-4 z-60 flex max-w-xl flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-lg gemineye-snackbar sm:inset-x-auto sm:right-6 sm:bottom-6">
            <style dangerouslySetInnerHTML={{ __html: SNACKBAR_CSS }} />
            <div className="min-w-0 flex-1 wrap-break-word text-sm text-ink">Deleted "{deletedReport.title}"</div>
            <button onClick={undoDelete} className="button-pop rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Undo</button>
            <button onClick={() => { setShowUndo(false); setDeletedReport(null); if (undoTimerRef.current) { window.clearTimeout(undoTimerRef.current); undoTimerRef.current = null; } }} className="button-pop rounded-full border border-line bg-white px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-accent">Dismiss</button>
          </div>
        ) : null}

        {showBulkUndo && deletedReportsBulk && deletedReportsBulk.length > 0 ? (
          <div className="fixed inset-x-3 bottom-4 z-60 flex max-w-xl flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-lg gemineye-snackbar sm:inset-x-auto sm:right-6 sm:bottom-6">
            <style dangerouslySetInnerHTML={{ __html: SNACKBAR_CSS }} />
            <div className="min-w-0 flex-1 wrap-break-word text-sm text-ink">Cleared {deletedReportsBulk.length} reports</div>
            <button onClick={undoClearAll} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent">Undo</button>
            <button onClick={() => { setShowBulkUndo(false); setDeletedReportsBulk(null); if (bulkUndoTimerRef.current) { window.clearTimeout(bulkUndoTimerRef.current); bulkUndoTimerRef.current = null; } }} className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted">Dismiss</button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
