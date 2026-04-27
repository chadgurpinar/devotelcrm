import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WholesaleTrafficRecord } from "../../../store/types";
import {
  buildCompareBuckets,
  buildTimeBuckets,
  blendedMarginFromBucket,
  compareDirectDlr,
  compareDirectMargin,
  compareGenDlr,
  compareGenMargin,
  directDlrRatio,
  directMarginRatio,
  generatedDlrRatio,
  generatedMarginRatio,
  type ChartGranularity,
  type ChartMetric,
  type CompareBucketRow,
  type CompareDimension,
  type TimeBucketRow,
  type TrafficChartMode,
} from "./trafficUtils";

const COL_DIRECT = "#1e3a5f";
const COL_GEN = "#94a3b8";
const SRC_COLORS: Record<string, string> = {
  facebook: "#1877f2",
  tiktok: "#0f172a",
  whatsapp: "#16a34a",
  other: "#a855f7",
};

function trendPair(row: TimeBucketRow, metric: ChartMetric): { direct: number; generated: number } {
  switch (metric) {
    case "Volume":
      return { direct: row.directVolume, generated: row.generatedVolume };
    case "Profit":
      return { direct: row.directProfit, generated: row.generatedProfit };
    case "Margin":
      return { direct: directMarginRatio(row) * 100, generated: generatedMarginRatio(row) * 100 };
    case "DLR":
      return { direct: directDlrRatio(row) * 100, generated: generatedDlrRatio(row) * 100 };
    case "Submit":
      return { direct: row.directSubmit, generated: row.generatedSubmit };
    case "Delivery":
      return { direct: row.directDelivery, generated: row.generatedDelivery };
    default:
      return { direct: 0, generated: 0 };
  }
}

function comparePair(row: CompareBucketRow, metric: ChartMetric): { direct: number; generated: number } {
  switch (metric) {
    case "Volume":
      return { direct: row.directVolume, generated: row.generatedVolume };
    case "Profit":
      return { direct: row.directProfit, generated: row.generatedProfit };
    case "Submit":
      return { direct: row.directSubmit, generated: row.generatedSubmit };
    case "Delivery":
      return { direct: row.directDelivery, generated: row.generatedDelivery };
    case "Margin":
      return { direct: compareDirectMargin(row) * 100, generated: compareGenMargin(row) * 100 };
    case "DLR":
      return { direct: compareDirectDlr(row) * 100, generated: compareGenDlr(row) * 100 };
    default:
      return { direct: 0, generated: 0 };
  }
}

interface TrafficChartProps {
  filtered: WholesaleTrafficRecord[];
  filteredCompare?: WholesaleTrafficRecord[] | null;
  chartMode: TrafficChartMode;
  onChartMode: (m: TrafficChartMode) => void;
  metric: ChartMetric;
  onMetric: (m: ChartMetric) => void;
  granularity: ChartGranularity;
  onGranularity: (g: ChartGranularity) => void;
  compareDim: CompareDimension;
  onCompareDim: (d: CompareDimension) => void;
  /** Click a Compare bar to apply that dimension as a filter (soft drill). */
  onCompareDrill?: (dim: CompareDimension, value: string) => void;
}

