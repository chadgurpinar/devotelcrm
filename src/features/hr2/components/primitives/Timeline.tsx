import { ReactNode } from "react";

export type TimelineVariant = "default" | "success" | "warning" | "danger" | "info";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: ReactNode;
  timestamp: string;
  actor?: string;
  icon?: ReactNode;
  variant?: TimelineVariant;
}

interface TimelineProps {
  events: TimelineEvent[];
  emptyMessage?: string;
  className?: string;
}

function dotClasses(variant: TimelineVariant): string {
  switch (variant) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "danger":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "info":
      return "bg-sky-50 text-sky-700 border-sky-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function Timeline({
  events,
  emptyMessage = "No events yet.",
  className = "",
}: TimelineProps) {
  if (events.length === 0) {
    return (
      <div
        className={`rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500 ${className}`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol className={`relative space-y-4 ${className}`}>
      {events.map((event, idx) => (
        <li key={event.id} className="relative flex gap-3">
          {idx < events.length - 1 && (
            <span
              className="absolute left-[15px] top-8 h-[calc(100%-14px)] w-px bg-slate-200"
              aria-hidden
            />
          )}
          <span
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${dotClasses(
              event.variant ?? "default",
            )}`}
          >
            {event.icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-sm font-semibold text-slate-900">{event.title}</p>
              <span className="text-[11px] text-slate-400">{event.timestamp}</span>
            </div>
            {event.description && <div className="mt-0.5 text-xs text-slate-600">{event.description}</div>}
            {event.actor && <p className="mt-1 text-[11px] text-slate-400">by {event.actor}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
