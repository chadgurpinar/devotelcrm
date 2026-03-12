import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getCompanyName, getEventName, getProjectName, getUserName } from "../../store/selectors";
import { Task, TaskLabel, TaskPriority, TaskStatus, TaskVisibility } from "../../store/types";
import { TaskDrawer } from "./TaskDrawer";
import { TaskKanbanBoard } from "./TaskKanbanBoard";

const TASKS_VIEW_MODE_KEY = "tasks-view-mode";
type TasksViewMode = "LIST" | "KANBAN";

const LABEL_COLOR_PRESETS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-slate-500",
  "bg-pink-500",
];

function isProjectLabel(label: TaskLabel, projectNames: Set<string>): boolean {
  return projectNames.has(label.name);
}

type TaskSection = "MyPersonalTasks" | "AssignedToMe" | "AssignedByMe" | "Completed" | "Archive";
type DueFilter = "Any" | "DueSoon" | "Overdue" | "NoDueDate";
type LinkedFilter = "Any" | "Company" | "Event" | "Interconnection" | "Project";
type SortBy = "DueDateAsc" | "CreatedDateDesc" | "PriorityDesc" | "LastActivityDesc";
type LinkTarget = { label: string; href: string } | null;
type CreateTaskForm = {
  title: string;
  description: string;
  assigneeUserId: string;
  priority: TaskPriority;
  dueAt: string;
  visibility: TaskVisibility;
  linkedType: "None" | "Company" | "Event" | "Interconnection" | "Project";
  linkedId: string;
  initialComment: string;
  isUrgent: boolean;
  labelIds: string[];
};

const priorityWeight: Record<TaskPriority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function isDueSoon(dueAt?: string): boolean {
  if (!dueAt) return false;
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return due >= now && due <= now + sevenDays;
}

function isOverdue(task: Task): boolean {
  if (task.status === "Done" || task.status === "Completed" || task.status === "Archived" || !task.dueAt) return false;
  return new Date(task.dueAt).getTime() < Date.now();
}

function emptyCreateTaskForm(activeUserId: string): CreateTaskForm {
  return {
    title: "",
    description: "",
    assigneeUserId: activeUserId,
    priority: "Medium",
    dueAt: "",
    visibility: "Private",
    linkedType: "None",
    linkedId: "",
    initialComment: "",
    isUrgent: false,
    labelIds: [],
  };
}

function getStoredViewMode(): TasksViewMode {
  try {
    const stored = localStorage.getItem(TASKS_VIEW_MODE_KEY);
    if (stored === "LIST" || stored === "KANBAN") return stored;
  } catch {
    /* ignore */
  }
  return "LIST";
}

