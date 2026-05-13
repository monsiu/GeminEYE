"use client";

import type { ChangeEvent } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import ErrorAlert from "../components/error-alert";
import { SkeletonCard } from "../components/skeleton-loader";

type MemoFinding = {
  id: string;
  risk: "Low" | "Medium" | "High";
  category: string;
  evidence: string;
  recommendation: string;
};

type MemoPayload = {
  narrative: string[];
  summary: string[];
  findings: MemoFinding[];
  overallRiskScore?: number;
};

type SavedFinding = MemoFinding;

const REPORT_LOGO = `
<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#0f766e" fill-rule="evenodd"/>
</svg>`;

const SAMPLE_MEMO: MemoPayload = {
  narrative: [
    "[SAMPLE] This is placeholder analysis. Upload a contract and click 'Run analysis' to generate an actual memo. This demo shows the investigator-style format with liability, indemnity, and data privacy risks highlighted.",
  ],
  summary: [
    "[PLACEHOLDER] Liability exposure examples from sample data.",
    "[PLACEHOLDER] Indemnity structure review from sample data.",
    "[PLACEHOLDER] Data privacy timeline from sample data.",
  ],
  findings: [
    {
      id: "S-01",
      risk: "High",
      category: "Liability",
      evidence: "[SAMPLE ONLY] This is demo text. Real analysis will extract from your contract.",
      recommendation: "[SAMPLE ONLY] Upload a contract to see real recommendations.",
    },
    {
      id: "S-02",
      risk: "Medium",
      category: "Indemnity",
      evidence: "[SAMPLE ONLY] Demo finding for illustration purposes.",
      recommendation: "[SAMPLE ONLY] Real findings will be generated from your document.",
    },
  ],
  overallRiskScore: undefined,
};

const REVIEW_AREAS = [
  {
    label: "Liability",
    description:
      "Limits financial and legal exposure if something goes wrong under the agreement.",
  },
  {
    label: "Indemnity",
    description:
      "Defines who must defend and cover losses when third-party claims are made.",
  },
  {
    label: "Privacy",
    description:
      "Explains how personal or sensitive data is collected, used, shared, and protected.",
  },
  {
    label: "Termination",
    description:
      "Sets when and how either party can end the contract and what happens afterward.",
  },
  {
    label: "IP",
    description:
      "Clarifies ownership and usage rights for intellectual property, including deliverables.",
  },
  {
    label: "Venue",
    description:
      "Specifies which location and legal forum governs disputes and enforcement.",
  },
] as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeFilename(value: string) {
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9\- _]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "contract-report";
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function riskLabel(score?: number) {
  if (score === undefined || score === null || Number.isNaN(Number(score))) {
    return "Risk not scored";
  }

  const numericScore = Number(score);
  if (numericScore >= 6.5) {
    return "High risk";
  }
  if (numericScore >= 3.5) {
    return "Moderate risk";
  }
  return "Lower risk";
}

function narrativeSeverityClass(score?: number) {
  if (score === undefined || score === null || Number.isNaN(Number(score))) {
    return "narrative-unscored";
  }

  const numericScore = Number(score);
  if (numericScore >= 6.5) {
    return "narrative-high";
  }
  if (numericScore >= 3.5) {
    return "narrative-moderate";
  }
  return "narrative-lower";
}

function highlightRiskTerms(value: string) {
  return escapeHtml(value)
    .replace(/\bhigh risk\b/gi, '<span class="risk-pill risk-pill-high">$&</span>')
    .replace(/\bmoderate risk\b/gi, '<span class="risk-pill risk-pill-medium">$&</span>')
    .replace(/\bmedium risk\b/gi, '<span class="risk-pill risk-pill-medium">$&</span>')
    .replace(/\blower risk\b/gi, '<span class="risk-pill risk-pill-low">$&</span>')
    .replace(/\blow risk\b/gi, '<span class="risk-pill risk-pill-low">$&</span>');
}

