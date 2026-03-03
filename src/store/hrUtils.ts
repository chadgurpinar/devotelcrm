import {
  HrCurrencyCode,
  HrEmployee,
  HrEmployeeCompensation,
  HrFxRate,
  HrPayrollEmployeeLine,
  HrPayrollFilters,
  OurEntity,
} from "./types";

const DISTRIBUTION_TOLERANCE = 0.01;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toMonthKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rateCandidates(rates: HrFxRate[], from: HrCurrencyCode, at: string): HrFxRate[] {
  return rates
    .filter((entry) => entry.from === from)
    .filter((entry) => !entry.effectiveAt || entry.effectiveAt <= at)
    .sort((left, right) => right.effectiveAt.localeCompare(left.effectiveAt));
}

export function getRateToEur(rates: HrFxRate[], from: HrCurrencyCode, at: string): number | undefined {
  if (from === "EUR") return 1;
  const pick = rateCandidates(rates, from, at)[0] ?? rates.filter((entry) => entry.from === from).sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0];
  if (!pick || !Number.isFinite(pick.rate) || pick.rate <= 0) return undefined;
  return pick.rate;
}

export function convertCurrency(
  amount: number,
  from: HrCurrencyCode,
  to: HrCurrencyCode,
  rates: HrFxRate[],
  at: string,
): number | undefined {
  if (!Number.isFinite(amount)) return undefined;
  if (from === to) return amount;
  const fromRate = getRateToEur(rates, from, at);
  const toRate = getRateToEur(rates, to, at);
  if (!fromRate || !toRate) return undefined;
  const eur = amount * fromRate;
  return eur / toRate;
}

export function workingDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const finish = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  let days = 0;
  while (cursor <= finish) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function dateRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const a1 = new Date(startA).getTime();
  const a2 = new Date(endA).getTime();
  const b1 = new Date(startB).getTime();
  const b2 = new Date(endB).getTime();
  if ([a1, a2, b1, b2].some((entry) => Number.isNaN(entry))) return false;
  return a1 <= b2 && b1 <= a2;
}

type DistributionWeight = {
  legalEntityId: OurEntity;
  weightPct: number;
};

export function resolveDistributionWeights(
  compensation: HrEmployeeCompensation,
  rates: HrFxRate[],
  at: string,
): { ok: boolean; message?: string; weights: DistributionWeight[]; missingFxCount: number } {
  if (!compensation.salaryDistribution.length) {
    return {
      ok: false,
      message: "At least one salary distribution line is required.",
      weights: [],
      missingFxCount: 0,
    };
  }
  const modeSet = new Set(compensation.salaryDistribution.map((line) => line.mode));
  if (modeSet.size > 1) {
    return {
      ok: false,
      message: "Mixing percent and fixed distribution modes is not supported in this version.",
      weights: [],
      missingFxCount: 0,
    };
  }

  if (compensation.salaryDistribution[0].mode === "Percent") {
    const weights = compensation.salaryDistribution.map((line) => ({
      legalEntityId: line.legalEntityId,
      weightPct: Number(line.percent ?? 0),
    }));
    const totalPercent = weights.reduce((sum, line) => sum + line.weightPct, 0);
    if (Math.abs(totalPercent - 100) > DISTRIBUTION_TOLERANCE) {
      return {
        ok: false,
        message: "Percent distribution must sum to 100%.",
        weights: [],
        missingFxCount: 0,
      };
    }
    return { ok: true, weights, missingFxCount: 0 };
  }

  let missingFxCount = 0;
  const converted = compensation.salaryDistribution.map((line) => {
    const fixed = Number(line.fixedAmount ?? 0);
    const convertedToCompCurrency = convertCurrency(fixed, line.currency, compensation.currency, rates, at);
    if (convertedToCompCurrency === undefined) missingFxCount += 1;
    return {
      legalEntityId: line.legalEntityId,
      convertedAmount: convertedToCompCurrency ?? 0,
    };
  });
  const totalConverted = converted.reduce((sum, line) => sum + line.convertedAmount, 0);
  if (totalConverted <= 0) {
    return {
      ok: false,
      message: "Fixed distribution amounts are not valid.",
      weights: [],
      missingFxCount,
    };
  }
  if (Math.abs(totalConverted - compensation.baseSalaryNet) > DISTRIBUTION_TOLERANCE) {
    return {
      ok: false,
      message: "Fixed distribution total must match base net salary.",
      weights: [],
      missingFxCount,
    };
  }
  return {
    ok: true,
    weights: converted.map((line) => ({
      legalEntityId: line.legalEntityId,
      weightPct: (line.convertedAmount / totalConverted) * 100,
    })),
    missingFxCount,
  };
}

export function validateSalaryDistribution(
  compensation: HrEmployeeCompensation,
  rates: HrFxRate[],
  at: string,
): { ok: boolean; message?: string } {
  const result = resolveDistributionWeights(compensation, rates, at);
  return {
    ok: result.ok,
    message: result.message,
  };
}

export interface HrPayrollPreviewResult {
  lines: HrPayrollEmployeeLine[];
  totals: {
    netEur: number;
    employerCostEur: number;
    bonusesEur: number;
    headcount: number;
    byLegalEntity: Array<{
      legalEntityId: OurEntity;
      netEur: number;
      employerCostEur: number;
      bonusesEur: number;
      headcount: number;
    }>;
  };
  warnings: string[];
}

