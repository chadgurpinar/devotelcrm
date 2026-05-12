import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon, Briefcase, Search, UserCircle } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { EmptyState, StatusBadge } from "../components/primitives";
import { entityLabel, formatMoney } from "../compensation/utils";
import { OurEntity } from "../../../store/types";

export function Hr2PeoplePage() {
  const navigate = useNavigate();
  const employees = useAppStore((s) => s.hrEmployees);
  const extensions = useAppStore((s) => s.hr2EmployeeExtensions);
  const packages = useAppStore((s) => s.hr2CompensationPackages);
  const components = useAppStore((s) => s.hr2CompPackageComponents);
  const changeRequests = useAppStore((s) => s.hr2CompChangeRequests);

  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<"all" | OurEntity>("all");
  const [coverageFilter, setCoverageFilter] = useState<"all" | "covered" | "uncovered">("all");

  const rows = useMemo(() => {
    return employees
      .filter((e) => e.active)
      .map((employee) => {
        const ext = extensions.find((x) => x.employeeId === employee.id);
        const activePkg = packages.find(
          (p) => p.employeeId === employee.id && p.status === "Active",
        );
        const pendingChanges = changeRequests.filter(
          (r) =>
            r.employeeId === employee.id &&
            (r.status === "Submitted" || r.status === "UnderReview"),
        ).length;
        let baseSalary = 0;
        let currency: string | undefined;
        if (activePkg) {
          const baseComp = components.find(
            (c) => c.packageId === activePkg.id && c.kind === "BaseSalary",
          );
          if (baseComp) {
            baseSalary = baseComp.amount;
            currency = baseComp.currency;
          } else {
            currency = activePkg.packageCurrency;
          }
        }
        return {
          employee,
          ext,
          activePkg,
          pendingChanges,
          baseSalary,
          currency,
          hasBankDetails: ext?.hasBankDetails ?? false,
        };
      });
  }, [employees, extensions, packages, components, changeRequests]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (entityFilter !== "all" && row.employee.legalEntityId !== entityFilter) return false;
      if (coverageFilter === "covered" && !row.activePkg) return false;
      if (coverageFilter === "uncovered" && row.activePkg) return false;
      if (search) {
        const q = search.toLowerCase();
        const text = `${row.employee.displayName} ${row.employee.email} ${row.employee.position ?? ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, entityFilter, coverageFilter]);

  const coverage = rows.filter((r) => r.activePkg).length;
  const uncovered = rows.length - coverage;
  const missingBank = rows.filter((r) => !r.hasBankDetails).length;
  const pendingTotal = rows.reduce((s, r) => s + r.pendingChanges, 0);

  return (
    <div className="p-6">
      <UiPageHeader
        title="People (HR Module 2 view)"
        subtitle="Same employees as Human Resources, lensed for compensation and payroll readiness."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active employees" value={rows.length} icon={<UserCircle size={14} />} tone="neutral" />
        <Stat label="With active package" value={coverage} icon={<Briefcase size={14} />} tone="success" />
        <Stat label="No package" value={uncovered} icon={<AlertOctagon size={14} />} tone={uncovered > 0 ? "warning" : "neutral"} />
        <Stat label="Pending changes" value={pendingTotal} icon={<AlertOctagon size={14} />} tone={pendingTotal > 0 ? "info" : "neutral"} />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, role, email..."
                className="w-full rounded-md border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Entity</FieldLabel>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as "all" | OurEntity)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All entities</option>
              <option value="UK">UK</option>
              <option value="USA">USA</option>
              <option value="TR">TR</option>
            </select>
          </div>
          <div>
            <FieldLabel>Coverage</FieldLabel>
            <select
              value={coverageFilter}
              onChange={(e) => setCoverageFilter(e.target.value as "all" | "covered" | "uncovered")}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="covered">With active package</option>
              <option value="uncovered">No active package</option>
            </select>
          </div>
        </div>
        {missingBank > 0 && (
          <p className="mt-3 text-[11px] text-amber-700">
            {missingBank} employee{missingBank !== 1 ? "s" : ""} still missing bank details — these block payroll
            instructions until captured.
          </p>
        )}
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserCircle size={20} />}
          title="No employees match the filters"
          description="Reset the filters to see the full HR Module 2 people list."
        />
      ) : (
        <Card padded={false}>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Employee</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Entity</th>
                <th className="px-3 py-2 text-left">Active package</th>
                <th className="px-3 py-2 text-right">Base salary</th>
                <th className="px-3 py-2 text-left">Bank</th>
                <th className="px-3 py-2 text-right">Pending</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.employee.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  onClick={() => navigate(`/hr2/people/${row.employee.id}`)}
                >
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-800">{row.employee.displayName}</div>
                    <div className="text-[11px] text-slate-400">{row.employee.email}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.employee.position ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{entityLabel(row.employee.legalEntityId)}</td>
                  <td className="px-3 py-2">
                    {row.activePkg ? (
                      <StatusBadge label={row.activePkg.versionLabel} tone="success" dot />
                    ) : (
                      <StatusBadge label="None" tone="warning" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.activePkg && row.currency ? formatMoney(row.baseSalary, row.currency as never) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.hasBankDetails ? (
                      <StatusBadge label={`••${row.ext?.bankAccountLast4 ?? "—"}`} tone="success" size="sm" />
                    ) : (
                      <StatusBadge label="Missing" tone="danger" size="sm" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.pendingChanges > 0 ? (
                      <StatusBadge label={row.pendingChanges} tone="info" />
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost">
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "neutral" | "success" | "warning" | "info";
}) {
  const c = {
    neutral: "text-slate-700",
    success: "text-emerald-700",
    warning: "text-amber-700",
    info: "text-indigo-700",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className={`mt-0.5 text-2xl font-bold tabular-nums ${c}`}>{value}</p>
        </div>
        <span className="text-slate-300">{icon}</span>
      </div>
    </div>
  );
}
