import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel, StatCard } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import type { HrEmployee, WeeklyStaffReport, WorkloadRating, ProductivityRating } from "../../store/types";

/* ─── helpers ──────────────────────────────────────── */

function weekStartMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + delta);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function shiftWeek(w: string, delta: number): string {
  const d = new Date(w + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta * 7);
  return weekStartMonday(d);
}

function formatWeekLabel(w: string): string {
  return new Date(w + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="text-amber-400 tracking-tight">
      {Array.from({ length: max }, (_, i) => (i < value ? "\u2605" : "\u2606")).join("")}
    </span>
  );
}

function initDraft(report: WeeklyStaffReport | null) {
  return {
    reportText: report?.reportText ?? "",
    highlights: (report?.highlights ?? []).join("\n"),
    workloadRating: report?.workloadRating ?? 3,
    productivityRating: report?.productivityRating ?? 3,
    calendarScreenshotUrl: report?.calendarScreenshotUrl ?? "",
  };
}

const WORKLOAD_OPTIONS = [
  { value: 1, label: "Very Light" },
  { value: 2, label: "Light" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Heavy" },
  { value: 5, label: "Extreme" },
];

const PRODUCTIVITY_OPTIONS = [
  { value: 1, label: "Not productive" },
  { value: 2, label: "Below average" },
  { value: 3, label: "Average" },
  { value: 4, label: "Good" },
  { value: 5, label: "Excellent" },
];

const WORKLOAD_LABELS: Record<number, string> = Object.fromEntries(
  WORKLOAD_OPTIONS.map((o) => [o.value, o.label]),
);
const PRODUCTIVITY_LABELS: Record<number, string> = Object.fromEntries(
  PRODUCTIVITY_OPTIONS.map((o) => [o.value, o.label]),
);

const INPUT_CLS =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400";

function getWeeksInMonth(year: number, month: number): string[] {
  const weeks: string[] = [];
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  let cursor = weekStartMonday(firstDay);
  while (new Date(cursor + "T00:00:00Z") <= lastDay) {
    weeks.push(cursor);
    cursor = shiftWeek(cursor, 1);
  }
  return weeks;
}

function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function formatMonthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/* ─── page ─────────────────────────────────────────── */

export function ManagementReportsPage() {
  const state = useAppStore();
  const [activeTab, setActiveTab] = useState<"my" | "team" | "management">("my");

  const myEmployee = useMemo(() => {
    const bySystem = state.hrEmployees.find(
      (e) => e.systemUserId === state.activeUserId && e.active,
    );
    if (bySystem) return bySystem;
    return state.hrEmployees.find((e) => e.active) ?? state.hrEmployees[0] ?? null;
  }, [state.hrEmployees, state.activeUserId]);

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "my", label: "My Report" },
    { key: "team", label: "Team View" },
    { key: "management", label: "Management" },
  ];

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold transition ${
              activeTab === t.key
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "my" && <MyReportTab myEmployee={myEmployee} />}
      {activeTab === "team" && <TeamViewTab myEmployee={myEmployee} />}
      {activeTab === "management" && <ManagementTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB 1 \u2014 My Report
   ═══════════════════════════════════════════════════════ */

function MyReportTab({ myEmployee }: { myEmployee: HrEmployee | null }) {
  const state = useAppStore();
  const [selectedWeek, setSelectedWeek] = useState(() => weekStartMonday(new Date()));

  const currentReport = useMemo(
    () =>
      myEmployee
        ? (state.weeklyStaffReports.find(
            (r) => r.employeeId === myEmployee.id && r.weekStartDate === selectedWeek,
          ) ?? null)
        : null,
    [state.weeklyStaffReports, myEmployee, selectedWeek],
  );

  const isSubmitted = currentReport?.status === "Submitted";

  const [draft, setDraft] = useState(() => initDraft(currentReport));

  // Reset draft when the selected week changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(initDraft(currentReport)), [selectedWeek]);

  if (!myEmployee) {
    return <p className="text-sm text-slate-500 p-4">No HR employee records found.</p>;
  }

  const handleSaveDraft = () => {
    state.upsertWeeklyStaffReport({
      employeeId: myEmployee.id,
      weekStartDate: selectedWeek,
      status: "Draft",
      reportText: draft.reportText.trim(),
      highlights: draft.highlights
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      workloadRating: draft.workloadRating as WorkloadRating,
      productivityRating: draft.productivityRating as ProductivityRating,
      calendarScreenshotUrl: draft.calendarScreenshotUrl.trim() || undefined,
    });
  };

  const handleSubmit = () => {
    const id = state.upsertWeeklyStaffReport({
      employeeId: myEmployee.id,
      weekStartDate: selectedWeek,
      status: "Draft",
      reportText: draft.reportText.trim(),
      highlights: draft.highlights
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      workloadRating: draft.workloadRating as WorkloadRating,
      productivityRating: draft.productivityRating as ProductivityRating,
      calendarScreenshotUrl: draft.calendarScreenshotUrl.trim() || undefined,
    });
    state.submitWeeklyStaffReport(id);
  };

  const pastWeeks = Array.from({ length: 8 }, (_, i) =>
    shiftWeek(weekStartMonday(new Date()), -(i + 1)),
  );

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setSelectedWeek((w) => shiftWeek(w, -1))}>
          \u2190 Prev
        </Button>
        <span className="text-sm font-medium text-slate-700">
          Week of {formatWeekLabel(selectedWeek)}
        </span>
        <Button size="sm" variant="secondary" onClick={() => setSelectedWeek((w) => shiftWeek(w, 1))}>
          Next \u2192
        </Button>
      </div>

      {/* Status */}
      {isSubmitted ? (
        <Badge className="bg-emerald-100 text-emerald-700">
          Submitted on {new Date(currentReport!.submittedAt!).toLocaleString()}
        </Badge>
      ) : (
        <Badge className="bg-slate-100 text-slate-700">Draft</Badge>
      )}

      {/* Report form */}
      <Card>
        <div className="space-y-4">
          <div>
            <FieldLabel>How was your week? What did you work on?</FieldLabel>
            <textarea
              rows={6}
              className={INPUT_CLS}
              placeholder="Describe your week: key tasks, meetings, outcomes, challenges..."
              value={draft.reportText}
              onChange={(e) => setDraft((d) => ({ ...d, reportText: e.target.value }))}
              disabled={isSubmitted}
            />
          </div>

          <div>
            <FieldLabel>Key highlights (one per line)</FieldLabel>
            <textarea
              rows={4}
              className={INPUT_CLS}
              placeholder={"e.g. Closed deal with Acme Corp\nFinished API integration"}
              value={draft.highlights}
              onChange={(e) => setDraft((d) => ({ ...d, highlights: e.target.value }))}
              disabled={isSubmitted}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Workload this week</FieldLabel>
              <select
                className={INPUT_CLS}
                value={draft.workloadRating}
                onChange={(e) => setDraft((d) => ({ ...d, workloadRating: Number(e.target.value) as WorkloadRating }))}
                disabled={isSubmitted}
              >
                {WORKLOAD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value} \u2013 {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Productivity this week</FieldLabel>
              <select
                className={INPUT_CLS}
                value={draft.productivityRating}
                onChange={(e) => setDraft((d) => ({ ...d, productivityRating: Number(e.target.value) as ProductivityRating }))}
                disabled={isSubmitted}
              >
                {PRODUCTIVITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value} \u2013 {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <FieldLabel>Calendar screenshot / link (optional)</FieldLabel>
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="Paste a URL to your calendar screenshot or export"
              value={draft.calendarScreenshotUrl}
              onChange={(e) => setDraft((d) => ({ ...d, calendarScreenshotUrl: e.target.value }))}
              disabled={isSubmitted}
            />
          </div>

          {!isSubmitted && (
            <div className="flex items-center gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={handleSaveDraft}>
                Save draft
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={!draft.reportText.trim()}>
                Submit report
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Past reports table */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Past reports</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Week</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Workload</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Productivity</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pastWeeks.map((week) => {
                const report = state.weeklyStaffReports.find(
                  (r) => r.employeeId === myEmployee.id && r.weekStartDate === week,
                );
                return (
                  <tr key={week} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-700">Week of {formatWeekLabel(week)}</td>
                    <td className="px-3 py-2">
                      {report?.status === "Submitted" ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Submitted</Badge>
                      ) : report ? (
                        <Badge className="bg-slate-100 text-slate-600">Draft</Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-500">Not started</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StarRating value={report?.workloadRating ?? 0} />
                    </td>
                    <td className="px-3 py-2">
                      <StarRating value={report?.productivityRating ?? 0} />
                    </td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedWeek(week)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB 2 \u2014 Team View
   ═══════════════════════════════════════════════════════ */

function TeamViewTab({ myEmployee }: { myEmployee: HrEmployee | null }) {
  const state = useAppStore();
  const [teamWeek, setTeamWeek] = useState(() => weekStartMonday(new Date()));
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

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

  const teamSummary = useMemo(
    () =>
      myEmployee
        ? (state.weeklyReportAiSummaries
            .filter(
              (s) =>
                s.scope === "team" &&
                s.scopeId === myEmployee.id &&
                s.weekStartDate === teamWeek,
            )
            .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null)
        : null,
    [state.weeklyReportAiSummaries, myEmployee, teamWeek],
  );

  if (!myEmployee) {
    return <p className="text-sm text-slate-500 p-4">No HR employee records found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setTeamWeek((w) => shiftWeek(w, -1))}>
          \u2190 Prev
        </Button>
        <span className="text-sm font-medium text-slate-700">
          Week of {formatWeekLabel(teamWeek)}
        </span>
        <Button size="sm" variant="secondary" onClick={() => setTeamWeek((w) => shiftWeek(w, 1))}>
          Next \u2192
        </Button>
      </div>

      {/* Direct report cards */}
      {directReports.map((emp) => {
        const empReport =
          state.weeklyStaffReports.find(
            (r) => r.employeeId === emp.id && r.weekStartDate === teamWeek,
          ) ?? null;

        const comments = empReport
          ? state.weeklyReportManagerComments.filter((c) => c.reportId === empReport.id)
          : [];

        const expanded = expandedReports[emp.id] ?? false;
        const commentText = commentDrafts[emp.id] ?? "";

        return (
          <Card key={emp.id}>
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-800">
                  {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                </span>
                <span className="ml-2 text-xs text-slate-400">
                  {deptMap.get(emp.departmentId) ?? ""}
                  {emp.position ? ` \u00b7 ${emp.position}` : ""}
                </span>
              </div>
              {empReport?.status === "Submitted" ? (
                <Badge className="bg-emerald-100 text-emerald-700">Submitted</Badge>
              ) : empReport ? (
                <Badge className="bg-slate-100 text-slate-600">Draft</Badge>
              ) : (
                <Badge className="bg-rose-50 text-rose-500">No report</Badge>
              )}
            </div>

            {/* Report body */}
            {!empReport ? (
              <p className="text-xs text-slate-400">No report submitted for this week.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">
                    Workload: <StarRating value={empReport.workloadRating} />{" "}
                    {WORKLOAD_LABELS[empReport.workloadRating]}
                  </span>
                  <span className="text-xs text-slate-500">
                    Productivity: <StarRating value={empReport.productivityRating} />{" "}
                    {PRODUCTIVITY_LABELS[empReport.productivityRating]}
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {expanded || empReport.reportText.length <= 150
                    ? empReport.reportText
                    : empReport.reportText.slice(0, 150) + "\u2026"}
                </p>
                {empReport.reportText.length > 150 && (
                  <button
                    className="text-xs font-medium text-brand-600 hover:underline"
                    onClick={() =>
                      setExpandedReports((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))
                    }
                  >
                    {expanded ? "Show less" : "Show full report"}
                  </button>
                )}

                {empReport.highlights.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-0.5">
                    {empReport.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Manager comments */}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h4 className="mb-2 text-xs font-semibold text-slate-500">Manager comments</h4>

              {comments.length === 0 && (
                <p className="mb-2 text-xs text-slate-400">No comments yet.</p>
              )}

              {comments.map((c) => (
                <div
                  key={c.id}
                  className="mb-2 rounded border border-slate-100 bg-slate-50/50 p-2"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">
                      {getUserName(state, c.managerUserId)}
                    </span>
                    {c.aiGenerated && (
                      <Badge className="bg-violet-100 text-violet-700">AI</Badge>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-xs text-slate-600">{c.commentText}</p>
                </div>
              ))}

              {empReport && (
                <div className="mt-2 flex items-start gap-2">
                  <textarea
                    rows={2}
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Add a comment\u2026"
                    value={commentText}
                    onChange={(e) =>
                      setCommentDrafts((prev) => ({ ...prev, [emp.id]: e.target.value }))
                    }
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!commentText.trim()}
                      onClick={() => {
                        state.addWeeklyReportManagerComment({
                          reportId: empReport.id,
                          managerUserId: state.activeUserId,
                          commentText: commentText.trim(),
                          aiGenerated: false,
                        });
                        setCommentDrafts((prev) => ({ ...prev, [emp.id]: "" }));
                      }}
                    >
                      Add comment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        state.generateWeeklyReportAiSummary("individual", emp.id, teamWeek);
                        const summaries = useAppStore.getState().weeklyReportAiSummaries;
                        const summary = summaries
                          .filter(
                            (s) =>
                              s.scope === "individual" &&
                              s.scopeId === emp.id &&
                              s.weekStartDate === teamWeek,
                          )
                          .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
                        if (summary) {
                          const text = [
                            summary.overallVerdict,
                            summary.workloadAssessment,
                            summary.productivityAssessment,
                            ...(summary.flags.length > 0
                              ? ["Flags: " + summary.flags.join("; ")]
                              : []),
                          ].join("\n");
                          state.addWeeklyReportManagerComment({
                            reportId: empReport.id,
                            managerUserId: state.activeUserId,
                            commentText: text,
                            aiGenerated: true,
                          });
                        }
                      }}
                    >
                      AI assessment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {/* Team summary */}
      <Card title="Team summary for this week">
        <div className="space-y-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => state.generateWeeklyReportAiSummary("team", myEmployee.id, teamWeek)}
          >
            Generate team summary
          </Button>

          {teamSummary && (
            <div className="space-y-1 rounded border border-slate-200 bg-slate-50/50 p-3 text-sm">
              <p className="font-semibold text-slate-800">{teamSummary.overallVerdict}</p>
              <p className="text-xs text-slate-600">{teamSummary.workloadAssessment}</p>
              <p className="text-xs text-slate-600">{teamSummary.productivityAssessment}</p>
              {teamSummary.flags.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs text-rose-600">
                  {teamSummary.flags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[10px] text-slate-400">
                Generated at {new Date(teamSummary.generatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB 3 \u2014 Management (Company-wide)
   ═══════════════════════════════════════════════════════ */

function ManagementTab() {
  const state = useAppStore();
  const [mgmtView, setMgmtView] = useState<"weekly" | "monthly">("weekly");
  const [mgmtWeek, setMgmtWeek] = useState(() => weekStartMonday(new Date()));
  const [mgmtMonth, setMgmtMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "draft" | "missing">("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const deptMap = useMemo(() => {
    const m = new Map<string, string>();
    state.hrDepartments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [state.hrDepartments]);

  const activeEmployees = useMemo(
    () => state.hrEmployees.filter((e) => e.active),
    [state.hrEmployees],
  );

  /* ── weekly computations ─────────────────────────── */

  const reportsThisWeek = useMemo(
    () => state.weeklyStaffReports.filter((r) => r.weekStartDate === mgmtWeek),
    [state.weeklyStaffReports, mgmtWeek],
  );
  const submittedThisWeek = useMemo(
    () => reportsThisWeek.filter((r) => r.status === "Submitted"),
    [reportsThisWeek],
  );
  const avgWorkload =
    submittedThisWeek.length > 0
      ? (submittedThisWeek.reduce((s, r) => s + r.workloadRating, 0) / submittedThisWeek.length).toFixed(1)
      : "\u2013";
  const avgProductivity =
    submittedThisWeek.length > 0
      ? (submittedThisWeek.reduce((s, r) => s + r.productivityRating, 0) / submittedThisWeek.length).toFixed(1)
      : "\u2013";
  const burnoutCount = submittedThisWeek.filter((r) => r.workloadRating === 5).length;
  const missingCount = activeEmployees.filter(
    (emp) => !reportsThisWeek.find((r) => r.employeeId === emp.id && r.status === "Submitted"),
  ).length;

  /* ── department breakdown ────────────────────────── */

  const deptBreakdown = useMemo(() => {
    return state.hrDepartments.map((dept) => {
      const deptEmps = activeEmployees.filter((e) => e.departmentId === dept.id);
      const deptReports = submittedThisWeek.filter((r) =>
        deptEmps.find((e) => e.id === r.employeeId),
      );
      const deptAvgWl =
        deptReports.length > 0
          ? (deptReports.reduce((s, r) => s + r.workloadRating, 0) / deptReports.length).toFixed(1)
          : "\u2013";
      const deptAvgPr =
        deptReports.length > 0
          ? (deptReports.reduce((s, r) => s + r.productivityRating, 0) / deptReports.length).toFixed(1)
          : "\u2013";
      const flags = deptReports.filter((r) => r.workloadRating === 5).length;
      return {
        id: dept.id,
        name: dept.name,
        headcount: deptEmps.length,
        submitted: deptReports.length,
        avgWl: deptAvgWl,
        avgPr: deptAvgPr,
        flags,
      };
    }).filter((d) => d.headcount > 0);
  }, [state.hrDepartments, activeEmployees, submittedThisWeek]);

  /* ── individual rows (filtered) ──────────────────── */

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

  /* ── company AI summary ──────────────────────────── */

  const companySummary = useMemo(
    () =>
      state.weeklyReportAiSummaries
        .filter((s) => s.scope === "company" && s.weekStartDate === mgmtWeek)
        .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null,
    [state.weeklyReportAiSummaries, mgmtWeek],
  );

  /* ── monthly computations ────────────────────────── */

  const [mgmtYear, mgmtMonthNum] = mgmtMonth.split("-").map(Number);
  const monthWeeks = useMemo(() => getWeeksInMonth(mgmtYear, mgmtMonthNum), [mgmtYear, mgmtMonthNum]);

  const monthReports = useMemo(
    () => state.weeklyStaffReports.filter((r) => monthWeeks.includes(r.weekStartDate)),
    [state.weeklyStaffReports, monthWeeks],
  );
  const monthSubmitted = useMemo(() => monthReports.filter((r) => r.status === "Submitted"), [monthReports]);
  const monthTotalSlots = activeEmployees.length * monthWeeks.length;
  const monthSubmissionRate =
    monthTotalSlots > 0 ? ((monthSubmitted.length / monthTotalSlots) * 100).toFixed(0) : "0";
  const monthAvgWl =
    monthSubmitted.length > 0
      ? (monthSubmitted.reduce((s, r) => s + r.workloadRating, 0) / monthSubmitted.length).toFixed(1)
      : "\u2013";
  const monthAvgPr =
    monthSubmitted.length > 0
      ? (monthSubmitted.reduce((s, r) => s + r.productivityRating, 0) / monthSubmitted.length).toFixed(1)
      : "\u2013";

  const monthlySummary = useMemo(
    () =>
      state.weeklyReportAiSummaries
        .filter((s) => s.scope === "company" && s.monthKey === mgmtMonth)
        .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null,
    [state.weeklyReportAiSummaries, mgmtMonth],
  );

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex items-center gap-1">
        {(["weekly", "monthly"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setMgmtView(v)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              mgmtView === v
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {v === "weekly" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      {/* Period selector */}
      {mgmtView === "weekly" ? (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setMgmtWeek((w) => shiftWeek(w, -1))}>
            \u2190 Prev
          </Button>
          <span className="text-sm font-medium text-slate-700">
            Week of {formatWeekLabel(mgmtWeek)}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setMgmtWeek((w) => shiftWeek(w, 1))}>
            Next \u2192
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setMgmtMonth((m) => shiftMonth(m, -1))}>
            \u2190 Prev
          </Button>
          <span className="text-sm font-medium text-slate-700">{formatMonthLabel(mgmtMonth)}</span>
          <Button size="sm" variant="secondary" onClick={() => setMgmtMonth((m) => shiftMonth(m, 1))}>
            Next \u2192
          </Button>
        </div>
      )}

      {mgmtView === "weekly" ? (
        <>
          {/* KPI bar */}
          <div className="grid grid-cols-6 gap-3">
            <StatCard label="Total employees" value={activeEmployees.length} size="sm" />
            <StatCard label="Submitted" value={submittedThisWeek.length} size="sm" accent="success" />
            <StatCard label="Avg workload" value={avgWorkload} size="sm" />
            <StatCard label="Avg productivity" value={avgProductivity} size="sm" />
            <StatCard label="Missing reports" value={missingCount} size="sm" />
            <StatCard label="Burnout flags" value={burnoutCount} size="sm" />
          </div>

          {/* Department breakdown */}
          <Card title="Department breakdown">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Department</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Headcount</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Submitted</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Avg Workload</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Avg Productivity</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {deptBreakdown.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-slate-700">{d.name}</td>
                      <td className="px-3 py-2 text-slate-600">{d.headcount}</td>
                      <td className="px-3 py-2 text-slate-600">{d.submitted}</td>
                      <td className="px-3 py-2 text-slate-600">{d.avgWl}</td>
                      <td className="px-3 py-2 text-slate-600">{d.avgPr}</td>
                      <td className="px-3 py-2">
                        {d.flags > 0 ? (
                          <Badge className="bg-rose-100 text-rose-700">{d.flags}</Badge>
                        ) : (
                          <span className="text-slate-400">\u2013</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {deptBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-xs text-slate-400">
                        No departments with active employees.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div>
              <select
                className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="">All departments</option>
                {state.hrDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="draft">Draft</option>
                <option value="missing">Not started</option>
              </select>
            </div>
          </div>

          {/* Individual report list */}
          <Card title="Individual reports">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Employee</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Department</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Workload</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Productivity</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Preview</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredEmployees.flatMap((emp) => {
                    const empReport = reportsThisWeek.find((r) => r.employeeId === emp.id) ?? null;
                    const expanded = expandedRows[emp.id] ?? false;
                    const rows = [
                      <tr key={emp.id} className="align-top hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-medium text-slate-700">
                          {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{deptMap.get(emp.departmentId) ?? "\u2013"}</td>
                        <td className="px-3 py-2">
                          {empReport ? <StarRating value={empReport.workloadRating} /> : <span className="text-slate-300">\u2013</span>}
                        </td>
                        <td className="px-3 py-2">
                          {empReport ? <StarRating value={empReport.productivityRating} /> : <span className="text-slate-300">\u2013</span>}
                        </td>
                        <td className="px-3 py-2">
                          {empReport?.status === "Submitted" ? (
                            <Badge className="bg-emerald-100 text-emerald-700">Submitted</Badge>
                          ) : empReport ? (
                            <Badge className="bg-slate-100 text-slate-600">Draft</Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-500">Not started</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500 max-w-[200px] truncate">
                          {empReport
                            ? empReport.reportText.length > 80
                              ? empReport.reportText.slice(0, 80) + "\u2026"
                              : empReport.reportText
                            : ""}
                        </td>
                        <td className="px-3 py-2">
                          {empReport && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExpandedRows((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))
                              }
                            >
                              {expanded ? "Hide" : "View"}
                            </Button>
                          )}
                        </td>
                      </tr>,
                    ];
                    if (expanded && empReport) {
                      const empComments = state.weeklyReportManagerComments.filter(
                        (c) => c.reportId === empReport.id,
                      );
                      const empAiSummary =
                        state.weeklyReportAiSummaries
                          .filter(
                            (s) =>
                              s.scope === "individual" &&
                              s.scopeId === emp.id &&
                              s.weekStartDate === mgmtWeek,
                          )
                          .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null;
                      rows.push(
                        <tr key={`${emp.id}-detail`} className="bg-slate-50/30">
                          <td colSpan={7} className="px-3 pb-3">
                            <div className="rounded border border-slate-200 bg-slate-50/50 p-3 text-xs space-y-2">
                              <p className="text-slate-700 whitespace-pre-line">{empReport.reportText}</p>
                              {empReport.highlights.length > 0 && (
                                <div>
                                  <span className="font-semibold text-slate-600">Highlights:</span>
                                  <ul className="list-disc pl-5 text-slate-600 mt-1">
                                    {empReport.highlights.map((h, i) => (
                                      <li key={i}>{h}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {empReport.calendarScreenshotUrl && (
                                <p className="text-slate-500">
                                  Calendar:{" "}
                                  <a
                                    href={empReport.calendarScreenshotUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-brand-600 underline"
                                  >
                                    {empReport.calendarScreenshotUrl}
                                  </a>
                                </p>
                              )}
                              {empComments.length > 0 && (
                                <div>
                                  <span className="font-semibold text-slate-600">Manager comments:</span>
                                  {empComments.map((c) => (
                                    <div key={c.id} className="mt-1 rounded border border-slate-100 bg-white p-2">
                                      <span className="font-medium text-slate-700">
                                        {getUserName(state, c.managerUserId)}
                                      </span>
                                      {c.aiGenerated && (
                                        <Badge className="ml-1 bg-violet-100 text-violet-700">AI</Badge>
                                      )}
                                      <span className="ml-2 text-[10px] text-slate-400">
                                        {new Date(c.createdAt).toLocaleString()}
                                      </span>
                                      <p className="mt-1 whitespace-pre-line text-slate-600">{c.commentText}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {empAiSummary && (
                                <div className="rounded border border-violet-200 bg-violet-50/50 p-2">
                                  <span className="font-semibold text-violet-700">AI summary:</span>
                                  <p className="mt-1 text-slate-700">{empAiSummary.overallVerdict}</p>
                                  <p className="text-slate-500">{empAiSummary.workloadAssessment}</p>
                                  <p className="text-slate-500">{empAiSummary.productivityAssessment}</p>
                                  {empAiSummary.flags.length > 0 && (
                                    <p className="text-rose-600 mt-1">Flags: {empAiSummary.flags.join("; ")}</p>
                                  )}
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
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-400">
                        No employees match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Company AI summary */}
          <Card title="Company summary">
            <div className="space-y-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => state.generateWeeklyReportAiSummary("company", "all", mgmtWeek)}
              >
                Generate company summary
              </Button>
              {companySummary && (
                <div className="space-y-1 rounded border border-slate-200 bg-slate-50/50 p-3 text-sm">
                  <p className="font-semibold text-slate-800">{companySummary.overallVerdict}</p>
                  <p className="text-xs text-slate-600">{companySummary.workloadAssessment}</p>
                  <p className="text-xs text-slate-600">{companySummary.productivityAssessment}</p>
                  {companySummary.flags.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-xs text-rose-600">
                      {companySummary.flags.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">
                    Generated at {new Date(companySummary.generatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      ) : (
        /* ── Monthly view ─────────────────────────────── */
        <>
          {/* Monthly KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Submitted (month)" value={monthSubmitted.length} size="sm" accent="success" />
            <StatCard label="Submission rate" value={`${monthSubmissionRate}%`} size="sm" />
            <StatCard label="Avg workload" value={monthAvgWl} size="sm" />
            <StatCard label="Avg productivity" value={monthAvgPr} size="sm" />
          </div>

          {/* Monthly calendar grid */}
          <Card title="Monthly overview">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="sticky left-0 z-10 w-40 bg-white px-2 py-2 text-left text-xs font-semibold text-slate-500">
                      Employee
                    </th>
                    {monthWeeks.map((ws) => (
                      <th key={ws} className="px-2 py-2 text-center font-semibold text-slate-500 whitespace-nowrap">
                        {formatWeekLabel(ws)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/30">
                      <td className="sticky left-0 z-10 bg-white px-2 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                        {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                      </td>
                      {monthWeeks.map((ws) => {
                        const r = monthReports.find(
                          (rr) => rr.employeeId === emp.id && rr.weekStartDate === ws,
                        );
                        let bg = "bg-rose-50";
                        let content = "\u274c";
                        if (r?.status === "Submitted") {
                          if (r.productivityRating >= 4) bg = "bg-emerald-100";
                          else if (r.productivityRating <= 2) bg = "bg-amber-100";
                          else bg = "bg-blue-50";
                          content = "\u2705 ";
                        } else if (r) {
                          bg = "bg-slate-100";
                          content = "\ud83d\udcdd";
                        }
                        return (
                          <td key={ws} className="px-1 py-1">
                            <div
                              className={`flex items-center justify-center gap-0.5 rounded px-1.5 py-1 text-center ${bg}`}
                            >
                              <span>{content}</span>
                              {r?.status === "Submitted" && (
                                <StarRating value={r.productivityRating} />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {activeEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan={1 + monthWeeks.length}
                        className="px-3 py-4 text-center text-slate-400"
                      >
                        No active employees.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Monthly AI summary */}
          <Card title="Monthly company summary">
            <div className="space-y-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  state.generateWeeklyReportAiSummary("company", "all", undefined, mgmtMonth)
                }
              >
                Generate monthly summary
              </Button>
              {monthlySummary && (
                <div className="space-y-1 rounded border border-slate-200 bg-slate-50/50 p-3 text-sm">
                  <p className="font-semibold text-slate-800">{monthlySummary.overallVerdict}</p>
                  <p className="text-xs text-slate-600">{monthlySummary.workloadAssessment}</p>
                  <p className="text-xs text-slate-600">{monthlySummary.productivityAssessment}</p>
                  {monthlySummary.flags.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-xs text-rose-600">
                      {monthlySummary.flags.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">
                    Generated at {new Date(monthlySummary.generatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
