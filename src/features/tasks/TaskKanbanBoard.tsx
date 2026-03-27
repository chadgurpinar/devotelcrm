import { Task, TaskLabel, TaskStatus, User } from "../../store/types";
import { TaskCard } from "./TaskCard";

const COLUMNS: { key: TaskStatus; title: string; borderColor: string }[] = [
  { key: "Backlog", title: "Backlog", borderColor: "border-t-gray-400" },
  { key: "ToDo", title: "To Do", borderColor: "border-t-blue-400" },
  { key: "InProgress", title: "In Progress", borderColor: "border-t-indigo-400" },
  { key: "Done", title: "Done", borderColor: "border-t-emerald-400" },
  { key: "Cancelled", title: "Cancelled", borderColor: "border-t-rose-400" },
];

export interface TaskKanbanBoardProps {
  tasks: Task[];
  users: User[];
  labels: TaskLabel[];
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onOpenTask: (task: Task) => void;
  getUserName: (userId: string) => string;
  getProjectName?: (projectId: string) => string;
}

export function TaskKanbanBoard({ tasks, users, labels, onUpdateTask, onOpenTask, getUserName, getProjectName }: TaskKanbanBoardProps) {
  const activeTasks = tasks.filter((t) => !t.completedAt);

  const byStatus: Record<TaskStatus, Task[]> = { Backlog: [], ToDo: [], InProgress: [], Done: [], Cancelled: [] };
  for (const t of activeTasks) {
    const col = byStatus[t.status] ? t.status : "Backlog";
    byStatus[col].push(t);
  }

  const sortTasks = (list: Task[]) => [...list].sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const moveToStatus = (task: Task, status: TaskStatus) => {
    onUpdateTask(task.id, { status, kanbanStage: status, ...(status === "Done" ? { completedAt: new Date().toISOString() } : {}) });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map(({ key, title, borderColor }) => {
        const colTasks = sortTasks(byStatus[key]);
        return (
          <div key={key} className={`flex-shrink-0 w-56 rounded-xl border border-gray-200 bg-gray-50/50 border-t-2 ${borderColor}`}>
            <div className="px-3 py-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-600">{title}</p>
              <span className="inline-flex items-center justify-center rounded-full bg-gray-200 px-1.5 py-px text-[10px] font-bold text-gray-600">{colTasks.length}</span>
            </div>
            <div className="px-2 pb-2 space-y-1.5 min-h-[80px]">
              {colTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  labels={labels}
                  users={users}
                  variant="kanban"
                  assigneeName={getUserName(task.assigneeUserId)}
                  projectName={task.projectId && getProjectName ? getProjectName(task.projectId) : undefined}
                  onOpen={onOpenTask}
                  onUpdateTask={onUpdateTask}
                  onMoveToStatus={moveToStatus}
                  showActions={true}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