function buildReportHtml(input: {
  contractTitle: string;
  contractText: string;
  memo: MemoPayload;
  fallback: boolean;
}) {
  const generatedAt = formatDateTime(new Date());
  const title = input.contractTitle.trim() || "Contract Review";
  const riskScore =
    input.memo.overallRiskScore === undefined || input.memo.overallRiskScore === null
      ? "-"
      : Number(input.memo.overallRiskScore).toFixed(1);
  const narrativeToneClass = narrativeSeverityClass(input.memo.overallRiskScore);

  const narrative = input.memo.narrative
    .map((item) => `<p>${highlightRiskTerms(item)}</p>`)
    .join("");

  const summary = input.memo.summary
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const findings = input.memo.findings
    .map(
      (item) => `
        <article class="finding">
          <div class="finding-head">
            <span>${escapeHtml(item.id)}</span>
            <span class="badge badge-${item.risk.toLowerCase()}">${escapeHtml(item.risk)}</span>
          </div>
          <h3>${escapeHtml(item.category)}</h3>
          <p class="label">Evidence</p>
          <p>${escapeHtml(item.evidence)}</p>
          <p class="label">Recommendation</p>
          <p>${escapeHtml(item.recommendation)}</p>
        </article>
      `
    )
    .join("");

  const contractText = input.contractText.trim().length > 0
    ? `<pre>${escapeHtml(input.contractText)}</pre>`
    : `<p class="empty">No contract text was included in the analysis input.</p>`;

  return `<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} - GeminEYE Report</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <script>
      (function () {
        try {
          var storedTheme = window.localStorage.getItem('gemineye-theme');
          var theme = storedTheme === 'light' || storedTheme === 'dark'
            ? storedTheme
            : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          document.documentElement.dataset.theme = theme;
          document.documentElement.style.colorScheme = theme;
        } catch (error) {
          document.documentElement.dataset.theme = 'light';
          document.documentElement.style.colorScheme = 'light';
        }
      })();
    </script>
    <style>
      :root {
        --background: #f4efe8;
        --foreground: #1c1a18;
        --ink: #1c1a18;
        --muted: #6a5f55;
        --panel: #fffdf9;
        --panel-strong: #efe7dc;
        --line: #e1d6c8;
        --accent: #0f766e;
        --accent-strong: #0b5d56;
        --signal: #b45309;
      }

      html[data-theme="dark"] {
        --background: #0f1418;
        --foreground: #f4efe8;
        --ink: #f8f3ec;
        --muted: #b6aa9e;
        --panel: #151d22;
        --panel-strong: #1d2830;
        --line: #31404a;
        --accent: #2aa198;
        --accent-strong: #4bc7bd;
        --signal: #f59e0b;
      }

      html[data-theme="dark"] body {
        background:
          radial-gradient(circle at top left, rgba(42, 161, 152, 0.22), transparent 32%),
          radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 30%),
          linear-gradient(180deg, #0f1418 0%, #0b1014 100%);
      }

      html[data-theme="dark"] .hero {
        background:
          radial-gradient(circle at top left, rgba(42, 161, 152, 0.22), transparent 36%),
          radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 32%),
          linear-gradient(135deg, rgba(21, 29, 34, 0.96) 0%, rgba(13, 18, 22, 0.98) 100%);
      }

      html[data-theme="dark"] .meta-card,
      html[data-theme="dark"] .section,
      html[data-theme="dark"] .finding,
      html[data-theme="dark"] .contract-text {
        background: var(--panel);
      }

      html[data-theme="dark"] .finding {
        background: #10161b;
      }

      html[data-theme="dark"] .brand-mark {
        background: rgba(17, 24, 29, 0.92);
      }

      html[data-theme="dark"] .toggle-button {
        background: rgba(21, 29, 34, 0.96);
      }

      html[data-theme="dark"] .badge-high {
        color: #fecaca;
        background: rgba(127, 29, 29, 0.28);
        border-color: rgba(220, 38, 38, 0.35);
      }

      html[data-theme="dark"] .badge-medium {
        color: #fde68a;
        background: rgba(146, 64, 14, 0.28);
        border-color: rgba(245, 158, 11, 0.35);
      }

      html[data-theme="dark"] .badge-low {
        color: #a7f3d0;
        background: rgba(4, 120, 87, 0.28);
        border-color: rgba(16, 185, 129, 0.35);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: var(--background);
        color: var(--foreground);
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
      }

      .page {
        max-width: 980px;
        margin: 0 auto;
        padding: 32px 24px 48px;
        position: relative;
      }

      .theme-toggle {
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 20;
      }

      .toggle-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 10px 14px;
        background: rgba(255, 253, 249, 0.96);
        color: var(--ink);
        box-shadow: 0 14px 28px rgba(40, 31, 22, 0.16);
        cursor: pointer;
        font: inherit;
      }

      .toggle-button:hover {
        border-color: var(--accent);
        color: var(--accent);
      }

      .toggle-button .icon {
        font-size: 14px;
        line-height: 1;
      }

      .toggle-button .label {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .hero {
        background: radial-gradient(circle at top left, rgba(180, 83, 9, 0.12), transparent 45%),
          radial-gradient(circle at top right, rgba(15, 118, 110, 0.16), transparent 50%),
          linear-gradient(135deg, #f8f3ec 0%, #f4efe8 100%);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: 0 30px 70px rgba(40, 31, 22, 0.12);
        padding: 28px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--muted);
        margin-bottom: 18px;
      }

      .brand-mark {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        background: rgba(255, 253, 249, 0.92);
        border: 1px solid var(--line);
        border-radius: 14px;
        box-shadow: 0 12px 24px rgba(40, 31, 22, 0.08);
      }

      .brand-mark svg {
        width: 22px;
        height: 22px;
      }

      h1, h2, h3 {
        font-family: "Cormorant Garamond", Georgia, serif;
        margin: 0;
      }

      h1 {
        font-size: 42px;
        line-height: 1;
        margin-bottom: 10px;
      }

      .subtitle {
        color: var(--muted);
        font-size: 16px;
        line-height: 1.7;
        max-width: 72ch;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 24px;
      }

      .meta-card, .section {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 18px 40px rgba(40, 31, 22, 0.06);
      }

      .meta-card {
        padding: 16px;
      }

      .meta-card .label, .section .label {
        display: block;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
      }

      .meta-card .value {
        font-size: 18px;
        line-height: 1.4;
        color: var(--ink);
      }

      .section {
        margin-top: 18px;
        padding: 22px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 16px;
      }

      .section-header p {
        margin: 8px 0 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 6px 12px;
        border: 1px solid var(--line);
        background: var(--panel-strong);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .badge-high { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
      .badge-medium { color: #92400e; background: #fffbeb; border-color: #fde68a; }
      .badge-low { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }

      .section-body p, .section-body li {
        color: var(--foreground);
        line-height: 1.7;
      }

      .section-body.narrative p {
        color: var(--foreground);
      }

      .risk-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        margin: 0 0.15rem;
        padding: 0.16rem 0.55rem;
        border-radius: 999px;
        font-size: 0.92em;
        font-weight: 700;
        letter-spacing: 0.02em;
        color: #ffffff;
        border: 1px solid transparent;
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.14);
        white-space: nowrap;
      }

      .risk-pill-high {
        background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
        border-color: #991b1b;
      }

      .risk-pill-medium {
        background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
        border-color: #c2410c;
      }

      .risk-pill-low {
        background: linear-gradient(135deg, #34d399 0%, #059669 100%);
        border-color: #047857;
      }

      html[data-theme="dark"] .risk-pill-high {
        background: linear-gradient(135deg, #ff6b6b 0%, #dc2626 100%);
        border-color: #ef4444;
      }

      html[data-theme="dark"] .risk-pill-medium {
        background: linear-gradient(135deg, #fdba74 0%, #f97316 100%);
        border-color: #fb923c;
      }

      html[data-theme="dark"] .risk-pill-low {
        background: linear-gradient(135deg, #6ee7b7 0%, #10b981 100%);
        border-color: #34d399;
      }

      .section-body ul {
        margin: 0;
        padding-left: 20px;
      }

      .findings {
        display: grid;
        gap: 14px;
      }

      .finding {
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 18px;
        background: #fff;
      }

      .finding-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 10px;
      }

      .finding h3 {
        font-size: 28px;
        margin-bottom: 8px;
      }

      .finding .label {
        margin-top: 10px;
        margin-bottom: 6px;
      }

      .finding p {
        margin: 0;
        color: var(--foreground);
        line-height: 1.7;
      }

      .contract-text {
        white-space: pre-wrap;
        word-break: break-word;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 18px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
        max-height: 720px;
        overflow: auto;
      }

      .empty {
        color: var(--muted);
        font-style: italic;
      }

      .footer {
        margin-top: 18px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.7;
      }

      @media print {
        body { background: #fff; }
        .page { max-width: none; padding: 0; }
        .hero, .meta-card, .section, .finding, .contract-text { box-shadow: none; }
      }

      @media (max-width: 900px) {
        .meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        h1 { font-size: 34px; }
      }

      @media (max-width: 640px) {
        .page { padding: 20px 14px 34px; }
        .hero, .section { padding: 18px; border-radius: 22px; }
        .meta-grid { grid-template-columns: 1fr; }
        .section-header { flex-direction: column; }
        .finding h3 { font-size: 24px; }
      }
    </style>
  </head>
  <body>
    <div class="theme-toggle">
      <button class="toggle-button" type="button" id="themeToggle" aria-label="Toggle report theme">
        <span class="icon" id="themeToggleIcon" aria-hidden="true">☾</span>
        <span class="label" id="themeToggleLabel">Dark mode</span>
      </button>
    </div>
    <main class="page">
      <section class="hero">
        <div class="brand">
          <div class="brand-mark">${REPORT_LOGO}</div>
          <div>
            <div style="font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:var(--muted);">GeminEYE report</div>
            <div style="font-size:15px; color:var(--ink); font-weight:600;">AI contract risk review</div>
          </div>
        </div>
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">${escapeHtml(
          input.fallback
            ? "This report captures the Gemini response from the fallback analysis mode. Review it as a working draft and verify the contract text before relying on it."
            : "This report captures the Gemini response for the analyzed contract, formatted in the same editorial style as the app and ready to share or print."
        )}</div>

        <div class="meta-grid">
          <div class="meta-card">
            <span class="label">Generated</span>
            <div class="value">${escapeHtml(generatedAt)}</div>
          </div>
          <div class="meta-card">
            <span class="label">Risk score</span>
            <div class="value">${riskScore} / 10</div>
          </div>
          <div class="meta-card">
            <span class="label">Risk label</span>
            <div class="value">${escapeHtml(riskLabel(input.memo.overallRiskScore))}</div>
          </div>
          <div class="meta-card">
            <span class="label">Contract title</span>
            <div class="value">${escapeHtml(title)}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <div>
            <h2>Narrative</h2>
            <p>Gemini's high-level explanation of the contract review.</p>
          </div>
          <span class="badge">${escapeHtml(riskLabel(input.memo.overallRiskScore))}</span>
        </div>
        <div class="section-body narrative ${narrativeToneClass}">${narrative || '<p class="empty">No narrative was returned.</p>'}</div>
      </section>

      <section class="section">
        <div class="section-header">
          <div>
            <h2>Summary</h2>
            <p>Condensed takeaways pulled from the Gemini reply.</p>
          </div>
        </div>
        <div class="section-body">
          <ul>${summary || '<li class="empty">No summary items were returned.</li>'}</ul>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <div>
            <h2>Findings</h2>
            <p>Detailed risk items, evidence, and recommendations.</p>
          </div>
        </div>
        <div class="findings">${findings || '<p class="empty">No findings were returned.</p>'}</div>
      </section>

      <section class="section">
        <div class="section-header">
          <div>
            <h2>Contract text appendix</h2>
            <p>The full contract text used for analysis. Kept in the report so you can share context without pasting it into the body above.</p>
          </div>
        </div>
        <div class="contract-text">${contractText}</div>
      </section>

      <div class="footer">
        GeminEYE is provided for informational support only and does not replace legal advice. This report should be reviewed by a qualified professional before use in business or legal decisions.
      </div>
    </main>
    <script>
      (function () {
        var button = document.getElementById('themeToggle');
        var label = document.getElementById('themeToggleLabel');
        var icon = document.getElementById('themeToggleIcon');

        function sync(theme) {
          var isDark = theme === 'dark';
          document.documentElement.dataset.theme = theme;
          document.documentElement.style.colorScheme = theme;
          if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
          if (icon) icon.textContent = isDark ? '☀' : '☾';
          if (button) button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
        }

        button && button.addEventListener('click', function () {
          var current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
          var next = current === 'dark' ? 'light' : 'dark';
          try {
            window.localStorage.setItem('gemineye-theme', next);
          } catch (error) {}
          sync(next);
        });

        sync(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
      })();
    </script>
  </body>
</html>`;
}

