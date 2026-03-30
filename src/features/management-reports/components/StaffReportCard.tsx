import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { StatusPill, type StaffReportStatus } from "./StatusPill";

const WORKLOAD_LABELS: Record<number, string> = { 1: "Very Light", 2: "Light", 3: "Moderate", 4: "Heavy", 5: "Extreme" };
const PRODUCTIVITY_LABELS: Record<number, string> = { 1: "Not productive", 2: "Below average", 3: "Average", 4: "Good", 5: "Excellent" };
function wlColor(v: number) { if (v >= 5) return "text-rose-600"; if (v >= 4) return "text-amber-600"; return "text-emerald-600"; }
function prColor(v: number) { if (v >= 4) return "text-emerald-600"; if (v <= 2) return "text-rose-600"; return "text-gray-600"; }

export { WORKLOAD_LABELS, PRODUCTIVITY_LABELS, wlColor, prColor };

export interface StaffReportData {
  employeeId: string;
  employeeName: string;
  department: string;
  initials: string;
  status: StaffReportStatus;
  reportText: string;
  highlights: string[];
  workloadRating: number;
  productivityRating: number;
  reportId: string | null;
  noteCount: number;
}

interface Props {
  report: StaffReportData;
  onNameClick: (employeeId: string) => void;
  onPostNote: (reportId: string, text: string, aiGenerated: boolean) => void;
  onGenerateAi: (employeeId: string) => void;
}

export function StaffReportCard({ report, onNameClick, onPostNote, onGenerateAi }: Props) {
  const [expanded, setExpanded] = useState(report.status === "Submitted");
  const [note, setNote] = useState("");

  const lines = report.reportText.split("\n").filter(Boolean);
  const hasContent = report.status === "Submitted" && lines.length > 0;

  function handlePostNote() {
    if (!note.trim() || !report.reportId) return;
    onPostNote(report.reportId, note.trim(), false);
    setNote("");
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 flex-shrink-0">
            {report.initials}
          </div>
          <div className="min-w-0">
            <button onClick={() => onNameClick(report.employeeId)} className="text-sm font-semibold text-gray-800 hover:text-indigo-600 transition truncate block">
              {report.employeeName}
            </button>
            <p className="text-[10px] text-gray-500">{report.department}</p>
          </div>
        </div>
        <StatusPill status={report.status} />
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {hasContent ? (
          <>
            <div className={`text-xs text-gray-700 space-y-0.5 ${!expanded ? "line-clamp-3" : ""}`}>
              {(expanded ? lines : lines.slice(0, 3)).map((l, i) => <p key={i}>{l}</p>)}
            </div>
            {lines.length > 3 && (
              <button onClick={() => setExpanded((e) => !e)} className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 font-medium hover:text-indigo-700">
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-[10px] font-medium ${wlColor(report.workloadRating)}`}>
                WL: {WORKLOAD_LABELS[report.workloadRating] ?? "–"}
              </span>
              <span className={`text-[10px] font-medium ${prColor(report.productivityRating)}`}>
                PR: {PRODUCTIVITY_LABELS[report.productivityRating] ?? "–"}
              </span>
            </div>
            {report.highlights.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {report.highlights.map((h, i) => (
                  <span key={i} className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">{h}</span>
                ))}
              </div>
            )}
          </>
        ) : report.status !== "Submitted" ? (
          <p className="text-xs text-gray-400 italic py-2">Report not submitted yet.</p>
        ) : (
          <p className="text-xs text-gray-400 italic py-2">No content available.</p>
        )}
      </div>

      {/* Manager Note footer */}
      <div className="px-4 py-3 bg-gray-50/70 border-t border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
          Manager Note{report.noteCount > 0 && <span className="ml-1 text-indigo-600">({report.noteCount})</span>}
        </p>
        <div className="flex gap-2">
          <textarea
            rows={2}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 resize-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder={`Add a note for ${report.employeeName}...`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handlePostNote}
              disabled={!note.trim() || !report.reportId}
              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition"
            >
              Post
            </button>
            {report.reportId && (
              <button
                onClick={() => onGenerateAi(report.employeeId)}
                className="rounded-lg border border-indigo-200 px-2.5 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 transition"
              >
                <Sparkles className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
