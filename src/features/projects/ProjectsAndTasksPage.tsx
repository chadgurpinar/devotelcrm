import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Briefcase, CheckSquare, Clock, Eye, LayoutGrid, Plus } from "lucide-react";
import { useAppStore } from "../../store/db";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { UiProjectCard } from "../../ui/UiProjectCard";
import { ProjectFormModal } from "./ProjectFormModal";

const STATUS_COLOR: Record<string, string> = { Planning: "bg-blue-100 text-blue-700", InProgress: "bg-amber-100 text-amber-700", Paused: "bg-gray-100 text-gray-600", Completed: "bg-emerald-100 text-emerald-700", OnHold: "bg-gray-100 text-gray-600", Cancelled: "bg-rose-100 text-rose-700" };
const STATUS_LABEL: Record<string, string> = { Planning: "Planning", InProgress: "In Progress", Paused: "Paused", Completed: "Completed", OnHold: "On Hold", Cancelled: "Cancelled" };
const PRIORITY_CLR: Record<string, string> = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-gray-100 text-gray-500" };
const EXEC_STATUS_CLR: Record<string, string> = { approved: "bg-emerald-50 text-emerald-700", changes_requested: "bg-amber-50 text-amber-700", escalated: "bg-rose-50 text-rose-700" };
const EXEC_STATUS_LBL: Record<string, string> = { approved: "Approved", changes_requested: "Changes Requested", escalated: "Escalated" };
const RISK_CLR: Record<string, string> = { High: "text-rose-600", Medium: "text-amber-600", Low: "text-emerald-600" };

type ViewMode = "team" | "executive";

function getCurrentMonday(): string {
  const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d); mon.setDate(d.getDate() + diff); return mon.toISOString().slice(0, 10);
}

function daysRemaining(endDate?: string): { days: number; color: string; label: string } | null {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { days: diff, color: "text-rose-600", label: `${Math.abs(diff)}d overdue` };
  if (diff <= 7) return { days: diff, color: "text-rose-600", label: `${diff}d left` };
  if (diff <= 14) return { days: diff, color: "text-amber-600", label: `${diff}d left` };
  return { days: diff, color: "text-emerald-600", label: `${diff}d left` };
}

function fmtShortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function ProjectsAndTasksPage() {
  const state = useAppStore();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("team");
  const [showForm, setShowForm] = useState(false);

  const activeUserId = state.activeUserId;
  const activeUser = state.users.find((u) => u.id === activeUserId);
  const isSuperAdmin = activeUser?.role === "SuperAdmin";

  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);
  const currentMonday = getCurrentMonday();

  /* ── Week date ranges ── */
  const currentWeekEnd = useMemo(() => { const d = new Date(currentMonday + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); }, [currentMonday]);
  const lastWeekStart = useMemo(() => { const d = new Date(currentMonday + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 7); return d.toISOString().slice(0, 10); }, [currentMonday]);
  const lastWeekEnd = useMemo(() => { const d = new Date(currentMonday + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }, [currentMonday]);

  /* ── Team View data ── */

  const allProjectsWithCounts = useMemo(() => state.projects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((project) => {
    const tasks = state.tasks.filter((t) => t.projectId === project.id);
    const todo = tasks.filter((t) => t.status === "Backlog" || t.status === "ToDo").length;
    const inProgress = tasks.filter((t) => t.status === "InProgress").length;
    const done = tasks.filter((t) => t.status === "Done").length;
    const owner = userById.get(project.ownerUserId);
    const isVisible = isSuperAdmin
      || project.ownerUserId === activeUserId
      || project.managerUserIds.includes(activeUserId)
      || project.technicalResponsibleUserId === activeUserId
      || project.salesResponsibleUserId === activeUserId
      || project.productResponsibleUserId === activeUserId
      || (project.watcherUserIds ?? []).includes(activeUserId)
      || (project.responsibleRoles ?? []).some((r) => r.userId === activeUserId);
    return { project, ownerName: owner?.name ?? "Unknown", totalTasks: tasks.length, isVisible, taskCounts: [{ label: "To Do", count: todo, color: "bg-gray-400" }, { label: "In Progress", count: inProgress, color: "bg-blue-500" }, { label: "Done", count: done, color: "bg-emerald-500" }] };
  }), [state.projects, state.tasks, userById, activeUserId, isSuperAdmin]);

  const teamProjects = useMemo(() => allProjectsWithCounts.filter((p) => p.isVisible), [allProjectsWithCounts]);

  const totalTasks = state.tasks.length;
  const overdueTasks = useMemo(() => { const now = new Date().toISOString(); return state.tasks.filter((t) => t.dueAt && t.dueAt < now && t.status !== "Done" && t.status !== "Cancelled").length; }, [state.tasks]);

  /* ── Executive View data ── */

  const activeProjectsCount = useMemo(() => state.projects.filter((p) => p.status === "InProgress").length, [state.projects]);

  const highRiskCount = useMemo(() => {
    let count = 0;
    for (const project of state.projects) {
      const latest = state.projectWeeklyReports.filter((r) => r.projectId === project.id).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0];
      if (latest?.managerSummary?.riskLevel === "High") count++;
    }
    return count;
  }, [state.projects, state.projectWeeklyReports]);

  const thisWeekCompleted = useMemo(() => state.tasks.filter((t) => {
    if (t.status !== "Done") return false;
    const date = (t.completedAt ?? t.updatedAt).slice(0, 10);
    return date >= currentMonday && date <= currentWeekEnd;
  }).length, [state.tasks, currentMonday, currentWeekEnd]);

  const lastWeekCompleted = useMemo(() => state.tasks.filter((t) => {
    if (t.status !== "Done") return false;
    const date = (t.completedAt ?? t.updatedAt).slice(0, 10);
    return date >= lastWeekStart && date <= lastWeekEnd;
  }).length, [state.tasks, lastWeekStart, lastWeekEnd]);

  const executiveRows = useMemo(() => state.projects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((project) => {
    const tasks = state.tasks.filter((t) => t.projectId === project.id);
    const completedCount = tasks.filter((t) => t.status === "Done").length;
    const now = new Date().toISOString();
    const overdueCount = tasks.filter((t) => t.dueAt && t.dueAt < now && t.status !== "Done" && t.status !== "Cancelled").length;
    const reports = state.projectWeeklyReports.filter((r) => r.projectId === project.id).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
    const thisWeekReport = reports.find((r) => r.weekStartDate === currentMonday);
    const hasReportThisWeek = Boolean(thisWeekReport && (thisWeekReport.roleReports.technical?.submittedAt || thisWeekReport.roleReports.sales?.submittedAt || thisWeekReport.roleReports.product?.submittedAt || thisWeekReport.managerSummary?.submittedAt));
    const latestComments = state.weeklyReportManagerComments.filter((c) => reports.some((r) => r.id === c.reportId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastComment = latestComments[0]?.commentText ?? null;
    const owner = userById.get(project.ownerUserId);
    const deadline = daysRemaining(project.endDate);
    const latestRiskLevel = reports[0]?.managerSummary?.riskLevel ?? null;
    const lastReportDate = reports[0]?.weekStartDate ?? null;
    const budget = project.budget ?? null;
    const tags = project.tags ?? [];

    const responsibles: { label: string; name: string }[] = (project.responsibleRoles && project.responsibleRoles.length > 0)
      ? project.responsibleRoles.map((r) => ({ label: r.label, name: userById.get(r.userId)?.name ?? "—" }))
      : ([
          project.technicalResponsibleUserId ? { label: "Technical", name: userById.get(project.technicalResponsibleUserId)?.name ?? "—" } : null,
          project.salesResponsibleUserId ? { label: "Sales", name: userById.get(project.salesResponsibleUserId)?.name ?? "—" } : null,
          project.productResponsibleUserId ? { label: "Product", name: userById.get(project.productResponsibleUserId)?.name ?? "—" } : null,
        ] as ({ label: string; name: string } | null)[]).filter((x): x is { label: string; name: string } => x !== null);

    return { project, ownerName: owner?.name ?? "Unknown", totalTasks: tasks.length, completedCount, overdueCount, hasReportThisWeek, lastComment, deadline, latestRiskLevel, lastReportDate, budget, tags, responsibles };
  }), [state.projects, state.tasks, state.projectWeeklyReports, state.weeklyReportManagerComments, userById, currentMonday]);

  /* ── AI Summary (deterministic) ── */

  const execAiSummary = useMemo(() => {
    const total = state.projects.length;
    const active = activeProjectsCount;
    const noReportCount = executiveRows.filter((r) => !r.hasReportThisWeek).length;
    const parts: string[] = [];
    parts.push(`${total} project${total !== 1 ? "s" : ""} tracked — ${active} active.`);
    if (thisWeekCompleted > 0) parts.push(`${thisWeekCompleted} task${thisWeekCompleted !== 1 ? "s" : ""} completed this week.`);
    else parts.push("No tasks completed yet this week.");
    if (highRiskCount > 0) parts.push(`⚠️ ${highRiskCount} project${highRiskCount !== 1 ? "s" : ""} flagged as high risk.`);
    if (overdueTasks > 0) parts.push(`${overdueTasks} overdue task${overdueTasks !== 1 ? "s" : ""} require attention.`);
    if (noReportCount > 0) parts.push(`${noReportCount} project${noReportCount !== 1 ? "s" : ""} missing a report this week.`);
    if (highRiskCount === 0 && overdueTasks === 0 && noReportCount === 0) parts.push("All projects on track with no critical issues.");
    return parts.join(" ");
  }, [state.projects.length, activeProjectsCount, highRiskCount, overdueTasks, thisWeekCompleted, executiveRows]);

  return (
    <div className="space-y-6">
      <UiPageHeader title="Projects" subtitle={`${state.projects.length} projects`} actions={
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition">
          <Plus className="h-4 w-4" /> New Project
        </button>
      } />

      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button onClick={() => setView("team")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "team" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><LayoutGrid className="h-4 w-4" /> Team View</button>
        <button onClick={() => setView("executive")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "executive" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><Eye className="h-4 w-4" /> Executive View</button>
      </div>

      <p className="text-xs text-gray-500">{view === "team" ? "Showing projects you are involved in." : "Showing all company projects with summary KPIs."}</p>

      {/* ═══ TEAM VIEW ═══ */}
      {view === "team" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UiKpiCard label="My Projects" value={teamProjects.length} icon={<Briefcase className="h-5 w-5" />} />
            <UiKpiCard label="Total Tasks" value={totalTasks} icon={<CheckSquare className="h-5 w-5" />} />
            <UiKpiCard label="Overdue Tasks" value={overdueTasks} icon={<Clock className="h-5 w-5" />} className={overdueTasks > 0 ? "border-rose-200 bg-rose-50/50" : ""} />
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">My Projects</h2>
            <span className="text-xs text-gray-500">{teamProjects.length} project{teamProjects.length !== 1 ? "s" : ""}</span>
          </div>
          {teamProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16"><Briefcase className="h-10 w-10 text-gray-300 mb-3" /><p className="text-sm text-gray-500">No projects assigned to you</p></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teamProjects.map(({ project, ownerName, totalTasks: tt, taskCounts }) => (
                <UiProjectCard key={project.id} name={project.name} owner={ownerName} status={STATUS_LABEL[project.status] ?? project.status} statusColor={STATUS_COLOR[project.status]} priority={project.strategicPriority} totalTasks={tt} taskCounts={taskCounts} onClick={() => navigate(`/projects/${project.id}`)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ EXECUTIVE VIEW ═══ */}
      {view === "executive" && (
        <>
          {/* KPI cards — 6 cards in 3-col grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UiKpiCard label="Total Projects" value={state.projects.length} icon={<Briefcase className="h-5 w-5" />} />
            <UiKpiCard label="Active Projects" value={activeProjectsCount} icon={<LayoutGrid className="h-5 w-5" />} />
            <UiKpiCard label="Overdue Tasks" value={overdueTasks} icon={<Clock className="h-5 w-5" />} className={overdueTasks > 0 ? "border-rose-200 bg-rose-50/50" : ""} />
            <UiKpiCard label="High Risk Projects" value={highRiskCount} icon={<AlertTriangle className="h-5 w-5" />} className={highRiskCount > 0 ? "border-rose-200 bg-rose-50/50" : ""} />
            <UiKpiCard label="Completed This Week" value={thisWeekCompleted} icon={<CheckSquare className="h-5 w-5" />} />
            <UiKpiCard label="Completed Last Week" value={lastWeekCompleted} icon={<CheckSquare className="h-5 w-5" />} />
          </div>

          {/* AI Summary strip */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 flex items-start gap-3">
            <span className="text-lg mt-0.5">🤖</span>
            <div>
              <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">AI Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed">{execAiSummary}</p>
            </div>
          </div>

          {executiveRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16"><Briefcase className="h-10 w-10 text-gray-300 mb-3" /><p className="text-sm text-gray-500">No projects</p></div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tasks</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Report</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Last Comment</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {executiveRows.map(({ project, ownerName, totalTasks: tt, completedCount, overdueCount, hasReportThisWeek, lastComment, deadline, latestRiskLevel, lastReportDate, budget, tags, responsibles }) => {
                    const pct = tt > 0 ? Math.round((completedCount / tt) * 100) : 0;
                    return (
                      <tr key={project.id} className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">{project.name}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${STATUS_COLOR[project.status] ?? "bg-gray-100 text-gray-600"}`}>{STATUS_LABEL[project.status] ?? project.status}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_CLR[project.strategicPriority] ?? "bg-gray-100 text-gray-500"}`}>{project.strategicPriority}</span>
                            {project.executiveStatus && <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${EXEC_STATUS_CLR[project.executiveStatus] ?? ""}`}>{EXEC_STATUS_LBL[project.executiveStatus] ?? project.executiveStatus}</span>}
                            {tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">{tag}</span>)}
                            {tags.length > 3 && <span className="text-[9px] text-gray-400">+{tags.length - 3}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">{ownerName}</p>
                          {responsibles.slice(0, 3).map((r, i) => <p key={i} className="text-[10px] text-gray-400">{r.label}: {r.name}</p>)}
                          {responsibles.length > 3 && <p className="text-[10px] text-gray-400">+{responsibles.length - 3} more</p>}
                        </td>
                        <td className="px-4 py-3">
                          {deadline ? <span className={`text-xs font-medium ${deadline.color}`}>{deadline.label}</span> : <span className="text-xs text-gray-400">—</span>}
                          {budget !== null && <p className="text-[10px] text-gray-400">Budget: ${budget.toLocaleString()}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-700">{completedCount} / {tt}</span>
                            <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center"><span className="text-sm">{hasReportThisWeek ? "✅" : "❌"}</span></td>
                        <td className="px-4 py-3">{lastComment ? <p className="text-xs text-gray-500 italic truncate max-w-[200px]">{lastComment.length > 60 ? lastComment.slice(0, 60) + "…" : lastComment}</p> : <span className="text-xs text-gray-400">—</span>}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {overdueCount > 0 && (
                              <>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span className="text-[10px] text-amber-600">{overdueCount} overdue</span>
                              </>
                            )}
                            {latestRiskLevel ? (
                              <span className={`text-[10px] font-medium ${RISK_CLR[latestRiskLevel] ?? "text-gray-500"}`}>{latestRiskLevel}</span>
                            ) : (
                              overdueCount === 0 && <span className="text-xs text-emerald-500">OK</span>
                            )}
                            {lastReportDate && <span className="text-[10px] text-gray-400">Last: {fmtShortDate(lastReportDate)}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showForm && <ProjectFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
