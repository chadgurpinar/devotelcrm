import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, ChevronDown, ChevronRight, FileText, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import type {
  FinanceCreditCard,
  FinanceCreditCardExpenseCategory,
  FinanceCreditCardStatement,
  FinanceCreditCardStatementCategory,
  FinanceCurrencyCode,
  OurEntity,
} from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";

// ─── Local helpers ───────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<FinanceCurrencyCode, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  TRY: "₺",
  CHF: "CHF ",
  AED: "AED ",
};

const FX_TO_EUR: Record<FinanceCurrencyCode, number> = {
  EUR: 1,
  GBP: 1.18,
  USD: 0.92,
  TRY: 0.028,
  CHF: 1.05,
  AED: 0.25,
};

const ENTITY_FLAGS: Record<OurEntity, string> = {
  UK: "🇬🇧",
  USA: "🇺🇸",
  TR: "🇹🇷",
};

const ALL_CATEGORIES: readonly FinanceCreditCardExpenseCategory[] = [
  "Software",
  "Advertising",
  "Travel",
  "Office",
  "Subscription",
  "Utilities",
  "Meals",
  "Hardware",
  "Other",
] as const;

const CATEGORY_COLORS: Record<FinanceCreditCardExpenseCategory, string> = {
  Software: "#6366f1",
  Advertising: "#f59e0b",
  Travel: "#3b82f6",
  Office: "#10b981",
  Subscription: "#8b5cf6",
  Utilities: "#06b6d4",
  Meals: "#f97316",
  Hardware: "#64748b",
  Other: "#9ca3af",
};

const inputCls =
  "w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none";

function fmtEur(amount: number): string {
  return `€${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtOriginal(amount: number, currency: FinanceCurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function approxEur(amount: number, currency: FinanceCurrencyCode): number {
  const rate = FX_TO_EUR[currency] ?? 1;
  return Math.round(amount * rate);
}

function formatLongDate(ymd: string): string {
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function formatStatementMonth(month: string): string {
  // expects "YYYY-MM"
  const m = /^(\d{4})-(\d{2})/.exec(month);
  if (!m) return month;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1, 12, 0, 0));
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

// ─── Status badge ────────────────────────────────────────────────────

function StatementStatusBadge({ value }: { value: FinanceCreditCardStatement["status"] }) {
  const styles: Record<FinanceCreditCardStatement["status"], string> = {
    Unpaid: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    Paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    PartiallyPaid: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Overdue: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[value]}`}>{value}</span>;
}

// ─── Mark as Paid modal ──────────────────────────────────────────────

