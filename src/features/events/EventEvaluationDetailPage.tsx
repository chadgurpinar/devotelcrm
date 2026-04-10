import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useAppStore } from "../../store/db";
import { UiPageHeader } from "../../ui/UiPageHeader";
import type { EventAttendDecision, EventParticipationType, EventSponsorshipOption } from "../../store/types";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const cardCls = "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden";

let tempSponsorCounter = 0;

export function EventEvaluationDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const state = useAppStore();
  const event = state.events.find((e) => e.id === eventId);
  const currentYear = new Date().getFullYear();

  const existing = useMemo(
    () => state.eventEvaluations.find((ev) => ev.eventId === eventId && ev.year === currentYear) ?? null,
    [state.eventEvaluations, eventId, currentYear],
  );

  const [attendDecision, setAttendDecision] = useState<EventAttendDecision>(existing?.attendDecision ?? "Undecided");
  const [participationType, setParticipationType] = useState<EventParticipationType>(existing?.participationType ?? "Undecided");
  const [sponsorshipOptions, setSponsorshipOptions] = useState<EventSponsorshipOption[]>(existing?.sponsorshipOptions ?? []);
  const [selectedSponsorshipId, setSelectedSponsorshipId] = useState(existing?.selectedSponsorshipId ?? "");
  const [ticketPrice, setTicketPrice] = useState(existing?.ticketPricePerPersonEur ?? 0);
  const [attendeesCount, setAttendeesCount] = useState(existing?.estimatedAttendeesCount ?? 2);
  const [eventDays, setEventDays] = useState(existing?.estimatedEventDays ?? 2);
  const [flightPerPerson, setFlightPerPerson] = useState(existing?.estimatedFlightPerPersonEur ?? 0);
  const [hotelPerPerson, setHotelPerPerson] = useState(existing?.estimatedHotelPerPersonEur ?? 0);
  const [dailyExpense, setDailyExpense] = useState(existing?.estimatedDailyExpensePerPersonEur ?? 0);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setAttendDecision(existing.attendDecision);
    setParticipationType(existing.participationType);
    setSponsorshipOptions(existing.sponsorshipOptions);
    setSelectedSponsorshipId(existing.selectedSponsorshipId ?? "");
    setTicketPrice(existing.ticketPricePerPersonEur ?? 0);
    setAttendeesCount(existing.estimatedAttendeesCount);
    setEventDays(existing.estimatedEventDays);
    setFlightPerPerson(existing.estimatedFlightPerPersonEur);
    setHotelPerPerson(existing.estimatedHotelPerPersonEur);
    setDailyExpense(existing.estimatedDailyExpensePerPersonEur);
    setNotes(existing.notes ?? "");
  }, [existing]);

  const participationCost = useMemo(() => {
    if (participationType === "Sponsor") {
      return sponsorshipOptions.find((o) => o.id === selectedSponsorshipId)?.priceEur ?? 0;
    }
    if (participationType === "Ticket") {
      return ticketPrice * attendeesCount;
    }
    return 0;
  }, [participationType, sponsorshipOptions, selectedSponsorshipId, ticketPrice, attendeesCount]);

  const travelCost = useMemo(() => {
    return attendeesCount * (
      flightPerPerson +
      hotelPerPerson * eventDays +
      dailyExpense * eventDays
    );
  }, [attendeesCount, flightPerPerson, hotelPerPerson, dailyExpense, eventDays]);

  const totalEstimated = participationCost + travelCost;

  const handleSave = useCallback(() => {
    if (!eventId || !event) return;
    state.upsertEventEvaluation({
      eventId,
      year: currentYear,
      attendDecision,
      participationType,
      sponsorshipOptions,
      selectedSponsorshipId: selectedSponsorshipId || undefined,
      ticketPricePerPersonEur: ticketPrice,
      estimatedAttendeesCount: attendeesCount,
      estimatedFlightPerPersonEur: flightPerPerson,
      estimatedHotelPerPersonEur: hotelPerPerson,
      estimatedDailyExpensePerPersonEur: dailyExpense,
      estimatedEventDays: eventDays,
      notes: notes.trim() || undefined,
    });
    const nextStatus = attendDecision === "Attend" ? "Planned" as const
      : attendDecision === "Skip" ? "Skipped" as const
      : undefined;
    if (event.planningStatus !== nextStatus) {
      state.updateEvent({ ...event, planningStatus: nextStatus });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [eventId, event, currentYear, attendDecision, participationType, sponsorshipOptions, selectedSponsorshipId, ticketPrice, attendeesCount, flightPerPerson, hotelPerPerson, dailyExpense, eventDays, notes, state]);

  function addSponsorOption() {
    tempSponsorCounter++;
    setSponsorshipOptions((prev) => [...prev, { id: `so-new-${tempSponsorCounter}`, label: "", priceEur: 0 }]);
  }
  function removeSponsorOption(id: string) {
    setSponsorshipOptions((prev) => prev.filter((o) => o.id !== id));
    if (selectedSponsorshipId === id) setSelectedSponsorshipId("");
  }
  function updateSponsorOption(id: string, field: "label" | "priceEur", value: string | number) {
    setSponsorshipOptions((prev) => prev.map((o) => o.id === id ? { ...o, [field]: value } : o));
  }

  if (!event || !eventId) {
    return (
      <div className="space-y-4">
        <Link to="/event-evaluation" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
          <ChevronLeft className="h-4 w-4" /> Back to Event Evaluation
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Event not found.</div>
      </div>
    );
  }

  const decisionButtons: { key: EventAttendDecision; label: string; cls: string; activeCls: string }[] = [
    { key: "Attend", label: "Attend", cls: "text-gray-600 hover:bg-emerald-50", activeCls: "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/30" },
    { key: "Skip", label: "Skip", cls: "text-gray-600 hover:bg-gray-100", activeCls: "bg-gray-200 text-gray-800 ring-2 ring-gray-400/30" },
    { key: "Undecided", label: "Undecided", cls: "text-gray-500 hover:bg-amber-50", activeCls: "bg-amber-100 text-amber-700 ring-2 ring-amber-500/30" },
  ];

  const typeButtons: { key: EventParticipationType; label: string }[] = [
    { key: "Sponsor", label: "Sponsor" },
    { key: "Ticket", label: "Buy Tickets" },
  ];

  return (
    <div className="space-y-5">
      <Link to="/event-evaluation" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
        <ChevronLeft className="h-4 w-4" /> Event Evaluation
      </Link>

      <UiPageHeader
        title={event.name}
        subtitle={`${event.city}${event.venue ? `, ${event.venue}` : ""} — ${event.startDate} to ${event.endDate}`}
        actions={
          <Link to={`/events/${eventId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <ExternalLink className="h-3.5 w-3.5" /> View Full Event
          </Link>
        }
      />

      {/* Decision card */}
      <div className={cardCls}>
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Attendance Decision</h3>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="flex gap-2">
            {decisionButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setAttendDecision(btn.key)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${attendDecision === btn.key ? btn.activeCls : btn.cls} border border-gray-200`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {attendDecision === "Attend" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Participation Type</label>
                <div className="flex gap-2">
                  {typeButtons.map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => setParticipationType(btn.key)}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium border transition ${participationType === btn.key ? "bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-500/20" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {participationType === "Sponsor" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Sponsorship Options</label>
                  <div className="space-y-2">
                    {sponsorshipOptions.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="selectedSponsorship"
                          checked={selectedSponsorshipId === opt.id}
                          onChange={() => setSelectedSponsorshipId(opt.id)}
                          className="h-4 w-4 text-indigo-600"
                        />
                        <input
                          className={`flex-1 ${inputCls}`}
                          placeholder="Package name"
                          value={opt.label}
                          onChange={(e) => updateSponsorOption(opt.id, "label", e.target.value)}
                        />
                        <input
                          type="number"
                          className={`w-32 ${inputCls}`}
                          placeholder="Price EUR"
                          value={opt.priceEur || ""}
                          onChange={(e) => updateSponsorOption(opt.id, "priceEur", Number(e.target.value))}
                        />
                        <button onClick={() => removeSponsorOption(opt.id)} className="text-gray-400 hover:text-rose-500 transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addSponsorOption} className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-700">
                      <Plus className="h-3.5 w-3.5" /> Add option
                    </button>
                  </div>
                </div>
              )}

              {participationType === "Ticket" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Ticket Price per Person (EUR)</label>
                  <input type="number" className={`w-48 ${inputCls}`} value={ticketPrice || ""} onChange={(e) => setTicketPrice(Number(e.target.value))} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Number of Attendees</label>
                  <input type="number" className={inputCls} value={attendeesCount || ""} onChange={(e) => setAttendeesCount(Number(e.target.value))} min={1} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Estimated Event Days</label>
                  <input type="number" className={inputCls} value={eventDays || ""} onChange={(e) => setEventDays(Number(e.target.value))} min={1} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Travel estimates card */}
      {attendDecision === "Attend" && (
        <div className={cardCls}>
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Travel Cost Estimates</h3>
            <p className="text-[10px] text-gray-400">Per person — will be multiplied by attendee count</p>
          </div>
          <div className="px-4 py-4 grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Flight (EUR)</label>
              <input type="number" className={inputCls} value={flightPerPerson || ""} onChange={(e) => setFlightPerPerson(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Hotel / night (EUR)</label>
              <input type="number" className={inputCls} value={hotelPerPerson || ""} onChange={(e) => setHotelPerPerson(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Daily expense (EUR)</label>
              <input type="number" className={inputCls} value={dailyExpense || ""} onChange={(e) => setDailyExpense(Number(e.target.value))} />
            </div>
          </div>
        </div>
      )}

      {/* Budget summary card */}
      <div className={cardCls}>
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Budget Summary</h3>
        </div>
        <div className="px-4 py-4">
          {attendDecision === "Skip" ? (
            <p className="text-sm text-gray-500">Event marked as skipped — no budget allocated.</p>
          ) : attendDecision === "Undecided" ? (
            <p className="text-sm text-gray-500">Decision pending — fill in estimates after deciding.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Participation cost</span>
                <span className="font-medium text-gray-900">{participationCost.toLocaleString("en")} EUR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Travel cost ({attendeesCount} people x {eventDays} days)</span>
                <span className="font-medium text-gray-900">{travelCost.toLocaleString("en")} EUR</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
                <span className="font-semibold text-gray-800">Total Estimated</span>
                <span className="font-bold text-lg text-indigo-700">{totalEstimated.toLocaleString("en")} EUR</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className={cardCls}>
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Notes</h3>
        </div>
        <div className="px-4 py-4">
          <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Internal notes about this event evaluation..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
        <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition">
          Save Evaluation
        </button>
      </div>
    </div>
  );
}
