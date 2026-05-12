import {
  Hr2InstructionBatchStatus,
  Hr2InstructionLineStatus,
} from "../../../store/types";
import { StatusTone } from "../components/primitives";

export function batchStatusTone(status: Hr2InstructionBatchStatus): StatusTone {
  switch (status) {
    case "Ready":
      return "info";
    case "PartiallyBlocked":
      return "warning";
    case "Sent":
      return "indigo";
    case "Verified":
      return "success";
    case "Closed":
      return "slate";
    default:
      return "neutral";
  }
}

export function lineStatusTone(status: Hr2InstructionLineStatus): StatusTone {
  switch (status) {
    case "Ready":
      return "info";
    case "Blocked":
      return "danger";
    case "Sent":
      return "indigo";
    case "Verified":
      return "success";
    default:
      return "neutral";
  }
}

export function buildBatchCsv(
  batch: {
    id: string;
    employingEntityId: string;
    fundingEntityId?: string;
    payoutCurrency: string;
  },
  lines: Array<{
    employeeFullName: string;
    employingEntityId: string;
    fundingEntityId?: string;
    payoutCurrency: string;
    amount: number;
    payoutMethod: string;
    bankAccountLast4?: string;
    status: string;
    blockedReason?: string;
  }>,
): string {
  const header = [
    "Employee",
    "Employing entity",
    "Funding entity",
    "Currency",
    "Amount",
    "Payout method",
    "Bank last 4",
    "Status",
    "Blocked reason",
  ].join(",");
  const rows = lines.map((line) =>
    [
      escapeCsv(line.employeeFullName),
      line.employingEntityId,
      line.fundingEntityId ?? line.employingEntityId,
      line.payoutCurrency,
      line.amount.toFixed(2),
      line.payoutMethod,
      line.bankAccountLast4 ?? "",
      line.status,
      escapeCsv(line.blockedReason ?? ""),
    ].join(","),
  );
  void batch;
  return [header, ...rows].join("\n");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
