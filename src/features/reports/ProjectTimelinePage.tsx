import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import {
  Project,
  ProjectRiskLevel,
  ProjectRoleKey,
  ProjectSubmissionKey,
  ProjectWeeklyReport,
} from "../../store/types";

function weekStartMonday(date: Date): string {
  const result = new Date(date);
  const day = result.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + delta);
  result.setUTCHours(0, 0, 0, 0);
  return result.toISOString().slice(0, 10);
}

function fridayDeadline(weekStartDate: string): string {
  const date = new Date(`${weekStartDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4);
  date.setUTCHours(18, 0, 0, 0);
  return date.toISOString();
}

function getReportRisk(report: ProjectWeeklyReport | undefined): ProjectRiskLevel {
  if (report?.managerSummary?.riskLevel) return report.managerSummary.riskLevel;
  if (report?.legacyCombinedReport?.riskLevel) return report.legacyCombinedReport.riskLevel;
  return "Medium";
}

function getReportBlockers(report: ProjectWeeklyReport | undefined): string[] {
  if (!report) return [];
  const blockers = new Set<string>();
  report.roleReports.technical?.blockers.forEach((e) => blockers.add(e));
  report.roleReports.sales?.blockers.forEach((e) => blockers.add(e));
  report.roleReports.product?.blockers.forEach((e) => blockers.add(e));
  report.managerSummary?.blockers.forEach((e) => blockers.add(e));
  report.legacyCombinedReport?.blockers.forEach((e) => blockers.add(e));
  return Array.from(blockers);
}

function getMissingRoles(report: ProjectWeeklyReport | undefined): ProjectSubmissionKey[] {
  if (!report) return ["technical", "sales", "product", "manager"];
  if (report.legacyCombinedReport) return [];
  const missing: ProjectSubmissionKey[] = [];
  if (!report.roleReports.technical?.submittedAt) missing.push("technical");
  if (!report.roleReports.sales?.submittedAt) missing.push("sales");
  if (!report.roleReports.product?.submittedAt) missing.push("product");
  if (!report.managerSummary?.submittedAt) missing.push("manager");
  return missing;
}

function isRoleSubmitted(report: ProjectWeeklyReport | undefined, role: ProjectRoleKey): boolean {
  if (!report) return false;
  if (report.legacyCombinedReport) return true;
  return Boolean(report.roleReports[role]?.submittedAt);
}

function isManagerSubmitted(report: ProjectWeeklyReport | undefined): boolean {
  if (!report) return false;
  if (report.legacyCombinedReport) return true;
  return Boolean(report.managerSummary?.submittedAt);
}

function riskBadgeClass(risk: ProjectRiskLevel): string {
  if (risk === "High") return "bg-rose-100 text-rose-700";
  if (risk === "Medium") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function getWeeksForMonth(year: number, month: number): string[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));

  const firstMonday = new Date(firstDay);
  const dow = firstMonday.getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  firstMonday.setUTCDate(firstMonday.getUTCDate() + delta);

  const weeks: string[] = [];
  const cursor = new Date(firstMonday);
  while (true) {
    const weekEnd = new Date(cursor);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    if (cursor > lastDay && weeks.length > 0) break;
    weeks.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
    if (weeks.length > 6) break;
  }
  return weeks;
}

function isWeekInMonth(weekStart: string, year: number, month: number): boolean {
  const ws = new Date(`${weekStart}T00:00:00Z`);
  const we = new Date(ws);
  we.setUTCDate(we.getUTCDate() + 6);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  return ws <= monthEnd && we >= monthStart;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function ProjectTimelinePage() {
  const state = useAppStore();
  const navigate = useNavigate();
  const [viewMonth, setViewMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [year, month] = viewMonth.split("-").map(Number);

  const weeks = useMemo(() => getWeeksForMonth(year, month), [year, month]);

  const reportByProjectWeek = useMemo(() => {
    const map = new Map<string, Map<string, ProjectWeeklyReport>>();
    state.projectWeeklyReports.forEach((report) => {
      const byWeek = map.get(report.projectId) ?? new Map<string, ProjectWeeklyReport>();
      byWeek.set(report.weekStartDate, report);
      map.set(report.projectId, byWeek);
    });
    return map;
  }, [state.projectWeeklyReports]);

  const activeProjects = useMemo(
    () => state.projects.filter((p) => p.status !== "Completed"),
    [state.projects],
  );

  const prevMonth = () => {
    const d = new Date(Date.UTC(year, month - 2, 1));
    setViewMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const d = new Date(Date.UTC(year, month, 1));
    setViewMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={prevMonth}>← Prev</Button>
          <h2 className="text-sm font-semibold text-slate-800">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <Button size="sm" variant="ghost" onClick={nextMonth}>Next →</Button>
        </div>
        <Button size="sm" variant="secondary" onClick={() => navigate("/reports")}>
          ← Back to Projects
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${160 + weeks.length * 200}px` }}>
          <div className="flex items-end gap-2 border-b border-slate-200 pb-2">
            <div className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Project
            </div>
            {weeks.map((ws) => {
              const inMonth = isWeekInMonth(ws, year, month);
              return (
                <div
                  key={ws}
                  className={`flex-1 text-center text-[11px] font-semibold ${inMonth ? "text-slate-700" : "text-slate-400"}`}
                  style={{ minWidth: 180 }}
                >
                  Week {ws}
                </div>
              );
            })}
          </div>

          {activeProjects.map((project) => (
            <div key={project.id} className="flex items-start gap-2 border-b border-slate-100 py-2">
              <div className="w-40 shrink-0 sticky left-0 z-10 bg-white pr-2">
                <p className="text-xs font-semibold text-slate-800 truncate" title={project.name}>
                  {project.name}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {getUserName(state, project.ownerUserId)}
                </p>
              </div>
              {weeks.map((ws) => {
                const inMonth = isWeekInMonth(ws, year, month);
                const report = reportByProjectWeek.get(project.id)?.get(ws);
                const risk = getReportRisk(report);
                const blockersCount = getReportBlockers(report).length;
                const missing = getMissingRoles(report);
                const hasReport = Boolean(report);

                return (
                  <button
                    key={`${project.id}-${ws}`}
                    className={`flex-1 rounded border p-2 text-left text-[11px] transition ${
                      inMonth
                        ? "border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                        : "border-slate-100 bg-slate-50/50 text-slate-400 cursor-pointer"
                    }`}
                    style={{ minWidth: 180 }}
                    onClick={() => navigate("/reports", { state: { openWeek: { projectId: project.id, weekStartDate: ws } } })}
                  >
                    {hasReport ? (
                      <>
                        <div className="mb-1 flex items-center justify-between gap-1">
                          <Badge className={`${riskBadgeClass(risk)} text-[10px]`}>{risk}</Badge>
                          {blockersCount > 0 && (
                            <span className="text-[10px] text-rose-600">{blockersCount} blocker{blockersCount > 1 ? "s" : ""}</span>
                          )}
                        </div>
                        <p className="text-[10px]">
                          T{isRoleSubmitted(report, "technical") ? "✅" : "❌"}
                          S{isRoleSubmitted(report, "sales") ? "✅" : "❌"}
                          P{isRoleSubmitted(report, "product") ? "✅" : "❌"}
                          M{isManagerSubmitted(report) ? "✅" : "❌"}
                        </p>
                        {missing.length > 0 && (
                          <p className="mt-0.5 text-[10px] text-rose-500 truncate">
                            Missing: {missing.length}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-400">No report</p>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {activeProjects.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">No active projects.</p>
          )}
        </div>
      </div>
    </div>
  );
}
