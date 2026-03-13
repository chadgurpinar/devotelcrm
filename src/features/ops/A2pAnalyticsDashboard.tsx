import { useState, useMemo } from "react";
import { Button, Card } from "../../components/ui";

type ServiceType = "SMS" | "Voice" | "Both";
type TimeView = "Daily" | "Weekly" | "Monthly";
type DateRange = 7 | 14 | 30;
type ChartMetric = "Volume" | "Revenue" | "Margin" | "DLR%";

interface DayRow {
  date: string;
  smsSent: number;
  smsDelivered: number;
  voiceCalls: number;
  voiceConnected: number;
  revenue: number;
  cost: number;
  dlrPct: number;
  completionRate: number;
}

const DAILY_DATA: DayRow[] = [
  { date: "Mar 01", smsSent: 1820000, smsDelivered: 1765400, voiceCalls: 42300, voiceConnected: 38070, revenue: 11200, cost: 7840, dlrPct: 97.0, completionRate: 90.0 },
  { date: "Mar 02", smsSent: 1950000, smsDelivered: 1911000, voiceCalls: 44100, voiceConnected: 40572, revenue: 12350, cost: 8645, dlrPct: 98.0, completionRate: 92.0 },
  { date: "Mar 03", smsSent: 2100000, smsDelivered: 2058000, voiceCalls: 46500, voiceConnected: 42315, revenue: 13400, cost: 9380, dlrPct: 98.0, completionRate: 91.0 },
  { date: "Mar 04", smsSent: 1680000, smsDelivered: 1612800, voiceCalls: 39800, voiceConnected: 35422, revenue: 9800, cost: 7056, dlrPct: 96.0, completionRate: 89.0 },
  { date: "Mar 05", smsSent: 2250000, smsDelivered: 2227500, voiceCalls: 48200, voiceConnected: 44504, revenue: 14500, cost: 10150, dlrPct: 99.0, completionRate: 92.3 },
  { date: "Mar 06", smsSent: 1750000, smsDelivered: 1697500, voiceCalls: 41000, voiceConnected: 37310, revenue: 10800, cost: 7776, dlrPct: 97.0, completionRate: 91.0 },
  { date: "Mar 07", smsSent: 1580000, smsDelivered: 1516800, voiceCalls: 35600, voiceConnected: 31684, revenue: 8900, cost: 6408, dlrPct: 96.0, completionRate: 89.0 },
  { date: "Mar 08", smsSent: 2050000, smsDelivered: 2009000, voiceCalls: 45700, voiceConnected: 42201, revenue: 12800, cost: 8960, dlrPct: 98.0, completionRate: 92.3 },
  { date: "Mar 09", smsSent: 2180000, smsDelivered: 2136400, voiceCalls: 47300, voiceConnected: 43516, revenue: 13600, cost: 9520, dlrPct: 98.0, completionRate: 92.0 },
  { date: "Mar 10", smsSent: 1920000, smsDelivered: 1862400, voiceCalls: 43500, voiceConnected: 39585, revenue: 11500, cost: 8050, dlrPct: 97.0, completionRate: 91.0 },
  { date: "Mar 11", smsSent: 2350000, smsDelivered: 2326500, voiceCalls: 49100, voiceConnected: 45662, revenue: 14800, cost: 10360, dlrPct: 99.0, completionRate: 93.0 },
  { date: "Mar 12", smsSent: 1650000, smsDelivered: 1584000, voiceCalls: 38900, voiceConnected: 34621, revenue: 9600, cost: 6912, dlrPct: 96.0, completionRate: 89.0 },
  { date: "Mar 13", smsSent: 2020000, smsDelivered: 1979600, voiceCalls: 44800, voiceConnected: 41216, revenue: 12400, cost: 8680, dlrPct: 98.0, completionRate: 92.0 },
  { date: "Mar 14", smsSent: 1880000, smsDelivered: 1823600, voiceCalls: 42700, voiceConnected: 38857, revenue: 11100, cost: 7770, dlrPct: 97.0, completionRate: 91.0 },
  { date: "Mar 15", smsSent: 2400000, smsDelivered: 2376000, voiceCalls: 50200, voiceConnected: 46686, revenue: 15000, cost: 10500, dlrPct: 99.0, completionRate: 93.0 },
  { date: "Mar 16", smsSent: 1700000, smsDelivered: 1649000, voiceCalls: 40200, voiceConnected: 36582, revenue: 10200, cost: 7344, dlrPct: 97.0, completionRate: 91.0 },
  { date: "Mar 17", smsSent: 1560000, smsDelivered: 1497600, voiceCalls: 36100, voiceConnected: 32129, revenue: 8500, cost: 6120, dlrPct: 96.0, completionRate: 89.0 },
  { date: "Mar 18", smsSent: 2150000, smsDelivered: 2107000, voiceCalls: 46800, voiceConnected: 43056, revenue: 13200, cost: 9240, dlrPct: 98.0, completionRate: 92.0 },
  { date: "Mar 19", smsSent: 2280000, smsDelivered: 2257200, voiceCalls: 48800, voiceConnected: 45384, revenue: 14200, cost: 9940, dlrPct: 99.0, completionRate: 93.0 },
  { date: "Mar 20", smsSent: 1850000, smsDelivered: 1794500, voiceCalls: 43100, voiceConnected: 39219, revenue: 11300, cost: 7910, dlrPct: 97.0, completionRate: 91.0 },
  { date: "Mar 21", smsSent: 1620000, smsDelivered: 1555200, voiceCalls: 37800, voiceConnected: 33642, revenue: 9200, cost: 6624, dlrPct: 96.0, completionRate: 89.0 },
  { date: "Mar 22", smsSent: 2080000, smsDelivered: 2038400, voiceCalls: 45200, voiceConnected: 41584, revenue: 12600, cost: 8820, dlrPct: 98.0, completionRate: 92.0 },
  { date: "Mar 23", smsSent: 1980000, smsDelivered: 1940400, voiceCalls: 44500, voiceConnected: 40940, revenue: 12100, cost: 8470, dlrPct: 98.0, completionRate: 92.0 },
  { date: "Mar 24", smsSent: 2320000, smsDelivered: 2297800, voiceCalls: 49500, voiceConnected: 46035, revenue: 14600, cost: 10220, dlrPct: 99.0, completionRate: 93.0 },
  { date: "Mar 25", smsSent: 1730000, smsDelivered: 1677100, voiceCalls: 40800, voiceConnected: 37128, revenue: 10500, cost: 7350, dlrPct: 97.0, completionRate: 91.0 },
  { date: "Mar 26", smsSent: 1900000, smsDelivered: 1843000, voiceCalls: 43200, voiceConnected: 39312, revenue: 11600, cost: 8120, dlrPct: 97.0, completionRate: 91.0 },
  { date: "Mar 27", smsSent: 2200000, smsDelivered: 2156000, voiceCalls: 47600, voiceConnected: 43792, revenue: 13800, cost: 9660, dlrPct: 98.0, completionRate: 92.0 },
  { date: "Mar 28", smsSent: 1550000, smsDelivered: 1488000, voiceCalls: 36400, voiceConnected: 32396, revenue: 8200, cost: 5904, dlrPct: 96.0, completionRate: 89.0 },
  { date: "Mar 29", smsSent: 2450000, smsDelivered: 2425500, voiceCalls: 50800, voiceConnected: 47244, revenue: 15200, cost: 10640, dlrPct: 99.0, completionRate: 93.0 },
  { date: "Mar 30", smsSent: 2000000, smsDelivered: 1960000, voiceCalls: 44000, voiceConnected: 40480, revenue: 12000, cost: 8400, dlrPct: 98.0, completionRate: 92.0 },
];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtUsd(n: number): string {
  return "$" + n.toLocaleString();
}

