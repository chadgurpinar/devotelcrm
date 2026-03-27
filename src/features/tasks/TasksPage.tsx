import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Tag, List, LayoutGrid, Search, X } from "lucide-react";
import { useAppStore } from "../../store/db";
import { getCompanyName, getEventName, getProjectName, getUserName } from "../../store/selectors";
import { Task, TaskLabel, TaskPriority, TaskStatus, TaskVisibility } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { MultiSelectDropdown } from "../../ui/MultiSelectDropdown";
import { TaskDrawer } from "./TaskDrawer";
import { TaskKanbanBoard } from "./TaskKanbanBoard";

const TASKS_VIEW_MODE_KEY = "tasks-view-mode";
type TasksViewMode = "LIST" | "KANBAN";
const LABEL_COLOR_PRESETS = ["bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-cyan-500", "bg-slate-500", "bg-pink-500"];
const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function isProjectLabel(label: TaskLabel, projectNames: Set<string>): boolean { return projectNames.has(label.name); }

type TaskSection = "MyTasks" | "ProjectTasks" | "AssignedToMe" | "AssignedByMe" | "Completed" | "Starred";
type DueFilter = "Any" | "DueSoon" | "Overdue" | "NoDueDate";
type LinkedFilter = "Any" | "Company" | "Event" | "Interconnection" | "Project";
type SortBy = "DueDateAsc" | "CreatedDateDesc" | "PriorityDesc" | "LastActivityDesc";
type CreateTaskForm = { title: string; description: string; assigneeUserId: string; priority: TaskPriority; dueAt: string; visibility: TaskVisibility; linkedType: "None" | "Company" | "Event" | "Interconnection" | "Project"; linkedId: string; initialComment: string; isUrgent: boolean; labelIds: string[] };

const priorityWeight: Record<TaskPriority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const STATUS_BADGE: Record<string, string> = { Backlog: "bg-gray-100 text-gray-600", ToDo: "bg-blue-50 text-blue-700", InProgress: "bg-indigo-50 text-indigo-700", Done: "bg-emerald-50 text-emerald-700", Cancelled: "bg-rose-50 text-rose-600" };
const PRIORITY_BADGE: Record<TaskPriority, string> = { Critical: "bg-rose-50 text-rose-700", High: "bg-orange-50 text-orange-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-gray-100 text-gray-500" };

function isDueSoon(dueAt?: string): boolean { if (!dueAt) return false; const now = Date.now(); const due = new Date(dueAt).getTime(); return due >= now && due <= now + 7 * 86400000; }
function isOverdue(task: Task): boolean { if (task.status === "Done" || task.status === "Cancelled" || !task.dueAt) return false; return new Date(task.dueAt).getTime() < Date.now(); }
function dueDateBadgeInfo(task: Task): { label: string; className: string } | null { if (!task.dueAt || task.status === "Done" || task.status === "Cancelled") return null; const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const due = new Date(task.dueAt); const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()); const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000); const short = due.toLocaleDateString("en-US", { month: "short", day: "numeric" }); if (diffDays < 0) return { label: `Overdue · ${short}`, className: "bg-rose-50 text-rose-700" }; if (diffDays === 0) return { label: "Due today", className: "bg-amber-50 text-amber-700" }; if (diffDays <= 3) return { label: `Due ${short}`, className: "bg-yellow-50 text-yellow-700" }; return { label: `Due ${short}`, className: "bg-gray-100 text-gray-600" }; }
function emptyCreateTaskForm(activeUserId: string): CreateTaskForm { return { title: "", description: "", assigneeUserId: activeUserId, priority: "Medium", dueAt: "", visibility: "Private", linkedType: "None", linkedId: "", initialComment: "", isUrgent: false, labelIds: [] }; }
function getStoredViewMode(): TasksViewMode { try { const s = localStorage.getItem(TASKS_VIEW_MODE_KEY); if (s === "LIST" || s === "KANBAN") return s; } catch { /* */ } return "LIST"; }

