import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "../../../store/db";
import { getUserName } from "../../../store/selectors";
import type { WeekSummary, WeekData, Report, ManagerSummary, WeekComment, QuickTaskInput, QuickTask, RiskLevel, ReportStatus } from "./types";

function getCurrentMonday(): string {
  const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d); mon.setDate(d.getDate() + diff); return mon.toISOString().slice(0, 10);
}

function shiftWeek(w: string, delta: number): string {
  const d = new Date(w + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + delta * 7);
  const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day; d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function fmtWeekLabel(w: string): string {
  return "Week of " + new Date(w + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function mapRisk(level?: string): RiskLevel {
  if (level === "High") return "high";
  if (level === "Medium") return "medium";
  return "low";
}

export function useWeeklyReports(projectId: string) {
  const state = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentMonday = getCurrentMonday();
  const weekParam = searchParams.get("week");
  const [selectedWeekId, setSelectedWeekId] = useState(weekParam && weekParam !== "current" ? weekParam : currentMonday);
  const [linkedTasks, setLinkedTasks] = useState<Record<string, string>>({});

  const project = state.projects.find((p) => p.id === projectId);
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);

  useEffect(() => {
    if (weekParam && weekParam !== "current" && weekParam !== selectedWeekId) setSelectedWeekId(weekParam);
  }, [weekParam, selectedWeekId]);

  const weekStarts = useMemo(() => {
    const weeks: string[] = [currentMonday];
    for (let i = 1; i <= 3; i++) weeks.push(shiftWeek(currentMonday, -i));
    return weeks;
  }, [currentMonday]);

  const allReports = useMemo(() => state.projectWeeklyReports.filter((r) => r.projectId === projectId), [state.projectWeeklyReports, projectId]);

  const weeks: WeekSummary[] = useMemo(() => weekStarts.map((ws) => {
    const report = allReports.find((r) => r.weekStartDate === ws);
    const rs = (role: "technical" | "sales" | "product"): ReportStatus => report?.roleReports[role]?.submittedAt ? "submitted" : "missing";
    const ms: ReportStatus = report?.managerSummary?.submittedAt ? "submitted" : "missing";
    const risk = mapRisk(report?.managerSummary?.riskLevel);
    const preview = report?.managerSummary?.executiveSummaryText ?? "";
    return { id: ws, label: ws === currentMonday ? "This Week" : fmtWeekLabel(ws), weekStart: ws, reportStatuses: { technical: rs("technical"), sales: rs("sales"), product: rs("product"), manager: ms }, riskLevel: risk, managerSummaryPreview: preview.length > 80 ? preview.slice(0, 80) + "…" : preview };
  }), [weekStarts, allReports, currentMonday]);

  const selectedWeek: WeekData | null = useMemo(() => {
    if (!project) return null;
    const report = allReports.find((r) => r.weekStartDate === selectedWeekId);
    const summary = weeks.find((w) => w.id === selectedWeekId) ?? weeks[0];

    const buildReport = (type: "technical" | "sales" | "product"): Report => {
      const rr = report?.roleReports[type];
      const uid = type === "technical" ? project.technicalResponsibleUserId : type === "sales" ? project.salesResponsibleUserId : project.productResponsibleUserId;
      const user = userById.get(uid);
      const content = rr ? [...(rr.achievements ?? []).map((a) => "✓ " + a), ...(rr.blockers ?? []).map((b) => "⚠ " + b), ...(rr.inProgress ?? []).map((p) => "→ " + p)].join("\n") : undefined;
      const rc = report?.roleComments?.[type] ?? [];
      const note = rc.map((c) => c.text).join("\n");
      return { type, assigneeName: user?.name ?? "—", assigneeRole: type.charAt(0).toUpperCase() + type.slice(1), status: rr?.submittedAt ? "submitted" : "missing", submittedAt: rr?.submittedAt, content, managerNote: note || undefined, linkedTaskId: linkedTasks[`${selectedWeekId}-${type}`], overallStatus: rr?.overallStatus, score: rr?.score, achievements: rr?.achievements, inProgress: rr?.inProgress, blockers: rr?.blockers, nextWeekFocus: rr?.nextWeekFocus };
    };

    const ms = report?.managerSummary;
    const managerSummary: ManagerSummary = { executiveSummary: ms?.executiveSummaryText ?? "", riskLevel: mapRisk(ms?.riskLevel), blockers: ms?.blockers ?? [], decisionsRequired: ms?.decisionsRequired ?? [], deckLinks: ms?.deckLinks ?? [], status: ms?.submittedAt ? "submitted" : "draft" };

    const comments: WeekComment[] = report ? state.weeklyReportManagerComments.filter((c) => c.reportId === report.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((c) => { const u = userById.get(c.managerUserId); return { id: c.id, authorName: u?.name ?? "Unknown", authorInitials: (u?.name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2), text: c.commentText, createdAt: c.createdAt, aiGenerated: c.aiGenerated }; }) : [];

    const ai = report?.aiSummary;
    const aiSummary = ai ? { text: ai.shortText, missingReports: ai.missingRoles as string[], generatedAt: ai.generatedAt, coverage: { technical: ai.coverage.technicalSubmittedAt, sales: ai.coverage.salesSubmittedAt, product: ai.coverage.productSubmittedAt, manager: ai.coverage.managerSubmittedAt } } : null;

    return { summary, reports: [buildReport("technical"), buildReport("sales"), buildReport("product")], managerSummary, comments, aiSummary };
  }, [project, allReports, selectedWeekId, weeks, userById, state.weeklyReportManagerComments, linkedTasks]);

  const selectWeek = useCallback((id: string) => {
    setSelectedWeekId(id);
    setSearchParams((p) => { p.set("week", id === currentMonday ? "current" : id); return p; }, { replace: true });
  }, [currentMonday, setSearchParams]);

  const addManagerNote = useCallback((reportType: string, note: string) => {
    const report = allReports.find((r) => r.weekStartDate === selectedWeekId);
    if (!report) return;
    state.addWeeklyReportRoleComment(report.id, reportType as "technical" | "sales" | "product", note);
  }, [allReports, selectedWeekId, state]);

  const createQuickTask = useCallback(async (reportType: string, input: QuickTaskInput): Promise<QuickTask> => {
    await new Promise((r) => setTimeout(r, 300));
    const id = "T-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    state.createTask({ title: input.title, description: "", status: "Backlog", priority: input.priority === "high" ? "High" : input.priority === "medium" ? "Medium" : "Low", createdByUserId: state.activeUserId, assigneeUserId: input.assignee, visibility: "Shared", kanbanStage: "Backlog", projectId, dueAt: input.dueDate ? new Date(`${input.dueDate}T12:00:00`).toISOString() : undefined });
    setLinkedTasks((p) => ({ ...p, [`${selectedWeekId}-${reportType}`]: id }));
    return { ...input, id };
  }, [state, projectId, selectedWeekId]);

  const submitManagerSummary = useCallback(() => {
    const report = allReports.find((r) => r.weekStartDate === selectedWeekId);
    if (!report) return;
    const ms = report.managerSummary;
    const now = new Date().toISOString();
    state.updateProjectWeeklyReport({ ...report, managerSummary: { authorUserId: ms?.authorUserId ?? state.activeUserId, executiveSummaryText: ms?.executiveSummaryText ?? "", riskLevel: ms?.riskLevel ?? "Medium", blockers: ms?.blockers ?? [], decisionsRequired: ms?.decisionsRequired ?? [], deckLinks: ms?.deckLinks ?? [], submittedAt: now, updatedAt: now }, updatedAt: now });
  }, [allReports, selectedWeekId, state]);

  const regenerateAiSummary = useCallback(() => {
    state.createProjectWeeklyReport({ projectId, weekStartDate: selectedWeekId, roleReports: {} });
    state.generateProjectAiSummary(projectId, selectedWeekId);
  }, [state, projectId, selectedWeekId]);

  const addComment = useCallback((text: string) => {
    const report = allReports.find((r) => r.weekStartDate === selectedWeekId);
    if (!report) return;
    state.addWeeklyReportManagerComment({ reportId: report.id, managerUserId: state.activeUserId, commentText: text, aiGenerated: false });
  }, [allReports, selectedWeekId, state]);

  const updateManagerField = useCallback((field: string, value: unknown) => {
    const report = allReports.find((r) => r.weekStartDate === selectedWeekId);
    if (!report) return;
    const ms = report.managerSummary;
    state.updateProjectWeeklyReport({ ...report, managerSummary: { authorUserId: ms?.authorUserId ?? state.activeUserId, executiveSummaryText: ms?.executiveSummaryText ?? "", riskLevel: ms?.riskLevel ?? "Medium", blockers: ms?.blockers ?? [], decisionsRequired: ms?.decisionsRequired ?? [], deckLinks: ms?.deckLinks ?? [], submittedAt: ms?.submittedAt, updatedAt: new Date().toISOString(), [field]: value } });
  }, [allReports, selectedWeekId, state]);

  return { weeks, selectedWeekId, selectedWeek, selectWeek, addManagerNote, createQuickTask, submitManagerSummary, regenerateAiSummary, addComment, updateManagerField, getUserName: (uid: string) => getUserName(state, uid), users: state.users, activeUserId: state.activeUserId, currentMonday, projectCreatedAt: project?.createdAt ?? currentMonday };
}
