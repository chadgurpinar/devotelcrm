import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  CalendarOff,
  Laptop,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import {
  StatusBadge,
  Tabs,
  TabItem,
  EmptyState,
  Timeline,
  TimelineEvent,
} from "../components/primitives";
import {
  changeStatusTone,
  changeKindLabel,
  entityLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  packageStatusTone,
} from "../compensation/utils";
import { cycleStatusTone, formatPeriod, lineStatusTone } from "../payroll/utils";

type ProfileTabId = "overview" | "compensation" | "payroll" | "leave" | "assets";

export function Hr2EmployeeProfilePage() {
  const params = useParams<{ employeeId: string }>();
  const employeeId = params.employeeId ?? "";
  const navigate = useNavigate();

  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === employeeId));
  const ext = useAppStore((s) =>
    s.hr2EmployeeExtensions.find((x) => x.employeeId === employeeId),
  );
  const packages = useAppStore((s) =>
    s.hr2CompensationPackages.filter((p) => p.employeeId === employeeId),
  );
  const components = useAppStore((s) => s.hr2CompPackageComponents);
  const changeRequests = useAppStore((s) =>
    s.hr2CompChangeRequests.filter((r) => r.employeeId === employeeId),
  );
  const audit = useAppStore((s) =>
    s.hr2CompAuditLog.filter((a) => a.employeeId === employeeId),
  );
  const cycleLines = useAppStore((s) =>
    s.hr2PayrollCycleLines.filter((l) => l.employeeId === employeeId),
  );
  const cycles = useAppStore((s) => s.hr2PayrollCycles);
  const leaveRequests = useAppStore((s) =>
    s.hrLeaveRequests.filter((r) => r.employeeId === employeeId),
  );
  const assetAssignments = useAppStore((s) =>
    s.hrAssetAssignments.filter((a) => a.employeeId === employeeId),
  );
  const assets = useAppStore((s) => s.hrAssets);

  const [activeTab, setActiveTab] = useState<ProfileTabId>("overview");

  const activePackage = useMemo(
    () => packages.find((p) => p.status === "Active"),
    [packages],
  );

  if (!employee) {
    return (
      <div className="p-6">
        <UiPageHeader title="Employee not found" />
        <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/people")}>
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
      </div>
    );
  }

  const tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "compensation", label: "Compensation", count: packages.length, icon: <Briefcase size={12} /> },
    { id: "payroll", label: "Payroll", count: cycleLines.length, icon: <Receipt size={12} /> },
    { id: "leave", label: "Leave", count: leaveRequests.length, icon: <CalendarOff size={12} /> },
    { id: "assets", label: "Assets", count: assetAssignments.length, icon: <Laptop size={12} /> },
  ];

  return (
    <div className="p-6">
      <Link
        to="/hr2/people"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to people
      </Link>
      <UiPageHeader
        title={employee.displayName}
        subtitle={`${employee.position ?? "—"} · ${entityLabel(employee.legalEntityId)}`}
        actions={
          activePackage && (
            <Link to={`/hr2/compensation/${activePackage.id}`}>
              <Button size="sm">
                <Briefcase size={14} className="mr-1" /> Open active package
              </Button>
            </Link>
          )
        }
      />

      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ProfileField icon={<Mail size={12} />} label="Email" value={employee.email} />
          <ProfileField icon={<Phone size={12} />} label="Phone" value={employee.phone} />
          <ProfileField icon={<MapPin size={12} />} label="Country" value={employee.countryOfEmployment} />
          <ProfileField
            icon={<ShieldCheck size={12} />}
            label="Bank"
            value={
              ext?.hasBankDetails ? (
                <StatusBadge label={`••${ext.bankAccountLast4 ?? "—"}`} tone="success" />
              ) : (
                <StatusBadge label="Missing" tone="danger" />
              )
            }
          />
        </div>
      </Card>

      <Tabs items={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as ProfileTabId)} className="mb-4" />

      {activeTab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="HR2 status" className="lg:col-span-1">
            <div className="space-y-2">
              <Row label="Active package" value={activePackage ? activePackage.versionLabel : "None"} />
              <Row label="Employing entity" value={ext ? entityLabel(ext.employingEntityId) : "—"} />
              <Row
                label="Funding entity"
                value={
                  ext?.fundingEntityId && ext.fundingEntityId !== ext.employingEntityId
                    ? entityLabel(ext.fundingEntityId)
                    : "Same"
                }
              />
              <Row label="Payroll frequency" value={ext?.payrollFrequency ?? "—"} />
              <Row label="Payout method" value={ext?.payoutMethod ?? "—"} />
              <Row label="Start date" value={formatDate(employee.startDate)} />
            </div>
          </Card>
          <Card title="Recent compensation audit" className="lg:col-span-2">
            {audit.length === 0 ? (
              <p className="text-xs text-slate-500">No compensation activity yet.</p>
            ) : (
              <Timeline events={audit
                .slice()
                .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
                .slice(0, 6)
                .map<TimelineEvent>((entry) => ({
                  id: entry.id,
                  title: entry.summary,
                  timestamp: formatDateTime(entry.performedAt),
                  variant: entry.action.includes("Approved")
                    ? "success"
                    : entry.action.includes("Rejected")
                      ? "danger"
                      : entry.action.includes("Submitted")
                        ? "info"
                        : "default",
                }))} />
            )}
          </Card>
        </div>
      )}

      {activeTab === "compensation" && (
        <Card title={`Packages (${packages.length})`} padded={false}>
          {packages.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">No packages for this employee yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {packages
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((pkg) => {
                  const baseComp = components.find(
                    (c) => c.packageId === pkg.id && c.kind === "BaseSalary",
                  );
                  return (
                    <li key={pkg.id} className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{pkg.versionLabel}</p>
                          <StatusBadge label={pkg.status} tone={packageStatusTone(pkg.status)} dot />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {entityLabel(pkg.employingEntityId)} · {pkg.packageCurrency} · effective{" "}
                          {formatDate(pkg.effectiveFrom)}
                          {pkg.effectiveTo ? ` → ${formatDate(pkg.effectiveTo)}` : ""}
                        </p>
                        {baseComp && (
                          <p className="mt-1 text-xs text-slate-600">
                            Base salary: <strong>{formatMoney(baseComp.amount, baseComp.currency)}</strong>{" "}
                            {baseComp.frequency.toLowerCase()}
                          </p>
                        )}
                      </div>
                      <Link to={`/hr2/compensation/${pkg.id}`}>
                        <Button size="sm" variant="secondary">
                          Open
                        </Button>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          )}
          {changeRequests.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Change requests
              </p>
              <ul className="space-y-1">
                {changeRequests
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-xs">
                      <StatusBadge label={changeKindLabel(r.kind)} tone="purple" size="sm" />
                      <StatusBadge label={r.status} tone={changeStatusTone(r.status)} size="sm" dot />
                      <span className="text-slate-600">Effective {formatDate(r.effectiveFrom)}</span>
                      <Link
                        to={`/hr2/compensation/${r.packageId}/change/submitted/${r.id}`}
                        className="text-brand-700 hover:underline"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {activeTab === "payroll" && (
        <Card title={`Payroll history (${cycleLines.length})`} padded={false}>
          {cycleLines.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">No payroll lines yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-left">Cycle</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cycleLines
                  .slice()
                  .sort((a, b) => b.derivedAt.localeCompare(a.derivedAt))
                  .map((line) => {
                    const cycle = cycles.find((c) => c.id === line.cycleId);
                    return (
                      <tr
                        key={line.id}
                        className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                        onClick={() => navigate(`/hr2/payroll/${line.cycleId}/employee/${line.employeeId}`)}
                      >
                        <td className="px-3 py-2">{cycle ? formatPeriod(cycle.period) : "—"}</td>
                        <td className="px-3 py-2">
                          {cycle && (
                            <StatusBadge label={cycle.status} tone={cycleStatusTone(cycle.status)} size="sm" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(line.grossPayrollCurrency, line.payrollCurrency)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {formatMoney(line.netPayrollCurrency, line.payrollCurrency)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge label={line.status} tone={lineStatusTone(line.status)} dot />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="ghost">Open</Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
          {activePackage && (
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-500">
              Current{" "}
              <Link to={`/hr2/compensation/${activePackage.id}`} className="text-brand-700 hover:underline">
                package
              </Link>{" "}
              feeds every new payroll cycle for this employee.
            </div>
          )}
        </Card>
      )}

      {activeTab === "leave" && (
        <Card title={`Leave requests (${leaveRequests.length})`} padded={false}>
          {leaveRequests.length === 0 ? (
            <EmptyState
              icon={<CalendarOff size={20} />}
              title="No leave requests"
              description="Leave entries appear here automatically when HR records them."
            />
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-right">Days</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((req) => (
                    <tr key={req.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{req.leaveType}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatDate(req.startDate)} → {formatDate(req.endDate)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{req.totalDays}</td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          label={req.status}
                          tone={
                            req.status === "Approved"
                              ? "success"
                              : req.status === "Rejected"
                                ? "danger"
                                : "info"
                          }
                          dot
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === "assets" && (
        <Card title={`Asset assignments (${assetAssignments.length})`} padded={false}>
          {assetAssignments.length === 0 ? (
            <EmptyState
              icon={<Laptop size={20} />}
              title="No assets assigned"
              description="Equipment assignments appear here when IT/HR record them."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {assetAssignments
                .slice()
                .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
                .map((a) => {
                  const asset = assets.find((x) => x.id === a.assetId);
                  return (
                    <li key={a.id} className="flex items-start gap-3 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Laptop size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{asset?.name ?? "Unknown asset"}</p>
                        <p className="text-[11px] text-slate-500">
                          {asset?.category ?? "—"} · Assigned {formatDate(a.assignedAt)}
                          {a.returnedAt ? ` · Returned ${formatDate(a.returnedAt)}` : ""}
                        </p>
                      </div>
                      <StatusBadge
                        label={a.acceptanceStatus}
                        tone={a.acceptanceStatus === "Accepted" ? "success" : "warning"}
                        size="sm"
                      />
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <span className="text-slate-300">{icon}</span> {label}
      </p>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}