const SECTION_TABS: { key: TaskSection; label: string }[] = [
  { key: "MyTasks", label: "My Tasks" },
  { key: "ProjectTasks", label: "Project Tasks" },
  { key: "AssignedToMe", label: "Assigned to Me" },
  { key: "AssignedByMe", label: "Assigned by Me" },
  { key: "Completed", label: "Completed" },
  { key: "Starred", label: "Starred" },
];

export function TasksPage() {
  const state = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<TasksViewMode>(getStoredViewMode);
  const [section, setSection] = useState<TaskSection>("MyTasks");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "Any">("Any");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "Any">("Any");
  const [dueFilter, setDueFilter] = useState<DueFilter>("Any");
  const [linkedFilter, setLinkedFilter] = useState<LinkedFilter>("Any");
  const [labelFilter, setLabelFilter] = useState<string>(() => searchParams.get("labelId") ?? "Any");
  const [projectFilter, setProjectFilter] = useState("Any");
  const [sortBy, setSortBy] = useState<SortBy>("LastActivityDesc");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState<CreateTaskForm>(() => emptyCreateTaskForm(state.activeUserId));
  const [isLabelManagerOpen, setLabelManagerOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLOR_PRESETS[0]);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState("");

  useEffect(() => { const taskId = searchParams.get("taskId"); if (taskId) { setSelectedTaskId(taskId); setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete("taskId"); return next; }); } }, []);

  const activeUserId = state.activeUserId;
  const activeUser = state.users.find((u) => u.id === activeUserId);
  const isSuperAdmin = activeUser?.role === "SuperAdmin";

  const myProjects = useMemo(() => state.projects.filter((p) => isSuperAdmin || p.ownerUserId === activeUserId || p.managerUserIds.includes(activeUserId) || p.technicalResponsibleUserId === activeUserId || p.salesResponsibleUserId === activeUserId || p.productResponsibleUserId === activeUserId || (p.watcherUserIds ?? []).includes(activeUserId) || (p.responsibleRoles ?? []).some((r) => r.userId === activeUserId)), [state.projects, activeUserId, isSuperAdmin]);
  const myProjectIds = useMemo(() => new Set(myProjects.map((p) => p.id)), [myProjects]);

  const projectNames = useMemo(() => new Set(state.projects.map((p) => p.name)), [state.projects]);
  const setViewModePersisted = useCallback((mode: TasksViewMode) => { setViewMode(mode); try { localStorage.setItem(TASKS_VIEW_MODE_KEY, mode); } catch { /* */ } }, []);
  const commentsByTaskId = useMemo(() => { const map = new Map<string, typeof state.taskComments>(); state.taskComments.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((c) => { const l = map.get(c.taskId) ?? []; l.push(c); map.set(c.taskId, l); }); return map; }, [state.taskComments]);
  const selectedTask = useMemo(() => state.tasks.find((t) => t.id === selectedTaskId) ?? null, [selectedTaskId, state.tasks]);
  const linkedOptions = useMemo(() => { switch (form.linkedType) { case "Company": return state.companies.map((c) => ({ id: c.id, label: c.name })); case "Event": return state.events.map((e) => ({ id: e.id, label: e.name })); case "Interconnection": return state.interconnectionProcesses.map((p) => ({ id: p.id, label: `${getCompanyName(state, p.companyId)} (${p.track})` })); case "Project": return state.projects.map((p) => ({ id: p.id, label: p.name })); default: return []; } }, [form.linkedType, state]);

  useEffect(() => { if (!linkedOptions.length) { if (form.linkedId) setForm((p) => ({ ...p, linkedId: "" })); return; } if (form.linkedId && linkedOptions.some((o) => o.id === form.linkedId)) return; setForm((p) => ({ ...p, linkedId: linkedOptions[0]?.id ?? "" })); }, [form.linkedId, linkedOptions]);

  const isCompletedSection = section === "Completed";
  const isStarredSection = section === "Starred";
  const isSpecialSection = isCompletedSection || isStarredSection;

  useEffect(() => { if (isSpecialSection) setViewModePersisted("LIST"); }, [isSpecialSection, setViewModePersisted]);

  const isActive = (t: Task) => t.status !== "Cancelled" && !t.completedAt;

  const sectionTasks = useMemo(() => {
    if (isCompletedSection) return state.tasks.filter((t) => t.completedAt);
    if (isStarredSection) return state.tasks.filter((t) => t.archivedAt);
    if (section === "ProjectTasks") {
      let tasks = state.tasks.filter((t) => t.projectId && myProjectIds.has(t.projectId) && isActive(t));
      if (projectFilter !== "Any") tasks = tasks.filter((t) => t.projectId === projectFilter);
      return tasks;
    }
    if (section === "AssignedToMe") return state.tasks.filter((t) => isActive(t) && t.assigneeUserId === activeUserId && t.createdByUserId !== activeUserId);
    if (section === "AssignedByMe") return state.tasks.filter((t) => isActive(t) && t.createdByUserId === activeUserId && t.assigneeUserId !== activeUserId);
    return state.tasks.filter((t) => isActive(t) && t.createdByUserId === activeUserId && t.assigneeUserId === activeUserId);
  }, [section, state.tasks, activeUserId, myProjectIds, projectFilter, isCompletedSection, isStarredSection]);

  const rows = useMemo(() => {
    let d = sectionTasks;
    if (statusFilter !== "Any") d = d.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "Any") d = d.filter((t) => t.priority === priorityFilter);
    if (dueFilter === "DueSoon") d = d.filter((t) => isDueSoon(t.dueAt));
    if (dueFilter === "Overdue") d = d.filter((t) => isOverdue(t));
    if (dueFilter === "NoDueDate") d = d.filter((t) => !t.dueAt);
    if (linkedFilter === "Company") d = d.filter((t) => Boolean(t.companyId));
    if (linkedFilter === "Event") d = d.filter((t) => Boolean(t.eventId));
    if (linkedFilter === "Interconnection") d = d.filter((t) => Boolean(t.interconnectionProcessId));
    if (linkedFilter === "Project") d = d.filter((t) => Boolean(t.projectId));
    if (labelFilter !== "Any") d = d.filter((t) => (t.labelIds ?? []).includes(labelFilter));
    if (search.trim()) { const q = search.trim().toLowerCase(); d = d.filter((t) => { const cm = commentsByTaskId.get(t.id) ?? []; return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || cm.some((c) => c.content.toLowerCase().includes(q)); }); }
    return d.slice().sort((a, b) => { if (a.isUrgent && !b.isUrgent) return -1; if (!a.isUrgent && b.isUrgent) return 1; if (sortBy === "DueDateAsc") { if (!a.dueAt && !b.dueAt) return 0; if (!a.dueAt) return 1; if (!b.dueAt) return -1; return a.dueAt.localeCompare(b.dueAt); } if (sortBy === "CreatedDateDesc") return b.createdAt.localeCompare(a.createdAt); if (sortBy === "PriorityDesc") return priorityWeight[b.priority] - priorityWeight[a.priority]; return b.updatedAt.localeCompare(a.updatedAt); });
  }, [commentsByTaskId, dueFilter, labelFilter, linkedFilter, priorityFilter, search, sectionTasks, sortBy, statusFilter]);

  function handleCreateTask() {
    const title = form.title.trim(); if (!title) return;
    const lf = form.linkedType === "Company" ? { companyId: form.linkedId || undefined } : form.linkedType === "Event" ? { eventId: form.linkedId || undefined } : form.linkedType === "Interconnection" ? { interconnectionProcessId: form.linkedId || undefined } : form.linkedType === "Project" ? { projectId: form.linkedId || undefined } : {};
    state.createTask({ title, description: form.description.trim(), status: "Backlog", priority: form.priority, dueAt: form.dueAt ? new Date(`${form.dueAt}T12:00:00`).toISOString() : undefined, createdByUserId: activeUserId, assigneeUserId: form.assigneeUserId || activeUserId, visibility: form.visibility, isUrgent: form.isUrgent, kanbanStage: "Backlog", labelIds: form.labelIds.length > 0 ? form.labelIds : undefined, ...lf, initialComment: form.initialComment.trim() || undefined });
    setForm(emptyCreateTaskForm(activeUserId)); setCreateModalOpen(false);
  }

  function openCreateModal() {
    const f = emptyCreateTaskForm(activeUserId);
    if (section === "ProjectTasks" && projectFilter !== "Any") { f.linkedType = "Project"; f.linkedId = projectFilter; }
    setForm(f); setCreateModalOpen(true);
  }

  const saveTaskDetail = useCallback((task: Task, draft: { title: string; description: string; status: TaskStatus; priority: TaskPriority; dueAt: string; assigneeUserId: string; visibility: TaskVisibility; watcherUserIds: string[]; isUrgent?: boolean; labelIds?: string[] }) => { state.updateTask({ ...task, title: draft.title.trim(), description: draft.description.trim(), status: draft.status, priority: draft.priority, dueAt: draft.dueAt ? new Date(`${draft.dueAt}T12:00:00`).toISOString() : undefined, assigneeUserId: draft.assigneeUserId, visibility: draft.visibility, watcherUserIds: draft.watcherUserIds, isUrgent: draft.isUrgent, labelIds: draft.labelIds }); }, [state]);
  const handleAddLabel = () => { const n = newLabelName.trim(); if (!n) return; state.addTaskLabel({ name: n, color: newLabelColor }); setNewLabelName(""); setNewLabelColor(LABEL_COLOR_PRESETS[0]); };

  return (
    <div className="space-y-6">
      <UiPageHeader title="Tasks" subtitle="Manage your personal and team tasks" actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setLabelManagerOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"><Tag className="h-4 w-4" /> Labels</button>
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"><Plus className="h-4 w-4" /> Create Task</button>
        </div>
      } />

      {/* Tabs + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit overflow-x-auto">
          {SECTION_TABS.map((t) => <button key={t.key} onClick={() => setSection(t.key)} className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${section === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{t.label}</button>)}
        </div>
        {!isSpecialSection && (
          <div className="flex items-center gap-1">
            <button onClick={() => setViewModePersisted("LIST")} className={`rounded-lg p-2 transition ${viewMode === "LIST" ? "bg-indigo-100 text-indigo-700" : "text-gray-400 hover:bg-gray-100"}`}><List className="h-4 w-4" /></button>
            <button onClick={() => setViewModePersisted("KANBAN")} className={`rounded-lg p-2 transition ${viewMode === "KANBAN" ? "bg-indigo-100 text-indigo-700" : "text-gray-400 hover:bg-gray-100"}`}><LayoutGrid className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <div className="col-span-2 relative"><label className="mb-1 block text-xs font-medium text-gray-500">Search</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input className={`${inputCls} pl-9`} placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
          {section === "ProjectTasks" && (
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Project</label><select className={inputCls} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}><option value="Any">All Projects</option>{myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          )}
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Status</label><select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "Any")}><option value="Any">Any</option><option value="Backlog">Backlog</option><option value="ToDo">To Do</option><option value="InProgress">In Progress</option><option value="Done">Done</option><option value="Cancelled">Cancelled</option></select></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Priority</label><select className={inputCls} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "Any")}><option value="Any">Any</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Due</label><select className={inputCls} value={dueFilter} onChange={(e) => setDueFilter(e.target.value as DueFilter)}><option value="Any">Any</option><option value="DueSoon">Due soon (7d)</option><option value="Overdue">Overdue</option><option value="NoDueDate">No due date</option></select></div>
          {section !== "ProjectTasks" && <div><label className="mb-1 block text-xs font-medium text-gray-500">Linked</label><select className={inputCls} value={linkedFilter} onChange={(e) => setLinkedFilter(e.target.value as LinkedFilter)}><option value="Any">Any</option><option value="Company">Company</option><option value="Event">Event</option><option value="Project">Project</option></select></div>}
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Label</label>{labelFilter !== "Any" ? <div className="flex items-center gap-1">{(() => { const l = state.taskLabels.find((l) => l.id === labelFilter); return l ? <span className={`rounded px-2 py-1 text-xs font-medium text-white ${l.color}`}>{l.name}</span> : null; })()}<button className="rounded p-1 text-gray-400 hover:bg-gray-100" onClick={() => setLabelFilter("Any")}><X className="h-3 w-3" /></button></div> : <select className={inputCls} value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}><option value="Any">Any</option>{state.taskLabels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}</div>
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Sort</label><select className={inputCls} value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}><option value="LastActivityDesc">Last activity</option><option value="DueDateAsc">Due date</option><option value="PriorityDesc">Priority</option><option value="CreatedDateDesc">Created date</option></select></div>
        </div>
      </div>

      {/* Content */}
      {viewMode === "KANBAN" && !isSpecialSection ? (
        <TaskKanbanBoard tasks={rows} users={state.users} labels={state.taskLabels} onUpdateTask={(id, patch) => { const t = state.tasks.find((t) => t.id === id); if (t) state.updateTask({ ...t, ...patch }); }} onOpenTask={(t) => setSelectedTaskId(t.id)} getUserName={(uid) => getUserName(state, uid)} getProjectName={(pid) => getProjectName(state, pid)} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200"><tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                <th className="w-32" />
              </tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">{isCompletedSection ? "No completed tasks." : isStarredSection ? "No starred tasks." : "No tasks found."}</td></tr>}
                {rows.map((task) => {
                  const overdue = isOverdue(task);
                  const urgent = task.isUrgent === true;
                  const rowCls = urgent ? "bg-rose-50 border-l-4 border-l-rose-500" : overdue ? "bg-amber-50/50" : "";
                  const pName = task.projectId ? getProjectName(state, task.projectId) : null;
                  return (
                    <tr key={task.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition-colors cursor-pointer ${rowCls}`} onClick={() => setSelectedTaskId(task.id)}>
                      <td className="px-4 py-2">
                        <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {pName && <span className="rounded bg-gray-100 px-1.5 py-px text-[9px] text-gray-500">{pName}</span>}
                          {task.archivedAt && <span className="rounded bg-amber-100 px-1.5 py-px text-[9px] text-amber-700">⭐</span>}
                          {task.completedAt && <span className="rounded bg-emerald-100 px-1.5 py-px text-[9px] text-emerald-700">✓ Confirmed</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <span className={`inline-flex items-center rounded-full px-1 ${STATUS_BADGE[task.status] ?? "bg-gray-100 text-gray-600"}`}>
                          <select value={task.status} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); const t = state.tasks.find((t2) => t2.id === task.id); if (t) state.updateTask({ ...t, status: e.target.value as TaskStatus }); }} className="rounded-full border-0 bg-transparent text-xs font-medium px-1.5 py-0.5 cursor-pointer focus:ring-1 focus:ring-indigo-400 focus:outline-none">
                            <option value="Backlog">Backlog</option><option value="ToDo">To Do</option><option value="InProgress">In Progress</option><option value="Done">Done</option><option value="Cancelled">Cancelled</option>
                          </select>
                        </span>
                      </td>
                      <td className="px-4 py-2"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span></td>
                      <td className="px-4 py-2">{(() => { const b = dueDateBadgeInfo(task); return b ? <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${b.className}`}>{b.label}</span> : <span className="text-xs text-gray-400">—</span>; })()}</td>
                      <td className="px-4 py-2 text-xs text-gray-600">{getUserName(state, task.assigneeUserId)}</td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {isCompletedSection && <button onClick={(e) => { e.stopPropagation(); const t = state.tasks.find((t2) => t2.id === task.id); if (t) state.updateTask({ ...t, completedAt: undefined }); }} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition">Reopen</button>}
                          {isStarredSection && <button onClick={(e) => { e.stopPropagation(); const t = state.tasks.find((t2) => t2.id === task.id); if (t) state.updateTask({ ...t, archivedAt: undefined }); }} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition">Unstar</button>}
                          {!isSpecialSection && <button onClick={(e) => { e.stopPropagation(); const t = state.tasks.find((t2) => t2.id === task.id); if (t) state.updateTask({ ...t, archivedAt: t.archivedAt ? undefined : new Date().toISOString() }); }} className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition ${task.archivedAt ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{task.archivedAt ? "⭐" : "☆"}</button>}
                          <button className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition" onClick={() => setSelectedTaskId(task.id)}>Open</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">{rows.length} tasks</div>}
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setCreateModalOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-semibold text-gray-900">Create Task</h3><button onClick={() => setCreateModalOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition"><X className="h-5 w-5" /></button></div>
            <div className="flex gap-5">
              <div className="flex-1 space-y-3">
                <div><label className="mb-1 block text-xs font-medium text-gray-500">Title</label><input className={inputCls} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-gray-500">Description</label><textarea rows={2} className={`${inputCls} resize-none`} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-gray-500">Initial comment</label><input className={inputCls} value={form.initialComment} onChange={(e) => setForm((p) => ({ ...p, initialComment: e.target.value }))} /></div>
              </div>
              <div className="w-56 space-y-3 flex-shrink-0">
                <div><label className="mb-1 block text-xs font-medium text-gray-500">Assignee</label><select className={inputCls} value={form.assigneeUserId} onChange={(e) => setForm((p) => ({ ...p, assigneeUserId: e.target.value }))}>{state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="mb-1 block text-xs font-medium text-gray-500">Priority</label><select className={inputCls} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>
                  <div><label className="mb-1 block text-xs font-medium text-gray-500">Due</label><input className={inputCls} type="date" value={form.dueAt} onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))} /></div>
                </div>
                <div><label className="mb-1 block text-xs font-medium text-gray-500">Visibility</label><select className={inputCls} value={form.visibility} onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as TaskVisibility }))}><option value="Private">Private</option><option value="Shared">Shared</option></select></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="mb-1 block text-xs font-medium text-gray-500">Link</label><select className={inputCls} value={form.linkedType} onChange={(e) => setForm((p) => ({ ...p, linkedType: e.target.value as CreateTaskForm["linkedType"] }))}><option value="None">None</option><option value="Company">Company</option><option value="Event">Event</option><option value="Project">Project</option></select></div>
                  <div><label className="mb-1 block text-xs font-medium text-gray-500">Entity</label><select className={inputCls} value={form.linkedId} onChange={(e) => setForm((p) => ({ ...p, linkedId: e.target.value }))} disabled={form.linkedType === "None"}>{form.linkedType === "None" && <option value="">—</option>}{linkedOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
                </div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isUrgent} onChange={(e) => setForm((p) => ({ ...p, isUrgent: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600" /><span className="text-sm font-medium text-gray-700">Mark as Urgent</span></label>
              </div>
            </div>
            {state.taskLabels.length > 0 && <div className="mt-4"><MultiSelectDropdown items={state.taskLabels} selectedIds={form.labelIds} getItemId={(l) => l.id} getItemLabel={(l) => l.name} getItemColor={(l) => l.color} onToggle={(id) => setForm((p) => ({ ...p, labelIds: p.labelIds.includes(id) ? p.labelIds.filter((i) => i !== id) : [...p.labelIds, id] }))} label="Labels" /></div>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setCreateModalOpen(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleCreateTask} disabled={!form.title.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Label Manager Modal */}
      {isLabelManagerOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setLabelManagerOpen(false)}>
          <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-semibold text-gray-900">Label Management</h3><button onClick={() => { setLabelManagerOpen(false); setEditingLabelId(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition"><X className="h-5 w-5" /></button></div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 mb-4">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10"><tr><th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Color</th><th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th><th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Tasks</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th></tr></thead>
                <tbody>
                  {state.taskLabels.map((label) => {
                    const taskCount = state.tasks.filter((t) => (t.labelIds ?? []).includes(label.id)).length;
                    const isProjLbl = isProjectLabel(label, projectNames);
                    const isEd = editingLabelId === label.id;
                    return (
                      <tr key={label.id} className="border-b border-gray-100">
                        <td className="px-3 py-2">{isEd ? <div className="flex flex-wrap gap-1">{LABEL_COLOR_PRESETS.map((c) => <button key={c} className={`h-5 w-5 rounded-full ${c} ${editLabelColor === c ? "ring-2 ring-gray-400 ring-offset-1" : ""}`} onClick={() => setEditLabelColor(c)} />)}</div> : <span className={`inline-block h-4 w-4 rounded-full ${label.color}`} />}</td>
                        <td className="px-3 py-2">{isEd ? <input className={inputCls} value={editLabelName} onChange={(e) => setEditLabelName(e.target.value)} /> : <span className="text-sm font-medium text-gray-700">{label.name}</span>}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{taskCount}</td>
                        <td className="px-3 py-2 text-right">
                          {isEd ? <div className="flex justify-end gap-1"><button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition" onClick={() => { if (editLabelName.trim()) state.updateTaskLabel(label.id, { name: editLabelName.trim(), color: editLabelColor }); setEditingLabelId(null); }}>Save</button><button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition" onClick={() => setEditingLabelId(null)}>Cancel</button></div> : <div className="flex justify-end gap-1"><button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition" onClick={() => { setEditingLabelId(label.id); setEditLabelName(label.name); setEditLabelColor(label.color); }}>Edit</button>{!isProjLbl && <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition" onClick={() => { state.deleteTaskLabel(label.id); if (labelFilter === label.id) setLabelFilter("Any"); }}>Delete</button>}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">Add new label</p>
              <div className="flex flex-wrap items-end gap-3">
                <div><label className="mb-1 block text-xs font-medium text-gray-500">Name</label><input className={inputCls} placeholder="Label name" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-gray-500">Color</label><div className="flex flex-wrap gap-1">{LABEL_COLOR_PRESETS.map((c) => <button key={c} className={`h-5 w-5 rounded-full ${c} ${newLabelColor === c ? "ring-2 ring-gray-400 ring-offset-1" : ""}`} onClick={() => setNewLabelColor(c)} />)}</div></div>
                <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition" onClick={handleAddLabel} disabled={!newLabelName.trim()}>Create label</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer task={selectedTask} comments={commentsByTaskId.get(selectedTask.id) ?? []} attachments={state.taskAttachments.filter((a) => a.taskId === selectedTask.id)} users={state.users} labels={state.taskLabels} getUserName={(uid) => getUserName(state, uid)} onSave={saveTaskDetail} onClose={() => setSelectedTaskId("")} onArchive={(t) => state.updateTask({ ...t, archivedAt: t.archivedAt ? undefined : new Date().toISOString() })} onUnarchive={(t) => state.updateTask({ ...t, archivedAt: undefined })} onAddComment={(tid, text, kind) => state.addTaskComment(tid, text, kind)} onAddAttachment={(tid, file) => state.addTaskAttachment(tid, file, activeUserId)} onRemoveAttachment={(aid) => state.removeTaskAttachment(aid)} />
      )}
    </div>
  );
}
