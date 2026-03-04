import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import { HrOrgChartResult, HrOrgNode } from "../../../store/hrOrgSelectors";
import { OrgTreeNode, OrgTreeNodeData } from "./OrgTreeNode";
import "reactflow/dist/style.css";

interface HrOrgChartGraphProps {
  orgChart: HrOrgChartResult;
  collapsedNodeIds: Set<string>;
  focusedEmployeeId: string | null;
  fitRequestVersion: number;
  onToggleCollapse: (employeeId: string) => void;
  onOpenEmployee: (employeeId: string) => void;
}

const NODE_WIDTH = 240;
const H_SPACING = 44;
const V_SPACING = 168;

function warningTooltip(node: HrOrgNode): string | undefined {
  const reasons: string[] = [];
  if (node.flags.cycleDetected) reasons.push("Circular reporting chain was resolved.");
  if (node.flags.orphanManager) reasons.push("Manager record is missing; this employee is a root.");
  if (node.flags.managerInactive) reasons.push("Manager is inactive; chain is structurally preserved.");
  return reasons.length > 0 ? reasons.join(" ") : undefined;
}

function visibleChildren(node: HrOrgNode, collapsedNodeIds: Set<string>): HrOrgNode[] {
  if (collapsedNodeIds.has(node.id)) return [];
  return node.directReports;
}

function buildVisibleGraph(
  orgChart: HrOrgChartResult,
  collapsedNodeIds: Set<string>,
  focusedEmployeeId: string | null,
  onToggleCollapse: (employeeId: string) => void,
  onOpenEmployee: (employeeId: string) => void,
): { nodes: Array<Node<OrgTreeNodeData>>; edges: Edge[] } {
  const widthById = new Map<string, number>();
  const positionById = new Map<string, { x: number; y: number }>();
  const visibleIds = new Set<string>();
  const edgeRows: Edge[] = [];
  const collectVisited = new Set<string>();

  const collectVisible = (node: HrOrgNode) => {
    if (collectVisited.has(node.id)) return;
    collectVisited.add(node.id);
    visibleIds.add(node.id);
    const children = visibleChildren(node, collapsedNodeIds);
    children.forEach((child) => {
      edgeRows.push({
        id: `${node.id}->${child.id}`,
        source: node.id,
        target: child.id,
        type: "smoothstep",
      });
      collectVisible(child);
    });
  };

  orgChart.roots.forEach((root) => collectVisible(root));

  const measureVisited = new Set<string>();
  const measure = (node: HrOrgNode): number => {
    if (measureVisited.has(node.id)) return widthById.get(node.id) ?? NODE_WIDTH;
    measureVisited.add(node.id);
    if (!visibleIds.has(node.id)) {
      widthById.set(node.id, NODE_WIDTH);
      return NODE_WIDTH;
    }
    const children = visibleChildren(node, collapsedNodeIds).filter((child) => visibleIds.has(child.id));
    if (children.length === 0) {
      widthById.set(node.id, NODE_WIDTH);
      return NODE_WIDTH;
    }
    const childWidths = children.map((child) => measure(child));
    const sumChildrenWidth = childWidths.reduce((sum, value) => sum + value, 0) + (children.length - 1) * H_SPACING;
    const width = Math.max(NODE_WIDTH, sumChildrenWidth);
    widthById.set(node.id, width);
    return width;
  };

  const roots = orgChart.roots.filter((root) => visibleIds.has(root.id));
  const rootWidths = roots.map((root) => measure(root));
  const totalGraphWidth = rootWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, roots.length - 1) * H_SPACING;

  const assignVisited = new Set<string>();
  const assign = (node: HrOrgNode, leftX: number, depth: number) => {
    if (assignVisited.has(node.id) || !visibleIds.has(node.id)) return;
    assignVisited.add(node.id);
    const ownWidth = widthById.get(node.id) ?? NODE_WIDTH;
    positionById.set(node.id, {
      x: leftX + ownWidth / 2 - NODE_WIDTH / 2,
      y: depth * V_SPACING,
    });
    const children = visibleChildren(node, collapsedNodeIds).filter((child) => visibleIds.has(child.id));
    let childLeft = leftX;
    children.forEach((child) => {
      const childWidth = widthById.get(child.id) ?? NODE_WIDTH;
      assign(child, childLeft, depth + 1);
      childLeft += childWidth + H_SPACING;
    });
  };

  let rootLeft = -totalGraphWidth / 2;
  roots.forEach((root) => {
    const rootWidth = widthById.get(root.id) ?? NODE_WIDTH;
    assign(root, rootLeft, 0);
    rootLeft += rootWidth + H_SPACING;
  });

  const nodeRows: Array<Node<OrgTreeNodeData>> = Array.from(visibleIds)
    .map((employeeId) => orgChart.nodeById.get(employeeId))
    .filter((entry): entry is HrOrgNode => Boolean(entry))
    .map((entry) => ({
      id: entry.id,
      type: "orgEmployeeNode",
      draggable: false,
      selectable: false,
      position: positionById.get(entry.id) ?? { x: 0, y: 0 },
      data: {
        employeeId: entry.id,
        fullName: entry.fullName,
        title: entry.title,
        departmentName: entry.departmentName,
        directReportsCount: entry.directReportsCount,
        headcount: entry.headcount,
        active: entry.active,
        hasReports: entry.directReportsCount > 0,
        collapsed: collapsedNodeIds.has(entry.id),
        warningTooltip: warningTooltip(entry),
        isFocused: focusedEmployeeId === entry.id,
        onToggleCollapse,
        onOpenEmployee,
      },
    }))
    .sort((left, right) => left.position.y - right.position.y || left.position.x - right.position.x);

  return {
    nodes: nodeRows,
    edges: edgeRows,
  };
}

