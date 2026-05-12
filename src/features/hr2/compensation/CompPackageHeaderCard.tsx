import { Calendar, CircleDollarSign, Landmark, Users } from "lucide-react";
import {
  Hr2CompPackage,
  HrEmployee,
} from "../../../store/types";
import { Card } from "../../../components/ui";
import { StatusBadge } from "../components/primitives";
import {
  entityLabel,
  formatDate,
  packageStatusTone,
} from "./utils";

interface CompPackageHeaderCardProps {
  pkg: Hr2CompPackage;
  employee?: HrEmployee;
  showEmployee?: boolean;
  extra?: React.ReactNode;
}

export function CompPackageHeaderCard({
  pkg,
  employee,
  showEmployee = true,
  extra,
}: CompPackageHeaderCardProps) {
  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : pkg.employeeId;
  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {showEmployee && (
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Users size={14} />
              {employeeName}
              {employee?.position && (
                <span className="text-slate-400">· {employee.position}</span>
              )}
            </p>
          )}
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Compensation package {pkg.versionLabel}
            </h2>
            <StatusBadge label={pkg.status} tone={packageStatusTone(pkg.status)} dot />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <Detail
              icon={<Calendar size={14} />}
              label="Effective from"
              value={formatDate(pkg.effectiveFrom)}
            />
            <Detail
              icon={<Calendar size={14} />}
              label="Effective to"
              value={formatDate(pkg.effectiveTo)}
            />
            <Detail
              icon={<Landmark size={14} />}
              label="Employing entity"
              value={entityLabel(pkg.employingEntityId)}
            />
            <Detail
              icon={<CircleDollarSign size={14} />}
              label="Funding entity"
              value={pkg.fundingEntityId ? entityLabel(pkg.fundingEntityId) : "Same as employing"}
            />
          </div>
        </div>
        {extra && <div className="flex shrink-0 items-center gap-2">{extra}</div>}
      </div>
    </Card>
  );
}

function Detail({
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
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
