import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, History, Plus, Search } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import {
  EmptyState,
  StatusBadge,
} from "../components/primitives";
import {
  HR2_ENTITIES,
  changeStatusTone,
  entityLabel,
  formatDate,
  formatMoney,
  packageStatusTone,
  summarizeComponents,
} from "./utils";
import { Hr2CompPackageStatus, OurEntity } from "../../../store/types";

const STATUS_FILTERS: Array<{ id: "all" | Hr2CompPackageStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "Active", label: "Active" },
  { id: "Draft", label: "Draft" },
  { id: "Submitted", label: "Submitted" },
  { id: "Approved", label: "Approved" },
  { id: "Historical", label: "Historical" },
  { id: "Terminated", label: "Terminated" },
];

export function Hr2CompPackageListPage() {
  const navigate = useNavigate();
  const packages = useAppStore((s) => s.hr2CompensationPackages);
  const components = useAppStore((s) => s.hr2CompPackageComponents);
  const employees = useAppStore((s) => s.hrEmployees);
  const changeRequests = useAppStore((s) => s.hr2CompChangeRequests);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Hr2CompPackageStatus>("all");
  const [entityFilter, setEntityFilter] = useState<"all" | OurEntity>("all");

  const rows = useMemo(() => {
    const componentsByPackage = new Map<string, typeof components>();
    components.forEach((c) => {
      const list = componentsByPackage.get(c.packageId) ?? [];
      list.push(c);
      componentsByPackage.set(c.packageId, list);
    });
    const pendingChangesByPackage = new Map<string, number>();
    changeRequests.forEach((cr) => {
      if (cr.status === "Submitted" || cr.status === "UnderReview" || cr.status === "Draft") {
        pendingChangesByPackage.set(
          cr.packageId,
          (pendingChangesByPackage.get(cr.packageId) ?? 0) + 1,
        );
      }
    });
    return packages
      .map((pkg) => {
        const emp = employees.find((e) => e.id === pkg.employeeId);
        const empName = emp ? `${emp.firstName} ${emp.lastName}` : pkg.employeeId;
        const pkgComponents = componentsByPackage.get(pkg.id) ?? [];
        const { gross, net } = summarizeComponents(
          pkgComponents.map((c) => ({ kind: c.kind, amount: c.amount })),
        );
        return {
          pkg,
          emp,
          empName,
          position: emp?.position ?? "—",
          gross,
          net,
          pendingChanges: pendingChangesByPackage.get(pkg.id) ?? 0,
        };
      })
      .sort((a, b) => {
        const sa = packageSortKey(a.pkg.status);
        const sb = packageSortKey(b.pkg.status);
        if (sa !== sb) return sa - sb;
        return b.pkg.updatedAt.localeCompare(a.pkg.updatedAt);
      });
  }, [packages, components, employees, changeRequests]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.pkg.status !== statusFilter) return false;
      if (entityFilter !== "all" && row.pkg.employingEntityId !== entityFilter) return false;
      if (term) {
        const haystack = `${row.empName} ${row.position} ${row.pkg.versionLabel} ${row.pkg.id}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, entityFilter]);

  const totalActive = rows.filter((r) => r.pkg.status === "Active").length;
  const totalDraft = rows.filter((r) => r.pkg.status === "Draft").length;
  const totalSubmitted = rows.filter(
    (r) => r.pkg.status === "Submitted" || r.pkg.status === "UnderReview",
  ).length;
  const totalPendingChanges = changeRequests.filter(
    (cr) => cr.status === "Submitted" || cr.status === "UnderReview",
  ).length;

  return (
    <div className="p-6">
      <UiPageHeader
        title="Compensation"
        subtitle="Canonical compensation packages, governed change requests, audit history."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/hr2/compensation/audit">
              <Button size="sm" variant="secondary">
                <History size={14} className="mr-1" />
                Audit log
              </Button>
            </Link>
            <Link to="/hr2/compensation/new">
              <Button size="sm">
                <Plus size={14} className="mr-1" />
                New package
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Active packages" value={totalActive} tone="success" />
        <Kpi label="Drafts" value={totalDraft} tone="neutral" />
        <Kpi label="In review" value={totalSubmitted} tone="indigo" />
        <Kpi label="Pending changes" value={totalPendingChanges} tone="warning" />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Employee, role, version, id..."
                className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Entity</FieldLabel>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as "all" | OurEntity)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All entities</option>
              {HR2_ENTITIES.map((entity) => (
                <option key={entity} value={entity}>
                  {entityLabel(entity)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  isActive
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </Card>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={20} />}
          title="No packages match your filters"
          description="Try widening the filters above, or create a new compensation package."
          action={
            <Button size="sm" onClick={() => navigate("/hr2/compensation/new")}>
              <Plus size={14} className="mr-1" />
              New package
            </Button>
          }
        />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <Th>Employee</Th>
                  <Th>Version</Th>
                  <Th>Status</Th>
                  <Th>Entity</Th>
                  <Th className="text-right">Gross</Th>
                  <Th className="text-right">Net</Th>
                  <Th>Effective</Th>
                  <Th>Pending changes</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.pkg.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => navigate(`/hr2/compensation/${row.pkg.id}`)}
                  >
                    <Td>
                      <div className="font-semibold text-slate-800">{row.empName}</div>
                      <div className="text-[11px] text-slate-400">{row.position}</div>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-slate-700">{row.pkg.versionLabel}</span>
                    </Td>
                    <Td>
                      <StatusBadge label={row.pkg.status} tone={packageStatusTone(row.pkg.status)} dot />
                    </Td>
                    <Td>
                      <div className="text-sm text-slate-700">{entityLabel(row.pkg.employingEntityId)}</div>
                      {row.pkg.fundingEntityId && row.pkg.fundingEntityId !== row.pkg.employingEntityId && (
                        <div className="text-[11px] text-slate-400">
                          funded by {entityLabel(row.pkg.fundingEntityId)}
                        </div>
                      )}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(row.gross, row.pkg.packageCurrency)}
                    </Td>
                    <Td className="text-right tabular-nums font-semibold">
                      {formatMoney(row.net, row.pkg.packageCurrency)}
                    </Td>
                    <Td>
                      <div className="text-xs text-slate-600">{formatDate(row.pkg.effectiveFrom)}</div>
                      {row.pkg.effectiveTo && (
                        <div className="text-[11px] text-slate-400">→ {formatDate(row.pkg.effectiveTo)}</div>
                      )}
                    </Td>
                    <Td>
                      {row.pendingChanges > 0 ? (
                        <StatusBadge
                          label={`${row.pendingChanges} pending`}
                          tone={changeStatusTone("Submitted")}
                          dot
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: "success" | "neutral" | "indigo" | "warning" }) {
  const toneClass = {
    success: "text-emerald-700",
    neutral: "text-slate-700",
    indigo: "text-indigo-700",
    warning: "text-amber-700",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

function packageSortKey(status: Hr2CompPackageStatus): number {
  switch (status) {
    case "Active":
      return 0;
    case "Submitted":
    case "UnderReview":
      return 1;
    case "Approved":
      return 2;
    case "Draft":
      return 3;
    case "Historical":
      return 4;
    case "Terminated":
      return 5;
    default:
      return 6;
  }
}