function pctChange(cur: number, prev: number): { text: string; positive: boolean } {
  if (prev === 0) return { text: "N/A", positive: true };
  const delta = ((cur - prev) / prev) * 100;
  return { text: (delta >= 0 ? "+" : "") + delta.toFixed(1) + "%", positive: delta >= 0 };
}

function marginColor(revenue: number, cost: number): string {
  if (revenue === 0) return "";
  const pct = ((revenue - cost) / revenue) * 100;
  if (pct >= 30) return "text-emerald-600";
  if (pct >= 20) return "text-amber-600";
  return "text-rose-600";
}

interface AggRow {
  label: string;
  smsSent: number;
  smsDelivered: number;
  voiceCalls: number;
  voiceConnected: number;
  revenue: number;
  cost: number;
  dlrPct: number;
  completionRate: number;
  days: number;
}

function aggregate(rows: DayRow[], view: TimeView): AggRow[] {
  if (view === "Daily") {
    return rows.map((r) => ({ label: r.date, ...r, days: 1 }));
  }
  if (view === "Monthly") {
    const sum: AggRow = { label: "March 2026", smsSent: 0, smsDelivered: 0, voiceCalls: 0, voiceConnected: 0, revenue: 0, cost: 0, dlrPct: 0, completionRate: 0, days: rows.length };
    rows.forEach((r) => { sum.smsSent += r.smsSent; sum.smsDelivered += r.smsDelivered; sum.voiceCalls += r.voiceCalls; sum.voiceConnected += r.voiceConnected; sum.revenue += r.revenue; sum.cost += r.cost; sum.dlrPct += r.dlrPct; sum.completionRate += r.completionRate; });
    sum.dlrPct = sum.days ? sum.dlrPct / sum.days : 0;
    sum.completionRate = sum.days ? sum.completionRate / sum.days : 0;
    return [sum];
  }
  const weeks: AggRow[] = [];
  for (let i = 0; i < rows.length; i += 7) {
    const chunk = rows.slice(i, i + 7);
    const w: AggRow = { label: `W${Math.floor(i / 7) + 1}`, smsSent: 0, smsDelivered: 0, voiceCalls: 0, voiceConnected: 0, revenue: 0, cost: 0, dlrPct: 0, completionRate: 0, days: chunk.length };
    chunk.forEach((r) => { w.smsSent += r.smsSent; w.smsDelivered += r.smsDelivered; w.voiceCalls += r.voiceCalls; w.voiceConnected += r.voiceConnected; w.revenue += r.revenue; w.cost += r.cost; w.dlrPct += r.dlrPct; w.completionRate += r.completionRate; });
    w.dlrPct = w.days ? w.dlrPct / w.days : 0;
    w.completionRate = w.days ? w.completionRate / w.days : 0;
    weeks.push(w);
  }
  return weeks;
}

