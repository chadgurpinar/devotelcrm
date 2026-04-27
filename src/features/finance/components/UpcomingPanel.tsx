import type { VirtualCashflowItem } from "../financeUtils";

function fmt(ccy: string, n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  return `${ccy} ${s}`;
}

export function UpcomingPanel({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: VirtualCashflowItem[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</h4>
      <ul className="mt-2 max-h-[280px] space-y-1 overflow-auto">
        {items.slice(0, 30).map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 border-b border-slate-50 py-1 text-[11px]">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-slate-800">{i.label}</div>
              <div className="text-[10px] text-slate-500">
                {i.entityId} · {i.category ?? "—"} · {i.dueDate}
              </div>
            </div>
            <div className="shrink-0 font-semibold tabular-nums text-slate-700">{fmt(i.currency, i.amount)}</div>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-center text-[11px] text-slate-400">{emptyMessage}</li>}
      </ul>
    </div>
  );
}
