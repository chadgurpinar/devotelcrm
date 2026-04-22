import { useMemo } from "react";
import { AlertTriangle, ArrowUpRight, Radio, TrendingDown } from "lucide-react";
import { Button } from "../../../components/ui";
import type { TrafficSourceType, WholesaleTrafficRecord } from "../../../store/types";
import { recordProfit, recordRevenue } from "./trafficUtils";

interface InsightCard {
  id: string;
  tone: "amber" | "rose" | "emerald" | "sky";
  title: string;
  body: string;
  icon: typeof AlertTriangle;
}

function aggregateByCountrySource(rows: WholesaleTrafficRecord[]) {
  const map = new Map<string, { vol: number; profit: number; rev: number }>();
  for (const r of rows) {
    const k = `${r.country}|${r.trafficSourceType}`;
    const cur = map.get(k) ?? { vol: 0, profit: 0, rev: 0 };
    cur.vol += r.submitCount;
    cur.profit += recordProfit(r);
    cur.rev += recordRevenue(r);
    map.set(k, cur);
  }
  return map;
}

function aggregateByOperator(rows: WholesaleTrafficRecord[]) {
  const map = new Map<string, { submit: number; del: number }>();
  for (const r of rows) {
    const cur = map.get(r.operator) ?? { submit: 0, del: 0 };
    cur.submit += r.submitCount;
    cur.del += r.deliveryCount;
    map.set(r.operator, cur);
  }
  return map;
}

function sourceShare(rows: WholesaleTrafficRecord[], startMs: number, endMs: number): Map<TrafficSourceType, number> {
  const m = new Map<TrafficSourceType, number>();
  let total = 0;
  for (const r of rows) {
    const t = new Date(r.timestamp).getTime();
    if (t < startMs || t > endMs) continue;
    const v = r.submitCount;
    total += v;
    m.set(r.trafficSourceType, (m.get(r.trafficSourceType) ?? 0) + v);
  }
  const out = new Map<TrafficSourceType, number>();
  if (total <= 0) return out;
  for (const [k, v] of m) {
    out.set(k, v / total);
  }
  return out;
}

export function TrafficInsights({ filtered }: { filtered: WholesaleTrafficRecord[] }) {
  const cards = useMemo<InsightCard[]>(() => {
    const out: InsightCard[] = [];
    const cs = aggregateByCountrySource(filtered);
    let marginHit: { k: string; m: number } | null = null;
    for (const [k, v] of cs) {
      const m = v.rev > 0 ? v.profit / v.rev : 0;
      if (m < 0.08 && v.vol > 50_000 && (!marginHit || m < marginHit.m)) {
        marginHit = { k, m };
      }
    }
    if (marginHit) {
      const [country, src] = marginHit.k.split("|");
      out.push({
        id: "margin",
        tone: "amber",
        title: "Margin compression detected",
        body: `${country} on ${src} is running at ${(marginHit.m * 100).toFixed(1)}% blended margin with meaningful volume — review pricing and routing economics.`,
        icon: TrendingDown,
      });
    }

    let expand: { src: TrafficSourceType; country: string; m: number; vol: number } | null = null;
    for (const [k, v] of cs) {
      const m = v.rev > 0 ? v.profit / v.rev : 0;
      if (m > 0.18 && v.vol > 120_000) {
        const [country, src] = k.split("|") as [string, TrafficSourceType];
        if (!expand || v.vol > expand.vol) expand = { src, country, m, vol: v.vol };
      }
    }
    if (expand) {
      out.push({
        id: "expand",
        tone: "emerald",
        title: "Expansion opportunity",
        body: `${expand.src} traffic in ${expand.country} shows ${(expand.m * 100).toFixed(0)}% margin with strong volume — candidate for capacity expansion or upsell.`,
        icon: ArrowUpRight,
      });
    }

    const opAgg = aggregateByOperator(filtered);
    const badOps: string[] = [];
    for (const [op, v] of opAgg) {
      const dlr = v.submit > 0 ? v.del / v.submit : 1;
      if (v.submit > 30_000 && dlr < 0.95) badOps.push(op);
    }
    if (badOps.length) {
      out.push({
        id: "dlr",
        tone: "rose",
        title: "DLR watchlist",
        body: `${badOps.slice(0, 3).join(", ")} ${badOps.length > 3 ? `+${badOps.length - 3} more` : ""} below 95% DLR on filtered volume — escalate to routing/NOC for partner follow-up.`,
        icon: Radio,
      });
    }

    if (filtered.length > 40) {
      const times = filtered.map((r) => new Date(r.timestamp).getTime()).sort((a, b) => a - b);
      const mid = times[Math.floor(times.length / 2)]!;
      const minT = times[0]!;
      const maxT = times[times.length - 1]!;
      const early = sourceShare(filtered, minT, mid);
      const late = sourceShare(filtered, mid, maxT);
      const ttEarly = early.get("TikTok") ?? 0;
      const ttLate = late.get("TikTok") ?? 0;
      const fbEarly = early.get("Facebook") ?? 0;
      const fbLate = late.get("Facebook") ?? 0;
      if (ttLate > ttEarly + 0.03 && fbLate + 0.02 < fbEarly) {
        out.push({
          id: "mix",
          tone: "sky",
          title: "Traffic mix shift",
          body: `TikTok share increased vs earlier window while Facebook softened — monitor blended margin and capacity on hubbed paths.`,
          icon: AlertTriangle,
        });
      }
    }

    if (out.length === 0) {
      out.push({
        id: "ok",
        tone: "sky",
        title: "No critical signals",
        body: "Current slice looks stable on margin, DLR, and mix heuristics. Refine filters or widen the date range to surface edge cases.",
        icon: AlertTriangle,
      });
    }
    return out.slice(0, 4);
  }, [filtered]);

  const toneRing: Record<InsightCard["tone"], string> = {
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    emerald: "bg-emerald-500",
    sky: "bg-sky-500",
  };

  return (
    <aside className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">Commercial insights</h3>
      <p className="mt-0.5 text-[11px] text-slate-500">Rule-based signals on the filtered dataset.</p>
      <ul className="mt-3 flex flex-1 flex-col gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex gap-2">
                <span className={`mt-0.5 h-8 w-8 shrink-0 rounded-full ${toneRing[c.tone]} flex items-center justify-center text-white`}>
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">{c.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">{c.body}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Button variant="outline" size="sm" className="mt-3 w-full" type="button" onClick={() => alert("Intelligence logs — coming soon.")}>
        View all intelligence logs
      </Button>
    </aside>
  );
}
