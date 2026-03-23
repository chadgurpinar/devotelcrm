import { useCallback, useMemo, useState } from "react";
import { CheckSquare, Clock, LayoutGrid, Plus, Search, User, Users, X, AlertCircle } from "lucide-react";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { Task, TaskPriority, TaskStatus, TaskVisibility } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { TaskDrawer, TaskDrawerDraft } from "./TaskDrawer";
import { TaskKanbanBoard } from "./TaskKanbanBoard";

const ALL_STATUSES: TaskStatus[] = ["Backlog", "Open", "InProgress", "Done", "Completed", "Archived"];
const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const STATUS_BADGE: Record<string, string> = { Backlog: "bg-gray-100 text-gray-600", Open: "bg-blue-50 text-blue-700", InProgress: "bg-indigo-50 text-indigo-700", Done: "bg-emerald-50 text-emerald-700", Completed: "bg-emerald-100 text-emerald-800", Archived: "bg-gray-50 text-gray-500" };
const PRIORITY_BADGE: Record<string, string> = { Critical: "bg-rose-50 text-rose-700", High: "bg-orange-50 text-orange-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-gray-100 text-gray-500" };

type ViewMode = "my" | "team" | "board";
const VIEW_KEY = "all-tasks-view-mode";
function getStoredView(): ViewMode { try { const v = localStorage.getItem(VIEW_KEY); if (v === "my" || v === "team" || v === "board") return v; } catch { /* */ } return "my"; }

function dueBadge(dueAt: string | undefined, status: string): { label: string; cls: string } | null {
  if (!dueAt) return null;
  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueAt); const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  const short = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (status === "Done" || status === "Completed") return { label: short, cls: "bg-gray-100 text-gray-500" };
  if (diff < 0) return { label: `Overdue · ${short}`, cls: "bg-rose-50 text-rose-700" };
  if (diff === 0) return { label: "Due today", cls: "bg-amber-50 text-amber-700" };
  if (diff <= 3) return { label: `Due ${short}`, cls: "bg-yellow-50 text-yellow-700" };
  return { label: short, cls: "bg-gray-100 text-gray-600" };
}

