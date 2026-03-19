import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, ChevronRight, MapPin, Plus, Users } from "lucide-react";
import { Button, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { UiPageHeader } from "../../ui/UiPageHeader";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 0) return `in ${Math.abs(days)} days`;
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export function EventsListPage() {
  const events = useAppStore((s) => s.events);
  const meetings = useAppStore((s) => s.meetings);
  const eventStaff = useAppStore((s) => s.eventStaff);
  const createEvent = useAppStore((s) => s.createEvent);
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", venue: "", startDate: "", endDate: "", description: "" });

  const sorted = useMemo(() => [...events].sort((a, b) => b.startDate.localeCompare(a.startDate)), [events]);

  return (
    <div className="space-y-5">
      <UiPageHeader
        title="Events"
        subtitle={`${events.length} events`}
        actions={
          <button
            onClick={() => setShowForm((x) => !x)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" /> {showForm ? "Close" : "Add Event"}
          </button>
        }
      />

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">New Event</p>
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              createEvent(form);
              setForm({ name: "", city: "", venue: "", startDate: "", endDate: "", description: "" });
              setShowForm(false);
            }}
          >
            <div><FieldLabel>Name</FieldLabel><input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div><FieldLabel>City</FieldLabel><input className={inputCls} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required /></div>
            <div><FieldLabel>Venue</FieldLabel><input className={inputCls} value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} required /></div>
            <div><FieldLabel>Start date</FieldLabel><input className={inputCls} type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required /></div>
            <div><FieldLabel>End date</FieldLabel><input className={inputCls} type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required /></div>
            <div><FieldLabel>Description</FieldLabel><input className={inputCls} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="md:col-span-3"><Button type="submit">Save event</Button></div>
          </form>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <Calendar className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No events yet</p>
          <p className="text-xs text-gray-400 mt-1">Create your first event to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((event) => {
            const meetingCount = meetings.filter((m) => m.eventId === event.id).length;
            const staffCount = eventStaff.filter((s) => s.eventId === event.id).length;
            return (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm cursor-pointer transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{event.name}</p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.city}</span>
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">{event.startDate} — {event.endDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{staffCount} staff</span>
                  <span>{meetingCount} meetings</span>
                  <span className="text-gray-400">{relativeTime(event.startDate)}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
