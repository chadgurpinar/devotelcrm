import { OpsCase } from "../../../store/types";

function formatDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function NocCaseInfoBlock({ caseRow }: { caseRow: OpsCase }) {
  const isVoice = caseRow.track === "VOICE";
  if (caseRow.category === "PROVIDER_ISSUE") {
    const metadata = caseRow.metadata as OpsCase["metadata"] & {
      providerName?: string;
      smsCount?: number;
      callCount?: number;
      dlrValue?: number;
      asrValue?: number;
      alertTime?: string;
    };
    return (
      <>
        <p className="text-xs font-semibold text-slate-900">{metadata.providerName ?? caseRow.relatedProvider ?? "Unknown provider"}</p>
        {isVoice ? (
          <>
            <p className="text-[11px] text-slate-600">Calls: {metadata.callCount ?? metadata.smsCount ?? "-"}</p>
            <p className="text-[11px] text-slate-600">ASR: {metadata.asrValue ?? "-"}</p>
          </>
        ) : (
          <>
            <p className="text-[11px] text-slate-600">SMS: {metadata.smsCount ?? metadata.callCount ?? "-"}</p>
            <p className="text-[11px] text-slate-600">DLR: {metadata.dlrValue ?? "-"}</p>
          </>
        )}
        <p className="text-[11px] text-slate-500">Alert: {formatDate(metadata.alertTime ?? caseRow.createdAt)}</p>
      </>
    );
  }

  if (caseRow.category === "LOSSES") {
    const metadata = caseRow.metadata as OpsCase["metadata"] & {
      customerName?: string;
      destination?: string;
      lossAmount?: number;
      alertTime?: string;
    };
    return (
      <>
        <p className="text-xs font-semibold text-slate-900">{metadata.customerName ?? "Unknown customer"}</p>
        <p className="text-[11px] text-slate-600">Destination: {metadata.destination ?? caseRow.relatedDestination ?? "-"}</p>
        <p className="text-[11px] text-slate-600">Loss amount: {metadata.lossAmount ?? 0}</p>
        <p className="text-[11px] text-slate-500">Alert: {formatDate(metadata.alertTime ?? caseRow.createdAt)}</p>
      </>
    );
  }

  if (caseRow.category === "NEW_LOST_TRAFFIC") {
    const metadata = caseRow.metadata as OpsCase["metadata"] & {
      customerName?: string;
      destination?: string;
      attemptCount?: number;
      alertTime?: string;
    };
    return (
      <>
        <p className="text-xs font-semibold text-slate-900">{metadata.customerName ?? "Unknown customer"}</p>
        <p className="text-[11px] text-slate-600">Destination: {metadata.destination ?? caseRow.relatedDestination ?? "-"}</p>
        <p className="text-[11px] text-slate-600">Attempts: {metadata.attemptCount ?? 0}</p>
        <p className="text-[11px] text-slate-500">Alert: {formatDate(metadata.alertTime ?? caseRow.createdAt)}</p>
      </>
    );
  }

  if (caseRow.category === "TRAFFIC_COMPARISON") {
    const metadata = caseRow.metadata as OpsCase["metadata"] & {
      comparisonType?: string;
      comparisonPercentage?: number;
      alertTime?: string;
    };
    return (
      <>
        <p className="text-xs font-semibold text-slate-900">Hourly traffic comparison</p>
        <p className="text-[11px] text-slate-600">
          {metadata.comparisonType ?? "-"} {metadata.comparisonPercentage ?? 0}%
        </p>
        <p className="text-[11px] text-slate-500">Alert: {formatDate(metadata.alertTime ?? caseRow.createdAt)}</p>
      </>
    );
  }

  if (caseRow.category === "SCHEDULE_TEST_RESULT") {
    const metadata = caseRow.metadata as OpsCase["metadata"] & {
      providerName?: string;
      destination?: string;
      testResult?: string;
      testToolName?: string;
      alertTime?: string;
    };
    return (
      <>
        <p className="text-xs font-semibold text-slate-900">{metadata.providerName ?? caseRow.relatedProvider ?? "Unknown provider"}</p>
        <p className="text-[11px] text-slate-600">Destination: {metadata.destination ?? caseRow.relatedDestination ?? "-"}</p>
        <p className="text-[11px] text-slate-600">
          Result: {metadata.testResult ?? "-"} ({metadata.testToolName ?? "-"})
        </p>
        <p className="text-[11px] text-slate-500">Alert: {formatDate(metadata.alertTime ?? caseRow.createdAt)}</p>
      </>
    );
  }

  const metadata = caseRow.metadata as OpsCase["metadata"] & {
    customerName?: string;
    destination?: string;
    attemptCount?: number;
    alertTime?: string;
  };
  return (
    <>
      <p className="text-xs font-semibold text-slate-900">{isVoice ? "Failed Calls" : "Failed SMS"}</p>
      <p className="text-xs font-semibold text-slate-900">{metadata.customerName ?? "Unknown customer"}</p>
      <p className="text-[11px] text-slate-600">Destination: {metadata.destination ?? caseRow.relatedDestination ?? "-"}</p>
      <p className="text-[11px] text-slate-600">Attempts: {metadata.attemptCount ?? 0}</p>
      <p className="text-[11px] text-slate-500">Alert: {formatDate(metadata.alertTime ?? caseRow.createdAt)}</p>
    </>
  );
}