function KpiCard({ title, value, sub, compare }: { title: string; value: string; sub?: string; compare?: { text: string; positive: boolean } }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      {compare && (
        <p className={`mt-1 text-xs font-medium ${compare.positive ? "text-emerald-600" : "text-rose-600"}`}>
          {compare.text} vs previous period
        </p>
      )}
    </div>
  );
}

export function A2pAnalyticsDashboard() {
  const [serviceType, setServiceType] = useState<ServiceType>("Both");
  const [timeView, setTimeView] = useState<TimeView>("Daily");
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const [compareOn, setCompareOn] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("Revenue");

  const currentData = useMemo(() => DAILY_DATA.slice(-dateRange), [dateRange]);
  const prevData = useMemo(() => {
    const start = DAILY_DATA.length - dateRange * 2;
    return start >= 0 ? DAILY_DATA.slice(start, start + dateRange) : DAILY_DATA.slice(0, dateRange);
  }, [dateRange]);

  const aggCurrent = useMemo(() => aggregate(currentData, timeView), [currentData, timeView]);
  const aggPrev = useMemo(() => aggregate(prevData, timeView), [prevData, timeView]);

  const totals = (rows: DayRow[]) => {
    const t = { smsSent: 0, smsDelivered: 0, voiceCalls: 0, voiceConnected: 0, revenue: 0, cost: 0, dlrPct: 0, completionRate: 0 };
    rows.forEach((r) => { t.smsSent += r.smsSent; t.smsDelivered += r.smsDelivered; t.voiceCalls += r.voiceCalls; t.voiceConnected += r.voiceConnected; t.revenue += r.revenue; t.cost += r.cost; t.dlrPct += r.dlrPct; t.completionRate += r.completionRate; });
    const n = rows.length || 1;
    t.dlrPct /= n;
    t.completionRate /= n;
    return t;
  };

  const cur = totals(currentData);
  const prev = totals(prevData);

  const volume = serviceType === "Voice" ? cur.voiceCalls : serviceType === "SMS" ? cur.smsSent : cur.smsSent + cur.voiceCalls;
  const prevVolume = serviceType === "Voice" ? prev.voiceCalls : serviceType === "SMS" ? prev.smsSent : prev.smsSent + prev.voiceCalls;
  const qualityLabel = serviceType === "Voice" ? "Avg Completion Rate" : "Avg DLR%";
  const qualityVal = serviceType === "Voice" ? cur.completionRate : cur.dlrPct;
  const prevQualityVal = serviceType === "Voice" ? prev.completionRate : prev.dlrPct;

  const sparkMax = (rows: AggRow[], metric: ChartMetric) => {
    let max = 0;
    rows.forEach((r) => {
      const v = metric === "Volume" ? r.smsSent + r.voiceCalls : metric === "Revenue" ? r.revenue : metric === "Margin" ? r.revenue - r.cost : r.dlrPct;
      if (v > max) max = v;
    });
    return max || 1;
  };

  const sm = sparkMax(aggCurrent, chartMetric);

  const sparkVal = (r: AggRow) => {
    if (chartMetric === "Volume") return r.smsSent + r.voiceCalls;
    if (chartMetric === "Revenue") return r.revenue;
    if (chartMetric === "Margin") return r.revenue - r.cost;
    return r.dlrPct;
  };

  return (
    <div className="space-y-4">
      <Card title="A2P Analytics Dashboard">
        <p className="text-xs text-slate-500">A2P SMS & Voice revenue, margin and traffic analytics.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
            {(["SMS", "Voice", "Both"] as ServiceType[]).map((s) => (
              <Button key={s} size="sm" variant={serviceType === s ? "primary" : "secondary"} onClick={() => setServiceType(s)}>{s}</Button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
            {(["Daily", "Weekly", "Monthly"] as TimeView[]).map((t) => (
              <Button key={t} size="sm" variant={timeView === t ? "primary" : "secondary"} onClick={() => setTimeView(t)}>{t}</Button>
            ))}
          </div>
          <Button size="sm" variant={compareOn ? "primary" : "secondary"} onClick={() => setCompareOn((p) => !p)}>
            Compare: {compareOn ? "ON" : "OFF"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          title="Total Volume"
          value={fmtNum(volume)}
          sub={serviceType === "Both" ? `${fmtNum(cur.smsSent)} SMS · ${fmtNum(cur.voiceCalls)} Voice` : undefined}
          compare={compareOn ? pctChange(volume, prevVolume) : undefined}
        />
        <KpiCard
          title="Revenue"
          value={fmtUsd(cur.revenue)}
          compare={compareOn ? pctChange(cur.revenue, prev.revenue) : undefined}
        />
        <KpiCard
          title="Margin"
          value={fmtUsd(cur.revenue - cur.cost)}
          sub={`${(((cur.revenue - cur.cost) / (cur.revenue || 1)) * 100).toFixed(1)}%`}
          compare={compareOn ? pctChange(cur.revenue - cur.cost, prev.revenue - prev.cost) : undefined}
        />
        <KpiCard
          title={qualityLabel}
          value={qualityVal.toFixed(1) + "%"}
          compare={compareOn ? pctChange(qualityVal, prevQualityVal) : undefined}
        />
      </div>

      <Card title="Filters">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase text-slate-400">Date Range</label>
            <select className="ml-2 rounded border border-slate-200 px-2 py-1 text-xs" value={dateRange} onChange={(e) => setDateRange(Number(e.target.value) as DateRange)}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase text-slate-400">Chart Metric</label>
            <select className="ml-2 rounded border border-slate-200 px-2 py-1 text-xs" value={chartMetric} onChange={(e) => setChartMetric(e.target.value as ChartMetric)}>
              <option value="Volume">Volume</option>
              <option value="Revenue">Revenue</option>
              <option value="Margin">Margin</option>
              <option value="DLR%">DLR%</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Traffic & Revenue Trend">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left">Period</th>
                <th className="text-right">SMS Sent</th>
                <th className="text-right">Delivered</th>
                <th className="text-right">DLR%</th>
                <th className="text-right">Voice</th>
                <th className="text-right">Connected</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Margin</th>
                <th className="w-24">{chartMetric}</th>
              </tr>
            </thead>
            <tbody>
              {[...aggCurrent].reverse().map((row) => {
                const margin = row.revenue - row.cost;
                const barW = Math.max(4, (sparkVal(row) / sm) * 100);
                return (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="font-medium">{row.label}</td>
                    <td className="text-right">{fmtNum(row.smsSent)}</td>
                    <td className="text-right">{fmtNum(row.smsDelivered)}</td>
                    <td className="text-right">{row.dlrPct.toFixed(1)}%</td>
                    <td className="text-right">{fmtNum(row.voiceCalls)}</td>
                    <td className="text-right">{fmtNum(row.voiceConnected)}</td>
                    <td className="text-right font-medium">{fmtUsd(row.revenue)}</td>
                    <td className="text-right">{fmtUsd(row.cost)}</td>
                    <td className={`text-right font-semibold ${marginColor(row.revenue, row.cost)}`}>{fmtUsd(margin)}</td>
                    <td>
                      <div className="h-3 rounded-sm bg-slate-100">
                        <div className="h-3 rounded-sm bg-brand-500" style={{ width: `${barW}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {compareOn && (
        <Card title="Period Comparison">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left">Metric</th>
                <th className="text-right">Current Period</th>
                <th className="text-right">Previous Period</th>
                <th className="text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Total SMS Volume", curVal: cur.smsSent, prevVal: prev.smsSent, fmt: fmtNum },
                { label: "Total Voice Volume", curVal: cur.voiceCalls, prevVal: prev.voiceCalls, fmt: fmtNum },
                { label: "Revenue", curVal: cur.revenue, prevVal: prev.revenue, fmt: fmtUsd },
                { label: "Cost", curVal: cur.cost, prevVal: prev.cost, fmt: fmtUsd },
                { label: "Margin", curVal: cur.revenue - cur.cost, prevVal: prev.revenue - prev.cost, fmt: fmtUsd },
                { label: "Margin %", curVal: ((cur.revenue - cur.cost) / (cur.revenue || 1)) * 100, prevVal: ((prev.revenue - prev.cost) / (prev.revenue || 1)) * 100, fmt: (n: number) => n.toFixed(1) + "%" },
                { label: "Avg DLR%", curVal: cur.dlrPct, prevVal: prev.dlrPct, fmt: (n: number) => n.toFixed(1) + "%" },
                { label: "Avg Completion Rate", curVal: cur.completionRate, prevVal: prev.completionRate, fmt: (n: number) => n.toFixed(1) + "%" },
              ].map((row) => {
                const chg = pctChange(row.curVal, row.prevVal);
                return (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="font-medium">{row.label}</td>
                    <td className="text-right">{row.fmt(row.curVal)}</td>
                    <td className="text-right">{row.fmt(row.prevVal)}</td>
                    <td className={`text-right font-semibold ${chg.positive ? "text-emerald-600" : "text-rose-600"}`}>{chg.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Avg A2P DLR%">
          <p className="text-3xl font-bold text-slate-800">{cur.dlrPct.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-slate-500">Current {dateRange}-day average delivery receipt rate</p>
          {compareOn && (
            <p className={`mt-1 text-xs font-medium ${pctChange(cur.dlrPct, prev.dlrPct).positive ? "text-emerald-600" : "text-rose-600"}`}>
              {pctChange(cur.dlrPct, prev.dlrPct).text} vs previous period
            </p>
          )}
        </Card>
        <Card title="Avg Call Completion Rate">
          <p className="text-3xl font-bold text-slate-800">{cur.completionRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-slate-500">Current {dateRange}-day average voice call completion</p>
          {compareOn && (
            <p className={`mt-1 text-xs font-medium ${pctChange(cur.completionRate, prev.completionRate).positive ? "text-emerald-600" : "text-rose-600"}`}>
              {pctChange(cur.completionRate, prev.completionRate).text} vs previous period
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
