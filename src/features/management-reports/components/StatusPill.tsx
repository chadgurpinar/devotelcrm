export type StaffReportStatus = "Submitted" | "Draft" | "missing";

export function StatusPill({ status }: { status: StaffReportStatus }) {
  if (status === "Submitted")
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Submitted</span>;
  if (status === "Draft")
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Draft</span>;
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Not started</span>;
}
