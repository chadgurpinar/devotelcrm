export type ReportStatus = "submitted" | "missing";
export type RiskLevel = "low" | "medium" | "high";
export type Priority = "low" | "medium" | "high";

export interface WeekSummary {
  id: string;
  label: string;
  weekStart: string;
  reportStatuses: { technical: ReportStatus; sales: ReportStatus; product: ReportStatus; manager: ReportStatus };
  riskLevel: RiskLevel;
  managerSummaryPreview: string;
}

export interface Report {
  type: "technical" | "sales" | "product";
  assigneeName: string;
  assigneeRole: string;
  status: ReportStatus;
  submittedAt?: string;
  content?: string;
  managerNote?: string;
  linkedTaskId?: string;
  overallStatus?: string;
  score?: number;
  achievements?: string[];
  inProgress?: string[];
  blockers?: string[];
  nextWeekFocus?: string[];
}

export interface ManagerSummary {
  executiveSummary: string;
  riskLevel: RiskLevel;
  blockers: string[];
  decisionsRequired: string[];
  deckLinks: { label: string; url: string }[];
  status: "draft" | "submitted";
}

export interface WeekComment {
  id: string;
  authorName: string;
  authorInitials: string;
  text: string;
  createdAt: string;
  aiGenerated?: boolean;
}

export interface WeekData {
  summary: WeekSummary;
  reports: Report[];
  managerSummary: ManagerSummary;
  comments: WeekComment[];
  aiSummary: { text: string; missingReports: string[]; generatedAt: string; coverage: Record<string, string | undefined> } | null;
}

export interface QuickTaskInput {
  title: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
}

export interface QuickTask {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
}
