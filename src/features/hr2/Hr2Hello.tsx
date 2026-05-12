import { Link } from "react-router-dom";
import {
  AlertOctagon,
  Briefcase,
  CalendarOff,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Landmark,
  Laptop,
  Receipt,
  Sparkles,
  UserCircle,
  Wallet,
} from "lucide-react";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { Card } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { StatusBadge } from "./components/primitives";

interface ModuleRoute {
  to: string;
  label: string;
  icon: typeof Briefcase;
  phase: string;
  description: string;
}

const MODULE_ROUTES: ModuleRoute[] = [
  {
    to: "/hr2/people",
    label: "People",
    icon: UserCircle,
    phase: "Phase 5",
    description: "Employee directory with payroll-readiness lens.",
  },
  {
    to: "/hr2/compensation",
    label: "Compensation",
    icon: Briefcase,
    phase: "Phase 2",
    description: "Packages, governed change flows, full audit history.",
  },
  {
    to: "/hr2/payroll",
    label: "Payroll",
    icon: Wallet,
    phase: "Phase 3",
    description: "Cycle workspace, exception queue, final approval.",
  },
  {
    to: "/hr2/finance",
    label: "Finance Instructions",
    icon: Landmark,
    phase: "Phase 4",
    description: "Payment-instruction register and treasury funding workspace.",
  },
  {
    to: "/hr2/leave",
    label: "Leave",
    icon: CalendarOff,
    phase: "Phase 5",
    description: "Read-only mirror of the shared leave register.",
  },
  {
    to: "/hr2/assets",
    label: "Assets",
    icon: Laptop,
    phase: "Phase 5",
    description: "Hardware allocation mirror, linked to people.",
  },
];

const NARRATIVE = [
  {
    label: "Compensation is canonical",
    body: "Packages, components, and governed change requests are the source of truth for pay structure.",
  },
  {
    label: "Payroll consumes compensation",
    body: "Cycles derive their amounts from active packages at cycle time. Exceptions surface upstream blockers explicitly.",
  },
  {
    label: "Finance is downstream",
    body: "Payment instructions appear only after a payroll cycle is approved. Finance reviews, exports, and marks status manually.",
  },
];

const WALKTHROUGH = [
  {
    icon: Briefcase,
    label: "1. Open a compensation package",
    body: "See how active packages, components, and governed change requests look.",
    to: "/hr2/compensation",
  },
  {
    icon: Wallet,
    label: "2. Recompute a payroll cycle",
    body: "Inspect lines and the exceptions queue. Resolve blockers, then approve.",
    to: "/hr2/payroll",
  },
  {
    icon: Landmark,
    label: "3. Release payment instructions",
    body: "Mark batches as sent and verified once your bank confirms posting.",
    to: "/hr2/finance",
  },
];

export function Hr2Hello() {
  const activePackages = useAppStore(
    (s) => s.hr2CompensationPackages.filter((p) => p.status === "Active").length,
  );
  const pendingChanges = useAppStore(
    (s) =>
      s.hr2CompChangeRequests.filter(
        (r) => r.status === "Submitted" || r.status === "UnderReview",
      ).length,
  );
  const cyclesInReview = useAppStore(
    (s) =>
      s.hr2PayrollCycles.filter(
        (c) => c.status === "ReadyForReview" || c.status === "Computing",
      ).length,
  );
  const cyclesApproved = useAppStore(
    (s) =>
      s.hr2PayrollCycles.filter(
        (c) => c.status === "Approved" || c.status === "PaidOut",
      ).length,
  );
  const openBlockers = useAppStore(
    (s) =>
      s.hr2PayrollExceptions.filter((e) => e.status === "Open" && e.severity === "Blocker").length,
  );
  const readyBatches = useAppStore(
    (s) =>
      s.hr2PaymentInstructionBatches.filter(
        (b) => b.status === "Ready" || b.status === "PartiallyBlocked",
      ).length,
  );

  return (
    <div className="p-6">
      <UiPageHeader
        title="HR Module 2"
        subtitle="Workforce operations — compensation, payroll, and finance release as one connected chain."
        actions={
          <StatusBadge label="Module ready" tone="success" dot />
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={<Briefcase size={14} />} label="Active packages" value={activePackages} tone="success" />
        <Kpi icon={<ClipboardList size={14} />} label="Pending changes" value={pendingChanges} tone="info" />
        <Kpi icon={<Wallet size={14} />} label="Cycles in review" value={cyclesInReview} tone="indigo" />
        <Kpi icon={<CheckCircle2 size={14} />} label="Cycles approved" value={cyclesApproved} tone="success" />
        <Kpi icon={<AlertOctagon size={14} />} label="Open blockers" value={openBlockers} tone={openBlockers > 0 ? "danger" : "neutral"} />
        <Kpi icon={<Landmark size={14} />} label="Batches to release" value={readyBatches} tone="indigo" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {NARRATIVE.map((item) => (
          <Card key={item.label} className="lg:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              {item.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
          </Card>
        ))}
      </div>

      <Card
        title="Walkthrough"
        actions={
          <StatusBadge
            label={
              <span className="inline-flex items-center gap-1">
                <Sparkles size={10} /> Try the chain
              </span>
            }
            tone="purple"
          />
        }
        className="mb-6"
      >
        <ol className="space-y-3">
          {WALKTHROUGH.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.label}>
                <Link
                  to={step.to}
                  className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/40 p-3 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                    <Icon size={16} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-800">
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">{step.body}</p>
                  </div>
                  <ChevronRight size={14} className="mt-3 text-slate-300 group-hover:text-brand-500" />
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card title="Module pages">
        <p className="mb-3 text-xs text-slate-500">
          HR Module 2 is implemented as an isolated module under <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">/hr2/*</code>. The existing HR module is unchanged.
        </p>
        <ul className="divide-y divide-slate-100">
          {MODULE_ROUTES.map((entry) => {
            const Icon = entry.icon;
            return (
              <li key={entry.to} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={entry.to}
                        className="truncate text-sm font-semibold text-slate-800 hover:text-brand-700"
                      >
                        {entry.label}
                      </Link>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                        {entry.to}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{entry.description}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {entry.phase}
                  </span>
                  <StatusBadge label="Ready" tone="success" dot />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-6 border-slate-200 bg-slate-50/30">
        <div className="flex items-start gap-3">
          <Receipt className="mt-0.5 shrink-0 text-slate-400" size={16} />
          <p className="text-xs text-slate-600">
            Self-service payslips are linked from a payroll cycle's employee detail page (
            <code className="rounded bg-white px-1 py-0.5 text-[10px]">/hr2/payroll/:cycleId/employee/:employeeId → payslip</code>) — they
            are not a stand-alone sidebar entry to keep the navigation flat.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "neutral" | "info" | "indigo" | "success" | "danger";
}) {
  const c = {
    neutral: "text-slate-700",
    info: "text-sky-700",
    indigo: "text-indigo-700",
    success: "text-emerald-700",
    danger: "text-rose-700",
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
