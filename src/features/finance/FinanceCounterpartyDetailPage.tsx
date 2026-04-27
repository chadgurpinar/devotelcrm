import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { isOpenLikeStatus, openAmount } from "./financeUtils";
import { InvoiceFormModal } from "./components/InvoiceFormModal";
import { InvoiceTable } from "./components/InvoiceTable";
import { PaymentFormModal } from "./components/PaymentFormModal";
import { PaymentTable } from "./components/PaymentTable";
import { ProjectionFormModal } from "./components/ProjectionFormModal";
import { ProjectionTable } from "./components/ProjectionTable";
import { UsagePositionsTab } from "./components/UsagePositionsTab";
import { convertCurrency } from "../../store/hrUtils";

type Tab = "usage" | "invoices" | "payments" | "projections";

function fmtEur(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  const sign = n < 0 ? "-" : "";
  return `${sign}€${s}`;
}

export function FinanceCounterpartyDetailPage() {
  const { counterpartyId } = useParams<{ counterpartyId: string }>();
  const nav = useNavigate();
  const counterparty = useAppStore((s) => s.finCounterparties.find((c) => c.id === counterpartyId));
  const transactions = useAppStore((s) => s.finArApTransactions);
  const invoices = useAppStore((s) => s.finInvoices);
  const lines = useAppStore((s) => s.finInvoiceLines);
  const payments = useAppStore((s) => s.finPayments);
  const apps = useAppStore((s) => s.finPaymentApplications);
  const projections = useAppStore((s) => s.finProjections);
  const fx = useAppStore((s) => s.hrFxRates);

  const [tab, setTab] = useState<Tab>("usage");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [projectionOpen, setProjectionOpen] = useState(false);

  const cpId = counterpartyId ?? "";
  const cpInvoices = useMemo(() => invoices.filter((i) => i.counterpartyId === cpId), [invoices, cpId]);
  const cpPayments = useMemo(() => payments.filter((p) => p.counterpartyId === cpId), [payments, cpId]);
  const cpApps = useMemo(() => {
    const ids = new Set(cpPayments.map((p) => p.id));
    return apps.filter((a) => ids.has(a.paymentId));
  }, [apps, cpPayments]);
  const cpProjections = useMemo(() => projections.filter((p) => p.counterpartyId === cpId), [projections, cpId]);

  const summary = useMemo(() => {
    const at = new Date().toISOString();
    const today = at.slice(0, 10);
    let arOpen = 0;
    let apOpen = 0;
    let overdue = 0;
    let nextDue: string | undefined;
    let lastActivity: string | undefined;
    for (const t of transactions) {
      if (t.counterpartyId !== cpId) continue;
      if (t.updatedAt && (!lastActivity || t.updatedAt > lastActivity)) lastActivity = t.updatedAt;
      if (!isOpenLikeStatus(t.status)) continue;
      const open = openAmount(t);
      const eur = convertCurrency(open, t.currency, "EUR", fx, at) ?? open;
      if (t.direction === "Receivable") arOpen += eur;
      else apOpen += eur;
      if (t.status === "Overdue") overdue += eur;
      const due = t.dueDate ?? t.issueDate;
      if (due >= today && (!nextDue || due < nextDue)) nextDue = due;
    }
    return { arOpen, apOpen, overdue, nextDue, lastActivity };
  }, [transactions, cpId, fx]);

  if (!counterparty) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 p-4 pb-10">
        <UiPageHeader title="Counterparty not found" subtitle="Open a counterparty from the AR/AP overview." />
        <Button variant="outline" type="button" onClick={() => nav("/finance/ar-ap")}>
          <span className="inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to AR/AP
          </span>
        </Button>
      </div>
    );
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
        tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 pb-10">
      <UiPageHeader
        title={counterparty.name}
        subtitle={`${counterparty.type} · ${counterparty.defaultCurrency}${counterparty.taxId ? ` · ${counterparty.taxId}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => nav("/finance/ar-ap")}>
              <span className="inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back
              </span>
            </Button>
            {counterparty.companyId && (
              <Link to={`/companies/${counterparty.companyId}`}>
                <Button size="sm" variant="outline" type="button">
                  <span className="inline-flex items-center gap-1">
                    <FileText size={14} /> Open company
                  </span>
                </Button>
              </Link>
            )}
            <Button size="sm" type="button" onClick={() => setInvoiceOpen(true)}>
              <span className="inline-flex items-center gap-1">
                <Plus size={14} /> Invoice
              </span>
            </Button>
            <Button size="sm" type="button" onClick={() => setPaymentOpen(true)}>
              <span className="inline-flex items-center gap-1">
                <Plus size={14} /> Payment
              </span>
            </Button>
            <Button size="sm" type="button" onClick={() => setProjectionOpen(true)}>
              <span className="inline-flex items-center gap-1">
                <Plus size={14} /> Projection
              </span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UiKpiCard label="Receivables (open)" value={fmtEur(summary.arOpen)} />
        <UiKpiCard label="Payables (open)" value={fmtEur(summary.apOpen)} />
        <UiKpiCard label="Overdue" value={fmtEur(summary.overdue)} />
        <UiKpiCard label="Next due" value={summary.nextDue ?? "—"} />
      </div>

      {counterparty.notes && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-700">{counterparty.notes}</div>
      )}

      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-100 p-1">
        {tabBtn("usage", "Usage")}
        {tabBtn("invoices", "Invoices")}
        {tabBtn("payments", "Payments")}
        {tabBtn("projections", "Projections")}
      </div>

      {tab === "usage" && <UsagePositionsTab counterpartyId={counterparty.id} />}
      {tab === "invoices" && <InvoiceTable invoices={cpInvoices} lines={lines} />}
      {tab === "payments" && <PaymentTable payments={cpPayments} applications={cpApps} />}
      {tab === "projections" && <ProjectionTable projections={cpProjections} />}

      <InvoiceFormModal open={invoiceOpen} counterparty={counterparty} onClose={() => setInvoiceOpen(false)} />
      <PaymentFormModal open={paymentOpen} counterparty={counterparty} onClose={() => setPaymentOpen(false)} />
      <ProjectionFormModal open={projectionOpen} counterparty={counterparty} onClose={() => setProjectionOpen(false)} />
    </div>
  );
}
