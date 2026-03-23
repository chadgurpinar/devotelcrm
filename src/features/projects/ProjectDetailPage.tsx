import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckSquare, Clock, FolderOpen, Pencil, Plus, AlertTriangle } from "lucide-react";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { Task, TaskPriority, TaskStatus, TaskVisibility } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { TaskDrawer, TaskDrawerDraft } from "../tasks/TaskDrawer";

type DetailTab = "Overview" | "Tasks" | "Weekly Reports";

const STATUS_BADGE: Record<string, string> = {
  InProgress: "bg-blue-50 text-blue-700",
  Paused: "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

const TASK_STATUS_BADGE: Record<string, string> = {
  Backlog: "bg-gray-100 text-gray-600",
  Open: "bg-blue-50 text-blue-700",
  InProgress: "bg-indigo-50 text-indigo-700",
  Done: "bg-emerald-50 text-emerald-700",
  Completed: "bg-emerald-100 text-emerald-800",
  Archived: "bg-amber-50 text-amber-700",
};

const PRIORITY_BADGE: Record<string, string> = {
  Critical: "bg-rose-50 text-rose-700",
  High: "bg-orange-50 text-orange-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-gray-100 text-gray-500",
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const state = useAppStore();
  const [tab, setTab] = useState<DetailTab>("Overview");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const project = state.projects.find((p) => p.id === projectId);
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);

  const projectTasks = useMemo(
    () => state.tasks.filter((t) => t.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.tasks, projectId],
  );

  const doneTasks = projectTasks.filter((t) => t.status === "Done" || t.status === "Completed").length;
  const overdueTasks = projectTasks.filter((t) => t.dueAt && t.dueAt < new Date().toISOString() && t.status !== "Done" && t.status !== "Completed").length;

  const projectReports = useMemo(
    () => state.projectWeeklyReports.filter((r) => r.projectId === projectId).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)),
    [state.projectWeeklyReports, projectId],
  );

  const selectedTask = selectedTaskId ? state.tasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const commentsByTaskId = useMemo(() => {
    const map = new Map<string, typeof state.taskComments>();
    state.taskComments.forEach((c) => { const l = map.get(c.taskId) ?? []; l.push(c); map.set(c.taskId, l); });
    return map;
  }, [state.taskComments]);

  const saveTaskDetail = useCallback(
    (task: Task, draft: TaskDrawerDraft) => {
      state.updateTask({ ...task, title: draft.title.trim(), description: draft.description.trim(), status: draft.status, priority: draft.priority, dueAt: draft.dueAt ? new Date(`${draft.dueAt}T12:00:00`).toISOString() : undefined, assigneeUserId: draft.assigneeUserId, visibility: draft.visibility, watcherUserIds: draft.watcherUserIds, isUrgent: draft.isUrgent, labelIds: draft.labelIds });
    }, [state],
  );

  function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    state.createTask({ title: newTaskTitle.trim(), description: "", status: "Backlog", priority: "Medium" as TaskPriority, createdByUserId: state.activeUserId, assigneeUserId: state.activeUserId, visibility: "Shared" as TaskVisibility, kanbanStage: "Backlog", projectId });
    setNewTaskTitle("");
    setShowCreateTask(false);
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-gray-500 mb-3">Project not found.</p>
        <Link to="/projects" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">← Back to Projects</Link>
      </div>
    );
  }

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition">← Projects</Link>

      <UiPageHeader
        title={project.name}
        subtitle={`${project.status === "InProgress" ? "In Progress" : project.status} · ${project.strategicPriority} priority`}
        actions={
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-600"}`}>{project.status === "InProgress" ? "In Progress" : project.status}</span>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["Overview", "Tasks", "Weekly Reports"] as DetailTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{t}</button>
        ))}
      </div>

      {/* TAB: Overview */}
      {tab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Project Details */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Project Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Name</p><p className="text-sm font-medium text-gray-900">{project.name}</p></div>
                <div><p className="text-xs text-gray-500">Status</p><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-600"}`}>{project.status === "InProgress" ? "In Progress" : project.status}</span></div>
                <div><p className="text-xs text-gray-500">Strategic Priority</p><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${project.strategicPriority === "High" ? "bg-rose-50 text-rose-700" : project.strategicPriority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{project.strategicPriority}</span></div>
                <div><p className="text-xs text-gray-500">Created</p><p className="text-sm text-gray-700">{new Date(project.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
              </div>
              {project.description && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm text-gray-700">{project.description}</p></div>}
            </div>

            {/* Project Responsibles */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Project Responsibles</h3>
              <div className="space-y-3">
                {[
                  { label: "Owner", userId: project.ownerUserId },
                  { label: "Technical Lead", userId: project.technicalResponsibleUserId },
                  { label: "Sales Lead", userId: project.salesResponsibleUserId },
                  { label: "Product Lead", userId: project.productResponsibleUserId },
                ].map((r) => {
                  const user = userById.get(r.userId);
                  if (!user) return null;
                  return (
                    <div key={r.label} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 flex-shrink-0">{initials(user.name)}</div>
                      <div><p className="text-xs text-gray-500">{r.label}</p><p className="text-sm font-medium text-gray-900">{user.name}</p></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column: KPIs + Activity */}
          <div className="space-y-5">
            <div className="space-y-3">
              {[
                { label: "Total Tasks", value: projectTasks.length },
                { label: "Done", value: doneTasks },
                { label: "Overdue", value: overdueTasks },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.label === "Overdue" && kpi.value > 0 ? "text-rose-600" : "text-gray-900"}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Activity</h3>
              {projectTasks.slice(0, 5).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-2">
                  {projectTasks.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-700 truncate">{t.title}</p>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${TASK_STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{timeAgo(t.updatedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Tasks */}
      {tab === "Tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowCreateTask(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
              <Plus className="h-4 w-4" /> Add Task
            </button>
          </div>

          {projectTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
              <CheckSquare className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-3">No tasks for this project yet</p>
              <button onClick={() => setShowCreateTask(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
                <Plus className="h-4 w-4" /> Add Task
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {projectTasks.map((t) => {
                    const assignee = userById.get(t.assigneeUserId);
                    const isOverdue = t.dueAt && t.dueAt < new Date().toISOString() && t.status !== "Done" && t.status !== "Completed";
                    return (
                      <tr key={t.id} className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => setSelectedTaskId(t.id)}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{t.title}</p>
                          {t.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-600">{initials(assignee.name)}</div>
                              <span className="text-sm text-gray-700">{assignee.name}</span>
                            </div>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TASK_STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status === "InProgress" ? "In Progress" : t.status}</span></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[t.priority] ?? "bg-gray-100 text-gray-500"}`}>{t.priority}</span></td>
                        <td className="px-4 py-3">{t.dueAt ? <span className={`text-xs ${isOverdue ? "font-medium text-rose-600" : "text-gray-600"}`}>{new Date(t.dueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">{projectTasks.length} tasks</div>
            </div>
          )}

          {/* Quick create task modal */}
          {showCreateTask && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowCreateTask(false)}>
              <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Add Task to {project.name}</h3>
                <div className="space-y-3">
                  <div><label className="mb-1 block text-xs font-medium text-gray-500">Task Title</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} autoFocus /></div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowCreateTask(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleCreateTask} disabled={!newTaskTitle.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Add Task</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Weekly Reports */}
      {tab === "Weekly Reports" && (
        <div>
          {projectReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
              <FolderOpen className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">Weekly reports will appear here</p>
              <p className="text-xs text-gray-400 mt-1">Coming soon</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectReports.map((report) => (
                <div key={report.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">Week of {report.weekStartDate}</h3>
                    <span className="text-xs text-gray-400">{timeAgo(report.updatedAt)}</span>
                  </div>
                  {report.managerSummary && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Executive Summary</p>
                      <p className="text-sm text-gray-700">{report.managerSummary.executiveSummaryText}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${report.managerSummary.riskLevel === "High" ? "bg-rose-50 text-rose-700" : report.managerSummary.riskLevel === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>Risk: {report.managerSummary.riskLevel}</span>
                        {report.managerSummary.blockers.length > 0 && <span className="flex items-center gap-1 text-[10px] text-rose-600"><AlertTriangle className="h-3 w-3" />{report.managerSummary.blockers.length} blockers</span>}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-3">
                    {(["technical", "sales", "product"] as const).map((role) => {
                      const r = report.roleReports[role];
                      if (!r) return null;
                      const author = userById.get(r.authorUserId);
                      return (
                        <div key={role} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[8px] font-bold text-indigo-600">{author ? initials(author.name) : "?"}</div>
                            <p className="text-xs font-semibold text-gray-700 capitalize">{role}</p>
                          </div>
                          {r.achievements.length > 0 && <p className="text-[11px] text-gray-600">✓ {r.achievements.slice(0, 2).join(", ")}{r.achievements.length > 2 ? ` +${r.achievements.length - 2}` : ""}</p>}
                          {r.blockers.length > 0 && <p className="text-[11px] text-rose-600 mt-0.5">⚠ {r.blockers.length} blocker{r.blockers.length > 1 ? "s" : ""}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          comments={commentsByTaskId.get(selectedTask.id) ?? []}
          attachments={state.taskAttachments.filter((a) => a.taskId === selectedTask.id)}
          users={state.users}
          labels={state.taskLabels}
          getUserName={(uid) => getUserName(state, uid)}
          onSave={saveTaskDetail}
          onClose={() => setSelectedTaskId(null)}
          onArchive={(t) => state.updateTask({ ...t, status: "Archived" })}
          onUnarchive={(t) => state.updateTask({ ...t, status: "Done", archivedAt: undefined })}
          onAddComment={(tid, text, kind) => state.addTaskComment(tid, text, kind)}
          onAddAttachment={(tid, file) => state.addTaskAttachment(tid, file, state.activeUserId)}
          onRemoveAttachment={(aid) => state.removeTaskAttachment(aid)}
        />
      )}
    </div>
  );
}
