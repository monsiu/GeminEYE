import { NextResponse } from "next/server";

type AnalyzePayload = {
  text?: string;
  contractTitle?: string;
};

type GeminiMemo = {
  narrative: string[];
  summary: string[];
  findings: Array<{
    id: string;
    risk: "Low" | "Medium" | "High";
    category: string;
    evidence: string;
    recommendation: string;
  }>;
  overallRiskScore?: number;
};

const DEFAULT_MEMO: GeminiMemo = {
  narrative: [
    "[DEMO FALLBACK] This is sample contract analysis shown because the live model request did not complete successfully. The biggest issues are liability scope and a one-sided indemnity, with a secondary concern around breach notification timing.",
  ],
  summary: [
    "[DEMO FALLBACK] Liability cap excludes direct damages.",
    "[DEMO FALLBACK] Indemnity is one-sided for vendor only.",
    "[DEMO FALLBACK] Data breach notice exceeds typical thresholds.",
  ],
  findings: [
    {
      id: "R-01",
      risk: "High",
      category: "Liability",
      evidence: "[DEMO FALLBACK] Section 9.2 caps only indirect damages.",
      recommendation: "[DEMO FALLBACK] Include direct damages under the cap.",
    },
  ],
  overallRiskScore: 7.8,
};

function safeParseMemo(raw: string): GeminiMemo | null {
  try {
    // Remove markdown code block wrapper
    let cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    
    // Try to extract the outermost JSON object (handles nested structures)
    let jsonMatch = cleaned.match(/\{[\s\S]*\}(?=\s*$)/);
    if (!jsonMatch) {
      // Fallback: find first { and last }
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
    } else {
      cleaned = jsonMatch[0];
    }
    
    // Parse JSON
    const parsed = JSON.parse(cleaned) as unknown;
    
    // Ensure it's an object
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    
    const obj = parsed as Record<string, unknown>;
    
    // Handle wrapped memo (some models return { memo: { ... } })
    const memoContent = ("memo" in obj && typeof obj.memo === "object" && obj.memo !== null)
      ? (obj.memo as Record<string, unknown>)
      : obj;
    
    // Validate and coerce fields
    const narrative = Array.isArray(memoContent.narrative)
      ? (memoContent.narrative as string[])
      : typeof memoContent.narrative === "string"
        ? [memoContent.narrative]
        : [];
    
    const summary = Array.isArray(memoContent.summary)
      ? (memoContent.summary as string[])
      : typeof memoContent.summary === "string"
        ? [memoContent.summary]
        : [];
    
    let findings = Array.isArray(memoContent.findings)
      ? (memoContent.findings as Array<unknown>)
      : [];
    
    // Validate and sanitize findings
    const validFindings: GeminiMemo["findings"] = [];
    for (const f of findings) {
      if (f && typeof f === "object") {
        const fObj = f as Record<string, unknown>;
        // Coerce fields with fallback values
        const finding = {
          id: String(fObj.id || `F-${validFindings.length + 1}`),
          risk: (["Low", "Medium", "High"].includes(String(fObj.risk)) ? String(fObj.risk) : "Medium") as "Low" | "Medium" | "High",
          category: String(fObj.category || "Other"),
          evidence: String(fObj.evidence || "No evidence provided"),
          recommendation: String(fObj.recommendation || "Review this item"),
        };
        validFindings.push(finding);
      }
    }
    
    // Require at least some content
    if (narrative.length === 0 && summary.length === 0 && validFindings.length === 0) {
      return null;
    }
    
    return {
      narrative: narrative.length > 0 ? narrative : ["Analysis complete."],
      summary: summary.length > 0 ? summary : ["See findings for details."],
      findings: validFindings,
      overallRiskScore: typeof memoContent.overallRiskScore === "number" 
        ? memoContent.overallRiskScore 
        : undefined,
    };
  } catch (e) {
    console.error("JSON parse error:", e, "Raw input:", raw.substring(0, 200));
    return null;
  }
}

function extractGeminiText(data: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}) {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("\n").trim();
}

function extractOpenAiText(data: {
  choices?: Array<{ message?: { content?: string }; text?: string }>;
}) {
  const messageContent = data.choices?.[0]?.message?.content;
  if (messageContent) {
    return messageContent.trim();
  }
  return (data.choices?.[0]?.text ?? "").trim();
}

function normalizeBaseUrl(input?: string) {
  if (!input) {
    return null;
  }
  return input.replace(/\/$/, "");
}

function buildCompletionsUrl(baseUrl: string) {
  if (baseUrl.endsWith("/v1")) {
    return `${baseUrl}/chat/completions`;
  }
  return `${baseUrl}/v1/chat/completions`;
}

function buildAuthHeader(apiKey: string, headerName?: string, scheme?: string) {
  const name = headerName?.trim() || "Authorization";
  if (name.toLowerCase() === "authorization") {
    const authScheme = scheme?.trim() || "Bearer";
    return { [name]: `${authScheme} ${apiKey}` };
  }
  return { [name]: apiKey };
}