export default function Home() {
  const [contractTitle, setContractTitle] = useState("");
  const [contractText, setContractText] = useState("");
  const [memo, setMemo] = useState<MemoPayload>(SAMPLE_MEMO);
  const [analyzedContractTitle, setAnalyzedContractTitle] = useState("");
  const [hasAnalysisResult, setHasAnalysisResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "unknown" | "configured" | "missing">("checking");
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [activeReviewArea, setActiveReviewArea] = useState<string | null>(null);
  const reviewAreasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadApiStatus() {
      if (active) {
        setApiStatus("checking");
      }

      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Status check failed.");
        }

        const data = (await response.json()) as { configured?: boolean };
        if (active) {
          setApiStatus(data.configured ? "configured" : "missing");
        }
      } catch {
        if (active) {
          setApiStatus("unknown");
        }
      }
    }

    loadApiStatus();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeReviewArea) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!reviewAreasRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !reviewAreasRef.current.contains(target)) {
        setActiveReviewArea(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeReviewArea]);

  const riskScoreLabel = useMemo(() => {
    if (memo.overallRiskScore === undefined || memo.overallRiskScore === null) {
      return "Risk -";
    }
    const score = Number(memo.overallRiskScore);
    if (isNaN(score)) {
      return "Risk -";
    }
    return `Risk ${score.toFixed(1)} / 10`;
  }, [memo.overallRiskScore]);

  const riskScoreTone = useMemo(() => {
    const score = Number(memo.overallRiskScore);
    if (memo.overallRiskScore === undefined || memo.overallRiskScore === null || isNaN(score)) {
      return "border-line bg-panel-strong text-muted";
    }
    if (score >= 6.5) {
      return "border-red-200 bg-red-50 text-red-700";
    }
    if (score >= 3.5) {
      return "border-amber-200 bg-amber-50 text-amber-800";
    }
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }, [memo.overallRiskScore]);

  const riskTone = (risk: MemoFinding["risk"]) => {
    if (risk === "High") {
      return "border-red-200 bg-red-50 text-red-700";
    }
    if (risk === "Medium") {
      return "border-amber-200 bg-amber-50 text-amber-800";
    }
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  const resetAll = () => {
    setContractTitle("");
    setContractText("");
    setMemo(SAMPLE_MEMO);
    setAnalyzedContractTitle("");
    setHasAnalysisResult(false);
    setError(null);
    setFileStatus(null);
    setIsExtracting(false);
    setIsFallback(false);
    setActiveReviewArea(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetAnalysis = () => {
    setHasAnalysisResult(false);
    setAnalyzedContractTitle("");
    setError(null);
    setIsFallback(false);
    setActiveReviewArea(null);
  };

  const runAnalysis = async () => {
    if (!contractTitle.trim()) {
      setError("Enter a contract title.");
      return;
    }

    if (!contractText.trim()) {
      setError("Paste contract text to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractTitle,
          text: contractText,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed.");
      }

      const data = (await response.json()) as {
        memo?: MemoPayload;
        configured?: boolean;
        fallback?: boolean;
        error?: string;
        contractTitle?: string;
      };
      if (data.memo) {
        setMemo(data.memo);
      }
      if (data.contractTitle) {
        setAnalyzedContractTitle(data.contractTitle);
      }

      const resolvedMemo = data.memo ?? memo;
      const resolvedContractTitle = (data.contractTitle?.trim() || contractTitle.trim() || "Contract Review");
      const resolvedFallback = typeof data.fallback === "boolean" ? data.fallback : isFallback;

      const generatedReportHtml = buildReportHtml({
        contractTitle: resolvedContractTitle,
        contractText,
        memo: resolvedMemo,
        fallback: resolvedFallback,
      });

      // Do not persist fallback/demo reports to the dashboard storage
      if (!resolvedFallback) {
        saveReportToStorage({
          id: `${Date.now()}`,
          title: resolvedContractTitle,
          score:
            resolvedMemo.overallRiskScore === undefined || resolvedMemo.overallRiskScore === null
              ? null
              : Number(resolvedMemo.overallRiskScore),
          label: riskLabel(resolvedMemo.overallRiskScore),
          createdAt: new Date().toISOString(),
          findings: resolvedMemo.findings,
          html: generatedReportHtml,
        });
      }

      setHasAnalysisResult(true);
      if (typeof data.configured === "boolean") {
        setApiStatus(data.configured ? "configured" : "missing");
      }
      if (typeof data.fallback === "boolean") {
        setIsFallback(data.fallback);
      }
      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  function saveReportToStorage(report: {
    id: string;
    title: string;
    score?: number | null;
    label: string;
    createdAt: string;
    findings: SavedFinding[];
    html: string;
  }) {
    try {
      const key = "gemineye_reports";
      const raw = localStorage.getItem(key) || "[]";
      const arr = JSON.parse(raw) as Array<any>;
      arr.unshift(report);
      // keep most recent 200 reports
      const trimmed = arr.slice(0, 200);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      // ignore storage errors
      // (localStorage may be disabled in some private modes)
      // eslint-disable-next-line no-console
      console.warn("Failed to save report to storage", e);
    }
  }

  const downloadReport = () => {
    if (isFallback) {
      setError("Demo fallback reports cannot be downloaded or saved to the dashboard.");
      return;
    }
    const reportContractTitle = analyzedContractTitle.trim() || contractTitle.trim() || "Contract Review";
    const reportHtml = buildReportHtml({
      contractTitle: reportContractTitle,
      contractText,
      memo,
      fallback: isFallback,
    });
    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const previewWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (previewWindow) {
      previewWindow.opener = null;
    }

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFilename(reportContractTitle)}-gemineye-report.html`;
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileStatus("Extracting text...");
    setError(null);
    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "File extraction failed.");
        }
        throw new Error("File extraction failed.");
      }

      const data = (await response.json()) as { text?: string; title?: string };
      setContractText(data.text ?? "");
      if (data.title) {
        setContractTitle(data.title);
      }
      setFileStatus("Text extracted.");
    } catch (err) {
      setFileStatus(null);
      setError(err instanceof Error ? err.message : "File extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="paper-hero rounded-3xl border border-line p-8 md:p-10 soft-shadow rise-in">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-5">
              <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight text-muted">
                <span className="text-xl leading-none">🕵️⚖️</span>
                <span>
                  GeminEYE
                </span>
              </h2>
              <h1 className="font-serif text-4xl text-ink md:text-5xl">
                Review contracts with confidence.
              </h1>
              <p className="max-w-xl text-base text-muted">
                Upload a PDF or DOCX, or paste contract text directly. GeminEYE turns dense agreements into a clear, evidence-backed risk memo by extracting key clauses, scoring the overall picture, and surfacing issues across liability, indemnity, privacy, termination, intellectual property, and venue.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={runAnalysis}
                  disabled={isLoading || hasAnalysisResult}
                  aria-disabled={isLoading || hasAnalysisResult}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    hasAnalysisResult
                      ? "analysis-done-button border border-line bg-panel text-muted"
                      : "btn-inverse button-pop"
                  }`}
                >
                  {isLoading ? "Reviewing..." : hasAnalysisResult ? "Review complete" : "Start review"}
                </button>
                {hasAnalysisResult ? (
                  <button
                    onClick={resetAnalysis}
                    className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
                  >
                    Review again
                  </button>
                ) : null}
                <button
                  onClick={resetAll}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                  Common review areas
                </span>
                <p className="text-[11px] text-muted">
                  Hover or tap a label to see what it means.
                </p>
                <div ref={reviewAreasRef} className="grid grid-cols-2 gap-3 text-xs text-muted md:grid-cols-3">
                  {REVIEW_AREAS.map((area) => (
                    <div key={area.label} className="relative">
                      <button
                        type="button"
                        onMouseEnter={() => setActiveReviewArea(area.label)}
                        onMouseLeave={() => setActiveReviewArea((current) => (current === area.label ? null : current))}
                        onFocus={() => setActiveReviewArea(area.label)}
                        onBlur={() => setActiveReviewArea((current) => (current === area.label ? null : current))}
                        onClick={() =>
                          setActiveReviewArea((current) => (current === area.label ? null : area.label))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setActiveReviewArea(null);
                          }
                        }}
                        aria-describedby={`review-area-tip-${area.label.toLowerCase()}`}
                        aria-expanded={activeReviewArea === area.label}
                        className="w-full rounded-full border border-line bg-white px-3 py-1 text-center uppercase tracking-[0.2em] transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {area.label}
                      </button>
                      <div
                        id={`review-area-tip-${area.label.toLowerCase()}`}
                        role="tooltip"
                        className={`pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 rounded-xl border border-line bg-panel p-2 text-left text-[11px] normal-case tracking-normal text-ink shadow-lg transition duration-150 ${
                          activeReviewArea === area.label
                            ? "visible translate-y-0 opacity-100"
                            : "invisible -translate-y-1 opacity-0"
                        }`}
                      >
                        <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-line bg-panel" />
                        {area.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-panel p-5">
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">
                  Contract intake
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted">
                    Gemini status
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                      apiStatus === "checking"
                        ? "border-line bg-panel text-muted"
                        : apiStatus === "unknown"
                        ? "border-line bg-panel text-muted"
                        : apiStatus === "configured"
                        ? "border-slate-200 bg-slate-50 text-slate-700"
                        : "border-stone-200 bg-stone-50 text-stone-700"
                    }`}
                  >
                    {apiStatus === "checking"
                      ? "Checking"
                      : apiStatus === "unknown"
                      ? "Not checked"
                      : apiStatus === "configured"
                      ? "Configured"
                      : "Missing"}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid gap-4">
                <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                  <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                    Contract title<span className="text-signal">*</span>
                  </span>
                  <input
                    value={contractTitle}
                    onChange={(event) => setContractTitle(event.target.value)}
                    placeholder="Enter a contract title"
                    required
                    className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                  Upload a PDF, DOCX, or TXT
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="rounded-xl border border-dashed border-line bg-panel-strong p-3 text-sm text-muted"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                  Paste contract text
                  <textarea
                    rows={7}
                    placeholder="Paste contract language or a specific clause..."
                    value={contractText}
                    onChange={(event) => setContractText(event.target.value)}
                    className="rounded-xl border border-line bg-white p-3 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <ErrorAlert message={error || ""} />
                {fileStatus ? (
                  <div className="rounded-xl border border-signal bg-white px-3 py-2 text-xs text-signal">
                    {fileStatus}
                  </div>
                ) : null}
                <div className="rounded-xl border border-line bg-white px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Text extraction</span>
                    <span>{isExtracting ? "Extracting" : "Ready"}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-panel-strong">
                    <div
                      className={`h-full rounded-full bg-accent transition-all duration-500 ${
                        isExtracting ? "w-3/4" : "w-1/6"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <details className="group flex flex-col rounded-3xl border border-line bg-panel p-6" open>
            <summary className="cursor-pointer list-none text-base font-semibold text-ink">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="text-xs text-muted group-open:hidden">▶</span>
                  <span aria-hidden="true" className="hidden text-xs text-muted group-open:inline">▼</span>
                  Extracted preview
                </span>
                <span className="text-xs text-muted">
                  {contractText.length.toLocaleString()} chars
                </span>
              </div>
            </summary>
            <Suspense fallback={<SkeletonCard />}>
              <pre className="mt-4 flex-1 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-line bg-white p-4 text-xs text-muted">
                {contractText.trim().length > 0
                  ? contractText
                  : "Upload a contract to preview extracted text."}
              </pre>
            </Suspense>
          </details>

          <div className="rounded-3xl border border-line bg-panel p-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                  GeminEYE memo
                </p>
                <h2 className="text-base font-semibold text-ink">
                  Investigator memo
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskScoreTone}`}>
                  {riskScoreLabel}
                </span>
                {hasAnalysisResult ? (
                  <button
                    onClick={downloadReport}
                    disabled={isFallback}
                    aria-disabled={isFallback}
                    className={`rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent ${
                      isFallback ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    Download report
                  </button>
                ) : null}
                {isFallback ? (
                  <button
                    disabled
                    aria-disabled
                    className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink opacity-50 pointer-events-none"
                  >
                    View Dashboard
                  </button>
                ) : (
                  <a
                    href="/dashboard"
                    className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent"
                  >
                    View Dashboard
                  </a>
                )}
              </div>
            </div>
            {isFallback ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                <div>Demo fallback: this memo is sample text shown because live analysis failed.</div>
                <div className="mt-1 font-normal text-[11px] normal-case text-amber-900">This demo report cannot be saved to the dashboard or downloaded.</div>
              </div>
            ) : null}
            <div className="mt-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Contract title
              </span>
              <p className="mt-1 text-sm font-medium">
                {analyzedContractTitle || "Add a contract title to display it here."}
              </p>
            </div>
            <div className="mt-4 grid gap-4 text-sm text-muted">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
                  Narrative
                </h3>
                <div className="mt-2 grid gap-2 text-sm">
                  {memo.narrative.map((item, index) => (
                    <p key={`${item}-${index}`}>{item}</p>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
                  Summary
                </h3>
                <ul className="mt-2 grid gap-2 text-sm">
                  {memo.summary.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
                  Findings
                </h3>
                {memo.findings.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{item.id}</span>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${riskTone(item.risk)}`}>
                        {item.risk}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-ink">
                      {item.category}
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {item.evidence}
                    </p>
                    <p className="mt-2 text-xs text-ink">
                      {item.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <p className="px-1 text-center text-[11px] leading-5 text-muted">
          GeminEYE provides informational contract review support only and does not provide legal advice.
          It should not be used as a substitute for a qualified attorney or formal legal review.
        </p>
      </main>
    </div>
  );
}
