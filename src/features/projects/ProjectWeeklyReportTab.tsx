import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Sparkles, Plus, X, Lock } from "lucide-react";
import { useAppStore, isAfterWeeklyDeadline } from "../../store/db";
import { getUserName } from "../../store/selectors";
import type { Project, ProjectAttachmentLink, ProjectRoleKey, ProjectRiskLevel, ProjectWeeklyReport } from "../../store/types";

/* ─── helpers ─── */

function getCurrentMonday(): string {
  const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d); mon.setDate(d.getDate() + diff); return mon.toISOString().slice(0, 10);
}
function shiftWeek(w: string, delta: number): string {
  const d = new Date(w + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + delta * 7);
  const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day; d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}
function fmtWeek(w: string): string { return new Date(w + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
function splitLines(v: string): string[] { return v.split("\n").map((l) => l.trim()).filter(Boolean); }
function parseAttachments(v: string): ProjectAttachmentLink[] {
  return splitLines(v).map((line, i) => { const [left, right] = line.split("|").map((s) => s.trim()); return right ? { label: left || `Attachment ${i + 1}`, url: right } : { label: `Attachment ${i + 1}`, url: left }; }).filter((a) => Boolean(a.url));
}
function serializeAttachments(links?: ProjectAttachmentLink[]): string { return (links ?? []).map((l) => l.label && l.label !== l.url ? `${l.label} | ${l.url}` : l.url).join("\n"); }
function joinLines(arr?: string[]): string { return (arr ?? []).join("\n"); }
function getRoleUserId(p: Project, r: ProjectRoleKey): string { return r === "technical" ? p.technicalResponsibleUserId : r === "sales" ? p.salesResponsibleUserId : p.productResponsibleUserId; }
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50 disabled:text-gray-400";
const RISK_CLR: Record<string, string> = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-emerald-50 text-emerald-700" };

/* ─── DynamicListInput ─── */

function DynamicListInput({ label, items, onChange, disabled }: { label: string; items: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const rows = items.length > 0 ? items : [""];
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <div className="space-y-1">
        {rows.map((val, i) => (
          <div key={i} className="flex gap-1">
            <input className={inputCls} value={val} onChange={(e) => { const next = [...rows]; next[i] = e.target.value; onChange(next.filter((v, idx) => v.trim() || idx === next.length - 1)); }} disabled={disabled} placeholder={`${label} item...`} />
            {!disabled && rows.length > 1 && <button onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="rounded p-1 text-gray-400 hover:text-rose-500 transition flex-shrink-0"><X className="h-4 w-4" /></button>}
          </div>
        ))}
      </div>
      {!disabled && <button onClick={() => onChange([...rows, ""])} className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"><Plus className="h-3 w-3" /> Add</button>}
    </div>
  );
}

/* ─── AttachmentListInput ─── */

function AttachmentListInput({ label, items, onChange, disabled }: { label: string; items: ProjectAttachmentLink[]; onChange: (v: ProjectAttachmentLink[]) => void; disabled?: boolean }) {
  const rows = items.length > 0 ? items : [{ label: "", url: "" }];
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <div className="space-y-1">
        {rows.map((att, i) => (
          <div key={i} className="flex gap-1">
            <input className={`${inputCls} w-1/3`} value={att.label} placeholder="Label" onChange={(e) => { const next = [...rows]; next[i] = { ...next[i], label: e.target.value }; onChange(next); }} disabled={disabled} />
            <input className={`${inputCls} flex-1`} value={att.url} placeholder="URL" onChange={(e) => { const next = [...rows]; next[i] = { ...next[i], url: e.target.value }; onChange(next); }} disabled={disabled} />
            {!disabled && rows.length > 1 && <button onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="rounded p-1 text-gray-400 hover:text-rose-500 transition flex-shrink-0"><X className="h-4 w-4" /></button>}
          </div>
        ))}
      </div>
      {!disabled && <button onClick={() => onChange([...rows, { label: "", url: "" }])} className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"><Plus className="h-3 w-3" /> Add</button>}
    </div>
  );
}

/* ─── ReadOnlyRoleView ─── */

function ReadOnlyRoleView({ roleReport, roleName }: { roleReport: NonNullable<ProjectWeeklyReport["roleReports"]["technical"]>; roleName: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 capitalize">{roleName} Report</h3>
        {roleReport.submittedAt ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">Submitted {new Date(roleReport.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span> : <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">Draft</span>}
      </div>
      {(["achievements", "inProgress", "blockers", "decisionsRequired", "nextWeekFocus"] as const).map((field) => {
        const items = roleReport[field];
        if (!items.length) return null;
        return <div key={field} className="mb-2"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{field.replace(/([A-Z])/g, " $1").trim()}</p><ul className="list-disc pl-4 text-xs text-gray-700 space-y-0.5">{items.map((v, i) => <li key={i}>{v}</li>)}</ul></div>;
      })}
      {roleReport.attachments.length > 0 && <div className="mb-2"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Attachments</p>{roleReport.attachments.map((a, i) => <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block text-xs text-indigo-600 hover:underline">{a.label}</a>)}</div>}
    </div>
  );
}

/* ─── LegacyReportView ─── */

function LegacyReportView({ legacy }: { legacy: NonNullable<ProjectWeeklyReport["legacyCombinedReport"]> }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3"><h3 className="text-sm font-semibold text-gray-600">Legacy Report</h3><span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">Archive</span></div>
      {legacy.riskLevel && <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium mb-2 ${RISK_CLR[legacy.riskLevel] ?? "bg-gray-100 text-gray-500"}`}>Risk: {legacy.riskLevel}</span>}
      {legacy.teamStatusSummary && <p className="text-xs text-gray-600 mb-2">{legacy.teamStatusSummary}</p>}
      {(["achievements", "inProgress", "blockers", "decisionsRequired", "nextWeekFocus"] as const).map((field) => {
        const items = legacy[field];
        if (!items.length) return null;
        return <div key={field} className="mb-2"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{field.replace(/([A-Z])/g, " $1").trim()}</p><ul className="list-disc pl-4 text-xs text-gray-600 space-y-0.5">{items.map((v, i) => <li key={i}>{v}</li>)}</ul></div>;
      })}
      {legacy.submittedAt && <p className="text-[10px] text-gray-400 mt-2">Submitted {new Date(legacy.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/* Main Component                                         */
/* ═══════════════════════════════════════════════════════ */

export function ProjectWeeklyReportTab({ projectId }: { projectId: string }) {
  const state = useAppStore();
  const [selectedWeek, setSelectedWeek] = useState(getCurrentMonday);
  const [commentText, setCommentText] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const currentMonday = getCurrentMonday();

  const project = state.projects.find((p) => p.id === projectId);
  const report = useMemo(() => state.projectWeeklyReports.find((r) => r.projectId === projectId && r.weekStartDate === selectedWeek) ?? null, [state.projectWeeklyReports, projectId, selectedWeek]);
  const comments = useMemo(() => report ? state.weeklyReportManagerComments.filter((c) => c.reportId === report.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [], [state.weeklyReportManagerComments, report]);

  useEffect(() => { state.createProjectWeeklyReport({ projectId, weekStartDate: selectedWeek, roleReports: {} }); }, [selectedWeek, projectId, state]);

  const userRole = useMemo<ProjectRoleKey | "manager" | "none">(() => {
    if (!project) return "none";
    if (project.technicalResponsibleUserId === state.activeUserId) return "technical";
    if (project.salesResponsibleUserId === state.activeUserId) return "sales";
    if (project.productResponsibleUserId === state.activeUserId) return "product";
    if (project.managerUserIds.includes(state.activeUserId) || project.ownerUserId === state.activeUserId) return "manager";
    return "none";
  }, [project, state.activeUserId]);

  const isManager = userRole === "manager";

  function debouncedSave(updatedReport: ProjectWeeklyReport) {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { state.updateProjectWeeklyReport(updatedReport); }, 400);
  }

  function handlePrev() { setSelectedWeek((w) => shiftWeek(w, -1)); }
  function handleNext() { const next = shiftWeek(selectedWeek, 1); if (next <= currentMonday) setSelectedWeek(next); }

  if (!project) return <p className="text-sm text-gray-400 text-center py-8">Project not found.</p>;

  /* ── Role form state helpers ── */
  const roleReport = (role: ProjectRoleKey) => report?.roleReports[role];
  const roleSubmitted = (role: ProjectRoleKey) => Boolean(roleReport(role)?.submittedAt);
  const memberLocked = project.reportDeadlines ? isAfterWeeklyDeadline(project.reportDeadlines.memberLockDay, project.reportDeadlines.memberLockTime) : false;
  const managerLocked = project.reportDeadlines ? isAfterWeeklyDeadline(project.reportDeadlines.managerLockDay, project.reportDeadlines.managerLockTime) : false;

  function updateRole(role: ProjectRoleKey, patch: Partial<{ achievements: string[]; inProgress: string[]; blockers: string[]; decisionsRequired: string[]; nextWeekFocus: string[]; attachments: ProjectAttachmentLink[] }>) {
    if (!report) return;
    const existing = report.roleReports[role];
    const updated: ProjectWeeklyReport = { ...report, roleReports: { ...report.roleReports, [role]: { authorUserId: existing?.authorUserId ?? state.activeUserId, achievements: patch.achievements ?? existing?.achievements ?? [], inProgress: patch.inProgress ?? existing?.inProgress ?? [], blockers: patch.blockers ?? existing?.blockers ?? [], decisionsRequired: patch.decisionsRequired ?? existing?.decisionsRequired ?? [], nextWeekFocus: patch.nextWeekFocus ?? existing?.nextWeekFocus ?? [], attachments: patch.attachments ?? existing?.attachments ?? [], submittedAt: existing?.submittedAt, updatedAt: new Date().toISOString() } } };
    debouncedSave(updated);
  }

  function submitRole(role: ProjectRoleKey) {
    if (!report || memberLocked) return;
    const existing = report.roleReports[role];
    const now = new Date().toISOString();
    state.updateProjectWeeklyReport({ ...report, roleReports: { ...report.roleReports, [role]: { authorUserId: existing?.authorUserId ?? state.activeUserId, achievements: existing?.achievements ?? [], inProgress: existing?.inProgress ?? [], blockers: existing?.blockers ?? [], decisionsRequired: existing?.decisionsRequired ?? [], nextWeekFocus: existing?.nextWeekFocus ?? [], attachments: existing?.attachments ?? [], submittedAt: now, updatedAt: now } }, updatedAt: now });
  }

  function updateManager(patch: Partial<{ executiveSummaryText: string; riskLevel: ProjectRiskLevel; blockers: string[]; decisionsRequired: string[]; deckLinks: ProjectAttachmentLink[] }>) {
    if (!report) return;
    const ms = report.managerSummary;
    const updated: ProjectWeeklyReport = { ...report, managerSummary: { authorUserId: ms?.authorUserId ?? state.activeUserId, executiveSummaryText: patch.executiveSummaryText ?? ms?.executiveSummaryText ?? "", riskLevel: patch.riskLevel ?? ms?.riskLevel ?? "Medium", blockers: patch.blockers ?? ms?.blockers ?? [], decisionsRequired: patch.decisionsRequired ?? ms?.decisionsRequired ?? [], deckLinks: patch.deckLinks ?? ms?.deckLinks ?? [], submittedAt: ms?.submittedAt, updatedAt: new Date().toISOString() } };
    debouncedSave(updated);
  }

  function submitManager() {
    if (!report || managerLocked) return;
    const ms = report.managerSummary;
    const now = new Date().toISOString();
    state.updateProjectWeeklyReport({ ...report, managerSummary: { authorUserId: ms?.authorUserId ?? state.activeUserId, executiveSummaryText: ms?.executiveSummaryText ?? "", riskLevel: ms?.riskLevel ?? "Medium", blockers: ms?.blockers ?? [], decisionsRequired: ms?.decisionsRequired ?? [], deckLinks: ms?.deckLinks ?? [], submittedAt: now, updatedAt: now }, updatedAt: now });
  }

  function addComment() {
    if (!report || !commentText.trim()) return;
    state.addWeeklyReportManagerComment({ reportId: report.id, managerUserId: state.activeUserId, commentText: commentText.trim(), aiGenerated: false });
    setCommentText("");
  }

  /* ── Render helpers ── */

  const renderRoleForm = (role: ProjectRoleKey) => {
    const rr = roleReport(role);
    const submitted = roleSubmitted(role);
    const disabled = submitted;

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 capitalize">{role} Report</h3>
          {submitted ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle className="h-3 w-3" /> Submitted {new Date(rr!.submittedAt!).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span> : <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">Draft</span>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <DynamicListInput label="Achievements" items={rr?.achievements ?? []} onChange={(v) => updateRole(role, { achievements: v })} disabled={disabled} />
          <DynamicListInput label="In Progress" items={rr?.inProgress ?? []} onChange={(v) => updateRole(role, { inProgress: v })} disabled={disabled} />
          <DynamicListInput label="Blockers" items={rr?.blockers ?? []} onChange={(v) => updateRole(role, { blockers: v })} disabled={disabled} />
          <DynamicListInput label="Decisions Required" items={rr?.decisionsRequired ?? []} onChange={(v) => updateRole(role, { decisionsRequired: v })} disabled={disabled} />
          <DynamicListInput label="Next Week Focus" items={rr?.nextWeekFocus ?? []} onChange={(v) => updateRole(role, { nextWeekFocus: v })} disabled={disabled} />
          <AttachmentListInput label="Attachments" items={rr?.attachments ?? []} onChange={(v) => updateRole(role, { attachments: v })} disabled={disabled} />
        </div>
        {!submitted && (
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => submitRole(role)} disabled={memberLocked} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Submit {role} Report</button>
            {memberLocked && <span className="inline-flex items-center gap-1 text-xs text-rose-600"><Lock className="h-3.5 w-3.5" /> Submissions locked (deadline passed)</span>}
            {project.reportDeadlines && !memberLocked && <span className="text-[10px] text-gray-400">Deadline: {DAY_NAMES[project.reportDeadlines.memberLockDay]} {project.reportDeadlines.memberLockTime}</span>}
          </div>
        )}
      </div>
    );
  };

  const renderManagerForm = () => {
    const ms = report?.managerSummary;
    const submitted = Boolean(ms?.submittedAt);
    const disabled = submitted;

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Manager Summary</h3>
          {submitted ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle className="h-3 w-3" /> Submitted</span> : <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">Draft</span>}
        </div>
        <div className="space-y-4">
          <div><p className="mb-1 text-xs font-medium text-gray-500">Executive Summary</p><textarea rows={4} className={`${inputCls} resize-none`} value={ms?.executiveSummaryText ?? ""} onChange={(e) => updateManager({ executiveSummaryText: e.target.value })} disabled={disabled} /></div>
          <div><p className="mb-1 text-xs font-medium text-gray-500">Risk Level</p>
            <div className="flex gap-1">{(["Low", "Medium", "High"] as const).map((lvl) => (<button key={lvl} onClick={() => !disabled && updateManager({ riskLevel: lvl })} disabled={disabled} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${(ms?.riskLevel ?? "Medium") === lvl ? (lvl === "High" ? "bg-rose-100 text-rose-700" : lvl === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700") : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{lvl}</button>))}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DynamicListInput label="Blockers" items={ms?.blockers ?? []} onChange={(v) => updateManager({ blockers: v })} disabled={disabled} />
            <DynamicListInput label="Decisions Required" items={ms?.decisionsRequired ?? []} onChange={(v) => updateManager({ decisionsRequired: v })} disabled={disabled} />
          </div>
          <AttachmentListInput label="Deck Links" items={ms?.deckLinks ?? []} onChange={(v) => updateManager({ deckLinks: v })} disabled={disabled} />
        </div>
        {!submitted && (
          <div className="mt-4 flex items-center gap-2">
            <button onClick={submitManager} disabled={managerLocked} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Submit Manager Summary</button>
            {managerLocked && <span className="inline-flex items-center gap-1 text-xs text-rose-600"><Lock className="h-3.5 w-3.5" /> Manager submissions locked</span>}
            {project.reportDeadlines && !managerLocked && <span className="text-[10px] text-gray-400">Deadline: {DAY_NAMES[project.reportDeadlines.managerLockDay]} {project.reportDeadlines.managerLockTime}</span>}
          </div>
        )}
      </div>
    );
  };

  const hasAnySubmission = Boolean(report?.roleReports.technical?.submittedAt || report?.roleReports.sales?.submittedAt || report?.roleReports.product?.submittedAt || report?.managerSummary?.submittedAt);
  const showLegacy = report?.legacyCombinedReport && !hasAnySubmission;

  return (
    <div className="space-y-5">
      {/* Part A — Week Selector */}
      <div className="flex items-center gap-3">
        <button onClick={handlePrev} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-medium text-gray-700">Week of {fmtWeek(selectedWeek)}</span>
        <button onClick={handleNext} disabled={shiftWeek(selectedWeek, 1) > currentMonday} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {/* Part B — Role Form (if user is a role reporter) */}
      {(userRole === "technical" || userRole === "sales" || userRole === "product") && renderRoleForm(userRole)}

      {/* Part C — Manager Form */}
      {isManager && renderManagerForm()}

      {/* Part D — Manager Comments */}
      {isManager && report && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Manager Comments</h3>
          {comments.length === 0 && <p className="text-xs text-gray-400 mb-3">No comments yet.</p>}
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className={`py-1.5 pl-3 border-l-2 ${c.aiGenerated ? "border-violet-400" : "border-gray-200"}`}>
                <div className="flex items-center gap-1.5 text-xs"><span className="font-semibold text-gray-700">{getUserName(state, c.managerUserId)}</span>{c.aiGenerated && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-medium text-violet-700">AI</span>}<span className="text-[10px] text-gray-400">· {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></div>
                <p className="text-xs text-gray-600 mt-0.5">{c.commentText}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={`flex-1 ${inputCls}`} placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
            <button onClick={addComment} disabled={!commentText.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Post</button>
          </div>
        </div>
      )}

      {/* Part F — Read-only view for non-editors */}
      {userRole === "none" && (
        <div className="space-y-4">
          {!hasAnySubmission && !showLegacy && <p className="text-sm text-gray-400 text-center py-8">No report submitted for this week.</p>}
          {(["technical", "sales", "product"] as const).map((role) => { const rr = roleReport(role); return rr?.submittedAt ? <ReadOnlyRoleView key={role} roleReport={rr} roleName={role} /> : null; })}
          {report?.managerSummary?.submittedAt && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Manager Summary</h3>
              <p className="text-sm text-gray-700 mb-2">{report.managerSummary.executiveSummaryText}</p>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${RISK_CLR[report.managerSummary.riskLevel]}`}>Risk: {report.managerSummary.riskLevel}</span>
              {report.managerSummary.blockers.length > 0 && <div className="mt-2"><p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Blockers</p><ul className="list-disc pl-4 text-xs text-gray-600">{report.managerSummary.blockers.map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
            </div>
          )}
          {/* Comments for read-only viewers */}
          {comments.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Manager Comments</h3>
              <div className="space-y-2">{comments.map((c) => (<div key={c.id} className="py-1.5 pl-3 border-l-2 border-gray-200"><div className="flex items-center gap-1.5 text-xs"><span className="font-semibold text-gray-700">{getUserName(state, c.managerUserId)}</span><span className="text-[10px] text-gray-400">· {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></div><p className="text-xs text-gray-600 mt-0.5">{c.commentText}</p></div>))}</div>
            </div>
          )}
        </div>
      )}

      {/* Part E — AI Summary (visible to all) */}
      {report && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">AI Summary</h3>
            {isManager && (
              <button onClick={() => state.generateProjectAiSummary(projectId, selectedWeek)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition">
                <Sparkles className="h-3.5 w-3.5" /> {report.aiSummary ? "Re-generate" : "Generate"} AI Summary
              </button>
            )}
          </div>
          {report.aiSummary ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-800 font-medium">{report.aiSummary.shortText}</p>
              {report.aiSummary.keyBlockers.length > 0 && <div><p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Key Blockers</p><ul className="list-disc pl-4 text-xs text-gray-700">{report.aiSummary.keyBlockers.map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
              {report.aiSummary.decisionsRequired.length > 0 && <div><p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Decisions Required</p><ul className="list-disc pl-4 text-xs text-gray-700">{report.aiSummary.decisionsRequired.map((d, i) => <li key={i}>{d}</li>)}</ul></div>}
              {report.aiSummary.missingRoles.length > 0 && <p className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> Missing: {report.aiSummary.missingRoles.join(", ")}</p>}
              <div className="flex items-center gap-3 pt-1">
                {(["technical", "sales", "product", "manager"] as const).map((key) => {
                  const submitted = key === "manager" ? report.aiSummary!.coverage.managerSubmittedAt : report.aiSummary!.coverage[`${key}SubmittedAt` as keyof typeof report.aiSummary.coverage];
                  return <span key={key} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${submitted ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{submitted ? <CheckCircle className="h-3 w-3" /> : null} {key}</span>;
                })}
              </div>
              <p className="text-[10px] text-gray-400">Generated {new Date(report.aiSummary.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No AI summary generated yet.</p>
          )}
        </div>
      )}

      {/* Part G — Legacy fallback */}
      {showLegacy && <LegacyReportView legacy={report!.legacyCombinedReport!} />}
    </div>
  );
}
