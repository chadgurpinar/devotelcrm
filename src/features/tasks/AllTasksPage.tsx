import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/db";
import { Task, TaskPriority, TaskStatus } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiDataTable, UiDataTableColumn } from "../../ui/UiDataTable";
import { formatDate } from "../../utils/datetime";

const ALL_STATUSES: TaskStatus[] = ["Backlog", "Open", "InProgress", "Done", "Completed", "Archived"];

const STATUS_STYLE: Record<TaskStatus, string> = {
  Backlog: "bg-gray-100 text-gray-600",
  Open: "bg-blue-50 text-blue-700",
  InProgress: "bg-indigo-50 text-indigo-700",
  Done: "bg-emerald-50 text-emerald-700",
  Completed: "bg-emerald-100 text-emerald-800",
  Archived: "bg-gray-50 text-gray-500",
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  Critical: "bg-rose-50 text-rose-700",
  High: "bg-amber-50 text-amber-700",
  Medium: "bg-sky-50 text-sky-700",
  Low: "bg-gray-50 text-gray-500",
};

const STATUS_SORT_ORDER: Record<TaskStatus, number> = {
  Backlog: 0,
  Open: 1,
  InProgress: 2,
  Done: 3,
  Completed: 4,
  Archived: 5,
};

const PRIORITY_SORT_ORDER: Record<TaskPriority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export function AllTasksPage() {
  const state = useAppStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | TaskStatus>("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");

  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);
  const projectById = useMemo(() => new Map(state.projects.map((p) => [p.id, p])), [state.projects]);

  const assignees = useMemo(() => {
    const ids = new Set(state.tasks.map((t) => t.assigneeUserId));
    return state.users.filter((u) => ids.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.tasks, state.users]);

  const filtered = useMemo(() => {
    let rows = state.tasks.slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (statusFilter) rows = rows.filter((t) => t.status === statusFilter);
    if (assigneeFilter) rows = rows.filter((t) => t.assigneeUserId === assigneeFilter);
    if (dueDateFrom) rows = rows.filter((t) => t.dueAt && t.dueAt >= dueDateFrom);
    if (dueDateTo) rows = rows.filter((t) => t.dueAt && t.dueAt <= dueDateTo + "T23:59:59");
    return rows;
  }, [search, statusFilter, assigneeFilter, dueDateFrom, dueDateTo, state.tasks]);

  const columns: UiDataTableColumn<Task>[] = [
    {
      key: "title",
      header: "Task",
      width: "35%",
      render: (row) => {
        const now = new Date().toISOString();
        const overdue = row.dueAt && row.dueAt < now && row.status !== "Done" && row.status !== "Completed" && !row.archivedAt;
        return (
          <div>
            <p className="font-medium text-gray-900 leading-snug">{row.title}</p>
            {row.isUrgent && (
              <span className="mr-1 inline-flex rounded bg-rose-500 px-1 py-0.5 text-[9px] font-bold text-white uppercase">Urgent</span>
            )}
            {overdue && (
              <span className="inline-flex rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">Overdue</span>
            )}
          </div>
        );
      },
    },
    {
      key: "project",
      header: "Project",
      render: (row) => {
        const project = row.projectId ? projectById.get(row.projectId) : undefined;
        return project ? (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{project.name}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        );
      },
    },
    {
      key: "assignee",
      header: "Assignee",
      render: (row) => {
        const user = userById.get(row.assigneeUserId);
        if (!user) return <span className="text-xs text-gray-400">—</span>;
        const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
              {initials}
            </div>
            <span className="text-sm text-gray-700">{user.name}</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => STATUS_SORT_ORDER[row.status] ?? 0,
      render: (row) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[row.status] ?? "bg-gray-100 text-gray-600"}`}>
          {row.status === "InProgress" ? "In Progress" : row.status}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      sortValue: (row) => PRIORITY_SORT_ORDER[row.priority] ?? 0,
      render: (row) => (
        <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[row.priority] ?? "bg-gray-100 text-gray-600"}`}>
          {row.priority}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      sortValue: (row) => row.dueAt ?? "9999-12-31",
      render: (row) => {
        if (!row.dueAt) return <span className="text-xs text-gray-400">No due date</span>;
        const now = new Date().toISOString();
        const overdue = row.dueAt < now && row.status !== "Done" && row.status !== "Completed";
        return <span className={`text-xs ${overdue ? "font-medium text-rose-600" : "text-gray-600"}`}>{formatDate(row.dueAt)}</span>;
      },
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-56">
        <label className="mb-1 block text-[11px] font-medium text-gray-500">Search</label>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0">
            <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>
      <div className="w-36">
        <label className="mb-1 block text-[11px] font-medium text-gray-500">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-700"
        >
          <option value="">All</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s === "InProgress" ? "In Progress" : s}</option>
          ))}
        </select>
      </div>
      <div className="w-40">
        <label className="mb-1 block text-[11px] font-medium text-gray-500">Assignee</label>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-700"
        >
          <option value="">All</option>
          {assignees.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div className="w-36">
        <label className="mb-1 block text-[11px] font-medium text-gray-500">Due from</label>
        <input
          type="date"
          value={dueDateFrom}
          onChange={(e) => setDueDateFrom(e.target.value)}
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-700"
        />
      </div>
      <div className="w-36">
        <label className="mb-1 block text-[11px] font-medium text-gray-500">Due to</label>
        <input
          type="date"
          value={dueDateTo}
          onChange={(e) => setDueDateTo(e.target.value)}
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-700"
        />
      </div>
      {(search || statusFilter || assigneeFilter || dueDateFrom || dueDateTo) && (
        <button
          onClick={() => { setSearch(""); setStatusFilter(""); setAssigneeFilter(""); setDueDateFrom(""); setDueDateTo(""); }}
          className="h-9 rounded-lg px-3 text-xs font-medium text-gray-500 hover:bg-gray-100 transition"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      <UiPageHeader
        title="All Tasks"
        subtitle={`${filtered.length} task${filtered.length !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={() => navigate("/projects")}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            ← Projects Overview
          </button>
        }
      />
      <UiDataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/tasks?task=${row.id}`)}
        toolbar={toolbar}
        emptyMessage="No tasks match your filters."
      />
    </div>
  );
}
