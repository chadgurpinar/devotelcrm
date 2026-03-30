import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/db";
import type { HrEmployee, WorkloadRating, ProductivityRating } from "../../store/types";
import { StatusPill } from "./components/StatusPill";
import { StaffWeekCard, type StaffWeekSummary } from "./components/StaffWeekCard";
import { WORKLOAD_LABELS, PRODUCTIVITY_LABELS } from "./components/StaffReportCard";
import { weekStartMonday, shiftWeek, formatWeekLabel } from "./components/WeekNav";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50 disabled:text-gray-400";

const WORKLOAD_OPTIONS = [
  { value: 1, label: "Very Light" }, { value: 2, label: "Light" }, { value: 3, label: "Moderate" },
  { value: 4, label: "Heavy" }, { value: 5, label: "Extreme" },
];
const PRODUCTIVITY_OPTIONS = [
  { value: 1, label: "Not productive" }, { value: 2, label: "Below average" }, { value: 3, label: "Average" },
  { value: 4, label: "Good" }, { value: 5, label: "Excellent" },
];

function initDraft(report: { reportText: string; highlights: string[]; workloadRating: number; productivityRating: number; calendarScreenshotUrl?: string } | null) {
  return {
    reportText: report?.reportText ?? "",
    highlights: (report?.highlights ?? []).join("\n"),
    workloadRating: report?.workloadRating ?? 0,
    productivityRating: report?.productivityRating ?? 0,
    calendarScreenshotUrl: report?.calendarScreenshotUrl ?? "",
  };
}

