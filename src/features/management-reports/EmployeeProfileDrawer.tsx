import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { StatusPill } from "./components/StatusPill";
import { weekStartMonday, shiftWeek, formatWeekLabel } from "./components/WeekNav";
import { WORKLOAD_LABELS, PRODUCTIVITY_LABELS, wlColor, prColor } from "./components/StaffReportCard";

const PRIORITY_CLR: Record<string, string> = { Critical: "bg-rose-50 text-rose-700", High: "bg-orange-50 text-orange-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-gray-100 text-gray-500" };

export function EmployeeProfileDrawer({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const state = useAppStore();
  const navigate = useNavigate();
  const [profileTab, setProfileTab] = useState<"tasks" | "reports">("tasks");
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  const emp = state.hrEmployees.find((e) => e.id === employeeId);
  if (!emp) return null;

  const last12Weeks = Array.from({ length: 12 }, (_, i) => shiftWeek(weekStartMonday(new Date()), -i)).reverse();
  const empReports = last12Weeks.map((w) => ({ week: w, report: state.weeklyStaffReports.find((r) => r.employeeId === employeeId && r.weekStartDate === w) ?? null }));
  const submittedReports = empReports.filter((r) => r.report?.status === "Submitted").map((r) => r.report!);
  const submissionRate = last12Weeks.length > 0 ? Math.round((submittedReports.length / last12Weeks.length) * 100) : 0;
  const avgWl = submittedReports.length > 0 ? (submittedReports.reduce((s, r) => s + r.workloadRating, 0) / submittedReports.length).toFixed(1) : "–";
  const avgPr = submittedReports.length > 0 ? (submittedReports.reduce((s, r) => s + r.productivityRating, 0) / submittedReports.length).toFixed(1) : "–";
  const empUser = state.users.find((u) => u.id === emp.systemUserId);
  const empTasks = empUser ? state.tasks.filter((t) => t.assigneeUserId === empUser.id && t.status !== "Cancelled") : [];
  const openTasks = empTasks.filter((t) => t.status !== "Done" && !t.completedAt);
  const completedTasks = empTasks.filter((t) => t.status === "Done");
  const overdueTasks = openTasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());
  const deptMap = new Map(state.hrDepartments.map((d) => [d.id, d.name]));
  const initials = (emp.displayName || `${emp.firstName} ${emp.lastName}`).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">{initials}</div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{emp.displayName || `${emp.firstName} ${emp.lastName}`}</h2>
                <p className="text-xs text-gray-500">{deptMap.get(emp.departmentId) ?? ""}{emp.position ? ` · ${emp.position}` : ""}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex items-center gap-0 border-b border-gray-100 px-6 pt-3 pb-0">
            <button onClick={() => setProfileTab("tasks")} className={`pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors ${profileTab === "tasks" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Active Tasks</button>
            <button onClick={() => setProfileTab("reports")} className={`ml-4 pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors ${profileTab === "reports" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Report History</button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Submit Rate</p>
              <p className="text-lg font-bold text-gray-900">{submissionRate}%</p>
              <p className="text-[10px] text-gray-400">12 weeks</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Avg Workload</p>
              <p className={`text-lg font-bold ${avgWl !== "–" ? wlColor(parseFloat(avgWl)) : "text-gray-400"}`}>{avgWl}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Avg Productivity</p>
              <p className={`text-lg font-bold ${avgPr !== "–" ? prColor(parseFloat(avgPr)) : "text-gray-400"}`}>{avgPr}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Open Tasks</p>
              <p className="text-lg font-bold text-gray-900">{openTasks.length}</p>
              {overdueTasks.length > 0 && <p className="text-[10px] text-rose-600">{overdueTasks.length} overdue</p>}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6 pb-5">
          {profileTab === "tasks" && (
            <div>
              {!empUser ? (
                <p className="text-xs text-gray-400 py-6 text-center">No system user linked to this employee.</p>
              ) : openTasks.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No open tasks.</p>
              ) : (
                <div className="space-y-1.5">
                  {openTasks.slice(0, 15).map((task) => {
                    const isOd = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "Done" && task.status !== "Cancelled";
                    return (
                      <div key={task.id} onClick={() => { onClose(); navigate(`/tasks?taskId=${task.id}`); }} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-200 transition group">
                        <div className="flex items-center gap-2 min-w-0">
                          {isOd && <span className="text-rose-500 flex-shrink-0">!</span>}
                          <span className={`text-sm font-medium truncate ${isOd ? "text-rose-700" : "text-gray-800"}`}>{task.title}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_CLR[task.priority] ?? "bg-gray-100 text-gray-500"}`}>{task.priority}</span>
                          <span className="text-xs text-gray-500">{task.status === "InProgress" ? "In Progress" : task.status === "ToDo" ? "To Do" : task.status}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-400 transition" />
                        </div>
                      </div>
                    );
                  })}
                  {openTasks.length > 15 && <p className="text-[10px] text-gray-400 text-center mt-1">+{openTasks.length - 15} more tasks</p>}
                </div>
              )}
              <p className="mt-3 text-[11px] text-gray-400">
                {completedTasks.length} completed{overdueTasks.length > 0 && <span className="text-rose-500 ml-2">{overdueTasks.length} overdue</span>}
              </p>
            </div>
          )}

          {profileTab === "reports" && (
            <div className="space-y-2">
              {[...empReports].reverse().map(({ week, report }) => (
                <div key={week} className="rounded-lg border border-gray-100 overflow-hidden">
                  <button onClick={() => setExpandedWeek(expandedWeek === week ? null : week)} className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-indigo-50/40 transition text-left">
                    <span className="text-xs font-medium text-gray-700">{formatWeekLabel(week)}</span>
                    <div className="flex items-center gap-3">
                      {report && (
                        <>
                          <span className={`text-[11px] font-medium ${wlColor(report.workloadRating)}`}>WL: {WORKLOAD_LABELS[report.workloadRating]}</span>
                          <span className={`text-[11px] font-medium ${prColor(report.productivityRating)}`}>PR: {PRODUCTIVITY_LABELS[report.productivityRating]}</span>
                        </>
                      )}
                      <StatusPill status={report?.status === "Submitted" ? "Submitted" : report ? "Draft" : "missing"} />
                      <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expandedWeek === week ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {expandedWeek === week && report && (
                    <div className="px-4 py-3 border-t border-gray-100 space-y-3 bg-white">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Weekly Report</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{report.reportText}</p>
                      </div>
                      {report.highlights.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Highlights</p>
                          <div className="flex flex-wrap gap-1">
                            {report.highlights.map((h, i) => <span key={i} className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[11px] text-indigo-700">{h}</span>)}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5">Workload</p>
                          <p className={`text-sm font-semibold ${wlColor(report.workloadRating)}`}>{report.workloadRating} – {WORKLOAD_LABELS[report.workloadRating]}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5">Productivity</p>
                          <p className={`text-sm font-semibold ${prColor(report.productivityRating)}`}>{report.productivityRating} – {PRODUCTIVITY_LABELS[report.productivityRating]}</p>
                        </div>
                      </div>
                      {(() => {
                        const comments = state.weeklyReportManagerComments.filter((c) => c.reportId === report.id);
                        if (comments.length === 0) return <p className="text-[11px] text-gray-400 italic">No manager comments for this week.</p>;
                        return (
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Manager Notes</p>
                            <div className="space-y-2">
                              {comments.map((c) => (
                                <div key={c.id} className={`rounded-lg px-3 py-2 text-xs border-l-2 ${c.aiGenerated ? "bg-violet-50 border-l-violet-400" : "bg-gray-50 border-l-gray-300"}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-700">{getUserName(state, c.managerUserId)}</span>
                                    {c.aiGenerated && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-medium text-violet-700">AI</span>}
                                    <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                                  </div>
                                  <p className="text-gray-600 whitespace-pre-line">{c.commentText}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {report.submittedAt && (
                        <p className="text-[10px] text-gray-400">Submitted {new Date(report.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      )}
                    </div>
                  )}
                  {expandedWeek === week && !report && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-white">
                      <p className="text-xs text-gray-400 italic">No report submitted for this week.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Close</button>
        </div>
      </div>
    </div>
  );
}
