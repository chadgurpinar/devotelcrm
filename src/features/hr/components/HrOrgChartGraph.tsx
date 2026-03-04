import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type ReactFlowInstance,
  type Viewport,
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

const NODE_WIDTH = 220;
const NODE_HEIGHT = 116;
const H_SPACING = 16;
const V_SPACING = 228;
const FIT_MIN_ZOOM = 0.55;
const FIT_MAX_ZOOM = 1.15;
const FIT_SCALE_MULTIPLIER = 0.92;
const VIEWPORT_EPSILON = 0.01;

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

type NodeSize = {
  width: number;
  height: number;
};

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

function computeBounds(nodes: Array<Node<OrgTreeNodeData>>, sizeById?: Map<string, NodeSize>): Bounds | null {
  if (nodes.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  nodes.forEach((node) => {
    const measured = sizeById?.get(node.id);
    const width = measured?.width ?? NODE_WIDTH;
    const height = measured?.height ?? NODE_HEIGHT;
    const left = node.position.x;
    const top = node.position.y;
    const right = left + width;
    const bottom = top + height;
    if (left < minX) minX = left;
    if (top < minY) minY = top;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
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
  const viewportRef = useRef<HTMLDivElement | null>(null);

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

  const layoutSignature = useMemo(() => {
    if (graph.nodes.length === 0) return "empty";
    return graph.nodes
      .map((node) => `${node.id}:${Math.round(node.position.x)}:${Math.round(node.position.y)}`)
      .sort()
      .join("|");
  }, [graph.nodes]);

  const edgeSignature = useMemo(() => graph.edges.map((edge) => edge.id).sort().join("|"), [graph.edges]);

  const graphBounds = useMemo<Bounds | null>(() => computeBounds(graph.nodes), [graph.nodes]);

  const buildFittedViewport = useCallback((): Viewport | null => {
    if (!graphBounds) return null;
    const host = viewportRef.current;
    if (!host) return null;
    const viewportWidth = host.clientWidth;
    const viewportHeight = host.clientHeight;
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;

    const measuredNodes =
      flow?.getNodes().map((node) => {
        const measured = node as { measured?: { width?: number; height?: number } };
        return {
          id: node.id,
          width: node.width ?? measured.measured?.width ?? NODE_WIDTH,
          height: node.height ?? measured.measured?.height ?? NODE_HEIGHT,
        };
      }) ?? [];
    const measuredSizeById = new Map<string, NodeSize>(measuredNodes.map((row) => [row.id, { width: row.width, height: row.height }]));
    const effectiveBounds = computeBounds(graph.nodes, measuredSizeById) ?? graphBounds;
    const rawScale = Math.min(viewportWidth / effectiveBounds.width, viewportHeight / effectiveBounds.height) * FIT_SCALE_MULTIPLIER;
    const zoom = Math.max(FIT_MIN_ZOOM, Math.min(FIT_MAX_ZOOM, Number.isFinite(rawScale) ? rawScale : 1));
    const centerX = effectiveBounds.minX + effectiveBounds.width / 2;
    const centerY = effectiveBounds.minY + effectiveBounds.height / 2;

    return {
      x: viewportWidth / 2 - centerX * zoom,
      y: viewportHeight / 2 - centerY * zoom,
      zoom,
    };
  }, [flow, graph.nodes, graphBounds]);

  const applyFittedViewport = useCallback(
    (duration: number) => {
      if (!flow || !flow.viewportInitialized) return;
      const nextViewport = buildFittedViewport();
      if (!nextViewport) return;

      const lastViewport = flow.getViewport();
      if (
        lastViewport &&
        Math.abs(lastViewport.x - nextViewport.x) < VIEWPORT_EPSILON &&
        Math.abs(lastViewport.y - nextViewport.y) < VIEWPORT_EPSILON &&
        Math.abs(lastViewport.zoom - nextViewport.zoom) < VIEWPORT_EPSILON
      ) {
        return;
      }

      flow.setViewport(nextViewport, { duration });
    },
    [buildFittedViewport, flow],
  );

  useEffect(() => {
    if (!flow || graph.nodes.length === 0) return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        applyFittedViewport(280);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [applyFittedViewport, edgeSignature, flow, graph.nodes.length, layoutSignature]);

  useEffect(() => {
    if (!flow) return;
    let raf = 0;
    raf = window.requestAnimationFrame(() => applyFittedViewport(320));
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [applyFittedViewport, flow, props.fitRequestVersion]);

  useEffect(() => {
    const host = viewportRef.current;
    if (!host) return;
    let raf = 0;
    const scheduleFit = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => applyFittedViewport(150));
    };

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => scheduleFit());
      observer.observe(host);
      return () => {
        observer.disconnect();
        window.cancelAnimationFrame(raf);
      };
    }

    window.addEventListener("resize", scheduleFit);
    return () => {
      window.removeEventListener("resize", scheduleFit);
      window.cancelAnimationFrame(raf);
    };
  }, [applyFittedViewport]);

  useEffect(() => {
    if (!flow || !props.focusedEmployeeId) return;
    const node = flow.getNode(props.focusedEmployeeId);
    if (!node) return;
    const width = node.width ?? NODE_WIDTH;
    const height = node.height ?? NODE_HEIGHT;
    const zoom = flow.getZoom();
    flow.setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom,
      duration: 350,
    });
  }, [flow, graph.nodes, props.focusedEmployeeId]);

  return (
    <div
      ref={viewportRef}
      className="h-[68vh] rounded-md border border-slate-200 bg-white [&_.react-flow]:h-full [&_.react-flow__viewport]:origin-top-left"
    >
      {graph.nodes.length === 0 ? (
        <div className="p-3 text-xs text-slate-500">No employees to render in org chart.</div>
      ) : (
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          onInit={setFlow}
          nodeTypes={{ orgEmployeeNode: OrgTreeNode }}
          minZoom={FIT_MIN_ZOOM}
          maxZoom={1.8}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll
          panOnDrag
          panOnScroll={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e2e8f0" gap={18} />
          <Controls showInteractive={false} showFitView={false} />
        </ReactFlow>
      )}
    </div>
  );
}
