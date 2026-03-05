import { OpsCaseSlaView, formatDurationMs } from "../domain/opsSla";

export function OpsSlaCountdown({ sla }: { sla: OpsCaseSlaView }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="font-semibold text-slate-600">SLA:</span>
      <span className={sla.slaState === "OVERDUE" ? "font-semibold text-rose-700" : "text-slate-700"}>
        {formatDurationMs(sla.remainingMs)}
      </span>
      <span className="text-slate-500">{sla.slaState.replace(/_/g, " ")}</span>
    </div>
  );
}
