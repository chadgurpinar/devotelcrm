import type { WeekSummary } from "./types";

const RISK_CLR = { low: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", high: "bg-rose-100 text-rose-700" };
const STATUS_CLR = { submitted: "bg-emerald-100 text-emerald-700", missing: "bg-amber-100 text-amber-700" };

export function WeekCard({ week, isSelected, isThisWeek, onClick }: { week: WeekSummary; isSelected: boolean; isThisWeek: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex-shrink-0 w-56 rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${isSelected ? "border-indigo-500 bg-indigo-50/60 shadow-md" : "border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow"} ${isThisWeek && !isSelected ? "border-indigo-200" : ""}`}>
      <p className={`text-xs font-semibold mb-1.5 ${isThisWeek ? "text-indigo-600" : "text-gray-800"}`}>{week.label}</p>
      <div className="flex items-center gap-1 mb-1.5">
        {(["technical", "sales", "product", "manager"] as const).map((role) => (
          <span key={role} className={`rounded px-1 py-px text-[8px] font-semibold uppercase ${STATUS_CLR[week.reportStatuses[role]]}`}>{role[0].toUpperCase()}</span>
        ))}
        <span className={`ml-auto rounded-full px-1.5 py-px text-[8px] font-semibold ${RISK_CLR[week.riskLevel]}`}>{week.riskLevel}</span>
      </div>
      {week.managerSummaryPreview ? <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{week.managerSummaryPreview}</p> : <p className="text-[10px] text-gray-400 italic">No summary yet</p>}
    </button>
  );
}
