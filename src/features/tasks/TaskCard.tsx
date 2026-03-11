import { Badge, Button } from "../../components/ui";
import { Task, TaskLabel, User } from "../../store/types";

export type TaskCardVariant = "list" | "kanban";

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

function getLabelColor(color: string): string {
  if (LABEL_COLOR_PRESETS.includes(color)) return color;
  return "bg-slate-500";
}

function isOverdue(task: Task): boolean {
  if (task.status === "Done" || !task.dueAt) return false;
  return new Date(task.dueAt).getTime() < Date.now();
}

export interface TaskCardProps {
  task: Task;
  labels: TaskLabel[];
  users: User[];
  variant: TaskCardVariant;
  assigneeName: string;
  onOpen?: (task: Task) => void;
  onUpdateTask?: (id: string, patch: Partial<Task>) => void;
  onMoveToStage?: (task: Task, stage: "Backlog" | "InProgress" | "Done") => void;
  showActions?: boolean;
}

export function TaskCard({
  task,
  labels,
  users,
  variant,
  assigneeName,
  onOpen,
  onUpdateTask,
  onMoveToStage,
  showActions = true,
}: TaskCardProps) {
  const overdue = isOverdue(task);
  const taskLabels = (task.labelIds ?? []).map((id) => labels.find((l) => l.id === id)).filter(Boolean) as TaskLabel[];
  const isUrgent = task.isUrgent === true;

  const cardBaseClass =
    variant === "kanban"
      ? `rounded-lg border p-3 text-left transition hover:shadow-md ${
          isUrgent ? "border-l-4 border-l-rose-500 border-slate-200 bg-white" : "border-slate-200 bg-white"
        }`
      : "";

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-700">{task.title}</p>
          {variant === "list" && task.description && (
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{task.description}</p>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {isUrgent && (
          <Badge className="bg-rose-100 text-rose-700">URGENT</Badge>
        )}
        <Badge className="bg-slate-100 text-slate-700">{task.priority}</Badge>
        {overdue && (
          <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>
        )}
        {taskLabels.map((label) => (
          <span
            key={label.id}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${getLabelColor(label.color)}`}
          >
            {label.name}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
        <span>{assigneeName}</span>
        <span className={overdue ? "font-semibold text-rose-600" : ""}>
          {task.dueAt ? (
            <>
              {overdue && "⚠ "}
              {new Date(task.dueAt).toLocaleDateString()}
            </>
          ) : (
            "-"
          )}
        </span>
      </div>
      {variant === "kanban" && showActions && onMoveToStage && task.status !== "Done" && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2" onClick={(e) => e.stopPropagation()}>
          {task.kanbanStage !== "Backlog" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px]"
              onClick={() => onMoveToStage(task, "Backlog")}
            >
              ← Backlog
            </Button>
          )}
          {task.kanbanStage !== "InProgress" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px]"
              onClick={() => onMoveToStage(task, "InProgress")}
            >
              In Progress →
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-[10px] text-emerald-600"
            onClick={() => {
              onUpdateTask?.(task.id, { status: "Done", kanbanStage: "Done" });
            }}
          >
            Complete
          </Button>
        </div>
      )}
    </>
  );

  if (variant === "kanban") {
    return (
      <div
        className={cardBaseClass}
        role="button"
        tabIndex={0}
        onClick={() => onOpen?.(task)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen?.(task);
          }
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={cardBaseClass || "rounded-lg border border-slate-200 bg-white p-3"}>
      {content}
      {showActions && onOpen && (
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={() => onOpen(task)}>
            Open
          </Button>
        </div>
      )}
    </div>
  );
}
