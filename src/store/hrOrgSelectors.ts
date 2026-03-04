import { DbState, HrDepartment, HrEmployee } from "./types";

export type HrOrgSelectorState = Pick<DbState, "hrEmployees" | "hrDepartments">;

export interface HrOrgBuildOptions {
  includeInactive?: boolean;
  managerResolver?: (employee: HrEmployee) => string | undefined;
}

export interface HrOrgNodeFlags {
  orphanManager?: boolean;
  managerInactive?: boolean;
  missingDepartment?: boolean;
  cycleDetected?: boolean;
  inactiveIncluded?: boolean;
}

export interface HrOrgNode {
  id: string;
  fullName: string;
  title: string;
  departmentId: string;
  departmentName: string;
  directReports: HrOrgNode[];
  directReportsCount: number;
  headcount: number;
  depth: number;
  active: boolean;
  flags: HrOrgNodeFlags;
}

export interface HrOrgChartResult {
  roots: HrOrgNode[];
  nodeById: Map<string, HrOrgNode>;
  managerOf: Map<string, string | null>;
  maxDepth: number;
  warnings: string[];
  diagnostics: {
    inactiveManagersIncludedCount: number;
    orphanManagersCount: number;
    selfManagerCount: number;
    cyclesResolvedCount: number;
  };
}

export interface HrOrgAnalytics {
  topManagersByHeadcount: Array<{
    employeeId: string;
    fullName: string;
    title: string;
    departmentName: string;
    headcount: number;
    directReportsCount: number;
  }>;
  largestTeams: Array<{
    employeeId: string;
    fullName: string;
    departmentName: string;
    directReportsCount: number;
  }>;
  averageSpanOfControl: number;
  departmentsWithNoManager: Array<{
    departmentId: string;
    departmentName: string;
    headcount: number;
  }>;
  employeesWithNoDepartment: Array<{
    employeeId: string;
    fullName: string;
  }>;
  employeesWithoutManager: Array<{
    employeeId: string;
    fullName: string;
    reason: "NoManager" | "OrphanManager" | "ManagerInactive" | "CycleResolved";
  }>;
  maxDepth: number;
  totalRoots: number;
  warnings: string[];
}

type RootReason = "NoManager" | "OrphanManager" | "ManagerInactive" | "CycleResolved";

function employeeFullName(employee: Pick<HrEmployee, "firstName" | "lastName">): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function pushWarning(warnings: string[], value: string) {
  if (!warnings.includes(value)) warnings.push(value);
}

function normalizeManagerId(rawManagerId: string | undefined): string | null {
  const trimmed = rawManagerId?.trim();
  return trimmed ? trimmed : null;
}

