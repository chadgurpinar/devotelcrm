import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertOctagon, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { ConfirmModal, StatusBadge } from "../components/primitives";
import { categoryLabel, formatPeriod, severityTone } from "./utils";
import { entityLabel, formatDateTime } from "../compensation/utils";
import { Hr2ExceptionCategory, Hr2ExceptionSeverity } from "../../../store/types";

const CATEGORY_OPTIONS: Array<{ id: "all" | Hr2ExceptionCategory; label: string }> = [
  { id: "all", label: "All categories" },
  { id: "MissingBank", label: "Missing bank" },
  { id: "PendingCompChange", label: "Pending change" },
  { id: "FxReviewNeeded", label: "FX review" },
  { id: "EntityMismatch", label: "Entity mismatch" },
  { id: "DocumentsMissing", label: "Documents missing" },
  { id: "ComplianceHold", label: "Compliance hold" },
  { id: "DataIncomplete", label: "Data incomplete" },
];

export function Hr2PayrollExceptionsPage() {
  const params = useParams<{ cycleId: string }>();
  const cycleId = params.cycleId ?? "";
  const navigate = useNavigate();

  const cycle = useAppStore((s) => s.hr2PayrollCycles.find((c) => c.id === cycleId));
  const exceptions = useAppStore((s) => s.hr2PayrollExceptions.filter((e) => e.cycleId === cycleId));
  const lines = useAppStore((s) => s.hr2PayrollCycleLines.filter((l) => l.cycleId === cycleId));
  const activeUserId = useAppStore((s) => s.activeUserId);
  const resolve = useAppStore((s) => s.resolveHr2PayrollException);

  const [categoryFilter, setCategoryFilter] = useState<"all" | Hr2ExceptionCategory>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | Hr2ExceptionSeverity>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Open" | "Resolved">("all");
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const filtered = useMemo(() => {
    return exceptions
      .slice()
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "Open" ? -1 : 1;
        if (a.severity !== b.severity) return a.severity === "Blocker" ? -1 : 1;
        return a.detectedAt.localeCompare(b.detectedAt);
      })
      .filter((ex) => {
        if (categoryFilter !== "all" && ex.category !== categoryFilter) return false;
        if (severityFilter !== "all" && ex.severity !== severityFilter) return false;
        if (statusFilter !== "all" && ex.status !== statusFilter) return false;
        return true;
      });
  }, [exceptions, categoryFilter, severityFilter, statusFilter]);

  if (!cycle) {
    return (
      <div className="p-6">
        <UiPageHeader title="Cycle not found" />
        <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/payroll")}>
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
      </div>
    );
  }

  const handleConfirmResolve = () => {
    if (resolveId) {
      resolve(resolveId, activeUserId, resolveNote.trim() || undefined);
    }
    setResolveId(null);
    setResolveNote("");
  };

  return (
    <div className="p-6">
      <Link
        to={`/hr2/payroll/${cycle.id}`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to cycle
      </Link>
      <UiPageHeader
        title={`Exceptions · ${formatPeriod(cycle.period)} ${entityLabel(cycle.legalEntityId)}`}
        subtitle="Every blocker and warning on this cycle. Resolve all blockers before approval."
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel>Category</FieldLabel>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as "all" | Hr2ExceptionCategory)}
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
            <FieldLabel>Severity</FieldLabel>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as "all" | Hr2ExceptionSeverity)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All severities</option>
              <option value="Blocker">Blocker</option>
              <option value="Warning">Warning</option>
            </select>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "Open" | "Resolved")}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="Open">Open</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </Card>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">No exceptions match the filters.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((ex) => {
              const line = lines.find((l) => l.id === ex.cycleLineId);
              return (
                <li key={ex.id} className="flex items-start gap-3 p-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      ex.severity === "Blocker" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {ex.severity === "Blocker" ? <AlertOctagon size={14} /> : <AlertTriangle size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{line?.employeeFullName ?? ex.employeeId}</p>
                      <StatusBadge label={categoryLabel(ex.category)} tone={severityTone(ex.severity)} dot />
                      <StatusBadge
                        label={ex.status}
                        tone={ex.status === "Resolved" ? "success" : "neutral"}
                        size="sm"
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{ex.message}</p>
                    <p className="text-[11px] text-slate-400">Detected {formatDateTime(ex.detectedAt)}</p>
                    {ex.resolutionNote && (
                      <p className="mt-1 text-[11px] text-emerald-700">Resolution: {ex.resolutionNote}</p>
                    )}
                  </div>
                  {ex.status === "Open" && (
                    <Button size="sm" variant="secondary" onClick={() => setResolveId(ex.id)}>
                      <CheckCircle2 size={14} className="mr-1" /> Resolve
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmModal
        open={Boolean(resolveId)}
        title="Resolve exception?"
        description={
          <div>
            <p className="mb-2 text-sm text-slate-600">Add a note for the audit trail (optional).</p>
            <textarea
              rows={3}
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="e.g. Bank details now on file."
            />
          </div>
        }
        confirmLabel="Resolve"
        onConfirm={handleConfirmResolve}
        onCancel={() => { setResolveId(null); setResolveNote(""); }}
      />
    </div>
  );
}
