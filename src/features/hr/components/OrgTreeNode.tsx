import { Badge, Button } from "../../../components/ui";
import { Handle, Position, type NodeProps } from "reactflow";

export interface OrgTreeNodeData {
  employeeId: string;
  fullName: string;
  title: string;
  departmentName: string;
  directReportsCount: number;
  headcount: number;
  active: boolean;
  hasReports: boolean;
  collapsed: boolean;
  warningTooltip?: string;
  isFocused: boolean;
  onToggleCollapse: (employeeId: string) => void;
  onOpenEmployee: (employeeId: string) => void;
}

function nodeTone(data: OrgTreeNodeData): string {
  if (data.isFocused) return "border-brand-400 bg-brand-50 ring-1 ring-brand-200";
  if (data.warningTooltip) return "border-amber-300 bg-amber-50";
  return "border-slate-200 bg-white";
}

export function OrgTreeNode(props: NodeProps<OrgTreeNodeData>) {
  const { data } = props;
  return (
    <div
      className={`w-[240px] cursor-pointer rounded-lg border p-2 shadow-sm transition hover:border-brand-300 ${nodeTone(data)}`}
      onClick={() => data.onOpenEmployee(data.employeeId)}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">{data.fullName}</p>
          <p className="text-[11px] text-slate-500">{data.title || "No title"}</p>
        </div>
        <div className="flex items-center gap-1">
          {data.warningTooltip && (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-xs text-amber-700"
              title={data.warningTooltip}
            >
              ⚠
            </span>
          )}
          {data.hasReports && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation();
                data.onToggleCollapse(data.employeeId);
              }}
            >
              {data.collapsed ? "Expand" : "Collapse"}
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Badge className="bg-slate-100 text-slate-700">{data.departmentName}</Badge>
        <Badge className="bg-brand-50 text-brand-700">Direct: {data.directReportsCount}</Badge>
        <Badge className="bg-slate-100 text-slate-700">Subtree: {data.headcount}</Badge>
        {!data.active && <Badge className="bg-slate-100 text-slate-700">Inactive</Badge>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}
