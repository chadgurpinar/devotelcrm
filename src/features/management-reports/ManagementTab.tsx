import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Send, Sparkles } from "lucide-react";
import { useAppStore } from "../../store/db";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { StatusPill } from "./components/StatusPill";
import { StaffWeekCard, type StaffWeekSummary } from "./components/StaffWeekCard";
import {
  weekStartMonday, shiftWeek, formatWeekLabel,
  getWeeksInMonth, shiftMonth, formatMonthLabel, timeAgo,
} from "./components/WeekNav";
import { WORKLOAD_LABELS, PRODUCTIVITY_LABELS, wlColor, prColor } from "./components/StaffReportCard";
import { EmployeeProfileDrawer } from "./EmployeeProfileDrawer";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50 disabled:text-gray-400";
const AI_PROMPTS = ["Summarize this week", "Compare top performers", "Flag burnout risks", "Who is underperforming?", "Team workload overview"];

export function ManagementTab() {
  const state = useAppStore();
  const [mgmtView, setMgmtView] = useState<"weekly" | "monthly">("weekly");
  const thisWeek = useMemo(() => weekStartMonday(new Date()), []);
  const [mgmtWeek, setMgmtWeek] = useState(thisWeek);
  const [mgmtMonth, setMgmtMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "draft" | "missing">("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [aiInput, setAiInput] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const deptMap = useMemo(() => {
    const m = new Map<string, string>();
    state.hrDepartments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [state.hrDepartments]);

  const activeEmployees = useMemo(() => state.hrEmployees.filter((e) => e.active), [state.hrEmployees]);

  // Weekly metrics
  const reportsThisWeek = useMemo(() => state.weeklyStaffReports.filter((r) => r.weekStartDate === mgmtWeek), [state.weeklyStaffReports, mgmtWeek]);
  const submittedThisWeek = useMemo(() => reportsThisWeek.filter((r) => r.status === "Submitted"), [reportsThisWeek]);
  const avgWorkload = submittedThisWeek.length > 0 ? (submittedThisWeek.reduce((s, r) => s + r.workloadRating, 0) / submittedThisWeek.length).toFixed(1) : "–";
  const avgProductivity = submittedThisWeek.length > 0 ? (submittedThisWeek.reduce((s, r) => s + r.productivityRating, 0) / submittedThisWeek.length).toFixed(1) : "–";
  const burnoutCount = submittedThisWeek.filter((r) => r.workloadRating === 5).length;
  const missingCount = activeEmployees.filter((emp) => !reportsThisWeek.find((r) => r.employeeId === emp.id && r.status === "Submitted")).length;

  // Week timeline cards
  const weekCards: StaffWeekSummary[] = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const w = shiftWeek(thisWeek, -i);
      const weekReports = state.weeklyStaffReports.filter((r) => r.weekStartDate === w);
      const submitted = weekReports.filter((r) => r.status === "Submitted" && activeEmployees.some((e) => e.id === r.employeeId));
      const total = activeEmployees.length;
      const pct = total > 0 ? Math.round((submitted.length / total) * 100) : 0;
      const wl = submitted.length > 0 ? (submitted.reduce((s, r) => s + r.workloadRating, 0) / submitted.length).toFixed(1) : "–";
      const pr = submitted.length > 0 ? (submitted.reduce((s, r) => s + r.productivityRating, 0) / submitted.length).toFixed(1) : "–";
      return { id: w, label: `Week of ${formatWeekLabel(w)}`, submittedCount: submitted.length, totalCount: total, completionPct: pct, avgWorkload: wl, avgProductivity: pr, status: pct === 100 ? "Submitted" as const : pct > 0 ? "Draft" as const : "missing" as const };
    });
  }, [activeEmployees, state.weeklyStaffReports, thisWeek]);

  // Department breakdown
  const deptBreakdown = useMemo(() =>
    state.hrDepartments.map((dept) => {
      const deptEmps = activeEmployees.filter((e) => e.departmentId === dept.id);
      const deptReports = submittedThisWeek.filter((r) => deptEmps.find((e) => e.id === r.employeeId));
      const avgWl = deptReports.length > 0 ? (deptReports.reduce((s, r) => s + r.workloadRating, 0) / deptReports.length).toFixed(1) : "–";
      const avgPr = deptReports.length > 0 ? (deptReports.reduce((s, r) => s + r.productivityRating, 0) / deptReports.length).toFixed(1) : "–";
      const subPct = deptEmps.length > 0 ? Math.round((deptReports.length / deptEmps.length) * 100) : 0;
      return { id: dept.id, name: dept.name, headcount: deptEmps.length, submitted: deptReports.length, subPct, avgWl, avgPr, flags: deptReports.filter((r) => r.workloadRating === 5).length };
    }).filter((d) => d.headcount > 0),
    [state.hrDepartments, activeEmployees, submittedThisWeek],
  );

  // Filtered employees for individual reports
  const filteredEmployees = useMemo(() => {
    let list = activeEmployees;
    if (deptFilter) list = list.filter((e) => e.departmentId === deptFilter);
    if (statusFilter !== "all") {
      list = list.filter((emp) => {
        const r = reportsThisWeek.find((rr) => rr.employeeId === emp.id);
        if (statusFilter === "submitted") return r?.status === "Submitted";
        if (statusFilter === "draft") return r && r.status !== "Submitted";
        return !r || r.status !== "Submitted";
      });
    }
    return list;
  }, [activeEmployees, deptFilter, statusFilter, reportsThisWeek]);

  // AI summary
  const companySummary = useMemo(
    () => state.weeklyReportAiSummaries.filter((s) => s.scope === "company" && s.weekStartDate === mgmtWeek).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null,
    [state.weeklyReportAiSummaries, mgmtWeek],
  );

  // Monthly data
  const [mgmtYear, mgmtMonthNum] = mgmtMonth.split("-").map(Number);
  const monthWeeks = useMemo(() => getWeeksInMonth(mgmtYear, mgmtMonthNum), [mgmtYear, mgmtMonthNum]);
  const monthReports = useMemo(() => state.weeklyStaffReports.filter((r) => monthWeeks.includes(r.weekStartDate)), [state.weeklyStaffReports, monthWeeks]);
  const monthSubmitted = useMemo(() => monthReports.filter((r) => r.status === "Submitted"), [monthReports]);
  const monthTotalSlots = activeEmployees.length * monthWeeks.length;
  const monthSubmissionRate = monthTotalSlots > 0 ? ((monthSubmitted.length / monthTotalSlots) * 100).toFixed(0) : "0";
  const monthAvgWl = monthSubmitted.length > 0 ? (monthSubmitted.reduce((s, r) => s + r.workloadRating, 0) / monthSubmitted.length).toFixed(1) : "–";
  const monthAvgPr = monthSubmitted.length > 0 ? (monthSubmitted.reduce((s, r) => s + r.productivityRating, 0) / monthSubmitted.length).toFixed(1) : "–";
  const monthlySummary = useMemo(
    () => state.weeklyReportAiSummaries.filter((s) => s.scope === "company" && s.monthKey === mgmtMonth).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null,
    [state.weeklyReportAiSummaries, mgmtMonth],
  );

  // Coverage indicator badges (per-department)
  const deptCoverage = useMemo(() =>
    deptBreakdown.map((d) => ({ name: d.name, submitted: d.submitted, total: d.headcount })),
    [deptBreakdown],
  );

  return (
    <div className="space-y-6">
      {/* Weekly / Monthly toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 w-fit">
        {(["weekly", "monthly"] as const).map((v) => (
          <button key={v} onClick={() => setMgmtView(v)} className={`rounded px-3 py-1.5 text-xs font-medium transition ${mgmtView === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            {v === "weekly" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      {mgmtView === "weekly" ? (
        <>
          {/* Week timeline strip */}
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {weekCards.map((w) => (
              <StaffWeekCard key={w.id} week={w} isSelected={w.id === mgmtWeek} isThisWeek={w.id === thisWeek} onClick={() => setMgmtWeek(w.id)} />
            ))}
          </div>

          {/* KPI strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <UiKpiCard label="Total Employees" value={activeEmployees.length} />
            <UiKpiCard label="Submitted" value={submittedThisWeek.length} className="border-emerald-200 bg-emerald-50/40" />
            <UiKpiCard label="Missing" value={missingCount} className={missingCount > 0 ? "border-rose-200 bg-rose-50/40" : ""} />
            <UiKpiCard label="Avg Workload" value={avgWorkload} />
            <UiKpiCard label="Avg Productivity" value={avgProductivity} />
            <UiKpiCard label="Burnout Flags" value={burnoutCount} className={burnoutCount > 0 ? "border-rose-200 bg-rose-50/40" : ""} />
          </div>

          {/* Department Breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Department Breakdown</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Department</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Headcount</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Submission %</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Avg Workload</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Avg Productivity</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Flags</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {deptBreakdown.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => { setDeptFilter(d.id); setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }}>
                    <td className="px-3 py-2 text-sm font-medium text-indigo-600 cursor-pointer">{d.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{d.headcount}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{d.submitted} / {d.headcount} <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{d.subPct}%</span></td>
                    <td className="px-3 py-2 text-sm text-gray-600">{d.avgWl}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{d.avgPr}</td>
                    <td className="px-3 py-2">{d.flags > 0 ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">{d.flags}</span> : <span className="text-gray-400">–</span>}</td>
                    <td className="px-3 py-2 text-gray-400">→</td>
                  </tr>
                ))}
                {deptBreakdown.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">No departments.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select className={`w-48 ${inputCls}`} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All departments</option>
              {state.hrDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className={`w-40 ${inputCls}`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="draft">Draft</option>
              <option value="missing">Not started</option>
            </select>
            {deptFilter && <button onClick={() => setDeptFilter("")} className="text-xs text-indigo-600 hover:underline">Clear dept filter</button>}
          </div>

          {/* Individual Reports */}
          <div ref={tableRef} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-800">Individual Reports</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Department</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Workload</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Productivity</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Last Submit</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.flatMap((emp) => {
                  const empReport = reportsThisWeek.find((r) => r.employeeId === emp.id) ?? null;
                  const expanded = expandedRows[emp.id] ?? false;
                  const lastSubmitted = state.weeklyStaffReports.filter((r) => r.employeeId === emp.id && r.status === "Submitted").sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0];
                  const rows = [
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-3 py-2">
                        <button onClick={() => setSelectedEmployeeId(emp.id)} className="text-sm font-medium text-indigo-600 hover:underline">
                          {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{deptMap.get(emp.departmentId) ?? "–"}</td>
                      <td className="px-3 py-2 text-xs">{empReport ? <span className={wlColor(empReport.workloadRating)}>{WORKLOAD_LABELS[empReport.workloadRating]}</span> : <span className="text-gray-400">–</span>}</td>
                      <td className="px-3 py-2 text-xs">{empReport ? <span className={prColor(empReport.productivityRating)}>{PRODUCTIVITY_LABELS[empReport.productivityRating]}</span> : <span className="text-gray-400">–</span>}</td>
                      <td className="px-3 py-2"><StatusPill status={empReport?.status === "Submitted" ? "Submitted" : empReport ? "Draft" : "missing"} /></td>
                      <td className="px-3 py-2 text-xs text-gray-500">{lastSubmitted?.submittedAt ? new Date(lastSubmitted.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "–"}</td>
                      <td className="px-3 py-2">
                        {empReport && (
                          <button onClick={() => setExpandedRows((p) => ({ ...p, [emp.id]: !p[emp.id] }))} className="text-xs font-medium text-indigo-600 hover:underline">
                            {expanded ? "Hide" : "View"}
                          </button>
                        )}
                      </td>
                    </tr>,
                  ];
                  if (expanded && empReport) {
                    rows.push(
                      <tr key={`${emp.id}-detail`} className="bg-gray-50/50">
                        <td colSpan={7} className="px-4 pb-3">
                          <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs space-y-2">
                            <p className="text-gray-700 whitespace-pre-line">{empReport.reportText}</p>
                            {empReport.highlights.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {empReport.highlights.map((h, i) => <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{h}</span>)}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>,
                    );
                  }
                  return rows;
                })}
                {filteredEmployees.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">No employees match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Company AI Summary with coverage badges */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Company AI Summary</h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Weekly</span>
            </div>
            <div className="px-4 py-4 space-y-4">
              {companySummary && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                    <span className="text-xs font-medium text-violet-700">AI Summary</span>
                  </div>
                  <p className="font-semibold text-gray-800">{companySummary.overallVerdict}</p>
                  <p className="text-xs text-gray-600">{companySummary.workloadAssessment}</p>
                  <p className="text-xs text-gray-600">{companySummary.productivityAssessment}</p>
                  {companySummary.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {companySummary.flags.map((f, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{f}</span>)}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">Generated {timeAgo(companySummary.generatedAt)}</p>
                </div>
              )}

              {/* Coverage indicator row */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Department Coverage</p>
                <div className="flex flex-wrap gap-1.5">
                  {deptCoverage.map((d) => (
                    <span key={d.name} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${d.submitted === d.total ? "bg-emerald-100 text-emerald-700" : d.submitted > 0 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                      {d.name}: {d.submitted}/{d.total}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {AI_PROMPTS.map((p) => (
                  <button key={p} onClick={() => setAiInput(p)} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition">
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={`flex-1 ${inputCls}`} placeholder="Ask AI about this week's reports..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} />
                <button onClick={() => { state.generateWeeklyReportAiSummary("company", "all", mgmtWeek); setAiInput(""); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Monthly navigator */}
          <div className="flex items-center gap-2">
            <button onClick={() => setMgmtMonth((m) => shiftMonth(m, -1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700">{formatMonthLabel(mgmtMonth)}</span>
            <button onClick={() => setMgmtMonth((m) => shiftMonth(m, 1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Monthly KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UiKpiCard label="Submitted (month)" value={monthSubmitted.length} className="border-emerald-200 bg-emerald-50/40" />
            <UiKpiCard label="Submission Rate" value={`${monthSubmissionRate}%`} />
            <UiKpiCard label="Avg Workload" value={monthAvgWl} />
            <UiKpiCard label="Avg Productivity" value={monthAvgPr} />
          </div>

          {/* Monthly heatmap */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-800">Monthly Overview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="sticky left-0 z-10 w-40 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-500">Employee</th>
                    {monthWeeks.map((ws) => (
                      <th key={ws} className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">{formatWeekLabel(ws)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50/30">
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap">
                        {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                      </td>
                      {monthWeeks.map((ws) => {
                        const r = monthReports.find((rr) => rr.employeeId === emp.id && rr.weekStartDate === ws);
                        let dotCls = "bg-rose-400";
                        if (r?.status === "Submitted") {
                          dotCls = r.productivityRating >= 4 ? "bg-emerald-500" : r.productivityRating <= 2 ? "bg-amber-400" : "bg-blue-400";
                        } else if (r) {
                          dotCls = "bg-gray-300";
                        }
                        return <td key={ws} className="px-2 py-1.5 text-center"><span className={`inline-block h-3 w-3 rounded-full ${dotCls}`} /></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> High productivity</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-400" /> Average</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Below average</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-rose-400" /> Missing</span>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Monthly Summary</h3>
              <button onClick={() => state.generateWeeklyReportAiSummary("company", "all", undefined, mgmtMonth)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition">
                <Sparkles className="h-3.5 w-3.5" /> Generate
              </button>
            </div>
            <div className="px-4 py-4">
              {monthlySummary ? (
                <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm space-y-1">
                  <p className="font-semibold text-gray-800">{monthlySummary.overallVerdict}</p>
                  <p className="text-xs text-gray-600">{monthlySummary.workloadAssessment}</p>
                  <p className="text-xs text-gray-600">{monthlySummary.productivityAssessment}</p>
                  {monthlySummary.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {monthlySummary.flags.map((f, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{f}</span>)}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">Generated {timeAgo(monthlySummary.generatedAt)}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No monthly summary generated yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      {selectedEmployeeId && <EmployeeProfileDrawer employeeId={selectedEmployeeId} onClose={() => setSelectedEmployeeId(null)} />}
    </div>
  );
}
