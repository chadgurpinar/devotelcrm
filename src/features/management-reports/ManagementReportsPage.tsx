import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Send, Sparkles, X } from "lucide-react";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";
import type { HrEmployee, WeeklyStaffReport, WorkloadRating, ProductivityRating } from "../../store/types";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50 disabled:text-gray-400";

function weekStartMonday(date: Date): string { const d = new Date(date); const day = d.getUTCDay(); const delta = day === 0 ? -6 : 1 - day; d.setUTCDate(d.getUTCDate() + delta); d.setUTCHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }
function shiftWeek(w: string, delta: number): string { const d = new Date(w + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + delta * 7); return weekStartMonday(d); }
function formatWeekLabel(w: string): string { return new Date(w + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
function getWeeksInMonth(year: number, month: number): string[] { const weeks: string[] = []; const lastDay = new Date(Date.UTC(year, month, 0)); let cursor = weekStartMonday(new Date(Date.UTC(year, month - 1, 1))); while (new Date(cursor + "T00:00:00Z") <= lastDay) { weeks.push(cursor); cursor = shiftWeek(cursor, 1); } return weeks; }
function shiftMonth(m: string, delta: number): string { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 + delta, 1)); return d.toISOString().slice(0, 7); }
function formatMonthLabel(m: string): string { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric" }); }
function timeAgo(iso: string): string { const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return `${Math.floor(hrs / 24)}d ago`; }

function initDraft(report: WeeklyStaffReport | null) {
  return { reportText: report?.reportText ?? "", highlights: (report?.highlights ?? []).join("\n"), workloadRating: report?.workloadRating ?? 0, productivityRating: report?.productivityRating ?? 0, calendarScreenshotUrl: report?.calendarScreenshotUrl ?? "" };
}

const WORKLOAD_OPTIONS = [{ value: 1, label: "Very Light" }, { value: 2, label: "Light" }, { value: 3, label: "Moderate" }, { value: 4, label: "Heavy" }, { value: 5, label: "Extreme" }];
const PRODUCTIVITY_OPTIONS = [{ value: 1, label: "Not productive" }, { value: 2, label: "Below average" }, { value: 3, label: "Average" }, { value: 4, label: "Good" }, { value: 5, label: "Excellent" }];
const WORKLOAD_LABELS: Record<number, string> = Object.fromEntries(WORKLOAD_OPTIONS.map((o) => [o.value, o.label]));
const PRODUCTIVITY_LABELS: Record<number, string> = Object.fromEntries(PRODUCTIVITY_OPTIONS.map((o) => [o.value, o.label]));

function wlColor(v: number) { if (v >= 5) return "text-rose-600"; if (v >= 4) return "text-amber-600"; return "text-emerald-600"; }
function prColor(v: number) { if (v >= 4) return "text-emerald-600"; if (v <= 2) return "text-rose-600"; return "text-gray-600"; }

function WeekNav({ week, onPrev, onNext }: { week: string; onPrev: () => void; onNext: () => void }) {
  return (<div className="flex items-center gap-2"><button onClick={onPrev} className="rounded-lg border border-gray-200 bg-white p-1.5 hover:bg-gray-50 transition"><ChevronLeft className="h-4 w-4 text-gray-500" /></button><span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">Week of {formatWeekLabel(week)}</span><button onClick={onNext} className="rounded-lg border border-gray-200 bg-white p-1.5 hover:bg-gray-50 transition"><ChevronRight className="h-4 w-4 text-gray-500" /></button></div>);
}

function StatusPill({ status }: { status: "Submitted" | "Draft" | "missing" }) {
  if (status === "Submitted") return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">✓ Submitted</span>;
  if (status === "Draft") return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Draft</span>;
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Not started</span>;
}

const AI_PROMPTS = ["Summarize this week", "Compare top performers", "Flag burnout risks", "Who is underperforming?", "Team workload overview"];

/* ═══════════════════════════════════════════════════════ */

export function ManagementReportsPage() {
  const state = useAppStore();
  const [activeTab, setActiveTab] = useState<"my" | "team" | "management">("my");
  const myEmployee = useMemo(() => { const bySystem = state.hrEmployees.find((e) => e.systemUserId === state.activeUserId && e.active); if (bySystem) return bySystem; return state.hrEmployees.find((e) => e.active) ?? state.hrEmployees[0] ?? null; }, [state.hrEmployees, state.activeUserId]);
  const tabs: { key: typeof activeTab; label: string }[] = [{ key: "my", label: "My Report" }, { key: "team", label: "Team View" }, { key: "management", label: "Management" }];

  return (
    <div className="space-y-6">
      <UiPageHeader title="Management Reports" subtitle="Weekly staff reports & team analytics" />
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {tabs.map((t) => (<button key={t.key} onClick={() => setActiveTab(t.key)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{t.label}</button>))}
      </div>
      {activeTab === "my" && <MyReportTab myEmployee={myEmployee} />}
      {activeTab === "team" && <TeamViewTab myEmployee={myEmployee} />}
      {activeTab === "management" && <ManagementTab />}
    </div>
  );
}

/* ═══ TAB 1 — My Report ═══ */
function MyReportTab({ myEmployee }: { myEmployee: HrEmployee | null }) {
  const state = useAppStore();
  const [selectedWeek, setSelectedWeek] = useState(() => weekStartMonday(new Date()));
  const currentReport = useMemo(() => myEmployee ? (state.weeklyStaffReports.find((r) => r.employeeId === myEmployee.id && r.weekStartDate === selectedWeek) ?? null) : null, [state.weeklyStaffReports, myEmployee, selectedWeek]);
  const isSubmitted = currentReport?.status === "Submitted";
  const [draft, setDraft] = useState(() => initDraft(currentReport));
  const [validationError, setValidationError] = useState("");
  const [expandedPastWeek, setExpandedPastWeek] = useState<string | null>(null);
  useEffect(() => { setDraft(initDraft(currentReport)); setValidationError(""); }, [selectedWeek]);

  if (!myEmployee) return <p className="text-sm text-gray-500 py-8 text-center">No HR employee records found.</p>;

  const handleSaveDraft = () => { state.upsertWeeklyStaffReport({ employeeId: myEmployee.id, weekStartDate: selectedWeek, status: "Draft", reportText: draft.reportText.trim(), highlights: draft.highlights.split("\n").map((s) => s.trim()).filter(Boolean), workloadRating: (draft.workloadRating || 3) as WorkloadRating, productivityRating: (draft.productivityRating || 3) as ProductivityRating, calendarScreenshotUrl: draft.calendarScreenshotUrl.trim() || undefined }); };
  const handleSubmit = () => { if (!draft.reportText.trim() || draft.workloadRating === 0 || draft.productivityRating === 0) { setValidationError("Please select your workload and productivity ratings before submitting."); return; } setValidationError(""); const id = state.upsertWeeklyStaffReport({ employeeId: myEmployee.id, weekStartDate: selectedWeek, status: "Draft", reportText: draft.reportText.trim(), highlights: draft.highlights.split("\n").map((s) => s.trim()).filter(Boolean), workloadRating: draft.workloadRating as WorkloadRating, productivityRating: draft.productivityRating as ProductivityRating, calendarScreenshotUrl: draft.calendarScreenshotUrl.trim() || undefined }); state.submitWeeklyStaffReport(id); };
  const pastWeeks = Array.from({ length: 8 }, (_, i) => shiftWeek(weekStartMonday(new Date()), -(i + 1)));
  const canSubmit = draft.reportText.trim() && draft.workloadRating > 0 && draft.productivityRating > 0;

  return (
    <div className="space-y-6">
      <WeekNav week={selectedWeek} onPrev={() => setSelectedWeek((w) => shiftWeek(w, -1))} onNext={() => setSelectedWeek((w) => shiftWeek(w, 1))} />
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-gray-800">Week of {formatWeekLabel(selectedWeek)}</h3><StatusPill status={isSubmitted ? "Submitted" : currentReport ? "Draft" : "missing"} /></div>
        <div className="space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-gray-500">How was your week?</label><textarea rows={5} className={inputCls} placeholder="Describe your week..." value={draft.reportText} onChange={(e) => setDraft((d) => ({ ...d, reportText: e.target.value }))} disabled={isSubmitted} /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Key highlights (one per line)</label><textarea rows={3} className={inputCls} placeholder={"e.g. Closed deal with Acme Corp\nFinished API integration"} value={draft.highlights} onChange={(e) => setDraft((d) => ({ ...d, highlights: e.target.value }))} disabled={isSubmitted} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Workload</label><select className={`${inputCls} ${!isSubmitted && draft.workloadRating === 0 ? "border-amber-400" : ""}`} value={draft.workloadRating} onChange={(e) => setDraft((d) => ({ ...d, workloadRating: Number(e.target.value) as WorkloadRating }))} disabled={isSubmitted}><option value={0}>— Select —</option>{WORKLOAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value} – {o.label}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Productivity</label><select className={`${inputCls} ${!isSubmitted && draft.productivityRating === 0 ? "border-amber-400" : ""}`} value={draft.productivityRating} onChange={(e) => setDraft((d) => ({ ...d, productivityRating: Number(e.target.value) as ProductivityRating }))} disabled={isSubmitted}><option value={0}>— Select —</option>{PRODUCTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value} – {o.label}</option>)}</select></div>
          </div>
          {!isSubmitted && <div><label className="mb-1 block text-xs font-medium text-gray-500">Calendar link (optional)</label><input className={inputCls} placeholder="Paste a URL..." value={draft.calendarScreenshotUrl} onChange={(e) => setDraft((d) => ({ ...d, calendarScreenshotUrl: e.target.value }))} /></div>}
          {validationError && <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{validationError}</div>}
          {!isSubmitted && <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 mt-3"><button onClick={handleSaveDraft} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Save Draft</button><button onClick={handleSubmit} disabled={!canSubmit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Submit Report</button></div>}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm"><div className="px-4 py-3 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-800">Past Reports</h3></div><table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Week</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Status</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Workload</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Productivity</th><th className="w-16" /></tr></thead><tbody>{pastWeeks.flatMap((week) => { const report = state.weeklyStaffReports.find((r) => r.employeeId === myEmployee.id && r.weekStartDate === week); const expanded = expandedPastWeek === week; const rows = [<tr key={week} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => report && setExpandedPastWeek(expanded ? null : week)}><td className="px-3 py-2 text-sm text-gray-700">{formatWeekLabel(week)}</td><td className="px-3 py-2"><StatusPill status={report?.status === "Submitted" ? "Submitted" : report ? "Draft" : "missing"} /></td><td className="px-3 py-2 text-xs text-gray-600">{report ? WORKLOAD_LABELS[report.workloadRating] ?? "–" : "–"}</td><td className="px-3 py-2 text-xs text-gray-600">{report ? PRODUCTIVITY_LABELS[report.productivityRating] ?? "–" : "–"}</td><td className="px-3 py-2">{report && <button onClick={(e) => { e.stopPropagation(); setExpandedPastWeek(expanded ? null : week); }} className={`text-xs font-medium ${expanded ? "text-gray-400 hover:text-gray-600" : "text-indigo-600 hover:text-indigo-700"}`}>{expanded ? "Hide" : "Expand"}</button>}</td></tr>]; if (expanded && report) { rows.push(<tr key={`${week}-detail`}><td colSpan={5} className="px-4 py-3 bg-gray-50/60 border-b border-gray-100"><div className="space-y-2"><p className="text-sm text-gray-700 whitespace-pre-line">{report.reportText}</p>{report.highlights.length > 0 && <div className="flex flex-wrap gap-1">{report.highlights.map((h, i) => <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{h}</span>)}</div>}<div className="flex gap-4 text-[11px] text-gray-500"><span>Workload: <strong className="text-gray-700">{WORKLOAD_LABELS[report.workloadRating]}</strong></span><span>Productivity: <strong className="text-gray-700">{PRODUCTIVITY_LABELS[report.productivityRating]}</strong></span></div></div></td></tr>); } return rows; })}</tbody></table></div>
    </div>
  );
}

/* ═══ TAB 2 — Team View (compact table) ═══ */
function TeamViewTab({ myEmployee }: { myEmployee: HrEmployee | null }) {
  const state = useAppStore();
  const [teamWeek, setTeamWeek] = useState(() => weekStartMonday(new Date()));
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [noteOpenFor, setNoteOpenFor] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const directReports = useMemo(() => { if (!myEmployee) return []; const real = state.hrEmployees.filter((e) => e.managerId === myEmployee.id && e.active); if (real.length > 0) return real; return state.hrEmployees.filter((e) => e.active && e.id !== myEmployee.id).slice(0, 5); }, [myEmployee, state.hrEmployees]);
  const deptMap = useMemo(() => { const m = new Map<string, string>(); state.hrDepartments.forEach((d) => m.set(d.id, d.name)); return m; }, [state.hrDepartments]);
  const teamSummary = useMemo(() => myEmployee ? (state.weeklyReportAiSummaries.filter((s) => s.scope === "team" && s.scopeId === myEmployee.id && s.weekStartDate === teamWeek).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null) : null, [state.weeklyReportAiSummaries, myEmployee, teamWeek]);

  if (!myEmployee) return <p className="text-sm text-gray-500 py-8 text-center">No HR employee records found.</p>;

  const submittedCount = directReports.filter((emp) => state.weeklyStaffReports.find((r) => r.employeeId === emp.id && r.weekStartDate === teamWeek && r.status === "Submitted")).length;
  const missingCount = directReports.length - submittedCount;

  return (
    <div className="space-y-6">
      <WeekNav week={teamWeek} onPrev={() => setTeamWeek((w) => shiftWeek(w, -1))} onNext={() => setTeamWeek((w) => shiftWeek(w, 1))} />

      <div className="grid gap-4 sm:grid-cols-3">
        <UiKpiCard label="Total in Team" value={directReports.length} />
        <UiKpiCard label="Submitted" value={submittedCount} className="border-emerald-200 bg-emerald-50/40" />
        <UiKpiCard label="Missing" value={missingCount} className={missingCount > 0 ? "border-rose-200 bg-rose-50/40" : ""} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200"><tr>
            <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Employee</th>
            <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Department</th>
            <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Workload</th>
            <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Productivity</th>
            <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
            <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Last Submitted</th>
            <th className="w-24" />
          </tr></thead>
          <tbody>
            {directReports.flatMap((emp) => {
              const empReport = state.weeklyStaffReports.find((r) => r.employeeId === emp.id && r.weekStartDate === teamWeek) ?? null;
              const noteCount = empReport ? state.weeklyReportManagerComments.filter((c) => c.reportId === empReport.id).length : 0;
              const lastSubmitted = state.weeklyStaffReports.filter((r) => r.employeeId === emp.id && r.status === "Submitted").sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0];
              const ini = (emp.displayName || `${emp.firstName} ${emp.lastName}`).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const commentText = commentDrafts[emp.id] ?? "";
              const isNoteOpen = noteOpenFor === emp.id;

              const rows = [
                <tr key={emp.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">{ini}</div>
                      <button onClick={() => setSelectedEmployeeId(emp.id)} className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition">{emp.displayName || `${emp.firstName} ${emp.lastName}`}</button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{deptMap.get(emp.departmentId) ?? "–"}</td>
                  <td className="px-3 py-2 text-xs">{empReport ? <span className={wlColor(empReport.workloadRating)}>{WORKLOAD_LABELS[empReport.workloadRating]}</span> : <span className="text-gray-400">–</span>}</td>
                  <td className="px-3 py-2 text-xs">{empReport ? <span className={prColor(empReport.productivityRating)}>{PRODUCTIVITY_LABELS[empReport.productivityRating]}</span> : <span className="text-gray-400">–</span>}</td>
                  <td className="px-3 py-2"><StatusPill status={empReport?.status === "Submitted" ? "Submitted" : empReport ? "Draft" : "missing"} /></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{lastSubmitted?.submittedAt ? new Date(lastSubmitted.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "–"}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setNoteOpenFor(isNoteOpen ? null : emp.id)} className={`text-xs font-medium ${isNoteOpen ? "text-gray-400 hover:text-gray-600" : "text-indigo-600 hover:text-indigo-700"}`}>{isNoteOpen ? "Close" : `Add Note${noteCount > 0 ? ` (${noteCount})` : ""}`}</button>
                  </td>
                </tr>
              ];

              if (isNoteOpen) {
                rows.push(
                  <tr key={`${emp.id}-note`}>
                    <td colSpan={7} className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                      <div className="flex items-end gap-2">
                        <textarea rows={2} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 resize-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder={`Leave a note for ${emp.displayName || `${emp.firstName} ${emp.lastName}`}...`} value={commentText} onChange={(e) => setCommentDrafts((p) => ({ ...p, [emp.id]: e.target.value }))} />
                        <div className="flex flex-col gap-1.5">
                          <button disabled={!commentText.trim() || !empReport} onClick={() => { if (!empReport) return; state.addWeeklyReportManagerComment({ reportId: empReport.id, managerUserId: state.activeUserId, commentText: commentText.trim(), aiGenerated: false }); setCommentDrafts((p) => ({ ...p, [emp.id]: "" })); }} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Post</button>
                          {empReport && <button onClick={() => { state.generateWeeklyReportAiSummary("individual", emp.id, teamWeek); const summaries = useAppStore.getState().weeklyReportAiSummaries; const summary = summaries.filter((s) => s.scope === "individual" && s.scopeId === emp.id && s.weekStartDate === teamWeek).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]; if (summary && empReport) { state.addWeeklyReportManagerComment({ reportId: empReport.id, managerUserId: state.activeUserId, commentText: [summary.overallVerdict, summary.workloadAssessment, summary.productivityAssessment, ...(summary.flags.length > 0 ? ["Flags: " + summary.flags.join("; ")] : [])].join("\n"), aiGenerated: true }); } }} className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition">AI</button>}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }

              return rows;
            })}
          </tbody>
        </table>
      </div>

      {/* Team summary */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-800">Team Summary</h3><button onClick={() => state.generateWeeklyReportAiSummary("team", myEmployee.id, teamWeek)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"><Sparkles className="h-3.5 w-3.5" /> Generate</button></div>
        {teamSummary ? (<div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm space-y-1"><p className="font-semibold text-gray-800">{teamSummary.overallVerdict}</p><p className="text-xs text-gray-600">{teamSummary.workloadAssessment}</p><p className="text-xs text-gray-600">{teamSummary.productivityAssessment}</p>{teamSummary.flags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{teamSummary.flags.map((f, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{f}</span>)}</div>}<p className="text-[10px] text-gray-400 mt-1">Based on {submittedCount} of {directReports.length} submitted reports.</p></div>) : <p className="text-xs text-gray-400">No team summary generated yet.</p>}
      </div>

      {selectedEmployeeId && <EmployeeProfileDrawer employeeId={selectedEmployeeId} onClose={() => setSelectedEmployeeId(null)} />}
    </div>
  );
}

/* ═══ TAB 3 — Management ═══ */
function ManagementTab() {
  const state = useAppStore();
  const [mgmtView, setMgmtView] = useState<"weekly" | "monthly">("weekly");
  const [mgmtWeek, setMgmtWeek] = useState(() => weekStartMonday(new Date()));
  const [mgmtMonth, setMgmtMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "draft" | "missing">("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [aiInput, setAiInput] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const deptMap = useMemo(() => { const m = new Map<string, string>(); state.hrDepartments.forEach((d) => m.set(d.id, d.name)); return m; }, [state.hrDepartments]);
  const activeEmployees = useMemo(() => state.hrEmployees.filter((e) => e.active), [state.hrEmployees]);
  const reportsThisWeek = useMemo(() => state.weeklyStaffReports.filter((r) => r.weekStartDate === mgmtWeek), [state.weeklyStaffReports, mgmtWeek]);
  const submittedThisWeek = useMemo(() => reportsThisWeek.filter((r) => r.status === "Submitted"), [reportsThisWeek]);
  const avgWorkload = submittedThisWeek.length > 0 ? (submittedThisWeek.reduce((s, r) => s + r.workloadRating, 0) / submittedThisWeek.length).toFixed(1) : "–";
  const avgProductivity = submittedThisWeek.length > 0 ? (submittedThisWeek.reduce((s, r) => s + r.productivityRating, 0) / submittedThisWeek.length).toFixed(1) : "–";
  const burnoutCount = submittedThisWeek.filter((r) => r.workloadRating === 5).length;
  const missingCount = activeEmployees.filter((emp) => !reportsThisWeek.find((r) => r.employeeId === emp.id && r.status === "Submitted")).length;
  const deptBreakdown = useMemo(() => state.hrDepartments.map((dept) => { const deptEmps = activeEmployees.filter((e) => e.departmentId === dept.id); const deptReports = submittedThisWeek.filter((r) => deptEmps.find((e) => e.id === r.employeeId)); const avgWl = deptReports.length > 0 ? (deptReports.reduce((s, r) => s + r.workloadRating, 0) / deptReports.length).toFixed(1) : "–"; const avgPr = deptReports.length > 0 ? (deptReports.reduce((s, r) => s + r.productivityRating, 0) / deptReports.length).toFixed(1) : "–"; const subPct = deptEmps.length > 0 ? Math.round((deptReports.length / deptEmps.length) * 100) : 0; return { id: dept.id, name: dept.name, headcount: deptEmps.length, submitted: deptReports.length, subPct, avgWl, avgPr, flags: deptReports.filter((r) => r.workloadRating === 5).length }; }).filter((d) => d.headcount > 0), [state.hrDepartments, activeEmployees, submittedThisWeek]);
  const filteredEmployees = useMemo(() => { let list = activeEmployees; if (deptFilter) list = list.filter((e) => e.departmentId === deptFilter); if (statusFilter !== "all") { list = list.filter((emp) => { const r = reportsThisWeek.find((rr) => rr.employeeId === emp.id); if (statusFilter === "submitted") return r?.status === "Submitted"; if (statusFilter === "draft") return r && r.status !== "Submitted"; return !r || r.status !== "Submitted"; }); } return list; }, [activeEmployees, deptFilter, statusFilter, reportsThisWeek]);
  const companySummary = useMemo(() => state.weeklyReportAiSummaries.filter((s) => s.scope === "company" && s.weekStartDate === mgmtWeek).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null, [state.weeklyReportAiSummaries, mgmtWeek]);
  const [mgmtYear, mgmtMonthNum] = mgmtMonth.split("-").map(Number);
  const monthWeeks = useMemo(() => getWeeksInMonth(mgmtYear, mgmtMonthNum), [mgmtYear, mgmtMonthNum]);
  const monthReports = useMemo(() => state.weeklyStaffReports.filter((r) => monthWeeks.includes(r.weekStartDate)), [state.weeklyStaffReports, monthWeeks]);
  const monthSubmitted = useMemo(() => monthReports.filter((r) => r.status === "Submitted"), [monthReports]);
  const monthTotalSlots = activeEmployees.length * monthWeeks.length;
  const monthSubmissionRate = monthTotalSlots > 0 ? ((monthSubmitted.length / monthTotalSlots) * 100).toFixed(0) : "0";
  const monthAvgWl = monthSubmitted.length > 0 ? (monthSubmitted.reduce((s, r) => s + r.workloadRating, 0) / monthSubmitted.length).toFixed(1) : "–";
  const monthAvgPr = monthSubmitted.length > 0 ? (monthSubmitted.reduce((s, r) => s + r.productivityRating, 0) / monthSubmitted.length).toFixed(1) : "–";
  const monthlySummary = useMemo(() => state.weeklyReportAiSummaries.filter((s) => s.scope === "company" && s.monthKey === mgmtMonth).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null, [state.weeklyReportAiSummaries, mgmtMonth]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 w-fit">
        {(["weekly", "monthly"] as const).map((v) => <button key={v} onClick={() => setMgmtView(v)} className={`rounded px-3 py-1.5 text-xs font-medium transition ${mgmtView === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{v === "weekly" ? "Weekly" : "Monthly"}</button>)}
      </div>
      {mgmtView === "weekly" ? <WeekNav week={mgmtWeek} onPrev={() => setMgmtWeek((w) => shiftWeek(w, -1))} onNext={() => setMgmtWeek((w) => shiftWeek(w, 1))} /> : <div className="flex items-center gap-2"><button onClick={() => setMgmtMonth((m) => shiftMonth(m, -1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"><ChevronLeft className="h-4 w-4" /></button><span className="text-sm font-medium text-gray-700">{formatMonthLabel(mgmtMonth)}</span><button onClick={() => setMgmtMonth((m) => shiftMonth(m, 1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"><ChevronRight className="h-4 w-4" /></button></div>}

      {mgmtView === "weekly" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <UiKpiCard label="Total Employees" value={activeEmployees.length} /><UiKpiCard label="Submitted" value={submittedThisWeek.length} className="border-emerald-200 bg-emerald-50/40" /><UiKpiCard label="Missing" value={missingCount} className={missingCount > 0 ? "border-rose-200 bg-rose-50/40" : ""} /><UiKpiCard label="Avg Workload" value={avgWorkload} /><UiKpiCard label="Avg Productivity" value={avgProductivity} /><UiKpiCard label="Burnout Flags" value={burnoutCount} className={burnoutCount > 0 ? "border-rose-200 bg-rose-50/40" : ""} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3"><h3 className="text-sm font-semibold text-gray-800">Department Breakdown</h3></div>
            <table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Department</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Headcount</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Submission %</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Avg Workload</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Avg Productivity</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Flags</th><th className="w-8" /></tr></thead>
              <tbody>{deptBreakdown.map((d) => (<tr key={d.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => { setDeptFilter(d.id); setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }}><td className="px-3 py-2 text-sm font-medium text-indigo-600 cursor-pointer">{d.name}</td><td className="px-3 py-2 text-sm text-gray-600">{d.headcount}</td><td className="px-3 py-2 text-sm text-gray-600">{d.submitted} / {d.headcount} <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{d.subPct}%</span></td><td className="px-4 py-2.5 text-sm text-gray-600">{d.avgWl}</td><td className="px-4 py-2.5 text-sm text-gray-600">{d.avgPr}</td><td className="px-4 py-2.5">{d.flags > 0 ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">{d.flags}</span> : <span className="text-gray-400">–</span>}</td><td className="px-4 py-2.5 text-gray-400">→</td></tr>))}{deptBreakdown.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">No departments.</td></tr>}</tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <select className={`w-48 ${inputCls}`} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}><option value="">All departments</option>{state.hrDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <select className={`w-40 ${inputCls}`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="draft">Draft</option><option value="missing">Not started</option></select>
            {deptFilter && <button onClick={() => setDeptFilter("")} className="text-xs text-indigo-600 hover:underline">Clear dept filter</button>}
          </div>

          <div ref={tableRef} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3"><h3 className="text-sm font-semibold text-gray-800">Individual Reports</h3></div>
            <table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Employee</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Department</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Workload</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Productivity</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Status</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Last Submit</th><th className="w-20" /></tr></thead>
              <tbody>
                {filteredEmployees.flatMap((emp) => { const empReport = reportsThisWeek.find((r) => r.employeeId === emp.id) ?? null; const expanded = expandedRows[emp.id] ?? false; const lastSubmitted = state.weeklyStaffReports.filter((r) => r.employeeId === emp.id && r.status === "Submitted").sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0]; const rows = [<tr key={emp.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors"><td className="px-4 py-2.5"><button onClick={() => setSelectedEmployeeId(emp.id)} className="text-sm font-medium text-indigo-600 hover:underline">{emp.displayName || `${emp.firstName} ${emp.lastName}`}</button></td><td className="px-4 py-2.5 text-sm text-gray-600">{deptMap.get(emp.departmentId) ?? "–"}</td><td className="px-4 py-2.5 text-xs">{empReport ? <span className={wlColor(empReport.workloadRating)}>{WORKLOAD_LABELS[empReport.workloadRating]}</span> : <span className="text-gray-400">–</span>}</td><td className="px-4 py-2.5 text-xs">{empReport ? <span className={prColor(empReport.productivityRating)}>{PRODUCTIVITY_LABELS[empReport.productivityRating]}</span> : <span className="text-gray-400">–</span>}</td><td className="px-4 py-2.5"><StatusPill status={empReport?.status === "Submitted" ? "Submitted" : empReport ? "Draft" : "missing"} /></td><td className="px-4 py-2.5 text-xs text-gray-500">{lastSubmitted?.submittedAt ? new Date(lastSubmitted.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "–"}</td><td className="px-4 py-2.5">{empReport && <button onClick={() => setExpandedRows((p) => ({ ...p, [emp.id]: !p[emp.id] }))} className="text-xs font-medium text-indigo-600 hover:underline">{expanded ? "Hide" : "View"}</button>}</td></tr>]; if (expanded && empReport) { rows.push(<tr key={`${emp.id}-detail`} className="bg-gray-50/50"><td colSpan={7} className="px-4 pb-3"><div className="rounded-lg border border-gray-200 bg-white p-4 text-xs space-y-2"><p className="text-gray-700 whitespace-pre-line">{empReport.reportText}</p>{empReport.highlights.length > 0 && <div className="flex flex-wrap gap-1">{empReport.highlights.map((h, i) => <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{h}</span>)}</div>}</div></td></tr>); } return rows; })}
                {filteredEmployees.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">No employees match the current filters.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3"><h3 className="text-sm font-semibold text-gray-800">Company AI Summary</h3><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Weekly</span></div>
            {companySummary && (<div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm space-y-1 mb-4"><div className="flex items-center gap-1.5 mb-1"><Sparkles className="h-3.5 w-3.5 text-violet-600" /><span className="text-xs font-medium text-violet-700">AI Summary</span></div><p className="font-semibold text-gray-800">{companySummary.overallVerdict}</p><p className="text-xs text-gray-600">{companySummary.workloadAssessment}</p><p className="text-xs text-gray-600">{companySummary.productivityAssessment}</p>{companySummary.flags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{companySummary.flags.map((f, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{f}</span>)}</div>}<p className="text-[10px] text-gray-400 mt-2">Generated {timeAgo(companySummary.generatedAt)}</p></div>)}
            <div className="flex flex-wrap gap-1.5 mb-3">{AI_PROMPTS.map((p) => <button key={p} onClick={() => setAiInput(p)} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition">{p}</button>)}</div>
            <div className="flex gap-2"><input className={`flex-1 ${inputCls}`} placeholder="Ask AI about this week's reports..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} /><button onClick={() => { state.generateWeeklyReportAiSummary("company", "all", mgmtWeek); setAiInput(""); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"><Send className="h-4 w-4" /></button></div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><UiKpiCard label="Submitted (month)" value={monthSubmitted.length} className="border-emerald-200 bg-emerald-50/40" /><UiKpiCard label="Submission Rate" value={`${monthSubmissionRate}%`} /><UiKpiCard label="Avg Workload" value={monthAvgWl} /><UiKpiCard label="Avg Productivity" value={monthAvgPr} /></div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"><div className="border-b border-gray-100 px-5 py-3"><h3 className="text-sm font-semibold text-gray-800">Monthly Overview</h3></div><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="border-b border-gray-200"><th className="sticky left-0 z-10 w-40 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-500">Employee</th>{monthWeeks.map((ws) => <th key={ws} className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">{formatWeekLabel(ws)}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{activeEmployees.map((emp) => (<tr key={emp.id} className="hover:bg-gray-50/30"><td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap">{emp.displayName || `${emp.firstName} ${emp.lastName}`}</td>{monthWeeks.map((ws) => { const r = monthReports.find((rr) => rr.employeeId === emp.id && rr.weekStartDate === ws); let dotCls = "bg-rose-400"; if (r?.status === "Submitted") { dotCls = r.productivityRating >= 4 ? "bg-emerald-500" : r.productivityRating <= 2 ? "bg-amber-400" : "bg-blue-400"; } else if (r) dotCls = "bg-gray-300"; return <td key={ws} className="px-2 py-1.5 text-center"><span className={`inline-block h-2.5 w-2.5 rounded-full ${dotCls}`} /></td>; })}</tr>))}</tbody></table></div>
          <div className="border-t border-gray-100 px-5 py-2 flex items-center gap-4 text-[10px] text-gray-500"><span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> High productivity</span><span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-400" /> Average</span><span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Below average</span><span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-rose-400" /> Missing</span></div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5"><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-800">Monthly Summary</h3><button onClick={() => state.generateWeeklyReportAiSummary("company", "all", undefined, mgmtMonth)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"><Sparkles className="h-3.5 w-3.5" /> Generate</button></div>{monthlySummary ? (<div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm space-y-1"><p className="font-semibold text-gray-800">{monthlySummary.overallVerdict}</p><p className="text-xs text-gray-600">{monthlySummary.workloadAssessment}</p><p className="text-xs text-gray-600">{monthlySummary.productivityAssessment}</p>{monthlySummary.flags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{monthlySummary.flags.map((f, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{f}</span>)}</div>}<p className="text-[10px] text-gray-400 mt-2">Generated {timeAgo(monthlySummary.generatedAt)}</p></div>) : <p className="text-xs text-gray-400">No monthly summary generated yet.</p>}</div>
        </>
      )}

      {selectedEmployeeId && <EmployeeProfileDrawer employeeId={selectedEmployeeId} onClose={() => setSelectedEmployeeId(null)} />}
    </div>
  );
}

/* ═══ EmployeeProfileDrawer ═══ */
function EmployeeProfileDrawer({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const state = useAppStore();
  const navigate = useNavigate();
  const [profileTab, setProfileTab] = useState<"tasks" | "reports">("tasks");
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  const emp = state.hrEmployees.find((e) => e.id === employeeId);
  if (!emp) return null;

  const PRIORITY_CLR: Record<string, string> = { Critical: "bg-rose-50 text-rose-700", High: "bg-orange-50 text-orange-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-gray-100 text-gray-500" };
  const last12Weeks = Array.from({ length: 12 }, (_, i) => shiftWeek(weekStartMonday(new Date()), -i)).reverse();
  const empReports = last12Weeks.map((w) => ({ week: w, report: state.weeklyStaffReports.find((r) => r.employeeId === employeeId && r.weekStartDate === w) ?? null }));
  const submittedReports = empReports.filter((r) => r.report?.status === "Submitted").map((r) => r.report!);
  const submissionRate = last12Weeks.length > 0 ? Math.round((submittedReports.length / last12Weeks.length) * 100) : 0;
  const avgWl = submittedReports.length > 0 ? (submittedReports.reduce((s, r) => s + r.workloadRating, 0) / submittedReports.length).toFixed(1) : "–";
  const avgPr = submittedReports.length > 0 ? (submittedReports.reduce((s, r) => s + r.productivityRating, 0) / submittedReports.length).toFixed(1) : "–";
  const empUser = state.users.find((u) => u.id === emp.systemUserId);
  const empTasks = empUser ? state.tasks.filter((t) => t.assigneeUserId === empUser.id && t.status !== "Cancelled") : [];
  const openTasks = empTasks.filter((t) => t.status !== "Done" && !t.completedAt);
  const completedTasks = empTasks.filter((t) => t.status === "Done");
  const overdueTasks = openTasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());
  const deptMap = new Map(state.hrDepartments.map((d) => [d.id, d.name]));
  const initials = (emp.displayName || `${emp.firstName} ${emp.lastName}`).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">{initials}</div>
              <div><h2 className="text-base font-semibold text-gray-900">{emp.displayName || `${emp.firstName} ${emp.lastName}`}</h2><p className="text-xs text-gray-500">{deptMap.get(emp.departmentId) ?? ""}{emp.position ? ` · ${emp.position}` : ""}</p></div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex items-center gap-0 border-b border-gray-100 px-6 pt-3 pb-0">
            <button onClick={() => setProfileTab("tasks")} className={`pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors ${profileTab === "tasks" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Active Tasks</button>
            <button onClick={() => setProfileTab("reports")} className={`ml-4 pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors ${profileTab === "reports" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Report History</button>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center"><p className="text-xs text-gray-500 mb-1">Submit Rate</p><p className="text-lg font-bold text-gray-900">{submissionRate}%</p><p className="text-[10px] text-gray-400">12 weeks</p></div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center"><p className="text-xs text-gray-500 mb-1">Avg Workload</p><p className={`text-lg font-bold ${avgWl !== "–" ? wlColor(parseFloat(avgWl)) : "text-gray-400"}`}>{avgWl}</p></div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center"><p className="text-xs text-gray-500 mb-1">Avg Productivity</p><p className={`text-lg font-bold ${avgPr !== "–" ? prColor(parseFloat(avgPr)) : "text-gray-400"}`}>{avgPr}</p></div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center"><p className="text-xs text-gray-500 mb-1">Open Tasks</p><p className="text-lg font-bold text-gray-900">{openTasks.length}</p>{overdueTasks.length > 0 && <p className="text-[10px] text-rose-600">{overdueTasks.length} overdue</p>}</div>
          </div>
        </div>
        <div className="px-6 pb-5">
          {profileTab === "tasks" && (
            <div>
              {!empUser ? <p className="text-xs text-gray-400 py-6 text-center">No system user linked to this employee.</p> : openTasks.length === 0 ? <p className="text-xs text-gray-400 py-6 text-center">No open tasks.</p> : (
                <div className="space-y-1.5">
                  {openTasks.slice(0, 15).map((task) => {
                    const isOd = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "Done" && task.status !== "Cancelled";
                    return (
                      <div key={task.id} onClick={() => { onClose(); navigate(`/tasks?taskId=${task.id}`); }} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-200 transition group">
                        <div className="flex items-center gap-2 min-w-0">{isOd && <span className="text-rose-500 flex-shrink-0">⚠</span>}<span className={`text-sm font-medium truncate ${isOd ? "text-rose-700" : "text-gray-800"}`}>{task.title}</span></div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_CLR[task.priority] ?? "bg-gray-100 text-gray-500"}`}>{task.priority}</span><span className="text-xs text-gray-500">{task.status === "InProgress" ? "In Progress" : task.status === "ToDo" ? "To Do" : task.status}</span><ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-400 transition" /></div>
                      </div>
                    );
                  })}
                  {openTasks.length > 15 && <p className="text-[10px] text-gray-400 text-center mt-1">+{openTasks.length - 15} more tasks</p>}
                </div>
              )}
              <p className="mt-3 text-[11px] text-gray-400">✓ {completedTasks.length} completed{overdueTasks.length > 0 && <span className="text-rose-500 ml-2">⚠ {overdueTasks.length} overdue</span>}</p>
            </div>
          )}
          {profileTab === "reports" && (
            <div className="space-y-2">
              {[...empReports].reverse().map(({ week, report }) => (
                <div key={week} className="rounded-lg border border-gray-100 overflow-hidden">
                  <button onClick={() => setExpandedWeek(expandedWeek === week ? null : week)} className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-indigo-50/40 transition text-left">
                    <span className="text-xs font-medium text-gray-700">{formatWeekLabel(week)}</span>
                    <div className="flex items-center gap-3">
                      {report && <><span className={`text-[11px] font-medium ${wlColor(report.workloadRating)}`}>WL: {WORKLOAD_LABELS[report.workloadRating]}</span><span className={`text-[11px] font-medium ${prColor(report.productivityRating)}`}>PR: {PRODUCTIVITY_LABELS[report.productivityRating]}</span></>}
                      <StatusPill status={report?.status === "Submitted" ? "Submitted" : report ? "Draft" : "missing"} />
                      <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expandedWeek === week ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {expandedWeek === week && report && (
                    <div className="px-4 py-3 border-t border-gray-100 space-y-3 bg-white">
                      <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Weekly Report</p><p className="text-sm text-gray-700 whitespace-pre-line">{report.reportText}</p></div>
                      {report.highlights.length > 0 && <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Highlights</p><div className="flex flex-wrap gap-1">{report.highlights.map((h, i) => <span key={i} className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[11px] text-indigo-700">{h}</span>)}</div></div>}
                      <div className="flex items-center gap-6"><div><p className="text-[10px] text-gray-400 mb-0.5">Workload</p><p className={`text-sm font-semibold ${wlColor(report.workloadRating)}`}>{report.workloadRating} – {WORKLOAD_LABELS[report.workloadRating]}</p></div><div><p className="text-[10px] text-gray-400 mb-0.5">Productivity</p><p className={`text-sm font-semibold ${prColor(report.productivityRating)}`}>{report.productivityRating} – {PRODUCTIVITY_LABELS[report.productivityRating]}</p></div></div>
                      {(() => { const comments = state.weeklyReportManagerComments.filter((c) => c.reportId === report.id); if (comments.length === 0) return <p className="text-[11px] text-gray-400 italic">No manager comments for this week.</p>; return (<div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Manager Notes</p><div className="space-y-2">{comments.map((c) => (<div key={c.id} className={`rounded-lg px-3 py-2 text-xs border-l-2 ${c.aiGenerated ? "bg-violet-50 border-l-violet-400" : "bg-gray-50 border-l-gray-300"}`}><div className="flex items-center gap-2 mb-1"><span className="font-semibold text-gray-700">{getUserName(state, c.managerUserId)}</span>{c.aiGenerated && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-medium text-violet-700">✨ AI</span>}<span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></div><p className="text-gray-600 whitespace-pre-line">{c.commentText}</p></div>))}</div></div>); })()}
                      {report.submittedAt && <p className="text-[10px] text-gray-400">Submitted {new Date(report.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                    </div>
                  )}
                  {expandedWeek === week && !report && <div className="px-4 py-3 border-t border-gray-100 bg-white"><p className="text-xs text-gray-400 italic">No report submitted for this week.</p></div>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl flex justify-end"><button onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Close</button></div>
      </div>
    </div>
  );
}
