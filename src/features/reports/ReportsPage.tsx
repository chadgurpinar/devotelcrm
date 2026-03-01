import { Card } from "../../components/ui";

export function ReportsPage() {
  return (
    <div className="space-y-4">
      <Card title="Traffic and Revenue (API-ready placeholder)">
        <p className="text-sm text-slate-600">
          This screen is reserved for SMS portal API metrics: traffic, revenue, trend, and partner-level summaries.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Monthly traffic</p>
            <p className="text-xl font-semibold">12.4M msgs</p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Monthly revenue</p>
            <p className="text-xl font-semibold">$482,000</p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Top route margin</p>
            <p className="text-xl font-semibold">18.6%</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