export function buildHrOrgChart(
  hrEmployees: HrEmployee[],
  hrDepartments: HrDepartment[],
  options?: HrOrgBuildOptions,
): HrOrgChartResult {
  const includeInactive = options?.includeInactive ?? false;
  const managerResolver = options?.managerResolver ?? ((employee: HrEmployee) => employee.managerId);
  const warnings: string[] = [];

  const departmentById = new Map(hrDepartments.map((department) => [department.id, department.name]));
  const allEmployeeById = new Map(hrEmployees.map((employee) => [employee.id, employee]));
  const activeEmployees = hrEmployees.filter((employee) => employee.active);

  const nodeById = new Map<string, HrOrgNode>();
  const managerOf = new Map<string, string | null>();
  const includedEmployeeIds = new Set<string>();
  const structurallyIncludedInactiveManagerIds = new Set<string>();

  let orphanManagersCount = 0;
  let selfManagerCount = 0;
  let cyclesResolvedCount = 0;

  if (includeInactive) {
    hrEmployees.forEach((employee) => includedEmployeeIds.add(employee.id));
  } else {
    activeEmployees.forEach((employee) => includedEmployeeIds.add(employee.id));
    activeEmployees.forEach((employee) => {
      const visited = new Set<string>([employee.id]);
      let managerId = normalizeManagerId(managerResolver(employee));
      while (managerId && !visited.has(managerId)) {
        visited.add(managerId);
        const manager = allEmployeeById.get(managerId);
        if (!manager) break;
        includedEmployeeIds.add(manager.id);
        if (!manager.active) structurallyIncludedInactiveManagerIds.add(manager.id);
        managerId = normalizeManagerId(managerResolver(manager));
      }
    });
  }

  function ensureNode(employee: HrEmployee): HrOrgNode {
    const existing = nodeById.get(employee.id);
    if (existing) {
      if (!employee.active) existing.flags.inactiveIncluded = true;
      if (!departmentById.has(employee.departmentId)) existing.flags.missingDepartment = true;
      return existing;
    }

    const createdNode: HrOrgNode = {
      id: employee.id,
      fullName: employeeFullName(employee),
      title: employee.jobTitle ?? employee.position ?? "",
      departmentId: employee.departmentId,
      departmentName: departmentById.get(employee.departmentId) ?? "Unassigned",
      directReports: [],
      directReportsCount: 0,
      headcount: 1,
      depth: 0,
      active: employee.active,
      flags: {
        inactiveIncluded: employee.active ? undefined : true,
        missingDepartment: departmentById.has(employee.departmentId) ? undefined : true,
      },
    };
    nodeById.set(employee.id, createdNode);
    return createdNode;
  }

  includedEmployeeIds.forEach((employeeId) => {
    const employee = allEmployeeById.get(employeeId);
    if (employee) ensureNode(employee);
  });

  nodeById.forEach((node, employeeId) => {
    const employee = allEmployeeById.get(employeeId);
    if (!employee) {
      managerOf.set(employeeId, null);
      return;
    }
    let managerId = normalizeManagerId(managerResolver(employee));

    if (!managerId) {
      managerOf.set(employee.id, null);
      return;
    }

    if (managerId === employee.id) {
      managerId = null;
      node.flags.cycleDetected = true;
      selfManagerCount += 1;
      managerOf.set(employee.id, managerId);
      return;
    }

    const manager = allEmployeeById.get(managerId);
    if (!manager) {
      managerId = null;
      node.flags.orphanManager = true;
      orphanManagersCount += 1;
      managerOf.set(employee.id, managerId);
      return;
    }

    const managerNode = ensureNode(manager);
    if (!manager.active) {
      managerNode.flags.inactiveIncluded = true;
      node.flags.managerInactive = true;
      if (!includeInactive) structurallyIncludedInactiveManagerIds.add(manager.id);
    }
    managerOf.set(employee.id, managerId);
  });

  const color = new Map<string, 0 | 1 | 2>();
  const chainIndex = new Map<string, number>();

  nodeById.forEach((_, startId) => {
    if ((color.get(startId) ?? 0) === 2) return;
    const chain: string[] = [];
    let cursor: string | null = startId;

    while (cursor) {
      const cursorColor = color.get(cursor) ?? 0;
      if (cursorColor === 2) break;
      if (cursorColor === 1) {
        const cycleStartIdx = chainIndex.get(cursor);
        if (cycleStartIdx !== undefined) {
          const cycleIds = chain.slice(cycleStartIdx);
          cycleIds.forEach((id) => {
            managerOf.set(id, null);
            const cycleNode = nodeById.get(id);
            if (cycleNode) cycleNode.flags.cycleDetected = true;
          });
          if (cycleIds.length) cyclesResolvedCount += 1;
        }
        break;
      }

      color.set(cursor, 1);
      chainIndex.set(cursor, chain.length);
      chain.push(cursor);
      cursor = managerOf.get(cursor) ?? null;
    }

    chain.forEach((id) => {
      color.set(id, 2);
      chainIndex.delete(id);
    });
  });

  const childrenByManagerId = new Map<string, string[]>();
  managerOf.forEach((managerId, employeeId) => {
    if (!managerId) return;
    const bucket = childrenByManagerId.get(managerId) ?? [];
    bucket.push(employeeId);
    childrenByManagerId.set(managerId, bucket);
  });

  childrenByManagerId.forEach((childIds, managerId) => {
    const managerNode = nodeById.get(managerId);
    if (!managerNode) return;
    const sortedChildren = childIds
      .map((id) => nodeById.get(id))
      .filter((node): node is HrOrgNode => Boolean(node))
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
    managerNode.directReports = sortedChildren;
    managerNode.directReportsCount = sortedChildren.length;
  });

  const roots = Array.from(nodeById.values())
    .filter((node) => !managerOf.get(node.id))
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  let maxDepth = 0;
  const depthQueue: Array<{ node: HrOrgNode; depth: number }> = roots.map((node) => ({ node, depth: 0 }));
  for (let idx = 0; idx < depthQueue.length; idx += 1) {
    const current = depthQueue[idx];
    current.node.depth = current.depth;
    if (current.depth > maxDepth) maxDepth = current.depth;
    current.node.directReports.forEach((child) => depthQueue.push({ node: child, depth: current.depth + 1 }));
  }

  const postOrderStack: Array<{ node: HrOrgNode; visited: boolean }> = roots.map((node) => ({ node, visited: false }));
  while (postOrderStack.length) {
    const current = postOrderStack.pop();
    if (!current) continue;
    if (!current.visited) {
      postOrderStack.push({ node: current.node, visited: true });
      for (let idx = current.node.directReports.length - 1; idx >= 0; idx -= 1) {
        postOrderStack.push({ node: current.node.directReports[idx], visited: false });
      }
      continue;
    }
    current.node.headcount = 1 + current.node.directReports.reduce((sum, child) => sum + child.headcount, 0);
  }

  const inactiveManagersIncludedCount = includeInactive ? 0 : structurallyIncludedInactiveManagerIds.size;
  if (inactiveManagersIncludedCount > 0) {
    pushWarning(warnings, `Included ${inactiveManagersIncludedCount} inactive managers to preserve hierarchy.`);
  }
  if (orphanManagersCount > 0 || selfManagerCount > 0) {
    const invalidManagerLinks = orphanManagersCount + selfManagerCount;
    pushWarning(
      warnings,
      `${invalidManagerLinks} employees had invalid managers (missing/self) and were promoted to root.`,
    );
  }
  if (cyclesResolvedCount > 0) {
    pushWarning(warnings, `Resolved ${cyclesResolvedCount} circular reporting chains.`);
  }

  return {
    roots,
    nodeById,
    managerOf,
    maxDepth,
    warnings,
    diagnostics: {
      inactiveManagersIncludedCount,
      orphanManagersCount,
      selfManagerCount,
      cyclesResolvedCount,
    },
  };
}

