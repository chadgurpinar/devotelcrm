import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowBucket } from "../financeUtils";

function fmtTick(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

export function CashflowChart({ buckets }: { buckets: CashflowBucket[] }) {
  const data = buckets.map((b) => ({
    label: b.key,
    Inflow: Math.round(b.inflow),
    Outflow: -Math.round(b.outflow),
    Net: Math.round(b.net),
    Cumulative: Math.round(b.cumulative),
  }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Projected cashflow</h3>
        <p className="text-[11px] text-slate-500">Stacked bars: inflow vs outflow (EUR). Line: cumulative cash position.</p>
      </div>
      <div className="min-h-[320px]">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#94a3b8" interval="preserveStartEnd" angle={-18} textAnchor="end" height={48} />
            <YAxis yAxisId="bars" tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={fmtTick} width={60} />
            <YAxis yAxisId="cum" orientation="right" tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={fmtTick} width={60} />
            <Tooltip
              formatter={(value, name) => {
                const v = typeof value === "number" ? value : Number(value);
                return [`€${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, String(name)];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="bars" dataKey="Inflow" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar yAxisId="bars" dataKey="Outflow" fill="#ef4444" radius={[0, 0, 2, 2]} />
            <Line yAxisId="cum" type="monotone" dataKey="Cumulative" stroke="#1e3a5f" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
