import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import {
  Project,
  ProjectAttachmentLink,
  ProjectRiskLevel,
  ProjectRoleKey,
  ProjectSubmissionKey,
  ProjectWeeklyReport,
  Task,
} from "../../store/types";
import { TaskDrawer } from "../tasks/TaskDrawer";
import { TaskKanbanBoard } from "../tasks/TaskKanbanBoard";

type RiskFilter = "Any" | ProjectRiskLevel;
type StatusFilter = "Any" | Project["status"];
type SortMode = "name" | "daysSinceLastSubmission";
type WeekView = "overview" | ProjectSubmissionKey;
type KpiDrilldown =
  | "none"
  | "inProgress"
  | "highRisk"
  | "withBlockers"
  | "missingThisWeek"
  | "riskTrendUp"
  | "avgDaysSinceLast";

type RoleDraft = {
  achievements: string;
  inProgress: string;
  blockers: string;
  decisionsRequired: string;
  nextWeekFocus: string;
  attachments: string;
};

type ManagerDraft = {
  executiveSummaryText: string;
  riskLevel: ProjectRiskLevel;
  blockers: string;
  decisionsRequired: string;
  deckLinks: string;
};

type ProjectFormState = {
  name: string;
  description: string;
  status: Project["status"];
  strategicPriority: Project["strategicPriority"];
  ownerUserId: string;
  technicalResponsibleUserId: string;
  salesResponsibleUserId: string;
  productResponsibleUserId: string;
  managerUserIds: string[];
  watcherUserIds: string[];
  tagsText: string;
};

type ProjectMeta = {
  latestRisk: ProjectRiskLevel;
  previousRisk?: ProjectRiskLevel;
  blockersCount: number;
  aiShortSummary: string;
  latestSubmissionAt?: string;
  daysSinceLastSubmission?: number;
  missingRolesThisWeek: ProjectSubmissionKey[];
  hasMissingThisWeek: boolean;
  riskTrendUp: boolean;
};

function weekStartMonday(date: Date): string {
  const result = new Date(date);
  const day = result.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + delta);
  result.setUTCHours(0, 0, 0, 0);
  return result.toISOString().slice(0, 10);
}

