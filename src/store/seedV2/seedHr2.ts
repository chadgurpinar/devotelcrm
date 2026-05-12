import {
  HrCurrencyCode,
  HrEmployee,
  HrLegalEntity,
  Hr2CompAuditEntry,
  Hr2CompChangeRequest,
  Hr2CompComponent,
  Hr2CompPackage,
  Hr2EmployeeExtension,
  Hr2PaymentInstructionBatch,
  Hr2PaymentInstructionLine,
  Hr2PayrollCycle,
  Hr2PayrollCycleLine,
  Hr2PayrollException,
  OurEntity,
} from "../types";

export interface SeedHr2Input {
  hrEmployees: HrEmployee[];
  hrLegalEntities: HrLegalEntity[];
  baseNowIso: string;
  activeUserId: string;
}

export interface SeedHr2Result {
  hr2EmployeeExtensions: Hr2EmployeeExtension[];
  hr2CompensationPackages: Hr2CompPackage[];
  hr2CompPackageComponents: Hr2CompComponent[];
  hr2CompChangeRequests: Hr2CompChangeRequest[];
  hr2CompAuditLog: Hr2CompAuditEntry[];
  hr2PayrollCycles: Hr2PayrollCycle[];
  hr2PayrollCycleLines: Hr2PayrollCycleLine[];
  hr2PayrollExceptions: Hr2PayrollException[];
  hr2PaymentInstructionBatches: Hr2PaymentInstructionBatch[];
  hr2PaymentInstructionLines: Hr2PaymentInstructionLine[];
}

function payrollCurrencyForEntity(entity: OurEntity): HrCurrencyCode {
  if (entity === "USA") return "USD";
  if (entity === "TR") return "TRY";
  return "GBP";
}

function isoAddDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function isoAddMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

// Per-package base salary plan in package currency.
// Deterministic by index — gives believable spread across roles.
const BASE_SALARY_PLAN: Array<{
  monthlyBase: number;
  allowance: number;
  deduction: number;
  employerCost: number;
}> = [
  { monthlyBase: 9500, allowance: 800, deduction: 1750, employerCost: 11800 },
  { monthlyBase: 6200, allowance: 450, deduction: 1240, employerCost: 7900 },
  { monthlyBase: 4800, allowance: 350, deduction: 960, employerCost: 6200 },
  { monthlyBase: 7300, allowance: 600, deduction: 1460, employerCost: 9100 },
  { monthlyBase: 5400, allowance: 400, deduction: 1080, employerCost: 6900 },
  { monthlyBase: 3900, allowance: 280, deduction: 780, employerCost: 5000 },
  { monthlyBase: 8600, allowance: 700, deduction: 1720, employerCost: 10800 },
  { monthlyBase: 4400, allowance: 320, deduction: 880, employerCost: 5600 },
];

