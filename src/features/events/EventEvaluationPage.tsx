import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronRight, Plus } from "lucide-react";
import { useAppStore } from "../../store/db";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";
import type { EventAttendDecision, EventEvaluation } from "../../store/types";

const inputCls = "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const DECISION_BADGE: Record<EventAttendDecision, string> = {
  Attend: "bg-emerald-100 text-emerald-700",
  Skip: "bg-gray-100 text-gray-500",
  Undecided: "bg-amber-100 text-amber-700",
};

function estimatedTotal(ev: EventEvaluation): number {
  const sponsorship = ev.selectedSponsorshipId
    ? (ev.sponsorshipOptions.find((o) => o.id === ev.selectedSponsorshipId)?.priceEur ?? 0)
    : 0;
  const tickets = ev.participationType === "Ticket"
    ? (ev.ticketPricePerPersonEur ?? 0) * ev.estimatedAttendeesCount
    : 0;
  const participation = ev.participationType === "Sponsor" ? sponsorship : tickets;
  const travel = ev.estimatedAttendeesCount * (
    ev.estimatedFlightPerPersonEur +
    ev.estimatedHotelPerPersonEur * ev.estimatedEventDays +
    ev.estimatedDailyExpensePerPersonEur * ev.estimatedEventDays
  );
  return participation + travel;
}

type FilterTab = "all" | "Planned" | "Attend" | "Skip" | "Undecided";

