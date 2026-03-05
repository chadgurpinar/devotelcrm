import { DbState, OpsCase, OpsCaseAction, OpsCaseCategory, OpsPortalId, OpsSeverity, OpsTrackFilter } from "../../../store/types";
import { getCaseAlertTime } from "./opsCaseTypes";

export type OpsPortalScope = "ALL" | "MINE";

export interface OpsPortalFilters {
  track?: OpsTrackFilter;
  severity?: OpsSeverity | "ANY";
  category?: OpsCaseCategory | "ANY";
  status?: "OPEN_ONLY" | "ALL";
  search?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function metadataSearchText(caseRow: OpsCase): string {
  return Object.values(caseRow.metadata)
    .map((entry) => String(entry))
    .join(" ")
    .toLowerCase();
}

function withinDateRange(dateIso: string, range?: OpsPortalFilters["dateRange"]): boolean {
  if (!range?.from && !range?.to) return true;
  const dateMs = new Date(dateIso).getTime();
  if (Number.isNaN(dateMs)) return false;
  const fromMs = range.from ? new Date(range.from).getTime() : undefined;
  const toMs = range.to ? new Date(`${range.to}T23:59:59.999`).getTime() : undefined;
  if (typeof fromMs === "number" && !Number.isNaN(fromMs) && dateMs < fromMs) return false;
  if (typeof toMs === "number" && !Number.isNaN(toMs) && dateMs > toMs) return false;
  return true;
}

function caseMatchesPortal(caseRow: OpsCase, portalId: OpsPortalId): boolean {
  if (portalId === "sms-noc") return caseRow.track === "SMS";
  if (portalId === "voice-noc") return caseRow.track === "VOICE";
  return true;
}

export function selectCasesForPortal(
  state: DbState,
  portalId: OpsPortalId,
  filters: OpsPortalFilters = {},
  options: { includedCategories?: OpsCaseCategory[]; scope?: OpsPortalScope; scopeMine?: boolean } = {},
): OpsCase[] {
  const activeUserId = state.activeUserId;
  const search = normalizeText(filters.search ?? "");
  const scope: OpsPortalScope = options.scope ?? (options.scopeMine ? "MINE" : "ALL");
  const companyById = new Map(state.companies.map((company) => [company.id, company]));
  return state.opsCases
    .filter((caseRow) => {
      if (!caseMatchesPortal(caseRow, portalId)) return false;
      if (options.includedCategories && options.includedCategories.length > 0 && !options.includedCategories.includes(caseRow.category)) {
        return false;
      }
      if (filters.track && filters.track !== "ANY" && caseRow.track !== filters.track) return false;
      if (filters.severity && filters.severity !== "ANY" && caseRow.severity !== filters.severity) return false;
      if (filters.category && filters.category !== "ANY" && caseRow.category !== filters.category) return false;
      if (filters.status === "OPEN_ONLY" && !(caseRow.status === "NEW" || caseRow.status === "IN_PROGRESS")) return false;
      if (!withinDateRange(getCaseAlertTime(caseRow), filters.dateRange)) return false;
      if (scope === "MINE") {
        if (caseRow.assignedToUserId === activeUserId) return true;
        if (!caseRow.relatedCompanyId) return false;
        const linkedCompany = companyById.get(caseRow.relatedCompanyId);
        if (!linkedCompany) return false;
        return linkedCompany.ownerUserId === activeUserId || linkedCompany.watcherUserIds.includes(activeUserId);
      }
      return true;
    })
    .filter((caseRow) => {
      if (!search) return true;
      const haystack = `${caseRow.id} ${caseRow.description} ${caseRow.relatedProvider ?? ""} ${caseRow.relatedDestination ?? ""} ${metadataSearchText(caseRow)}`.toLowerCase();
      return haystack.includes(search);
    })
    .sort((left, right) => getCaseAlertTime(right).localeCompare(getCaseAlertTime(left)));
}

export function selectCaseActions(state: DbState, caseId: string): OpsCaseAction[] {
  return state.opsAuditLogs
    .filter((entry) => entry.parentType === "Case" && entry.parentId === caseId)
    .map((entry) => ({
      id: entry.caseActionId ?? entry.id,
      caseId: entry.parentId,
      type: entry.actionType as OpsCaseAction["type"],
      comment: entry.comment,
      resolutionType: entry.resolutionType,
      ttNumber: entry.ttNumber,
      performedByUserId: entry.performedByUserId,
      performedAt: entry.timestamp,
    }))
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
}

export function selectLastCaseAction(state: DbState, caseId: string): OpsCaseAction | undefined {
  const ordered = selectCaseActions(state, caseId);
  return ordered.length > 0 ? ordered[ordered.length - 1] : undefined;
}

export function countOpenUrgentCases(state: DbState, portalId: OpsPortalId): number {
  return selectCasesForPortal(state, portalId, { status: "OPEN_ONLY", severity: "URGENT" }).length;
}
