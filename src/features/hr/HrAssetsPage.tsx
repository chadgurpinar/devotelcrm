import { ReactNode, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { HrAssetCategory, HrCurrencyCode, HrEmployee, HrProvisionRequest, HrSoftwareProduct, HrSoftwareSeat } from "../../store/types";

const hardwareCategories: HrAssetCategory[] = ["Laptop", "Phone", "Accessory", "Monitor", "Other"];
const currencyOptions: HrCurrencyCode[] = ["EUR", "USD", "GBP", "TRY"];

type AssetsRole = "Employee" | "Manager" | "HR";
type AssetsTab = "Hardware" | "Software" | "Requests";
type DecisionModalState =
  | {
      requestId: string;
      role: "manager" | "hr";
      action: "approve" | "reject";
    }
  | null;
type FulfillModalState = {
  requestId: string;
} | null;
type RequestModalState = {
  requestType: HrProvisionRequest["requestType"];
} | null;
type SeatAssignModalState = {
  seatId: string;
} | null;

function displayEmployee(employee: Pick<HrEmployee, "displayName" | "firstName" | "lastName">): string {
  const fallback = `${employee.firstName} ${employee.lastName}`.trim();
  return employee.displayName || fallback;
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function requestStatusClass(status: HrProvisionRequest["status"]): string {
  if (status === "Fulfilled") return "bg-emerald-100 text-emerald-700";
  if (status === "Rejected" || status === "Cancelled") return "bg-rose-100 text-rose-700";
  return "bg-blue-100 text-blue-700";
}

function seatStatusClass(status: HrSoftwareSeat["status"]): string {
  if (status === "Assigned") return "bg-emerald-100 text-emerald-700";
  if (status === "Revoked" || status === "Expired") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function assetStatusClass(status: string): string {
  if (status === "Assigned") return "bg-emerald-100 text-emerald-700";
  if (status === "Retired" || status === "Lost" || status === "Stolen") return "bg-rose-100 text-rose-700";
  if (status === "Returned") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function ModalShell(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={props.onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{props.title}</h3>
          <Button size="sm" variant="secondary" onClick={props.onClose}>
            Close
          </Button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

function requestTimelineSummary(request: HrProvisionRequest): string {
  const points = [`Created ${request.createdAt.slice(0, 10)}`];
  if (request.managerApprovedAt) points.push(`Mgr ${request.managerApprovedAt.slice(0, 10)}`);
  if (request.hrApprovedAt) points.push(`HR ${request.hrApprovedAt.slice(0, 10)}`);
  if (request.fulfilledAt) points.push(`Fulfilled ${request.fulfilledAt.slice(0, 10)}`);
  return points.join(" -> ");
}

export function HrAssetsPage() {
  const state = useAppStore();
  const [viewAs, setViewAs] = useState<AssetsRole>("Employee");
  const [tab, setTab] = useState<AssetsTab>("Hardware");
  const [employeeActorId, setEmployeeActorId] = useState("");
  const [managerActorId, setManagerActorId] = useState("");
  const [hrActorId, setHrActorId] = useState("");
  const [requestModal, setRequestModal] = useState<RequestModalState>(null);
  const [decisionModal, setDecisionModal] = useState<DecisionModalState>(null);
  const [fulfillModal, setFulfillModal] = useState<FulfillModalState>(null);
  const [seatAssignModal, setSeatAssignModal] = useState<SeatAssignModalState>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [fulfillError, setFulfillError] = useState("");
  const [seatAssignError, setSeatAssignError] = useState("");

  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState<HrAssetCategory>("Laptop");
  const [assetNotes, setAssetNotes] = useState("");
  const [assetStatusFilter, setAssetStatusFilter] = useState<"" | "Available" | "Assigned" | "Returned" | "Retired" | "Lost" | "Stolen">("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<"" | HrAssetCategory>("");
  const [assetSearch, setAssetSearch] = useState("");

  const [productName, setProductName] = useState("");
  const [productVendor, setProductVendor] = useState("");
  const [productType, setProductType] = useState<HrSoftwareProduct["licenseType"]>("Seat");
  const [productNotes, setProductNotes] = useState("");

  const [seatProductId, setSeatProductId] = useState("");
  const [seatCost, setSeatCost] = useState("");
  const [seatCurrency, setSeatCurrency] = useState<HrCurrencyCode>("EUR");
  const [seatNotes, setSeatNotes] = useState("");
  const [seatStatusFilter, setSeatStatusFilter] = useState<"" | HrSoftwareSeat["status"]>("");
  const [seatProductFilter, setSeatProductFilter] = useState("");
  const [seatEmailSearch, setSeatEmailSearch] = useState("");

  const [managerTypeFilter, setManagerTypeFilter] = useState<"" | HrProvisionRequest["requestType"]>("");
  const [managerPriorityFilter, setManagerPriorityFilter] = useState<"" | HrProvisionRequest["priority"]>("");
  const [managerEmployeeFilter, setManagerEmployeeFilter] = useState("");

  const [hrRequestStatusFilter, setHrRequestStatusFilter] = useState<"" | HrProvisionRequest["status"]>("");
  const [hrRequestTypeFilter, setHrRequestTypeFilter] = useState<"" | HrProvisionRequest["requestType"]>("");
  const [hrPriorityFilter, setHrPriorityFilter] = useState<"" | HrProvisionRequest["priority"]>("");
  const [hrRequesterFilter, setHrRequesterFilter] = useState("");

  const [employeeRequestStatusFilter, setEmployeeRequestStatusFilter] = useState<"" | HrProvisionRequest["status"]>("");

  const [requestJustification, setRequestJustification] = useState("");
  const [requestPriority, setRequestPriority] = useState<HrProvisionRequest["priority"]>("Medium");
  const [requestAssetCategory, setRequestAssetCategory] = useState<HrAssetCategory>("Laptop");
  const [requestSoftwareProductId, setRequestSoftwareProductId] = useState("");

  const [fulfillAssetMode, setFulfillAssetMode] = useState<"existing" | "create">("existing");
  const [fulfillAssetId, setFulfillAssetId] = useState("");
  const [fulfillNewAssetName, setFulfillNewAssetName] = useState("");
  const [fulfillNewAssetCategory, setFulfillNewAssetCategory] = useState<HrAssetCategory>("Laptop");
  const [fulfillSoftwareSeatId, setFulfillSoftwareSeatId] = useState("");
  const [fulfillAssignedEmail, setFulfillAssignedEmail] = useState("");
  const [fulfillNote, setFulfillNote] = useState("");

  const [seatAssignEmployeeId, setSeatAssignEmployeeId] = useState("");
  const [seatAssignEmail, setSeatAssignEmail] = useState("");
  const [seatAssignNote, setSeatAssignNote] = useState("");

  const [assetHistoryId, setAssetHistoryId] = useState<string | null>(null);
  const [returnConditionModal, setReturnConditionModal] = useState<string | null>(null);
  const [returnConditionChoice, setReturnConditionChoice] = useState<"Good" | "Damaged" | "Needs Replacement">("Good");
  const [lostStolenModal, setLostStolenModal] = useState<{ assetId: string; status: "Lost" | "Stolen" } | null>(null);
  const [incidentNote, setIncidentNote] = useState("");

  const hrSoftwareProducts = state.hrSoftwareProducts ?? [];
  const hrAssetAssignments = state.hrAssetAssignments ?? [];
  const hrProvisionRequests = state.hrProvisionRequests ?? [];
  const hrSoftwareSeats = state.hrSoftwareSeats ?? [];

  const employeeById = useMemo(() => new Map(state.hrEmployees.map((employee) => [employee.id, employee])), [state.hrEmployees]);
  const productById = useMemo(() => new Map(hrSoftwareProducts.map((product) => [product.id, product])), [hrSoftwareProducts]);
  const activeEmployees = useMemo(() => state.hrEmployees.filter((employee) => employee.active), [state.hrEmployees]);
  const openAssetAssignments = useMemo(
    () => hrAssetAssignments.filter((assignment) => !assignment.returnedAt),
    [hrAssetAssignments],
  );

  const directReportsByManagerId = useMemo(() => {
    const map = new Map<string, HrEmployee[]>();
    state.hrEmployees.forEach((employee) => {
      if (!employee.managerId) return;
      const rows = map.get(employee.managerId) ?? [];
      rows.push(employee);
      map.set(employee.managerId, rows);
    });
    map.forEach((rows) => rows.sort((a, b) => displayEmployee(a).localeCompare(displayEmployee(b))));
    return map;
  }, [state.hrEmployees]);

  const managerActors = useMemo(
    () =>
      state.hrEmployees
        .filter((employee) => directReportsByManagerId.has(employee.id))
        .sort((a, b) => displayEmployee(a).localeCompare(displayEmployee(b))),
    [directReportsByManagerId, state.hrEmployees],
  );

  useEffect(() => {
    if (!employeeActorId && activeEmployees.length) setEmployeeActorId(activeEmployees[0].id);
    if (!managerActorId && managerActors.length) setManagerActorId(managerActors[0].id);
    if (!hrActorId && activeEmployees.length) setHrActorId(activeEmployees[0].id);
    if (!seatProductId && hrSoftwareProducts.length) setSeatProductId(hrSoftwareProducts[0].id);
    if (!requestSoftwareProductId && hrSoftwareProducts.length) setRequestSoftwareProductId(hrSoftwareProducts[0].id);
  }, [
    activeEmployees,
    employeeActorId,
    hrActorId,
    hrSoftwareProducts,
    managerActorId,
    managerActors,
    requestSoftwareProductId,
    seatProductId,
  ]);

  const employeeActor = employeeActorId ? employeeById.get(employeeActorId) : undefined;
  const managerTeam = managerActorId ? directReportsByManagerId.get(managerActorId) ?? [] : [];
  const managerTeamIds = useMemo(() => new Set(managerTeam.map((row) => row.id)), [managerTeam]);

  const myAssignments = useMemo(
    () => openAssetAssignments.filter((assignment) => assignment.employeeId === employeeActorId),
    [employeeActorId, openAssetAssignments],
  );
  const mySeats = useMemo(
    () => hrSoftwareSeats.filter((seat) => seat.status === "Assigned" && seat.assignedToEmployeeId === employeeActorId),
    [employeeActorId, hrSoftwareSeats],
  );
  const myRequests = useMemo(
    () =>
      hrProvisionRequests
        .filter((request) => request.requesterEmployeeId === employeeActorId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [employeeActorId, hrProvisionRequests],
  );
  const myPendingRequests = useMemo(
    () => myRequests.filter((request) => request.status === "PendingManager" || request.status === "PendingHR").length,
    [myRequests],
  );
  const myPendingAcceptance = useMemo(
    () => myAssignments.filter((assignment) => assignment.acceptanceStatus === "Pending").length,
    [myAssignments],
  );

  const managerQueue = useMemo(() => {
    let rows = hrProvisionRequests.filter((request) => request.status === "PendingManager" && managerTeamIds.has(request.requesterEmployeeId));
    if (managerTypeFilter) rows = rows.filter((request) => request.requestType === managerTypeFilter);
    if (managerPriorityFilter) rows = rows.filter((request) => request.priority === managerPriorityFilter);
    if (managerEmployeeFilter) rows = rows.filter((request) => request.requesterEmployeeId === managerEmployeeFilter);
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [hrProvisionRequests, managerEmployeeFilter, managerPriorityFilter, managerTeamIds, managerTypeFilter]);

  const managerTeamAssetCount = useMemo(
    () => openAssetAssignments.filter((assignment) => managerTeamIds.has(assignment.employeeId)).length,
    [managerTeamIds, openAssetAssignments],
  );
  const managerTeamSeatCount = useMemo(
    () => hrSoftwareSeats.filter((seat) => seat.status === "Assigned" && seat.assignedToEmployeeId && managerTeamIds.has(seat.assignedToEmployeeId)).length,
    [hrSoftwareSeats, managerTeamIds],
  );

  const hrRequests = useMemo(() => {
    let rows = hrProvisionRequests.slice();
    if (hrRequestStatusFilter) rows = rows.filter((request) => request.status === hrRequestStatusFilter);
    if (hrRequestTypeFilter) rows = rows.filter((request) => request.requestType === hrRequestTypeFilter);
    if (hrPriorityFilter) rows = rows.filter((request) => request.priority === hrPriorityFilter);
    if (hrRequesterFilter) rows = rows.filter((request) => request.requesterEmployeeId === hrRequesterFilter);
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [hrPriorityFilter, hrProvisionRequests, hrRequestStatusFilter, hrRequestTypeFilter, hrRequesterFilter]);

  const hrAssets = useMemo(() => {
    let rows = state.hrAssets.slice();
    if (assetStatusFilter) rows = rows.filter((asset) => asset.status === assetStatusFilter);
    if (assetCategoryFilter) rows = rows.filter((asset) => asset.category === assetCategoryFilter);
    if (assetSearch.trim()) {
      const query = assetSearch.trim().toLowerCase();
      rows = rows.filter((asset) => asset.name.toLowerCase().includes(query) || (asset.notes ?? "").toLowerCase().includes(query));
    }
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [assetCategoryFilter, assetSearch, assetStatusFilter, state.hrAssets]);

  const hrSeats = useMemo(() => {
    let rows = hrSoftwareSeats.slice();
    if (seatStatusFilter) rows = rows.filter((seat) => seat.status === seatStatusFilter);
    if (seatProductFilter) rows = rows.filter((seat) => seat.softwareProductId === seatProductFilter);
    if (seatEmailSearch.trim()) {
      const query = seatEmailSearch.trim().toLowerCase();
      rows = rows.filter((seat) => (seat.assignedToEmail ?? "").toLowerCase().includes(query));
    }
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [hrSoftwareSeats, seatEmailSearch, seatProductFilter, seatStatusFilter]);

  const selectedFulfillRequest = fulfillModal ? hrProvisionRequests.find((request) => request.id === fulfillModal.requestId) : undefined;
  const selectedSeatToAssign = seatAssignModal ? hrSoftwareSeats.find((seat) => seat.id === seatAssignModal.seatId) : undefined;

  function createAsset() {
    if (!assetName.trim()) return;
    state.createHrAsset({
      name: assetName.trim(),
      category: assetCategory,
      status: "Available",
      assignedToEmployeeId: undefined,
      assignedAt: undefined,
      returnedAt: undefined,
      digitalAcceptance: false,
      notes: assetNotes.trim() || undefined,
    });
    setAssetName("");
    setAssetNotes("");
    setAssetCategory("Laptop");
  }

  function createSoftwareProduct() {
    if (!productName.trim() || !productVendor.trim()) return;
    state.createHrSoftwareProduct({
      name: productName.trim(),
      vendor: productVendor.trim(),
      licenseType: productType,
      notes: productNotes.trim() || undefined,
    });
    setProductName("");
    setProductVendor("");
    setProductType("Seat");
    setProductNotes("");
  }

  function createSoftwareSeat() {
    if (!seatProductId) return;
    state.createHrSoftwareSeat({
      softwareProductId: seatProductId,
      status: "Available",
      assignedToEmployeeId: undefined,
      assignedToEmail: undefined,
      assignedAt: undefined,
      revokedAt: undefined,
      endDate: undefined,
      cost: seatCost ? Number(seatCost) : undefined,
      currency: seatCost ? seatCurrency : undefined,
      notes: seatNotes.trim() || undefined,
    });
    setSeatCost("");
    setSeatNotes("");
  }

  function submitRequest() {
    if (!employeeActor) {
      setRequestError("Select an employee actor first.");
      return;
    }
    if (!requestJustification.trim()) {
      setRequestError("Justification is required.");
      return;
    }
    if (!requestModal) return;
    if (requestModal.requestType === "Software" && !requestSoftwareProductId) {
      setRequestError("Choose a software product.");
      return;
    }
    state.createHrProvisionRequest({
      requesterEmployeeId: employeeActor.id,
      requestType: requestModal.requestType,
      requestedAssetCategory: requestModal.requestType === "Hardware" ? requestAssetCategory : undefined,
      requestedSoftwareProductId: requestModal.requestType === "Software" ? requestSoftwareProductId : undefined,
      justification: requestJustification.trim(),
      priority: requestPriority,
    });
    setRequestError("");
    setRequestJustification("");
    setRequestPriority("Medium");
    setRequestAssetCategory("Laptop");
    setRequestSoftwareProductId(hrSoftwareProducts[0]?.id ?? "");
    setRequestModal(null);
  }

  function openDecisionModal(requestId: string, role: "manager" | "hr", action: "approve" | "reject") {
    setDecisionError("");
    setDecisionComment("");
    setDecisionModal({ requestId, role, action });
  }

  function submitDecision() {
    if (!decisionModal) return;
    const trimmed = decisionComment.trim();
    if (decisionModal.action === "reject" && !trimmed) {
      setDecisionError("Comment is required for reject actions.");
      return;
    }
    let result: { ok: boolean; message?: string } = { ok: false, message: "Unknown error." };
    if (decisionModal.role === "manager") {
      result =
        decisionModal.action === "approve"
          ? state.approveHrProvisionByManager(decisionModal.requestId, trimmed || undefined)
          : state.rejectHrProvisionByManager(decisionModal.requestId, trimmed);
    } else {
      result =
        decisionModal.action === "approve"
          ? state.approveHrProvisionByHr(decisionModal.requestId, trimmed || undefined)
          : state.rejectHrProvisionByHr(decisionModal.requestId, trimmed);
    }
    if (!result.ok) {
      setDecisionError(result.message ?? "Decision failed.");
      return;
    }
    setDecisionError("");
    setDecisionComment("");
    setDecisionModal(null);
  }

  function submitFulfillment() {
    if (!selectedFulfillRequest) return;
    setFulfillError("");
    let assetId = fulfillAssetId;
    if (selectedFulfillRequest.requestType === "Hardware" && fulfillAssetMode === "create") {
      if (!fulfillNewAssetName.trim()) {
        setFulfillError("New asset name is required.");
        return;
      }
      assetId = state.createHrAsset({
        name: fulfillNewAssetName.trim(),
        category: fulfillNewAssetCategory,
        status: "Available",
        assignedToEmployeeId: undefined,
        assignedAt: undefined,
        returnedAt: undefined,
        digitalAcceptance: false,
        notes: "Created during request fulfillment.",
      });
    }
    const result = state.fulfillHrProvisionRequest(selectedFulfillRequest.id, {
      assetId: selectedFulfillRequest.requestType === "Hardware" ? assetId : undefined,
      softwareSeatId: selectedFulfillRequest.requestType === "Software" ? fulfillSoftwareSeatId : undefined,
      assignedToEmail: selectedFulfillRequest.requestType === "Software" ? fulfillAssignedEmail.trim() : undefined,
      note: fulfillNote.trim() || undefined,
    });
    if (!result.ok) {
      setFulfillError(result.message ?? "Fulfillment failed.");
      return;
    }
    setFulfillError("");
    setFulfillAssetMode("existing");
    setFulfillAssetId("");
    setFulfillNewAssetName("");
    setFulfillSoftwareSeatId("");
    setFulfillAssignedEmail("");
    setFulfillNote("");
    setFulfillModal(null);
  }

  function submitSeatAssignment() {
    if (!selectedSeatToAssign) return;
    const result = state.assignHrSoftwareSeat(selectedSeatToAssign.id, {
      employeeId: seatAssignEmployeeId,
      assignedToEmail: seatAssignEmail,
      notes: seatAssignNote.trim() || undefined,
    });
    if (!result.ok) {
      setSeatAssignError(result.message ?? "Seat assignment failed.");
      return;
    }
    setSeatAssignError("");
    setSeatAssignEmployeeId("");
    setSeatAssignEmail("");
    setSeatAssignNote("");
    setSeatAssignModal(null);
  }

  function openFulfillModal(requestId: string) {
    const request = hrProvisionRequests.find((entry) => entry.id === requestId);
    if (!request) return;
    const requester = employeeById.get(request.requesterEmployeeId);
    setFulfillError("");
    setFulfillAssetMode("existing");
    setFulfillAssetId(
      state.hrAssets.find((asset) => asset.status === "Available" || asset.status === "Returned")?.id ??
        state.hrAssets[0]?.id ??
        "",
    );
    setFulfillSoftwareSeatId(
      hrSoftwareSeats.find((seat) => seat.status === "Available" || seat.status === "Revoked")?.id ??
        hrSoftwareSeats[0]?.id ??
        "",
    );
    setFulfillAssignedEmail(requester?.email ?? "");
    setFulfillNote("");
    setFulfillModal({ requestId });
  }

  const pendingManagerCount = hrProvisionRequests.filter((request) => request.status === "PendingManager").length;
  const pendingHrCount = hrProvisionRequests.filter((request) => request.status === "PendingHR" && !request.hrApprovedAt).length;
  const awaitingFulfillmentCount = hrProvisionRequests.filter(
    (request) => request.status === "PendingHR" && Boolean(request.hrApprovedAt),
  ).length;

  const pendingDuplicateExists = useMemo(() => {
    if (!requestModal || !employeeActorId) return false;
    return hrProvisionRequests.some(
      (request) =>
        request.requesterEmployeeId === employeeActorId &&
        request.requestType === requestModal.requestType &&
        (request.status === "PendingManager" || request.status === "PendingHR"),
    );
  }, [employeeActorId, hrProvisionRequests, requestModal]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-indigo-800">Role-based view — Employee / Manager / HR</p>
        <div className="flex flex-wrap gap-2">
          {(["Employee", "Manager", "HR"] as const).map((role) => (
            <Button key={role} size="sm" variant={viewAs === role ? "primary" : "secondary"} onClick={() => setViewAs(role)}>
              {role}
            </Button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {viewAs === "Employee" ? (
            <div>
              <FieldLabel>Actor employee</FieldLabel>
              <select value={employeeActorId} onChange={(event) => setEmployeeActorId(event.target.value)} className="rounded border border-slate-300 px-2 py-1">
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {displayEmployee(employee)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {viewAs === "Manager" ? (
            <div>
              <FieldLabel>Actor manager</FieldLabel>
              <select value={managerActorId} onChange={(event) => setManagerActorId(event.target.value)} className="rounded border border-slate-300 px-2 py-1">
                {managerActors.length === 0 ? <option value="">No managers</option> : null}
                {managerActors.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {displayEmployee(manager)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {viewAs === "HR" ? (
            <div>
              <FieldLabel>Actor (demo)</FieldLabel>
              <select value={hrActorId} onChange={(event) => setHrActorId(event.target.value)} className="rounded border border-slate-300 px-2 py-1">
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {displayEmployee(employee)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      <Card title="Assets & Software">
        <div className="mb-3">
          <FieldLabel>Submodule</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {(["Hardware", "Software", "Requests"] as const).map((entry) => (
              <Button key={entry} size="sm" variant={tab === entry ? "primary" : "secondary"} onClick={() => setTab(entry)}>
                {entry === "Software" ? "Software Licenses" : entry === "Hardware" ? "Hardware Assets" : "Requests"}
              </Button>
            ))}
          </div>
        </div>

        {viewAs === "Employee" && (
          <div className="mb-3 grid gap-2 md:grid-cols-4">
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">My hardware assigned</p>
              <p className="text-lg font-semibold text-slate-800">{myAssignments.length}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">My software seats</p>
              <p className="text-lg font-semibold text-slate-800">{mySeats.length}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">My pending requests</p>
              <p className="text-lg font-semibold text-slate-800">{myPendingRequests}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending acceptance</p>
              <p className="text-lg font-semibold text-slate-800">{myPendingAcceptance}</p>
            </div>
          </div>
        )}

        {viewAs === "Manager" && (
          <div className="mb-3 grid gap-2 md:grid-cols-4">
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending manager approvals</p>
              <p className="text-lg font-semibold text-slate-800">{managerQueue.length}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">High priority pending</p>
              <p className="text-lg font-semibold text-slate-800">{managerQueue.filter((request) => request.priority === "High").length}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Team hardware assigned</p>
              <p className="text-lg font-semibold text-slate-800">{managerTeamAssetCount}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Team software seats</p>
              <p className="text-lg font-semibold text-slate-800">{managerTeamSeatCount}</p>
            </div>
          </div>
        )}

        {viewAs === "HR" && (
          <div className="mb-3 grid gap-2 md:grid-cols-4">
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Hardware total / assigned</p>
              <p className="text-lg font-semibold text-slate-800">
                {state.hrAssets.length} / {state.hrAssets.filter((a) => a.status === "Assigned").length}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Software seats total / assigned</p>
              <p className="text-lg font-semibold text-slate-800">
                {hrSoftwareSeats.length} / {hrSoftwareSeats.filter((seat) => seat.status === "Assigned").length}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending manager / pending HR</p>
              <p className="text-lg font-semibold text-slate-800">
                {pendingManagerCount} / {pendingHrCount}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Approved awaiting fulfillment</p>
              <p className="text-lg font-semibold text-slate-800">{awaitingFulfillmentCount}</p>
            </div>
          </div>
        )}

        {tab === "Hardware" && viewAs === "Employee" && (
          <>
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setRequestModal({ requestType: "Hardware" })}>
                Request hardware
              </Button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Assigned at</th>
                  <th>Acceptance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {myAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-xs text-slate-500">
                      No hardware assignments.
                    </td>
                  </tr>
                ) : (
                  myAssignments.map((assignment) => {
                    const asset = state.hrAssets.find((row) => row.id === assignment.assetId);
                    return (
                      <tr key={assignment.id}>
                        <td>{asset?.name ?? assignment.assetId}</td>
                        <td>{asset?.category ?? "-"}</td>
                        <td>{formatDateTime(assignment.assignedAt)}</td>
                        <td>
                          <Badge className={assignment.acceptanceStatus === "Accepted" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                            {assignment.acceptanceStatus}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => state.setHrAssetAssignmentAcceptance(assignment.id, assignment.acceptanceStatus !== "Accepted")}
                          >
                            {assignment.acceptanceStatus === "Accepted" ? "Revoke acceptance" : "Accept"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </>
        )}

        {tab === "Hardware" && viewAs === "Manager" && (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Assigned assets</th>
                <th>Pending acceptance</th>
              </tr>
            </thead>
            <tbody>
              {managerTeam.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-xs text-slate-500">
                    No team members for selected manager.
                  </td>
                </tr>
              ) : (
                managerTeam.map((employee) => {
                  const rows = openAssetAssignments.filter((assignment) => assignment.employeeId === employee.id);
                  return (
                    <tr key={employee.id}>
                      <td>{displayEmployee(employee)}</td>
                      <td>{rows.length}</td>
                      <td>{rows.filter((assignment) => assignment.acceptanceStatus === "Pending").length}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {tab === "Hardware" && viewAs === "HR" && (
          <>
            <section className="mb-3 rounded-md border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Create hardware asset</p>
              <div className="grid gap-2 md:grid-cols-5">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <input value={assetName} onChange={(event) => setAssetName(event.target.value)} />
                </div>
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <select value={assetCategory} onChange={(event) => setAssetCategory(event.target.value as HrAssetCategory)}>
                    {hardwareCategories.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Note</FieldLabel>
                  <input value={assetNotes} onChange={(event) => setAssetNotes(event.target.value)} placeholder="Optional note" />
                </div>
                <div className="flex items-end">
                  <Button size="sm" onClick={createAsset} disabled={!assetName.trim()}>
                    Add asset
                  </Button>
                </div>
              </div>
            </section>

            <section className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={assetStatusFilter} onChange={(event) => setAssetStatusFilter((event.target.value as typeof assetStatusFilter) || "")}>
                  <option value="">All</option>
                  <option value="Available">Available</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Returned">Returned</option>
                  <option value="Retired">Retired</option>
                  <option value="Lost">Lost</option>
                  <option value="Stolen">Stolen</option>
                </select>
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <select value={assetCategoryFilter} onChange={(event) => setAssetCategoryFilter((event.target.value as HrAssetCategory) || "")}>
                  <option value="">All</option>
                  {hardwareCategories.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Search</FieldLabel>
                <input value={assetSearch} onChange={(event) => setAssetSearch(event.target.value)} placeholder="Asset name or note..." />
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Acceptance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hrAssets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-xs text-slate-500">
                      No assets found.
                    </td>
                  </tr>
                ) : (
                  hrAssets.map((asset) => {
                    const activeAssignment = openAssetAssignments.find((assignment) => assignment.assetId === asset.id);
                    const assignee = activeAssignment ? employeeById.get(activeAssignment.employeeId) : undefined;
                    return (
                      <tr key={asset.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setAssetHistoryId(asset.id)}>
                        <td>
                          <p className="font-semibold text-slate-700">{asset.name}</p>
                          <p className="text-[11px] text-slate-500">{asset.category}</p>
                        </td>
                        <td>
                          <Badge className={assetStatusClass(asset.status)}>{asset.status}</Badge>
                        </td>
                        <td>{assignee ? displayEmployee(assignee) : "-"}</td>
                        <td>{activeAssignment ? activeAssignment.acceptanceStatus : "-"}</td>
                        <td>
                          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                            {asset.status === "Assigned" ? (
                              <Button size="sm" variant="secondary" onClick={() => { setReturnConditionModal(asset.id); setReturnConditionChoice("Good"); }}>
                                Return
                              </Button>
                            ) : null}
                            {asset.status !== "Retired" && asset.status !== "Lost" && asset.status !== "Stolen" ? (
                              <Button size="sm" variant="secondary" onClick={() => state.retireHrAsset(asset.id)}>
                                Retire
                              </Button>
                            ) : null}
                            {asset.status !== "Lost" && asset.status !== "Stolen" && asset.status !== "Retired" ? (
                              <Button size="sm" variant="secondary" onClick={() => { setLostStolenModal({ assetId: asset.id, status: "Lost" }); setIncidentNote(""); }}>
                                Mark Lost
                              </Button>
                            ) : null}
                            {asset.status !== "Lost" && asset.status !== "Stolen" && asset.status !== "Retired" ? (
                              <Button size="sm" variant="secondary" onClick={() => { setLostStolenModal({ assetId: asset.id, status: "Stolen" }); setIncidentNote(""); }}>
                                Mark Stolen
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </>
        )}

        {tab === "Software" && viewAs === "Employee" && (
          <>
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setRequestModal({ requestType: "Software" })}>
                Request software
              </Button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Assigned email</th>
                  <th>Assigned at</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mySeats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-xs text-slate-500">
                      No software seats assigned.
                    </td>
                  </tr>
                ) : (
                  mySeats.map((seat) => (
                    <tr key={seat.id}>
                      <td>{productById.get(seat.softwareProductId)?.name ?? seat.softwareProductId}</td>
                      <td>{seat.assignedToEmail ?? "-"}</td>
                      <td>{formatDateTime(seat.assignedAt)}</td>
                      <td>
                        <Badge className={seatStatusClass(seat.status)}>{seat.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

        {tab === "Software" && viewAs === "Manager" && (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Assigned seats</th>
                <th>Products</th>
              </tr>
            </thead>
            <tbody>
              {managerTeam.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-xs text-slate-500">
                    No team members for selected manager.
                  </td>
                </tr>
              ) : (
                managerTeam.map((employee) => {
                  const seats = hrSoftwareSeats.filter(
                    (seat) => seat.status === "Assigned" && seat.assignedToEmployeeId === employee.id,
                  );
                  const products = Array.from(new Set(seats.map((seat) => productById.get(seat.softwareProductId)?.name ?? seat.softwareProductId)));
                  return (
                    <tr key={employee.id}>
                      <td>{displayEmployee(employee)}</td>
                      <td>{seats.length}</td>
                      <td>{products.join(", ") || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {tab === "Software" && viewAs === "HR" && (
          <>
            <section className="mb-3 rounded-md border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Create software product</p>
              <div className="grid gap-2 md:grid-cols-5">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <input value={productName} onChange={(event) => setProductName(event.target.value)} />
                </div>
                <div>
                  <FieldLabel>Vendor</FieldLabel>
                  <input value={productVendor} onChange={(event) => setProductVendor(event.target.value)} />
                </div>
                <div>
                  <FieldLabel>License type</FieldLabel>
                  <select value={productType} onChange={(event) => setProductType(event.target.value as HrSoftwareProduct["licenseType"])}>
                    <option value="Seat">Seat</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Note</FieldLabel>
                  <input value={productNotes} onChange={(event) => setProductNotes(event.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button size="sm" onClick={createSoftwareProduct} disabled={!productName.trim() || !productVendor.trim()}>
                    Add product
                  </Button>
                </div>
              </div>
            </section>

            <section className="mb-3 rounded-md border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Create software seat</p>
              <div className="grid gap-2 md:grid-cols-6">
                <div className="md:col-span-2">
                  <FieldLabel>Product</FieldLabel>
                  <select value={seatProductId} onChange={(event) => setSeatProductId(event.target.value)}>
                    {hrSoftwareProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.vendor})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Cost</FieldLabel>
                  <input type="number" value={seatCost} onChange={(event) => setSeatCost(event.target.value)} />
                </div>
                <div>
                  <FieldLabel>Currency</FieldLabel>
                  <select value={seatCurrency} onChange={(event) => setSeatCurrency(event.target.value as HrCurrencyCode)}>
                    {currencyOptions.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Note</FieldLabel>
                  <input value={seatNotes} onChange={(event) => setSeatNotes(event.target.value)} />
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={createSoftwareSeat} disabled={!seatProductId}>
                  Add seat
                </Button>
              </div>
            </section>

            <section className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={seatStatusFilter} onChange={(event) => setSeatStatusFilter((event.target.value as HrSoftwareSeat["status"]) || "")}>
                  <option value="">All</option>
                  <option value="Available">Available</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Revoked">Revoked</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              <div>
                <FieldLabel>Product</FieldLabel>
                <select value={seatProductFilter} onChange={(event) => setSeatProductFilter(event.target.value)}>
                  <option value="">All</option>
                  {hrSoftwareProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Assigned email search</FieldLabel>
                <input value={seatEmailSearch} onChange={(event) => setSeatEmailSearch(event.target.value)} placeholder="email@company.com" />
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>Status</th>
                  <th>Assigned to</th>
                  <th>Assigned email</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hrSeats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-xs text-slate-500">
                      No software seats found.
                    </td>
                  </tr>
                ) : (
                  hrSeats.map((seat) => {
                    const assignee = seat.assignedToEmployeeId ? employeeById.get(seat.assignedToEmployeeId) : undefined;
                    return (
                      <tr key={seat.id}>
                        <td>
                          <p className="font-semibold text-slate-700">{productById.get(seat.softwareProductId)?.name ?? seat.softwareProductId}</p>
                          <p className="text-[11px] text-slate-500">{seat.id}</p>
                        </td>
                        <td>
                          <Badge className={seatStatusClass(seat.status)}>{seat.status}</Badge>
                        </td>
                        <td>{assignee ? displayEmployee(assignee) : "-"}</td>
                        <td>{seat.assignedToEmail ?? "-"}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(seat.status === "Available" || seat.status === "Revoked") && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setSeatAssignModal({ seatId: seat.id });
                                  setSeatAssignError("");
                                  const firstEmployee = activeEmployees[0];
                                  setSeatAssignEmployeeId(firstEmployee?.id ?? "");
                                  setSeatAssignEmail(firstEmployee?.email ?? "");
                                  setSeatAssignNote("");
                                }}
                              >
                                Assign
                              </Button>
                            )}
                            {seat.status === "Assigned" && (
                              <Button size="sm" variant="secondary" onClick={() => state.revokeHrSoftwareSeat(seat.id)}>
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </>
        )}

        {tab === "Requests" && viewAs === "Employee" && (
          <>
            <div className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  value={employeeRequestStatusFilter}
                  onChange={(event) => setEmployeeRequestStatusFilter((event.target.value as HrProvisionRequest["status"]) || "")}
                >
                  <option value="">All</option>
                  <option value="PendingManager">PendingManager</option>
                  <option value="PendingHR">PendingHR</option>
                  <option value="Fulfilled">Fulfilled</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex items-end gap-2 md:col-span-2 md:justify-end">
                <Button size="sm" variant="secondary" onClick={() => setRequestModal({ requestType: "Hardware" })}>
                  Request hardware
                </Button>
                <Button size="sm" onClick={() => setRequestModal({ requestType: "Software" })}>
                  Request software
                </Button>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Requested item</th>
                  <th>Status</th>
                  <th>Timeline</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {myRequests.filter((request) => !employeeRequestStatusFilter || request.status === employeeRequestStatusFilter).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-xs text-slate-500">
                      No requests found.
                    </td>
                  </tr>
                ) : (
                  myRequests
                    .filter((request) => !employeeRequestStatusFilter || request.status === employeeRequestStatusFilter)
                    .map((request) => (
                      <tr key={request.id}>
                        <td>{request.requestType}</td>
                        <td>
                          {request.requestType === "Hardware"
                            ? request.requestedAssetCategory ?? "-"
                            : productById.get(request.requestedSoftwareProductId ?? "")?.name ?? "-"}
                        </td>
                        <td>
                          <Badge className={requestStatusClass(request.status)}>{request.status}</Badge>
                        </td>
                        <td>{requestTimelineSummary(request)}</td>
                        <td>
                          {request.status === "PendingManager" ? (
                            <Button size="sm" variant="secondary" onClick={() => state.cancelHrProvisionRequest(request.id)}>
                              Cancel
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </>
        )}

        {tab === "Requests" && viewAs === "Manager" && (
          <>
            <section className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
              <div>
                <FieldLabel>Request type</FieldLabel>
                <select value={managerTypeFilter} onChange={(event) => setManagerTypeFilter((event.target.value as HrProvisionRequest["requestType"]) || "")}>
                  <option value="">All</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                </select>
              </div>
              <div>
                <FieldLabel>Priority</FieldLabel>
                <select value={managerPriorityFilter} onChange={(event) => setManagerPriorityFilter((event.target.value as HrProvisionRequest["priority"]) || "")}>
                  <option value="">All</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <FieldLabel>Employee</FieldLabel>
                <select value={managerEmployeeFilter} onChange={(event) => setManagerEmployeeFilter(event.target.value)}>
                  <option value="">All</option>
                  {managerTeam.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {displayEmployee(employee)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-end">
                <Button size="sm" variant="secondary" onClick={() => setManagerEmployeeFilter("")}>
                  Reset
                </Button>
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Justification</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {managerQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-xs text-slate-500">
                      No pending approvals for this manager.
                    </td>
                  </tr>
                ) : (
                  managerQueue.map((request) => (
                    <tr key={request.id}>
                      <td>{displayEmployee(employeeById.get(request.requesterEmployeeId) ?? { displayName: request.requesterEmployeeId, firstName: "", lastName: "" })}</td>
                      <td>{request.requestType}</td>
                      <td>{request.priority}</td>
                      <td className="max-w-[420px] truncate" title={request.justification}>
                        {request.justification}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => openDecisionModal(request.id, "manager", "approve")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openDecisionModal(request.id, "manager", "reject")}>
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

        {tab === "Requests" && viewAs === "HR" && (
          <>
            <section className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={hrRequestStatusFilter} onChange={(event) => setHrRequestStatusFilter((event.target.value as HrProvisionRequest["status"]) || "")}>
                  <option value="">All</option>
                  <option value="PendingManager">PendingManager</option>
                  <option value="PendingHR">PendingHR</option>
                  <option value="Fulfilled">Fulfilled</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <FieldLabel>Request type</FieldLabel>
                <select value={hrRequestTypeFilter} onChange={(event) => setHrRequestTypeFilter((event.target.value as HrProvisionRequest["requestType"]) || "")}>
                  <option value="">All</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                </select>
              </div>
              <div>
                <FieldLabel>Priority</FieldLabel>
                <select value={hrPriorityFilter} onChange={(event) => setHrPriorityFilter((event.target.value as HrProvisionRequest["priority"]) || "")}>
                  <option value="">All</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <FieldLabel>Requester</FieldLabel>
                <select value={hrRequesterFilter} onChange={(event) => setHrRequesterFilter(event.target.value)}>
                  <option value="">All</option>
                  {activeEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {displayEmployee(employee)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setHrRequestStatusFilter("");
                    setHrRequestTypeFilter("");
                    setHrPriorityFilter("");
                    setHrRequesterFilter("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Timeline</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hrRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-xs text-slate-500">
                      No requests found.
                    </td>
                  </tr>
                ) : (
                  hrRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{displayEmployee(employeeById.get(request.requesterEmployeeId) ?? { displayName: request.requesterEmployeeId, firstName: "", lastName: "" })}</td>
                      <td>{request.requestType}</td>
                      <td>
                        <Badge className={requestStatusClass(request.status)}>{request.status}</Badge>
                      </td>
                      <td>{requestTimelineSummary(request)}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {request.status === "PendingHR" && !request.hrApprovedAt ? (
                            <>
                              <Button size="sm" onClick={() => openDecisionModal(request.id, "hr", "approve")}>
                                HR approve
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => openDecisionModal(request.id, "hr", "reject")}>
                                HR reject
                              </Button>
                            </>
                          ) : null}
                          {request.status === "PendingHR" ? (
                            <Button size="sm" variant="secondary" onClick={() => openFulfillModal(request.id)}>
                              Fulfill
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </Card>

      {requestModal && (
        <ModalShell title={`Create ${requestModal.requestType} request`} onClose={() => setRequestModal(null)}>
          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
              Requester: <span className="font-semibold">{employeeActor ? displayEmployee(employeeActor) : "-"}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <FieldLabel>Priority</FieldLabel>
                <select value={requestPriority} onChange={(event) => setRequestPriority(event.target.value as HrProvisionRequest["priority"])}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              {requestModal.requestType === "Hardware" ? (
                <div>
                  <FieldLabel>Requested hardware category</FieldLabel>
                  <select value={requestAssetCategory} onChange={(event) => setRequestAssetCategory(event.target.value as HrAssetCategory)}>
                    {hardwareCategories.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <FieldLabel>Requested software product</FieldLabel>
                  <select value={requestSoftwareProductId} onChange={(event) => setRequestSoftwareProductId(event.target.value)}>
                    {hrSoftwareProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.vendor})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Justification</FieldLabel>
              <textarea
                className="min-h-[110px] w-full rounded-md border border-slate-300 p-2 text-xs"
                value={requestJustification}
                onChange={(event) => setRequestJustification(event.target.value)}
                placeholder="Explain why this hardware/software access is needed."
              />
              {pendingDuplicateExists ? (
                <p className="mt-1 text-xs text-amber-700">Warning: requester already has pending request(s) of this type.</p>
              ) : null}
              {requestError ? <p className="mt-1 text-xs text-rose-600">{requestError}</p> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setRequestModal(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitRequest}>
                Submit request
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {decisionModal && (
        <ModalShell
          title={`${decisionModal.role === "manager" ? "Manager" : "HR"} ${decisionModal.action === "approve" ? "approve" : "reject"} request`}
          onClose={() => setDecisionModal(null)}
        >
          <div className="space-y-3">
            <div>
              <FieldLabel>{decisionModal.action === "reject" ? "Comment (required)" : "Comment (optional)"}</FieldLabel>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-300 p-2 text-xs"
                value={decisionComment}
                onChange={(event) => setDecisionComment(event.target.value)}
              />
              {decisionError ? <p className="mt-1 text-xs text-rose-600">{decisionError}</p> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDecisionModal(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitDecision}>
                Confirm
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {selectedFulfillRequest && (
        <ModalShell title={`Fulfill request ${selectedFulfillRequest.id}`} onClose={() => setFulfillModal(null)}>
          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
              <p>
                Requester:{" "}
                <span className="font-semibold">
                  {displayEmployee(
                    employeeById.get(selectedFulfillRequest.requesterEmployeeId) ?? {
                      displayName: selectedFulfillRequest.requesterEmployeeId,
                      firstName: "",
                      lastName: "",
                    },
                  )}
                </span>
              </p>
              <p>
                Type: <span className="font-semibold">{selectedFulfillRequest.requestType}</span>
              </p>
            </div>

            {selectedFulfillRequest.requestType === "Hardware" ? (
              <>
                <div>
                  <FieldLabel>Fulfillment mode</FieldLabel>
                  <div className="flex gap-2">
                    <Button size="sm" variant={fulfillAssetMode === "existing" ? "primary" : "secondary"} onClick={() => setFulfillAssetMode("existing")}>
                      Existing asset
                    </Button>
                    <Button size="sm" variant={fulfillAssetMode === "create" ? "primary" : "secondary"} onClick={() => setFulfillAssetMode("create")}>
                      Create new asset
                    </Button>
                  </div>
                </div>
                {fulfillAssetMode === "existing" ? (
                  <div>
                    <FieldLabel>Available asset</FieldLabel>
                    <select value={fulfillAssetId} onChange={(event) => setFulfillAssetId(event.target.value)}>
                      {state.hrAssets
                        .filter((asset) => asset.status === "Available" || asset.status === "Returned")
                        .map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.name} ({asset.category})
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <FieldLabel>New asset name</FieldLabel>
                      <input value={fulfillNewAssetName} onChange={(event) => setFulfillNewAssetName(event.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Category</FieldLabel>
                      <select value={fulfillNewAssetCategory} onChange={(event) => setFulfillNewAssetCategory(event.target.value as HrAssetCategory)}>
                        {hardwareCategories.map((entry) => (
                          <option key={entry} value={entry}>
                            {entry}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <FieldLabel>Available seat</FieldLabel>
                  <select value={fulfillSoftwareSeatId} onChange={(event) => setFulfillSoftwareSeatId(event.target.value)}>
                    {hrSoftwareSeats
                      .filter((seat) => seat.status === "Available" || seat.status === "Revoked")
                      .map((seat) => (
                        <option key={seat.id} value={seat.id}>
                          {(productById.get(seat.softwareProductId)?.name ?? seat.softwareProductId) + ` (${seat.id})`}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Assigned email (required)</FieldLabel>
                  <input value={fulfillAssignedEmail} onChange={(event) => setFulfillAssignedEmail(event.target.value)} />
                </div>
              </>
            )}

            <div>
              <FieldLabel>Note (optional)</FieldLabel>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-slate-300 p-2 text-xs"
                value={fulfillNote}
                onChange={(event) => setFulfillNote(event.target.value)}
              />
              {fulfillError ? <p className="mt-1 text-xs text-rose-600">{fulfillError}</p> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setFulfillModal(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitFulfillment}>
                Fulfill
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {selectedSeatToAssign && (
        <ModalShell title={`Assign seat ${selectedSeatToAssign.id}`} onClose={() => setSeatAssignModal(null)}>
          <div className="space-y-3">
            <div>
              <FieldLabel>Employee</FieldLabel>
              <select
                value={seatAssignEmployeeId}
                onChange={(event) => {
                  const employee = employeeById.get(event.target.value);
                  setSeatAssignEmployeeId(event.target.value);
                  if (employee) setSeatAssignEmail(employee.email);
                }}
              >
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {displayEmployee(employee)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Assigned email</FieldLabel>
              <input value={seatAssignEmail} onChange={(event) => setSeatAssignEmail(event.target.value)} />
            </div>
            <div>
              <FieldLabel>Note (optional)</FieldLabel>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-slate-300 p-2 text-xs"
                value={seatAssignNote}
                onChange={(event) => setSeatAssignNote(event.target.value)}
              />
              {seatAssignError ? <p className="mt-1 text-xs text-rose-600">{seatAssignError}</p> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setSeatAssignModal(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitSeatAssignment}>
                Assign seat
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {assetHistoryId && (() => {
        const historyAsset = state.hrAssets.find((a) => a.id === assetHistoryId);
        const assignments = (state.hrAssetAssignments ?? [])
          .filter((a) => a.assetId === assetHistoryId)
          .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
        return (
          <ModalShell title={`Assignment History — ${historyAsset?.name ?? assetHistoryId}`} onClose={() => setAssetHistoryId(null)}>
            {assignments.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No prior assignments.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Assigned At</th>
                    <th>Returned At</th>
                    <th>Acceptance</th>
                    <th>Return Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => {
                    const emp = employeeById.get(assignment.employeeId);
                    return (
                      <tr key={assignment.id}>
                        <td>{emp ? displayEmployee(emp) : assignment.employeeId}</td>
                        <td>{formatDateTime(assignment.assignedAt)}</td>
                        <td>{formatDateTime(assignment.returnedAt)}</td>
                        <td>
                          <Badge className={assignment.acceptanceStatus === "Accepted" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                            {assignment.acceptanceStatus}
                          </Badge>
                        </td>
                        <td>{assignment.returnCondition ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </ModalShell>
        );
      })()}

      {returnConditionModal && (
        <ModalShell title="Device condition on return" onClose={() => setReturnConditionModal(null)}>
          <div className="space-y-3">
            <div>
              <FieldLabel>Condition</FieldLabel>
              <div className="flex flex-col gap-2">
                {(["Good", "Damaged", "Needs Replacement"] as const).map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="returnCondition"
                      checked={returnConditionChoice === option}
                      onChange={() => setReturnConditionChoice(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setReturnConditionModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const assetId = returnConditionModal;
                  state.returnHrAsset(assetId);
                  const assignment = (state.hrAssetAssignments ?? []).find((a) => a.assetId === assetId && a.returnedAt);
                  if (assignment) {
                    const updated = { ...assignment, returnCondition: returnConditionChoice };
                    const updatedAssignments = (state.hrAssetAssignments ?? []).map((a) => (a.id === assignment.id ? updated : a));
                    useAppStore.setState({ hrAssetAssignments: updatedAssignments });
                  }
                  setReturnConditionModal(null);
                }}
              >
                Confirm return
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {lostStolenModal && (() => {
        const lsAsset = state.hrAssets.find((a) => a.id === lostStolenModal.assetId);
        if (!lsAsset) return null;
        return (
          <ModalShell title={`Mark asset as ${lostStolenModal.status}`} onClose={() => setLostStolenModal(null)}>
            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                Asset: <span className="font-semibold">{lsAsset.name}</span> ({lsAsset.category})
              </div>
              <div>
                <FieldLabel>Incident note</FieldLabel>
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-slate-300 p-2 text-xs"
                  value={incidentNote}
                  onChange={(event) => setIncidentNote(event.target.value)}
                  placeholder={`Describe the ${lostStolenModal.status.toLowerCase()} incident...`}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setLostStolenModal(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const now = new Date().toISOString();
                    state.updateHrAsset({
                      ...lsAsset,
                      status: lostStolenModal.status,
                      notes: incidentNote.trim() || lsAsset.notes,
                      updatedAt: now,
                    });
                    setIncidentNote("");
                    setLostStolenModal(null);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </ModalShell>
        );
      })()}
    </div>
  );
}
