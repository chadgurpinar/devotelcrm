import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import type { FinExpenseRecurrence, FinInternalExpense, FinInternalExpenseCategory, OurEntity } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { InternalExpenseFormModal } from "./components/InternalExpenseFormModal";
import { InternalExpensesTable } from "./components/InternalExpensesTable";

const inputCls =
  "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function FinanceInternalExpensesPage() {
  const expenses = useAppStore((s) => s.finInternalExpenses);
  const upsert = useAppStore((s) => s.upsertFinInternalExpense);
  const remove = useAppStore((s) => s.deleteFinInternalExpense);

  const [entity, setEntity] = useState<OurEntity | "All">("All");
  const [category, setCategory] = useState<FinInternalExpenseCategory | "All">("All");
  const [recurrence, setRecurrence] = useState<FinExpenseRecurrence | "All">("All");
  const [activeOnly, setActiveOnly] = useState(false);
  const [editTarget, setEditTarget] = useState<FinInternalExpense | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (entity !== "All" && e.entityId !== entity) return false;
      if (category !== "All" && e.category !== category) return false;
      if (recurrence !== "All" && e.recurrence !== recurrence) return false;
      if (activeOnly && !e.active) return false;
      return true;
    });
  }, [expenses, entity, category, recurrence, activeOnly]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 pb-10">
      <UiPageHeader
        title="Finance — Internal Expenses"
        subtitle="Configure recurring or one-off internal cash outflows. Drives the Cashflow Planning view."
        actions={
          <Button
            size="sm"
            type="button"
            onClick={() => {
              setEditTarget(null);
              setOpen(true);
            }}
          >
            <span className="inline-flex items-center gap-1">
              <Plus size={14} /> Add expense
            </span>
          </Button>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Entity</label>
            <select className={inputCls} value={entity} onChange={(e) => setEntity(e.target.value as OurEntity | "All")}>
              <option value="All">All</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="TR">TR</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Category</label>
            <select
              className={inputCls}
              value={category}
              onChange={(e) => setCategory(e.target.value as FinInternalExpenseCategory | "All")}
            >
              <option value="All">All</option>
              {(["Salary", "Rent", "Tax", "Card", "Loan", "Software", "Other"] as FinInternalExpenseCategory[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Recurrence</label>
            <select
              className={inputCls}
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as FinExpenseRecurrence | "All")}
            >
              <option value="All">All</option>
              <option value="Monthly">Monthly</option>
              <option value="OneOff">One-off</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
              Active only
            </label>
          </div>
        </div>
      </section>

      <InternalExpensesTable
        rows={filtered}
        onEdit={(row) => {
          setEditTarget(row);
          setOpen(true);
        }}
        onDelete={(id) => {
          if (confirm("Delete this internal expense?")) remove(id);
        }}
        onToggleActive={(row) => {
          upsert({ ...row, active: !row.active });
        }}
      />

      <InternalExpenseFormModal
        open={open}
        initial={editTarget}
        onClose={() => {
          setOpen(false);
          setEditTarget(null);
        }}
      />
    </div>
  );
}
