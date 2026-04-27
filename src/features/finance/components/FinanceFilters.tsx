import { MultiSelectDropdown } from "../../../ui/MultiSelectDropdown";
import type { FinCounterpartyType, FinDirection, FinTxStatus, OurEntity } from "../../../store/types";
import type { FinanceArApDateField, FinanceArApFilters } from "../useFinanceArAp";

const inputCls =
  "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function FinanceFilters({
  value,
  onChange,
}: {
  value: FinanceArApFilters;
  onChange: (next: FinanceArApFilters) => void;
}) {
  const entities = ["USA", "UK", "TR"] as OurEntity[];
  const statuses = ["Open", "PartiallyPaid", "Overdue", "Planned", "Paid", "Cancelled"] as FinTxStatus[];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Entity</label>
          <MultiSelectDropdown
            label="Select entities…"
            items={entities}
            selectedIds={value.entityIds}
            getItemId={(e) => e}
            getItemLabel={(e) => e}
            onToggle={(id) => {
              const next = value.entityIds.includes(id as OurEntity)
                ? value.entityIds.filter((x) => x !== (id as OurEntity))
                : [...value.entityIds, id as OurEntity];
              onChange({ ...value, entityIds: next.length ? next : [...entities] });
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Type</label>
          <select
            className={inputCls}
            value={value.counterpartyType}
            onChange={(e) => onChange({ ...value, counterpartyType: e.target.value as FinCounterpartyType | "All" })}
          >
            <option value="All">All</option>
            <option value="Customer">Customer</option>
            <option value="Provider">Provider</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Direction</label>
          <select
            className={inputCls}
            value={value.direction}
            onChange={(e) => onChange({ ...value, direction: e.target.value as FinDirection | "All" })}
          >
            <option value="All">All</option>
            <option value="Receivable">Receivable</option>
            <option value="Payable">Payable</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Status</label>
          <MultiSelectDropdown
            label="All statuses"
            items={statuses}
            selectedIds={value.statuses}
            getItemId={(s) => s}
            getItemLabel={(s) => s}
            onToggle={(id) => {
              const s = id as FinTxStatus;
              const next = value.statuses.includes(s) ? value.statuses.filter((x) => x !== s) : [...value.statuses, s];
              onChange({ ...value, statuses: next });
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Date field</label>
          <select
            className={inputCls}
            value={value.dateField}
            onChange={(e) => onChange({ ...value, dateField: e.target.value as FinanceArApDateField })}
          >
            <option value="dueDate">Due date</option>
            <option value="issueDate">Issue date</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">From</label>
          <input type="date" className={inputCls} value={value.fromYmd} onChange={(e) => onChange({ ...value, fromYmd: e.target.value })} />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">To</label>
          <input type="date" className={inputCls} value={value.toYmd} onChange={(e) => onChange({ ...value, toYmd: e.target.value })} />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Search</label>
          <input
            className={inputCls}
            placeholder="Counterparty or description…"
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
          />
        </div>
      </div>
    </section>
  );
}