export function MyReportTab({ myEmployee }: { myEmployee: HrEmployee | null }) {
  const state = useAppStore();
  const thisWeek = useMemo(() => weekStartMonday(new Date()), []);
  const [selectedWeek, setSelectedWeek] = useState(thisWeek);
  const [expandedPastWeek, setExpandedPastWeek] = useState<string | null>(null);

  const currentReport = useMemo(
    () => myEmployee ? (state.weeklyStaffReports.find((r) => r.employeeId === myEmployee.id && r.weekStartDate === selectedWeek) ?? null) : null,
    [state.weeklyStaffReports, myEmployee, selectedWeek],
  );
  const isSubmitted = currentReport?.status === "Submitted";
  const [draft, setDraft] = useState(() => initDraft(currentReport));
  const [validationError, setValidationError] = useState("");

  useEffect(() => { setDraft(initDraft(currentReport)); setValidationError(""); }, [selectedWeek, currentReport]);

  const weekCards: StaffWeekSummary[] = useMemo(() => {
    if (!myEmployee) return [];
    return Array.from({ length: 4 }, (_, i) => {
      const w = shiftWeek(thisWeek, -i);
      const r = state.weeklyStaffReports.find((rr) => rr.employeeId === myEmployee.id && rr.weekStartDate === w);
      return {
        id: w,
        label: `Week of ${formatWeekLabel(w)}`,
        submittedCount: r?.status === "Submitted" ? 1 : 0,
        totalCount: 1,
        completionPct: r?.status === "Submitted" ? 100 : r ? 50 : 0,
        avgWorkload: r ? (WORKLOAD_LABELS[r.workloadRating] ?? "–") : "–",
        avgProductivity: r ? (PRODUCTIVITY_LABELS[r.productivityRating] ?? "–") : "–",
        status: r?.status === "Submitted" ? "Submitted" as const : r ? "Draft" as const : "missing" as const,
      };
    });
  }, [myEmployee, state.weeklyStaffReports, thisWeek]);

  if (!myEmployee) return <p className="text-sm text-gray-500 py-8 text-center">No HR employee records found.</p>;

  const handleSaveDraft = () => {
    state.upsertWeeklyStaffReport({
      employeeId: myEmployee.id, weekStartDate: selectedWeek, status: "Draft",
      reportText: draft.reportText.trim(),
      highlights: draft.highlights.split("\n").map((s) => s.trim()).filter(Boolean),
      workloadRating: (draft.workloadRating || 3) as WorkloadRating,
      productivityRating: (draft.productivityRating || 3) as ProductivityRating,
      calendarScreenshotUrl: draft.calendarScreenshotUrl.trim() || undefined,
    });
  };

  const handleSubmit = () => {
    if (!draft.reportText.trim() || draft.workloadRating === 0 || draft.productivityRating === 0) {
      setValidationError("Please select your workload and productivity ratings before submitting.");
      return;
    }
    setValidationError("");
    const id = state.upsertWeeklyStaffReport({
      employeeId: myEmployee.id, weekStartDate: selectedWeek, status: "Draft",
      reportText: draft.reportText.trim(),
      highlights: draft.highlights.split("\n").map((s) => s.trim()).filter(Boolean),
      workloadRating: draft.workloadRating as WorkloadRating,
      productivityRating: draft.productivityRating as ProductivityRating,
      calendarScreenshotUrl: draft.calendarScreenshotUrl.trim() || undefined,
    });
    state.submitWeeklyStaffReport(id);
  };

  const pastWeeks = Array.from({ length: 8 }, (_, i) => shiftWeek(thisWeek, -(i + 1)));
  const canSubmit = draft.reportText.trim() && draft.workloadRating > 0 && draft.productivityRating > 0;

  return (
    <div className="space-y-6">
      {/* Week timeline strip */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {weekCards.map((w) => (
          <StaffWeekCard key={w.id} week={w} isSelected={w.id === selectedWeek} isThisWeek={w.id === thisWeek} onClick={() => setSelectedWeek(w.id)} />
        ))}
      </div>

      {/* Current week form card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Week of {formatWeekLabel(selectedWeek)}</h3>
          <StatusPill status={isSubmitted ? "Submitted" : currentReport ? "Draft" : "missing"} />
        </div>
        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">How was your week?</label>
            <textarea rows={5} className={inputCls} placeholder="Describe your week..." value={draft.reportText} onChange={(e) => setDraft((d) => ({ ...d, reportText: e.target.value }))} disabled={isSubmitted} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Key highlights (one per line)</label>
            <textarea rows={3} className={inputCls} placeholder={"e.g. Closed deal with Acme Corp\nFinished API integration"} value={draft.highlights} onChange={(e) => setDraft((d) => ({ ...d, highlights: e.target.value }))} disabled={isSubmitted} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Workload</label>
              <select className={`${inputCls} ${!isSubmitted && draft.workloadRating === 0 ? "border-amber-400" : ""}`} value={draft.workloadRating} onChange={(e) => setDraft((d) => ({ ...d, workloadRating: Number(e.target.value) as WorkloadRating }))} disabled={isSubmitted}>
                <option value={0}>— Select —</option>
                {WORKLOAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value} – {o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Productivity</label>
              <select className={`${inputCls} ${!isSubmitted && draft.productivityRating === 0 ? "border-amber-400" : ""}`} value={draft.productivityRating} onChange={(e) => setDraft((d) => ({ ...d, productivityRating: Number(e.target.value) as ProductivityRating }))} disabled={isSubmitted}>
                <option value={0}>— Select —</option>
                {PRODUCTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value} – {o.label}</option>)}
              </select>
            </div>
          </div>
          {!isSubmitted && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Calendar link (optional)</label>
              <input className={inputCls} placeholder="Paste a URL..." value={draft.calendarScreenshotUrl} onChange={(e) => setDraft((d) => ({ ...d, calendarScreenshotUrl: e.target.value }))} />
            </div>
          )}
          {validationError && <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{validationError}</div>}
          {!isSubmitted && (
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 mt-3">
              <button onClick={handleSaveDraft} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Save Draft</button>
              <button onClick={handleSubmit} disabled={!canSubmit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Submit Report</button>
            </div>
          )}
        </div>
      </div>

      {/* Past reports table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Past Reports</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Week</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Workload</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Productivity</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {pastWeeks.flatMap((week) => {
              const report = state.weeklyStaffReports.find((r) => r.employeeId === myEmployee.id && r.weekStartDate === week);
              const expanded = expandedPastWeek === week;
              const rows = [
                <tr key={week} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => report && setExpandedPastWeek(expanded ? null : week)}>
                  <td className="px-3 py-2 text-sm text-gray-700">{formatWeekLabel(week)}</td>
                  <td className="px-3 py-2"><StatusPill status={report?.status === "Submitted" ? "Submitted" : report ? "Draft" : "missing"} /></td>
                  <td className="px-3 py-2 text-xs text-gray-600">{report ? WORKLOAD_LABELS[report.workloadRating] ?? "–" : "–"}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{report ? PRODUCTIVITY_LABELS[report.productivityRating] ?? "–" : "–"}</td>
                  <td className="px-3 py-2">
                    {report && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedPastWeek(expanded ? null : week); }}
                        className={`text-xs font-medium ${expanded ? "text-gray-400 hover:text-gray-600" : "text-indigo-600 hover:text-indigo-700"}`}
                      >
                        {expanded ? "Hide" : "Expand"}
                      </button>
                    )}
                  </td>
                </tr>,
              ];
              if (expanded && report) {
                rows.push(
                  <tr key={`${week}-detail`}>
                    <td colSpan={5} className="px-4 py-3 bg-gray-50/60 border-b border-gray-100">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700 whitespace-pre-line">{report.reportText}</p>
                        {report.highlights.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {report.highlights.map((h, i) => <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{h}</span>)}
                          </div>
                        )}
                        <div className="flex gap-4 text-[11px] text-gray-500">
                          <span>Workload: <strong className="text-gray-700">{WORKLOAD_LABELS[report.workloadRating]}</strong></span>
                          <span>Productivity: <strong className="text-gray-700">{PRODUCTIVITY_LABELS[report.productivityRating]}</strong></span>
                        </div>
                      </div>
                    </td>
                  </tr>,
                );
              }
              return rows;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
