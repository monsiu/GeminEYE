"use client";

import { useMemo, useRef, useState } from "react";

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

export default function Home() {
  const [contractTitle, setContractTitle] = useState("");
  const [contractText, setContractText] = useState("");
  const [memo, setMemo] = useState<MemoPayload>(SAMPLE_MEMO);
  const [analyzedContractTitle, setAnalyzedContractTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [keyLoaded, setKeyLoaded] = useState<boolean | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setError(null);
    setFileStatus(null);
    setIsExtracting(false);
    setKeyLoaded(null);
    setIsFallback(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        keyLoaded?: boolean;
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
      if (typeof data.keyLoaded === "boolean") {
        setKeyLoaded(data.keyLoaded);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
                Review contracts like an investigator.
              </h1>
              <p className="max-w-xl text-base text-muted">
                Upload a PDF or DOCX, or paste text. The system extracts clauses,
                scores risk, and delivers a structured memo with evidence and
                negotiation-ready actions.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={runAnalysis}
                  className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-panel transition hover:bg-black"
                >
                  {isLoading ? "Analyzing..." : "Run analysis"}
                </button>
                <button
                  onClick={resetAll}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink"
                >
                  Reset
                </button>
                <span className="text-xs uppercase tracking-[0.2em] text-muted">
                  Gemini API
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    keyLoaded === null
                      ? "border-line text-muted"
                      : keyLoaded
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {keyLoaded === null
                    ? "Key unknown"
                    : keyLoaded
                    ? "Key loaded"
                    : "Key missing"}
                </span>
                {isFallback ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-700">
                    Fallback
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted md:grid-cols-3">
                {["Liability", "Indemnity", "Data privacy", "Termination", "IP", "Venue"].map(
                  (label) => (
                    <span
                      key={label}
                      className="rounded-full border border-line bg-white px-3 py-1 text-center uppercase tracking-[0.2em]"
                    >
                      {label}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-panel p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">
                  Intake
                </h2>
                <span className="rounded-full bg-panel-strong px-3 py-1 text-xs text-muted">
                  Ready
                </span>
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
                  Upload file
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="rounded-xl border border-dashed border-line bg-panel-strong p-3 text-sm text-muted"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                  Or paste text
                  <textarea
                    rows={7}
                    placeholder="Paste contract language or a specific clause..."
                    value={contractText}
                    onChange={(event) => setContractText(event.target.value)}
                    className="rounded-xl border border-line bg-white p-3 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                {error ? (
                  <div className="rounded-xl border border-signal bg-white px-3 py-2 text-xs text-signal">
                    {error}
                  </div>
                ) : null}
                {fileStatus ? (
                  <div className="rounded-xl border border-signal bg-white px-3 py-2 text-xs text-signal">
                    {fileStatus}
                  </div>
                ) : null}
                <div className="rounded-xl border border-line bg-white px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Extraction</span>
                    <span>{isExtracting ? "Processing" : "Idle"}</span>
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
          <div className="flex flex-col rounded-3xl border border-line bg-panel p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">
                Extracted preview
              </h2>
              <span className="text-xs text-muted">
                {contractText.length.toLocaleString()} chars
              </span>
            </div>
            <pre className="mt-4 flex-1 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-line bg-white p-4 text-xs text-muted">
              {contractText.trim().length > 0
                ? contractText
                : "Upload a contract to preview extracted text."}
            </pre>
          </div>

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
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskScoreTone}`}>
                {riskScoreLabel}
              </span>
            </div>
            {isFallback ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                Demo fallback: this memo is sample text shown because live analysis failed.
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