export function TrafficChart({
  filtered,
  filteredCompare,
  chartMode,
  onChartMode,
  metric,
  onMetric,
  granularity,
  onGranularity,
  compareDim,
  onCompareDim,
  onCompareDrill,
}: TrafficChartProps) {
  const [mixMarginOverlay, setMixMarginOverlay] = useState(true);

  const trendData = useMemo(() => {
    const rows = buildTimeBuckets(filtered, granularity);
    const rowsB = filteredCompare?.length ? buildTimeBuckets(filteredCompare, granularity) : null;
    const mapB = new Map((rowsB ?? []).map((r) => [r.key, r]));
    return rows.map((row) => {
      const { direct, generated } = trendPair(row, metric);
      const bRow = mapB?.get(row.key);
      const totalB =
        bRow && metric === "Volume"
          ? bRow.directVolume + bRow.generatedVolume
          : bRow && metric === "Profit"
            ? bRow.directProfit + bRow.generatedProfit
            : bRow
              ? trendPair(bRow, metric).direct + trendPair(bRow, metric).generated
              : undefined;
      return {
        label: row.label,
        Direct: Math.round(direct * 1000) / 1000,
        Generated: Math.round(generated * 1000) / 1000,
        total: direct + generated,
        compareTotal: totalB !== undefined ? Math.round(totalB * 1000) / 1000 : undefined,
      };
    });
  }, [filtered, filteredCompare, granularity, metric]);

  const mixData = useMemo(() => {
    const rows = buildTimeBuckets(filtered, granularity);
    return rows.map((row) => ({
      label: row.label,
      Facebook: row.facebook,
      TikTok: row.tiktok,
      WhatsApp: row.whatsapp,
      Other: row.other,
      marginPct: row.bucketTotalRevenue > 0 ? blendedMarginFromBucket(row) * 100 : 0,
    }));
  }, [filtered, granularity]);

  const compareData = useMemo(() => {
    const rows = buildCompareBuckets(filtered, compareDim, 10, metric);
    return rows.map((row) => {
      const { direct, generated } = comparePair(row, metric);
      const label = row.dim.length > 14 ? `${row.dim.slice(0, 12)}…` : row.dim;
      return {
        label,
        full: row.dim,
        Direct: Math.round(direct * 1000) / 1000,
        Generated: Math.round(generated * 1000) / 1000,
      };
    });
  }, [filtered, compareDim, metric]);

  const metricSuffix =
    metric === "Margin" || metric === "DLR" ? "%" : metric === "Profit" ? " $" : "";

  return (
    <section className="flex h-full min-h-[320px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {(["Trend", "Compare", "Mix"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChartMode(m)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                chartMode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {chartMode !== "Mix" && (
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
            value={metric}
            onChange={(e) => onMetric(e.target.value as ChartMetric)}
          >
            <option value="Volume">Volume</option>
            <option value="Profit">Profit</option>
            <option value="Margin">Margin</option>
            <option value="DLR">DLR</option>
            <option value="Submit">Submit</option>
            <option value="Delivery">Delivery</option>
          </select>
        )}
        <select
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
          value={granularity}
          onChange={(e) => onGranularity(e.target.value as ChartGranularity)}
        >
          <option value="Hourly">Hourly</option>
          <option value="Daily">Daily</option>
          <option value="Monthly">Monthly</option>
        </select>
        {chartMode === "Compare" && (
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
            value={compareDim}
            onChange={(e) => onCompareDim(e.target.value as CompareDimension)}
          >
            <option value="country">Country</option>
            <option value="operator">Operator</option>
            <option value="senderId">Sender ID</option>
            <option value="destinationAccount">Receiver</option>
            <option value="trafficSourceType">Source type</option>
          </select>
        )}
        {chartMode === "Mix" && (
          <label className="flex cursor-pointer items-center gap-1 text-[10px] font-medium text-slate-600">
            <input type="checkbox" checked={mixMarginOverlay} onChange={(e) => setMixMarginOverlay(e.target.checked)} />
            Margin overlay
          </label>
        )}
        <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: COL_DIRECT }} />
            Direct
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: COL_GEN }} />
            Hubbed
          </span>
        </div>
      </div>

      <div className="min-h-[280px] flex-1">
        {chartMode === "Trend" && (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillDirect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COL_DIRECT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COL_DIRECT} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillGen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COL_GEN} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COL_GEN} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={44} />
              <Tooltip
                formatter={(value, name) => {
                  const v = typeof value === "number" ? value : Number(value);
                  if (value === undefined || value === null || Number.isNaN(v)) return ["—", String(name)];
                  return [`${v.toLocaleString()}${metricSuffix}`, String(name)];
                }}
                labelFormatter={(l) => String(l)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Direct" stroke={COL_DIRECT} fill="url(#fillDirect)" strokeWidth={2} />
              <Area type="monotone" dataKey="Generated" stroke={COL_GEN} fill="url(#fillGen)" strokeWidth={2} />
              {filteredCompare && filteredCompare.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="compareTotal"
                  name="Compare window (total)"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {chartMode === "Compare" && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={compareData}
              margin={{ top: 8, right: 12, left: 0, bottom: 32 }}
              style={{ cursor: onCompareDrill ? "pointer" : undefined }}
              onClick={(next) => {
                if (!onCompareDrill) return;
                const pl = next?.activePayload?.[0]?.payload as { full?: string } | undefined;
                const full = pl?.full;
                if (full) onCompareDrill(compareDim, full);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#94a3b8" interval={0} angle={-18} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={44} />
              <Tooltip formatter={(v: number, name: string) => [`${v.toLocaleString()}${metricSuffix}`, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Direct" fill={COL_DIRECT} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Generated" fill={COL_GEN} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartMode === "Mix" && !mixMarginOverlay && (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={mixData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gFb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SRC_COLORS.facebook} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={SRC_COLORS.facebook} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gTt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SRC_COLORS.tiktok} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SRC_COLORS.tiktok} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gWa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SRC_COLORS.whatsapp} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SRC_COLORS.whatsapp} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gOt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SRC_COLORS.other} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SRC_COLORS.other} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={44} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" stackId="a" dataKey="Facebook" stroke={SRC_COLORS.facebook} fill="url(#gFb)" />
              <Area type="monotone" stackId="a" dataKey="TikTok" stroke={SRC_COLORS.tiktok} fill="url(#gTt)" />
              <Area type="monotone" stackId="a" dataKey="WhatsApp" stroke={SRC_COLORS.whatsapp} fill="url(#gWa)" />
              <Area type="monotone" stackId="a" dataKey="Other" stroke={SRC_COLORS.other} fill="url(#gOt)" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartMode === "Mix" && mixMarginOverlay && (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={mixData} margin={{ top: 8, right: 28, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gFb2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SRC_COLORS.facebook} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SRC_COLORS.facebook} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gTt2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SRC_COLORS.tiktok} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={SRC_COLORS.tiktok} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gWa2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SRC_COLORS.whatsapp} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={SRC_COLORS.whatsapp} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gOt2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SRC_COLORS.other} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={SRC_COLORS.other} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis yAxisId="vol" tick={{ fontSize: 10 }} stroke="#94a3b8" width={44} />
              <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 10 }} stroke="#94a3b8" width={36} domain={[0, "auto"]} />
              <Tooltip formatter={(v: number, name: string) => [name === "marginPct" ? `${v.toFixed(1)}%` : v.toLocaleString(), name === "marginPct" ? "Blended margin" : name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area yAxisId="vol" type="monotone" stackId="a" dataKey="Facebook" stroke={SRC_COLORS.facebook} fill="url(#gFb2)" />
              <Area yAxisId="vol" type="monotone" stackId="a" dataKey="TikTok" stroke={SRC_COLORS.tiktok} fill="url(#gTt2)" />
              <Area yAxisId="vol" type="monotone" stackId="a" dataKey="WhatsApp" stroke={SRC_COLORS.whatsapp} fill="url(#gWa2)" />
              <Area yAxisId="vol" type="monotone" stackId="a" dataKey="Other" stroke={SRC_COLORS.other} fill="url(#gOt2)" />
              <Line yAxisId="pct" type="monotone" dataKey="marginPct" name="Blended margin %" stroke="#ea580c" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {chartMode === "Mix" && (
        <p className="mt-1 text-[10px] text-slate-400">
          Stacked volume by traffic source{mixMarginOverlay ? " with blended margin on delivered traffic (right axis)." : "."}
        </p>
      )}
    </section>
  );
}
