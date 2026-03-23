import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, CheckSquare, ChevronRight, Clock, Eye, LayoutGrid, Plus, Shield } from "lucide-react";
import { useAppStore } from "../../store/db";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { UiProjectCard } from "../../ui/UiProjectCard";
import { ProjectFormModal } from "./ProjectFormModal";

const STATUS_COLOR: Record<string, string> = { InProgress: "bg-blue-100 text-blue-700", Paused: "bg-amber-100 text-amber-700", Completed: "bg-emerald-100 text-emerald-700" };
const PRIORITY_CLR: Record<string, string> = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-gray-100 text-gray-500" };
const RISK_CLR: Record<string, string> = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-emerald-50 text-emerald-700" };

type ViewMode = "team" | "executive";

export function ProjectsAndTasksPage() {
  const state = useAppStore();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("team");
  const [showForm, setShowForm] = useState(false);

  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);
  const totalProjects = state.projects.length;
  const totalTasks = state.tasks.length;
  const overdueTasks = useMemo(() => { const now = new Date().toISOString(); return state.tasks.filter((t) => t.dueAt && t.dueAt < now && t.status !== "Done" && t.status !== "Completed" && !t.archivedAt).length; }, [state.tasks]);

  const projectsWithCounts = useMemo(() => state.projects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((project) => {
    const tasks = state.tasks.filter((t) => t.projectId === project.id);
    const todo = tasks.filter((t) => t.status === "Backlog" || t.status === "Open").length;
    const inProgress = tasks.filter((t) => t.status === "InProgress").length;
    const done = tasks.filter((t) => t.status === "Done" || t.status === "Completed").length;
    const owner = userById.get(project.ownerUserId);
    return { project, ownerName: owner?.name ?? "Unknown", totalTasks: tasks.length, taskCounts: [{ label: "To Do", count: todo, color: "bg-gray-400" }, { label: "In Progress", count: inProgress, color: "bg-blue-500" }, { label: "Done", count: done, color: "bg-emerald-500" }] };
  }), [state.projects, state.tasks, userById]);

  const executiveCards = useMemo(() => state.projects.filter((p) => p.status === "InProgress").map((project) => {
    const reports = state.projectWeeklyReports.filter((r) => r.projectId === project.id).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
    const latest = reports[0] ?? null;
    const aiShortText = latest?.aiSummary?.shortText ?? null;
    const riskLevel = latest?.managerSummary?.riskLevel ?? null;
    const coverage = (() => { if (!latest) return { submitted: 0, total: 4 }; let s = 0; if (latest.roleReports.technical?.submittedAt) s++; if (latest.roleReports.sales?.submittedAt) s++; if (latest.roleReports.product?.submittedAt) s++; if (latest.managerSummary?.submittedAt) s++; return { submitted: s, total: 4 }; })();
    const owner = userById.get(project.ownerUserId);
    return { project, aiShortText, riskLevel, coverage, ownerName: owner?.name ?? "Unknown" };
  }), [state.projects, state.projectWeeklyReports, userById]);

  return (
    <div className="space-y-6">
      <UiPageHeader
        title="Projects"
        subtitle={`${totalProjects} active projects`}
        actions={
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition">
            <Plus className="h-4 w-4" /> New Project
          </button>
        }
      />

      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button onClick={() => setView("team")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "team" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><LayoutGrid className="h-4 w-4" /> Team View</button>
        <button onClick={() => setView("executive")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "executive" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><Eye className="h-4 w-4" /> Executive View</button>
      </div>

      {/* Team View */}
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
              <Briefcase className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No projects yet</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projectsWithCounts.map(({ project, ownerName, totalTasks: taskTotal, taskCounts }) => (
                <UiProjectCard key={project.id} name={project.name} owner={ownerName} status={project.status === "InProgress" ? "In Progress" : project.status} statusColor={STATUS_COLOR[project.status]} priority={project.strategicPriority} totalTasks={taskTotal} taskCounts={taskCounts} onClick={() => navigate(`/projects/${project.id}`)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Executive View */}
      {view === "executive" && (
        <>
          <p className="text-sm text-gray-500">{executiveCards.length} active projects</p>
          {executiveCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
              <Briefcase className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No active projects</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {executiveCards.map(({ project, aiShortText, riskLevel, coverage, ownerName }) => (
                <div key={project.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-indigo-200 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{project.name}</h3><p className="text-xs text-gray-500 mt-0.5">{ownerName}</p></div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ml-2 ${PRIORITY_CLR[project.strategicPriority] ?? "bg-gray-100 text-gray-500"}`}>{project.strategicPriority}</span>
                  </div>
                  <div className="mb-3"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">AI Summary</p>{aiShortText ? <p className="text-xs text-gray-600 line-clamp-3">{aiShortText}</p> : <p className="text-xs text-gray-400 italic">No AI summary yet</p>}</div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-gray-400" /><span className="text-[10px] text-gray-500">Risk:</span>{riskLevel ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RISK_CLR[riskLevel] ?? "bg-gray-100 text-gray-500"}`}>{riskLevel}</span> : <span className="text-[10px] text-gray-400">—</span>}</div>
                    <div className="flex items-center gap-1"><span className="text-[10px] text-gray-500">{coverage.submitted} / {coverage.total} submitted</span><div className="flex gap-0.5">{Array.from({ length: coverage.total }).map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < coverage.submitted ? "bg-emerald-500" : "bg-gray-200"}`} />)}</div></div>
                  </div>
                  <Link to={`/projects/${project.id}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition">View Report <ChevronRight className="h-3.5 w-3.5" /></Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && <ProjectFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
