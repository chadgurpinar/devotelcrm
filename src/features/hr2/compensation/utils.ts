import {
  Hr2CompChangeKind,
  Hr2CompChangeStatus,
  Hr2CompComponentKind,
  Hr2CompPackageStatus,
  HrCurrencyCode,
  OurEntity,
} from "../../../store/types";
import { StatusTone } from "../components/primitives";

export function formatMoney(amount: number, currency: HrCurrencyCode): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function formatMoneyPrecise(amount: number, currency: HrCurrencyCode): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function packageStatusTone(status: Hr2CompPackageStatus): StatusTone {
  switch (status) {
    case "Active":
      return "success";
    case "Approved":
      return "info";
    case "Submitted":
    case "UnderReview":
      return "indigo";
    case "Draft":
      return "neutral";
    case "Historical":
      return "slate";
    case "Terminated":
      return "danger";
    default:
      return "neutral";
  }
}

export function changeStatusTone(status: Hr2CompChangeStatus): StatusTone {
  switch (status) {
    case "Approved":
      return "success";
    case "Rejected":
      return "danger";
    case "Withdrawn":
      return "neutral";
    case "Submitted":
    case "UnderReview":
      return "indigo";
    case "Draft":
      return "warning";
    default:
      return "neutral";
  }
}

export function changeKindLabel(kind: Hr2CompChangeKind): string {
  switch (kind) {
    case "SalaryChange":
      return "Salary change";
    case "VariableBonus":
      return "Variable bonus";
    case "SettlementChange":
      return "Settlement update";
    case "Termination":
      return "Package termination";
    default:
      return kind;
  }
}

export function componentKindLabel(kind: Hr2CompComponentKind): string {
  switch (kind) {
    case "BaseSalary":
      return "Base salary";
    case "Allowance":
      return "Allowance";
    case "Deduction":
      return "Deduction";
    case "EmployerCost":
      return "Employer cost";
    case "VariableBonus":
      return "Variable bonus";
    default:
      return kind;
  }
}

export function componentKindAccent(kind: Hr2CompComponentKind): {
  bg: string;
  text: string;
  border: string;
} {
  switch (kind) {
    case "BaseSalary":
      return { bg: "bg-brand-50", text: "text-brand-700", border: "border-brand-200" };
    case "Allowance":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    case "Deduction":
      return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
    case "EmployerCost":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    case "VariableBonus":
      return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" };
    default:
      return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
  }
}

export function entityLabel(entity: OurEntity): string {
  return entity;
}

export const HR2_CURRENCIES: HrCurrencyCode[] = ["EUR", "USD", "GBP", "TRY"];

export const HR2_ENTITIES: OurEntity[] = ["USA", "UK", "TR"];

export function summarizeComponents(components: Array<{ kind: Hr2CompComponentKind; amount: number }>): {
  gross: number;
  deductions: number;
  employerCost: number;
  net: number;
} {
  let gross = 0;
  let deductions = 0;
  let employerCost = 0;
  components.forEach((c) => {
    if (c.kind === "BaseSalary" || c.kind === "Allowance" || c.kind === "VariableBonus") {
      gross += c.amount;
    } else if (c.kind === "Deduction") {
      deductions += Math.abs(c.amount);
    } else if (c.kind === "EmployerCost") {
      employerCost += c.amount;
    }
  });
  return {
    gross: Math.round(gross * 100) / 100,
    deductions: Math.round(deductions * 100) / 100,
    employerCost: Math.round(employerCost * 100) / 100,
    net: Math.round((gross - deductions) * 100) / 100,
  };
}
