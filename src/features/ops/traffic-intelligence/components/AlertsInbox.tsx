import { useState } from "react";
import { Button } from "../../../../components/ui";
import type { TrafficAlertEvent } from "../../../../store/types";
import { useAppStore } from "../../../../store/db";

interface Props {
  onInspect: (ev: TrafficAlertEvent) => void;
}

export function AlertsInbox({ onInspect }: Props) {
  const events = useAppStore((s) => s.trafficAlertEvents);
  const rules = useAppStore((s) => s.trafficAlertRules);
  const dismiss = useAppStore((s) => s.dismissTrafficAlertEvent);
  const markRead = useAppStore((s) => s.markTrafficAlertEventRead);
  const runEval = useAppStore((s) => s.runTrafficAlertEvaluation);
  const [showRules, setShowRules] = useState(false);

  const open = events.filter((e) => !e.dismissed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" type="button" onClick={() => runEval()}>
          Run evaluation
        </Button>
        <Button size="sm" variant="outline" type="button" onClick={() => setShowRules((s) => !s)}>
          {showRules ? "Hide" : "Show"} rules ({rules.length})
        </Button>
      </div>
      {showRules && (
        <ul className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
          {rules.map((r) => (
            <li key={r.id} className="border-b border-slate-100 py-1 last:border-0">
              <span className="font-semibold">{r.name}</span> — {r.metric} {r.compareOp} {r.threshold}
              {r.metric === "dlr" ? "" : "×"} on {r.dimension} (min submit {r.minSubmit.toLocaleString()})
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-900">Alerts inbox</h3>
          <p className="text-[11px] text-slate-500">{open.length} open</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {open.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      e.severity === "critical"
                        ? "bg-rose-100 text-rose-800"
                        : e.severity === "warning"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {e.severity}
                  </span>
                  {!e.read && <span className="text-[10px] font-semibold text-indigo-600">New</span>}
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{e.title}</p>
                <p className="text-[11px] text-slate-600">{e.detail}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button size="sm" variant="secondary" type="button" onClick={() => { markRead(e.id, true); onInspect(e); }}>
                  Inspect
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => dismiss(e.id)}>
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
          {open.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No open alerts.</li>}
        </ul>
      </div>
    </div>
  );
}
