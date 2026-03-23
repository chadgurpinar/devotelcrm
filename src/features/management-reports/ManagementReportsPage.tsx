import { useEffect, useMemo, useState } from "react";
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
  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrev} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"><ChevronLeft className="h-4 w-4" /></button>
      <span className="text-sm font-medium text-gray-700">Week of {formatWeekLabel(week)}</span>
      <button onClick={onNext} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

function StatusPill({ status }: { status: "Submitted" | "Draft" | "missing" }) {
  if (status === "Submitted") return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">✓ Submitted</span>;
  if (status === "Draft") return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">Draft</span>;
  return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">Not started</span>;
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
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === t.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{t.label}</button>
        ))}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft(initDraft(currentReport)); setValidationError(""); }, [selectedWeek]);

  if (!myEmployee) return <p className="text-sm text-gray-500 py-8 text-center">No HR employee records found.</p>;

  const handleSaveDraft = () => { state.upsertWeeklyStaffReport({ employeeId: myEmployee.id, weekStartDate: selectedWeek, status: "Draft", reportText: draft.reportText.trim(), highlights: draft.highlights.split("\n").map((s) => s.trim()).filter(Boolean), workloadRating: (draft.workloadRating || 3) as WorkloadRating, productivityRating: (draft.productivityRating || 3) as ProductivityRating, calendarScreenshotUrl: draft.calendarScreenshotUrl.trim() || undefined }); };
  const handleSubmit = () => {
    if (!draft.reportText.trim() || draft.workloadRating === 0 || draft.productivityRating === 0) { setValidationError("Please select your workload and productivity ratings before submitting."); return; }
    setValidationError("");
    const id = state.upsertWeeklyStaffReport({ employeeId: myEmployee.id, weekStartDate: selectedWeek, status: "Draft", reportText: draft.reportText.trim(), highlights: draft.highlights.split("\n").map((s) => s.trim()).filter(Boolean), workloadRating: draft.workloadRating as WorkloadRating, productivityRating: draft.productivityRating as ProductivityRating, calendarScreenshotUrl: draft.calendarScreenshotUrl.trim() || undefined });
    state.submitWeeklyStaffReport(id);
  };

  const pastWeeks = Array.from({ length: 8 }, (_, i) => shiftWeek(weekStartMonday(new Date()), -(i + 1)));
  const canSubmit = draft.reportText.trim() && draft.workloadRating > 0 && draft.productivityRating > 0;

  return (
    <div className="space-y-6">
      <WeekNav week={selectedWeek} onPrev={() => setSelectedWeek((w) => shiftWeek(w, -1))} onNext={() => setSelectedWeek((w) => shiftWeek(w, 1))} />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-indigo-600">Week of {formatWeekLabel(selectedWeek)}</h3>
          {isSubmitted ? <StatusPill status="Submitted" /> : currentReport ? <StatusPill status="Draft" /> : <StatusPill status="missing" />}
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">How was your week?</label>
            <textarea rows={5} className={inputCls} placeholder="Describe your week: key tasks, meetings, outcomes, challenges..." value={draft.reportText} onChange={(e) => setDraft((d) => ({ ...d, reportText: e.target.value }))} disabled={isSubmitted} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Key highlights (one per line)</label>
            <textarea rows={3} className={inputCls} placeholder={"e.g. Closed deal with Acme Corp\nFinished API integration"} value={draft.highlights} onChange={(e) => setDraft((d) => ({ ...d, highlights: e.target.value }))} disabled={isSubmitted} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Workload this week</label>
              <select className={`${inputCls} ${!isSubmitted && draft.workloadRating === 0 ? "border-amber-400" : ""}`} value={draft.workloadRating} onChange={(e) => setDraft((d) => ({ ...d, workloadRating: Number(e.target.value) as WorkloadRating }))} disabled={isSubmitted}>
                <option value={0}>— Select —</option>
                {WORKLOAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value} – {o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Productivity this week</label>
              <select className={`${inputCls} ${!isSubmitted && draft.productivityRating === 0 ? "border-amber-400" : ""}`} value={draft.productivityRating} onChange={(e) => setDraft((d) => ({ ...d, productivityRating: Number(e.target.value) as ProductivityRating }))} disabled={isSubmitted}>
                <option value={0}>— Select —</option>
                {PRODUCTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value} – {o.label}</option>)}
              </select>
            </div>
          </div>
          {!isSubmitted && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Calendar link (optional)</label>
              <input className={inputCls} placeholder="Paste a URL to your calendar screenshot or export" value={draft.calendarScreenshotUrl} onChange={(e) => setDraft((d) => ({ ...d, calendarScreenshotUrl: e.target.value }))} />
            </div>
          )}
          {validationError && <p className="text-xs text-rose-600">{validationError}</p>}
          {!isSubmitted && (
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleSaveDraft} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Save Draft</button>
              <button onClick={handleSubmit} disabled={!canSubmit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Submit Report</button>
            </div>
          )}
        </div>
      </div>

      {/* Past reports */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Past Reports</h3>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Week</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Workload</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Productivity</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {pastWeeks.map((week) => {
                const report = state.weeklyStaffReports.find((r) => r.employeeId === myEmployee.id && r.weekStartDate === week);
                return (
                  <tr key={week} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-gray-700">{formatWeekLabel(week)}</td>
                    <td className="px-4 py-2.5"><StatusPill status={report?.status === "Submitted" ? "Submitted" : report ? "Draft" : "missing"} /></td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{report ? WORKLOAD_LABELS[report.workloadRating] ?? "–" : "–"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{report ? PRODUCTIVITY_LABELS[report.productivityRating] ?? "–" : "–"}</td>
                    <td className="px-4 py-2.5"><button onClick={() => setSelectedWeek(week)} className="text-xs font-medium text-indigo-600 hover:underline">→ View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══ TAB 2 — Team View ═══ */

function TeamViewTab({ myEmployee }: { myEmployee: HrEmployee | null }) {
  const state = useAppStore();
  const [teamWeek, setTeamWeek] = useState(() => weekStartMonday(new Date()));
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  const directReports = useMemo(() => { if (!myEmployee) return []; const real = state.hrEmployees.filter((e) => e.managerId === myEmployee.id && e.active); if (real.length > 0) return real; return state.hrEmployees.filter((e) => e.active && e.id !== myEmployee.id).slice(0, 5); }, [myEmployee, state.hrEmployees]);
  const deptMap = useMemo(() => { const m = new Map<string, string>(); state.hrDepartments.forEach((d) => m.set(d.id, d.name)); return m; }, [state.hrDepartments]);
  const teamSummary = useMemo(() => myEmployee ? (state.weeklyReportAiSummaries.filter((s) => s.scope === "team" && s.scopeId === myEmployee.id && s.weekStartDate === teamWeek).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null) : null, [state.weeklyReportAiSummaries, myEmployee, teamWeek]);

  if (!myEmployee) return <p className="text-sm text-gray-500 py-8 text-center">No HR employee records found.</p>;

  const submittedCount = directReports.filter((emp) => state.weeklyStaffReports.find((r) => r.employeeId === emp.id && r.weekStartDate === teamWeek && r.status === "Submitted")).length;
  const missingCount = directReports.length - submittedCount;

  return (
    <div className="space-y-6">
      <WeekNav week={teamWeek} onPrev={() => setTeamWeek((w) => shiftWeek(w, -1))} onNext={() => setTeamWeek((w) => shiftWeek(w, 1))} />

      {/* KPI summary */}
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{directReports.length} reports</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{submittedCount} submitted</span>
        {missingCount > 0 && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">{missingCount} missing</span>}
      </div>

      {/* Employee cards */}
      {directReports.map((emp) => {
        const empReport = state.weeklyStaffReports.find((r) => r.employeeId === emp.id && r.weekStartDate === teamWeek) ?? null;
        const comments = empReport ? state.weeklyReportManagerComments.filter((c) => c.reportId === empReport.id) : [];
        const expanded = expandedReports[emp.id] ?? false;
        const commentText = commentDrafts[emp.id] ?? "";
        const initials = (emp.displayName || `${emp.firstName} ${emp.lastName}`).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

        return (
          <div key={emp.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">{initials}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{emp.displayName || `${emp.firstName} ${emp.lastName}`}</p>
                  <p className="text-xs text-gray-500">{deptMap.get(emp.departmentId) ?? ""}{emp.position ? ` · ${emp.position}` : ""}</p>
                </div>
              </div>
              <StatusPill status={empReport?.status === "Submitted" ? "Submitted" : empReport ? "Draft" : "missing"} />
            </div>

            {!empReport ? (
              <p className="text-xs text-gray-400">No report submitted for this week.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs">Workload: <span className={`font-medium ${wlColor(empReport.workloadRating)}`}>{WORKLOAD_LABELS[empReport.workloadRating]}</span></span>
                  <span className="text-xs">Productivity: <span className={`font-medium ${prColor(empReport.productivityRating)}`}>{PRODUCTIVITY_LABELS[empReport.productivityRating]}</span></span>
                </div>
                <p className="text-xs text-gray-600">{expanded || empReport.reportText.length <= 150 ? empReport.reportText : empReport.reportText.slice(0, 150) + "\u2026"}</p>
                {empReport.reportText.length > 150 && <button className="text-xs font-medium text-indigo-600 hover:underline" onClick={() => setExpandedReports((p) => ({ ...p, [emp.id]: !p[emp.id] }))}>{expanded ? "Show less" : "Show full report"}</button>}
                {empReport.highlights.length > 0 && <div className="flex flex-wrap gap-1">{empReport.highlights.map((h, i) => <span key={i} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-600">{h}</span>)}</div>}
              </div>
            )}

            {/* Comments */}
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium text-gray-500">Comments</p>
              {comments.length === 0 && <p className="mb-2 text-xs text-gray-400">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className={`mb-2 rounded-lg p-3 text-xs ${c.aiGenerated ? "bg-violet-50 border border-violet-100" : "bg-gray-50 border border-gray-100"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-700">{getUserName(state, c.managerUserId)}</span>
                    {c.aiGenerated && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">✨ AI</span>}
                    <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                  </div>
                  <p className="whitespace-pre-line text-gray-600">{c.commentText}</p>
                </div>
              ))}
              {empReport && (
                <div className="flex gap-2 mt-2">
                  <input className={`flex-1 ${inputCls}`} placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentDrafts((p) => ({ ...p, [emp.id]: e.target.value }))} />
                  <button disabled={!commentText.trim()} onClick={() => { state.addWeeklyReportManagerComment({ reportId: empReport.id, managerUserId: state.activeUserId, commentText: commentText.trim(), aiGenerated: false }); setCommentDrafts((p) => ({ ...p, [emp.id]: "" })); }} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Post</button>
                  <button onClick={() => { state.generateWeeklyReportAiSummary("individual", emp.id, teamWeek); const summaries = useAppStore.getState().weeklyReportAiSummaries; const summary = summaries.filter((s) => s.scope === "individual" && s.scopeId === emp.id && s.weekStartDate === teamWeek).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]; if (summary) { state.addWeeklyReportManagerComment({ reportId: empReport.id, managerUserId: state.activeUserId, commentText: [summary.overallVerdict, summary.workloadAssessment, summary.productivityAssessment, ...(summary.flags.length > 0 ? ["Flags: " + summary.flags.join("; ")] : [])].join("\n"), aiGenerated: true }); } }} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI</button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Team summary */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Team Summary</h3>
          <button onClick={() => state.generateWeeklyReportAiSummary("team", myEmployee.id, teamWeek)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"><Sparkles className="h-3.5 w-3.5" /> Generate</button>
        </div>
        {teamSummary ? (
          <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm space-y-1">
            <p className="font-semibold text-gray-800">{teamSummary.overallVerdict}</p>
            <p className="text-xs text-gray-600">{teamSummary.workloadAssessment}</p>
            <p className="text-xs text-gray-600">{teamSummary.productivityAssessment}</p>
            {teamSummary.flags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{teamSummary.flags.map((f, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{f}</span>)}</div>}
            <p className="text-[10px] text-gray-400 mt-2">Generated {new Date(teamSummary.generatedAt).toLocaleString()}</p>
          </div>
        ) : <p className="text-xs text-gray-400">No team summary generated yet.</p>}
      </div>
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
  const [employeeModal, setEmployeeModal] = useState<string | null>(null);

  const deptMap = useMemo(() => { const m = new Map<string, string>(); state.hrDepartments.forEach((d) => m.set(d.id, d.name)); return m; }, [state.hrDepartments]);
  const activeEmployees = useMemo(() => state.hrEmployees.filter((e) => e.active), [state.hrEmployees]);

  const reportsThisWeek = useMemo(() => state.weeklyStaffReports.filter((r) => r.weekStartDate === mgmtWeek), [state.weeklyStaffReports, mgmtWeek]);
  const submittedThisWeek = useMemo(() => reportsThisWeek.filter((r) => r.status === "Submitted"), [reportsThisWeek]);
  const avgWorkload = submittedThisWeek.length > 0 ? (submittedThisWeek.reduce((s, r) => s + r.workloadRating, 0) / submittedThisWeek.length).toFixed(1) : "–";
  const avgProductivity = submittedThisWeek.length > 0 ? (submittedThisWeek.reduce((s, r) => s + r.productivityRating, 0) / submittedThisWeek.length).toFixed(1) : "–";
  const burnoutCount = submittedThisWeek.filter((r) => r.workloadRating === 5).length;
  const missingCount = activeEmployees.filter((emp) => !reportsThisWeek.find((r) => r.employeeId === emp.id && r.status === "Submitted")).length;

  const deptBreakdown = useMemo(() => state.hrDepartments.map((dept) => { const deptEmps = activeEmployees.filter((e) => e.departmentId === dept.id); const deptReports = submittedThisWeek.filter((r) => deptEmps.find((e) => e.id === r.employeeId)); const avgWl = deptReports.length > 0 ? (deptReports.reduce((s, r) => s + r.workloadRating, 0) / deptReports.length).toFixed(1) : "–"; const avgPr = deptReports.length > 0 ? (deptReports.reduce((s, r) => s + r.productivityRating, 0) / deptReports.length).toFixed(1) : "–"; return { id: dept.id, name: dept.name, headcount: deptEmps.length, submitted: deptReports.length, avgWl, avgPr, flags: deptReports.filter((r) => r.workloadRating === 5).length }; }).filter((d) => d.headcount > 0), [state.hrDepartments, activeEmployees, submittedThisWeek]);

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

  const modalEmployee = employeeModal ? activeEmployees.find((e) => e.id === employeeModal) : null;
  const modalHistory = employeeModal ? Array.from({ length: 8 }, (_, i) => shiftWeek(weekStartMonday(new Date()), -i)).map((w) => { const r = state.weeklyStaffReports.find((rr) => rr.employeeId === employeeModal && rr.weekStartDate === w); return { week: w, report: r ?? null }; }) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["weekly", "monthly"] as const).map((v) => <button key={v} onClick={() => setMgmtView(v)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${mgmtView === v ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>{v === "weekly" ? "Weekly" : "Monthly"}</button>)}
      </div>

      {mgmtView === "weekly" ? (
        <WeekNav week={mgmtWeek} onPrev={() => setMgmtWeek((w) => shiftWeek(w, -1))} onNext={() => setMgmtWeek((w) => shiftWeek(w, 1))} />
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={() => setMgmtMonth((m) => shiftMonth(m, -1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-gray-700">{formatMonthLabel(mgmtMonth)}</span>
          <button onClick={() => setMgmtMonth((m) => shiftMonth(m, 1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {mgmtView === "weekly" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <UiKpiCard label="Total Employees" value={activeEmployees.length} />
            <UiKpiCard label="Submitted" value={submittedThisWeek.length} className="border-emerald-200 bg-emerald-50/40" />
            <UiKpiCard label="Missing" value={missingCount} className={missingCount > 0 ? "border-rose-200 bg-rose-50/40" : ""} />
            <UiKpiCard label="Avg Workload" value={avgWorkload} />
            <UiKpiCard label="Avg Productivity" value={avgProductivity} />
            <UiKpiCard label="Burnout Flags" value={burnoutCount} className={burnoutCount > 0 ? "border-rose-200 bg-rose-50/40" : ""} />
          </div>

          {/* Department breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3"><h3 className="text-sm font-semibold text-gray-800">Department Breakdown</h3></div>
            <table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Headcount</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Workload</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Productivity</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Flags</th></tr></thead>
              <tbody>{deptBreakdown.map((d) => (<tr key={d.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors"><td className="px-4 py-2.5 text-sm font-medium text-gray-700">{d.name}</td><td className="px-4 py-2.5 text-sm text-gray-600">{d.headcount}</td><td className="px-4 py-2.5 text-sm text-gray-600">{d.submitted}</td><td className="px-4 py-2.5 text-sm text-gray-600">{d.avgWl}</td><td className="px-4 py-2.5 text-sm text-gray-600">{d.avgPr}</td><td className="px-4 py-2.5">{d.flags > 0 ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">{d.flags}</span> : <span className="text-gray-400">–</span>}</td></tr>))}{deptBreakdown.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">No departments with active employees.</td></tr>}</tbody>
            </table>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select className={`w-48 ${inputCls}`} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}><option value="">All departments</option>{state.hrDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <select className={`w-40 ${inputCls}`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="draft">Draft</option><option value="missing">Not started</option></select>
          </div>

          {/* Individual reports */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3"><h3 className="text-sm font-semibold text-gray-800">Individual Reports</h3></div>
            <table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Workload</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Productivity</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th><th className="w-24" /></tr></thead>
              <tbody>
                {filteredEmployees.flatMap((emp) => {
                  const empReport = reportsThisWeek.find((r) => r.employeeId === emp.id) ?? null;
                  const expanded = expandedRows[emp.id] ?? false;
                  const rows = [
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-2.5"><button onClick={() => setEmployeeModal(emp.id)} className="text-sm font-medium text-indigo-600 hover:underline">{emp.displayName || `${emp.firstName} ${emp.lastName}`}</button></td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{deptMap.get(emp.departmentId) ?? "–"}</td>
                      <td className="px-4 py-2.5 text-xs">{empReport ? <span className={wlColor(empReport.workloadRating)}>{WORKLOAD_LABELS[empReport.workloadRating]}</span> : <span className="text-gray-400">–</span>}</td>
                      <td className="px-4 py-2.5 text-xs">{empReport ? <span className={prColor(empReport.productivityRating)}>{PRODUCTIVITY_LABELS[empReport.productivityRating]}</span> : <span className="text-gray-400">–</span>}</td>
                      <td className="px-4 py-2.5"><StatusPill status={empReport?.status === "Submitted" ? "Submitted" : empReport ? "Draft" : "missing"} /></td>
                      <td className="px-4 py-2.5">{empReport && <button onClick={() => setExpandedRows((p) => ({ ...p, [emp.id]: !p[emp.id] }))} className="text-xs font-medium text-indigo-600 hover:underline">{expanded ? "Hide" : "View"}</button>}</td>
                    </tr>,
                  ];
                  if (expanded && empReport) {
                    rows.push(
                      <tr key={`${emp.id}-detail`} className="bg-gray-50/50">
                        <td colSpan={6} className="px-4 pb-3">
                          <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs space-y-2">
                            <p className="text-gray-700 whitespace-pre-line">{empReport.reportText}</p>
                            {empReport.highlights.length > 0 && <div className="flex flex-wrap gap-1">{empReport.highlights.map((h, i) => <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{h}</span>)}</div>}
                          </div>
                        </td>
                      </tr>,
                    );
                  }
                  return rows;
                })}
                {filteredEmployees.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">No employees match the current filters.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Company AI summary — chat style */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Company AI Summary</h3>
            {companySummary && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm space-y-1 mb-4">
                <div className="flex items-center gap-1.5 mb-1"><Sparkles className="h-3.5 w-3.5 text-violet-600" /><span className="text-xs font-medium text-violet-700">AI Summary</span></div>
                <p className="font-semibold text-gray-800">{companySummary.overallVerdict}</p>
                <p className="text-xs text-gray-600">{companySummary.workloadAssessment}</p>
                <p className="text-xs text-gray-600">{companySummary.productivityAssessment}</p>
                {companySummary.flags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{companySummary.flags.map((f, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{f}</span>)}</div>}
                <p className="text-[10px] text-gray-400 mt-2">{new Date(companySummary.generatedAt).toLocaleString()}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">{AI_PROMPTS.map((p) => <button key={p} onClick={() => setAiInput(p)} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition">{p}</button>)}</div>
            <div className="flex gap-2">
              <input className={`flex-1 ${inputCls}`} placeholder="Ask AI about this week's reports..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} />
              <button onClick={() => { state.generateWeeklyReportAiSummary("company", "all", mgmtWeek); setAiInput(""); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UiKpiCard label="Submitted (month)" value={monthSubmitted.length} className="border-emerald-200 bg-emerald-50/40" />
            <UiKpiCard label="Submission Rate" value={`${monthSubmissionRate}%`} />
            <UiKpiCard label="Avg Workload" value={monthAvgWl} />
            <UiKpiCard label="Avg Productivity" value={monthAvgPr} />
          </div>

          {/* Monthly grid */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3"><h3 className="text-sm font-semibold text-gray-800">Monthly Overview</h3></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead><tr className="border-b border-gray-200"><th className="sticky left-0 z-10 w-40 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-500">Employee</th>{monthWeeks.map((ws) => <th key={ws} className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">{formatWeekLabel(ws)}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {activeEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50/30">
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap">{emp.displayName || `${emp.firstName} ${emp.lastName}`}</td>
                      {monthWeeks.map((ws) => {
                        const r = monthReports.find((rr) => rr.employeeId === emp.id && rr.weekStartDate === ws);
                        let dotCls = "bg-rose-400";
                        if (r?.status === "Submitted") { dotCls = r.productivityRating >= 4 ? "bg-emerald-500" : r.productivityRating <= 2 ? "bg-amber-400" : "bg-blue-400"; }
                        else if (r) dotCls = "bg-gray-300";
                        return <td key={ws} className="px-2 py-1.5 text-center"><span className={`inline-block h-2.5 w-2.5 rounded-full ${dotCls}`} title={r?.status === "Submitted" ? `P:${r.productivityRating}` : r ? "Draft" : "Missing"} /></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly summary */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Monthly Summary</h3>
              <button onClick={() => state.generateWeeklyReportAiSummary("company", "all", undefined, mgmtMonth)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"><Sparkles className="h-3.5 w-3.5" /> Generate</button>
            </div>
            {monthlySummary ? (
              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm space-y-1">
                <p className="font-semibold text-gray-800">{monthlySummary.overallVerdict}</p>
                <p className="text-xs text-gray-600">{monthlySummary.workloadAssessment}</p>
                <p className="text-xs text-gray-600">{monthlySummary.productivityAssessment}</p>
                {monthlySummary.flags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{monthlySummary.flags.map((f, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{f}</span>)}</div>}
                <p className="text-[10px] text-gray-400 mt-2">{new Date(monthlySummary.generatedAt).toLocaleString()}</p>
              </div>
            ) : <p className="text-xs text-gray-400">No monthly summary generated yet.</p>}
          </div>
        </>
      )}

      {/* Employee history modal */}
      {modalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setEmployeeModal(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900">{modalEmployee.displayName || `${modalEmployee.firstName} ${modalEmployee.lastName}`}</h2>
              <button onClick={() => setEmployeeModal(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs font-medium text-gray-500">Submission History (Last 8 Weeks)</p>
              <div className="space-y-1.5">
                {modalHistory.map(({ week, report }) => (
                  <div key={week} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="text-xs text-gray-700">{formatWeekLabel(week)}</span>
                    <div className="flex items-center gap-3">
                      {report ? <>
                        <span className={`text-[11px] ${wlColor(report.workloadRating)}`}>{WORKLOAD_LABELS[report.workloadRating]}</span>
                        <span className={`text-[11px] ${prColor(report.productivityRating)}`}>{PRODUCTIVITY_LABELS[report.productivityRating]}</span>
                      </> : null}
                      <StatusPill status={report?.status === "Submitted" ? "Submitted" : report ? "Draft" : "missing"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 px-6 py-4"><button onClick={() => setEmployeeModal(null)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
