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

export function ProjectsAndTasksPage() {
  const state = useAppStore();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("team");
  const [showForm, setShowForm] = useState(false);

  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);
  const totalProjects = state.projects.length;
  const totalTasks = state.tasks.length;
  const overdueTasks = useMemo(() => { const now = new Date().toISOString(); return state.tasks.filter((t) => t.dueAt && t.dueAt < now && t.status !== "Done" && t.status !== "Completed" && !t.archivedAt).length; }, [state.tasks]);
  const currentMonday = getCurrentMonday();

  const projectsWithCounts = useMemo(() => state.projects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((project) => {
    const tasks = state.tasks.filter((t) => t.projectId === project.id);
    const todo = tasks.filter((t) => t.status === "Backlog" || t.status === "Open").length;
    const inProgress = tasks.filter((t) => t.status === "InProgress").length;
    const done = tasks.filter((t) => t.status === "Done" || t.status === "Completed").length;
    const owner = userById.get(project.ownerUserId);
    return { project, ownerName: owner?.name ?? "Unknown", totalTasks: tasks.length, taskCounts: [{ label: "To Do", count: todo, color: "bg-gray-400" }, { label: "In Progress", count: inProgress, color: "bg-blue-500" }, { label: "Done", count: done, color: "bg-emerald-500" }] };
  }), [state.projects, state.tasks, userById]);

  const executiveRows = useMemo(() => state.projects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((project) => {
    const tasks = state.tasks.filter((t) => t.projectId === project.id);
    const completedCount = tasks.filter((t) => t.status === "Done" || t.status === "Completed").length;
    const now = new Date().toISOString();
    const hasOverdue = tasks.some((t) => t.dueAt && t.dueAt < now && t.status !== "Done" && t.status !== "Completed");
    const reports = state.projectWeeklyReports.filter((r) => r.projectId === project.id);
    const thisWeekReport = reports.find((r) => r.weekStartDate === currentMonday);
    const hasReportThisWeek = Boolean(thisWeekReport && (thisWeekReport.roleReports.technical?.submittedAt || thisWeekReport.roleReports.sales?.submittedAt || thisWeekReport.roleReports.product?.submittedAt || thisWeekReport.managerSummary?.submittedAt));
    const latestComments = state.weeklyReportManagerComments.filter((c) => reports.some((r) => r.id === c.reportId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastComment = latestComments[0]?.commentText ?? null;
    const owner = userById.get(project.ownerUserId);
    const deadline = daysRemaining(project.endDate);
    return { project, ownerName: owner?.name ?? "Unknown", totalTasks: tasks.length, completedCount, hasOverdue, hasReportThisWeek, lastComment, deadline };
  }), [state.projects, state.tasks, state.projectWeeklyReports, state.weeklyReportManagerComments, userById, currentMonday]);

  return (
    <div className="space-y-6">
      <UiPageHeader title="Projects" subtitle={`${totalProjects} projects`} actions={
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition">
          <Plus className="h-4 w-4" /> New Project
        </button>
      } />

      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button onClick={() => setView("team")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "team" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><LayoutGrid className="h-4 w-4" /> Team View</button>
        <button onClick={() => setView("executive")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "executive" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><Eye className="h-4 w-4" /> Executive View</button>
      </div>

      {view === "team" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UiKpiCard label="Total Projects" value={totalProjects} icon={<Briefcase className="h-5 w-5" />} />
            <UiKpiCard label="Total Tasks" value={totalTasks} icon={<CheckSquare className="h-5 w-5" />} />
            <UiKpiCard label="Overdue Tasks" value={overdueTasks} icon={<Clock className="h-5 w-5" />} className={overdueTasks > 0 ? "border-rose-200 bg-rose-50/50" : ""} />
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">All Projects</h2>
            <span className="text-xs text-gray-500">{totalProjects} project{totalProjects !== 1 ? "s" : ""}</span>
          </div>
          {projectsWithCounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16"><Briefcase className="h-10 w-10 text-gray-300 mb-3" /><p className="text-sm text-gray-500">No projects yet</p></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projectsWithCounts.map(({ project, ownerName, totalTasks: tt, taskCounts }) => (
                <UiProjectCard key={project.id} name={project.name} owner={ownerName} status={STATUS_LABEL[project.status] ?? project.status} statusColor={STATUS_COLOR[project.status]} priority={project.strategicPriority} totalTasks={tt} taskCounts={taskCounts} onClick={() => navigate(`/projects/${project.id}`)} />
              ))}
            </div>
          )}
        </>
      )}

      {view === "executive" && (
        <>
          <p className="text-sm text-gray-500">{executiveRows.length} projects (all statuses)</p>
          {executiveRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16"><Briefcase className="h-10 w-10 text-gray-300 mb-3" /><p className="text-sm text-gray-500">No projects</p></div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
                  {executiveRows.map(({ project, ownerName, totalTasks: tt, completedCount, hasOverdue, hasReportThisWeek, lastComment, deadline }) => {
                    const pct = tt > 0 ? Math.round((completedCount / tt) * 100) : 0;
                    return (
                      <tr key={project.id} className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{project.name}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${STATUS_COLOR[project.status] ?? "bg-gray-100 text-gray-600"}`}>{STATUS_LABEL[project.status] ?? project.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{ownerName}</td>
                        <td className="px-4 py-3">{deadline ? <span className={`text-xs font-medium ${deadline.color}`}>{deadline.label}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-700">{completedCount} / {tt}</span>
                            <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center"><span className="text-sm">{hasReportThisWeek ? "✅" : "❌"}</span></td>
                        <td className="px-4 py-3">{lastComment ? <p className="text-xs text-gray-500 italic truncate max-w-[200px]">{lastComment.length > 60 ? lastComment.slice(0, 60) + "…" : lastComment}</p> : <span className="text-xs text-gray-400">—</span>}</td>
                        <td className="px-4 py-3 text-center">{hasOverdue ? <AlertTriangle className="h-4 w-4 text-amber-500 inline-block" /> : <span className="text-xs text-emerald-500">OK</span>}</td>
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