async function callAiMlApi(prompt: string) {
  const apiKey = process.env.AI_ML_API_KEY?.trim();
  const model = process.env.AI_ML_API_MODEL?.trim();
  const directUrl = (process.env.AI_ML_API_COMPLETIONS_URL?.trim() || "").trim();
  const baseUrl = normalizeBaseUrl(process.env.AI_ML_API_BASE_URL?.trim());
  const headerName = process.env.AI_ML_API_AUTH_HEADER?.trim();
  const authScheme = process.env.AI_ML_API_AUTH_SCHEME?.trim();

  if (!apiKey || !model || (!directUrl && !baseUrl)) {
    return null;
  }

  const completionsUrl = directUrl || buildCompletionsUrl(baseUrl!);
  const headers = {
    "Content-Type": "application/json",
    ...buildAuthHeader(apiKey, headerName, authScheme),
  };

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    response = await fetch(completionsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 8190,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI/ML API request failed.";
    const errorMsg = message.includes("abort") 
      ? "Analysis took too long (timeout). Try with a shorter contract or retry."
      : message;
    return {
      memo: DEFAULT_MEMO,
      fallback: true,
      keyLoaded: true,
      error: errorMsg,
    };
  }

  if (!response.ok) {
    const bodyText = await response.text();
    let errorMsg = `AI/ML API error (${response.status}).`;
    if (response.status === 401) {
      errorMsg = "API key invalid or expired.";
    } else if (response.status === 429) {
      errorMsg = "API rate limit exceeded. Please try again in a moment.";
    } else if (response.status >= 500) {
      errorMsg = "AI/ML service temporarily unavailable. Try again soon.";
    }
    return {
      memo: DEFAULT_MEMO,
      fallback: true,
      keyLoaded: true,
      error: errorMsg,
    };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
  };
  const rawText = extractOpenAiText(data);
  
  if (!rawText || rawText.length === 0) {
    return {
      memo: DEFAULT_MEMO,
      fallback: true,
      keyLoaded: true,
      error: "AI/ML API returned empty content. Try a different contract.",
    };
  }
  
  const memo = safeParseMemo(rawText);
  if (!memo) {
    console.error("Raw AI/ML API response:", rawText);
    return {
      memo: DEFAULT_MEMO,
      fallback: true,
      keyLoaded: true,
      error: "AI/ML API returned invalid format. Check logs for details.",
    };
  }

  return {
    memo,
    fallback: false,
    keyLoaded: true,
    error: undefined,
  };
}

export async function POST(request: Request) {
  let payload: AnalyzePayload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const text = payload.text?.trim() ?? "";
  if (text.length === 0) {
    return NextResponse.json({
      contractTitle: payload.contractTitle ?? "Untitled contract",
      memo: DEFAULT_MEMO,
      fallback: true,
      keyLoaded: false,
      error: "No contract text provided.",
    });
  }

  // Strip excess whitespace from contract text to reduce payload size
  const compressedText = text.replace(/\s+/g, " ").trim();

  const prompt = `You are an investigator-style contract risk analyst.\nReturn JSON only with this exact shape:\n{\n  "narrative": ["short paragraph 1", "short paragraph 2"],\n  "summary": ["..."],\n  "findings": [\n    {"id":"R-01","risk":"Low|Medium|High","category":"...","evidence":"...","recommendation":"..."}\n  ],\n  "overallRiskScore": 0-10\n}\nWrite the narrative as brief, plain-language reasoning (no step-by-step chain-of-thought).\nFocus on liability, indemnity, termination, data privacy, IP, and governing law.\nUse concise evidence quotes.\nContract text:\n"""\n${compressedText}\n"""`;

  const aiMlResult = await callAiMlApi(prompt);
  if (aiMlResult) {
    return NextResponse.json({
      contractTitle: payload.contractTitle ?? "Untitled contract",
      ...aiMlResult,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      contractTitle: payload.contractTitle ?? "Untitled contract",
      memo: DEFAULT_MEMO,
      fallback: true,
      keyLoaded: false,
      error: "Missing AI_ML_API_KEY and GEMINI_API_KEY.",
    });
  }

  let response: Response | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini API request failed.";
    const errorMsg = message.includes("abort") 
      ? "Analysis took too long (timeout). Try with a shorter contract or retry."
      : message;
    return NextResponse.json({
      contractTitle: payload.contractTitle ?? "Untitled contract",
      memo: DEFAULT_MEMO,
      fallback: true,
      keyLoaded: true,
      error: errorMsg,
    });
  }

  if (!response.ok) {
    let errorMsg = `Gemini API error (${response.status}).`;
    if (response.status === 401) {
      errorMsg = "Gemini API key invalid or expired.";
    } else if (response.status === 429) {
      errorMsg = "Gemini rate limit exceeded. Try again soon.";
    } else if (response.status >= 500) {
      errorMsg = "Gemini service temporarily unavailable.";
    }
    return NextResponse.json({
      contractTitle: payload.contractTitle ?? "Untitled contract",
      memo: DEFAULT_MEMO,
      fallback: true,
      keyLoaded: true,
      error: errorMsg,
    });
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = extractGeminiText(data);
  const memo = safeParseMemo(rawText) ?? DEFAULT_MEMO;

  return NextResponse.json({
    contractTitle: payload.contractTitle ?? "Untitled contract",
    memo,
    fallback: memo === DEFAULT_MEMO,
    keyLoaded: true,
    error: memo === DEFAULT_MEMO ? "Gemini returned an empty or invalid response." : undefined,
  });
}