export function HrOrgChartGraph(props: HrOrgChartGraphProps) {
  const [flow, setFlow] = useState<ReactFlowInstance<OrgTreeNodeData, Edge> | null>(null);
  const [didInitialFit, setDidInitialFit] = useState(false);

  const graph = useMemo(
    () =>
      buildVisibleGraph(
        props.orgChart,
        props.collapsedNodeIds,
        props.focusedEmployeeId,
        props.onToggleCollapse,
        props.onOpenEmployee,
      ),
    [props.collapsedNodeIds, props.focusedEmployeeId, props.onOpenEmployee, props.onToggleCollapse, props.orgChart],
  );

  useEffect(() => {
    if (!flow || didInitialFit || graph.nodes.length === 0) return;
    flow.fitView({ duration: 300, padding: 0.2 });
    setDidInitialFit(true);
  }, [didInitialFit, flow, graph.nodes.length]);

  useEffect(() => {
    if (!flow) return;
    flow.fitView({ duration: 300, padding: 0.2 });
  }, [flow, props.fitRequestVersion]);

  useEffect(() => {
    if (!flow || !props.focusedEmployeeId) return;
    const node = flow.getNode(props.focusedEmployeeId);
    if (!node) return;
    const width = node.width ?? NODE_WIDTH;
    const height = node.height ?? 104;
    flow.setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: 1,
      duration: 350,
    });
  }, [flow, graph.nodes, props.focusedEmployeeId]);

  return (
    <div className="h-[66vh] rounded-md border border-slate-200 bg-white">
      {graph.nodes.length === 0 ? (
        <div className="p-3 text-xs text-slate-500">No employees to render in org chart.</div>
      ) : (
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          onInit={setFlow}
          nodeTypes={{ orgEmployeeNode: OrgTreeNode }}
          fitView
          minZoom={0.35}
          maxZoom={1.8}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          panOnDrag
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e2e8f0" gap={18} />
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
    </div>
  );
}
