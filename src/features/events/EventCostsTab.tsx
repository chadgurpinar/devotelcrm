import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { StatCard } from "../../components/ui";
import type { EventCostCategory, EventCostLineItem } from "../../store/types";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const CATEGORIES: EventCostCategory[] = ["Sponsorship", "Ticket", "Flight", "Hotel", "DailyExpense", "Other"];
const CATEGORY_LABEL: Record<EventCostCategory, string> = {
  Sponsorship: "Sponsorship",
  Ticket: "Ticket",
  Flight: "Flight",
  Hotel: "Hotel",
  DailyExpense: "Daily Expense",
  Other: "Other",
};

interface FormState {
  category: EventCostCategory;
  description: string;
  amountEur: number;
  paidByUserId: string;
  receiptFileName: string;
}

const emptyForm: FormState = { category: "Other", description: "", amountEur: 0, paidByUserId: "", receiptFileName: "" };

export function EventCostsTab({ eventId }: { eventId: string }) {
  const state = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const lineItems = useMemo(
    () => state.eventCostLineItems
      .filter((item) => item.eventId === eventId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.eventCostLineItems, eventId],
  );

  const totalSpent = lineItems.reduce((sum, item) => sum + item.amountEur, 0);

  const evaluation = useMemo(
    () => state.eventEvaluations.find((ev) => ev.eventId === eventId) ?? null,
    [state.eventEvaluations, eventId],
  );

  const estimatedTotal = useMemo(() => {
    if (!evaluation || evaluation.attendDecision !== "Attend") return 0;
    const sponsorship = evaluation.selectedSponsorshipId
      ? (evaluation.sponsorshipOptions.find((o) => o.id === evaluation.selectedSponsorshipId)?.priceEur ?? 0)
      : 0;
    const tickets = evaluation.participationType === "Ticket"
      ? (evaluation.ticketPricePerPersonEur ?? 0) * evaluation.estimatedAttendeesCount
      : 0;
    const participation = evaluation.participationType === "Sponsor" ? sponsorship : tickets;
    const travel = evaluation.estimatedAttendeesCount * (
      evaluation.estimatedFlightPerPersonEur +
      evaluation.estimatedHotelPerPersonEur * evaluation.estimatedEventDays +
      evaluation.estimatedDailyExpensePerPersonEur * evaluation.estimatedEventDays
    );
    return participation + travel;
  }, [evaluation]);

  const delta = estimatedTotal > 0 ? totalSpent - estimatedTotal : 0;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: EventCostLineItem) {
    setEditingId(item.id);
    setForm({
      category: item.category,
      description: item.description,
      amountEur: item.amountEur,
      paidByUserId: item.paidByUserId ?? "",
      receiptFileName: item.receiptFileName ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.description.trim() || form.amountEur <= 0) return;
    if (editingId) {
      const existing = state.eventCostLineItems.find((i) => i.id === editingId);
      if (existing) {
        state.updateEventCostLineItem({
          ...existing,
          category: form.category,
          description: form.description.trim(),
          amountEur: form.amountEur,
          paidByUserId: form.paidByUserId || undefined,
          receiptFileName: form.receiptFileName || undefined,
        });
      }
    } else {
      state.addEventCostLineItem({
        eventId,
        category: form.category,
        description: form.description.trim(),
        amountEur: form.amountEur,
        paidByUserId: form.paidByUserId || undefined,
        receiptFileName: form.receiptFileName || undefined,
      });
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Spent" value={`${totalSpent.toLocaleString("en")} EUR`} size="xs" />
        <StatCard label="Line Items" value={lineItems.length} size="xs" />
        {evaluation ? (
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[10px] text-gray-500 mb-0.5">vs Estimate</p>
            <p className={`text-lg font-bold ${delta > 0 ? "text-rose-600" : delta < 0 ? "text-emerald-600" : "text-gray-700"}`}>
              {delta > 0 ? "+" : ""}{delta.toLocaleString("en")} EUR
            </p>
            <Link to={`/event-evaluation/${eventId}`} className="text-[10px] text-indigo-600 hover:underline inline-flex items-center gap-0.5 mt-0.5">
              <ExternalLink className="h-2.5 w-2.5" /> View evaluation
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[10px] text-gray-500 mb-0.5">Evaluation</p>
            <p className="text-sm text-gray-400">Not planned</p>
            <Link to={`/event-evaluation/${eventId}`} className="text-[10px] text-indigo-600 hover:underline inline-flex items-center gap-0.5 mt-0.5">
              <ExternalLink className="h-2.5 w-2.5" /> Create evaluation
            </Link>
          </div>
        )}
      </div>

      {/* Comparison card */}
      {evaluation && estimatedTotal > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Estimated vs Actual</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Estimated</p>
              <p className="font-semibold text-gray-800">{estimatedTotal.toLocaleString("en")} EUR</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Actual</p>
              <p className="font-semibold text-gray-800">{totalSpent.toLocaleString("en")} EUR</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Delta</p>
              <p className={`font-semibold ${delta > 0 ? "text-rose-600" : delta < 0 ? "text-emerald-600" : "text-gray-700"}`}>
                {delta > 0 ? "Over by " : delta < 0 ? "Under by " : ""}{Math.abs(delta).toLocaleString("en")} EUR
              </p>
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${delta > 0 ? "bg-rose-400" : "bg-emerald-400"}`}
              style={{ width: `${Math.min(100, estimatedTotal > 0 ? (totalSpent / estimatedTotal) * 100 : 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      <div className="flex justify-end">
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">{editingId ? "Edit Expense" : "New Expense"}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
              <select className={inputCls} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as EventCostCategory }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Amount (EUR)</label>
              <input type="number" className={inputCls} value={form.amountEur || ""} onChange={(e) => setForm((f) => ({ ...f, amountEur: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Paid By</label>
              <select className={inputCls} value={form.paidByUserId} onChange={(e) => setForm((f) => ({ ...f, paidByUserId: e.target.value }))}>
                <option value="">— Select —</option>
                {state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Receipt file</label>
              <input className={inputCls} placeholder="receipt.pdf" value={form.receiptFileName} onChange={(e) => setForm((f) => ({ ...f, receiptFileName: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
            <input className={inputCls} placeholder="Describe the expense..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={!form.description.trim() || form.amountEur <= 0} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">
              {editingId ? "Update" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Expense table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Category</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Description</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Amount</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Paid By</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Receipt</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Date</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-3 py-2 text-xs">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {CATEGORY_LABEL[item.category]}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-gray-700">{item.description}</td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900">{item.amountEur.toLocaleString("en")} EUR</td>
                <td className="px-3 py-2 text-xs text-gray-600">{item.paidByUserId ? getUserName(state, item.paidByUserId) : "—"}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{item.receiptFileName || "—"}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(item)} className="rounded p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => state.deleteEventCostLineItem(item.id)} className="rounded p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {lineItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">
                  No expenses recorded yet. Click "Add Expense" to start tracking costs.
                </td>
              </tr>
            )}
          </tbody>
          {lineItems.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-3 py-2.5 text-xs font-semibold text-gray-700" colSpan={2}>Total</td>
                <td className="px-3 py-2.5 text-sm font-bold text-gray-900">{totalSpent.toLocaleString("en")} EUR</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
