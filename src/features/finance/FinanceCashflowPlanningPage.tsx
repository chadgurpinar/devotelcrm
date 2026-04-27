import { useAppStore } from "../../store/db";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { CashflowChart } from "./components/CashflowChart";
import { CashflowFilters } from "./components/CashflowFilters";
import { CashflowKpiStrip } from "./components/CashflowKpiStrip";
import { EntitySummaryTable } from "./components/EntitySummaryTable";
import { InternalExpensesPanel } from "./components/InternalExpensesPanel";
import { UpcomingPanel } from "./components/UpcomingPanel";
import { useCashflowPlan } from "./useCashflowPlan";

export function FinanceCashflowPlanningPage() {
  const { filters, setFilters, setPreset, cashflow, inflowItems, outflowItems } = useCashflowPlan();
  const expenses = useAppStore((s) => s.finInternalExpenses);

  const visibleExpenses = expenses.filter((e) => filters.entityIds.includes(e.entityId));

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 pb-10">
      <UiPageHeader
        title="Finance — Cashflow Planning"
        subtitle="Projected cash position combining open AR/AP, projections, and internal recurring expenses (EUR-normalized)."
      />

      <CashflowFilters value={filters} onChange={setFilters} onPreset={setPreset} />

      <CashflowKpiStrip cashflow={cashflow} />

      <CashflowChart buckets={cashflow.buckets} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <UpcomingPanel title="Upcoming receivables" items={inflowItems} emptyMessage="No expected inflows in range." />
        <UpcomingPanel title="Upcoming payables" items={outflowItems} emptyMessage="No expected outflows in range." />
        <InternalExpensesPanel expenses={visibleExpenses} />
      </div>

      <EntitySummaryTable cashflow={cashflow} />
    </div>
  );
}
