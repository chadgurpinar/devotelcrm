import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { HrCurrencyCode, HrExpenseStatus } from "../../store/types";
import { HrExpensesPageRoleBased } from "./HrExpensesPageRoleBased";

const currencyOptions: HrCurrencyCode[] = ["EUR", "USD", "GBP", "TRY"];
const categories = ["Travel", "Meal", "Taxi", "Hotel", "Office", "Training", "Other"];

function employeeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function HrExpensesPageLegacy() {
  const state = useAppStore();
  const [form, setForm] = useState({
    employeeId: state.hrEmployees.find((employee) => employee.active)?.id ?? "",
    category: "Travel",
    amount: "",
    currency: "EUR" as HrCurrencyCode,
    description: "",
    receiptUrl: "",
  });
  const [statusFilter, setStatusFilter] = useState<"" | HrExpenseStatus>("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [actionCommentById, setActionCommentById] = useState<Record<string, string>>({});

  const employeeById = useMemo(() => {
    const map = new Map(state.hrEmployees.map((employee) => [employee.id, employee]));
    return map;
  }, [state.hrEmployees]);

  const rows = useMemo(() => {
    let dataset = state.hrExpenses.slice();
    if (statusFilter) dataset = dataset.filter((row) => row.status === statusFilter);
    if (employeeFilter) dataset = dataset.filter((row) => row.employeeId === employeeFilter);
    return dataset.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [employeeFilter, state.hrExpenses, statusFilter]);

  function createExpense() {
    if (!form.employeeId || !form.amount || Number(form.amount) <= 0 || !form.description.trim()) return;
    state.createHrExpense({
      employeeId: form.employeeId,
      claimType: "Reimbursement",
      category: form.category,
      amount: Number(form.amount),
      currency: form.currency,
      description: form.description.trim(),
      receiptUrl: form.receiptUrl.trim() || undefined,
    });
    setForm((prev) => ({
      ...prev,
      amount: "",
      description: "",
      receiptUrl: "",
    }));
  }

  function applyAction(
    expenseId: string,
    action: "MANAGER_APPROVE" | "MANAGER_REJECT" | "FINANCE_APPROVE" | "FINANCE_REJECT" | "MARK_PAID",
  ) {
    state.applyHrExpenseAction(expenseId, action, actionCommentById[expenseId] ?? "");
    setActionCommentById((prev) => ({ ...prev, [expenseId]: "" }));
  }

  return (
    <div className="space-y-4">
      <Card title="Expense & Reimbursements">
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending manager</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrExpenses.filter((row) => row.status === "PendingManager").length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending finance</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrExpenses.filter((row) => row.status === "PendingFinance").length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Approved</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrExpenses.filter((row) => row.status === "Approved").length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Paid</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrExpenses.filter((row) => row.status === "Paid").length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Rejected</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrExpenses.filter((row) => row.status === "Rejected").length}</p>
          </div>
        </div>

        <section className="mb-3 rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Create expense</p>
          <div className="grid gap-2 md:grid-cols-6">
            <div>
              <FieldLabel>Employee</FieldLabel>
              <select value={form.employeeId} onChange={(event) => setForm((prev) => ({ ...prev, employeeId: event.target.value }))}>
                {state.hrEmployees
                  .filter((employee) => employee.active)
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employeeName(employee.firstName, employee.lastName)}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Amount</FieldLabel>
              <input type="number" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <select
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value as HrCurrencyCode }))}
              >
                {currencyOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <input
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Expense purpose"
              />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Receipt URL (optional)</FieldLabel>
              <input
                value={form.receiptUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, receiptUrl: event.target.value }))}
                placeholder="upload://expense/receipt.pdf"
              />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={createExpense} disabled={!form.employeeId || !form.amount || Number(form.amount) <= 0}>
                Submit expense
              </Button>
            </div>
          </div>
        </section>

        <div className="mb-2 grid gap-2 md:grid-cols-3">
          <div>
            <FieldLabel>Status filter</FieldLabel>
            <select value={statusFilter} onChange={(event) => setStatusFilter((event.target.value as HrExpenseStatus) || "")}>
              <option value="">All</option>
              <option value="PendingManager">PendingManager</option>
              <option value="PendingFinance">PendingFinance</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <FieldLabel>Employee filter</FieldLabel>
            <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
              <option value="">All</option>
              {state.hrEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employeeName(employee.firstName, employee.lastName)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Category</th>
                <th>Amount</th>
                <th>EUR</th>
                <th>Status</th>
                <th>Timeline</th>
                <th>Comment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const employee = employeeById.get(row.employeeId);
                const badgeClass =
                  row.status === "Paid"
                    ? "bg-emerald-100 text-emerald-700"
                    : row.status === "Rejected"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-blue-100 text-blue-700";
                return (
                  <tr key={row.id}>
                    <td>
                      <p className="font-semibold text-slate-700">
                        {employee ? employeeName(employee.firstName, employee.lastName) : row.employeeId}
                      </p>
                      <p className="text-[11px] text-slate-500">{row.description}</p>
                    </td>
                    <td>{row.category}</td>
                    <td>
                      {row.amount.toLocaleString()} {row.currency}
                    </td>
                    <td>{row.convertedAmountEUR.toLocaleString()} EUR</td>
                    <td>
                      <Badge className={badgeClass}>{row.status}</Badge>
                    </td>
                    <td className="text-xs">
                      <p>Manager: {row.managerApprovedAt ? new Date(row.managerApprovedAt).toLocaleString() : "-"}</p>
                      <p>Finance: {row.financeApprovedAt ? new Date(row.financeApprovedAt).toLocaleString() : "-"}</p>
                      <p>Paid: {row.paidAt ? new Date(row.paidAt).toLocaleString() : "-"}</p>
                    </td>
                    <td>
                      <input
                        value={actionCommentById[row.id] ?? ""}
                        onChange={(event) => setActionCommentById((prev) => ({ ...prev, [row.id]: event.target.value }))}
                        placeholder="Required for reject"
                      />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {row.status === "PendingManager" && (
                          <>
                            <Button size="sm" onClick={() => applyAction(row.id, "MANAGER_APPROVE")}>
                              Manager approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => applyAction(row.id, "MANAGER_REJECT")}>
                              Manager reject
                            </Button>
                          </>
                        )}
                        {row.status === "PendingFinance" && (
                          <>
                            <Button size="sm" onClick={() => applyAction(row.id, "FINANCE_APPROVE")}>
                              Finance approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => applyAction(row.id, "FINANCE_REJECT")}>
                              Finance reject
                            </Button>
                          </>
                        )}
                        {row.status === "Approved" && (
                          <Button size="sm" onClick={() => applyAction(row.id, "MARK_PAID")}>
                            Mark paid
                          </Button>
                        )}
                        {row.receiptUrl && (
                          <a className="text-[11px] font-semibold text-brand-700" href={row.receiptUrl}>
                            Receipt
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export { HrExpensesPageRoleBased as HrExpensesPage } from "./HrExpensesPageRoleBased";
