import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, CheckSquare, Clock, Plus } from "lucide-react";
import { useAppStore } from "../../store/db";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { UiProjectCard } from "../../ui/UiProjectCard";

const STATUS_COLOR: Record<string, string> = {
  InProgress: "bg-blue-100 text-blue-700",
  Paused: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

export function ProjectsAndTasksPage() {
  const state = useAppStore();
  const navigate = useNavigate();

  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);

  const totalProjects = state.projects.length;
  const totalTasks = state.tasks.length;
  const overdueTasks = useMemo(() => {
    const now = new Date().toISOString();
    return state.tasks.filter((t) => t.dueAt && t.dueAt < now && t.status !== "Done" && t.status !== "Completed" && !t.archivedAt).length;
  }, [state.tasks]);

  const projectsWithCounts = useMemo(
    () =>
      state.projects
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((project) => {
          const tasks = state.tasks.filter((t) => t.projectId === project.id);
          const todo = tasks.filter((t) => t.status === "Backlog" || t.status === "Open").length;
          const inProgress = tasks.filter((t) => t.status === "InProgress").length;
          const done = tasks.filter((t) => t.status === "Done" || t.status === "Completed").length;
          const owner = userById.get(project.ownerUserId);
          return { project, ownerName: owner?.name ?? "Unknown", totalTasks: tasks.length, taskCounts: [
            { label: "To Do", count: todo, color: "bg-gray-400" },
            { label: "In Progress", count: inProgress, color: "bg-blue-500" },
            { label: "Done", count: done, color: "bg-emerald-500" },
          ] };
        }),
    [state.projects, state.tasks, userById],
  );

  return (
    <div className="space-y-6">
      <UiPageHeader
        title="Projects"
        subtitle={`${totalProjects} active projects`}
        actions={
          <button onClick={() => alert("Coming soon")} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition">
            <Plus className="h-4 w-4" /> New Project
          </button>
        }
      />

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
            <UiProjectCard
              key={project.id}
              name={project.name}
              owner={ownerName}
              status={project.status === "InProgress" ? "In Progress" : project.status}
              statusColor={STATUS_COLOR[project.status]}
              priority={project.strategicPriority}
              totalTasks={taskTotal}
              taskCounts={taskCounts}
              onClick={() => navigate(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
