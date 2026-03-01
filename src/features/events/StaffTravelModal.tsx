import { useState } from "react";
import { Button, FieldLabel } from "../../components/ui";
import { EventStaff } from "../../store/types";
import { useAppStore } from "../../store/db";
import { toInputDate, toInputTime } from "../../utils/datetime";

interface StaffTravelModalProps {
  eventId: string;
  mode: "create" | "edit";
  row?: EventStaff;
  onClose: () => void;
}

function toDateTimeInput(value: string): string {
  if (!value) return "";
  return `${toInputDate(value)}T${toInputTime(value)}`;
}

function fromDateTimeInput(value: string): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

export function StaffTravelModal({ eventId, mode, row, onClose }: StaffTravelModalProps) {
  const store = useAppStore();
  const initial = row;
  const [form, setForm] = useState({
    userId: initial?.userId ?? store.users[0]?.id ?? "",
    flightOutNumber: initial?.flightOutNumber ?? "",
    flightOutDepartAt: initial?.flightOutDepartAt ? toDateTimeInput(initial.flightOutDepartAt) : "",
    flightOutArriveAt: initial?.flightOutArriveAt ? toDateTimeInput(initial.flightOutArriveAt) : "",
    flightBackNumber: initial?.flightBackNumber ?? "",
    flightBackDepartAt: initial?.flightBackDepartAt ? toDateTimeInput(initial.flightBackDepartAt) : "",
    flightBackArriveAt: initial?.flightBackArriveAt ? toDateTimeInput(initial.flightBackArriveAt) : "",
    pnr: initial?.pnr ?? "",
    hotelName: initial?.hotelName ?? "",
    checkIn: initial?.checkIn ?? "",
    checkOut: initial?.checkOut ?? "",
    bookingRef: initial?.bookingRef ?? "",
  });

  function save() {
    const payload = {
      eventId,
      userId: form.userId,
      flightOutNumber: form.flightOutNumber,
      flightOutDepartAt: fromDateTimeInput(form.flightOutDepartAt),
      flightOutArriveAt: fromDateTimeInput(form.flightOutArriveAt),
      flightBackNumber: form.flightBackNumber,
      flightBackDepartAt: fromDateTimeInput(form.flightBackDepartAt),
      flightBackArriveAt: fromDateTimeInput(form.flightBackArriveAt),
      pnr: form.pnr,
      hotelName: form.hotelName,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      bookingRef: form.bookingRef,
    };

    if (mode === "create") {
      store.addEventStaff(payload);
    } else if (row) {
      store.updateEventStaff({
        ...payload,
        id: row.id,
      });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            {mode === "create" ? "Add staff travel" : "Edit staff travel"}
          </h3>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <div>
            <FieldLabel>Employee</FieldLabel>
            <select value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
              {store.users.map((u) => (
                <option value={u.id} key={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>PNR</FieldLabel>
            <input value={form.pnr} onChange={(e) => setForm((f) => ({ ...f, pnr: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Hotel</FieldLabel>
            <input value={form.hotelName} onChange={(e) => setForm((f) => ({ ...f, hotelName: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Booking ref</FieldLabel>
            <input value={form.bookingRef} onChange={(e) => setForm((f) => ({ ...f, bookingRef: e.target.value }))} />
          </div>

          <div>
            <FieldLabel>Check in</FieldLabel>
            <input type="date" value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Check out</FieldLabel>
            <input type="date" value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-700">Outbound flight</p>
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <FieldLabel>Flight number</FieldLabel>
              <input
                value={form.flightOutNumber}
                onChange={(e) => setForm((f) => ({ ...f, flightOutNumber: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Depart at</FieldLabel>
              <input
                type="datetime-local"
                value={form.flightOutDepartAt}
                onChange={(e) => setForm((f) => ({ ...f, flightOutDepartAt: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Arrive at</FieldLabel>
              <input
                type="datetime-local"
                value={form.flightOutArriveAt}
                onChange={(e) => setForm((f) => ({ ...f, flightOutArriveAt: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-700">Return flight</p>
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <FieldLabel>Flight number</FieldLabel>
              <input
                value={form.flightBackNumber}
                onChange={(e) => setForm((f) => ({ ...f, flightBackNumber: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Depart at</FieldLabel>
              <input
                type="datetime-local"
                value={form.flightBackDepartAt}
                onChange={(e) => setForm((f) => ({ ...f, flightBackDepartAt: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Arrive at</FieldLabel>
              <input
                type="datetime-local"
                value={form.flightBackArriveAt}
                onChange={(e) => setForm((f) => ({ ...f, flightBackArriveAt: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={save}>{mode === "create" ? "Add attendee" : "Save changes"}</Button>
          {mode === "edit" && row && (
            <Button
              variant="danger"
              onClick={() => {
                store.deleteEventStaff(row.id);
                onClose();
              }}
            >
              Remove attendee
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
