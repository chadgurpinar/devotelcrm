import type {
  Company,
  FinArApTransaction,
  FinCounterparty,
  FinEntityCashBalance,
  FinInternalExpense,
  FinInvoice,
  FinInvoiceLine,
  FinPayment,
  FinPaymentApplication,
  FinProjection,
  HrCurrencyCode,
  OurEntity,
} from "../types";
import type { SeedPrng } from "./prng";

function addDays(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function pick<T>(rng: SeedPrng, arr: T[]): T {
  return arr[Math.floor(rng.next() * arr.length)]!;
}

function currencyForEntity(entity: OurEntity): HrCurrencyCode {
  if (entity === "USA") return "USD";
  if (entity === "UK") return "GBP";
  return "TRY";
}

export function seedFinance(opts: { rng: SeedPrng; baseNowIso: string; companies: Company[] }) {
  const { rng, baseNowIso, companies } = opts;
  const today = baseNowIso.slice(0, 10);
  const entities: OurEntity[] = ["USA", "UK", "TR"];

  const seq = new Map<string, number>();
  function finId(prefix: string): string {
    const next = (seq.get(prefix) ?? 0) + 1;
    seq.set(prefix, next);
    return `${prefix}-${String(next).padStart(4, "0")}`;
  }

  const clientCompanies = companies.filter((c) => c.companyStatus === "CLIENT");
  const pool = clientCompanies.length ? clientCompanies : companies;

  const customerCompanies = pool.slice(0, 6);
  const providerCompanies = pool.slice(6, 10);

  const finCounterparties: FinCounterparty[] = [
    ...customerCompanies.map((c, idx) => ({
      id: `fcp-cust-${c.id}`,
      type: "Customer" as const,
      name: c.name,
      companyId: c.id,
      defaultCurrency: ((c.currency as HrCurrencyCode) || "USD") as HrCurrencyCode,
      taxId: c.taxId,
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
      notes: idx % 2 === 0 ? "Key wholesale customer." : undefined,
    })),
    ...providerCompanies.map((c) => ({
      id: `fcp-prov-${c.id}`,
      type: "Provider" as const,
      name: c.name,
      companyId: c.id,
      defaultCurrency: ((c.currency as HrCurrencyCode) || "USD") as HrCurrencyCode,
      taxId: c.taxId,
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    })),
    {
      id: "fcp-other-landlord",
      type: "Other",
      name: "ABC Landlord Ltd",
      defaultCurrency: "GBP",
      notes: "Office rent counterparty (dummy).",
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
    {
      id: "fcp-other-tax",
      type: "Other",
      name: "Tax Authority TR",
      defaultCurrency: "TRY",
      notes: "Tax projections (dummy).",
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
  ];

  const finEntityCashBalances: FinEntityCashBalance[] = entities.map((e) => ({
    entityId: e,
    asOfDate: today,
    currency: currencyForEntity(e),
    openingBalance: e === "USA" ? 1_200_000 : e === "UK" ? 650_000 : 9_500_000,
  }));

  const mkInvoice = (
    entityId: OurEntity,
    counterpartyId: string,
    type: "CustomerInvoice" | "SupplierInvoice",
    invoiceNumber: string,
    invoiceDate: string,
    dueDate: string,
    currency: HrCurrencyCode,
    totalAmount: number,
    status: FinInvoice["status"],
  ): FinInvoice => ({
    id: finId("fin-inv"),
    entityId,
    counterpartyId,
    type,
    invoiceNumber,
    invoiceDate,
    dueDate,
    currency,
    totalAmount,
    status,
    createdAt: baseNowIso,
    updatedAt: baseNowIso,
  });

  const mkTxFromInvoice = (inv: FinInvoice): FinArApTransaction => ({
    id: finId("fin-tx"),
    entityId: inv.entityId,
    counterpartyId: inv.counterpartyId,
    direction: inv.type === "CustomerInvoice" ? "Receivable" : "Payable",
    sourceType: "Invoice",
    referenceType: "Invoice",
    referenceId: inv.id,
    currency: inv.currency,
    amount: inv.totalAmount,
    paidAmount: 0,
    issueDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    status: inv.status === "Paid" ? "Paid" : inv.status === "Overdue" ? "Overdue" : "Open",
    description: inv.type === "CustomerInvoice" ? "Customer invoice" : "Supplier invoice",
    createdAt: baseNowIso,
    updatedAt: baseNowIso,
  });

  const finInvoices: FinInvoice[] = [];
  const finInvoiceLines: FinInvoiceLine[] = [];
  const finArApTransactions: FinArApTransaction[] = [];
  const finPayments: FinPayment[] = [];
  const finPaymentApplications: FinPaymentApplication[] = [];
  const finProjections: FinProjection[] = [];
  const finInternalExpenses: FinInternalExpense[] = [];

  // Invoices + AR/AP transactions
  const customerCounterparties = finCounterparties.filter((c) => c.type === "Customer");
  const providerCounterparties = finCounterparties.filter((c) => c.type === "Provider");
  for (let i = 0; i < 18; i++) {
    const entityId = pick(rng, entities);
    const cp = pick(rng, customerCounterparties);
    const invoiceDate = addDays(today, -1 * (10 + Math.floor(rng.next() * 140)));
    const dueDate = addDays(invoiceDate, 30);
    const status: FinInvoice["status"] =
      i % 7 === 0 ? "Overdue" : i % 5 === 0 ? "Paid" : i % 4 === 0 ? "PartiallyPaid" : "Issued";
    const currency = cp.defaultCurrency;
    const totalAmount = Math.round((35_000 + rng.next() * 140_000) * 100) / 100;
    const inv = mkInvoice(entityId, cp.id, "CustomerInvoice", `C-${entityId}-${1000 + i}`, invoiceDate, dueDate, currency, totalAmount, status);
    finInvoices.push(inv);
    finInvoiceLines.push(
      {
        id: finId("fin-inv-line"),
        invoiceId: inv.id,
        description: "A2P SMS traffic (monthly)",
        serviceType: "SMS",
        periodFrom: addDays(invoiceDate, -30),
        periodTo: invoiceDate,
        amount: Math.round(totalAmount * 0.85 * 100) / 100,
      },
      {
        id: finId("fin-inv-line"),
        invoiceId: inv.id,
        description: "Voice termination (monthly)",
        serviceType: "Voice",
        periodFrom: addDays(invoiceDate, -30),
        periodTo: invoiceDate,
        amount: Math.round(totalAmount * 0.15 * 100) / 100,
      },
    );
    const tx = mkTxFromInvoice(inv);
    if (inv.status === "Paid") tx.paidAmount = tx.amount;
    if (inv.status === "PartiallyPaid") tx.paidAmount = Math.round(tx.amount * 0.45 * 100) / 100;
    finArApTransactions.push(tx);
  }

  for (let i = 0; i < 10; i++) {
    const entityId = pick(rng, entities);
    const cp = pick(rng, providerCounterparties.length ? providerCounterparties : customerCounterparties);
    const invoiceDate = addDays(today, -1 * (12 + Math.floor(rng.next() * 120)));
    const dueDate = addDays(invoiceDate, 25);
    const status: FinInvoice["status"] = i % 6 === 0 ? "Overdue" : i % 4 === 0 ? "Paid" : "Issued";
    const currency = cp.defaultCurrency;
    const totalAmount = Math.round((18_000 + rng.next() * 95_000) * 100) / 100;
    const inv = mkInvoice(entityId, cp.id, "SupplierInvoice", `S-${entityId}-${2000 + i}`, invoiceDate, dueDate, currency, totalAmount, status);
    finInvoices.push(inv);
    finInvoiceLines.push({
      id: finId("fin-inv-line"),
      invoiceId: inv.id,
      description: "Termination services",
      serviceType: "Other",
      periodFrom: addDays(invoiceDate, -30),
      periodTo: invoiceDate,
      amount: totalAmount,
    });
    const tx = mkTxFromInvoice(inv);
    if (inv.status === "Paid") tx.paidAmount = tx.amount;
    finArApTransactions.push(tx);
  }

  // Payments (simple, not fully consistent; used as fixtures for later flows)
  const txOpen = finArApTransactions.filter((t) => t.status === "Open" || t.status === "Overdue" || t.status === "PartiallyPaid");
  for (let i = 0; i < Math.min(14, txOpen.length); i++) {
    const tx = txOpen[i]!;
    const pay: FinPayment = {
      id: finId("fin-pay"),
      entityId: tx.entityId,
      counterpartyId: tx.counterpartyId ?? finCounterparties[0]!.id,
      direction: tx.direction === "Receivable" ? "Incoming" : "Outgoing",
      paymentDate: addDays(tx.issueDate, 18),
      amount: Math.round(Math.min(tx.amount - tx.paidAmount, tx.amount * (0.25 + rng.next() * 0.6)) * 100) / 100,
      currency: tx.currency,
      method: "BankTransfer",
      reference: `TRX-${10000 + i}`,
      createdAt: baseNowIso,
    };
    finPayments.push(pay);
    finPaymentApplications.push({
      id: finId("fin-pay-app"),
      paymentId: pay.id,
      appliedToTransactionId: tx.id,
      appliedAmount: pay.amount,
      appliedAt: baseNowIso,
    });
  }

  // Projections (future-dated)
  for (let i = 0; i < 18; i++) {
    const entityId = pick(rng, entities);
    const isIn = i % 3 !== 0;
    const cp =
      isIn && customerCounterparties.length
        ? pick(rng, customerCounterparties)
        : providerCounterparties.length
          ? pick(rng, providerCounterparties)
          : pick(rng, finCounterparties);
    const dueDate = addDays(today, 7 + Math.floor(rng.next() * 85));
    finProjections.push({
      id: finId("fin-proj"),
      entityId,
      counterpartyId: cp.id,
      direction: isIn ? "Receivable" : "Payable",
      label: isIn ? `Expected customer payment — ${cp.name}` : `Expected supplier payment — ${cp.name}`,
      dueDate,
      amount: Math.round((20_000 + rng.next() * 120_000) * 100) / 100,
      currency: cp.defaultCurrency,
      category: isIn ? "Customer" : "Provider",
      status: i % 5 === 0 ? "Confirmed" : "Planned",
      confidence: i % 4 === 0 ? 0.85 : 0.65,
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    });
  }

  // Internal expenses (monthly)
  for (const entityId of entities) {
    const ccy = currencyForEntity(entityId);
    const mk = (label: string, category: FinInternalExpense["category"], amount: number, dayOfMonth: number) => ({
      id: finId("fin-exp"),
      entityId,
      label,
      category,
      recurrence: "Monthly" as const,
      amount,
      currency: ccy,
      dayOfMonth,
      active: true,
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    });
    finInternalExpenses.push(
      mk("Salaries", "Salary", entityId === "TR" ? 1_950_000 : entityId === "UK" ? 180_000 : 260_000, 27),
      mk("Office rent", "Rent", entityId === "UK" ? 18_000 : entityId === "USA" ? 24_000 : 320_000, 5),
      mk("Software / SaaS", "Software", entityId === "TR" ? 95_000 : 9_500, 12),
      mk("Company cards", "Card", entityId === "TR" ? 210_000 : 16_500, 15),
    );
  }

  // Mirror projections into AR/AP for unified views
  for (const p of finProjections) {
    finArApTransactions.push({
      id: finId("fin-tx"),
      entityId: p.entityId,
      counterpartyId: p.counterpartyId ?? null,
      direction: p.direction,
      sourceType: "Projection",
      referenceType: "Projection",
      referenceId: p.id,
      currency: p.currency,
      amount: p.amount,
      paidAmount: 0,
      issueDate: today,
      dueDate: p.dueDate,
      status: "Planned",
      description: p.label,
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    });
  }

  return {
    finCounterparties,
    finArApTransactions,
    finInvoices,
    finInvoiceLines,
    finPayments,
    finPaymentApplications,
    finProjections,
    finInternalExpenses,
    finEntityCashBalances,
  };
}

