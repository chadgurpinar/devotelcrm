import type { WeekData, QuickTaskInput, QuickTask } from "./types";
import { ReportCard } from "./ReportCard";
import { GeneralCommentsCard } from "./GeneralCommentsCard";
import { AiSummaryCard } from "./AiSummaryCard";
import { ManagerSummaryCard } from "./ManagerSummaryCard";

interface WeekDetailsProps {
  week: WeekData;
  users: { id: string; name: string }[];
  onAddNote: (reportType: string, note: string) => void;
  onCreateTask: (reportType: string, input: QuickTaskInput) => Promise<QuickTask>;
  onSubmitManager: () => void;
  onUpdateManager: (field: string, value: unknown) => void;
  onRegenerate: () => void;
  onAddComment: (text: string) => void;
}

export function WeekDetails({ week, users, onAddNote, onCreateTask, onSubmitManager, onUpdateManager, onRegenerate, onAddComment }: WeekDetailsProps) {
  const technical = week.reports.find((r) => r.type === "technical");
  const sales = week.reports.find((r) => r.type === "sales");
  const product = week.reports.find((r) => r.type === "product");

  return (
    <div className="space-y-4">
      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {technical && <ReportCard report={technical} users={users} onAddNote={(n) => onAddNote("technical", n)} onCreateTask={(i) => onCreateTask("technical", i)} />}
          {product && <ReportCard report={product} users={users} onAddNote={(n) => onAddNote("product", n)} onCreateTask={(i) => onCreateTask("product", i)} />}
        </div>
        {/* Right column */}
        <div className="space-y-4">
          {sales && <ReportCard report={sales} users={users} onAddNote={(n) => onAddNote("sales", n)} onCreateTask={(i) => onCreateTask("sales", i)} />}
          <GeneralCommentsCard comments={week.comments} onAdd={onAddComment} />
          <AiSummaryCard aiSummary={week.aiSummary} onRegenerate={onRegenerate} />
        </div>
      </div>

      {/* Manager Summary — full width */}
      <ManagerSummaryCard summary={week.managerSummary} onUpdate={onUpdateManager} onSubmit={onSubmitManager} />
    </div>
  );
}