export function AllTasksPage() {
  const state = useAppStore();
  const [view, setView] = useState<ViewMode>(getStoredView);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | TaskStatus>("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"" | TaskPriority>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function setViewPersisted(v: ViewMode) { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* */ } }

  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);
  const projectById = useMemo(() => new Map(state.projects.map((p) => [p.id, p])), [state.projects]);
  const isTerminal = (s: string) => s === "Done" || s === "Completed" || s === "Archived";

  const viewTasks = useMemo(() => {
    if (view === "my") return state.tasks.filter((t) => !isTerminal(t.status) && (t.assigneeUserId === state.activeUserId || t.createdByUserId === state.activeUserId));
    return state.tasks.filter((t) => !isTerminal(t.status));
  }, [state.tasks, state.activeUserId, view]);

  const filtered = useMemo(() => {
    let d = viewTasks;
    if (search.trim()) { const q = search.trim().toLowerCase(); d = d.filter((t) => t.title.toLowerCase().includes(q)); }
    if (statusFilter) d = d.filter((t) => t.status === statusFilter);
    if (assigneeFilter) d = d.filter((t) => t.assigneeUserId === assigneeFilter);
    if (priorityFilter) d = d.filter((t) => t.priority === priorityFilter);
    return d.sort((a, b) => { if (a.isUrgent && !b.isUrgent) return -1; if (!a.isUrgent && b.isUrgent) return 1; return b.updatedAt.localeCompare(a.updatedAt); });
  }, [viewTasks, search, statusFilter, assigneeFilter, priorityFilter]);

  const now = new Date().toISOString();
  const openCount = viewTasks.length;
  const overdueCount = viewTasks.filter((t) => t.dueAt && t.dueAt < now).length;
  const dueThisWeek = viewTasks.filter((t) => t.dueAt && t.dueAt >= now && t.dueAt <= new Date(Date.now() + 7 * 86400000).toISOString()).length;

  const assignees = useMemo(() => { const ids = new Set(state.tasks.map((t) => t.assigneeUserId)); return state.users.filter((u) => ids.has(u.id)).sort((a, b) => a.name.localeCompare(b.name)); }, [state.tasks, state.users]);
  const hasFilters = search || statusFilter || assigneeFilter || priorityFilter;

  const selectedTask = selectedTaskId ? state.tasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const commentsByTaskId = useMemo(() => { const m = new Map<string, typeof state.taskComments>(); state.taskComments.forEach((c) => { const l = m.get(c.taskId) ?? []; l.push(c); m.set(c.taskId, l); }); return m; }, [state.taskComments]);

  const saveTaskDetail = useCallback((task: Task, draft: TaskDrawerDraft) => {
    state.updateTask({ ...task, title: draft.title.trim(), description: draft.description.trim(), status: draft.status, priority: draft.priority, dueAt: draft.dueAt ? new Date(`${draft.dueAt}T12:00:00`).toISOString() : undefined, assigneeUserId: draft.assigneeUserId, visibility: draft.visibility, watcherUserIds: draft.watcherUserIds, isUrgent: draft.isUrgent, labelIds: draft.labelIds });
  }, [state]);

  function handleCreate() { if (!newTitle.trim()) return; state.createTask({ title: newTitle.trim(), description: "", status: "Backlog", priority: "Medium" as TaskPriority, createdByUserId: state.activeUserId, assigneeUserId: state.activeUserId, visibility: "Shared" as TaskVisibility, kanbanStage: "Backlog" }); setNewTitle(""); setShowCreate(false); }

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <UiPageHeader
        title="All Tasks"
        subtitle="Complete view of all team tasks"
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{state.tasks.length} total</span>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
              <Plus className="h-4 w-4" /> Create Task
            </button>
          </div>
        }
      />

      {/* View Selector */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {([
          { key: "my" as const, label: "My View", Icon: User },
          { key: "team" as const, label: "Team View", Icon: Users },
          { key: "board" as const, label: "Board", Icon: LayoutGrid },
        ]).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setViewPersisted(key)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiKpiCard label="Open Tasks" value={openCount} icon={<CheckSquare className="h-5 w-5" />} />
        <UiKpiCard label="Overdue" value={overdueCount} icon={<AlertCircle className="h-5 w-5" />} className={overdueCount > 0 ? "border-rose-200 bg-rose-50/40" : ""} />
        <UiKpiCard label="Due This Week" value={dueThisWeek} icon={<Clock className="h-5 w-5" />} className={dueThisWeek > 0 ? "border-amber-200 bg-amber-50/40" : ""} />
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56 relative">
            <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input className={`${inputCls} pl-9`} placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="w-36"><label className="mb-1 block text-xs font-medium text-gray-500">Status</label><select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}><option value="">All</option>{ALL_STATUSES.filter((s) => !isTerminal(s)).map((s) => <option key={s} value={s}>{s === "InProgress" ? "In Progress" : s}</option>)}</select></div>
          <div className="w-40"><label className="mb-1 block text-xs font-medium text-gray-500">Assignee</label><select className={inputCls} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}><option value="">All</option>{assignees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="w-36"><label className="mb-1 block text-xs font-medium text-gray-500">Priority</label><select className={inputCls} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "")}><option value="">All</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
          {hasFilters && <button onClick={() => { setSearch(""); setStatusFilter(""); setAssigneeFilter(""); setPriorityFilter(""); }} className="text-xs text-indigo-600 hover:underline self-end pb-2">Clear filters</button>}
        </div>
      </div>

      {/* Content */}
      {view === "board" ? (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
            <LayoutGrid className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No tasks to display</p>
          </div>
        ) : (
          <TaskKanbanBoard tasks={filtered} users={state.users} labels={state.taskLabels} onUpdateTask={(id, patch) => { const t = state.tasks.find((t) => t.id === id); if (t) state.updateTask({ ...t, ...patch }); }} onOpenTask={(t) => setSelectedTaskId(t.id)} getUserName={(uid) => getUserName(state, uid)} />
        )
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
          {view === "my" ? <CheckSquare className="h-10 w-10 text-gray-300 mb-3" /> : <Users className="h-10 w-10 text-gray-300 mb-3" />}
          <p className="text-sm text-gray-500">{view === "my" ? "You have no active tasks" : "No active team tasks found"}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const user = userById.get(t.assigneeUserId);
                  const project = t.projectId ? projectById.get(t.projectId) : undefined;
                  const urgent = t.isUrgent === true;
                  const overdue = t.dueAt && t.dueAt < now && !isTerminal(t.status);
                  const rowCls = urgent ? "bg-rose-50 border-l-4 border-l-rose-500" : overdue ? "bg-amber-50/50" : "";
                  const db = dueBadge(t.dueAt, t.status);
                  return (
                    <tr key={t.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition-colors cursor-pointer ${rowCls}`} onClick={() => setSelectedTaskId(t.id)}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{t.title}</p>
                        {t.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>}
                        <div className="flex gap-1 mt-1">{urgent && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-700">URGENT</span>}{(t.labelIds ?? []).map((lid) => { const l = state.taskLabels.find((l) => l.id === lid); return l ? <span key={l.id} className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${l.color}`}>{l.name}</span> : null; })}</div>
                      </td>
                      <td className="px-4 py-3">{project ? <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{project.name}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                      <td className="px-4 py-3">{user ? <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">{initials(user.name)}</div><span className="text-sm text-gray-700">{user.name}</span></div> : <span className="text-xs text-gray-400">—</span>}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status === "InProgress" ? "In Progress" : t.status}</span></td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[t.priority] ?? "bg-gray-100 text-gray-500"}`}>{t.priority}</span></td>
                      <td className="px-4 py-3">{db ? <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${db.cls}`}>{db.label}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">{filtered.length} tasks</div>
        </div>
      )}

      {/* Create task modal */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Create Task</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition"><X className="h-5 w-5" /></button>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Task Title</label><input className={inputCls} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus /></div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleCreate} disabled={!newTitle.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Create Task</button>
            </div>
          </div>
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