export function TasksPage() {
  const state = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<TasksViewMode>(getStoredViewMode);
  const [section, setSection] = useState<TaskSection>("MyPersonalTasks");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "Any">("Any");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "Any">("Any");
  const [dueFilter, setDueFilter] = useState<DueFilter>("Any");
  const [linkedFilter, setLinkedFilter] = useState<LinkedFilter>("Any");
  const [labelFilter, setLabelFilter] = useState<string>(() => searchParams.get("labelId") ?? "Any");
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

  const projectNames = useMemo(
    () => new Set(state.projects.map((p) => p.name)),
    [state.projects],
  );
  const setViewModePersisted = useCallback((mode: TasksViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(TASKS_VIEW_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const commentsByTaskId = useMemo(() => {
    const map = new Map<string, typeof state.taskComments>();
    state.taskComments
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .forEach((comment) => {
        const list = map.get(comment.taskId) ?? [];
        list.push(comment);
        map.set(comment.taskId, list);
      });
    return map;
  }, [state.taskComments]);

  const selectedTask = useMemo(
    () => state.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, state.tasks],
  );

  const linkedOptions = useMemo(() => {
    switch (form.linkedType) {
      case "Company":
        return state.companies.map((company) => ({ id: company.id, label: company.name }));
      case "Event":
        return state.events.map((event) => ({ id: event.id, label: event.name }));
      case "Interconnection":
        return state.interconnectionProcesses.map((process) => ({
          id: process.id,
          label: `${getCompanyName(state, process.companyId)} (${process.track})`,
        }));
      case "Project":
        return state.projects.map((project) => ({ id: project.id, label: project.name }));
      default:
        return [];
    }
  }, [form.linkedType, state]);

  useEffect(() => {
    if (!linkedOptions.length) {
      if (form.linkedId) setForm((prev) => ({ ...prev, linkedId: "" }));
      return;
    }
    if (form.linkedId && linkedOptions.some((option) => option.id === form.linkedId)) {
      return;
    }
    setForm((prev) => ({ ...prev, linkedId: linkedOptions[0]?.id ?? "" }));
  }, [form.linkedId, linkedOptions]);

  const isDoneSection = section === "Completed" || section === "Archive";

  useEffect(() => {
    if (isDoneSection) {
      if (statusFilter === "Open" || statusFilter === "InProgress") {
        setStatusFilter("Any");
      }
      return;
    }
    if (statusFilter === "Done" || statusFilter === "Completed" || statusFilter === "Archived") {
      setStatusFilter("Any");
    }
  }, [isDoneSection, statusFilter]);

  const isTerminalStatus = (s: string) => s === "Done" || s === "Completed" || s === "Archived";

  const sectionTasks = useMemo(() => {
    if (section === "Completed") {
      return state.tasks.filter((task) => task.status === "Completed" || (task.status === "Done" && !task.archivedAt));
    }
    if (section === "Archive") {
      return state.tasks.filter((task) => task.status === "Archived" || (task.status === "Done" && Boolean(task.archivedAt)));
    }
    if (section === "AssignedToMe") {
      return state.tasks.filter(
        (task) =>
          !isTerminalStatus(task.status) &&
          task.assigneeUserId === state.activeUserId &&
          task.createdByUserId !== state.activeUserId,
      );
    }
    if (section === "AssignedByMe") {
      return state.tasks.filter(
        (task) =>
          !isTerminalStatus(task.status) &&
          task.createdByUserId === state.activeUserId &&
          task.assigneeUserId !== state.activeUserId,
      );
    }
    return state.tasks.filter(
      (task) =>
        !isTerminalStatus(task.status) &&
        task.createdByUserId === state.activeUserId &&
        task.assigneeUserId === state.activeUserId,
    );
  }, [section, state.activeUserId, state.tasks]);

  const rows = useMemo(() => {
    let dataset = sectionTasks;
    if (statusFilter !== "Any") dataset = dataset.filter((task) => task.status === statusFilter);
    if (priorityFilter !== "Any") dataset = dataset.filter((task) => task.priority === priorityFilter);
    if (dueFilter === "DueSoon") dataset = dataset.filter((task) => isDueSoon(task.dueAt));
    if (dueFilter === "Overdue") dataset = dataset.filter((task) => isOverdue(task));
    if (dueFilter === "NoDueDate") dataset = dataset.filter((task) => !task.dueAt);
    if (linkedFilter === "Company") dataset = dataset.filter((task) => Boolean(task.companyId));
    if (linkedFilter === "Event") dataset = dataset.filter((task) => Boolean(task.eventId));
    if (linkedFilter === "Interconnection") dataset = dataset.filter((task) => Boolean(task.interconnectionProcessId));
    if (linkedFilter === "Project") dataset = dataset.filter((task) => Boolean(task.projectId));
    if (labelFilter !== "Any") dataset = dataset.filter((task) => (task.labelIds ?? []).includes(labelFilter));

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      dataset = dataset.filter((task) => {
        const comments = commentsByTaskId.get(task.id) ?? [];
        const inComments = comments.some((comment) => comment.content.toLowerCase().includes(query));
        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          inComments
        );
      });
    }

    return dataset.slice().sort((left, right) => {
      if (left.isUrgent && !right.isUrgent) return -1;
      if (!left.isUrgent && right.isUrgent) return 1;
      if (sortBy === "DueDateAsc") {
        if (!left.dueAt && !right.dueAt) return 0;
        if (!left.dueAt) return 1;
        if (!right.dueAt) return -1;
        return left.dueAt.localeCompare(right.dueAt);
      }
      if (sortBy === "CreatedDateDesc") return right.createdAt.localeCompare(left.createdAt);
      if (sortBy === "PriorityDesc") return priorityWeight[right.priority] - priorityWeight[left.priority];
      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [commentsByTaskId, dueFilter, labelFilter, linkedFilter, priorityFilter, search, sectionTasks, sortBy, statusFilter]);

  function getTaskLinkTarget(task: Task): LinkTarget {
    if (task.companyId) return { label: getCompanyName(state, task.companyId), href: `/companies/${task.companyId}` };
    if (task.eventId) return { label: getEventName(state, task.eventId), href: `/events/${task.eventId}` };
    if (task.projectId) return { label: getProjectName(state, task.projectId), href: "/reports" };
    if (task.interconnectionProcessId) return { label: "Interconnection process", href: "/interconnection" };
    return null;
  }

  function handleCreateTask() {
    const title = form.title.trim();
    if (!title) return;
    const linkedFields =
      form.linkedType === "Company"
        ? { companyId: form.linkedId || undefined }
        : form.linkedType === "Event"
          ? { eventId: form.linkedId || undefined }
          : form.linkedType === "Interconnection"
            ? { interconnectionProcessId: form.linkedId || undefined }
            : form.linkedType === "Project"
              ? { projectId: form.linkedId || undefined }
              : {};
    state.createTask({
      title,
      description: form.description.trim(),
      status: "Open",
      priority: form.priority,
      dueAt: form.dueAt ? new Date(`${form.dueAt}T12:00:00`).toISOString() : undefined,
      createdByUserId: state.activeUserId,
      assigneeUserId: form.assigneeUserId || state.activeUserId,
      visibility: form.visibility,
      isUrgent: form.isUrgent,
      kanbanStage: "Backlog",
      labelIds: form.labelIds.length > 0 ? form.labelIds : undefined,
      ...linkedFields,
      initialComment: form.initialComment.trim() || undefined,
    });
    setForm(emptyCreateTaskForm(state.activeUserId));
    setCreateModalOpen(false);
  }

  const saveTaskDetail = useCallback(
    (task: Task, draft: { title: string; description: string; status: TaskStatus; priority: TaskPriority; dueAt: string; assigneeUserId: string; visibility: TaskVisibility; watcherUserIds: string[]; isUrgent?: boolean; labelIds?: string[] }) => {
      state.updateTask({
        ...task,
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: draft.status,
        priority: draft.priority,
        dueAt: draft.dueAt ? new Date(`${draft.dueAt}T12:00:00`).toISOString() : undefined,
        assigneeUserId: draft.assigneeUserId,
        visibility: draft.visibility,
        watcherUserIds: draft.watcherUserIds,
        isUrgent: draft.isUrgent,
        labelIds: draft.labelIds,
      });
    },
    [state],
  );

  function archiveTaskDirectly(task: Task) {
    state.updateTask({
      ...task,
      status: "Archived",
    });
  }

  const handleAddLabel = () => {
    const name = newLabelName.trim();
    if (!name) return;
    state.addTaskLabel({ name, color: newLabelColor });
    setNewLabelName("");
    setNewLabelColor(LABEL_COLOR_PRESETS[0]);
  };

  return (
    <div className="space-y-4">
      <Card
        title="Operational Tasks"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
              <Button
                size="sm"
                variant={viewMode === "LIST" ? "primary" : "secondary"}
                onClick={() => setViewModePersisted("LIST")}
              >
                List
              </Button>
              <Button
                size="sm"
                variant={viewMode === "KANBAN" ? "primary" : "secondary"}
                onClick={() => setViewModePersisted("KANBAN")}
              >
                Kanban
              </Button>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setLabelManagerOpen(true)}
            >
              Manage labels
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setForm(emptyCreateTaskForm(state.activeUserId));
                setCreateModalOpen(true);
              }}
            >
              Create task
            </Button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant={section === "MyPersonalTasks" ? "primary" : "secondary"} onClick={() => setSection("MyPersonalTasks")}>
            My Personal Tasks
          </Button>
          <Button variant={section === "AssignedToMe" ? "primary" : "secondary"} onClick={() => setSection("AssignedToMe")}>
            Assigned To Me
          </Button>
          <Button variant={section === "AssignedByMe" ? "primary" : "secondary"} onClick={() => setSection("AssignedByMe")}>
            Assigned By Me
          </Button>
          <Button variant={section === "Completed" ? "primary" : "secondary"} onClick={() => setSection("Completed")}>
            Completed
          </Button>
          <Button variant={section === "Archive" ? "primary" : "secondary"} onClick={() => setSection("Archive")}>
            Archive
          </Button>
        </div>

        <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-7">
          <div className="md:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <input placeholder="Search task or comments..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "Any")}>
              <option value="Any">Any</option>
              {!isDoneSection && <option value="Open">Open</option>}
              {!isDoneSection && <option value="InProgress">In Progress</option>}
              {isDoneSection && <option value="Done">Done</option>}
              {isDoneSection && <option value="Completed">Completed</option>}
              {isDoneSection && <option value="Archived">Archived</option>}
            </select>
          </div>
          <div>
            <FieldLabel>Priority</FieldLabel>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "Any")}>
              <option value="Any">Any</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <FieldLabel>Due</FieldLabel>
            <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value as DueFilter)}>
              <option value="Any">Any</option>
              <option value="DueSoon">Due soon (7d)</option>
              <option value="Overdue">Overdue</option>
              <option value="NoDueDate">No due date</option>
            </select>
          </div>
          <div>
            <FieldLabel>Linked</FieldLabel>
            <select value={linkedFilter} onChange={(e) => setLinkedFilter(e.target.value as LinkedFilter)}>
              <option value="Any">Any</option>
              <option value="Company">Company</option>
              <option value="Event">Event</option>
              <option value="Interconnection">Interconnection</option>
              <option value="Project">Project</option>
            </select>
          </div>
          <div>
            <FieldLabel>Label</FieldLabel>
            {labelFilter !== "Any" ? (
              <div className="flex items-center gap-1">
                {(() => {
                  const activeLabel = state.taskLabels.find((l) => l.id === labelFilter);
                  return activeLabel ? (
                    <span className={`rounded px-2 py-1 text-xs font-medium text-white ${activeLabel.color}`}>
                      {activeLabel.name}
                    </span>
                  ) : null;
                })()}
                <button
                  className="rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  onClick={() => setLabelFilter("Any")}
                >
                  ✕
                </button>
              </div>
            ) : (
              <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
                <option value="Any">Any</option>
                {state.taskLabels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <FieldLabel>Sort</FieldLabel>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="LastActivityDesc">Last activity</option>
              <option value="DueDateAsc">Due date</option>
              <option value="PriorityDesc">Priority</option>
              <option value="CreatedDateDesc">Created date</option>
            </select>
          </div>
        </div>

        {viewMode === "KANBAN" ? (
          <TaskKanbanBoard
            tasks={rows}
            users={state.users}
            labels={state.taskLabels}
            onUpdateTask={(id, patch) => {
              const task = state.tasks.find((t) => t.id === id);
              if (task) state.updateTask({ ...task, ...patch });
            }}
            onOpenTask={(task) => setSelectedTaskId(task.id)}
            getUserName={(userId) => getUserName(state, userId)}
          />
        ) : (
        <div className="mt-3 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
                <th>Last activity</th>
                <th>Delegation</th>
                <th>Linked</th>
                <th>Last comment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => {
                const lastComment = (commentsByTaskId.get(task.id) ?? []).slice(-1)[0];
                const linkTarget = getTaskLinkTarget(task);
                const overdue = isOverdue(task);
                const isUrgent = task.isUrgent === true;
                const rowClass = isUrgent ? "bg-rose-50 border-l-4 border-l-rose-400" : overdue ? "bg-rose-50/60" : "";
                return (
                  <tr key={task.id} className={rowClass}>
                    <td>
                      <p className="font-semibold text-slate-700">{task.title}</p>
                      <p className="text-xs text-slate-500">{task.description || "-"}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {isUrgent && <Badge className="bg-rose-100 text-rose-700">URGENT</Badge>}
                        <Badge className="bg-slate-100 text-slate-700">{task.visibility}</Badge>
                        <Badge className="bg-slate-100 text-slate-700">{task.watcherUserIds.length} watchers</Badge>
                        {task.archivedAt && <Badge className="bg-violet-100 text-violet-700">Archived</Badge>}
                        {overdue && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
                        {(task.labelIds ?? []).map((lid) => {
                          const label = state.taskLabels.find((l) => l.id === lid);
                          return label ? (
                            <span key={label.id} className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${label.color}`}>
                              {label.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td>
                      <Badge className={
                        task.status === "Completed" ? "bg-emerald-100 text-emerald-700"
                        : task.status === "Archived" ? "bg-violet-100 text-violet-700"
                        : task.status === "Done" ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                      }>
                        {task.status}
                      </Badge>
                    </td>
                    <td>{task.priority}</td>
                    <td className={overdue && !isTerminalStatus(task.status) ? "font-semibold text-rose-600" : ""}>
                      {task.dueAt ? (
                        <>
                          {overdue && !isTerminalStatus(task.status) && "⚠ "}
                          {new Date(task.dueAt).toLocaleDateString()}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{new Date(task.updatedAt).toLocaleString()}</td>
                    <td className="text-xs">
                      <p>By: {getUserName(state, task.createdByUserId)}</p>
                      <p>To: {getUserName(state, task.assigneeUserId)}</p>
                    </td>
                    <td>
                      {linkTarget ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <Link className="text-xs font-semibold text-brand-700 hover:underline" to={linkTarget.href}>
                            {linkTarget.label}
                          </Link>
                          {task.projectId && (() => {
                            const pLabel = state.taskLabels.find(
                              (l) => l.name === getProjectName(state, task.projectId!),
                            );
                            return pLabel ? (
                              <button
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${pLabel.color}`}
                                onClick={() => setLabelFilter(pLabel.id)}
                              >
                                {pLabel.name}
                              </button>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                    <td className="text-xs">{lastComment ? lastComment.content : "-"}</td>
                    <td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedTaskId(task.id)}>
                          Open
                        </Button>
                        {!isTerminalStatus(task.status) && (
                          <Button size="sm" onClick={() => state.updateTask({ ...task, status: "Done" })}>
                            Mark done
                          </Button>
                        )}
                        {!isTerminalStatus(task.status) && (
                          <Button size="sm" variant="secondary" onClick={() => archiveTaskDirectly(task)}>
                            Direct archive
                          </Button>
                        )}
                        {task.status === "Done" && (
                          <Button
                            size="sm"
                            onClick={() => state.updateTask({ ...task, status: "Completed" })}
                          >
                            Complete
                          </Button>
                        )}
                        {(task.status === "Done" || task.status === "Completed") && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => state.updateTask({ ...task, status: "Archived" })}
                          >
                            Archive
                          </Button>
                        )}
                        {task.status === "Archived" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              state.updateTask({
                                ...task,
                                status: "Done",
                                archivedAt: undefined,
                              })
                            }
                          >
                            Unarchive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setCreateModalOpen(false)}>
          <div
            className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Create task</h3>
              <Button size="sm" variant="secondary" onClick={() => setCreateModalOpen(false)}>
                Close
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-6">
              <div className="md:col-span-2">
                <FieldLabel>Title</FieldLabel>
                <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Assignee</FieldLabel>
                <select value={form.assigneeUserId} onChange={(e) => setForm((prev) => ({ ...prev, assigneeUserId: e.target.value }))}>
                  {state.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Priority</FieldLabel>
                <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <FieldLabel>Due date</FieldLabel>
                <input type="date" value={form.dueAt} onChange={(e) => setForm((prev) => ({ ...prev, dueAt: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Visibility</FieldLabel>
                <select value={form.visibility} onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value as TaskVisibility }))}>
                  <option value="Private">Private</option>
                  <option value="Shared">Shared</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <FieldLabel>Description</FieldLabel>
                <input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Link type</FieldLabel>
                <select
                  value={form.linkedType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      linkedType: e.target.value as "None" | "Company" | "Event" | "Interconnection" | "Project",
                    }))
                  }
                >
                  <option value="None">None</option>
                  <option value="Company">Company</option>
                  <option value="Event">Event</option>
                  <option value="Interconnection">Interconnection</option>
                  <option value="Project">Project</option>
                </select>
              </div>
              <div>
                <FieldLabel>Linked entity</FieldLabel>
                <select
                  value={form.linkedId}
                  onChange={(e) => setForm((prev) => ({ ...prev, linkedId: e.target.value }))}
                  disabled={form.linkedType === "None"}
                >
                  {form.linkedType === "None" && <option value="">None</option>}
                  {linkedOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Initial comment</FieldLabel>
                <input value={form.initialComment} onChange={(e) => setForm((prev) => ({ ...prev, initialComment: e.target.value }))} />
              </div>
              <div className="md:col-span-4 flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.isUrgent}
                    onChange={(e) => setForm((prev) => ({ ...prev, isUrgent: e.target.checked }))}
                  />
                  Mark as Urgent
                </label>
              </div>
              {state.taskLabels.length > 0 && (
                <div className="md:col-span-4 rounded-md border border-slate-200 p-2">
                  <FieldLabel>Labels</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {state.taskLabels.map((label) => {
                      const checked = form.labelIds.includes(label.id);
                      return (
                        <label key={label.id} className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm((prev) => ({
                                ...prev,
                                labelIds: checked ? prev.labelIds.filter((id) => id !== label.id) : [...prev.labelIds, label.id],
                              }))
                            }
                          />
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${label.color}`}>
                            {label.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateTask} disabled={!form.title.trim()}>
                Create task
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLabelManagerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setLabelManagerOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Label Management</h3>
              <Button size="sm" variant="secondary" onClick={() => { setLabelManagerOpen(false); setEditingLabelId(null); }}>
                Close
              </Button>
            </div>

            <div className="mb-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-slate-500">Color</th>
                    <th className="text-left text-xs text-slate-500">Name</th>
                    <th className="text-left text-xs text-slate-500">Tasks</th>
                    <th className="text-right text-xs text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.taskLabels.map((label) => {
                    const taskCount = state.tasks.filter((t) => (t.labelIds ?? []).includes(label.id)).length;
                    const isProjectLbl = isProjectLabel(label, projectNames);
                    const isEditing = editingLabelId === label.id;

                    return (
                      <tr key={label.id} className="border-t border-slate-100">
                        <td className="py-2">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-1">
                              {LABEL_COLOR_PRESETS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  className={`h-5 w-5 rounded-full ${c} ${editLabelColor === c ? "ring-2 ring-slate-400 ring-offset-1" : ""}`}
                                  onClick={() => setEditLabelColor(c)}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className={`inline-block h-4 w-4 rounded-full ${label.color}`} />
                          )}
                        </td>
                        <td className="py-2">
                          {isEditing ? (
                            <input
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                              value={editLabelName}
                              onChange={(e) => setEditLabelName(e.target.value)}
                            />
                          ) : (
                            <span className="text-xs font-medium text-slate-700">{label.name}</span>
                          )}
                        </td>
                        <td className="py-2">
                          <span className="text-xs text-slate-500">{taskCount}</span>
                        </td>
                        <td className="py-2 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (editLabelName.trim()) {
                                    state.updateTaskLabel(label.id, { name: editLabelName.trim(), color: editLabelColor });
                                  }
                                  setEditingLabelId(null);
                                }}
                              >
                                Save
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setEditingLabelId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              {isProjectLbl ? (
                                <span className="flex items-center gap-1 text-[10px] text-slate-400" title="Project label – cannot delete">
                                  🔒 Project
                                </span>
                              ) : null}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingLabelId(label.id);
                                  setEditLabelName(label.name);
                                  setEditLabelColor(label.color);
                                }}
                              >
                                Edit
                              </Button>
                              {!isProjectLbl && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    state.deleteTaskLabel(label.id);
                                    if (labelFilter === label.id) setLabelFilter("Any");
                                  }}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-700">Add new label</p>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <input
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                    placeholder="Label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Color</FieldLabel>
                  <div className="flex flex-wrap gap-1">
                    {LABEL_COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`h-5 w-5 rounded-full ${c} ${newLabelColor === c ? "ring-2 ring-slate-400 ring-offset-1" : ""}`}
                        onClick={() => setNewLabelColor(c)}
                      />
                    ))}
                  </div>
                </div>
                <Button size="sm" onClick={handleAddLabel} disabled={!newLabelName.trim()}>
                  Create label
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          comments={commentsByTaskId.get(selectedTask.id) ?? []}
          users={state.users}
          labels={state.taskLabels}
          getUserName={(userId) => getUserName(state, userId)}
          onSave={saveTaskDetail}
          onClose={() => setSelectedTaskId("")}
          onArchive={(task) =>
            state.updateTask({
              ...task,
              status: "Archived",
            })
          }
          onUnarchive={(task) => state.updateTask({ ...task, status: "Done", archivedAt: undefined })}
          onAddComment={(taskId, text, kind) => state.addTaskComment(taskId, text, kind)}
        />
      )}
    </div>
  );
}
