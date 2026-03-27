import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ManagerSummary, RiskLevel } from "./types";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const RISK_BTN: Record<RiskLevel, string> = { low: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", high: "bg-rose-100 text-rose-700" };

export function ManagerSummaryCard({ summary, onUpdate, onSubmit }: { summary: ManagerSummary; onUpdate: (field: string, value: unknown) => void; onSubmit: () => void }) {
  const [editing, setEditing] = useState(summary.status === "draft");
  const [newBlocker, setNewBlocker] = useState("");
  const [newDecision, setNewDecision] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const readOnly = summary.status === "submitted" && !editing;

  function addBlocker() { if (!newBlocker.trim()) return; onUpdate("blockers", [...summary.blockers, newBlocker.trim()]); setNewBlocker(""); }
  function removeBlocker(i: number) { onUpdate("blockers", summary.blockers.filter((_, idx) => idx !== i)); }
  function addDecision() { if (!newDecision.trim()) return; onUpdate("decisionsRequired", [...summary.decisionsRequired, newDecision.trim()]); setNewDecision(""); }
  function removeDecision(i: number) { onUpdate("decisionsRequired", summary.decisionsRequired.filter((_, idx) => idx !== i)); }
  function addLink() { if (!newLinkLabel.trim() || !newLinkUrl.trim()) return; onUpdate("deckLinks", [...summary.deckLinks, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }]); setNewLinkLabel(""); setNewLinkUrl(""); }
  function removeLink(i: number) { onUpdate("deckLinks", summary.deckLinks.filter((_, idx) => idx !== i)); }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">Manager Summary</p>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${summary.status === "submitted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{summary.status === "submitted" ? "Submitted" : "Draft"}</span>
          {summary.status === "submitted" && !editing && <button onClick={() => setEditing(true)} className="rounded-lg border border-gray-300 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 transition">Edit</button>}
        </div>
      </div>
      <div className="px-4 py-4 space-y-4">
        {/* Executive Summary */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Executive Summary</label>
          <textarea rows={3} className={`mt-1 ${inputCls} resize-none`} value={summary.executiveSummary} onChange={(e) => onUpdate("executiveSummaryText", e.target.value)} disabled={readOnly} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Risk Level */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1 block">Risk Level</label>
            <div className="flex gap-1.5">
              {(["low", "medium", "high"] as const).map((r) => (
                <button key={r} onClick={() => !readOnly && onUpdate("riskLevel", r === "low" ? "Low" : r === "medium" ? "Medium" : "High")} disabled={readOnly} type="button"
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${summary.riskLevel === r ? RISK_BTN[r] : "bg-gray-50 text-gray-500 hover:bg-gray-100"} ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {r[0].toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Blockers */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1 block">Blockers</label>
            <div className="flex flex-wrap gap-1 mb-1">{summary.blockers.map((b, i) => <span key={i} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700">{b}{!readOnly && <button onClick={() => removeBlocker(i)} className="hover:text-rose-900"><X className="h-2.5 w-2.5" /></button>}</span>)}</div>
            {!readOnly && <div className="flex gap-1"><input className={`flex-1 ${inputCls} !text-xs !py-1`} value={newBlocker} onChange={(e) => setNewBlocker(e.target.value)} placeholder="Add blocker" onKeyDown={(e) => e.key === "Enter" && addBlocker()} /><button onClick={addBlocker} className="text-[10px] text-indigo-600 font-medium"><Plus className="h-3.5 w-3.5" /></button></div>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Decisions */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1 block">Decisions Required</label>
            <div className="flex flex-wrap gap-1 mb-1">{summary.decisionsRequired.map((d, i) => <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{d}{!readOnly && <button onClick={() => removeDecision(i)} className="hover:text-amber-900"><X className="h-2.5 w-2.5" /></button>}</span>)}</div>
            {!readOnly && <div className="flex gap-1"><input className={`flex-1 ${inputCls} !text-xs !py-1`} value={newDecision} onChange={(e) => setNewDecision(e.target.value)} placeholder="Add decision" onKeyDown={(e) => e.key === "Enter" && addDecision()} /><button onClick={addDecision} className="text-[10px] text-indigo-600 font-medium"><Plus className="h-3.5 w-3.5" /></button></div>}
          </div>

          {/* Deck Links */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1 block">Deck Links</label>
            <div className="space-y-1 mb-1">{summary.deckLinks.map((l, i) => <div key={i} className="flex items-center gap-1 text-[10px]"><a href={l.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate">{l.label}</a>{!readOnly && <button onClick={() => removeLink(i)} className="text-gray-400 hover:text-rose-500"><X className="h-2.5 w-2.5" /></button>}</div>)}</div>
            {!readOnly && <div className="flex gap-1"><input className={`flex-1 ${inputCls} !text-xs !py-1`} value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="Label" /><input className={`flex-1 ${inputCls} !text-xs !py-1`} value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="URL" /><button onClick={addLink} className="text-[10px] text-indigo-600 font-medium"><Plus className="h-3.5 w-3.5" /></button></div>}
          </div>
        </div>

        {/* Submit button */}
        {!readOnly && (
          <div className="flex justify-end">
            <button onClick={() => { onSubmit(); setEditing(false); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30">Submit Manager Summary</button>
          </div>
        )}
      </div>
    </div>
  );
}
