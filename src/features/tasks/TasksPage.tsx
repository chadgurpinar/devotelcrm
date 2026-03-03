import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getCompanyName, getEventName, getProjectName, getUserName } from "../../store/selectors";
import { Task, TaskPriority, TaskStatus, TaskVisibility } from "../../store/types";

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
  if (task.status === "Done" || !task.dueAt) return false;
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
  };
}

export function TasksPage() {
  const state = useAppStore();
  const [section, setSection] = useState<TaskSection>("MyPersonalTasks");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "Any">("Any");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "Any">("Any");
  const [dueFilter, setDueFilter] = useState<DueFilter>("Any");
  const [linkedFilter, setLinkedFilter] = useState<LinkedFilter>("Any");
  const [sortBy, setSortBy] = useState<SortBy>("LastActivityDesc");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentKind, setNewCommentKind] = useState<"Comment" | "Blocker">("Comment");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState<CreateTaskForm>(() => emptyCreateTaskForm(state.activeUserId));
  const [detailDraft, setDetailDraft] = useState<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueAt: string;
    assigneeUserId: string;
    visibility: TaskVisibility;
    watcherUserIds: string[];
  } | null>(null);

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

  useEffect(() => {
    if (!selectedTask) {
      setDetailDraft(null);
      return;
    }
    setDetailDraft({
      title: selectedTask.title,
      description: selectedTask.description,
      status: selectedTask.status,
      priority: selectedTask.priority,
      dueAt: selectedTask.dueAt ? selectedTask.dueAt.slice(0, 10) : "",
      assigneeUserId: selectedTask.assigneeUserId,
      visibility: selectedTask.visibility,
      watcherUserIds: selectedTask.watcherUserIds,
    });
  }, [selectedTask]);

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
        setStatusFilter("Done");
      }
      return;
    }
    if (statusFilter === "Done") {
      setStatusFilter("Any");
    }
  }, [isDoneSection, statusFilter]);

  const sectionTasks = useMemo(() => {
    if (section === "Completed") {
      return state.tasks.filter((task) => task.status === "Done" && !task.archivedAt);
    }
    if (section === "Archive") {
      return state.tasks.filter((task) => task.status === "Done" && Boolean(task.archivedAt));
    }
    if (section === "AssignedToMe") {
      return state.tasks.filter(
        (task) =>
          task.status !== "Done" &&
          task.assigneeUserId === state.activeUserId &&
          task.createdByUserId !== state.activeUserId,
      );
    }
    if (section === "AssignedByMe") {
      return state.tasks.filter(
        (task) =>
          task.status !== "Done" &&
          task.createdByUserId === state.activeUserId &&
          task.assigneeUserId !== state.activeUserId,
      );
    }
    return state.tasks.filter(
      (task) =>
        task.status !== "Done" &&
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
  }, [commentsByTaskId, dueFilter, linkedFilter, priorityFilter, search, sectionTasks, sortBy, statusFilter]);

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
      ...linkedFields,
      initialComment: form.initialComment.trim() || undefined,
    });
    setForm(emptyCreateTaskForm(state.activeUserId));
    setCreateModalOpen(false);
  }

  function saveTaskDetail() {
    if (!selectedTask || !detailDraft) return;
    state.updateTask({
      ...selectedTask,
      title: detailDraft.title.trim(),
      description: detailDraft.description.trim(),
      status: detailDraft.status,
      priority: detailDraft.priority,
      dueAt: detailDraft.dueAt ? new Date(`${detailDraft.dueAt}T12:00:00`).toISOString() : undefined,
      assigneeUserId: detailDraft.assigneeUserId,
      visibility: detailDraft.visibility,
      watcherUserIds: detailDraft.watcherUserIds,
    });
  }

  function archiveTaskDirectly(task: Task) {
    state.updateTask({
      ...task,
      status: "Done",
      archivedAt: new Date().toISOString(),
    });
  }

  function toggleWatcher(userId: string) {
    if (!detailDraft || !selectedTask) return;
    const mustKeep = userId === selectedTask.createdByUserId || userId === detailDraft.assigneeUserId;
    if (mustKeep) return;
    setDetailDraft((draft) => {
      if (!draft) return draft;
      const exists = draft.watcherUserIds.includes(userId);
      const next = exists ? draft.watcherUserIds.filter((id) => id !== userId) : [...draft.watcherUserIds, userId];
      return { ...draft, watcherUserIds: next };
    });
  }

  return (
    <div className="space-y-4">
      <Card
        title="Operational Tasks"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setForm(emptyCreateTaskForm(state.activeUserId));
              setCreateModalOpen(true);
            }}
          >
            Create task
          </Button>
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

        <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <input placeholder="Search task or comments..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "Any")}>
              <option value="Any">Any</option>
              {!isDoneSection && <option value="Open">Open</option>}
              {!isDoneSection && <option value="InProgress">InProgress</option>}
              {isDoneSection && <option value="Done">Done</option>}
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
            <FieldLabel>Sort</FieldLabel>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="LastActivityDesc">Last activity</option>
              <option value="DueDateAsc">Due date</option>
              <option value="PriorityDesc">Priority</option>
              <option value="CreatedDateDesc">Created date</option>
            </select>
          </div>
        </div>

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
                return (
                  <tr key={task.id} className={overdue ? "bg-rose-50/60" : ""}>
                    <td>
                      <p className="font-semibold text-slate-700">{task.title}</p>
                      <p className="text-xs text-slate-500">{task.description || "-"}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge className="bg-slate-100 text-slate-700">{task.visibility}</Badge>
                        <Badge className="bg-slate-100 text-slate-700">{task.watcherUserIds.length} watchers</Badge>
                        {task.archivedAt && <Badge className="bg-violet-100 text-violet-700">Archived</Badge>}
                        {overdue && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
                      </div>
                    </td>
                    <td>
                      <Badge className={task.status === "Done" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
                        {task.status}
                      </Badge>
                    </td>
                    <td>{task.priority}</td>
                    <td>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "-"}</td>
                    <td>{new Date(task.updatedAt).toLocaleString()}</td>
                    <td className="text-xs">
                      <p>By: {getUserName(state, task.createdByUserId)}</p>
                      <p>To: {getUserName(state, task.assigneeUserId)}</p>
                    </td>
                    <td>
                      {linkTarget ? (
                        <Link className="text-xs font-semibold text-brand-700 hover:underline" to={linkTarget.href}>
                          {linkTarget.label}
                        </Link>
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
                        {task.status !== "Done" && (
                          <Button size="sm" onClick={() => state.updateTask({ ...task, status: "Done" })}>
                            Mark done
                          </Button>
                        )}
                        {task.status !== "Done" && (
                          <Button size="sm" variant="secondary" onClick={() => archiveTaskDirectly(task)}>
                            Direct archive
                          </Button>
                        )}
                        {task.status === "Done" && !task.archivedAt && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              state.updateTask({
                                ...task,
                                archivedAt: new Date().toISOString(),
                              })
                            }
                          >
                            Archive
                          </Button>
                        )}
                        {task.status === "Done" && task.archivedAt && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              state.updateTask({
                                ...task,
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

      {selectedTask && detailDraft && (
        <Card
          title={`Task detail: ${selectedTask.title}`}
          actions={
            <Button size="sm" variant="secondary" onClick={() => setSelectedTaskId("")}>
              Close
            </Button>
          }
        >
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <FieldLabel>Title</FieldLabel>
              <input value={detailDraft.title} onChange={(e) => setDetailDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))} />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                value={detailDraft.status}
                onChange={(e) => setDetailDraft((prev) => (prev ? { ...prev, status: e.target.value as TaskStatus } : prev))}
              >
                <option value="Open">Open</option>
                <option value="InProgress">InProgress</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <div>
              <FieldLabel>Priority</FieldLabel>
              <select
                value={detailDraft.priority}
                onChange={(e) => setDetailDraft((prev) => (prev ? { ...prev, priority: e.target.value as TaskPriority } : prev))}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <input
                value={detailDraft.description}
                onChange={(e) => setDetailDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
              />
            </div>
            <div>
              <FieldLabel>Assignee</FieldLabel>
              <select
                value={detailDraft.assigneeUserId}
                onChange={(e) =>
                  setDetailDraft((prev) => {
                    if (!prev) return prev;
                    const nextAssignee = e.target.value;
                    const nextWatchers = Array.from(new Set([...prev.watcherUserIds, selectedTask.createdByUserId, nextAssignee]));
                    return { ...prev, assigneeUserId: nextAssignee, watcherUserIds: nextWatchers };
                  })
                }
              >
                {state.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Due date</FieldLabel>
              <input
                type="date"
                value={detailDraft.dueAt}
                onChange={(e) => setDetailDraft((prev) => (prev ? { ...prev, dueAt: e.target.value } : prev))}
              />
            </div>
            <div>
              <FieldLabel>Visibility</FieldLabel>
              <select
                value={detailDraft.visibility}
                onChange={(e) => setDetailDraft((prev) => (prev ? { ...prev, visibility: e.target.value as TaskVisibility } : prev))}
              >
                <option value="Private">Private</option>
                <option value="Shared">Shared</option>
              </select>
            </div>
            <div className="md:col-span-4 rounded-md border border-slate-200 p-2">
              <FieldLabel>Watchers</FieldLabel>
              <div className="grid gap-1 md:grid-cols-3">
                {state.users.map((user) => {
                  const forced = user.id === selectedTask.createdByUserId || user.id === detailDraft.assigneeUserId;
                  const checked = detailDraft.watcherUserIds.includes(user.id) || forced;
                  return (
                    <label key={user.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={checked} disabled={forced} onChange={() => toggleWatcher(user.id)} />
                      <span>{user.name}</span>
                      {forced && <span className="text-[10px] text-slate-400">(required)</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={saveTaskDetail}>Save task</Button>
            {selectedTask.status !== "Done" && (
              <Button variant="secondary" onClick={() => archiveTaskDirectly(selectedTask)}>
                Complete and archive
              </Button>
            )}
            {selectedTask.status === "Done" && !selectedTask.archivedAt && (
              <Button
                variant="secondary"
                onClick={() => state.updateTask({ ...selectedTask, archivedAt: new Date().toISOString() })}
              >
                Move to archive
              </Button>
            )}
            {selectedTask.status === "Done" && selectedTask.archivedAt && (
              <Button variant="secondary" onClick={() => state.updateTask({ ...selectedTask, archivedAt: undefined })}>
                Remove from archive
              </Button>
            )}
          </div>

          <div className="mt-4 rounded-md border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</p>
            <div className="space-y-2">
              {(commentsByTaskId.get(selectedTask.id) ?? []).map((comment) => (
                <div key={comment.id} className="rounded-md border border-slate-100 bg-slate-50 p-2 text-xs">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">{getUserName(state, comment.authorUserId)}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={comment.kind === "Blocker" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}>
                        {comment.kind}
                      </Badge>
                      <span className="text-[11px] text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-slate-600">{comment.content}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-6">
              <div className="md:col-span-4">
                <input value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add comment or blocker..." />
              </div>
              <div>
                <select value={newCommentKind} onChange={(e) => setNewCommentKind(e.target.value as "Comment" | "Blocker")}>
                  <option value="Comment">Comment</option>
                  <option value="Blocker">Blocker</option>
                </select>
              </div>
              <div>
                <Button
                  onClick={() => {
                    const text = newCommentText.trim();
                    if (!text) return;
                    state.addTaskComment(selectedTask.id, text, newCommentKind);
                    setNewCommentText("");
                    setNewCommentKind("Comment");
                  }}
                  disabled={!newCommentText.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
