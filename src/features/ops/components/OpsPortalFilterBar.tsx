import { Button, FieldLabel } from "../../../components/ui";
import { OpsCaseCategory, OpsSeverity, OpsTrackFilter } from "../../../store/types";
import { OPS_CASE_CATEGORIES } from "../domain/opsCaseTypes";
import { OpsPortalFilters, OpsPortalScope } from "../domain/opsSelectors";

export function OpsPortalFilterBar(props: {
  filters: OpsPortalFilters;
  onChange: (next: OpsPortalFilters) => void;
  showTrack?: boolean;
  defaultTrack?: OpsTrackFilter;
  showScope?: boolean;
  scope?: OpsPortalScope;
  onScopeChange?: (scope: OpsPortalScope) => void;
  categoryOptions?: OpsCaseCategory[];
}) {
  const {
    filters,
    onChange,
    showTrack = true,
    defaultTrack = "ANY",
    showScope = false,
    scope = "ALL",
    onScopeChange,
    categoryOptions = OPS_CASE_CATEGORIES,
  } = props;

  function setCategory(category: OpsCaseCategory | "ANY") {
    onChange({ ...filters, category });
  }

  function setSeverity(severity: OpsSeverity | "ANY") {
    onChange({ ...filters, severity });
  }

  function setTrack(track: OpsTrackFilter) {
    onChange({ ...filters, track });
  }

  function setDateFrom(value: string) {
    onChange({
      ...filters,
      dateRange: {
        from: value || undefined,
        to: filters.dateRange?.to,
      },
    });
  }

  function setDateTo(value: string) {
    onChange({
      ...filters,
      dateRange: {
        from: filters.dateRange?.from,
        to: value || undefined,
      },
    });
  }

  return (
    <div className="grid gap-2 md:grid-cols-8">
      {showTrack && (
        <div>
          <FieldLabel>Track</FieldLabel>
          <select value={filters.track ?? defaultTrack} onChange={(event) => setTrack(event.target.value as OpsTrackFilter)}>
            <option value="ANY">Both</option>
            <option value="SMS">SMS</option>
            <option value="VOICE">Voice</option>
          </select>
        </div>
      )}
      {showScope && (
        <div>
          <FieldLabel>Scope</FieldLabel>
          <select value={scope} onChange={(event) => onScopeChange?.(event.target.value as OpsPortalScope)}>
            <option value="MINE">Mine</option>
            <option value="ALL">All</option>
          </select>
        </div>
      )}
      <div>
        <FieldLabel>Severity</FieldLabel>
        <select value={filters.severity ?? "ANY"} onChange={(event) => setSeverity(event.target.value as OpsSeverity | "ANY")}>
          <option value="ANY">Any</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
        </select>
      </div>
      <div>
        <FieldLabel>Category</FieldLabel>
        <select value={filters.category ?? "ANY"} onChange={(event) => setCategory(event.target.value as OpsCaseCategory | "ANY")}>
          <option value="ANY">Any</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <FieldLabel>Search</FieldLabel>
        <input
          placeholder="Provider, customer, destination"
          value={filters.search ?? ""}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>From</FieldLabel>
        <input type="date" value={filters.dateRange?.from ?? ""} onChange={(event) => setDateFrom(event.target.value)} />
      </div>
      <div>
        <FieldLabel>To</FieldLabel>
        <input type="date" value={filters.dateRange?.to ?? ""} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      <div className="md:col-span-8 flex items-end justify-between">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={(filters.status ?? "ALL") === "OPEN_ONLY"}
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.target.checked ? "OPEN_ONLY" : "ALL",
              })
            }
          />
          Only open cases
        </label>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange({
              track: defaultTrack,
              severity: "ANY",
              category: "ANY",
              status: "ALL",
              search: "",
              dateRange: undefined,
            })
          }
        >
          Reset filters
        </Button>
      </div>
    </div>
  );
}
