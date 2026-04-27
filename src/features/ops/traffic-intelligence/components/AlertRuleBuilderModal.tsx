import { useState } from "react";
import { Button } from "../../../../components/ui";
import type { TrafficAlertMetric, TrafficAlertRule } from "../../../../store/types";
import { useAppStore } from "../../../../store/db";

export function AlertRuleBuilderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addRule = useAppStore((s) => s.addTrafficAlertRule);
  const [name, setName] = useState("New rule");
  const [metric, setMetric] = useState<TrafficAlertMetric>("dlr");
  const [threshold, setThreshold] = useState(0.9);
  const [dimension, setDimension] = useState<TrafficAlertRule["dimension"]>("sourceAccount");
  const [minSubmit, setMinSubmit] = useState(40_000);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">New alert rule</h3>
        <p className="mt-1 text-xs text-slate-500">Rules evaluate against full wholesale traffic records in the store.</p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-600">
            Name
            <input className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Metric
            <select
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={metric}
              onChange={(e) => {
                const m = e.target.value as TrafficAlertMetric;
                setMetric(m);
                setThreshold(m === "volume_spike" ? 2.5 : 0.9);
              }}
            >
              <option value="dlr">DLR below threshold</option>
              <option value="volume_spike">Volume spike vs median hourly</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Threshold {metric === "dlr" ? "(0–1)" : "(× median)"}
            <input
              type="number"
              step={metric === "dlr" ? 0.01 : 0.5}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Dimension
            <select
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={dimension}
              onChange={(e) => setDimension(e.target.value as TrafficAlertRule["dimension"])}
            >
              <option value="sourceAccount">Provider</option>
              <option value="operator">Operator</option>
              <option value="global">Global</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Min submit (filter noise)
            <input type="number" className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm" value={minSubmit} onChange={(e) => setMinSubmit(Number(e.target.value))} />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              addRule({
                name: name.trim() || "Rule",
                enabled: true,
                metric,
                compareOp: metric === "dlr" ? "lt" : "gt",
                threshold,
                dimension,
                minSubmit,
              });
              onClose();
            }}
          >
            Create rule
          </Button>
        </div>
      </div>
    </div>
  );
}