export function EventEvaluationPage() {
  const state = useAppStore();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addEventId, setAddEventId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionInitialized, setSelectionInitialized] = useState(false);

  const yearEvents = useMemo(() => {
    return state.events.filter((e) => {
      if (!e.startDate) return false;
      const y = new Date(e.startDate).getFullYear();
      return y === year;
    });
  }, [state.events, year]);

  const evaluations = useMemo(() => {
    return state.eventEvaluations.filter((ev) => ev.year === year);
  }, [state.eventEvaluations, year]);

  const evalMap = useMemo(() => {
    const m = new Map<string, EventEvaluation>();
    evaluations.forEach((ev) => m.set(ev.eventId, ev));
    return m;
  }, [evaluations]);

  const allRows = useMemo(() => {
    const eventsWithEval = yearEvents.map((event) => ({
      event,
      evaluation: evalMap.get(event.id) ?? null,
    }));
    evaluations.forEach((ev) => {
      if (!eventsWithEval.find((r) => r.event.id === ev.eventId)) {
        const event = state.events.find((e) => e.id === ev.eventId);
        if (event) eventsWithEval.push({ event, evaluation: ev });
      }
    });
    return eventsWithEval;
  }, [yearEvents, evaluations, evalMap, state.events]);

  const rows = useMemo(() => {
    if (filter === "all") return allRows;
    if (filter === "Planned") return allRows.filter((r) => r.evaluation !== null);
    return allRows.filter((r) => {
      const decision = r.evaluation?.attendDecision ?? "Undecided";
      return decision === filter;
    });
  }, [allRows, filter]);

  // Auto-select all Attend events once on load
  if (!selectionInitialized && evaluations.length > 0) {
    const attendIds = new Set(evaluations.filter((ev) => ev.attendDecision === "Attend").map((ev) => ev.eventId));
    setSelectedIds(attendIds);
    setSelectionInitialized(true);
  }

  function toggleSelection(eventId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  const costMap = useMemo(() => {
    const m = new Map<string, number>();
    state.eventCostLineItems.forEach((item) => {
      m.set(item.eventId, (m.get(item.eventId) ?? 0) + item.amountEur);
    });
    return m;
  }, [state.eventCostLineItems]);

  const selectedEvals = useMemo(() => {
    return evaluations.filter((ev) => selectedIds.has(ev.eventId));
  }, [evaluations, selectedIds]);

  const selectedBudget = selectedEvals.reduce((sum, ev) => sum + estimatedTotal(ev), 0);
  const selectedBudgetBuffer = Math.round(selectedBudget * 1.2);

  const attendingEvals = evaluations.filter((ev) => ev.attendDecision === "Attend");

  const unevaluatedEvents = useMemo(() => {
    return state.events.filter((e) => !evalMap.has(e.id));
  }, [state.events, evalMap]);

  function handleAddToPlanning() {
    if (!addEventId) return;
    state.upsertEventEvaluation({
      eventId: addEventId,
      year,
      attendDecision: "Undecided",
      participationType: "Undecided",
      sponsorshipOptions: [],
      estimatedAttendeesCount: 0,
      estimatedFlightPerPersonEur: 0,
      estimatedHotelPerPersonEur: 0,
      estimatedDailyExpensePerPersonEur: 0,
      estimatedEventDays: 2,
    });
    const targetId = addEventId;
    setAddEventId("");
    setAddOpen(false);
    navigate(`/event-evaluation/${targetId}`);
  }

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    state.events.forEach((e) => { if (e.startDate) years.add(new Date(e.startDate).getFullYear()); });
    years.add(currentYear);
    years.add(currentYear + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [state.events, currentYear]);

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "Planned", label: "Planned" },
    { key: "Attend", label: "Attending" },
    { key: "Skip", label: "Skipped" },
    { key: "Undecided", label: "Undecided" },
  ];

  return (
    <div className="space-y-5">
      <UiPageHeader
        title="Event Evaluation"
        subtitle="Plan which events to attend this year"
        actions={
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`w-28 ${inputCls}`}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <UiKpiCard label="Total Events" value={allRows.length} icon={<Calendar className="h-5 w-5" />} />
        <UiKpiCard label="Attending" value={attendingEvals.length} className="border-emerald-200 bg-emerald-50/40" />
        <UiKpiCard
          label="Selected Budget"
          value={selectedBudget > 0 ? `${selectedBudget.toLocaleString("en")} EUR` : "—"}
          trend={selectedBudget > 0 ? { value: `up to ${selectedBudgetBuffer.toLocaleString("en")} EUR`, positive: true } : undefined}
        />
      </div>

      {selectedEvals.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-800">
          If we attend the <strong>{selectedEvals.length}</strong> selected event{selectedEvals.length !== 1 ? "s" : ""}, estimated total budget is between{" "}
          <strong>{selectedBudget.toLocaleString("en")}</strong> and <strong>{selectedBudgetBuffer.toLocaleString("en")} EUR</strong>.
          {selectedEvals.length !== attendingEvals.length && (
            <span className="ml-1 text-indigo-600">({attendingEvals.length} marked as Attend total)</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {filterTabs.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setAddOpen(!addOpen)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
          <Plus className="h-4 w-4" /> Add Event to Plan
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">Select an event</label>
            <select className={`w-full ${inputCls}`} value={addEventId} onChange={(e) => setAddEventId(e.target.value)}>
              <option value="">— Choose event —</option>
              {unevaluatedEvents.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.city})</option>)}
            </select>
          </div>
          <button onClick={handleAddToPlanning} disabled={!addEventId} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">
            Add
          </button>
          <button onClick={() => { setAddOpen(false); setAddEventId(""); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            Cancel
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((r) => selectedIds.has(r.event.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds((prev) => { const next = new Set(prev); rows.forEach((r) => next.add(r.event.id)); return next; });
                    } else {
                      setSelectedIds((prev) => { const next = new Set(prev); rows.forEach((r) => next.delete(r.event.id)); return next; });
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold text-gray-500 uppercase">Event</th>
              <th className="px-3 py-3 text-[10px] font-semibold text-gray-500 uppercase">City</th>
              <th className="px-3 py-3 text-[10px] font-semibold text-gray-500 uppercase">Dates</th>
              <th className="px-3 py-3 text-[10px] font-semibold text-gray-500 uppercase">Decision</th>
              <th className="px-3 py-3 text-[10px] font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-3 py-3 text-[10px] font-semibold text-gray-500 uppercase">Est. Cost</th>
              <th className="px-3 py-3 text-[10px] font-semibold text-gray-500 uppercase">Actual</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ event, evaluation }) => {
              const decision = evaluation?.attendDecision ?? "Undecided";
              const estCost = evaluation ? estimatedTotal(evaluation) : 0;
              const actualCost = costMap.get(event.id) ?? 0;
              const isChecked = selectedIds.has(event.id);
              return (
                <tr
                  key={event.id}
                  className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer ${isChecked ? "bg-indigo-50/20" : ""}`}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelection(event.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                    />
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900" onClick={() => navigate(`/event-evaluation/${event.id}`)}>{event.name}</td>
                  <td className="px-3 py-3 text-sm text-gray-600" onClick={() => navigate(`/event-evaluation/${event.id}`)}>{event.city}</td>
                  <td className="px-3 py-3 text-xs text-gray-500" onClick={() => navigate(`/event-evaluation/${event.id}`)}>
                    {event.startDate && new Date(event.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {event.endDate && ` — ${new Date(event.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                  </td>
                  <td className="px-3 py-3" onClick={() => navigate(`/event-evaluation/${event.id}`)}>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DECISION_BADGE[decision]}`}>{decision}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500" onClick={() => navigate(`/event-evaluation/${event.id}`)}>
                    {evaluation?.participationType === "Sponsor" ? "Sponsor" : evaluation?.participationType === "Ticket" ? "Ticket" : "—"}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-700" onClick={() => navigate(`/event-evaluation/${event.id}`)}>
                    {estCost > 0 ? `${estCost.toLocaleString("en")}` : "—"}
                  </td>
                  <td className="px-3 py-3 text-sm" onClick={() => navigate(`/event-evaluation/${event.id}`)}>
                    {actualCost > 0 ? (
                      <span className="font-medium text-gray-700">{actualCost.toLocaleString("en")}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                    {actualCost > 0 && estCost > 0 && (
                      <span className={`ml-1.5 text-[10px] font-medium ${actualCost > estCost ? "text-rose-600" : "text-emerald-600"}`}>
                        ({actualCost > estCost ? "+" : ""}{(actualCost - estCost).toLocaleString("en")})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3" onClick={() => navigate(`/event-evaluation/${event.id}`)}>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-xs text-gray-400">
                  No events found for {year}. Add events or change the year filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
