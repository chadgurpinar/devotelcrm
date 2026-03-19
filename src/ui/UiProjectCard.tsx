import { ReactNode } from "react";

interface StatusCount {
  label: string;
  count: number;
  color: string;
}

interface UiProjectCardProps {
  name: string;
  owner: string;
  status: string;
  statusColor?: string;
  priority?: string;
  taskCounts: StatusCount[];
  totalTasks: number;
  onClick?: () => void;
  actions?: ReactNode;
}

export function UiProjectCard({ name, owner, status, statusColor, priority, taskCounts, totalTasks, onClick, actions }: UiProjectCardProps) {
  const completedCount = taskCounts.find((c) => c.label === "Done")?.count ?? 0;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={`group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
            {name}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">{owner}</p>
        </div>
        <div className="ml-3 flex items-center gap-2">
          {priority && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              priority === "High" ? "bg-rose-50 text-rose-600" : priority === "Medium" ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-500"
            }`}>
              {priority}
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor ?? "bg-gray-100 text-gray-600"}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">{totalTasks} tasks</span>
          <span className="text-[11px] font-medium text-gray-600">{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Task status breakdown */}
      <div className="flex items-center gap-3">
        {taskCounts.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${item.color}`} />
            <span className="text-[11px] text-gray-500">
              {item.count} {item.label}
            </span>
          </div>
        ))}
      </div>

      {actions && <div className="mt-3 border-t border-gray-100 pt-3">{actions}</div>}
    </div>
  );
}
