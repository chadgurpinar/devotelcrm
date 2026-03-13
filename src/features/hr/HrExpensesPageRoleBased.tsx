import { ReactNode, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { convertCurrency } from "../../store/hrUtils";
import { HrCurrencyCode, HrEmployee, HrExpense, HrExpenseActionType } from "../../store/types";

const currencyOptions: HrCurrencyCode[] = ["EUR", "USD", "GBP", "TRY"];
const categoryOptions = ["Travel", "Meal", "Taxi", "Hotel", "Equipment", "Training", "Other", "Advance"];

type ExpenseRole = "Employee" | "Manager" | "Finance";
type EmployeeRangeFilter = "30d" | "90d" | "all";
type FinanceQueue = "PendingFinance" | "Approved" | "Paid" | "Rejected" | "Cancelled";
type ClaimModalState = { mode: "create" | "edit"; claimType: HrExpense["claimType"]; expenseId?: string } | null;
type ExpenseDrawerState = { expenseId: string } | null;

type ClaimFormState = {
  employeeId: string;
  claimType: HrExpense["claimType"];
  category: string;
  amount: string;
  currency: HrCurrencyCode;
  description: string;
  receiptUrl: string;
  documentUrl: string;
  documentFileName: string;
  documentMimeType: string;
  documentSizeBytes: string;
  advanceType: "" | NonNullable<HrExpense["advanceType"]>;
  travelStartDate: string;
  travelEndDate: string;
  advancePurpose: string;
  paymentMethod: "" | "CompanyCard" | "Personal";
  costCenterTag: string;
};

type ExpenseMutationPayload = Omit<
  HrExpense,
  | "id"
  | "convertedAmountEUR"
  | "status"
  | "managerApprovedAt"
  | "financeApprovedAt"
  | "paidAt"
  | "rejectedAt"
  | "cancelledAt"
  | "reconciledAt"
  | "reconciledWithClaimIds"
  | "createdAt"
  | "updatedAt"
>;

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

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadgeClass(status: HrExpense["status"]): string {
  if (status === "Paid") return "bg-emerald-100 text-emerald-700";
  if (status === "Rejected") return "bg-rose-100 text-rose-700";
  if (status === "Cancelled") return "bg-slate-200 text-slate-700";
  if (status === "Approved") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function claimTypeLabel(claimType: HrExpense["claimType"]): string {
  return claimType === "Advance" ? "Advance" : "Reimbursement";
}

function toDateInputValue(value?: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function withinRange(value: string, from: string, to: string): boolean {
  const day = value.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function monthKey(value?: string): string {
  if (!value) return "";
  return value.slice(0, 7);
}

function defaultClaimForm(employeeId: string, claimType: HrExpense["claimType"]): ClaimFormState {
  return {
    employeeId,
    claimType,
    category: "Travel",
    amount: "",
    currency: "EUR",
    description: "",
    receiptUrl: "",
    documentUrl: "",
    documentFileName: "",
    documentMimeType: "",
    documentSizeBytes: "",
    advanceType: claimType === "Advance" ? "TravelAdvance" : "",
    travelStartDate: "",
    travelEndDate: "",
    advancePurpose: "",
    paymentMethod: "",
    costCenterTag: "",
  };
}

function buildPayloadFromForm(form: ClaimFormState): ExpenseMutationPayload | null {
  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const attachmentUrl = form.documentUrl.trim();
  const parsedSize = Number(form.documentSizeBytes);
  const attachmentMeta = attachmentUrl
    ? {
        url: attachmentUrl,
        fileName: form.documentFileName.trim() || undefined,
        mimeType: form.documentMimeType.trim() || undefined,
        sizeBytes: Number.isFinite(parsedSize) && parsedSize > 0 ? Math.round(parsedSize) : undefined,
      }
    : undefined;
  const claimType = form.claimType;
  return {
    employeeId: form.employeeId,
    claimType,
    advanceType: claimType === "Advance" ? (form.advanceType || undefined) : undefined,
    category: form.category.trim() || (claimType === "Advance" ? "Advance" : "Other"),
    amount,
    currency: form.currency,
    description: form.description.trim(),
    receiptUrl: claimType === "Reimbursement" ? form.receiptUrl.trim() || attachmentUrl || undefined : undefined,
    attachmentMeta,
    travelStartDate: claimType === "Advance" ? form.travelStartDate || undefined : undefined,
    travelEndDate: claimType === "Advance" ? form.travelEndDate || undefined : undefined,
    advancePurpose: claimType === "Advance" ? form.advancePurpose.trim() || undefined : undefined,
    paymentMethod: form.paymentMethod || undefined,
    costCenterTag: form.costCenterTag.trim() || undefined,
  };
}

function ModalShell(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={props.onClose}>
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
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

export function HrExpensesPageRoleBased() {
  const state = useAppStore();
  const [viewAs, setViewAs] = useState<ExpenseRole>("Employee");
  const [employeeActorId, setEmployeeActorId] = useState("");
  const [managerActorId, setManagerActorId] = useState("");
  const [financeActorUserId, setFinanceActorUserId] = useState("");

  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<"" | HrExpense["status"]>("");
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<"" | HrExpense["claimType"]>("");
  const [employeeRangeFilter, setEmployeeRangeFilter] = useState<EmployeeRangeFilter>("90d");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [managerEmployeeFilter, setManagerEmployeeFilter] = useState("");
  const [managerCategoryFilter, setManagerCategoryFilter] = useState("");
  const [managerTypeFilter, setManagerTypeFilter] = useState<"" | HrExpense["claimType"]>("");

  const [financeQueue, setFinanceQueue] = useState<FinanceQueue>("PendingFinance");
  const [financeDateFrom, setFinanceDateFrom] = useState("");
  const [financeDateTo, setFinanceDateTo] = useState("");
  const [financeEmployeeFilter, setFinanceEmployeeFilter] = useState("");
  const [financeDepartmentFilter, setFinanceDepartmentFilter] = useState("");
  const [financeCountryFilter, setFinanceCountryFilter] = useState("");
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState("");
  const [financeTypeFilter, setFinanceTypeFilter] = useState<"" | HrExpense["claimType"]>("");
  const [financeStatusFilter, setFinanceStatusFilter] = useState<"" | HrExpense["status"]>("");
  const [financeCurrencyFilter, setFinanceCurrencyFilter] = useState<"" | HrExpense["currency"]>("");

  const [claimModal, setClaimModal] = useState<ClaimModalState>(null);
  const [claimForm, setClaimForm] = useState<ClaimFormState>(defaultClaimForm("", "Reimbursement"));
  const [claimFormError, setClaimFormError] = useState("");

  const [drawer, setDrawer] = useState<ExpenseDrawerState>(null);
  const [drawerComment, setDrawerComment] = useState("");
  const [drawerActionComment, setDrawerActionComment] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ExpenseMutationPayload | null>(null);

  const employeeById = useMemo(() => new Map(state.hrEmployees.map((employee) => [employee.id, employee])), [state.hrEmployees]);
  const departmentById = useMemo(() => new Map(state.hrDepartments.map((department) => [department.id, department.name])), [state.hrDepartments]);
  const userById = useMemo(() => new Map(state.users.map((user) => [user.id, user])), [state.users]);
  const activeEmployees = useMemo(() => state.hrEmployees.filter((employee) => employee.active), [state.hrEmployees]);

  const directReportsByManagerId = useMemo(() => {
    const map = new Map<string, HrEmployee[]>();
    state.hrEmployees.forEach((employee) => {
      if (!employee.active || !employee.managerId) return;
      const rows = map.get(employee.managerId) ?? [];
      rows.push(employee);
      map.set(employee.managerId, rows);
    });
    map.forEach((rows) => rows.sort((left, right) => displayEmployee(left).localeCompare(displayEmployee(right))));
    return map;
  }, [state.hrEmployees]);

  const managerActors = useMemo(
    () =>
      state.hrEmployees
        .filter((employee) => employee.active && directReportsByManagerId.has(employee.id))
        .sort((left, right) => displayEmployee(left).localeCompare(displayEmployee(right))),
    [directReportsByManagerId, state.hrEmployees],
  );

  useEffect(() => {
    if (!employeeActorId && activeEmployees.length > 0) {
      setEmployeeActorId(activeEmployees[0].id);
    }
    if (!managerActorId && managerActors.length > 0) {
      setManagerActorId(managerActors[0].id);
    }
    if (!financeActorUserId) {
      setFinanceActorUserId(state.activeUserId || state.users[0]?.id || "");
    }
  }, [activeEmployees, employeeActorId, financeActorUserId, managerActorId, managerActors, state.activeUserId, state.users]);

  const managerTeam = useMemo(() => directReportsByManagerId.get(managerActorId) ?? [], [directReportsByManagerId, managerActorId]);
  const managerTeamIds = useMemo(() => new Set(managerTeam.map((employee) => employee.id)), [managerTeam]);

  const selectedExpense = useMemo(
    () => (drawer ? state.hrExpenses.find((expense) => expense.id === drawer.expenseId) : undefined),
    [drawer, state.hrExpenses],
  );

  const selectedExpenseTimeline = useMemo(
    () =>
      selectedExpense
        ? state.hrAuditLogs
            .filter((row) => row.parentType === "Expense" && row.parentId === selectedExpense.id)
            .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
        : [],
    [selectedExpense, state.hrAuditLogs],
  );

  const myClaims = useMemo(
    () => state.hrExpenses.filter((expense) => expense.employeeId === employeeActorId),
    [employeeActorId, state.hrExpenses],
  );

  const employeeRows = useMemo(() => {
    let rows = myClaims.slice();
    if (employeeStatusFilter) rows = rows.filter((row) => row.status === employeeStatusFilter);
    if (employeeTypeFilter) rows = rows.filter((row) => row.claimType === employeeTypeFilter);
    if (employeeRangeFilter !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (employeeRangeFilter === "30d" ? 30 : 90));
      const cutoffIso = cutoff.toISOString();
      rows = rows.filter((row) => row.createdAt >= cutoffIso);
    }
    if (employeeSearch.trim()) {
      const query = employeeSearch.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.description.toLowerCase().includes(query) ||
          row.category.toLowerCase().includes(query) ||
          (row.advancePurpose ?? "").toLowerCase().includes(query),
      );
    }
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [employeeRangeFilter, employeeSearch, employeeStatusFilter, employeeTypeFilter, myClaims]);

  const managerRows = useMemo(() => {
    let rows = state.hrExpenses.filter((expense) => expense.status === "PendingManager" && managerTeamIds.has(expense.employeeId));
    if (managerEmployeeFilter) rows = rows.filter((row) => row.employeeId === managerEmployeeFilter);
    if (managerCategoryFilter) rows = rows.filter((row) => row.category === managerCategoryFilter);
    if (managerTypeFilter) rows = rows.filter((row) => row.claimType === managerTypeFilter);
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [managerCategoryFilter, managerEmployeeFilter, managerTeamIds, managerTypeFilter, state.hrExpenses]);

  const financeFilterBaseRows = useMemo(() => {
    let rows = state.hrExpenses.slice();
    if (financeDateFrom || financeDateTo) {
      rows = rows.filter((row) => withinRange(row.createdAt, financeDateFrom, financeDateTo));
    }
    if (financeEmployeeFilter) rows = rows.filter((row) => row.employeeId === financeEmployeeFilter);
    if (financeDepartmentFilter) {
      rows = rows.filter((row) => employeeById.get(row.employeeId)?.departmentId === financeDepartmentFilter);
    }
    if (financeCountryFilter) {
      rows = rows.filter((row) => (employeeById.get(row.employeeId)?.countryOfEmployment ?? "") === financeCountryFilter);
    }
    if (financeCategoryFilter) rows = rows.filter((row) => row.category === financeCategoryFilter);
    if (financeTypeFilter) rows = rows.filter((row) => row.claimType === financeTypeFilter);
    if (financeCurrencyFilter) rows = rows.filter((row) => row.currency === financeCurrencyFilter);
    return rows;
  }, [
    employeeById,
    financeCategoryFilter,
    financeCountryFilter,
    financeCurrencyFilter,
    financeDateFrom,
    financeDateTo,
    financeDepartmentFilter,
    financeEmployeeFilter,
    financeTypeFilter,
    state.hrExpenses,
  ]);

  const financeRows = useMemo(() => {
    let rows = financeFilterBaseRows.filter((row) => row.status === financeQueue);
    if (financeStatusFilter) rows = rows.filter((row) => row.status === financeStatusFilter);
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [financeFilterBaseRows, financeQueue, financeStatusFilter]);

  const managerPendingAmountEUR = useMemo(
    () => managerRows.reduce((sum, row) => sum + row.convertedAmountEUR, 0),
    [managerRows],
  );

  const managerTopCategories = useMemo(() => {
    const nowMonth = new Date().toISOString().slice(0, 7);
    const map = new Map<string, number>();
    state.hrExpenses
      .filter((row) => managerTeamIds.has(row.employeeId) && monthKey(row.createdAt) === nowMonth)
      .forEach((row) => {
        map.set(row.category, (map.get(row.category) ?? 0) + 1);
      });
    return Array.from(map.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3);
  }, [managerTeamIds, state.hrExpenses]);

  const employeePendingCount = useMemo(
    () => myClaims.filter((row) => row.status === "PendingManager" || row.status === "PendingFinance").length,
    [myClaims],
  );

  const employeeApprovedUnpaidCount = useMemo(
    () => myClaims.filter((row) => row.status === "Approved").length,
    [myClaims],
  );

  const employeePaidThisMonthEUR = useMemo(() => {
    const nowMonth = new Date().toISOString().slice(0, 7);
    return myClaims
      .filter((row) => row.status === "Paid" && monthKey(row.paidAt) === nowMonth)
      .reduce((sum, row) => sum + row.convertedAmountEUR, 0);
  }, [myClaims]);

  const employeeAdvancesOutstanding = useMemo(
    () =>
      myClaims
        .filter((row) => row.claimType === "Advance" && row.status === "Paid" && !row.reconciledAt)
        .reduce((sum, row) => sum + row.convertedAmountEUR, 0),
    [myClaims],
  );

  const financeMonthlyReimbursementsEUR = useMemo(() => {
    const nowMonth = new Date().toISOString().slice(0, 7);
    return financeFilterBaseRows
      .filter((row) => row.claimType === "Reimbursement" && row.status === "Paid" && monthKey(row.paidAt) === nowMonth)
      .reduce((sum, row) => sum + row.convertedAmountEUR, 0);
  }, [financeFilterBaseRows]);

  const financeMonthlyAdvancesPaidEUR = useMemo(() => {
    const nowMonth = new Date().toISOString().slice(0, 7);
    return financeFilterBaseRows
      .filter((row) => row.claimType === "Advance" && row.status === "Paid" && monthKey(row.paidAt) === nowMonth)
      .reduce((sum, row) => sum + row.convertedAmountEUR, 0);
  }, [financeFilterBaseRows]);

  const financeApprovedUnpaidEUR = useMemo(
    () => financeFilterBaseRows.filter((row) => row.status === "Approved").reduce((sum, row) => sum + row.convertedAmountEUR, 0),
    [financeFilterBaseRows],
  );

  const financeAdvancesUnreconciledEUR = useMemo(
    () =>
      financeFilterBaseRows
        .filter((row) => row.claimType === "Advance" && row.status === "Paid" && !row.reconciledAt)
        .reduce((sum, row) => sum + row.convertedAmountEUR, 0),
    [financeFilterBaseRows],
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    financeFilterBaseRows.forEach((row) => {
      map.set(row.category, (map.get(row.category) ?? 0) + row.convertedAmountEUR);
    });
    return Array.from(map.entries()).sort((left, right) => right[1] - left[1]);
  }, [financeFilterBaseRows]);

  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    financeFilterBaseRows.forEach((row) => {
      const employee = employeeById.get(row.employeeId);
      const departmentLabel = employee ? departmentById.get(employee.departmentId) ?? employee.departmentId : "Unknown";
      map.set(departmentLabel, (map.get(departmentLabel) ?? 0) + row.convertedAmountEUR);
    });
    return Array.from(map.entries()).sort((left, right) => right[1] - left[1]);
  }, [departmentById, employeeById, financeFilterBaseRows]);

  const employeeCountries = useMemo(
    () => Array.from(new Set(state.hrEmployees.map((employee) => employee.countryOfEmployment))).sort((left, right) => left.localeCompare(right)),
    [state.hrEmployees],
  );

  const modalAmount = Number(claimForm.amount);
  const modalAmountValid = Number.isFinite(modalAmount) && modalAmount > 0;
  const modalNow = new Date().toISOString();
  const convertedPreview =
    modalAmountValid && claimForm.currency !== "EUR"
      ? convertCurrency(modalAmount, claimForm.currency, "EUR", state.hrFxRates, modalNow)
      : modalAmountValid
        ? modalAmount
        : undefined;
  const missingFx = modalAmountValid && claimForm.currency !== "EUR" && convertedPreview === undefined;

  const claimFormValid =
    Boolean(claimForm.employeeId) &&
    modalAmountValid &&
    claimForm.description.trim().length > 0 &&
    (claimForm.claimType === "Advance" ? Boolean(claimForm.advanceType) : claimForm.category.trim().length > 0) &&
    Boolean(claimForm.paymentMethod) &&
    !missingFx;

  function auditActorLabel(userId: string): string {
    const user = userById.get(userId);
    if (user) return user.name;
    const employee = employeeById.get(userId);
    if (employee) return displayEmployee(employee);
    return userId;
  }

  function openCreateClaimModal(claimType: HrExpense["claimType"]) {
    const fallbackEmployeeId = employeeActorId || activeEmployees[0]?.id || "";
    setClaimForm(defaultClaimForm(fallbackEmployeeId, claimType));
    setClaimFormError("");
    setClaimModal({ mode: "create", claimType });
  }

  function openEditClaimModal(expense: HrExpense) {
    setClaimFormError("");
    setClaimForm({
      employeeId: expense.employeeId,
      claimType: expense.claimType,
      category: expense.category,
      amount: String(expense.amount),
      currency: expense.currency,
      description: expense.description,
      receiptUrl: expense.receiptUrl ?? "",
      documentUrl: expense.attachmentMeta?.url ?? "",
      documentFileName: expense.attachmentMeta?.fileName ?? "",
      documentMimeType: expense.attachmentMeta?.mimeType ?? "",
      documentSizeBytes: expense.attachmentMeta?.sizeBytes ? String(expense.attachmentMeta.sizeBytes) : "",
      advanceType: expense.advanceType ?? "",
      travelStartDate: toDateInputValue(expense.travelStartDate),
      travelEndDate: toDateInputValue(expense.travelEndDate),
      advancePurpose: expense.advancePurpose ?? "",
      paymentMethod: expense.paymentMethod ?? "",
      costCenterTag: expense.costCenterTag ?? "",
    });
    setClaimModal({ mode: "edit", claimType: expense.claimType, expenseId: expense.id });
  }

  function submitClaimModal(forceSubmit = false) {
    if (!claimModal) return;
    const payload = buildPayloadFromForm(claimForm);
    if (!payload) {
      setClaimFormError("Please fill required fields with valid values.");
      return;
    }
    if (missingFx) {
      setClaimFormError("FX rate missing for selected currency. Add FX rate first.");
      return;
    }
    if (claimModal.mode === "create") {
      if (!forceSubmit) {
        const isDuplicate = state.hrExpenses.some(
          (e) =>
            e.employeeId === payload.employeeId &&
            Math.abs(e.amount - payload.amount) < 0.01 &&
            e.category === payload.category &&
            Math.abs(new Date(e.createdAt).getTime() - Date.now()) < 2 * 86400000,
        );
        if (isDuplicate) {
          setPendingPayload(payload);
          setDuplicateWarning(true);
          return;
        }
      }
      const result = state.createHrExpense(payload);
      if (!result.ok) {
        setClaimFormError(result.message ?? "Unable to submit claim.");
        return;
      }
      setPageMessage("Claim submitted.");
      setClaimModal(null);
      setDuplicateWarning(false);
      setPendingPayload(null);
      return;
    }
    const { employeeId: _employeeId, ...updatePayload } = payload;
    const result = state.updateHrExpenseDraft(claimModal.expenseId as string, updatePayload);
    if (!result.ok) {
      setClaimFormError(result.message ?? "Unable to update claim.");
      return;
    }
    setPageMessage("Claim updated.");
    setClaimModal(null);
  }

  function confirmDuplicateSubmit() {
    if (!pendingPayload) return;
    const result = state.createHrExpense(pendingPayload);
    if (!result.ok) {
      setClaimFormError(result.message ?? "Unable to submit claim.");
    } else {
      setPageMessage("Claim submitted.");
      setClaimModal(null);
    }
    setDuplicateWarning(false);
    setPendingPayload(null);
  }

  function applyWorkflowAction(
    expenseId: string,
    actionType: Extract<HrExpenseActionType, "MANAGER_APPROVE" | "MANAGER_REJECT" | "FINANCE_APPROVE" | "FINANCE_REJECT" | "MARK_PAID">,
    comment?: string,
  ) {
    const result = state.applyHrExpenseAction(expenseId, actionType, comment);
    if (!result.ok) {
      setPageMessage(result.message ?? "Action failed.");
      return false;
    }
    setPageMessage("Action completed.");
    return true;
  }

  function cancelClaim(expenseId: string, comment?: string) {
    const result = state.cancelHrExpense(expenseId, comment);
    if (!result.ok) {
      setPageMessage(result.message ?? "Cancellation failed.");
      return;
    }
    setPageMessage("Claim cancelled.");
  }

  function submitDrawerComment() {
    if (!selectedExpense) return;
    const result = state.addHrExpenseComment(selectedExpense.id, drawerComment);
    if (!result.ok) {
      setPageMessage(result.message ?? "Comment failed.");
      return;
    }
    setDrawerComment("");
    setPageMessage("Comment added to timeline.");
  }

  return (
    <div className="space-y-4">
      <Card title="Expense & Reimbursements">
        <div className="mb-3 rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">View as</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["Employee", "Manager", "Finance"] as const).map((role) => (
              <Button key={role} size="sm" variant={viewAs === role ? "primary" : "secondary"} onClick={() => setViewAs(role)}>
                {role}
              </Button>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {viewAs === "Employee" && (
              <div>
                <FieldLabel>Actor employee</FieldLabel>
                <select value={employeeActorId} onChange={(event) => setEmployeeActorId(event.target.value)}>
                  {activeEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {displayEmployee(employee)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {viewAs === "Manager" && (
              <div>
                <FieldLabel>Actor manager</FieldLabel>
                <select value={managerActorId} onChange={(event) => setManagerActorId(event.target.value)}>
                  {managerActors.length === 0 ? <option value="">No managers</option> : null}
                  {managerActors.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {displayEmployee(employee)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {viewAs === "Finance" && (
              <div>
                <FieldLabel>Actor finance user</FieldLabel>
                <select value={financeActorUserId} onChange={(event) => setFinanceActorUserId(event.target.value)}>
                  {state.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {viewAs === "Employee" && (
          <>
            <div className="mb-3 grid gap-2 md:grid-cols-4">
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">My pending claims</p>
                <p className="text-lg font-semibold text-slate-800">{employeePendingCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">My approved (unpaid)</p>
                <p className="text-lg font-semibold text-slate-800">{employeeApprovedUnpaidCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">My paid this month (EUR)</p>
                <p className="text-lg font-semibold text-slate-800">{formatMoney(employeePaidThisMonthEUR)}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">My advances outstanding</p>
                <p className="text-lg font-semibold text-slate-800">{formatMoney(employeeAdvancesOutstanding)}</p>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => openCreateClaimModal("Reimbursement")}>
                Submit reimbursement
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openCreateClaimModal("Advance")}>
                Request advance
              </Button>
            </div>

            <section className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={employeeStatusFilter} onChange={(event) => setEmployeeStatusFilter((event.target.value as HrExpense["status"]) || "")}>
                  <option value="">All</option>
                  <option value="PendingManager">PendingManager</option>
                  <option value="PendingFinance">PendingFinance</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <FieldLabel>Claim type</FieldLabel>
                <select value={employeeTypeFilter} onChange={(event) => setEmployeeTypeFilter((event.target.value as HrExpense["claimType"]) || "")}>
                  <option value="">All</option>
                  <option value="Reimbursement">Reimbursement</option>
                  <option value="Advance">Advance</option>
                </select>
              </div>
              <div>
                <FieldLabel>Date range</FieldLabel>
                <select value={employeeRangeFilter} onChange={(event) => setEmployeeRangeFilter(event.target.value as EmployeeRangeFilter)}>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div>
                <FieldLabel>Search</FieldLabel>
                <input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Description or category" />
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>EUR</th>
                  <th>Status</th>
                  <th>Paid with</th>
                  <th>Last update</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {employeeRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-xs text-slate-500">
                      No claims found.
                    </td>
                  </tr>
                ) : (
                  employeeRows.map((row) => (
                    <tr key={row.id} className="cursor-pointer" onClick={() => setDrawer({ expenseId: row.id })}>
                      <td>{row.createdAt.slice(0, 10)}</td>
                      <td>{claimTypeLabel(row.claimType)}</td>
                      <td>{row.category}</td>
                      <td>
                        {formatMoney(row.amount)} {row.currency}
                      </td>
                      <td>{formatMoney(row.convertedAmountEUR)} EUR</td>
                      <td>
                        <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                      </td>
                      <td>
                        {row.paymentMethod ? (
                          <Badge className={row.paymentMethod === "CompanyCard" ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"}>
                            {row.paymentMethod === "CompanyCard" ? "Company" : "Personal"}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{formatDateTime(row.updatedAt)}</td>
                      <td>
                        {row.receiptUrl || row.attachmentMeta?.url ? (
                          <a
                            href={row.receiptUrl ?? row.attachmentMeta?.url}
                            className="text-[11px] font-semibold text-brand-700"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Open
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

        {viewAs === "Manager" && (
          <>
            <div className="mb-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending approvals</p>
                <p className="text-lg font-semibold text-slate-800">{managerRows.length}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Total pending (EUR)</p>
                <p className="text-lg font-semibold text-slate-800">{formatMoney(managerPendingAmountEUR)}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Top categories (month)</p>
                <p className="text-xs font-semibold text-slate-700">
                  {managerTopCategories.map(([category, count]) => `${category} (${count})`).join(", ") || "-"}
                </p>
              </div>
            </div>

            <section className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
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
              <div>
                <FieldLabel>Category</FieldLabel>
                <select value={managerCategoryFilter} onChange={(event) => setManagerCategoryFilter(event.target.value)}>
                  <option value="">All</option>
                  {categoryOptions.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Claim type</FieldLabel>
                <select value={managerTypeFilter} onChange={(event) => setManagerTypeFilter((event.target.value as HrExpense["claimType"]) || "")}>
                  <option value="">All</option>
                  <option value="Reimbursement">Reimbursement</option>
                  <option value="Advance">Advance</option>
                </select>
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>EUR</th>
                  <th>Paid with</th>
                  <th>Receipt</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {managerRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-xs text-slate-500">
                      No pending manager approvals.
                    </td>
                  </tr>
                ) : (
                  managerRows.map((row) => {
                    const employee = employeeById.get(row.employeeId);
                    return (
                      <tr key={row.id} className="cursor-pointer" onClick={() => setDrawer({ expenseId: row.id })}>
                        <td>{employee ? displayEmployee(employee) : row.employeeId}</td>
                        <td>{row.createdAt.slice(0, 10)}</td>
                        <td>{claimTypeLabel(row.claimType)}</td>
                        <td>{row.category}</td>
                        <td>
                          {formatMoney(row.amount)} {row.currency}
                        </td>
                        <td>{formatMoney(row.convertedAmountEUR)} EUR</td>
                        <td>
                          {row.paymentMethod ? (
                            <Badge className={row.paymentMethod === "CompanyCard" ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"}>
                              {row.paymentMethod === "CompanyCard" ? "Company" : "Personal"}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {row.receiptUrl || row.attachmentMeta?.url ? (
                            <a
                              href={row.receiptUrl ?? row.attachmentMeta?.url}
                              className="text-[11px] font-semibold text-brand-700"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Open
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
                            <Button size="sm" onClick={() => applyWorkflowAction(row.id, "MANAGER_APPROVE")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => applyWorkflowAction(row.id, "MANAGER_REJECT")}>
                              Reject
                            </Button>
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

        {viewAs === "Finance" && (
          <>
            <div className="mb-3 grid gap-2 md:grid-cols-4">
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Monthly reimbursements (EUR)</p>
                <p className="text-lg font-semibold text-slate-800">{formatMoney(financeMonthlyReimbursementsEUR)}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Monthly advances paid (EUR)</p>
                <p className="text-lg font-semibold text-slate-800">{formatMoney(financeMonthlyAdvancesPaidEUR)}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Approved but unpaid (EUR)</p>
                <p className="text-lg font-semibold text-slate-800">{formatMoney(financeApprovedUnpaidEUR)}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Advances paid (unreconciled)</p>
                <p className="text-lg font-semibold text-slate-800">{formatMoney(financeAdvancesUnreconciledEUR)}</p>
              </div>
            </div>

            <section className="mb-3 rounded-md border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {(["PendingFinance", "Approved", "Paid", "Rejected", "Cancelled"] as FinanceQueue[]).map((queue) => (
                  <Button key={queue} size="sm" variant={financeQueue === queue ? "primary" : "secondary"} onClick={() => setFinanceQueue(queue)}>
                    {queue}
                  </Button>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <div>
                  <FieldLabel>Date from</FieldLabel>
                  <input type="date" value={financeDateFrom} onChange={(event) => setFinanceDateFrom(event.target.value)} />
                </div>
                <div>
                  <FieldLabel>Date to</FieldLabel>
                  <input type="date" value={financeDateTo} onChange={(event) => setFinanceDateTo(event.target.value)} />
                </div>
                <div>
                  <FieldLabel>Employee</FieldLabel>
                  <select value={financeEmployeeFilter} onChange={(event) => setFinanceEmployeeFilter(event.target.value)}>
                    <option value="">All</option>
                    {state.hrEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {displayEmployee(employee)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Department</FieldLabel>
                  <select value={financeDepartmentFilter} onChange={(event) => setFinanceDepartmentFilter(event.target.value)}>
                    <option value="">All</option>
                    {state.hrDepartments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <select value={financeCountryFilter} onChange={(event) => setFinanceCountryFilter(event.target.value)}>
                    <option value="">All</option>
                    {employeeCountries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <select value={financeCategoryFilter} onChange={(event) => setFinanceCategoryFilter(event.target.value)}>
                    <option value="">All</option>
                    {categoryOptions.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Claim type</FieldLabel>
                  <select value={financeTypeFilter} onChange={(event) => setFinanceTypeFilter((event.target.value as HrExpense["claimType"]) || "")}>
                    <option value="">All</option>
                    <option value="Reimbursement">Reimbursement</option>
                    <option value="Advance">Advance</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <select value={financeStatusFilter} onChange={(event) => setFinanceStatusFilter((event.target.value as HrExpense["status"]) || "")}>
                    <option value="">Queue default</option>
                    <option value="PendingManager">PendingManager</option>
                    <option value="PendingFinance">PendingFinance</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Currency</FieldLabel>
                  <select value={financeCurrencyFilter} onChange={(event) => setFinanceCurrencyFilter((event.target.value as HrExpense["currency"]) || "")}>
                    <option value="">All</option>
                    {currencyOptions.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button size="sm" variant="secondary" disabled>
                    Export CSV (later)
                  </Button>
                </div>
              </div>
            </section>

            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <section className="rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Breakdown by category (EUR)</p>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-500">No data for current filters.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-slate-700">
                    {categoryBreakdown.slice(0, 8).map(([category, total]) => (
                      <li key={category} className="flex items-center justify-between gap-2">
                        <span>{category}</span>
                        <span className="font-semibold">{formatMoney(total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Breakdown by department (EUR)</p>
                {departmentBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-500">No data for current filters.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-slate-700">
                    {departmentBreakdown.slice(0, 8).map(([department, total]) => (
                      <li key={department} className="flex items-center justify-between gap-2">
                        <span>{department}</span>
                        <span className="font-semibold">{formatMoney(total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>EUR</th>
                  <th>Status</th>
                  <th>Paid with</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {financeRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-xs text-slate-500">
                      No claims in selected queue.
                    </td>
                  </tr>
                ) : (
                  financeRows.map((row) => {
                    const employee = employeeById.get(row.employeeId);
                    return (
                      <tr key={row.id} className="cursor-pointer" onClick={() => setDrawer({ expenseId: row.id })}>
                        <td>{employee ? displayEmployee(employee) : row.employeeId}</td>
                        <td>{row.createdAt.slice(0, 10)}</td>
                        <td>{claimTypeLabel(row.claimType)}</td>
                        <td>{row.category}</td>
                        <td>
                          {formatMoney(row.amount)} {row.currency}
                        </td>
                        <td>{formatMoney(row.convertedAmountEUR)} EUR</td>
                        <td>
                          <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                        </td>
                        <td>
                          {row.paymentMethod ? (
                            <Badge className={row.paymentMethod === "CompanyCard" ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"}>
                              {row.paymentMethod === "CompanyCard" ? "Company" : "Personal"}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
                            {row.status === "PendingFinance" && (
                              <>
                                <Button size="sm" onClick={() => applyWorkflowAction(row.id, "FINANCE_APPROVE")}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => applyWorkflowAction(row.id, "FINANCE_REJECT")}>
                                  Reject
                                </Button>
                              </>
                            )}
                            {row.status === "Approved" && (
                              <Button size="sm" onClick={() => applyWorkflowAction(row.id, "MARK_PAID")}>
                                Mark paid
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

        {pageMessage ? <p className="mt-2 text-xs text-slate-600">{pageMessage}</p> : null}
      </Card>

      {claimModal && (
        <ModalShell
          title={
            claimModal.mode === "create"
              ? claimModal.claimType === "Advance"
                ? "Request advance"
                : "Submit reimbursement"
              : "Edit claim"
          }
          onClose={() => setClaimModal(null)}
        >
          <div className="grid gap-2 md:grid-cols-4">
            <div>
              <FieldLabel>Employee</FieldLabel>
              <select
                value={claimForm.employeeId}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, employeeId: event.target.value }))}
                disabled={claimModal.mode === "edit"}
              >
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {displayEmployee(employee)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Claim type</FieldLabel>
              <select
                value={claimForm.claimType}
                onChange={(event) => {
                  const nextType = event.target.value as HrExpense["claimType"];
                  setClaimForm((prev) => ({
                    ...defaultClaimForm(prev.employeeId, nextType),
                    amount: prev.amount,
                    currency: prev.currency,
                    description: prev.description,
                  }));
                }}
                disabled={claimModal.mode === "edit"}
              >
                <option value="Reimbursement">Reimbursement</option>
                <option value="Advance">Advance</option>
              </select>
            </div>
            <div>
              <FieldLabel>Amount</FieldLabel>
              <input type="number" min="0" value={claimForm.amount} onChange={(event) => setClaimForm((prev) => ({ ...prev, amount: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <select value={claimForm.currency} onChange={(event) => setClaimForm((prev) => ({ ...prev, currency: event.target.value as HrCurrencyCode }))}>
                {currencyOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Category</FieldLabel>
              <select value={claimForm.category} onChange={(event) => setClaimForm((prev) => ({ ...prev, category: event.target.value }))}>
                {categoryOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Paid with *</FieldLabel>
              <select
                value={claimForm.paymentMethod}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, paymentMethod: event.target.value as ClaimFormState["paymentMethod"] }))}
              >
                <option value="">Select…</option>
                <option value="CompanyCard">Company Card</option>
                <option value="Personal">Personal (reimbursable)</option>
              </select>
            </div>

            <div>
              <FieldLabel>Cost Center / Project</FieldLabel>
              <input
                value={claimForm.costCenterTag}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, costCenterTag: event.target.value }))}
                placeholder="e.g. PROJ-123"
              />
            </div>

            {claimForm.claimType === "Advance" && (
              <div>
                <FieldLabel>Advance type</FieldLabel>
                <select
                  value={claimForm.advanceType}
                  onChange={(event) => setClaimForm((prev) => ({ ...prev, advanceType: event.target.value as ClaimFormState["advanceType"] }))}
                >
                  <option value="TravelAdvance">Travel advance</option>
                  <option value="PerDiem">Per diem</option>
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <input value={claimForm.description} onChange={(event) => setClaimForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>

            {claimForm.claimType === "Reimbursement" ? (
              <div className="md:col-span-2">
                <FieldLabel>Receipt URL</FieldLabel>
                <input
                  value={claimForm.receiptUrl}
                  onChange={(event) => {
                    const value = event.target.value;
                    setClaimForm((prev) => ({ ...prev, receiptUrl: value, documentUrl: prev.documentUrl || value }));
                  }}
                  placeholder="upload://expense/receipt.pdf"
                />
              </div>
            ) : (
              <div className="md:col-span-2">
                <FieldLabel>Supporting document URL (optional)</FieldLabel>
                <input
                  value={claimForm.documentUrl}
                  onChange={(event) => setClaimForm((prev) => ({ ...prev, documentUrl: event.target.value }))}
                  placeholder="upload://advance/supporting.pdf"
                />
              </div>
            )}

            <div>
              <FieldLabel>Attachment file name (optional)</FieldLabel>
              <input value={claimForm.documentFileName} onChange={(event) => setClaimForm((prev) => ({ ...prev, documentFileName: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>MIME type (optional)</FieldLabel>
              <input value={claimForm.documentMimeType} onChange={(event) => setClaimForm((prev) => ({ ...prev, documentMimeType: event.target.value }))} placeholder="application/pdf" />
            </div>
            <div>
              <FieldLabel>Attachment size bytes (optional)</FieldLabel>
              <input
                type="number"
                min="0"
                value={claimForm.documentSizeBytes}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, documentSizeBytes: event.target.value }))}
              />
            </div>

            {claimForm.claimType === "Advance" && (
              <>
                <div>
                  <FieldLabel>Travel start date (optional)</FieldLabel>
                  <input type="date" value={claimForm.travelStartDate} onChange={(event) => setClaimForm((prev) => ({ ...prev, travelStartDate: event.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Travel end date (optional)</FieldLabel>
                  <input type="date" value={claimForm.travelEndDate} onChange={(event) => setClaimForm((prev) => ({ ...prev, travelEndDate: event.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Advance purpose (optional)</FieldLabel>
                  <input value={claimForm.advancePurpose} onChange={(event) => setClaimForm((prev) => ({ ...prev, advancePurpose: event.target.value }))} />
                </div>
              </>
            )}
          </div>

          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
            <p>
              EUR preview:{" "}
              <span className="font-semibold">
                {modalAmountValid ? (missingFx ? "Missing FX rate" : `${formatMoney(convertedPreview ?? modalAmount)} EUR`) : "Enter amount"}
              </span>
            </p>
            {missingFx ? <p className="mt-1 text-rose-600">No FX rate found for {claimForm.currency} to EUR. Add FX rate in HR settings first.</p> : null}
          </div>

          {claimFormError ? <p className="mt-2 text-xs text-rose-600">{claimFormError}</p> : null}

          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setClaimModal(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => submitClaimModal()} disabled={!claimFormValid}>
              {claimModal.mode === "create" ? "Submit" : "Save changes"}
            </Button>
          </div>
        </ModalShell>
      )}

      {duplicateWarning && (
        <ModalShell title="Possible duplicate claim" onClose={() => { setDuplicateWarning(false); setPendingPayload(null); }}>
          <p className="mb-3 text-sm text-slate-700">
            A similar expense (same employee, amount, and category) was submitted in the last 48 hours. Are you sure you want to submit this claim?
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setDuplicateWarning(false); setPendingPayload(null); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmDuplicateSubmit}>
              Submit anyway
            </Button>
          </div>
        </ModalShell>
      )}

      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex bg-slate-900/30" onClick={() => setDrawer(null)}>
          <div className="ml-auto h-full w-full max-w-3xl overflow-y-auto bg-slate-50 p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <Card
              title={`Claim ${selectedExpense.id}`}
              actions={
                <Button size="sm" variant="secondary" onClick={() => setDrawer(null)}>
                  Close
                </Button>
              }
            >
              <div className="mb-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-md border border-slate-200 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Employee</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {(() => {
                      const employee = employeeById.get(selectedExpense.employeeId);
                      return employee ? displayEmployee(employee) : selectedExpense.employeeId;
                    })()}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Type</p>
                  <p className="text-xs font-semibold text-slate-700">{claimTypeLabel(selectedExpense.claimType)}</p>
                </div>
                <div className="rounded-md border border-slate-200 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Status</p>
                  <Badge className={statusBadgeClass(selectedExpense.status)}>{selectedExpense.status}</Badge>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <p className="text-xs text-slate-700">{selectedExpense.category}</p>
                </div>
                <div>
                  <FieldLabel>Amount</FieldLabel>
                  <p className="text-xs text-slate-700">
                    {formatMoney(selectedExpense.amount)} {selectedExpense.currency} ({formatMoney(selectedExpense.convertedAmountEUR)} EUR)
                  </p>
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Description</FieldLabel>
                  <p className="text-xs text-slate-700">{selectedExpense.description}</p>
                </div>
                {selectedExpense.claimType === "Advance" && (
                  <>
                    <div>
                      <FieldLabel>Advance type</FieldLabel>
                      <p className="text-xs text-slate-700">{selectedExpense.advanceType ?? "-"}</p>
                    </div>
                    <div>
                      <FieldLabel>Travel dates</FieldLabel>
                      <p className="text-xs text-slate-700">
                        {selectedExpense.travelStartDate ?? "-"} → {selectedExpense.travelEndDate ?? "-"}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <FieldLabel>Payment method</FieldLabel>
                  <p className="text-xs text-slate-700">
                    {selectedExpense.paymentMethod
                      ? selectedExpense.paymentMethod === "CompanyCard"
                        ? "Company Card"
                        : "Personal (reimbursable)"
                      : "-"}
                  </p>
                </div>
                {selectedExpense.costCenterTag && (
                  <div>
                    <FieldLabel>Cost Center / Project</FieldLabel>
                    <p className="text-xs text-slate-700">{selectedExpense.costCenterTag}</p>
                  </div>
                )}
                <div>
                  <FieldLabel>Receipt / document</FieldLabel>
                  {selectedExpense.receiptUrl || selectedExpense.attachmentMeta?.url ? (
                    <a href={selectedExpense.receiptUrl ?? selectedExpense.attachmentMeta?.url} className="text-xs font-semibold text-brand-700">
                      Open attachment
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500">No attachment</p>
                  )}
                </div>
                <div>
                  <FieldLabel>Last update</FieldLabel>
                  <p className="text-xs text-slate-700">{formatDateTime(selectedExpense.updatedAt)}</p>
                </div>
              </div>
            </Card>

            <Card className="mt-4" title="Timeline">
              {selectedExpenseTimeline.length === 0 ? (
                <p className="text-xs text-slate-500">No audit entries.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-700">
                  {selectedExpenseTimeline.map((entry) => (
                    <li key={entry.id} className="rounded-md border border-slate-200 bg-white p-2">
                      <p className="font-semibold text-slate-800">{entry.actionType}</p>
                      <p>
                        {formatDateTime(entry.timestamp)} · {auditActorLabel(entry.performedByUserId)}
                      </p>
                      {entry.comment ? <p className="text-slate-600">{entry.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <input value={drawerComment} onChange={(event) => setDrawerComment(event.target.value)} placeholder="Add timeline comment" />
                <Button size="sm" onClick={submitDrawerComment} disabled={!drawerComment.trim()}>
                  Add comment
                </Button>
              </div>
            </Card>

            <Card className="mt-4" title="Actions">
              {viewAs === "Employee" && selectedExpense.employeeId === employeeActorId && selectedExpense.status === "PendingManager" ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEditClaimModal(selectedExpense)}>
                    Edit claim
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => cancelClaim(selectedExpense.id, drawerActionComment || undefined)}>
                    Cancel claim
                  </Button>
                </div>
              ) : null}

              {viewAs === "Manager" && selectedExpense.status === "PendingManager" && managerTeamIds.has(selectedExpense.employeeId) ? (
                <div className="space-y-2">
                  <input value={drawerActionComment} onChange={(event) => setDrawerActionComment(event.target.value)} placeholder="Optional comment" />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => applyWorkflowAction(selectedExpense.id, "MANAGER_APPROVE", drawerActionComment || undefined)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => applyWorkflowAction(selectedExpense.id, "MANAGER_REJECT", drawerActionComment || undefined)}>
                      Reject
                    </Button>
                  </div>
                </div>
              ) : null}

              {viewAs === "Finance" ? (
                <div className="space-y-2">
                  {(selectedExpense.status === "PendingFinance" || selectedExpense.status === "Approved") && (
                    <input value={drawerActionComment} onChange={(event) => setDrawerActionComment(event.target.value)} placeholder="Optional comment" />
                  )}
                  <div className="flex flex-wrap gap-2">
                    {selectedExpense.status === "PendingFinance" && (
                      <>
                        <Button size="sm" onClick={() => applyWorkflowAction(selectedExpense.id, "FINANCE_APPROVE", drawerActionComment || undefined)}>
                          Finance approve
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => applyWorkflowAction(selectedExpense.id, "FINANCE_REJECT", drawerActionComment || undefined)}>
                          Finance reject
                        </Button>
                      </>
                    )}
                    {selectedExpense.status === "Approved" && (
                      <Button size="sm" onClick={() => applyWorkflowAction(selectedExpense.id, "MARK_PAID", drawerActionComment || undefined)}>
                        Mark paid
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}

              {((viewAs === "Employee" && !(selectedExpense.employeeId === employeeActorId && selectedExpense.status === "PendingManager")) ||
                (viewAs === "Manager" && !(selectedExpense.status === "PendingManager" && managerTeamIds.has(selectedExpense.employeeId))) ||
                (viewAs === "Finance" && !(selectedExpense.status === "PendingFinance" || selectedExpense.status === "Approved"))) && (
                <p className="text-xs text-slate-500">No available actions for current role/state.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
