"use client";

import { useState } from "react";

export function AiSummaryButton({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (open) {
      setOpen(false);
      return;
    }
    // If we already have a summary cached, just show it
    if (summary) {
      setOpen(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/patient-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json() as { summary?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "AI summary failed");
        return;
      }
      setSummary(data.summary ?? "");
      setOpen(true);
    } catch {
      setError("Failed to connect to AI service");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setSummary("");
    setOpen(false);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/patient-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json() as { summary?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "AI summary failed");
        return;
      }
      setSummary(data.summary ?? "");
      setOpen(true);
    } catch {
      setError("Failed to connect to AI service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="border-2 border-black bg-[#fff1dc] px-3 py-1.5 text-sm font-bold shadow-[2px_2px_0_0_#000] hover:bg-[#ffe0b2] disabled:opacity-50"
        >
          {loading ? "Analyzing with AI…" : open ? "▲ Hide AI Summary" : "✦ AI Patient Summary"}
        </button>

        {open && summary && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="border-2 border-black bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs font-semibold text-red-600">Error: {error}</p>
      )}

      {open && summary && (
        <div className="mt-2 border-2 border-black bg-[#fffdf5] p-4 shadow-[3px_3px_0_0_#000]">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-amber-700">
            AI Medical Summary — {patientName}
          </p>
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-800">
            {summary}
          </pre>
          <p className="mt-3 text-xs text-gray-400 italic">
            AI-generated summary. Always verify with patient records.
          </p>
        </div>
      )}
    </div>
  );
}
