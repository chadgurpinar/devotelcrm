import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Gift,
  History,
  Layers,
  PencilLine,
  X,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { CompPackageHeaderCard } from "./CompPackageHeaderCard";

interface KindCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  tone: "brand" | "emerald" | "indigo" | "rose";
}

const TONE_CLASSES: Record<KindCardProps["tone"], { bg: string; text: string; border: string }> = {
  brand: { bg: "bg-brand-50", text: "text-brand-700", border: "border-brand-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export function Hr2StartChangePage() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId ?? "";
  const navigate = useNavigate();
  const pkg = useAppStore((s) => s.hr2CompensationPackages.find((p) => p.id === packageId));
  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === pkg?.employeeId));

  if (!pkg) {
    return (
      <div className="p-6">
        <UiPageHeader title="Package not found" />
        <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/compensation")}>
          <ArrowLeft size={14} className="mr-1" /> Back to compensation
        </Button>
      </div>
    );
  }

  const options: KindCardProps[] = [
    {
      title: "Salary change",
      description: "Adjust the base salary while preserving the rest of the package.",
      icon: <PencilLine size={20} />,
      to: `/hr2/compensation/${pkg.id}/change/salary`,
      tone: "brand",
    },
    {
      title: "Variable bonus",
      description: "Add a one-off or recurring bonus on top of the active package.",
      icon: <Gift size={20} />,
      to: `/hr2/compensation/${pkg.id}/change/bonus`,
      tone: "emerald",
    },
    {
      title: "Settlement update",
      description: "Re-balance how the loaded cost splits across legal entities.",
      icon: <Layers size={20} />,
      to: `/hr2/compensation/${pkg.id}/change/settlement`,
      tone: "indigo",
    },
    {
      title: "Terminate package",
      description: "End this package with a final settlement and reason.",
      icon: <X size={20} />,
      to: `/hr2/compensation/${pkg.id}/change/terminate`,
      tone: "rose",
    },
  ];

  return (
    <div className="p-6">
      <Link
        to={`/hr2/compensation/${pkg.id}`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to package
      </Link>
      <UiPageHeader
        title="Start a compensation change"
        subtitle="Pick the type of change. Every change creates a governed request that must be approved before it affects payroll."
        actions={
          <Link to={`/hr2/compensation/audit`}>
            <Button size="sm" variant="secondary">
              <History size={14} className="mr-1" /> Audit log
            </Button>
          </Link>
        }
      />
      <CompPackageHeaderCard pkg={pkg} employee={employee} />
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const tone = TONE_CLASSES[opt.tone];
          return (
            <Link
              key={opt.title}
              to={opt.to}
              className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${tone.bg} ${tone.text} ${tone.border}`}>
                    {opt.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{opt.title}</h3>
                    <p className="mt-1 text-xs text-slate-600">{opt.description}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 transition group-hover:text-brand-600" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
