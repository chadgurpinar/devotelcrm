import type { WholesaleTrafficRecord } from "../../../../store/types";
import { topProviderProfitShare } from "../trafficAlertEval";
import { herfindahlFromShares, providerProfitShares, providerVolumeShares } from "../trafficUtils";

export function TrafficRiskPanel({ filtered }: { filtered: WholesaleTrafficRecord[] }) {
  const vol = providerVolumeShares(filtered);
  const prof = providerProfitShares(filtered);
  const hhiVol = herfindahlFromShares(vol.shares);
  const hhiProf = herfindahlFromShares(prof.shares);
  const top = topProviderProfitShare(filtered);

  const bar = (names: string[], shares: number[], cap: number) => (
    <div className="space-y-1">
      {names.slice(0, cap).map((n, i) => (
        <div key={n} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 truncate text-slate-600">{n}</span>
          <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
            <div className="h-full rounded bg-indigo-500" style={{ width: `${Math.min(100, (shares[i] ?? 0) * 100)}%` }} />
          </div>
          <span className="w-10 tabular-nums text-slate-500">{((shares[i] ?? 0) * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Concentration (volume)</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          HHI (volume) = {hhiVol.toFixed(3)} · 1.0 = single provider. Above ~0.18 suggests meaningful concentration.
        </p>
        <div className="mt-3">{bar(vol.names, vol.shares, 6)}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Concentration (profit)</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          HHI (profit) = {hhiProf.toFixed(3)}
          {top ? (
            <>
              {" "}
              · Top profit provider <span className="font-semibold text-slate-800">{top.name}</span> at{" "}
              {(top.share * 100).toFixed(1)}%
            </>
          ) : null}
        </p>
        <div className="mt-3">{bar(prof.names, prof.shares, 6)}</div>
      </div>
    </div>
  );
}
