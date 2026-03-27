import { useState } from "react";
import { ChevronDown, Link2 } from "lucide-react";
import type { Report, QuickTaskInput, QuickTask } from "./types";
import { QuickTaskModal } from "./QuickTaskModal";

export function ReportCard({ report, users, onAddNote, onCreateTask }: { report: Report; users: { id: string; name: string }[]; onAddNote: (note: string) => void; onCreateTask: (input: QuickTaskInput) => Promise<QuickTask> }) {
  const [expanded, setExpanded] = useState(report.status === "submitted");
  const [note, setNote] = useState("");
  const [showTask, setShowTask] = useState(false);
  const [linked, setLinked] = useState(report.linkedTaskId ?? "");

  const submitted = report.status === "submitted";
  const lines = report.content?.split("\n").filter(Boolean) ?? [];

  async function handleCreateTask(input: QuickTaskInput) {
    const task = await onCreateTask(input);
    setLinked(task.id);
    setShowTask(false);
  }

  function handleAddNote() {
    if (!note.trim()) return;
    onAddNote(note.trim());
    setNote("");
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-800">{report.assigneeName}</p>
          <p className="text-[10px] text-gray-500">{report.assigneeRole} Report</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${submitted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {submitted && report.submittedAt ? `Submitted ${new Date(report.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Not submitted yet"}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {submitted && lines.length > 0 ? (
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
            {report.overallStatus && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${report.overallStatus === "OnTrack" ? "bg-emerald-100 text-emerald-700" : report.overallStatus === "AtRisk" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{report.overallStatus === "OnTrack" ? "On Track" : report.overallStatus === "AtRisk" ? "At Risk" : "Delayed"}</span>
                {report.score != null && <span className="text-[10px] text-gray-500">Score: {report.score}/5</span>}
              </div>
            )}
          </>
        ) : !submitted ? (
          <p className="text-xs text-gray-400 italic py-2">Report not submitted yet. Assigned to {report.assigneeName}.</p>
        ) : (
          <p className="text-xs text-gray-400 italic py-2">No content available.</p>
        )}
      </div>

      {/* Manager Note */}
      <div className="px-4 py-3 bg-gray-50/70 border-t border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Manager Note</p>
        {report.managerNote && <p className="text-xs text-gray-600 mb-1.5 whitespace-pre-line">{report.managerNote}</p>}
        <div className="relative flex gap-2">
          <textarea rows={2} className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 resize-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder={`Add a note for ${report.assigneeRole}...`} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <button onClick={handleAddNote} disabled={!note.trim()} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Add</button>
            <button onClick={() => setShowTask(true)} className="rounded-lg border border-gray-300 px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30">+ Task</button>
          </div>
          {showTask && <QuickTaskModal defaultTitle={note.split("\n")[0] || ""} defaultAssignee={report.assigneeName} users={users} onConfirm={handleCreateTask} onCancel={() => setShowTask(false)} />}
        </div>
        {linked && <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700"><Link2 className="h-3 w-3" /> Linked: #{linked}</p>}
      </div>
    </div>
  );
}
