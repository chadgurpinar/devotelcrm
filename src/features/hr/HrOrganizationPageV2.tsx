import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { buildHrOrgAnalytics, buildHrOrgChart, selectManagerChain } from "../../store/hrOrgSelectors";
import { HrDepartment } from "../../store/types";
import { HrEmployeeProfileDrawer } from "./components/HrEmployeeProfileDrawer";
import { HrOrgChartGraph } from "./components/HrOrgChartGraph";

type OrganizationTab = "OrgChart" | "Departments" | "Analytics";

type DepartmentForm = {
  name: string;
  parentDepartmentId: string;
  departmentHeadEmployeeId: string;
};

type DepartmentHierarchyRow = {
  department: HrDepartment;
  depth: number;
  orphanParent: boolean;
  cycleDetected: boolean;
};

function emptyForm(): DepartmentForm {
  return {
    name: "",
    parentDepartmentId: "",
    departmentHeadEmployeeId: "",
  };
}

export function HrOrganizationPageV2() {
  const hrEmployees = useAppStore((state) => state.hrEmployees);
  const hrDepartments = useAppStore((state) => state.hrDepartments);
  const createHrDepartment = useAppStore((state) => state.createHrDepartment);
  const updateHrDepartment = useAppStore((state) => state.updateHrDepartment);
  const deleteHrDepartment = useAppStore((state) => state.deleteHrDepartment);

  const [tab, setTab] = useState<OrganizationTab>("OrgChart");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [focusedEmployeeId, setFocusedEmployeeId] = useState<string | null>(null);
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(null);
  const [fitRequestVersion, setFitRequestVersion] = useState(0);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [form, setForm] = useState<DepartmentForm>(emptyForm);
  const [isModalOpen, setModalOpen] = useState(false);
  const hasLoggedOrgValidationRef = useRef(false);

  const departmentById = useMemo(() => {
    const map = new Map<string, string>();
    hrDepartments.forEach((department) => map.set(department.id, department.name));
    return map;
  }, [hrDepartments]);

  const orgChart = useMemo(() => buildHrOrgChart(hrEmployees, hrDepartments, { includeInactive }), [hrDepartments, hrEmployees, includeInactive]);
  const orgAnalytics = useMemo(
    () => buildHrOrgAnalytics(orgChart, hrEmployees, hrDepartments, { includeInactive }),
    [hrDepartments, hrEmployees, includeInactive, orgChart],
  );
  const managerNodeIds = useMemo(
    () =>
      Array.from(orgChart.nodeById.values())
        .filter((node) => node.directReportsCount > 0)
        .map((node) => node.id),
    [orgChart],
  );
  const searchableEmployees = useMemo(
    () => Array.from(orgChart.nodeById.values()).sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [orgChart],
  );
  const orgSearchResults = useMemo(() => {
    const query = orgSearch.trim().toLowerCase();
    if (!query) return [];
    return searchableEmployees.filter((entry) => entry.fullName.toLowerCase().includes(query)).slice(0, 10);
  }, [orgSearch, searchableEmployees]);

  const headcountByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    hrEmployees
      .filter((employee) => employee.active)
      .forEach((employee) => {
        map.set(employee.departmentId, (map.get(employee.departmentId) ?? 0) + 1);
      });
    return map;
  }, [hrEmployees]);

  const entitiesByDepartment = useMemo(() => {
    const map = new Map<string, Set<string>>();
    hrEmployees
      .filter((employee) => employee.active && employee.legalEntityId)
      .forEach((employee) => {
        const set = map.get(employee.departmentId) ?? new Set();
        set.add(employee.legalEntityId!);
        map.set(employee.departmentId, set);
      });
    return map;
  }, [hrEmployees]);

  const departmentRows = useMemo(() => {
    const departmentMap = new Map(hrDepartments.map((department) => [department.id, department]));
    const childrenByParent = new Map<string, HrDepartment[]>();
    const roots: DepartmentHierarchyRow[] = [];

    hrDepartments.forEach((department) => {
      const parentId = department.parentDepartmentId;
      const orphanParent = Boolean(parentId && (!departmentMap.has(parentId) || parentId === department.id));
      if (parentId && departmentMap.has(parentId) && parentId !== department.id) {
        const bucket = childrenByParent.get(parentId) ?? [];
        bucket.push(department);
        childrenByParent.set(parentId, bucket);
      } else {
        roots.push({
          department,
          depth: 0,
          orphanParent,
          cycleDetected: false,
        });
      }
    });

    childrenByParent.forEach((children) => {
      children.sort((left, right) => left.name.localeCompare(right.name));
    });
    roots.sort((left, right) => left.department.name.localeCompare(right.department.name));

    const rows: DepartmentHierarchyRow[] = [];
    const visited = new Set<string>();
    const stack = roots
      .slice()
      .reverse()
      .map((entry) => ({ ...entry }));

    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;
      if (visited.has(current.department.id)) {
        rows.push({ ...current, cycleDetected: true });
        continue;
      }
      visited.add(current.department.id);
      rows.push(current);
      const children = childrenByParent.get(current.department.id) ?? [];
      for (let idx = children.length - 1; idx >= 0; idx -= 1) {
        stack.push({
          department: children[idx],
          depth: current.depth + 1,
          orphanParent: false,
          cycleDetected: false,
        });
      }
    }

    hrDepartments
      .filter((department) => !visited.has(department.id))
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((department) => {
        rows.push({
          department,
          depth: 0,
          orphanParent: false,
          cycleDetected: true,
        });
      });

    const q = departmentSearch.trim().toLowerCase();
    let filtered = rows;
    if (entityFilter !== "All") {
      filtered = filtered.filter((entry) => {
        const entities = entitiesByDepartment.get(entry.department.id);
        return entities != null && entities.has(entityFilter);
      });
    }
    if (q) {
      filtered = filtered.filter((entry) => {
        const parentName = entry.department.parentDepartmentId ? departmentById.get(entry.department.parentDepartmentId) ?? "" : "";
        return entry.department.name.toLowerCase().includes(q) || parentName.toLowerCase().includes(q);
      });
    }
    return filtered;
  }, [departmentById, departmentSearch, entityFilter, entitiesByDepartment, hrDepartments]);

  const focusedChain = useMemo(() => {
    if (!focusedEmployeeId) return [];
    return selectManagerChain(focusedEmployeeId, { hrEmployees, hrDepartments }, { includeInactive });
  }, [focusedEmployeeId, hrDepartments, hrEmployees, includeInactive]);

  useEffect(() => {
    setCollapsedNodeIds((previous) => {
      let changed = false;
      const next = new Set<string>();
      previous.forEach((entry) => {
        if (orgChart.nodeById.has(entry)) next.add(entry);
        else changed = true;
      });
      return changed ? next : previous;
    });
  }, [orgChart]);

  useEffect(() => {
    if (!focusedEmployeeId) return;
    if (!orgChart.nodeById.has(focusedEmployeeId)) {
      setFocusedEmployeeId(null);
    }
  }, [focusedEmployeeId, orgChart]);

  useEffect(() => {
    if (tab !== "OrgChart") return;
    setFitRequestVersion((value) => value + 1);
  }, [tab]);

  useEffect(() => {
    if (hasLoggedOrgValidationRef.current) return;
    if (includeInactive) return;
    hasLoggedOrgValidationRef.current = true;
    const rootCount = orgChart.roots.length;
    const maxDepth = orgChart.maxDepth;
    console.info("[HR Org Chart Validation]", {
      rootCount,
      maxDepth,
      inactiveManagersIncluded: orgChart.diagnostics.inactiveManagersIncludedCount,
      rootsWithinExpected: rootCount <= 3,
      depthWithinExpected: maxDepth >= 3,
    });
  }, [includeInactive, orgChart]);

  function openCreateModal() {
    setEditingDepartmentId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEditModal(departmentId: string) {
    const department = hrDepartments.find((row) => row.id === departmentId);
    if (!department) return;
    setEditingDepartmentId(department.id);
    setForm({
      name: department.name,
      parentDepartmentId: department.parentDepartmentId ?? "",
      departmentHeadEmployeeId: department.departmentHeadEmployeeId ?? "",
    });
    setModalOpen(true);
  }

  function saveDepartment() {
    if (!form.name.trim()) return;
    if (editingDepartmentId) {
      const existing = hrDepartments.find((row) => row.id === editingDepartmentId);
      if (!existing) return;
      updateHrDepartment({
        ...existing,
        name: form.name.trim(),
        parentDepartmentId: form.parentDepartmentId || undefined,
        departmentHeadEmployeeId: form.departmentHeadEmployeeId || undefined,
      });
    } else {
      createHrDepartment({
        name: form.name.trim(),
        parentDepartmentId: form.parentDepartmentId || undefined,
        departmentHeadEmployeeId: form.departmentHeadEmployeeId || undefined,
      });
    }
    setModalOpen(false);
  }

  function toggleNodeCollapse(nodeId: string) {
    setCollapsedNodeIds((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function openEmployeeDrawer(employeeId: string) {
    setFocusedEmployeeId(employeeId);
    setDrawerEmployeeId(employeeId);
  }

  function focusEmployeeInChart(employeeId: string) {
    if (!employeeId) return;
    const chain = selectManagerChain(employeeId, { hrEmployees, hrDepartments }, { includeInactive });
    setCollapsedNodeIds((previous) => {
      const next = new Set(previous);
      chain.forEach((entry) => next.delete(entry.employeeId));
      return next;
    });
    setFocusedEmployeeId(employeeId);
    setTab("OrgChart");
  }

  function fitTreeToScreen() {
    setFitRequestVersion((value) => value + 1);
  }

  return (
    <div className="space-y-4">
      <Card title="Organization">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={tab === "OrgChart" ? "primary" : "secondary"} onClick={() => setTab("OrgChart")}>
            Org Chart
          </Button>
          <Button size="sm" variant={tab === "Departments" ? "primary" : "secondary"} onClick={() => setTab("Departments")}>
            Departments
          </Button>
          <Button size="sm" variant={tab === "Analytics" ? "primary" : "secondary"} onClick={() => setTab("Analytics")}>
            Reporting Analytics
          </Button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Employees in chart</p>
            <p className="text-lg font-semibold text-slate-800">{orgChart.nodeById.size}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Root nodes</p>
            <p className="text-lg font-semibold text-slate-800">{orgChart.roots.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Max depth</p>
            <p className="text-lg font-semibold text-slate-800">{orgChart.maxDepth}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Departments</p>
            <p className="text-lg font-semibold text-slate-800">{hrDepartments.length}</p>
          </div>
        </div>
      </Card>

      {tab === "OrgChart" && (
        <Card title="Org Chart (reactive)">
          <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2 md:grid-cols-6">
              <div className="md:col-span-2">
                <FieldLabel>Search employee</FieldLabel>
                <input value={orgSearch} onChange={(event) => setOrgSearch(event.target.value)} placeholder="Type employee name..." />
                {orgSearch.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {orgSearchResults.length === 0 ? (
                      <span className="text-[11px] text-slate-500">No matches</span>
                    ) : (
                      orgSearchResults.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-brand-300"
                          onClick={() => focusEmployeeInChart(entry.id)}
                        >
                          {entry.fullName}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="md:col-span-4">
                <FieldLabel>View controls</FieldLabel>
                <div className="flex flex-wrap items-center gap-1">
                  <Button size="sm" variant={includeInactive ? "primary" : "secondary"} onClick={() => setIncludeInactive((value) => !value)}>
                    {includeInactive ? "Include inactive (all)" : "Active (structure preserved)"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCollapsedNodeIds(new Set())}>
                    Expand all
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCollapsedNodeIds(new Set(managerNodeIds))}>
                    Collapse all
                  </Button>
                  <Button size="sm" variant="secondary" onClick={fitTreeToScreen}>
                    Fit-to-screen
                  </Button>
                  <Badge className="bg-slate-100 text-slate-700">Nodes: {orgChart.nodeById.size}</Badge>
                  <Badge className="bg-slate-100 text-slate-700">Depth: {orgChart.maxDepth}</Badge>
                </div>
              </div>
            </div>
            {focusedChain.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                Chain to top: <span className="font-semibold text-slate-800">{focusedChain.map((entry) => entry.fullName).join(" -> ")}</span>
              </p>
            )}
            {orgChart.warnings.length > 0 && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                <ul className="space-y-0.5">
                  {orgChart.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <HrOrgChartGraph
            orgChart={orgChart}
            collapsedNodeIds={collapsedNodeIds}
            focusedEmployeeId={focusedEmployeeId}
            fitRequestVersion={fitRequestVersion}
            onToggleCollapse={toggleNodeCollapse}
            onOpenEmployee={openEmployeeDrawer}
          />
        </Card>
      )}

      {tab === "Departments" && (
        <Card
          title="Department Structure"
          actions={
            <Button size="sm" onClick={openCreateModal}>
              Add department
            </Button>
          }
        >
          <div className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <div>
              <FieldLabel>Search</FieldLabel>
              <input
                value={departmentSearch}
                onChange={(event) => setDepartmentSearch(event.target.value)}
                placeholder="Department or parent department..."
              />
            </div>
            <div>
              <FieldLabel>Legal entity</FieldLabel>
              <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
                <option value="All">All</option>
                <option value="USA">USA</option>
                <option value="UK">UK</option>
                <option value="TR">TR</option>
              </select>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Departments</p>
              <p className="text-lg font-semibold text-slate-800">{hrDepartments.length}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Active headcount</p>
              <p className="text-lg font-semibold text-slate-800">{hrEmployees.filter((employee) => employee.active).length}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Parent department</th>
                  <th>Department Head</th>
                  <th>Headcount</th>
                  <th>Target</th>
                  <th>Filled</th>
                  <th>Vacant</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {departmentRows.map((entry) => (
                  <tr key={entry.department.id}>
                    <td>
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${entry.depth * 18}px` }}>
                        {entry.depth > 0 && <span className="text-slate-300">└</span>}
                        <div>
                          <p className="font-semibold text-slate-700">{entry.department.name}</p>
                          <p className="text-[11px] text-slate-500">{entry.department.id}</p>
                        </div>
                      </div>
                      {(entry.orphanParent || entry.cycleDetected) && (
                        <p className="mt-1 text-[11px] text-rose-700">
                          {entry.cycleDetected ? "Cycle/disconnected hierarchy detected" : "Missing parent department link"}
                        </p>
                      )}
                    </td>
                    <td>{entry.department.parentDepartmentId ? departmentById.get(entry.department.parentDepartmentId) ?? "-" : "-"}</td>
                    <td>
                      {(() => {
                        const head = entry.department.departmentHeadEmployeeId
                          ? hrEmployees.find((e) => e.id === entry.department.departmentHeadEmployeeId)
                          : undefined;
                        return head ? `${head.firstName} ${head.lastName}` : "-";
                      })()}
                    </td>
                    <td>
                      <Badge className="bg-slate-100 text-slate-700">{headcountByDepartment.get(entry.department.id) ?? 0}</Badge>
                    </td>
                    <td>{entry.department.targetHeadcount ?? "-"}</td>
                    <td>{headcountByDepartment.get(entry.department.id) ?? 0}</td>
                    <td>
                      {entry.department.targetHeadcount != null
                        ? (() => {
                            const vacant = entry.department.targetHeadcount - (headcountByDepartment.get(entry.department.id) ?? 0);
                            return (
                              <span className={vacant > 0 ? "text-rose-600" : "text-emerald-600"}>
                                {vacant}
                              </span>
                            );
                          })()
                        : "-"}
                    </td>
                    <td>{new Date(entry.department.updatedAt).toLocaleString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(entry.department.id)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => deleteHrDepartment(entry.department.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "Analytics" && (
        <Card title="Reporting Chain Analytics">
          <div className="mb-3 grid gap-2 md:grid-cols-4">
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Top managers tracked</p>
              <p className="text-lg font-semibold text-slate-800">{orgAnalytics.topManagersByHeadcount.length}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Avg span of control</p>
              <p className="text-lg font-semibold text-slate-800">{orgAnalytics.averageSpanOfControl}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Root employees</p>
              <p className="text-lg font-semibold text-slate-800">{orgAnalytics.totalRoots}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Max depth</p>
              <p className="text-lg font-semibold text-slate-800">{orgAnalytics.maxDepth}</p>
            </div>
          </div>

          {orgAnalytics.warnings.length > 0 && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              {orgAnalytics.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <section className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top managers by headcount</p>
              <div className="mt-2 space-y-1">
                {orgAnalytics.topManagersByHeadcount.map((entry) => (
                  <button
                    type="button"
                    key={entry.employeeId}
                    className="w-full rounded-md border border-slate-200 p-2 text-left hover:border-brand-300"
                    onClick={() => focusEmployeeInChart(entry.employeeId)}
                  >
                    <p className="text-xs font-semibold text-slate-800">{entry.fullName}</p>
                    <p className="text-[11px] text-slate-500">
                      {entry.departmentName} · Subtree {entry.headcount} · Direct {entry.directReportsCount}
                    </p>
                  </button>
                ))}
                {orgAnalytics.topManagersByHeadcount.length === 0 && <p className="text-xs text-slate-500">No managers found.</p>}
              </div>
            </section>

            <section className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Largest teams (direct reports)</p>
              <div className="mt-2 space-y-1">
                {orgAnalytics.largestTeams.map((entry) => (
                  <button
                    type="button"
                    key={entry.employeeId}
                    className="w-full rounded-md border border-slate-200 p-2 text-left hover:border-brand-300"
                    onClick={() => focusEmployeeInChart(entry.employeeId)}
                  >
                    <p className="text-xs font-semibold text-slate-800">{entry.fullName}</p>
                    <p className="text-[11px] text-slate-500">
                      {entry.departmentName} · Direct reports {entry.directReportsCount}
                    </p>
                  </button>
                ))}
                {orgAnalytics.largestTeams.length === 0 && <p className="text-xs text-slate-500">No direct-report teams found.</p>}
              </div>
            </section>

            <section className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Departments with no manager</p>
              <div className="mt-2 space-y-1">
                {orgAnalytics.departmentsWithNoManager.map((entry) => (
                  <div key={entry.departmentId} className="rounded-md border border-slate-200 p-2">
                    <p className="text-xs font-semibold text-slate-800">{entry.departmentName}</p>
                    <p className="text-[11px] text-slate-500">Headcount: {entry.headcount}</p>
                  </div>
                ))}
                {orgAnalytics.departmentsWithNoManager.length === 0 && <p className="text-xs text-slate-500">All staffed departments have managers.</p>}
              </div>
            </section>

            <section className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employees with no department</p>
              <div className="mt-2 space-y-1">
                {orgAnalytics.employeesWithNoDepartment.map((entry) => (
                  <button
                    type="button"
                    key={entry.employeeId}
                    className="w-full rounded-md border border-slate-200 p-2 text-left hover:border-brand-300"
                    onClick={() => focusEmployeeInChart(entry.employeeId)}
                  >
                    <p className="text-xs font-semibold text-slate-800">{entry.fullName}</p>
                  </button>
                ))}
                {orgAnalytics.employeesWithNoDepartment.length === 0 && <p className="text-xs text-slate-500">No invalid department assignments.</p>}
              </div>
            </section>
          </div>

          <section className="mt-3 rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employees without manager</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {orgAnalytics.employeesWithoutManager.map((entry) => (
                <button
                  type="button"
                  key={entry.employeeId}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:border-brand-300"
                  onClick={() => focusEmployeeInChart(entry.employeeId)}
                  title={entry.reason}
                >
                  {entry.fullName}
                </button>
              ))}
              {orgAnalytics.employeesWithoutManager.length === 0 && <p className="text-xs text-slate-500">No root employee records.</p>}
            </div>
          </section>
        </Card>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">{editingDepartmentId ? "Edit department" : "Create department"}</h3>
              <Button size="sm" variant="secondary" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <FieldLabel>Name</FieldLabel>
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Parent department</FieldLabel>
                <select
                  value={form.parentDepartmentId}
                  onChange={(event) => setForm((prev) => ({ ...prev, parentDepartmentId: event.target.value }))}
                >
                  <option value="">None</option>
                  {hrDepartments
                    .filter((department) => department.id !== editingDepartmentId)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <FieldLabel>Department Head</FieldLabel>
                <select
                  value={form.departmentHeadEmployeeId}
                  onChange={(event) => setForm((prev) => ({ ...prev, departmentHeadEmployeeId: event.target.value }))}
                >
                  <option value="">None</option>
                  {hrEmployees
                    .filter((employee) => employee.active)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveDepartment} disabled={!form.name.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
      <HrEmployeeProfileDrawer
        employeeId={drawerEmployeeId}
        onClose={() => setDrawerEmployeeId(null)}
        onFocusInOrgChart={(employeeId) => focusEmployeeInChart(employeeId)}
      />
    </div>
  );
}