export function seedHr2(input: SeedHr2Input): SeedHr2Result {
  const { hrEmployees, baseNowIso, activeUserId } = input;
  const now = baseNowIso;

  // Pick first 8 active employees deterministically, sorted by id for stability.
  const sortedEmployees = hrEmployees
    .filter((e) => e.active !== false)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const chosenEmployees = sortedEmployees.slice(0, 8);

  // Counter helpers for deterministic IDs.
  const counters: Record<string, number> = {
    ext: 0,
    pkg: 0,
    comp: 0,
    settle: 0,
    cr: 0,
    audit: 0,
    cycle: 0,
    line: 0,
    exception: 0,
    batch: 0,
    pil: 0,
  };
  const id = (kind: string) => {
    counters[kind] += 1;
    return `hr2-${kind}-${String(counters[kind]).padStart(3, "0")}`;
  };

  const extensions: Hr2EmployeeExtension[] = [];
  const packages: Hr2CompPackage[] = [];
  const components: Hr2CompComponent[] = [];
  const changeRequests: Hr2CompChangeRequest[] = [];
  const auditLog: Hr2CompAuditEntry[] = [];

  // ─── Stage 1: build one active package per chosen employee ─────────
  //
  // Employees [0] and [1] also get historical packages (v1) so the audit
  // log shows a chain. Employee [4] is on a different funding entity to
  // demonstrate the multi-entity rule.

  chosenEmployees.forEach((employee, idx) => {
    const employingEntity: OurEntity = employee.legalEntityId;
    // Employee [4] gets a different funding entity to demonstrate the
    // employing-vs-funding split.
    const fundingEntity: OurEntity | undefined =
      idx === 4
        ? employingEntity === "TR"
          ? "UK"
          : employingEntity === "UK"
            ? "USA"
            : "UK"
        : undefined;
    // Use the same package currency as the employing entity's payroll
    // currency to keep the default story FX-clean, but employee [2] and
    // employee [6] get a package currency different from payroll currency
    // so the FxReviewNeeded exception fires for them.
    const payrollCurrency = payrollCurrencyForEntity(employingEntity);
    const packageCurrency: HrCurrencyCode =
      idx === 2 ? "EUR" : idx === 6 ? "EUR" : payrollCurrency;
    const salaryPlan = BASE_SALARY_PLAN[idx % BASE_SALARY_PLAN.length] ?? BASE_SALARY_PLAN[0];
    const createdAt = isoAddDays(now, -60 + idx * 3);
    const effectiveFrom = isoAddDays(now, -55 + idx * 3);
    const settlementRules =
      fundingEntity && fundingEntity !== employingEntity
        ? [
            {
              id: id("settle"),
              legalEntityId: employingEntity,
              percentage: 60,
              note: "Employer-side payroll burden retained.",
            },
            {
              id: id("settle"),
              legalEntityId: fundingEntity,
              percentage: 40,
              note: "Cross-entity recharge for funded portion.",
            },
          ]
        : [
            {
              id: id("settle"),
              legalEntityId: employingEntity,
              percentage: 100,
              note: "Single-entity settlement.",
            },
          ];
    const pkgId = id("pkg");
    const versionLabel = "v1";
    const activePackage: Hr2CompPackage = {
      id: pkgId,
      employeeId: employee.id,
      versionLabel,
      status: "Active",
      packageCurrency,
      payrollFrequency: "Monthly",
      effectiveFrom: dateOnly(effectiveFrom),
      employingEntityId: employingEntity,
      fundingEntityId: fundingEntity,
      settlementRules,
      notes: `Seeded active package for ${employee.firstName} ${employee.lastName}.`,
      createdBy: activeUserId,
      createdAt,
      submittedAt: isoAddDays(createdAt, 1),
      submittedBy: activeUserId,
      approvedAt: isoAddDays(createdAt, 2),
      approvedBy: activeUserId,
      activatedAt: isoAddDays(createdAt, 2),
      activatedBy: activeUserId,
      updatedAt: isoAddDays(createdAt, 2),
    };
    packages.push(activePackage);
    // Base components: BaseSalary, Allowance, Deduction, EmployerCost.
    components.push(
      {
        id: id("comp"),
        packageId: pkgId,
        kind: "BaseSalary",
        label: "Monthly base salary",
        amount: salaryPlan.monthlyBase,
        currency: packageCurrency,
        frequency: "Monthly",
        taxable: true,
        createdAt,
      },
      {
        id: id("comp"),
        packageId: pkgId,
        kind: "Allowance",
        label: "Transport allowance",
        amount: salaryPlan.allowance,
        currency: packageCurrency,
        frequency: "Monthly",
        taxable: false,
        createdAt,
      },
      {
        id: id("comp"),
        packageId: pkgId,
        kind: "Deduction",
        label: "Income tax withholding",
        amount: salaryPlan.deduction,
        currency: packageCurrency,
        frequency: "Monthly",
        taxable: false,
        createdAt,
      },
      {
        id: id("comp"),
        packageId: pkgId,
        kind: "EmployerCost",
        label: "Loaded employer cost",
        amount: salaryPlan.employerCost,
        currency: packageCurrency,
        frequency: "Monthly",
        taxable: false,
        createdAt,
      },
    );
    auditLog.push(
      {
        id: id("audit"),
        employeeId: employee.id,
        packageId: pkgId,
        action: "PackageCreated",
        summary: `Compensation package ${versionLabel} drafted for ${employee.firstName} ${employee.lastName}.`,
        performedBy: activeUserId,
        performedAt: createdAt,
      },
      {
        id: id("audit"),
        employeeId: employee.id,
        packageId: pkgId,
        action: "PackageSubmitted",
        summary: `Package ${versionLabel} submitted for review.`,
        performedBy: activeUserId,
        performedAt: isoAddDays(createdAt, 1),
      },
      {
        id: id("audit"),
        employeeId: employee.id,
        packageId: pkgId,
        action: "PackageApproved",
        summary: `Package ${versionLabel} approved.`,
        performedBy: activeUserId,
        performedAt: isoAddDays(createdAt, 2),
      },
      {
        id: id("audit"),
        employeeId: employee.id,
        packageId: pkgId,
        action: "PackageActivated",
        summary: `Package ${versionLabel} activated.`,
        performedBy: activeUserId,
        performedAt: isoAddDays(createdAt, 2),
      },
    );
    extensions.push({
      id: id("ext"),
      employeeId: employee.id,
      employingEntityId: employingEntity,
      fundingEntityId: fundingEntity,
      payrollFrequency: "Monthly",
      payoutMethod: "BankTransfer",
      // Employee [5] is missing bank details so a MissingBank Blocker fires.
      bankAccountLast4: idx === 5 ? undefined : `${1000 + idx * 113}`.slice(-4),
      hasBankDetails: idx !== 5,
      activePackageId: pkgId,
      createdAt,
      updatedAt: isoAddDays(createdAt, 2),
    });
  });

  // ─── Stage 2: two historical predecessor packages + one terminated ──
  // Employee [0] has v0 historical predecessor + a salary change history.
  // Employee [3] has a terminated former package.
  if (chosenEmployees.length >= 1) {
    const employee = chosenEmployees[0]!;
    const activePackage = packages.find((p) => p.employeeId === employee.id && p.versionLabel === "v1")!;
    const historicalEffectiveFrom = isoAddMonths(activePackage.effectiveFrom, -12);
    const historicalEffectiveTo = activePackage.effectiveFrom;
    const histId = id("pkg");
    const histCreatedAt = isoAddDays(activePackage.createdAt, -300);
    packages.push({
      ...activePackage,
      id: histId,
      versionLabel: "v0",
      status: "Historical",
      effectiveFrom: historicalEffectiveFrom,
      effectiveTo: historicalEffectiveTo,
      supersededByPackageId: activePackage.id,
      createdAt: histCreatedAt,
      submittedAt: isoAddDays(histCreatedAt, 1),
      approvedAt: isoAddDays(histCreatedAt, 2),
      activatedAt: isoAddDays(histCreatedAt, 2),
      updatedAt: historicalEffectiveTo,
    });
    // Re-create components for the historical package with slightly lower salary.
    const baseAmount = Math.round((BASE_SALARY_PLAN[0]!.monthlyBase * 0.92));
    components.push(
      {
        id: id("comp"),
        packageId: histId,
        kind: "BaseSalary",
        label: "Monthly base salary",
        amount: baseAmount,
        currency: activePackage.packageCurrency,
        frequency: "Monthly",
        taxable: true,
        createdAt: histCreatedAt,
      },
      {
        id: id("comp"),
        packageId: histId,
        kind: "Allowance",
        label: "Transport allowance",
        amount: BASE_SALARY_PLAN[0]!.allowance,
        currency: activePackage.packageCurrency,
        frequency: "Monthly",
        taxable: false,
        createdAt: histCreatedAt,
      },
      {
        id: id("comp"),
        packageId: histId,
        kind: "Deduction",
        label: "Income tax withholding",
        amount: Math.round(BASE_SALARY_PLAN[0]!.deduction * 0.92),
        currency: activePackage.packageCurrency,
        frequency: "Monthly",
        taxable: false,
        createdAt: histCreatedAt,
      },
      {
        id: id("comp"),
        packageId: histId,
        kind: "EmployerCost",
        label: "Loaded employer cost",
        amount: Math.round(BASE_SALARY_PLAN[0]!.employerCost * 0.92),
        currency: activePackage.packageCurrency,
        frequency: "Monthly",
        taxable: false,
        createdAt: histCreatedAt,
      },
    );
    // Set the active package's supersedes ref to the historical one.
    const idxActive = packages.findIndex((p) => p.id === activePackage.id);
    packages[idxActive] = { ...activePackage, supersedesPackageId: histId };
    auditLog.push(
      {
        id: id("audit"),
        employeeId: employee.id,
        packageId: histId,
        action: "PackageActivated",
        summary: `Package v0 activated as initial package.`,
        performedBy: activeUserId,
        performedAt: isoAddDays(histCreatedAt, 2),
      },
      {
        id: id("audit"),
        employeeId: employee.id,
        packageId: histId,
        action: "PackageTerminated",
        summary: `Package v0 superseded by v1 (annual salary review).`,
        performedBy: activeUserId,
        performedAt: historicalEffectiveTo,
      },
    );
  }

  if (chosenEmployees.length >= 4) {
    const employee = chosenEmployees[3]!;
    const activePackage = packages.find((p) => p.employeeId === employee.id && p.versionLabel === "v1");
    if (activePackage) {
      const terminatedFromMonths = 8;
      const terminatedEffectiveFrom = isoAddMonths(activePackage.effectiveFrom, -terminatedFromMonths);
      const terminatedEffectiveTo = isoAddMonths(activePackage.effectiveFrom, -1);
      const termId = id("pkg");
      packages.push({
        ...activePackage,
        id: termId,
        versionLabel: "v0",
        status: "Terminated",
        effectiveFrom: terminatedEffectiveFrom,
        effectiveTo: terminatedEffectiveTo,
        terminatedAt: terminatedEffectiveTo,
        terminatedBy: activeUserId,
        terminationReason: "Reorganization — package replaced after promotion to senior tier.",
        supersededByPackageId: activePackage.id,
        createdAt: isoAddDays(activePackage.createdAt, -200),
        submittedAt: isoAddDays(activePackage.createdAt, -199),
        approvedAt: isoAddDays(activePackage.createdAt, -198),
        activatedAt: terminatedEffectiveFrom,
        updatedAt: terminatedEffectiveTo,
      });
      components.push({
        id: id("comp"),
        packageId: termId,
        kind: "BaseSalary",
        label: "Monthly base salary",
        amount: Math.round(BASE_SALARY_PLAN[3]!.monthlyBase * 0.85),
        currency: activePackage.packageCurrency,
        frequency: "Monthly",
        taxable: true,
        createdAt: isoAddDays(activePackage.createdAt, -200),
      });
      auditLog.push({
        id: id("audit"),
        employeeId: employee.id,
        packageId: termId,
        action: "PackageTerminated",
        summary: `Package v0 terminated: Reorganization — package replaced after promotion to senior tier.`,
        performedBy: activeUserId,
        performedAt: terminatedEffectiveTo,
      });
    }
  }

  // ─── Stage 3: two pending change requests ─────────────────────────
  // Employee [1] — salary change submitted, awaiting review.
  // Employee [6] — variable bonus submitted, awaiting review.
  if (chosenEmployees.length >= 2) {
    const employee = chosenEmployees[1]!;
    const activePackage = packages.find((p) => p.employeeId === employee.id && p.status === "Active");
    if (activePackage) {
      const baseComp = components.find(
        (c) => c.packageId === activePackage.id && c.kind === "BaseSalary",
      );
      const crId = id("cr");
      const crCreatedAt = isoAddDays(now, -4);
      changeRequests.push({
        id: crId,
        packageId: activePackage.id,
        employeeId: employee.id,
        kind: "SalaryChange",
        status: "Submitted",
        effectiveFrom: dateOnly(isoAddDays(now, 14)),
        reason: "Annual salary review — market band correction.",
        proposedBaseSalary: Math.round((baseComp?.amount ?? 0) * 1.08),
        proposedCurrency: baseComp?.currency ?? activePackage.packageCurrency,
        previousBaseSalary: baseComp?.amount ?? 0,
        previousCurrency: baseComp?.currency ?? activePackage.packageCurrency,
        createdBy: activeUserId,
        createdAt: crCreatedAt,
        submittedAt: isoAddDays(crCreatedAt, 1),
        updatedAt: isoAddDays(crCreatedAt, 1),
      });
      auditLog.push(
        {
          id: id("audit"),
          employeeId: employee.id,
          packageId: activePackage.id,
          changeRequestId: crId,
          action: "ChangeRequestCreated",
          summary: "Salary change requested as part of annual review.",
          performedBy: activeUserId,
          performedAt: crCreatedAt,
        },
        {
          id: id("audit"),
          employeeId: employee.id,
          packageId: activePackage.id,
          changeRequestId: crId,
          action: "ChangeRequestSubmitted",
          summary: "Salary change submitted for review.",
          performedBy: activeUserId,
          performedAt: isoAddDays(crCreatedAt, 1),
        },
      );
    }
  }

  if (chosenEmployees.length >= 7) {
    const employee = chosenEmployees[6]!;
    const activePackage = packages.find((p) => p.employeeId === employee.id && p.status === "Active");
    if (activePackage) {
      const crId = id("cr");
      const crCreatedAt = isoAddDays(now, -2);
      changeRequests.push({
        id: crId,
        packageId: activePackage.id,
        employeeId: employee.id,
        kind: "VariableBonus",
        status: "Submitted",
        effectiveFrom: dateOnly(isoAddDays(now, 7)),
        reason: "Q1 performance bonus.",
        bonusLabel: "Q1 performance bonus",
        bonusAmount: 1500,
        bonusCurrency: activePackage.packageCurrency,
        bonusFrequency: "OneOff",
        taxable: true,
        createdBy: activeUserId,
        createdAt: crCreatedAt,
        submittedAt: isoAddDays(crCreatedAt, 1),
        updatedAt: isoAddDays(crCreatedAt, 1),
      });
      auditLog.push(
        {
          id: id("audit"),
          employeeId: employee.id,
          packageId: activePackage.id,
          changeRequestId: crId,
          action: "ChangeRequestCreated",
          summary: "Variable bonus requested: Q1 performance bonus.",
          performedBy: activeUserId,
          performedAt: crCreatedAt,
        },
        {
          id: id("audit"),
          employeeId: employee.id,
          packageId: activePackage.id,
          changeRequestId: crId,
          action: "ChangeRequestSubmitted",
          summary: "Variable bonus submitted for review.",
          performedBy: activeUserId,
          performedAt: isoAddDays(crCreatedAt, 1),
        },
      );
    }
  }

  // ─── Stage 4: two payroll cycles ─────────────────────────────────────
  // Determine an employing entity that has the most active extensions to
  // anchor the in-review cycle.
  const entityCounts = new Map<OurEntity, number>();
  extensions.forEach((ext) => {
    entityCounts.set(ext.employingEntityId, (entityCounts.get(ext.employingEntityId) ?? 0) + 1);
  });
  const sortedEntities = Array.from(entityCounts.entries()).sort((a, b) => b[1] - a[1]);
  const primaryEntity = sortedEntities[0]?.[0] ?? ("UK" as OurEntity);
  const secondaryEntity =
    sortedEntities.find(([entity]) => entity !== primaryEntity)?.[0] ?? primaryEntity;

  // Cycle A: previous month, Approved + emitted instruction batch.
  const cycleAId = id("cycle");
  const cycleAPeriod = monthKey(isoAddMonths(now, -1));
  const cycleAOpenedAt = isoAddDays(now, -35);
  const cycleAApprovedAt = isoAddDays(now, -5);
  const cycleAPayrollCcy = payrollCurrencyForEntity(primaryEntity);
  const cycleA: Hr2PayrollCycle = {
    id: cycleAId,
    period: cycleAPeriod,
    legalEntityId: primaryEntity,
    payrollCurrency: cycleAPayrollCcy,
    status: "Approved",
    openedAt: cycleAOpenedAt,
    openedBy: activeUserId,
    computedAt: isoAddDays(cycleAOpenedAt, 1),
    approvedAt: cycleAApprovedAt,
    approvedBy: activeUserId,
    fxRateRefDate: dateOnly(cycleAApprovedAt),
    notes: `Standard ${cycleAPeriod} payroll for ${primaryEntity}.`,
    updatedAt: cycleAApprovedAt,
  };

  // Cycle B: current month, ReadyForReview with exceptions.
  const cycleBId = id("cycle");
  const cycleBPeriod = monthKey(now);
  const cycleBOpenedAt = isoAddDays(now, -3);
  const cycleBComputedAt = isoAddDays(now, -2);
  const cycleB: Hr2PayrollCycle = {
    id: cycleBId,
    period: cycleBPeriod,
    legalEntityId: primaryEntity,
    payrollCurrency: cycleAPayrollCcy,
    status: "ReadyForReview",
    openedAt: cycleBOpenedAt,
    openedBy: activeUserId,
    computedAt: cycleBComputedAt,
    fxRateRefDate: dateOnly(cycleBComputedAt),
    notes: `In-review ${cycleBPeriod} payroll for ${primaryEntity}.`,
    updatedAt: cycleBComputedAt,
  };

  // Build cycle lines + exceptions for the primary entity's extensions.
  type LineSeed = {
    line: Hr2PayrollCycleLine;
    exceptions: Hr2PayrollException[];
  };
  function buildCycleLinesFor(cycle: Hr2PayrollCycle, derivedAt: string): LineSeed[] {
    const cycleExtensions = extensions.filter((ext) => ext.employingEntityId === cycle.legalEntityId);
    const results: LineSeed[] = [];
    cycleExtensions.forEach((ext) => {
      const pkg = packages.find((p) => p.id === ext.activePackageId);
      if (!pkg || pkg.status !== "Active") return;
      const employee = chosenEmployees.find((e) => e.id === ext.employeeId);
      if (!employee) return;
      const pkgComponents = components.filter((c) => c.packageId === pkg.id);
      let grossPkg = 0;
      let deductionsPkg = 0;
      let employerCostPkg = 0;
      const breakdown = pkgComponents.map((c) => {
        const amount = c.frequency === "Annual" ? c.amount / 12 : c.amount;
        if (c.kind === "BaseSalary" || c.kind === "Allowance" || c.kind === "VariableBonus") {
          grossPkg += amount;
        } else if (c.kind === "Deduction") {
          deductionsPkg += amount;
        } else if (c.kind === "EmployerCost") {
          employerCostPkg += amount;
        }
        return {
          componentId: c.id,
          kind: c.kind,
          label: c.label,
          amountPackageCurrency: Math.round(amount * 100) / 100,
          amountPayrollCurrency: 0,
        };
      });
      const netPkg = grossPkg - deductionsPkg;
      // Cross-currency rates (rough demo): EUR->GBP 0.85, EUR->USD 1.10, EUR->TRY 35.
      // Same-currency stays at 1.
      const rateForPair = (
        from: HrCurrencyCode,
        to: HrCurrencyCode,
      ): number => {
        if (from === to) return 1;
        const toEur: Record<HrCurrencyCode, number> = { EUR: 1, GBP: 1.17, USD: 0.91, TRY: 0.03 };
        const fromEur: Record<HrCurrencyCode, number> = { EUR: 1, GBP: 0.85, USD: 1.10, TRY: 35 };
        const eur = from === "EUR" ? 1 : toEur[from];
        const toRate = to === "EUR" ? 1 : fromEur[to];
        return Math.round(eur * toRate * 1000) / 1000;
      };
      const fxRate = rateForPair(pkg.packageCurrency, cycle.payrollCurrency);
      const breakdownWithFx = breakdown.map((b) => ({
        ...b,
        amountPayrollCurrency: Math.round(b.amountPackageCurrency * fxRate * 100) / 100,
      }));
      const lineId = id("line");
      const lineExceptions: Hr2PayrollException[] = [];
      if (!ext.hasBankDetails) {
        lineExceptions.push({
          id: id("exception"),
          cycleId: cycle.id,
          cycleLineId: lineId,
          employeeId: ext.employeeId,
          category: "MissingBank",
          severity: "Blocker",
          status: "Open",
          message: `Bank details missing for ${employee.firstName} ${employee.lastName}. Cannot prepare payment instruction.`,
          detectedAt: derivedAt,
        });
      }
      const pendingChange = changeRequests.find(
        (r) => r.packageId === pkg.id && (r.status === "Submitted" || r.status === "UnderReview"),
      );
      if (pendingChange) {
        lineExceptions.push({
          id: id("exception"),
          cycleId: cycle.id,
          cycleLineId: lineId,
          employeeId: ext.employeeId,
          category: "PendingCompChange",
          severity: "Warning",
          status: "Open",
          message: `${pendingChange.kind} change request pending review. Payroll uses current active package.`,
          detectedAt: derivedAt,
        });
      }
      if (pkg.packageCurrency !== cycle.payrollCurrency) {
        lineExceptions.push({
          id: id("exception"),
          cycleId: cycle.id,
          cycleLineId: lineId,
          employeeId: ext.employeeId,
          category: "FxReviewNeeded",
          severity: "Warning",
          status: "Open",
          message: `Package currency ${pkg.packageCurrency} differs from payroll currency ${cycle.payrollCurrency}. Review FX rate ${fxRate.toFixed(4)}.`,
          detectedAt: derivedAt,
        });
      }
      const hasBlocker = lineExceptions.some((ex) => ex.severity === "Blocker");
      const hasWarning = lineExceptions.some((ex) => ex.severity === "Warning");
      const line: Hr2PayrollCycleLine = {
        id: lineId,
        cycleId: cycle.id,
        employeeId: ext.employeeId,
        employeeFullName: `${employee.firstName} ${employee.lastName}`,
        packageId: pkg.id,
        packageVersionLabel: pkg.versionLabel,
        status: hasBlocker ? "Blocked" : hasWarning ? "Warning" : "OK",
        packageCurrency: pkg.packageCurrency,
        grossPackageCurrency: Math.round(grossPkg * 100) / 100,
        netPackageCurrency: Math.round(netPkg * 100) / 100,
        employerCostPackageCurrency: Math.round(employerCostPkg * 100) / 100,
        payrollCurrency: cycle.payrollCurrency,
        fxRate,
        grossPayrollCurrency: Math.round(grossPkg * fxRate * 100) / 100,
        netPayrollCurrency: Math.round(netPkg * fxRate * 100) / 100,
        employerCostPayrollCurrency: Math.round(employerCostPkg * fxRate * 100) / 100,
        employingEntityId: ext.employingEntityId,
        fundingEntityId: ext.fundingEntityId,
        payoutMethod: ext.payoutMethod,
        bankAccountLast4: ext.bankAccountLast4,
        componentBreakdown: breakdownWithFx,
        derivedAt,
      };
      results.push({ line, exceptions: lineExceptions });
    });
    return results;
  }

  // For cycle A (approved last month) we resolve all exceptions so the
  // emitted batch has Ready and Blocked lines plausibly distributed. We
  // keep one Blocked line by leaving its MissingBank exception unresolved.
  const cycleASeeds = buildCycleLinesFor(cycleA, isoAddDays(cycleA.openedAt, 1));
  // Mark Warnings as Resolved (warnings don't block approval); keep one
  // Blocker open so the emitted batch shows a Blocked line.
  const cycleALines: Hr2PayrollCycleLine[] = [];
  const cycleAExceptions: Hr2PayrollException[] = [];
  cycleASeeds.forEach((seed) => {
    const resolvedExceptions = seed.exceptions.map((ex, exIdx) => {
      // For warnings, mark them Resolved at approval time.
      if (ex.severity === "Warning") {
        return {
          ...ex,
          status: "Resolved" as const,
          resolvedAt: cycleA.approvedAt,
          resolvedBy: activeUserId,
          resolutionNote: "Reviewed during approval pass.",
        };
      }
      // Keep blockers open so they propagate to Blocked instruction lines.
      void exIdx;
      return ex;
    });
    const hasOpenBlocker = resolvedExceptions.some(
      (ex) => ex.severity === "Blocker" && ex.status === "Open",
    );
    cycleALines.push({
      ...seed.line,
      status: hasOpenBlocker ? "Blocked" : "OK",
      derivedAt: isoAddDays(cycleA.openedAt, 1),
    });
    cycleAExceptions.push(...resolvedExceptions);
  });

  // For cycle B (in review this month), keep exceptions Open so the UI
  // shows real review work to be done.
  const cycleBSeeds = buildCycleLinesFor(cycleB, cycleBComputedAt);
  const cycleBLines: Hr2PayrollCycleLine[] = [];
  const cycleBExceptions: Hr2PayrollException[] = [];
  cycleBSeeds.forEach((seed) => {
    cycleBLines.push(seed.line);
    cycleBExceptions.push(...seed.exceptions);
  });

  const allCycleLines = [...cycleALines, ...cycleBLines];
  const allExceptions = [...cycleAExceptions, ...cycleBExceptions];

  // ─── Stage 5: payment instruction batches for cycle A only ───────
  // (Cycle B has not yet been approved.)
  const instructionBatches: Hr2PaymentInstructionBatch[] = [];
  const instructionLines: Hr2PaymentInstructionLine[] = [];
  if (cycleALines.length > 0) {
    type GroupKey = string;
    const groups = new Map<GroupKey, Hr2PayrollCycleLine[]>();
    cycleALines.forEach((line) => {
      const key = `${line.employingEntityId}|${line.fundingEntityId ?? line.employingEntityId}|${line.payrollCurrency}`;
      const arr = groups.get(key) ?? [];
      arr.push(line);
      groups.set(key, arr);
    });
    groups.forEach((linesInGroup, key) => {
      const [employingEntityId, fundingEntityIdRaw, payoutCurrency] = key.split("|") as [
        OurEntity,
        OurEntity,
        HrCurrencyCode,
      ];
      const fundingEntityId =
        fundingEntityIdRaw === employingEntityId ? undefined : fundingEntityIdRaw;
      const batchId = id("batch");
      let totalAmount = 0;
      let blockedAmount = 0;
      let blockedLineCount = 0;
      linesInGroup.forEach((line) => {
        const lineBlockers = cycleAExceptions.filter(
          (ex) => ex.cycleLineId === line.id && ex.status === "Open" && ex.severity === "Blocker",
        );
        const isBlocked = lineBlockers.length > 0;
        if (isBlocked) {
          blockedAmount += line.netPayrollCurrency;
          blockedLineCount += 1;
        }
        totalAmount += line.netPayrollCurrency;
        instructionLines.push({
          id: id("pil"),
          batchId,
          cycleId: cycleA.id,
          cycleLineId: line.id,
          employeeId: line.employeeId,
          employeeFullName: line.employeeFullName,
          employingEntityId,
          fundingEntityId,
          payoutCurrency,
          amount: line.netPayrollCurrency,
          payoutMethod: line.payoutMethod,
          bankAccountLast4: line.bankAccountLast4,
          status: isBlocked ? "Blocked" : "Ready",
          blockedReason: lineBlockers[0]?.message,
          blockingExceptionIds: lineBlockers.map((ex) => ex.id),
          updatedAt: cycleA.approvedAt ?? cycleAApprovedAt,
        });
      });
      const batchStatus = blockedLineCount === 0 ? "Ready" : "PartiallyBlocked";
      instructionBatches.push({
        id: batchId,
        cycleId: cycleA.id,
        employingEntityId,
        fundingEntityId,
        payoutCurrency,
        status: batchStatus,
        totalAmount: Math.round(totalAmount * 100) / 100,
        blockedAmount: Math.round(blockedAmount * 100) / 100,
        lineCount: linesInGroup.length,
        blockedLineCount,
        emittedAt: cycleA.approvedAt ?? cycleAApprovedAt,
        emittedBy: activeUserId,
        updatedAt: cycleA.approvedAt ?? cycleAApprovedAt,
      });
    });
  }

  // Add a third cycle: secondary entity Draft for visibility.
  if (secondaryEntity !== primaryEntity) {
    const cycleCId = id("cycle");
    const cycleCPeriod = monthKey(now);
    const cycleCOpenedAt = isoAddDays(now, -1);
    const cycleC: Hr2PayrollCycle = {
      id: cycleCId,
      period: cycleCPeriod,
      legalEntityId: secondaryEntity,
      payrollCurrency: payrollCurrencyForEntity(secondaryEntity),
      status: "Draft",
      openedAt: cycleCOpenedAt,
      openedBy: activeUserId,
      fxRateRefDate: dateOnly(cycleCOpenedAt),
      notes: `Just-opened ${cycleCPeriod} payroll for ${secondaryEntity}.`,
      updatedAt: cycleCOpenedAt,
    };
    return {
      hr2EmployeeExtensions: extensions,
      hr2CompensationPackages: packages,
      hr2CompPackageComponents: components,
      hr2CompChangeRequests: changeRequests,
      hr2CompAuditLog: auditLog,
      hr2PayrollCycles: [cycleA, cycleB, cycleC],
      hr2PayrollCycleLines: allCycleLines,
      hr2PayrollExceptions: allExceptions,
      hr2PaymentInstructionBatches: instructionBatches,
      hr2PaymentInstructionLines: instructionLines,
    };
  }

  return {
    hr2EmployeeExtensions: extensions,
    hr2CompensationPackages: packages,
    hr2CompPackageComponents: components,
    hr2CompChangeRequests: changeRequests,
    hr2CompAuditLog: auditLog,
    hr2PayrollCycles: [cycleA, cycleB],
    hr2PayrollCycleLines: allCycleLines,
    hr2PayrollExceptions: allExceptions,
    hr2PaymentInstructionBatches: instructionBatches,
    hr2PaymentInstructionLines: instructionLines,
  };
}
