"use client";

import { useEffect, useRef, useState } from "react";

type FileInfo = {
  _id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  createdAt: string;
};

const CATEGORIES = [
  { value: "blood-report", label: "Blood Report" },
  { value: "scan", label: "Scan / MRI" },
  { value: "xray", label: "X-Ray" },
  { value: "prescription", label: "Prescription" },
  { value: "document", label: "Document" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLOR: Record<string, string> = {
  "blood-report": "bg-red-100 text-red-700",
  scan: "bg-purple-100 text-purple-700",
  xray: "bg-blue-100 text-blue-700",
  prescription: "bg-green-100 text-green-700",
  document: "bg-gray-100 text-gray-700",
  other: "bg-yellow-100 text-yellow-700",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PatientFilesPanel({ patientId }: { patientId: string }) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState("document");
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch(`/api/patient-files?patientId=${patientId}`);
      const data = await res.json() as { files?: FileInfo[] };
      setFiles(data.files ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (expanded) loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("patientId", patientId);
      form.append("category", category);
      const res = await fetch("/api/patient-files", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Upload failed");
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      await loadFiles();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    await fetch(`/api/patient-files/${fileId}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f._id !== fileId));
  }

  return (
    <div className="mt-3 border-2 border-black bg-[#f0f4ff]">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-bold hover:bg-[#dce8ff]"
      >
        <span>
          Patient Files
          {!loading && files.length > 0 ? ` (${files.length})` : ""}
        </span>
        <span className="text-xs">{expanded ? "▲ collapse" : "▼ expand"}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {/* Upload form */}
          <form
            onSubmit={handleUpload}
            className="mb-3 flex flex-wrap items-center gap-2 border-b-2 border-black pb-3 pt-2"
          >
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border-2 border-black px-2 py-1 text-xs"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="text-xs"
              required
            />

            <button
              type="submit"
              disabled={uploading}
              className="border-2 border-black bg-black px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload File"}
            </button>

            {error && <span className="text-xs text-red-600 font-semibold">{error}</span>}
          </form>

          {/* File list */}
          {loading ? (
            <p className="text-xs text-gray-500">Loading files…</p>
          ) : files.length === 0 ? (
            <p className="text-xs text-gray-500">No files uploaded for this patient yet.</p>
          ) : (
            <ul className="space-y-1">
              {files.map((f) => (
                <li
                  key={f._id}
                  className="flex items-center justify-between gap-2 border-2 border-black bg-white px-2 py-1 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{f.fileName}</span>
                    <span className="text-gray-500">
                      {formatSize(f.fileSize)} &middot;{" "}
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${CATEGORY_COLOR[f.category] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {f.category}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <a
                      href={`/api/patient-files/${f._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="border-2 border-black bg-white px-2 py-0.5 text-xs font-semibold hover:bg-[var(--panel)]"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(f._id)}
                      className="border-2 border-black bg-white px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Del
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
