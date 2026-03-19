import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
          return {
            project,
            ownerName: owner?.name ?? "Unknown",
            totalTasks: tasks.length,
            taskCounts: [
              { label: "To Do", count: todo, color: "bg-gray-400" },
              { label: "In Progress", count: inProgress, color: "bg-blue-500" },
              { label: "Done", count: done, color: "bg-emerald-500" },
            ],
          };
        }),
    [state.projects, state.tasks, userById],
  );

  return (
    <div>
      <UiPageHeader
        title="Projects & Tasks"
        subtitle="Overview of projects and their tasks"
        actions={
          <button
            onClick={() => navigate("/tasks/all")}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
              <rect x="2" y="3" width="12" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
              <rect x="2" y="7" width="12" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
              <rect x="2" y="11" width="8" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            View All Tasks
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiKpiCard
          label="Total Projects"
          value={totalProjects}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 4V2.5A1.5 1.5 0 017.5 1h5A1.5 1.5 0 0114 2.5V4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          }
        />
        <UiKpiCard
          label="Total Tasks"
          value={totalTasks}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 5H16M4 10H16M4 15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
        <UiKpiCard
          label="Overdue Tasks"
          value={overdueTasks}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6V10L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          className={overdueTasks > 0 ? "border-rose-200 bg-rose-50/50" : ""}
        />
      </div>

      {/* Projects Grid */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Projects</h2>
        <span className="text-xs text-gray-500">{totalProjects} project{totalProjects !== 1 ? "s" : ""}</span>
      </div>

      {projectsWithCounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">No projects yet.</p>
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
              onClick={() => navigate(`/reports`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
