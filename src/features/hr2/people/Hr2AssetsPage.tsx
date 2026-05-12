import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  Headphones,
  Laptop,
  Monitor,
  Smartphone,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { EmptyState, StatusBadge } from "../components/primitives";
import { entityLabel, formatDate } from "../compensation/utils";
import { HrAssetCategory, HrAssetStatus, OurEntity } from "../../../store/types";

const STATUS_OPTIONS: Array<{ id: "all" | HrAssetStatus; label: string }> = [
  { id: "all", label: "All statuses" },
  { id: "Available", label: "Available" },
  { id: "Assigned", label: "Assigned" },
  { id: "Returned", label: "Returned" },
  { id: "Retired", label: "Retired" },
  { id: "Lost", label: "Lost" },
  { id: "Stolen", label: "Stolen" },
];

const CATEGORY_OPTIONS: Array<{ id: "all" | HrAssetCategory; label: string }> = [
  { id: "all", label: "All categories" },
  { id: "Laptop", label: "Laptop" },
  { id: "Phone", label: "Phone" },
  { id: "Monitor", label: "Monitor" },
  { id: "Accessory", label: "Accessory" },
  { id: "Other", label: "Other" },
];

export function Hr2AssetsPage() {
  const navigate = useNavigate();
  const assets = useAppStore((s) => s.hrAssets);
  const employees = useAppStore((s) => s.hrEmployees);

  const [statusFilter, setStatusFilter] = useState<"all" | HrAssetStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | HrAssetCategory>("all");
  const [entityFilter, setEntityFilter] = useState<"all" | OurEntity>("all");

  const enriched = useMemo(() => {
    return assets.map((asset) => ({
      asset,
      assignee: asset.assignedToEmployeeId
        ? employees.find((e) => e.id === asset.assignedToEmployeeId)
        : undefined,
    }));
  }, [assets, employees]);

  const filtered = useMemo(() => {
    return enriched
      .filter((row) => {
        if (statusFilter !== "all" && row.asset.status !== statusFilter) return false;
        if (categoryFilter !== "all" && row.asset.category !== categoryFilter) return false;
        if (entityFilter !== "all" && row.assignee && row.assignee.legalEntityId !== entityFilter) return false;
        return true;
      })
      .sort((a, b) => b.asset.updatedAt.localeCompare(a.asset.updatedAt));
  }, [enriched, statusFilter, categoryFilter, entityFilter]);

  const kpis = useMemo(() => {
    const available = assets.filter((a) => a.status === "Available").length;
    const assigned = assets.filter((a) => a.status === "Assigned").length;
    const retired = assets.filter((a) => a.status === "Retired" || a.status === "Lost" || a.status === "Stolen").length;
    return { total: assets.length, available, assigned, retired };
  }, [assets]);

  return (
    <div className="p-6">
      <UiPageHeader
        title="Assets (HR Module 2 view)"
        subtitle="Read-only mirror of the existing asset register, scoped for HR Module 2 navigation."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total assets" value={kpis.total} icon={<Archive size={14} />} tone="neutral" />
        <Stat label="Assigned" value={kpis.assigned} icon={<Laptop size={14} />} tone="indigo" />
        <Stat label="Available" value={kpis.available} icon={<Monitor size={14} />} tone="success" />
        <Stat label="Retired / lost" value={kpis.retired} icon={<Archive size={14} />} tone="warning" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel>Status</FieldLabel>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | HrAssetStatus)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as "all" | HrAssetCategory)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Assignee entity</FieldLabel>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as "all" | OurEntity)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All entities</option>
              <option value="UK">UK</option>
              <option value="USA">USA</option>
              <option value="TR">TR</option>
            </select>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Laptop size={20} />}
          title="No assets match filters"
          description="Reset the filters to see the full HR2 asset list."
        />
      ) : (
        <Card padded={false}>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Asset</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Assignee</th>
                <th className="px-3 py-2 text-left">Assigned</th>
                <th className="px-3 py-2 text-left">Serial / IMEI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ asset, assignee }) => (
                <tr
                  key={asset.id}
                  className={`border-t border-slate-100 ${assignee ? "cursor-pointer hover:bg-slate-50" : ""}`}
                  onClick={() => assignee && navigate(`/hr2/people/${assignee.id}`)}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={asset.category} />
                      <div>
                        <p className="font-semibold text-slate-800">{asset.name}</p>
                        {asset.warrantyEndsAt && (
                          <p className="text-[11px] text-slate-400">
                            Warranty ends {formatDate(asset.warrantyEndsAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{asset.category}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      label={asset.status}
                      tone={
                        asset.status === "Assigned"
                          ? "indigo"
                          : asset.status === "Available"
                            ? "success"
                            : asset.status === "Lost" || asset.status === "Stolen"
                              ? "danger"
                              : "neutral"
                      }
                      dot
                    />
                  </td>
                  <td className="px-3 py-2">
                    {assignee ? (
                      <div>
                        <p className="font-semibold text-slate-800">{assignee.displayName}</p>
                        <p className="text-[11px] text-slate-400">{entityLabel(assignee.legalEntityId)}</p>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {asset.assignedAt ? formatDate(asset.assignedAt) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {asset.serialNumber ?? asset.imei ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="mt-6">
        <p className="text-xs text-slate-600">
          Asset records are managed in the original HR module. This view is a navigation-friendly mirror.
        </p>
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={() => navigate("/hr/assets")}>
            Open HR · Assets (original module)
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CategoryIcon({ category }: { category: HrAssetCategory }) {
  const Icon = {
    Laptop,
    Phone: Smartphone,
    Monitor,
    Accessory: Headphones,
    Other: Archive,
  }[category];
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon size={14} />
    </span>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "neutral" | "indigo" | "success" | "warning";
}) {
  const c = {
    neutral: "text-slate-700",
    indigo: "text-indigo-700",
    success: "text-emerald-700",
    warning: "text-amber-700",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className={`mt-0.5 text-2xl font-bold tabular-nums ${c}`}>{value}</p>
        </div>
        <span className="text-slate-300">{icon}</span>
      </div>
    </div>
  );
}
