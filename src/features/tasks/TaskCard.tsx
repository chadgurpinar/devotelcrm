import { Task, TaskLabel, TaskStatus, User } from "../../store/types";

export type TaskCardVariant = "list" | "kanban";

const PRIORITY_CLR: Record<string, string> = { Critical: "bg-rose-100 text-rose-700", High: "bg-orange-100 text-orange-700", Medium: "bg-amber-100 text-amber-700", Low: "bg-gray-100 text-gray-500" };
const STATUS_CLR: Record<string, string> = { Backlog: "bg-gray-100 text-gray-600", ToDo: "bg-blue-50 text-blue-700", InProgress: "bg-indigo-50 text-indigo-700", Done: "bg-emerald-50 text-emerald-700", Cancelled: "bg-rose-50 text-rose-600" };

function isOverdue(task: Task): boolean {
  if (task.status === "Done" || task.status === "Cancelled" || !task.dueAt) return false;
  return new Date(task.dueAt).getTime() < Date.now();
}

function dueDateBadge(task: Task): { label: string; className: string } | null {
  if (!task.dueAt || task.status === "Done" || task.status === "Cancelled") return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(task.dueAt);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const short = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffDays < 0) return { label: `Overdue · ${short}`, className: "bg-rose-100 text-rose-700" };
  if (diffDays === 0) return { label: "Due today", className: "bg-amber-100 text-amber-700" };
  if (diffDays <= 3) return { label: `Due ${short}`, className: "bg-yellow-100 text-yellow-700" };
  return { label: `Due ${short}`, className: "bg-slate-100 text-slate-600" };
}

function getLabelColor(color: string): string {
  const presets = ["bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-cyan-500", "bg-slate-500", "bg-pink-500"];
  return presets.includes(color) ? color : "bg-slate-500";
}

export interface TaskCardProps {
  task: Task;
  labels: TaskLabel[];
  users: User[];
  variant: TaskCardVariant;
  assigneeName: string;
  projectName?: string;
  onOpen?: (task: Task) => void;
  onUpdateTask?: (id: string, patch: Partial<Task>) => void;
  onMoveToStatus?: (task: Task, status: TaskStatus) => void;
  showActions?: boolean;
}

export function TaskCard({ task, labels, variant, assigneeName, projectName, onOpen, onUpdateTask, onMoveToStatus, showActions = true }: TaskCardProps) {
  const overdue = isOverdue(task);
  const taskLabels = (task.labelIds ?? []).map((id) => labels.find((l) => l.id === id)).filter(Boolean) as TaskLabel[];
  const isUrgent = task.isUrgent === true;
  const initials = assigneeName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  if (variant === "kanban") {
    return (
      <div
        className={`rounded-lg border p-2.5 text-left transition hover:shadow-md cursor-pointer ${isUrgent ? "border-l-4 border-l-rose-500 border-gray-200 bg-white" : "border-gray-200 bg-white"}`}
        role="button" tabIndex={0} onClick={() => onOpen?.(task)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(task); } }}
      >
        <p className="text-xs font-medium text-gray-900 mb-1">{task.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[7px] font-bold text-indigo-600">{initials}</div>
            <span className={`rounded-full px-1.5 py-px text-[9px] font-medium ${PRIORITY_CLR[task.priority]}`}>{task.priority[0]}</span>
          </div>
          {(() => { const b = dueDateBadge(task); return b ? <span className={`rounded px-1 py-px text-[8px] font-medium ${b.className}`}>{b.label}</span> : null; })()}
        </div>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {projectName && <span className="rounded bg-gray-100 px-1 py-px text-[8px] text-gray-500">{projectName}</span>}
          {taskLabels.slice(0, 2).map((l) => <span key={l.id} className={`rounded px-1 py-px text-[8px] font-medium text-white ${getLabelColor(l.color)}`}>{l.name}</span>)}
        </div>
        {showActions && onMoveToStatus && task.status !== "Done" && task.status !== "Cancelled" && (
          <div className="mt-1.5 flex flex-wrap gap-1 border-t border-gray-100 pt-1.5" onClick={(e) => e.stopPropagation()}>
            {task.status !== "Backlog" && <button className="rounded px-1.5 py-0.5 text-[9px] text-gray-500 hover:bg-gray-100" onClick={() => onMoveToStatus(task, "Backlog")}>← Backlog</button>}
            {task.status !== "InProgress" && <button className="rounded px-1.5 py-0.5 text-[9px] text-gray-500 hover:bg-gray-100" onClick={() => onMoveToStatus(task, "InProgress")}>In Progress</button>}
            <button className="rounded px-1.5 py-0.5 text-[9px] text-emerald-600 hover:bg-emerald-50" onClick={() => onMoveToStatus(task, "Done")}>Done ✓</button>
          </div>
        )}
        {showActions && onMoveToStatus && task.status === "Done" && (
          <div className="mt-1.5 flex gap-1 border-t border-gray-100 pt-1.5" onClick={(e) => e.stopPropagation()}>
            <button className="rounded px-1.5 py-0.5 text-[9px] text-gray-500 hover:bg-gray-100" onClick={() => onUpdateTask?.(task.id, { archivedAt: task.archivedAt ? undefined : new Date().toISOString() })}>{task.archivedAt ? "Unstar" : "⭐ Star"}</button>
            <button className="rounded px-1.5 py-0.5 text-[9px] text-indigo-600 hover:bg-indigo-50" onClick={() => onUpdateTask?.(task.id, { completedAt: new Date().toISOString() })}>Confirm ✓</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-3 ${isUrgent ? "border-l-4 border-l-rose-500" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-700">{task.title}</p>
          {task.description && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{task.description}</p>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {isUrgent && <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-rose-100 text-rose-700">URGENT</span>}
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_CLR[task.priority]}`}>{task.priority}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLR[task.status] ?? "bg-gray-100 text-gray-600"}`}>{task.status === "InProgress" ? "In Progress" : task.status === "ToDo" ? "To Do" : task.status}</span>
        {overdue && <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-rose-100 text-rose-700">Overdue</span>}
        {projectName && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{projectName}</span>}
        {task.archivedAt && <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700">⭐ Starred</span>}
        {taskLabels.map((l) => <span key={l.id} className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${getLabelColor(l.color)}`}>{l.name}</span>)}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[7px] font-bold text-indigo-600">{initials}</div>
          <span>{assigneeName}</span>
        </div>
        {(() => { const b = dueDateBadge(task); return b ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${b.className}`}>{b.label}</span> : <span className="text-gray-400">—</span>; })()}
      </div>
      {showActions && onOpen && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <button className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition" onClick={() => onOpen(task)}>Open</button>
        </div>
      )}
    </div>
  );
}
