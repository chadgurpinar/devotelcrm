import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Pencil, Plus, Wallet } from "lucide-react";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import type {
  FinanceCreditCard,
  FinanceCreditCardStatement,
  FinanceCreditCardStatus,
  FinanceCurrencyCode,
  OurEntity,
} from "../../store/types";
import { UiKpiCard } from "../../ui/UiKpiCard";
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

const ALL_ENTITIES: readonly OurEntity[] = ["UK", "USA", "TR"] as const;
const ALL_CURRENCIES: readonly FinanceCurrencyCode[] = ["EUR", "USD", "GBP", "TRY", "CHF", "AED"] as const;
const ALL_STATUSES: readonly FinanceCreditCardStatus[] = ["Active", "Suspended", "Cancelled"] as const;

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

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatLongDate(ymd: string): string {
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// ─── Status badge ────────────────────────────────────────────────────

function StatusBadge({ value }: { value: FinanceCreditCardStatus }) {
  const styles: Record<FinanceCreditCardStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Suspended: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Cancelled: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[value]}`}>{value}</span>;
}

// ─── Add / Edit Card modal ───────────────────────────────────────────

interface CardFormModalProps {
  open: boolean;
  onClose: () => void;
  editing?: FinanceCreditCard | null;
}

function CardFormModal({ open, onClose, editing }: CardFormModalProps) {
  const addCard = useAppStore((s) => s.addFinanceCreditCard);
  const updateCard = useAppStore((s) => s.updateFinanceCreditCard);

  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [cardName, setCardName] = useState("");
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [currency, setCurrency] = useState<FinanceCurrencyCode>("EUR");
  const [creditLimit, setCreditLimit] = useState<number | "">("");
  const [currentBalance, setCurrentBalance] = useState<number | "">("");
  const [statementDay, setStatementDay] = useState<number>(25);
  const [paymentDueDay, setPaymentDueDay] = useState<number>(15);
  const [status, setStatus] = useState<FinanceCreditCardStatus>("Active");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setEntityId(editing.entityId);
      setCardName(editing.cardName);
      setLastFourDigits(editing.lastFourDigits);
      setCurrency(editing.currency);
      setCreditLimit(editing.creditLimitOriginal ?? "");
      setCurrentBalance(editing.currentBalanceOriginal ?? "");
      setStatementDay(editing.statementDayOfMonth);
      setPaymentDueDay(editing.paymentDueDayOfMonth);
      setStatus(editing.status);
      setNotes(editing.notes ?? "");
      return;
    }
    setEntityId("UK");
    setCardName("");
    setLastFourDigits("");
    setCurrency("EUR");
    setCreditLimit("");
    setCurrentBalance("");
    setStatementDay(25);
    setPaymentDueDay(15);
    setStatus("Active");
    setNotes("");
  }, [open, editing]);

  if (!open) return null;

  const last4 = lastFourDigits.replace(/\D/g, "").slice(0, 4);
  const balanceNum = typeof currentBalance === "number" ? currentBalance : 0;
  const balanceEur = balanceNum > 0 ? approxEur(balanceNum, currency) : 0;
  const limitNum = typeof creditLimit === "number" ? creditLimit : undefined;

  const submit = () => {
    if (!cardName.trim() || last4.length !== 4) return;
    const day1 = Math.max(1, Math.min(31, statementDay));
    const day2 = Math.max(1, Math.min(31, paymentDueDay));

    if (editing) {
      updateCard({
        ...editing,
        entityId,
        cardName: cardName.trim(),
        lastFourDigits: last4,
        currency,
        creditLimitOriginal: limitNum,
        currentBalanceOriginal: typeof currentBalance === "number" ? currentBalance : undefined,
        currentBalanceEur: typeof currentBalance === "number" ? balanceEur : undefined,
        statementDayOfMonth: day1,
        paymentDueDayOfMonth: day2,
        status,
        notes: notes.trim() || undefined,
      });
    } else {
      addCard({
        entityId,
        cardName: cardName.trim(),
        lastFourDigits: last4,
        currency,
        creditLimitOriginal: limitNum,
        currentBalanceOriginal: typeof currentBalance === "number" ? currentBalance : undefined,
        currentBalanceEur: typeof currentBalance === "number" ? balanceEur : undefined,
        statementDayOfMonth: day1,
        paymentDueDayOfMonth: day2,
        status,
        notes: notes.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">{editing ? "Edit credit card" : "New credit card"}</h3>
        <p className="mt-1 text-xs text-gray-500">
          Cards are tied to one of our entities. EUR balance is auto-calculated from the original balance.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-700">
            Entity
            <select className={inputCls} value={entityId} onChange={(e) => setEntityId(e.target.value as OurEntity)}>
              {ALL_ENTITIES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Status
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as FinanceCreditCardStatus)}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Card name
            <input className={inputCls} value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="e.g. Devotel UK Amex" />
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Last four digits
            <input
              className={inputCls}
              value={lastFourDigits}
              onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              inputMode="numeric"
              placeholder="1234"
            />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Currency
            <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as FinanceCurrencyCode)}>
              {ALL_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Credit limit <span className="text-gray-400">(optional)</span>
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={creditLimit === "" ? "" : creditLimit}
              onChange={(e) => setCreditLimit(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Current balance <span className="text-gray-400">(optional)</span>
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={currentBalance === "" ? "" : currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value === "" ? "" : Number(e.target.value))}
            />
            {typeof currentBalance === "number" && currentBalance > 0 && (
              <span className="mt-1 block text-[10px] text-gray-400">≈ {fmtEur(balanceEur)}</span>
            )}
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Statement day of month
            <input
              type="number"
              min={1}
              max={31}
              className={inputCls}
              value={statementDay}
              onChange={(e) => setStatementDay(Number(e.target.value))}
            />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Payment due day of month
            <input
              type="number"
              min={1}
              max={31}
              className={inputCls}
              value={paymentDueDay}
              onChange={(e) => setPaymentDueDay(Number(e.target.value))}
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
          <Button type="button" onClick={submit} disabled={!cardName.trim() || last4.length !== 4}>
            {editing ? "Save changes" : "Add card"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Card tile ───────────────────────────────────────────────────────

function CardTile({
  card,
  statements,
}: {
  card: FinanceCreditCard;
  statements: FinanceCreditCardStatement[];
}) {
  const today = new Date();
  const todayMs = today.getTime();
  const dim = card.status === "Cancelled";

  const limit = card.creditLimitOriginal;
  const balance = card.currentBalanceOriginal ?? 0;
  const utilisation = limit && limit > 0 ? balance / limit : null;

  const utilisationColor =
    utilisation === null
      ? ""
      : utilisation < 0.5
      ? "bg-emerald-500"
      : utilisation < 0.8
      ? "bg-amber-500"
      : "bg-rose-500";

  const unpaid = statements
    .filter((s) => s.cardId === card.id && (s.status === "Unpaid" || s.status === "PartiallyPaid" || s.status === "Overdue"))
    .sort((a, b) => b.statementMonth.localeCompare(a.statementMonth));
  const next = unpaid[0];

  let dotColor: string | null = null;
  if (next?.dueDate) {
    const dueMs = new Date(`${next.dueDate.slice(0, 10)}T12:00:00Z`).getTime();
    const diffDays = Math.floor((dueMs - todayMs) / (24 * 60 * 60 * 1000));
    if (diffDays <= 7) dotColor = "bg-rose-500";
    else if (diffDays <= 14) dotColor = "bg-amber-500";
  }

  return (
    <div className={`flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${dim ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <span className="mr-1">{ENTITY_FLAGS[card.entityId]}</span>
            {card.entityId}
          </p>
          <h3 className="mt-1 text-base font-bold text-gray-900">{card.cardName}</h3>
          <p className="mt-0.5 font-mono text-xs text-gray-500">···· {card.lastFourDigits}</p>
        </div>
        <StatusBadge value={card.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-500">Current balance</span>
          <span className="text-lg font-bold tabular-nums text-gray-900">
            {card.currentBalanceOriginal !== undefined ? fmtOriginal(card.currentBalanceOriginal, card.currency) : "—"}
          </span>
        </div>
        {card.currentBalanceOriginal !== undefined && card.currency !== "EUR" && (
          <p className="-mt-2 text-right text-[10px] text-gray-400">≈ {fmtEur(card.currentBalanceEur ?? approxEur(card.currentBalanceOriginal, card.currency))}</p>
        )}

        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-500">Credit limit</span>
          <span className="text-sm font-medium tabular-nums text-gray-700">
            {limit !== undefined ? fmtOriginal(limit, card.currency) : "—"}
          </span>
        </div>

        {utilisation !== null && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500">Utilisation</span>
              <span className="text-xs font-medium tabular-nums text-gray-700">{Math.round(utilisation * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full ${utilisationColor}`} style={{ width: `${Math.min(100, Math.round(utilisation * 100))}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-500">Statement day</span>
          <span className="text-xs font-medium tabular-nums text-gray-700">{ordinalSuffix(card.statementDayOfMonth)}</span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-500">Next payment due</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-gray-700">
            {next ? formatLongDate(next.dueDate) : "—"}
            {dotColor && <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
        <Link to={`/finance/credit-cards/${card.id}`}>
          <Button size="sm" variant="secondary" type="button">
            View Statements
          </Button>
        </Link>
        <CardEditButton card={card} />
      </div>
    </div>
  );
}

function CardEditButton({ card }: { card: FinanceCreditCard }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" type="button" onClick={() => setOpen(true)}>
        <span className="inline-flex items-center gap-1">
          <Pencil size={12} /> Edit
        </span>
      </Button>
      <CardFormModal open={open} editing={card} onClose={() => setOpen(false)} />
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export function FinanceCreditCardsPage() {
  const cards = useAppStore((s) => s.financeCreditCards);
  const statements = useAppStore((s) => s.financeCreditCardStatements);

  const [addOpen, setAddOpen] = useState(false);

  const today = new Date();
  const todayMs = today.getTime();

  const kpis = useMemo(() => {
    let outstanding = 0;
    for (const c of cards) {
      if (c.status === "Active") outstanding += c.currentBalanceEur ?? 0;
    }

    let dueWithin14 = 0;
    let due30Eur = 0;
    for (const s of statements) {
      if (s.status === "Paid") continue;
      const dueMs = new Date(`${s.dueDate.slice(0, 10)}T12:00:00Z`).getTime();
      const diffDays = Math.floor((dueMs - todayMs) / (24 * 60 * 60 * 1000));
      if (diffDays <= 14) dueWithin14 += 1;
      if (diffDays <= 30) due30Eur += s.totalAmountEur;
    }
    return { outstanding, dueWithin14, due30Eur };
  }, [cards, statements, todayMs]);

  const sortedCards = useMemo(
    () =>
      cards.slice().sort((a, b) => {
        if (a.entityId !== b.entityId) return a.entityId.localeCompare(b.entityId);
        return a.cardName.localeCompare(b.cardName);
      }),
    [cards],
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <UiPageHeader title="Credit Cards" subtitle="Entity credit cards, balances, and upcoming payment deadlines" />
        <Button type="button" onClick={() => setAddOpen(true)}>
          <span className="inline-flex items-center gap-1">
            <Plus size={14} /> Add Credit Card
          </span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiKpiCard label="Total Outstanding (EUR)" value={fmtEur(kpis.outstanding)} icon={<Wallet className="h-5 w-5" />} />
        <UiKpiCard
          label="Due Within 14 Days"
          value={kpis.dueWithin14}
          icon={<CreditCard className="h-5 w-5" />}
          className={kpis.dueWithin14 > 0 ? "border-rose-200 bg-rose-50/50" : ""}
        />
        <UiKpiCard label="Total Due (next 30 days)" value={fmtEur(kpis.due30Eur)} icon={<Wallet className="h-5 w-5" />} />
      </div>

      {sortedCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-14 text-center shadow-sm">
          <CreditCard className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No credit cards added yet</p>
          <Button className="mt-3" type="button" onClick={() => setAddOpen(true)}>
            <span className="inline-flex items-center gap-1">
              <Plus size={14} /> Add Credit Card
            </span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedCards.map((c) => (
            <CardTile key={c.id} card={c} statements={statements} />
          ))}
        </div>
      )}

      <CardFormModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
