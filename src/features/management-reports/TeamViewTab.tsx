import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAppStore } from "../../store/db";
import { UiKpiCard } from "../../ui/UiKpiCard";
import type { HrEmployee } from "../../store/types";
import { StaffWeekCard, type StaffWeekSummary } from "./components/StaffWeekCard";
import { StaffReportCard, type StaffReportData, WORKLOAD_LABELS, PRODUCTIVITY_LABELS } from "./components/StaffReportCard";
import { weekStartMonday, shiftWeek, formatWeekLabel, timeAgo } from "./components/WeekNav";
import { EmployeeProfileDrawer } from "./EmployeeProfileDrawer";

export function TeamViewTab({ myEmployee }: { myEmployee: HrEmployee | null }) {
  const state = useAppStore();
  const thisWeek = useMemo(() => weekStartMonday(new Date()), []);
  const [selectedWeek, setSelectedWeek] = useState(thisWeek);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const directReports = useMemo(() => {
    if (!myEmployee) return [];
    const real = state.hrEmployees.filter((e) => e.managerId === myEmployee.id && e.active);
    if (real.length > 0) return real;
    return state.hrEmployees.filter((e) => e.active && e.id !== myEmployee.id).slice(0, 5);
  }, [myEmployee, state.hrEmployees]);

  const deptMap = useMemo(() => {
    const m = new Map<string, string>();
    state.hrDepartments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [state.hrDepartments]);

  const weekCards: StaffWeekSummary[] = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const w = shiftWeek(thisWeek, -i);
      const weekReports = state.weeklyStaffReports.filter((r) => directReports.some((e) => e.id === r.employeeId) && r.weekStartDate === w);
      const submitted = weekReports.filter((r) => r.status === "Submitted");
      const total = directReports.length;
      const pct = total > 0 ? Math.round((submitted.length / total) * 100) : 0;
      const avgWl = submitted.length > 0 ? (submitted.reduce((s, r) => s + r.workloadRating, 0) / submitted.length).toFixed(1) : "–";
      const avgPr = submitted.length > 0 ? (submitted.reduce((s, r) => s + r.productivityRating, 0) / submitted.length).toFixed(1) : "–";
      return {
        id: w,
        label: `Week of ${formatWeekLabel(w)}`,
        submittedCount: submitted.length,
        totalCount: total,
        completionPct: pct,
        avgWorkload: avgWl,
        avgProductivity: avgPr,
        status: pct === 100 ? "Submitted" as const : pct > 0 ? "Draft" as const : "missing" as const,
      };
    });
  }, [directReports, state.weeklyStaffReports, thisWeek]);

  const teamSummary = useMemo(
    () => myEmployee
      ? state.weeklyReportAiSummaries
          .filter((s) => s.scope === "team" && s.scopeId === myEmployee.id && s.weekStartDate === selectedWeek)
          .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null
      : null,
    [state.weeklyReportAiSummaries, myEmployee, selectedWeek],
  );

  if (!myEmployee) return <p className="text-sm text-gray-500 py-8 text-center">No HR employee records found.</p>;

  const submittedCount = directReports.filter((emp) =>
    state.weeklyStaffReports.find((r) => r.employeeId === emp.id && r.weekStartDate === selectedWeek && r.status === "Submitted"),
  ).length;
  const missingCount = directReports.length - submittedCount;

  const reportCards: StaffReportData[] = directReports.map((emp) => {
    const r = state.weeklyStaffReports.find((rr) => rr.employeeId === emp.id && rr.weekStartDate === selectedWeek) ?? null;
    const noteCount = r ? state.weeklyReportManagerComments.filter((c) => c.reportId === r.id).length : 0;
    const ini = (emp.displayName || `${emp.firstName} ${emp.lastName}`).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    return {
      employeeId: emp.id,
      employeeName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
      department: deptMap.get(emp.departmentId) ?? "–",
      initials: ini,
      status: r?.status === "Submitted" ? "Submitted" : r ? "Draft" : "missing",
      reportText: r?.reportText ?? "",
      highlights: r?.highlights ?? [],
      workloadRating: r?.workloadRating ?? 0,
      productivityRating: r?.productivityRating ?? 0,
      reportId: r?.id ?? null,
      noteCount,
    };
  });

  function handlePostNote(reportId: string, text: string, aiGenerated: boolean) {
    state.addWeeklyReportManagerComment({
      reportId,
      managerUserId: state.activeUserId,
      commentText: text,
      aiGenerated,
    });
  }

  function handleGenerateAi(employeeId: string) {
    state.generateWeeklyReportAiSummary("individual", employeeId, selectedWeek);
    const summaries = useAppStore.getState().weeklyReportAiSummaries;
    const summary = summaries
      .filter((s) => s.scope === "individual" && s.scopeId === employeeId && s.weekStartDate === selectedWeek)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
    const empReport = state.weeklyStaffReports.find((r) => r.employeeId === employeeId && r.weekStartDate === selectedWeek);
    if (summary && empReport) {
      state.addWeeklyReportManagerComment({
        reportId: empReport.id,
        managerUserId: state.activeUserId,
        commentText: [summary.overallVerdict, summary.workloadAssessment, summary.productivityAssessment, ...(summary.flags.length > 0 ? ["Flags: " + summary.flags.join("; ")] : [])].join("\n"),
        aiGenerated: true,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Week timeline strip */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {weekCards.map((w) => (
          <StaffWeekCard key={w.id} week={w} isSelected={w.id === selectedWeek} isThisWeek={w.id === thisWeek} onClick={() => setSelectedWeek(w.id)} />
        ))}
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <UiKpiCard label="Total in Team" value={directReports.length} />
        <UiKpiCard label="Submitted" value={submittedCount} className="border-emerald-200 bg-emerald-50/40" />
        <UiKpiCard label="Missing" value={missingCount} className={missingCount > 0 ? "border-rose-200 bg-rose-50/40" : ""} />
      </div>

      {/* Employee report cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reportCards.map((rc) => (
          <StaffReportCard
            key={rc.employeeId}
            report={rc}
            onNameClick={setSelectedEmployeeId}
            onPostNote={handlePostNote}
            onGenerateAi={handleGenerateAi}
          />
        ))}
      </div>

      {/* Team summary card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Team Summary</h3>
            <p className="text-[10px] text-gray-400">Based on {submittedCount} of {directReports.length} submitted reports</p>
          </div>
          <button
            onClick={() => state.generateWeeklyReportAiSummary("team", myEmployee.id, selectedWeek)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate
          </button>
        </div>
        <div className="px-4 py-4">
          {teamSummary ? (
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm space-y-1">
              <p className="font-semibold text-gray-800">{teamSummary.overallVerdict}</p>
              <p className="text-xs text-gray-600">{teamSummary.workloadAssessment}</p>
              <p className="text-xs text-gray-600">{teamSummary.productivityAssessment}</p>
              {teamSummary.flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {teamSummary.flags.map((f, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{f}</span>)}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-2">Generated {timeAgo(teamSummary.generatedAt)}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No team summary generated yet.</p>
          )}
        </div>
      </div>

      {selectedEmployeeId && <EmployeeProfileDrawer employeeId={selectedEmployeeId} onClose={() => setSelectedEmployeeId(null)} />}
    </div>
  );
}
