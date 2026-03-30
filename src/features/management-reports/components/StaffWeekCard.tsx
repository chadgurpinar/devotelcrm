import type { StaffReportStatus } from "./StatusPill";

export interface StaffWeekSummary {
  id: string;
  label: string;
  submittedCount: number;
  totalCount: number;
  completionPct: number;
  avgWorkload: string;
  avgProductivity: string;
  status: StaffReportStatus;
}

const PCT_CLR = (pct: number) => pct >= 80 ? "bg-emerald-100 text-emerald-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";

export function StaffWeekCard({ week, isSelected, isThisWeek, onClick }: { week: StaffWeekSummary; isSelected: boolean; isThisWeek: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-56 rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
        isSelected ? "border-indigo-500 bg-indigo-50/60 shadow-md" : "border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow"
      } ${isThisWeek && !isSelected ? "border-indigo-200" : ""}`}
    >
      <p className={`text-xs font-semibold mb-1.5 ${isThisWeek ? "text-indigo-600" : "text-gray-800"}`}>{week.label}</p>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`rounded-full px-1.5 py-px text-[8px] font-semibold ${PCT_CLR(week.completionPct)}`}>
          {week.submittedCount}/{week.totalCount}
        </span>
        <span className="text-[9px] text-gray-400 ml-auto">{week.completionPct}%</span>
      </div>
      <div className="flex items-center gap-3 text-[9px] text-gray-500">
        <span>WL: {week.avgWorkload}</span>
        <span>PR: {week.avgProductivity}</span>
      </div>
    </button>
  );
}