function shiftWeekStart(weekStartDate: string, weekDelta: number): string {
  const date = new Date(`${weekStartDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + weekDelta * 7);
  return weekStartMonday(date);
}

function fridayDeadline(weekStartDate: string): string {
  const date = new Date(`${weekStartDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4);
  date.setUTCHours(18, 0, 0, 0);
  return date.toISOString();
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(value?: string[]): string {
  return (value ?? []).join("\n");
}

function parseAttachmentLines(value: string): ProjectAttachmentLink[] {
  return splitLines(value)
    .map((line, idx) => {
      const [left, right] = line.split("|").map((entry) => entry.trim());
      if (right) {
        return {
          label: left || `Attachment ${idx + 1}`,
          url: right,
        };
      }
      return {
        label: `Attachment ${idx + 1}`,
        url: left,
      };
    })
    .filter((entry) => Boolean(entry.url));
}

function serializeAttachments(attachments?: ProjectAttachmentLink[]): string {
  if (!attachments || attachments.length === 0) return "";
  return attachments.map((entry) => `${entry.label} | ${entry.url}`).join("\n");
}

function riskToWeight(risk: ProjectRiskLevel): number {
  if (risk === "High") return 3;
  if (risk === "Medium") return 2;
  return 1;
}

function riskBadgeClass(risk: ProjectRiskLevel): string {
  if (risk === "High") return "bg-rose-100 text-rose-700";
  if (risk === "Medium") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function getRoleResponsibleUserId(project: Project, role: ProjectRoleKey): string {
  if (role === "technical") return project.technicalResponsibleUserId;
  if (role === "sales") return project.salesResponsibleUserId;
  return project.productResponsibleUserId;
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

function getReportRisk(report: ProjectWeeklyReport | undefined): ProjectRiskLevel {
  if (report?.managerSummary?.riskLevel) return report.managerSummary.riskLevel;
  if (report?.legacyCombinedReport?.riskLevel) return report.legacyCombinedReport.riskLevel;
  return "Medium";
}

function getReportBlockers(report: ProjectWeeklyReport | undefined): string[] {
  if (!report) return [];
  const blockers = new Set<string>();
  report.roleReports.technical?.blockers.forEach((entry) => blockers.add(entry));
  report.roleReports.sales?.blockers.forEach((entry) => blockers.add(entry));
  report.roleReports.product?.blockers.forEach((entry) => blockers.add(entry));
  report.managerSummary?.blockers.forEach((entry) => blockers.add(entry));
  report.legacyCombinedReport?.blockers.forEach((entry) => blockers.add(entry));
  return Array.from(blockers);
}

function getLatestSubmissionAt(report: ProjectWeeklyReport | undefined): string | undefined {
  if (!report) return undefined;
  const candidates = [
    report.roleReports.technical?.submittedAt,
    report.roleReports.sales?.submittedAt,
    report.roleReports.product?.submittedAt,
    report.managerSummary?.submittedAt,
    report.legacyCombinedReport?.submittedAt,
  ].filter((entry): entry is string => typeof entry === "string");
  if (candidates.length === 0) return undefined;
  const sorted = candidates.sort();
  return sorted[sorted.length - 1];
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

function getWeekAiSummaryShort(report: ProjectWeeklyReport | undefined): string {
  if (!report) return "No update yet.";
  if (report.aiSummary?.shortText?.trim()) return report.aiSummary.shortText.trim();
  if (report.managerSummary?.executiveSummaryText?.trim()) {
    return report.managerSummary.executiveSummaryText.trim().split("\n")[0] ?? "No update yet.";
  }
  if (report.roleReports.technical?.inProgress?.[0]) return report.roleReports.technical.inProgress[0];
  if (report.roleReports.sales?.inProgress?.[0]) return report.roleReports.sales.inProgress[0];
  if (report.roleReports.product?.inProgress?.[0]) return report.roleReports.product.inProgress[0];
  if (report.legacyCombinedReport?.inProgress?.[0]) return report.legacyCombinedReport.inProgress[0];
  if (report.legacyCombinedReport?.achievements?.[0]) return report.legacyCombinedReport.achievements[0];
  return "No update yet.";
}

function roleDraftFromReport(report?: ProjectWeeklyReport["roleReports"][ProjectRoleKey]): RoleDraft {
  return {
    achievements: joinLines(report?.achievements),
    inProgress: joinLines(report?.inProgress),
    blockers: joinLines(report?.blockers),
    decisionsRequired: joinLines(report?.decisionsRequired),
    nextWeekFocus: joinLines(report?.nextWeekFocus),
    attachments: serializeAttachments(report?.attachments),
  };
}

function managerDraftFromReport(summary?: ProjectWeeklyReport["managerSummary"]): ManagerDraft {
  return {
    executiveSummaryText: summary?.executiveSummaryText ?? "",
    riskLevel: summary?.riskLevel ?? "Medium",
    blockers: joinLines(summary?.blockers),
    decisionsRequired: joinLines(summary?.decisionsRequired),
    deckLinks: serializeAttachments(summary?.deckLinks),
  };
}

function emptyProjectForm(activeUserId: string): ProjectFormState {
  return {
    name: "",
    description: "",
    status: "InProgress",
    strategicPriority: "Medium",
    ownerUserId: activeUserId,
    technicalResponsibleUserId: activeUserId,
    salesResponsibleUserId: activeUserId,
    productResponsibleUserId: activeUserId,
    managerUserIds: [activeUserId],
    watcherUserIds: [activeUserId],
    tagsText: "",
  };
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString();
}

function isAiOutdated(report: ProjectWeeklyReport | undefined): boolean {
  if (!report?.aiSummary) return false;
  const generatedAt = report.aiSummary.generatedAt;
  const candidates = [
    report.roleReports.technical?.updatedAt,
    report.roleReports.sales?.updatedAt,
    report.roleReports.product?.updatedAt,
    report.managerSummary?.updatedAt,
  ].filter((entry): entry is string => typeof entry === "string");
  return candidates.some((entry) => entry > generatedAt);
}

function capitalizeRole(role: ProjectSubmissionKey): string {
  if (role === "technical") return "Technical";
  if (role === "sales") return "Sales";
  if (role === "product") return "Product";
  return "Manager";
}

export function ProjectGovernanceV2() {
  const state = useAppStore();
  const thisWeek = weekStartMonday(new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Any");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("Any");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [withBlockersOnly, setWithBlockersOnly] = useState(false);
  const [riskTrendUpOnly, setRiskTrendUpOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [drilldown, setDrilldown] = useState<KpiDrilldown>("none");
  const [openWeek, setOpenWeek] = useState<{ projectId: string; weekStartDate: string } | null>(null);
  const [weekView, setWeekView] = useState<WeekView>("overview");
  const [openProjectTasksId, setOpenProjectTasksId] = useState<string | null>(null);
  const [selectedTaskIdInProject, setSelectedTaskIdInProject] = useState<string | null>(null);
  const [isProjectCreateTaskOpen, setIsProjectCreateTaskOpen] = useState(false);
  const [projectCreateTaskTitle, setProjectCreateTaskTitle] = useState("");
  const [projectCreateTaskAssignee, setProjectCreateTaskAssignee] = useState("");
  const [isProjectDrawerOpen, setProjectDrawerOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string>("");
  const [projectForm, setProjectForm] = useState<ProjectFormState>(() => emptyProjectForm(state.activeUserId));
  const [roleDrafts, setRoleDrafts] = useState<Record<string, RoleDraft>>({});
  const [managerDrafts, setManagerDrafts] = useState<Record<string, ManagerDraft>>({});

  const reportsByProject = useMemo(() => {
    const map = new Map<string, ProjectWeeklyReport[]>();
    state.projectWeeklyReports
      .slice()
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
      .forEach((report) => {
        const list = map.get(report.projectId) ?? [];
        list.push(report);
        map.set(report.projectId, list);
      });
    return map;
  }, [state.projectWeeklyReports]);

  const reportByProjectWeek = useMemo(() => {
    const map = new Map<string, Map<string, ProjectWeeklyReport>>();
    state.projectWeeklyReports.forEach((report) => {
      const byWeek = map.get(report.projectId) ?? new Map<string, ProjectWeeklyReport>();
      byWeek.set(report.weekStartDate, report);
      map.set(report.projectId, byWeek);
    });
    return map;
  }, [state.projectWeeklyReports]);

  const weekTimelineByProject = useMemo(() => {
    const map = new Map<string, string[]>();
    state.projects.forEach((project) => {
      const weeks = new Set<string>();
      for (let idx = 0; idx < 8; idx += 1) {
        weeks.add(shiftWeekStart(thisWeek, -idx));
      }
      (reportsByProject.get(project.id) ?? []).forEach((report) => weeks.add(report.weekStartDate));
      map.set(project.id, Array.from(weeks).sort((a, b) => b.localeCompare(a)).slice(0, 10));
    });
    return map;
  }, [reportsByProject, state.projects, thisWeek]);

  const projectMeta = useMemo(() => {
    const map = new Map<string, ProjectMeta>();
    state.projects.forEach((project) => {
      const reports = reportsByProject.get(project.id) ?? [];
      const latest = reports[0];
      const previous = reports[1];
      const thisWeekReport = reportByProjectWeek.get(project.id)?.get(thisWeek);
      const missingRolesThisWeek = getMissingRoles(thisWeekReport);
      const latestRisk = getReportRisk(latest);
      const previousRisk = previous ? getReportRisk(previous) : undefined;
      const latestSubmissionAt = getLatestSubmissionAt(latest);
      const daysSinceLastSubmission = latestSubmissionAt
        ? Math.floor((Date.now() - new Date(latestSubmissionAt).getTime()) / (24 * 60 * 60 * 1000))
        : undefined;
      map.set(project.id, {
        latestRisk,
        previousRisk,
        blockersCount: getReportBlockers(latest).length,
        aiShortSummary: getWeekAiSummaryShort(latest),
        latestSubmissionAt,
        daysSinceLastSubmission,
        missingRolesThisWeek,
        hasMissingThisWeek: missingRolesThisWeek.length > 0,
        riskTrendUp: previousRisk ? riskToWeight(latestRisk) > riskToWeight(previousRisk) : false,
      });
    });
    return map;
  }, [reportByProjectWeek, reportsByProject, state.projects, thisWeek]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = state.projects.filter((project) => {
      const meta = projectMeta.get(project.id);
      if (!meta) return false;
      if (statusFilter !== "Any" && project.status !== statusFilter) return false;
      if (riskFilter !== "Any" && meta.latestRisk !== riskFilter) return false;
      if (ownerFilter && project.ownerUserId !== ownerFilter) return false;
      if (missingOnly && !meta.hasMissingThisWeek) return false;
      if (withBlockersOnly && meta.blockersCount === 0) return false;
      if (riskTrendUpOnly && !meta.riskTrendUp) return false;
      if (!query) return true;
      return (
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        meta.aiShortSummary.toLowerCase().includes(query)
      );
    });
    if (sortMode === "daysSinceLastSubmission") {
      return items.slice().sort((a, b) => {
        const aDay = projectMeta.get(a.id)?.daysSinceLastSubmission ?? -1;
        const bDay = projectMeta.get(b.id)?.daysSinceLastSubmission ?? -1;
        return bDay - aDay;
      });
    }
    return items.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [
    missingOnly,
    ownerFilter,
    projectMeta,
    riskFilter,
    riskTrendUpOnly,
    search,
    sortMode,
    state.projects,
    statusFilter,
    withBlockersOnly,
  ]);

  const kpis = useMemo(() => {
    const total = state.projects.length;
    const inProgress = state.projects.filter((project) => project.status === "InProgress").length;
    const highRisk = state.projects.filter((project) => projectMeta.get(project.id)?.latestRisk === "High").length;
    const withBlockers = state.projects.filter((project) => (projectMeta.get(project.id)?.blockersCount ?? 0) > 0).length;
    const missingThisWeek = state.projects.filter(
      (project) => project.status === "InProgress" && (projectMeta.get(project.id)?.hasMissingThisWeek ?? true),
    ).length;
    const riskTrendUp = state.projects.filter((project) => projectMeta.get(project.id)?.riskTrendUp).length;
    const allDays = state.projects
      .map((project) => projectMeta.get(project.id)?.daysSinceLastSubmission)
      .filter((entry): entry is number => typeof entry === "number");
    const avgDaysSinceLastReport =
      allDays.length > 0 ? Math.round(allDays.reduce((sum, value) => sum + value, 0) / allDays.length) : 0;
    return {
      total,
      inProgress,
      highRisk,
      withBlockers,
      missingThisWeek,
      riskTrendUp,
      avgDaysSinceLastReport,
    };
  }, [projectMeta, state.projects]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("Any");
    setRiskFilter("Any");
    setOwnerFilter("");
    setMissingOnly(false);
    setWithBlockersOnly(false);
    setRiskTrendUpOnly(false);
    setSortMode("name");
    setDrilldown("none");
  };

  const applyDrilldown = (next: KpiDrilldown) => {
    if (next === "none") {
      resetFilters();
      return;
    }
    setDrilldown(next);
    setStatusFilter("Any");
    setRiskFilter("Any");
    setMissingOnly(false);
    setWithBlockersOnly(false);
    setRiskTrendUpOnly(false);
    setSortMode("name");
    if (next === "inProgress") {
      setStatusFilter("InProgress");
      return;
    }
    if (next === "highRisk") {
      setRiskFilter("High");
      return;
    }
    if (next === "withBlockers") {
      setWithBlockersOnly(true);
      return;
    }
    if (next === "missingThisWeek") {
      setStatusFilter("InProgress");
      setMissingOnly(true);
      return;
    }
    if (next === "riskTrendUp") {
      setRiskTrendUpOnly(true);
      return;
    }
    if (next === "avgDaysSinceLast") {
      setSortMode("daysSinceLastSubmission");
    }
  };

  const getReport = (projectId: string, weekStartDate: string): ProjectWeeklyReport | undefined =>
    reportByProjectWeek.get(projectId)?.get(weekStartDate);

  const ensureReport = (projectId: string, weekStartDate: string): ProjectWeeklyReport => {
    const existing = getReport(projectId, weekStartDate);
    if (existing) return existing;
    const id = state.createProjectWeeklyReport({
      projectId,
      weekStartDate,
      roleReports: {},
    });
    const now = new Date().toISOString();
    return {
      id,
      projectId,
      weekStartDate,
      roleReports: {},
      createdAt: now,
      updatedAt: now,
    };
  };

  const roleDraftKey = (projectId: string, weekStartDate: string, role: ProjectRoleKey): string =>
    `${projectId}__${weekStartDate}__${role}`;
  const managerDraftKey = (projectId: string, weekStartDate: string): string => `${projectId}__${weekStartDate}__manager`;

  const getRoleDraft = (projectId: string, weekStartDate: string, role: ProjectRoleKey, report: ProjectWeeklyReport | undefined) => {
    const key = roleDraftKey(projectId, weekStartDate, role);
    return roleDrafts[key] ?? roleDraftFromReport(report?.roleReports[role]);
  };

  const getManagerDraft = (projectId: string, weekStartDate: string, report: ProjectWeeklyReport | undefined) => {
    const key = managerDraftKey(projectId, weekStartDate);
    return managerDrafts[key] ?? managerDraftFromReport(report?.managerSummary);
  };

  const updateRoleDraft = (
    projectId: string,
    weekStartDate: string,
    role: ProjectRoleKey,
    report: ProjectWeeklyReport | undefined,
    patch: Partial<RoleDraft>,
  ) => {
    const key = roleDraftKey(projectId, weekStartDate, role);
    setRoleDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? roleDraftFromReport(report?.roleReports[role])),
        ...patch,
      },
    }));
  };

  const updateManagerDraft = (
    projectId: string,
    weekStartDate: string,
    report: ProjectWeeklyReport | undefined,
    patch: Partial<ManagerDraft>,
  ) => {
    const key = managerDraftKey(projectId, weekStartDate);
    setManagerDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? managerDraftFromReport(report?.managerSummary)),
        ...patch,
      },
    }));
  };

  const saveRoleReport = (project: Project, weekStartDate: string, role: ProjectRoleKey, submit: boolean) => {
    const responsibleUserId = getRoleResponsibleUserId(project, role);
    if (state.activeUserId !== responsibleUserId) return;
    const baseReport = ensureReport(project.id, weekStartDate);
    const key = roleDraftKey(project.id, weekStartDate, role);
    const draft = roleDrafts[key] ?? roleDraftFromReport(baseReport.roleReports[role]);
    const now = new Date().toISOString();
    const nextRoleReport = {
      authorUserId: baseReport.roleReports[role]?.authorUserId ?? state.activeUserId,
      achievements: splitLines(draft.achievements),
      inProgress: splitLines(draft.inProgress),
      blockers: splitLines(draft.blockers),
      decisionsRequired: splitLines(draft.decisionsRequired),
      nextWeekFocus: splitLines(draft.nextWeekFocus),
      attachments: parseAttachmentLines(draft.attachments),
      submittedAt: submit ? now : baseReport.roleReports[role]?.submittedAt,
      updatedAt: now,
    };
    state.updateProjectWeeklyReport({
      ...baseReport,
      roleReports: {
        ...baseReport.roleReports,
        [role]: nextRoleReport,
      },
      updatedAt: now,
    });
    setRoleDrafts((prev) => ({
      ...prev,
      [key]: roleDraftFromReport(nextRoleReport),
    }));
  };

  const saveManagerSummary = (project: Project, weekStartDate: string, submit: boolean) => {
    const canManage = project.ownerUserId === state.activeUserId || project.managerUserIds.includes(state.activeUserId);
    if (!canManage) return;
    const baseReport = ensureReport(project.id, weekStartDate);
    const key = managerDraftKey(project.id, weekStartDate);
    const draft = managerDrafts[key] ?? managerDraftFromReport(baseReport.managerSummary);
    const now = new Date().toISOString();
    const nextSummary = {
      authorUserId: baseReport.managerSummary?.authorUserId ?? state.activeUserId,
      executiveSummaryText: draft.executiveSummaryText.trim(),
      riskLevel: draft.riskLevel,
      blockers: splitLines(draft.blockers),
      decisionsRequired: splitLines(draft.decisionsRequired),
      deckLinks: parseAttachmentLines(draft.deckLinks),
      submittedAt: submit ? now : baseReport.managerSummary?.submittedAt,
      updatedAt: now,
    };
    state.updateProjectWeeklyReport({
      ...baseReport,
      managerSummary: nextSummary,
      updatedAt: now,
    });
    setManagerDrafts((prev) => ({
      ...prev,
      [key]: managerDraftFromReport(nextSummary),
    }));
  };

  const refreshAiSummary = (project: Project, weekStartDate: string) => {
    const canManage = project.ownerUserId === state.activeUserId || project.managerUserIds.includes(state.activeUserId);
    if (!canManage) return;
    ensureReport(project.id, weekStartDate);
    state.generateProjectAiSummary(project.id, weekStartDate);
  };

  const openCreateDrawer = () => {
    setEditingProjectId("");
    setProjectForm(emptyProjectForm(state.activeUserId));
    setProjectDrawerOpen(true);
  };

  const openEditDrawer = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectForm({
      name: project.name,
      description: project.description,
      status: project.status,
      strategicPriority: project.strategicPriority,
      ownerUserId: project.ownerUserId,
      technicalResponsibleUserId: project.technicalResponsibleUserId,
      salesResponsibleUserId: project.salesResponsibleUserId,
      productResponsibleUserId: project.productResponsibleUserId,
      managerUserIds: project.managerUserIds,
      watcherUserIds: project.watcherUserIds,
      tagsText: (project.tags ?? []).join(", "),
    });
    setProjectDrawerOpen(true);
  };

  const toggleFormUser = (field: "managerUserIds" | "watcherUserIds", userId: string) => {
    setProjectForm((prev) => {
      const current = prev[field];
      const has = current.includes(userId);
      return {
        ...prev,
        [field]: has ? current.filter((id) => id !== userId) : [...current, userId],
      };
    });
  };

  const saveProject = () => {
    const name = projectForm.name.trim();
    const description = projectForm.description.trim();
    if (
      !name ||
      !description ||
      !projectForm.ownerUserId ||
      !projectForm.technicalResponsibleUserId ||
      !projectForm.salesResponsibleUserId ||
      !projectForm.productResponsibleUserId
    ) {
      return;
    }
    const managerUserIds = Array.from(new Set([...projectForm.managerUserIds, projectForm.ownerUserId].filter(Boolean)));
    const watcherUserIds = Array.from(
      new Set(
        [
          ...projectForm.watcherUserIds,
          ...managerUserIds,
          projectForm.ownerUserId,
          projectForm.technicalResponsibleUserId,
          projectForm.salesResponsibleUserId,
          projectForm.productResponsibleUserId,
        ].filter(Boolean),
      ),
    );
    const tags = projectForm.tagsText
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (editingProjectId) {
      const existing = state.projects.find((project) => project.id === editingProjectId);
      if (!existing) return;
      state.updateProject({
        ...existing,
        name,
        description,
        ownerUserId: projectForm.ownerUserId,
        managerUserIds,
        technicalResponsibleUserId: projectForm.technicalResponsibleUserId,
        salesResponsibleUserId: projectForm.salesResponsibleUserId,
        productResponsibleUserId: projectForm.productResponsibleUserId,
        watcherUserIds,
        status: projectForm.status,
        strategicPriority: projectForm.strategicPriority,
        tags,
      });
    } else {
      state.createProject({
        name,
        description,
        ownerUserId: projectForm.ownerUserId,
        managerUserIds,
        technicalResponsibleUserId: projectForm.technicalResponsibleUserId,
        salesResponsibleUserId: projectForm.salesResponsibleUserId,
        productResponsibleUserId: projectForm.productResponsibleUserId,
        watcherUserIds,
        status: projectForm.status,
        strategicPriority: projectForm.strategicPriority,
        tags,
      });
    }
    setProjectDrawerOpen(false);
    setEditingProjectId("");
  };

  const closeWeekModal = () => {
    setOpenWeek(null);
    setWeekView("overview");
  };

  const openWeekModal = (projectId: string, weekStartDate: string) => {
    setOpenWeek({ projectId, weekStartDate });
    setWeekView("overview");
  };

  const renderRoleEditor = (
    project: Project,
    weekStartDate: string,
    report: ProjectWeeklyReport | undefined,
    role: ProjectRoleKey,
  ) => {
    const title = `${capitalizeRole(role)} update`;
    const roleReport = report?.roleReports[role];
    const draft = getRoleDraft(project.id, weekStartDate, role, report);
    const responsibleUserId = getRoleResponsibleUserId(project, role);
    const submittedAt = roleReport?.submittedAt;
    const isLocked = Boolean(submittedAt);
    const canEdit = state.activeUserId === responsibleUserId && !isLocked;
    const isLate = submittedAt ? submittedAt > fridayDeadline(weekStartDate) : false;

    return (
      <section className="rounded-md border border-slate-200 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h4>
          {submittedAt ? (
            <Badge className={isLate ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
              {isLate ? "Submitted late" : "Submitted"}
            </Badge>
          ) : (
            <Badge className="bg-violet-100 text-violet-700">Missing</Badge>
          )}
        </div>
        <p className="mb-2 text-[11px] text-slate-500">
          Responsible: {getUserName(state, responsibleUserId)} · Updated: {formatDateTime(roleReport?.updatedAt)}
        </p>
        {!canEdit && !isLocked && (
          <p className="mb-2 text-[11px] text-slate-500">You can view this section. Only the responsible user can edit/submit.</p>
        )}
        {isLocked && (
          <p className="mb-2 text-[11px] text-slate-500">
            This section is locked after submit to preserve weekly reporting traceability.
          </p>
        )}
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <FieldLabel>Achievements (one per line)</FieldLabel>
            <textarea
              value={draft.achievements}
              onChange={(event) => updateRoleDraft(project.id, weekStartDate, role, report, { achievements: event.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div>
            <FieldLabel>In progress (one per line)</FieldLabel>
            <textarea
              value={draft.inProgress}
              onChange={(event) => updateRoleDraft(project.id, weekStartDate, role, report, { inProgress: event.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div>
            <FieldLabel>Blockers (one per line)</FieldLabel>
            <textarea
              value={draft.blockers}
              onChange={(event) => updateRoleDraft(project.id, weekStartDate, role, report, { blockers: event.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div>
            <FieldLabel>Decisions required (one per line)</FieldLabel>
            <textarea
              value={draft.decisionsRequired}
              onChange={(event) => updateRoleDraft(project.id, weekStartDate, role, report, { decisionsRequired: event.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div>
            <FieldLabel>Next week focus (one per line)</FieldLabel>
            <textarea
              value={draft.nextWeekFocus}
              onChange={(event) => updateRoleDraft(project.id, weekStartDate, role, report, { nextWeekFocus: event.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div>
            <FieldLabel>Links / attachments (label | url)</FieldLabel>
            <textarea
              value={draft.attachments}
              onChange={(event) => updateRoleDraft(project.id, weekStartDate, role, report, { attachments: event.target.value })}
              disabled={!canEdit}
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => saveRoleReport(project, weekStartDate, role, false)} disabled={!canEdit}>
            Save draft
          </Button>
          <Button size="sm" onClick={() => saveRoleReport(project, weekStartDate, role, true)} disabled={!canEdit}>
            Submit {title}
          </Button>
        </div>
      </section>
    );
  };

  const renderManagerEditor = (project: Project, weekStartDate: string, report: ProjectWeeklyReport | undefined) => {
    const manager = report?.managerSummary;
    const managerDraft = getManagerDraft(project.id, weekStartDate, report);
    const managerCanManage = project.ownerUserId === state.activeUserId || project.managerUserIds.includes(state.activeUserId);
    const managerSubmittedAt = manager?.submittedAt;
    const managerCanEdit = managerCanManage && !managerSubmittedAt;

    return (
      <section className="rounded-md border border-slate-200 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Manager summary</h4>
          {manager?.submittedAt ? (
            <Badge className="bg-emerald-100 text-emerald-700">Submitted</Badge>
          ) : (
            <Badge className="bg-violet-100 text-violet-700">Missing</Badge>
          )}
        </div>
        <p className="mb-2 text-[11px] text-slate-500">
          Owner: {getUserName(state, project.ownerUserId)} · Last update: {formatDateTime(manager?.updatedAt)}
        </p>
        {!managerCanManage && <p className="mb-2 text-[11px] text-slate-500">Only owner/managers can edit this panel.</p>}
        {managerCanManage && managerSubmittedAt && (
          <p className="mb-2 text-[11px] text-slate-500">
            This section is locked after submit to preserve weekly reporting traceability.
          </p>
        )}
        <div className="grid gap-2">
          <div>
            <FieldLabel>Executive summary</FieldLabel>
            <textarea
              value={managerDraft.executiveSummaryText}
              onChange={(event) =>
                updateManagerDraft(project.id, weekStartDate, report, {
                  executiveSummaryText: event.target.value,
                })
              }
              disabled={!managerCanEdit}
            />
          </div>
          <div>
            <FieldLabel>Risk level</FieldLabel>
            <select
              value={managerDraft.riskLevel}
              onChange={(event) =>
                updateManagerDraft(project.id, weekStartDate, report, {
                  riskLevel: event.target.value as ProjectRiskLevel,
                })
              }
              disabled={!managerCanEdit}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <FieldLabel>Blockers (one per line)</FieldLabel>
            <textarea
              value={managerDraft.blockers}
              onChange={(event) =>
                updateManagerDraft(project.id, weekStartDate, report, {
                  blockers: event.target.value,
                })
              }
              disabled={!managerCanEdit}
            />
          </div>
          <div>
            <FieldLabel>Decisions required (one per line)</FieldLabel>
            <textarea
              value={managerDraft.decisionsRequired}
              onChange={(event) =>
                updateManagerDraft(project.id, weekStartDate, report, {
                  decisionsRequired: event.target.value,
                })
              }
              disabled={!managerCanEdit}
            />
          </div>
          <div>
            <FieldLabel>Weekly deck links (label | url)</FieldLabel>
            <textarea
              value={managerDraft.deckLinks}
              onChange={(event) =>
                updateManagerDraft(project.id, weekStartDate, report, {
                  deckLinks: event.target.value,
                })
              }
              disabled={!managerCanEdit}
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => saveManagerSummary(project, weekStartDate, false)} disabled={!managerCanEdit}>
            Save draft
          </Button>
          <Button size="sm" onClick={() => saveManagerSummary(project, weekStartDate, true)} disabled={!managerCanEdit}>
            Submit manager summary
          </Button>
        </div>
      </section>
    );
  };

  const kpiButtonClass = (active: boolean) =>
    `rounded-md border p-2 text-left transition ${active ? "border-brand-300 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`;

  return (
    <div className="space-y-4">
      <Card title="Project Governance Summary">
        <div className="grid gap-2 md:grid-cols-7">
          <button className={kpiButtonClass(drilldown === "none")} onClick={resetFilters}>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Total projects</p>
            <p className="text-xl font-semibold text-slate-800">{kpis.total}</p>
          </button>
          <button className={kpiButtonClass(drilldown === "inProgress")} onClick={() => applyDrilldown("inProgress")}>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">In progress</p>
            <p className="text-xl font-semibold text-blue-700">{kpis.inProgress}</p>
          </button>
          <button className={kpiButtonClass(drilldown === "highRisk")} onClick={() => applyDrilldown("highRisk")}>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">High risk</p>
            <p className="text-xl font-semibold text-rose-700">{kpis.highRisk}</p>
          </button>
          <button className={kpiButtonClass(drilldown === "withBlockers")} onClick={() => applyDrilldown("withBlockers")}>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">With blockers</p>
            <p className="text-xl font-semibold text-amber-700">{kpis.withBlockers}</p>
          </button>
          <button className={kpiButtonClass(drilldown === "missingThisWeek")} onClick={() => applyDrilldown("missingThisWeek")}>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Missing this week</p>
            <p className="text-xl font-semibold text-violet-700">{kpis.missingThisWeek}</p>
          </button>
          <button className={kpiButtonClass(drilldown === "riskTrendUp")} onClick={() => applyDrilldown("riskTrendUp")}>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Risk trend up</p>
            <p className="text-xl font-semibold text-slate-800">{kpis.riskTrendUp}</p>
          </button>
          <button className={kpiButtonClass(drilldown === "avgDaysSinceLast")} onClick={() => applyDrilldown("avgDaysSinceLast")}>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Avg days since last report</p>
            <p className="text-xl font-semibold text-slate-800">{kpis.avgDaysSinceLastReport}</p>
          </button>
        </div>
      </Card>

      <Card
        title="Projects / Governance"
        actions={
          <Button size="sm" onClick={openCreateDrawer}>
            + Create Project
          </Button>
        }
      >
        <div className="mb-3 grid gap-2 md:grid-cols-6">
          <div className="md:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project or summary..." />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="Any">Any</option>
              <option value="InProgress">InProgress</option>
              <option value="Paused">Paused</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <FieldLabel>Risk</FieldLabel>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}>
              <option value="Any">Any</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <FieldLabel>Owner</FieldLabel>
            <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value="">Any</option>
              {state.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Sort</FieldLabel>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="name">Name (A-Z)</option>
              <option value="daysSinceLastSubmission">Days since last submission</option>
            </select>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={missingOnly} onChange={(event) => setMissingOnly(event.target.checked)} />
            Missing this week
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={withBlockersOnly} onChange={(event) => setWithBlockersOnly(event.target.checked)} />
            With blockers
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={riskTrendUpOnly} onChange={(event) => setRiskTrendUpOnly(event.target.checked)} />
            Risk trend up
          </label>
          <Button size="sm" variant="secondary" onClick={resetFilters}>
            Reset filters
          </Button>
          {drilldown !== "none" && (
            <Badge className="bg-brand-100 text-brand-700">
              View: {drilldown === "avgDaysSinceLast" ? "Avg days since last report (sorted)" : drilldown}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {filteredProjects.length === 0 && <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-500">No projects found for active filters.</p>}

          {filteredProjects.map((project) => {
            const weekTimeline = weekTimelineByProject.get(project.id) ?? [thisWeek];
            const meta = projectMeta.get(project.id);

            return (
              <article key={project.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[260px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">{project.name}</h3>
                      <Badge className="bg-slate-100 text-slate-700">{project.status}</Badge>
                      <Badge>{project.strategicPriority}</Badge>
                      <Badge className={riskBadgeClass(meta?.latestRisk ?? "Medium")}>Risk {meta?.latestRisk ?? "Medium"}</Badge>
                      <Badge className={(meta?.blockersCount ?? 0) > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                        Blockers {meta?.blockersCount ?? 0}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{project.description}</p>
                    <div className="mt-2 text-xs text-slate-600">
                      <p>Owner: {getUserName(state, project.ownerUserId)}</p>
                      <p>
                        Roles: Technical {getUserName(state, project.technicalResponsibleUserId)} · Sales{" "}
                        {getUserName(state, project.salesResponsibleUserId)} · Product {getUserName(state, project.productResponsibleUserId)}
                      </p>
                      <p>
                        Managers:{" "}
                        {project.managerUserIds.length > 0
                          ? project.managerUserIds.map((id) => getUserName(state, id)).join(", ")
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-right">
                    <p className="text-xs text-slate-500">Latest submission</p>
                    <p className="text-xs font-semibold text-slate-700">{formatDateTime(meta?.latestSubmissionAt)}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => setOpenProjectTasksId(project.id)}>
                        Tasks
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openEditDrawer(project)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>

                {meta && meta.hasMissingThisWeek && (
                  <p className="mt-2 text-xs font-semibold text-violet-700">
                    Missing this week:{" "}
                    {meta.missingRolesThisWeek
                      .map((role) => {
                        if (role === "manager") return `${capitalizeRole(role)} (${getUserName(state, project.ownerUserId)})`;
                        return `${capitalizeRole(role)} (${getUserName(state, getRoleResponsibleUserId(project, role))})`;
                      })
                      .join(", ")}
                  </p>
                )}

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {weekTimeline.map((weekStartDate) => {
                    const weekReport = reportByProjectWeek.get(project.id)?.get(weekStartDate);
                    const missing = getMissingRoles(weekReport);
                    const selected = openWeek?.projectId === project.id && openWeek.weekStartDate === weekStartDate;
                    const blockersCount = getReportBlockers(weekReport).length;
                    const riskLevel = getReportRisk(weekReport);
                    const weekSummary = getWeekAiSummaryShort(weekReport);
                    const deadline = fridayDeadline(weekStartDate);
                    const missingTooltip =
                      missing.length > 0
                        ? [
                            ...missing.map((role) => {
                              if (role === "manager") {
                                return `Manager: ${getUserName(state, project.ownerUserId)}`;
                              }
                              return `${capitalizeRole(role)}: ${getUserName(state, getRoleResponsibleUserId(project, role))}`;
                            }),
                            `Due: ${new Date(deadline).toLocaleString()}`,
                          ].join("\n")
                        : undefined;
                    return (
                      <button
                        key={`${project.id}-${weekStartDate}`}
                        className={`min-w-[250px] rounded-lg border p-2 text-left transition ${
                          selected ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                        onClick={() => openWeekModal(project.id, weekStartDate)}
                        title={missingTooltip}
                      >
                        <div className="mb-1 flex items-center justify-between gap-1">
                          <p className="text-[11px] font-semibold text-slate-700">Week {weekStartDate}</p>
                          <Badge className={riskBadgeClass(riskLevel)}>{riskLevel}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500">Blockers: {blockersCount}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{weekSummary}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Tech {isRoleSubmitted(weekReport, "technical") ? "✅" : "❌"} · Sales{" "}
                          {isRoleSubmitted(weekReport, "sales") ? "✅" : "❌"} · Product{" "}
                          {isRoleSubmitted(weekReport, "product") ? "✅" : "❌"} · Manager{" "}
                          {isManagerSubmitted(weekReport) ? "✅" : "❌"}
                        </p>
                        {missing.length > 0 && (
                          <p className="mt-1 text-[11px] text-rose-600">
                            Missing:{" "}
                            {missing
                              .map((role) => {
                                if (role === "manager") return getUserName(state, project.ownerUserId);
                                return getUserName(state, getRoleResponsibleUserId(project, role));
                              })
                              .join(", ")}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-slate-400">Deadline: {new Date(deadline).toLocaleString()}</p>
                      </button>
                    );
                  })}
                </div>

              </article>
            );
          })}
        </div>
      </Card>

      {openWeek && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 p-4" onClick={closeWeekModal}>
          <div
            className="mx-auto mt-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const project = state.projects.find((entry) => entry.id === openWeek.projectId);
              if (!project) {
                return (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Project not found for selected week.</p>
                    <Button size="sm" variant="secondary" onClick={closeWeekModal}>
                      Close
                    </Button>
                  </div>
                );
              }

              const report = getReport(project.id, openWeek.weekStartDate);
              const canManage = project.ownerUserId === state.activeUserId || project.managerUserIds.includes(state.activeUserId);
              const aiSummary = report?.aiSummary;
              const aiStale = isAiOutdated(report);
              const missingRoles = getMissingRoles(report);
              const deadline = fridayDeadline(openWeek.weekStartDate);
              const sectionOrder: ProjectSubmissionKey[] = ["technical", "sales", "product", "manager"];

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{project.name}</h3>
                      <p className="text-xs text-slate-500">
                        Week {openWeek.weekStartDate} · {weekView === "overview" ? "Overview" : capitalizeRole(weekView)}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={closeWeekModal}>
                      Close
                    </Button>
                  </div>

                  {weekView === "overview" ? (
                    <div className="space-y-3">
                      <div className="rounded-md border border-slate-200 p-2 text-xs text-slate-600">
                        <p className="font-semibold text-slate-700">Week {openWeek.weekStartDate} governance visibility</p>
                        <p className="mt-1">Technical: {isRoleSubmitted(report, "technical") ? "✅ Submitted" : "❌ Missing"}</p>
                        <p>Sales: {isRoleSubmitted(report, "sales") ? "✅ Submitted" : "❌ Missing"}</p>
                        <p>Product: {isRoleSubmitted(report, "product") ? "✅ Submitted" : "❌ Missing"}</p>
                        <p>Manager: {isManagerSubmitted(report) ? "✅ Submitted" : "❌ Missing"}</p>
                        <p className="mt-1 text-[11px] text-slate-500">Deadline: {new Date(deadline).toLocaleString()}</p>
                      </div>

                      <section className="rounded-md border border-slate-200 p-3">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Sections</h4>
                        <div className="space-y-2">
                          {sectionOrder.map((role) => {
                            const isManagerRole = role === "manager";
                            const submittedAt = isManagerRole
                              ? report?.managerSummary?.submittedAt
                              : report?.roleReports[role as ProjectRoleKey]?.submittedAt;
                            const updatedAt = isManagerRole
                              ? report?.managerSummary?.updatedAt
                              : report?.roleReports[role as ProjectRoleKey]?.updatedAt;
                            const isLate = submittedAt ? submittedAt > deadline : false;
                            const responsibleName = isManagerRole
                              ? getUserName(state, project.ownerUserId)
                              : getUserName(state, getRoleResponsibleUserId(project, role as ProjectRoleKey));

                            return (
                              <div key={`${project.id}-${openWeek.weekStartDate}-${role}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-2 text-xs">
                                <div>
                                  <p className="font-semibold text-slate-700">{capitalizeRole(role)} section</p>
                                  <p className="text-slate-500">
                                    Responsible: {responsibleName} · Updated: {formatDateTime(updatedAt)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {submittedAt ? (
                                    <Badge className={isLate ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                                      {isLate ? "Submitted late" : "Submitted"}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-violet-100 text-violet-700">Missing</Badge>
                                  )}
                                  <Button size="sm" variant="secondary" onClick={() => setWeekView(role)}>
                                    Open
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <section className="rounded-md border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">AI consolidated summary</h4>
                          {aiStale && <Badge className="bg-amber-100 text-amber-700">Out of date</Badge>}
                        </div>
                        {aiSummary ? (
                          <div className="space-y-2 text-xs text-slate-700">
                            <p className="font-semibold text-slate-800">{aiSummary.shortText}</p>
                            <p className="whitespace-pre-wrap">{aiSummary.fullText}</p>
                            <p>
                              <span className="font-semibold">Generated:</span> {formatDateTime(aiSummary.generatedAt)}
                            </p>
                            {aiSummary.missingRoles.length > 0 && (
                              <p className="text-rose-700">
                                Missing sections: {aiSummary.missingRoles.map((role) => capitalizeRole(role)).join(", ")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No AI summary generated for this week yet.</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Button size="sm" onClick={() => refreshAiSummary(project, openWeek.weekStartDate)} disabled={!canManage}>
                            Generate/Refresh AI Summary
                          </Button>
                          {!canManage && <span className="text-[11px] text-slate-500">Only owner/managers can generate AI summary.</span>}
                        </div>
                      </section>

                      <section className="rounded-md border border-slate-200 p-3">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Weekly deck links</h4>
                        {(report?.managerSummary?.deckLinks ?? []).length === 0 ? (
                          <p className="text-xs text-slate-500">No deck links added yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(report?.managerSummary?.deckLinks ?? []).map((link) => (
                              <a
                                key={`${report?.id ?? openWeek.weekStartDate}-${link.url}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-brand-700 hover:underline"
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </section>

                      {missingRoles.length > 0 && (
                        <p className="text-xs font-semibold text-violet-700">
                          Missing contributors:{" "}
                          {missingRoles
                            .map((role) => {
                              if (role === "manager") return `${capitalizeRole(role)} (${getUserName(state, project.ownerUserId)})`;
                              return `${capitalizeRole(role)} (${getUserName(state, getRoleResponsibleUserId(project, role))})`;
                            })
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setWeekView("overview")}>
                          Back
                        </Button>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {weekView === "manager" ? "Manager summary" : `${capitalizeRole(weekView)} update`}
                        </p>
                      </div>
                      {weekView === "manager"
                        ? renderManagerEditor(project, openWeek.weekStartDate, report)
                        : renderRoleEditor(project, openWeek.weekStartDate, report, weekView as ProjectRoleKey)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {openProjectTasksId && (() => {
        const project = state.projects.find((p) => p.id === openProjectTasksId);
        const projectTasks = state.tasks.filter((t) => t.projectId === openProjectTasksId && !t.archivedAt);
        const selectedTask = selectedTaskIdInProject ? state.tasks.find((t) => t.id === selectedTaskIdInProject) : null;
        const commentsByTaskId = (() => {
          const map = new Map<string, typeof state.taskComments>();
          state.taskComments.forEach((c) => {
            const list = map.get(c.taskId) ?? [];
            list.push(c);
            map.set(c.taskId, list);
          });
          return map;
        })();

        if (!project) return null;
        return (
          <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => { setOpenProjectTasksId(null); setSelectedTaskIdInProject(null); }}>
            <aside
              className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Tasks: {project.name}</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      state.createTask({
                        title: `New task for ${project.name}`,
                        description: "",
                        status: "Open",
                        priority: "Medium",
                        createdByUserId: state.activeUserId,
                        assigneeUserId: state.activeUserId,
                        visibility: "Private",
                        projectId: project.id,
                        kanbanStage: "Backlog",
                      });
                    }}
                  >
                    New Task
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setOpenProjectTasksId(null); setSelectedTaskIdInProject(null); }}>
                    Close
                  </Button>
                </div>
              </div>
              {selectedTask ? (
                <TaskDrawer
                  task={selectedTask}
                  comments={commentsByTaskId.get(selectedTask.id) ?? []}
                  users={state.users}
                  labels={state.taskLabels}
                  getUserName={(userId) => getUserName(state, userId)}
                  onSave={(task, draft) => {
                    state.updateTask({
                      ...task,
                      title: draft.title.trim(),
                      description: draft.description.trim(),
                      status: draft.status,
                      priority: draft.priority,
                      dueAt: draft.dueAt ? new Date(`${draft.dueAt}T12:00:00`).toISOString() : undefined,
                      assigneeUserId: draft.assigneeUserId,
                      visibility: draft.visibility,
                      watcherUserIds: draft.watcherUserIds,
                      isUrgent: draft.isUrgent,
                      labelIds: draft.labelIds,
                    });
                  }}
                  onClose={() => setSelectedTaskIdInProject(null)}
                  onArchive={(task) =>
                    state.updateTask({
                      ...task,
                      status: "Done",
                      archivedAt: new Date().toISOString(),
                    })
                  }
                  onUnarchive={(task) => state.updateTask({ ...task, archivedAt: undefined })}
                  onAddComment={(taskId, text, kind) => state.addTaskComment(taskId, text, kind)}
                />
              ) : (
                <TaskKanbanBoard
                  tasks={projectTasks}
                  users={state.users}
                  labels={state.taskLabels}
                  onUpdateTask={(id, patch) => {
                    const task = state.tasks.find((t) => t.id === id);
                    if (task) state.updateTask({ ...task, ...patch });
                  }}
                  onOpenTask={(task) => setSelectedTaskIdInProject(task.id)}
                  getUserName={(userId) => getUserName(state, userId)}
                />
              )}
            </aside>
          </div>
        );
      })()}

      {isProjectDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => setProjectDrawerOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                {editingProjectId ? "Edit Project" : "Create Project"}
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setProjectDrawerOpen(false)}>
                Close
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <FieldLabel>Project name</FieldLabel>
                <input value={projectForm.name} onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={projectForm.description}
                  onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <select
                    value={projectForm.status}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, status: event.target.value as Project["status"] }))}
                  >
                    <option value="InProgress">InProgress</option>
                    <option value="Paused">Paused</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <select
                    value={projectForm.strategicPriority}
                    onChange={(event) =>
                      setProjectForm((prev) => ({ ...prev, strategicPriority: event.target.value as Project["strategicPriority"] }))
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Owner</FieldLabel>
                  <select
                    value={projectForm.ownerUserId}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, ownerUserId: event.target.value }))}
                  >
                    {state.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Technical responsible</FieldLabel>
                  <select
                    value={projectForm.technicalResponsibleUserId}
                    onChange={(event) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        technicalResponsibleUserId: event.target.value,
                      }))
                    }
                  >
                    {state.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Sales responsible</FieldLabel>
                  <select
                    value={projectForm.salesResponsibleUserId}
                    onChange={(event) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        salesResponsibleUserId: event.target.value,
                      }))
                    }
                  >
                    {state.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Product responsible</FieldLabel>
                  <select
                    value={projectForm.productResponsibleUserId}
                    onChange={(event) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        productResponsibleUserId: event.target.value,
                      }))
                    }
                  >
                    {state.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel>Tags (comma separated)</FieldLabel>
                <input value={projectForm.tagsText} onChange={(event) => setProjectForm((prev) => ({ ...prev, tagsText: event.target.value }))} />
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <FieldLabel>Managers</FieldLabel>
                <div className="grid gap-1 md:grid-cols-2">
                  {state.users.map((user) => (
                    <label key={`manager-${user.id}`} className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={projectForm.managerUserIds.includes(user.id)}
                        onChange={() => toggleFormUser("managerUserIds", user.id)}
                      />
                      {user.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <FieldLabel>Watchers</FieldLabel>
                <div className="grid gap-1 md:grid-cols-2">
                  {state.users.map((user) => (
                    <label key={`watcher-${user.id}`} className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={projectForm.watcherUserIds.includes(user.id)}
                        onChange={() => toggleFormUser("watcherUserIds", user.id)}
                      />
                      {user.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={saveProject} disabled={!projectForm.name.trim()}>
                  {editingProjectId ? "Save project" : "Create project"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