function MarkAsPaidModal({
  open,
  onClose,
  statement,
}: {
  open: boolean;
  onClose: () => void;
  statement: FinanceCreditCardStatement | null;
}) {
  const updateStatement = useAppStore((s) => s.updateFinanceCreditCardStatement);
  const today = new Date().toISOString().slice(0, 10);

  const [paidDate, setPaidDate] = useState(today);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidEur, setPaidEur] = useState<number>(0);
  const [eurOverridden, setEurOverridden] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !statement) return;
    setPaidDate(today);
    setPaidAmount(statement.totalAmountOriginal);
    setPaidEur(statement.totalAmountEur);
    setEurOverridden(false);
    setNotes(statement.notes ?? "");
  }, [open, statement, today]);

  useEffect(() => {
    if (eurOverridden || !statement) return;
    setPaidEur(approxEur(paidAmount, statement.currency));
  }, [paidAmount, statement, eurOverridden]);

  if (!open || !statement) return null;

  const submit = () => {
    if (paidAmount <= 0) return;
    updateStatement({
      ...statement,
      status: "Paid",
      paidDate,
      paidAmountOriginal: Math.round(paidAmount * 100) / 100,
      paidAmountEur: Math.round(paidEur * 100) / 100,
      notes: notes.trim() || statement.notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Mark statement as paid</h3>
        <p className="mt-1 text-xs text-gray-500">{formatStatementMonth(statement.statementMonth)} · total {fmtOriginal(statement.totalAmountOriginal, statement.currency)}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-700">
            Paid date
            <input type="date" className={inputCls} value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Paid amount ({statement.currency})
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={Number.isFinite(paidAmount) ? paidAmount : 0}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
            />
          </label>
          <label className="col-span-2 text-xs font-semibold text-gray-700">
            EUR equivalent {!eurOverridden && <span className="text-gray-400">(auto)</span>}
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={Number.isFinite(paidEur) ? paidEur : 0}
              onChange={(e) => {
                setEurOverridden(true);
                setPaidEur(Number(e.target.value));
              }}
            />
          </label>
          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Notes <span className="text-gray-400">(optional)</span>
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={paidAmount <= 0}>
            Mark paid
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Statement modal ──────────────────────────────────────────

interface CategoryDraft {
  key: string;
  category: FinanceCreditCardExpenseCategory;
  amountOriginal: number;
  description: string;
}

function ImportStatementModal({
  open,
  onClose,
  card,
}: {
  open: boolean;
  onClose: () => void;
  card: FinanceCreditCard;
}) {
  const addStatement = useAppStore((s) => s.addFinanceCreditCardStatement);
  const addProjection = useAppStore((s) => s.addFinanceProjection);

  const today = new Date().toISOString().slice(0, 10);
  const todayMonth = today.slice(0, 7);

  const [statementMonth, setStatementMonth] = useState(todayMonth);
  const [currency, setCurrency] = useState<FinanceCurrencyCode>(card.currency);
  const [dueDate, setDueDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<CategoryDraft[]>([
    { key: "r1", category: "Software", amountOriginal: 0, description: "" },
  ]);

  useEffect(() => {
    if (!open) return;
    setStatementMonth(todayMonth);
    setCurrency(card.currency);
    setDueDate(today);
    setNotes("");
    setRows([{ key: "r1", category: "Software", amountOriginal: 0, description: "" }]);
  }, [open, card.currency, today, todayMonth]);

  const totalOriginal = rows.reduce((sum, r) => sum + (Number.isFinite(r.amountOriginal) ? r.amountOriginal : 0), 0);
  const totalEur = approxEur(totalOriginal, currency);

  const updateRow = (idx: number, patch: Partial<CategoryDraft>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  if (!open) return null;

  const submit = () => {
    if (totalOriginal <= 0) return;
    if (!/^\d{4}-\d{2}$/.test(statementMonth)) return;

    const categories: FinanceCreditCardStatementCategory[] = rows
      .filter((r) => r.amountOriginal > 0)
      .map((r) => ({
        category: r.category,
        amountOriginal: Math.round(r.amountOriginal * 100) / 100,
        amountEur: approxEur(r.amountOriginal, currency),
        description: r.description.trim() || undefined,
      }));

    addStatement({
      cardId: card.id,
      statementMonth,
      currency,
      dueDate,
      totalAmountOriginal: Math.round(totalOriginal * 100) / 100,
      totalAmountEur: totalEur,
      categories,
      status: "Unpaid",
      notes: notes.trim() || undefined,
    });

    addProjection({
      entityId: card.entityId,
      direction: "Outflow",
      label: `Credit card payment — ${card.cardName} ${statementMonth}`,
      dueDate,
      currency: card.currency,
      amountOriginal: Math.round(totalOriginal * 100) / 100,
      amountEur: totalEur,
      category: "CreditCard",
      confidence: "Confirmed",
      status: "Pending",
      linkedCreditCardId: card.id,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Import statement</h3>
        <p className="mt-1 text-xs text-gray-500">
          Saves the statement and creates a matching <span className="font-semibold">CreditCard</span> projection due on the same date.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-700">
            Statement month (YYYY-MM)
            <input
              className={inputCls}
              value={statementMonth}
              onChange={(e) => setStatementMonth(e.target.value)}
              placeholder="2026-04"
            />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Due date
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Currency
            <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as FinanceCurrencyCode)}>
              {(["EUR", "USD", "GBP", "TRY", "CHF", "AED"] as FinanceCurrencyCode[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Notes <span className="text-gray-400">(optional)</span>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">Categories</h4>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  { key: `r${prev.length + 1}-${Date.now().toString(36)}`, category: "Other", amountOriginal: 0, description: "" },
                ])
              }
            >
              <span className="inline-flex items-center gap-1">
                <Plus size={12} /> Add row
              </span>
            </Button>
          </div>
          <div className="p-2">
            {rows.map((r, idx) => (
              <div key={r.key} className="mb-2 grid grid-cols-12 gap-2">
                <select
                  className={`${inputCls} col-span-3`}
                  value={r.category}
                  onChange={(e) => updateRow(idx, { category: e.target.value as FinanceCreditCardExpenseCategory })}
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  className={`${inputCls} col-span-2 text-right tabular-nums`}
                  value={Number.isFinite(r.amountOriginal) ? r.amountOriginal : 0}
                  onChange={(e) => updateRow(idx, { amountOriginal: Number(e.target.value) })}
                />
                <span className="col-span-2 self-center text-right text-xs tabular-nums text-gray-500">
                  ≈ {fmtEur(approxEur(r.amountOriginal, currency))}
                </span>
                <input
                  className={`${inputCls} col-span-4`}
                  placeholder="Description (optional)"
                  value={r.description}
                  onChange={(e) => updateRow(idx, { description: e.target.value })}
                />
                <button
                  type="button"
                  className="col-span-1 inline-flex items-center justify-center rounded text-rose-600 hover:bg-rose-50"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove row"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 px-3 py-2 text-right text-xs text-gray-700">
            Total: <span className="font-semibold">{fmtOriginal(totalOriginal, currency)}</span>
            <span className="mx-2 text-gray-300">·</span>
            EUR (auto): <span className="font-semibold">{fmtEur(totalEur)}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={totalOriginal <= 0 || !/^\d{4}-\d{2}$/.test(statementMonth)}>
            Save statement
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Statement card (collapsible) ────────────────────────────────────

function StatementCard({
  statement,
  onMarkPaid,
}: {
  statement: FinanceCreditCardStatement;
  onMarkPaid: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sortedCategories = useMemo(
    () => statement.categories.slice().sort((a, b) => b.amountOriginal - a.amountOriginal),
    [statement.categories],
  );

  const total = statement.totalAmountOriginal || 1;
  const chartData = sortedCategories.map((c) => ({
    name: c.category,
    value: Math.max(0, c.amountEur),
    amountEur: c.amountEur,
    color: CATEGORY_COLORS[c.category],
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <div>
            <p className="text-sm font-semibold text-gray-900">{formatStatementMonth(statement.statementMonth)}</p>
            <p className="text-[11px] text-gray-500">
              Total {fmtOriginal(statement.totalAmountOriginal, statement.currency)} (≈ {fmtEur(statement.totalAmountEur)}) · Due {formatLongDate(statement.dueDate)}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <StatementStatusBadge value={statement.status} />
          {statement.status !== "Paid" && (
            <Button size="sm" type="button" onClick={onMarkPaid}>
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-4">
          {/* Donut chart + custom legend */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-h-[240px]">
              {chartData.length === 0 ? (
                <p className="text-sm text-gray-500">No category data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {chartData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [fmtEur(value), name]}
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="circle"
                      formatter={(label: string) => {
                        const item = chartData.find((d) => d.name === label);
                        return `${label} — ${fmtEur(item?.amountEur ?? 0)}`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category breakdown table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Category</th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Original</th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">%</th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map((c, idx) => (
                    <tr key={`${c.category}-${idx}`} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[c.category] }} />
                          {c.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs tabular-nums text-gray-800 text-right">{fmtOriginal(c.amountOriginal, statement.currency)}</td>
                      <td className="px-3 py-2 text-xs font-medium tabular-nums text-gray-900 text-right">{fmtEur(c.amountEur)}</td>
                      <td className="px-3 py-2 text-xs tabular-nums text-gray-600 text-right">
                        {((c.amountOriginal / total) * 100).toFixed(0)}%
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{c.description ?? "—"}</td>
                    </tr>
                  ))}
                  {sortedCategories.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-xs text-gray-500">
                        No categories.
                      </td>
                    </tr>
                  )}
                </tbody>
                {sortedCategories.length > 0 && (
                  <tfoot className="bg-gray-50/80">
                    <tr>
                      <td className="px-3 py-2 text-[11px] font-bold uppercase text-gray-700">TOTAL</td>
                      <td className="px-3 py-2 text-xs font-bold tabular-nums text-gray-800 text-right">{fmtOriginal(statement.totalAmountOriginal, statement.currency)}</td>
                      <td className="px-3 py-2 text-xs font-bold tabular-nums text-gray-900 text-right">{fmtEur(statement.totalAmountEur)}</td>
                      <td className="px-3 py-2 text-xs font-bold tabular-nums text-gray-600 text-right">100%</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {statement.status === "Paid" && statement.paidDate && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2 text-xs text-emerald-800">
              Paid on <span className="font-semibold">{formatLongDate(statement.paidDate)}</span> —{" "}
              {fmtOriginal(statement.paidAmountOriginal ?? 0, statement.currency)} (≈ {fmtEur(statement.paidAmountEur ?? 0)})
            </div>
          )}

          {statement.notes && (
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-2 text-xs text-gray-700">
              <span className="font-semibold">Notes:</span> {statement.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export function FinanceCreditCardDetailPage() {
  const navigate = useNavigate();
  const { cardId } = useParams<{ cardId: string }>();
  const card = useAppStore((s) => s.financeCreditCards.find((c) => c.id === cardId));
  const allStatements = useAppStore((s) => s.financeCreditCardStatements);

  const [importOpen, setImportOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<FinanceCreditCardStatement | null>(null);

  const cardStatements = useMemo(
    () =>
      allStatements
        .filter((s) => s.cardId === (cardId ?? ""))
        .slice()
        .sort((a, b) => b.statementMonth.localeCompare(a.statementMonth)),
    [allStatements, cardId],
  );

  if (!card) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Credit card not found.</p>
          <Button className="mt-4" type="button" variant="secondary" onClick={() => navigate("/finance/credit-cards")}>
            <span className="inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back to Credit Cards
            </span>
          </Button>
        </div>
      </div>
    );
  }

  const balance = card.currentBalanceOriginal ?? 0;
  const limit = card.creditLimitOriginal;
  const utilisation = limit && limit > 0 ? balance / limit : null;
  const utilisationColor =
    utilisation === null
      ? ""
      : utilisation < 0.5
      ? "bg-emerald-500"
      : utilisation < 0.8
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <Link to="/finance/credit-cards" className="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline">
          <ArrowLeft size={12} /> Credit Cards
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-700">{card.cardName}</span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <UiPageHeader
          title={card.cardName}
          subtitle={`${ENTITY_FLAGS[card.entityId]} ${card.entityId}  ···· ${card.lastFourDigits}`}
        />
        <Button type="button" onClick={() => setImportOpen(true)}>
          <span className="inline-flex items-center gap-1">
            <Upload size={14} /> Import Statement
          </span>
        </Button>
      </div>

      {/* Section 1 — Card summary strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Current Balance</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
            {card.currentBalanceOriginal !== undefined ? fmtOriginal(card.currentBalanceOriginal, card.currency) : "—"}
          </p>
          {card.currentBalanceOriginal !== undefined && (
            <p className="mt-1 text-xs text-gray-500">≈ {fmtEur(card.currentBalanceEur ?? approxEur(card.currentBalanceOriginal, card.currency))}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Credit Limit</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
            {limit !== undefined ? fmtOriginal(limit, card.currency) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Utilisation</p>
          {utilisation === null ? (
            <p className="mt-1 text-2xl font-bold text-gray-400">—</p>
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{Math.round(utilisation * 100)}%</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full ${utilisationColor}`} style={{ width: `${Math.min(100, Math.round(utilisation * 100))}%` }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 2 — Statement history */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Statement History</h2>
          <span className="text-xs text-gray-500">{cardStatements.length} statement{cardStatements.length === 1 ? "" : "s"}</span>
        </div>

        {cardStatements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-14 text-center shadow-sm">
            <FileText className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No statements imported yet</p>
            <Button className="mt-3" type="button" onClick={() => setImportOpen(true)}>
              <span className="inline-flex items-center gap-1">
                <Plus size={14} /> Import Statement
              </span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {cardStatements.map((s) => (
              <Fragment key={s.id}>
                <StatementCard statement={s} onMarkPaid={() => setPayTarget(s)} />
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ImportStatementModal open={importOpen} onClose={() => setImportOpen(false)} card={card} />
      <MarkAsPaidModal open={!!payTarget} statement={payTarget} onClose={() => setPayTarget(null)} />
    </div>
  );
}