export function selectHrOrgChart(state: HrOrgSelectorState, options?: HrOrgBuildOptions): HrOrgChartResult {
  return buildHrOrgChart(state.hrEmployees, state.hrDepartments, options);
}

function rootReasonFromNode(node: HrOrgNode): RootReason {
  if (node.flags.cycleDetected) return "CycleResolved";
  if (node.flags.orphanManager) return "OrphanManager";
  if (node.flags.managerInactive) return "ManagerInactive";
  return "NoManager";
}

export function buildHrOrgAnalytics(
  chart: HrOrgChartResult,
  hrEmployees: HrEmployee[],
  hrDepartments: HrDepartment[],
  options?: HrOrgBuildOptions,
): HrOrgAnalytics {
  const includeInactive = options?.includeInactive ?? false;
  const employees = includeInactive ? hrEmployees : hrEmployees.filter((employee) => employee.active);
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const departmentById = new Map(hrDepartments.map((department) => [department.id, department.name]));

  const managers = Array.from(chart.nodeById.values()).filter((node) => node.directReportsCount > 0);
  const topManagersByHeadcount = managers
    .map((node) => ({
      employeeId: node.id,
      fullName: node.fullName,
      title: node.title,
      departmentName: node.departmentName,
      headcount: node.headcount,
      directReportsCount: node.directReportsCount,
    }))
    .sort((left, right) => right.headcount - left.headcount || left.fullName.localeCompare(right.fullName))
    .slice(0, 8);

  const largestTeams = managers
    .map((node) => ({
      employeeId: node.id,
      fullName: node.fullName,
      departmentName: node.departmentName,
      directReportsCount: node.directReportsCount,
    }))
    .sort((left, right) => right.directReportsCount - left.directReportsCount || left.fullName.localeCompare(right.fullName))
    .slice(0, 8);

  const totalManagers = managers.length;
  const totalDirectReports = managers.reduce((sum, node) => sum + node.directReportsCount, 0);
  const averageSpanOfControl = totalManagers ? Math.round((totalDirectReports / totalManagers) * 100) / 100 : 0;

  const departmentHeadcount = new Map<string, number>();
  const departmentManagerPresence = new Map<string, boolean>();
  employees.forEach((employee) => {
    departmentHeadcount.set(employee.departmentId, (departmentHeadcount.get(employee.departmentId) ?? 0) + 1);
    if ((chart.nodeById.get(employee.id)?.directReportsCount ?? 0) > 0) {
      departmentManagerPresence.set(employee.departmentId, true);
    }
  });

  const departmentsWithNoManager = hrDepartments
    .filter((department) => (departmentHeadcount.get(department.id) ?? 0) > 0)
    .filter((department) => !departmentManagerPresence.get(department.id))
    .map((department) => ({
      departmentId: department.id,
      departmentName: department.name,
      headcount: departmentHeadcount.get(department.id) ?? 0,
    }))
    .sort((left, right) => right.headcount - left.headcount || left.departmentName.localeCompare(right.departmentName));

  const employeesWithNoDepartment = employees
    .filter((employee) => !departmentById.has(employee.departmentId))
    .map((employee) => ({
      employeeId: employee.id,
      fullName: employeeFullName(employee),
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  const employeesWithoutManager = chart.roots
    .map((node) => ({
      employeeId: node.id,
      fullName: node.fullName,
      reason: rootReasonFromNode(node),
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  return {
    topManagersByHeadcount,
    largestTeams,
    averageSpanOfControl,
    departmentsWithNoManager,
    employeesWithNoDepartment,
    employeesWithoutManager,
    maxDepth: chart.maxDepth,
    totalRoots: chart.roots.length,
    warnings: chart.warnings,
  };
}

export function selectHrOrgAnalytics(state: HrOrgSelectorState, options?: HrOrgBuildOptions): HrOrgAnalytics {
  const chart = selectHrOrgChart(state, options);
  return buildHrOrgAnalytics(chart, state.hrEmployees, state.hrDepartments, options);
}

export function selectManagerChain(
  employeeId: string,
  state: HrOrgSelectorState,
  options?: HrOrgBuildOptions,
): Array<{ employeeId: string; fullName: string; title: string }> {
  const chart = selectHrOrgChart(state, options);
  const chain: Array<{ employeeId: string; fullName: string; title: string }> = [];
  const visited = new Set<string>();

  let cursor: string | null = employeeId;
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const node = chart.nodeById.get(cursor);
    if (!node) break;
    chain.push({ employeeId: node.id, fullName: node.fullName, title: node.title });
    cursor = chart.managerOf.get(cursor) ?? null;
  }

  return chain.reverse();
}

export function selectSubtreeHeadcount(
  employeeId: string,
  state: HrOrgSelectorState,
  options?: HrOrgBuildOptions,
): number {
  const chart = selectHrOrgChart(state, options);
  return chart.nodeById.get(employeeId)?.headcount ?? 0;
}

export function selectDepartmentHeadcount(
  departmentId: string,
  state: HrOrgSelectorState,
  options?: HrOrgBuildOptions,
): number {
  const includeInactive = options?.includeInactive ?? false;
  return state.hrEmployees
    .filter((employee) => (includeInactive ? true : employee.active))
    .filter((employee) => employee.departmentId === departmentId).length;
}

export function selectRootReasonByEmployeeId(
  employeeId: string,
  state: HrOrgSelectorState,
  options?: HrOrgBuildOptions,
): RootReason | null {
  const chart = selectHrOrgChart(state, options);
  const node = chart.nodeById.get(employeeId);
  if (!node || chart.managerOf.get(employeeId)) return null;
  return rootReasonFromNode(node);
}