export function computePayrollPreview(args: {
  employees: HrEmployee[];
  compensations: HrEmployeeCompensation[];
  fxRates: HrFxRate[];
  month: string;
  filters?: HrPayrollFilters;
  snapshotId?: string;
}): HrPayrollPreviewResult {
  const { employees, compensations, fxRates, month, filters, snapshotId = "preview" } = args;
  const monthKey = month.trim();
  const compensationByEmployee = new Map(compensations.map((entry) => [entry.employeeId, entry]));
  const warnings: string[] = [];

  const filteredEmployees = employees.filter((employee) => {
    if (!employee.active) return false;
    if (filters?.departmentId && employee.departmentId !== filters.departmentId) return false;
    if (filters?.country && employee.countryOfEmployment !== filters.country) return false;
    if (filters?.employmentType && employee.employmentType !== filters.employmentType) return false;
    return true;
  });

  const lines: HrPayrollEmployeeLine[] = [];
  filteredEmployees.forEach((employee, idx) => {
    const compensation = compensationByEmployee.get(employee.id);
    if (!compensation) return;

    const bonusTotalCompCurrency = compensation.bonusEntries
      .filter((bonus) => toMonthKey(bonus.date) === monthKey)
      .reduce((sum, bonus) => {
        const converted = convertCurrency(bonus.amount, bonus.currency, compensation.currency, fxRates, bonus.date);
        if (converted === undefined) {
          warnings.push(`Missing FX for bonus conversion (${employee.firstName} ${employee.lastName}).`);
          return sum;
        }
        return sum + converted;
      }, 0);

    const distribution = resolveDistributionWeights(compensation, fxRates, `${monthKey}-28T00:00:00.000Z`);
    if (!distribution.ok) {
      warnings.push(`${employee.firstName} ${employee.lastName}: ${distribution.message ?? "invalid salary distribution"}`);
      return;
    }
    if (filters?.legalEntityId && !distribution.weights.some((line) => line.legalEntityId === filters.legalEntityId)) {
      return;
    }
    if (distribution.missingFxCount > 0) {
      warnings.push(`${employee.firstName} ${employee.lastName}: missing FX in fixed distribution.`);
    }

    const breakdown = distribution.weights.map((line) => {
      const weight = line.weightPct / 100;
      const netAmount = round2(compensation.baseSalaryNet * weight);
      const employerCostAmount = round2(compensation.employerCost * weight);
      const bonusAmount = round2(bonusTotalCompCurrency * weight);
      const netEur = round2(convertCurrency(netAmount, compensation.currency, "EUR", fxRates, `${monthKey}-28T00:00:00.000Z`) ?? 0);
      const employerCostEur = round2(
        convertCurrency(employerCostAmount, compensation.currency, "EUR", fxRates, `${monthKey}-28T00:00:00.000Z`) ?? 0,
      );
      const bonusEur = round2(convertCurrency(bonusAmount, compensation.currency, "EUR", fxRates, `${monthKey}-28T00:00:00.000Z`) ?? 0);
      return {
        legalEntityId: line.legalEntityId,
        weightPct: round2(line.weightPct),
        netAmount,
        employerCostAmount,
        bonusAmount,
        currency: compensation.currency,
        netEur,
        employerCostEur,
        bonusEur,
      };
    });

    const netEur = round2(convertCurrency(compensation.baseSalaryNet, compensation.currency, "EUR", fxRates, `${monthKey}-28T00:00:00.000Z`) ?? 0);
    const employerCostEur = round2(
      convertCurrency(compensation.employerCost, compensation.currency, "EUR", fxRates, `${monthKey}-28T00:00:00.000Z`) ?? 0,
    );
    const bonusesEur = round2(
      convertCurrency(bonusTotalCompCurrency, compensation.currency, "EUR", fxRates, `${monthKey}-28T00:00:00.000Z`) ?? 0,
    );

    lines.push({
      id: `hrpline-${snapshotId}-${idx + 1}`,
      snapshotId,
      employeeId: employee.id,
      net: round2(compensation.baseSalaryNet),
      gross: round2(compensation.baseSalaryGross),
      employerCost: round2(compensation.employerCost),
      currency: compensation.currency,
      bonusesTotal: round2(bonusTotalCompCurrency),
      netEur,
      employerCostEur,
      bonusesEur,
      distributionBreakdown: breakdown,
    });
  });

  const byLegalEntityMap = new Map<
    OurEntity,
    {
      legalEntityId: OurEntity;
      netEur: number;
      employerCostEur: number;
      bonusesEur: number;
      headcountEmployees: Set<string>;
    }
  >();
  lines.forEach((line) => {
    line.distributionBreakdown.forEach((entry) => {
      const existing =
        byLegalEntityMap.get(entry.legalEntityId) ??
        ({
          legalEntityId: entry.legalEntityId,
          netEur: 0,
          employerCostEur: 0,
          bonusesEur: 0,
          headcountEmployees: new Set<string>(),
        } as const);
      existing.netEur += entry.netEur;
      existing.employerCostEur += entry.employerCostEur;
      existing.bonusesEur += entry.bonusEur;
      existing.headcountEmployees.add(line.employeeId);
      byLegalEntityMap.set(entry.legalEntityId, existing);
    });
  });

  return {
    lines,
    totals: {
      netEur: round2(lines.reduce((sum, line) => sum + line.netEur, 0)),
      employerCostEur: round2(lines.reduce((sum, line) => sum + line.employerCostEur, 0)),
      bonusesEur: round2(lines.reduce((sum, line) => sum + line.bonusesEur, 0)),
      headcount: lines.length,
      byLegalEntity: Array.from(byLegalEntityMap.values()).map((entry) => ({
        legalEntityId: entry.legalEntityId,
        netEur: round2(entry.netEur),
        employerCostEur: round2(entry.employerCostEur),
        bonusesEur: round2(entry.bonusesEur),
        headcount: entry.headcountEmployees.size,
      })),
    },
    warnings,
  };
}
