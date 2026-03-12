import { Task, TaskLabel, User } from "../../store/types";
import { TaskCard } from "./TaskCard";

type KanbanStage = "Backlog" | "InProgress" | "Done";

function getTaskStage(task: Task): KanbanStage {
  if (task.kanbanStage) return task.kanbanStage;
  if (task.status === "Done") return "Done";
  if (task.status === "InProgress") return "InProgress";
  return "Backlog";
}

export interface TaskKanbanBoardProps {
  tasks: Task[];
  users: User[];
  labels: TaskLabel[];
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onOpenTask: (task: Task) => void;
  getUserName: (userId: string) => string;
}

export function TaskKanbanBoard({
  tasks,
  users,
  labels,
  onUpdateTask,
  onOpenTask,
  getUserName,
}: TaskKanbanBoardProps) {
  const activeTasks = tasks.filter((t) => t.status !== "Completed" && t.status !== "Archived");
  const byStage = {
    Backlog: activeTasks.filter((t) => getTaskStage(t) === "Backlog"),
    InProgress: activeTasks.filter((t) => getTaskStage(t) === "InProgress"),
    Done: activeTasks.filter((t) => getTaskStage(t) === "Done"),
  };

  const moveToStage = (task: Task, stage: KanbanStage) => {
    const statusMap: Record<KanbanStage, Task["status"]> = {
      Backlog: "Backlog",
      InProgress: "InProgress",
      Done: "Done",
    };
    onUpdateTask(task.id, {
      kanbanStage: stage,
      status: statusMap[stage],
      ...(stage === "Done" ? { completedAt: new Date().toISOString() } : {}),
    });
  };

  const sortTasks = (list: Task[]) => {
    return [...list].sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return 0;
    });
  };

  const columns: { key: KanbanStage; title: string }[] = [
    { key: "Backlog", title: "Backlog" },
    { key: "InProgress", title: "In Progress" },
    { key: "Done", title: "Done" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map(({ key, title }) => (
        <div key={key} className="flex flex-col rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h4>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto min-h-[120px]">
            {sortTasks(byStage[key]).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                labels={labels}
                users={users}
                variant="kanban"
                assigneeName={getUserName(task.assigneeUserId)}
                onOpen={onOpenTask}
                onUpdateTask={onUpdateTask}
                onMoveToStage={moveToStage}
                showActions={true}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
