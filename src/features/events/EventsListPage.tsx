import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";

export function EventsListPage() {
  const events = useAppStore((s) => s.events);
  const meetings = useAppStore((s) => s.meetings);
  const eventStaff = useAppStore((s) => s.eventStaff);
  const createEvent = useAppStore((s) => s.createEvent);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    venue: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  return (
    <div className="space-y-4">
      <Card
        title="Events"
        actions={
          <Button onClick={() => setShowForm((x) => !x)}>{showForm ? "Close" : "Create event"}</Button>
        }
      >
        {showForm && (
          <form
            className="mb-4 grid gap-2 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              createEvent(form);
              setForm({
                name: "",
                city: "",
                venue: "",
                startDate: "",
                endDate: "",
                description: "",
              });
              setShowForm(false);
            }}
          >
            <div>
              <FieldLabel>Name</FieldLabel>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <FieldLabel>City</FieldLabel>
              <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
            </div>
            <div>
              <FieldLabel>Venue</FieldLabel>
              <input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} required />
            </div>
            <div>
              <FieldLabel>Start date</FieldLabel>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel>End date</FieldLabel>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Save event</Button>
            </div>
          </form>
        )}
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>City</th>
              <th>Date range</th>
              <th>Meetings</th>
              <th>Staff</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.name}</td>
                <td>{event.city}</td>
                <td>
                  {event.startDate} - {event.endDate}
                </td>
                <td>{meetings.filter((m) => m.eventId === event.id).length}</td>
                <td>{eventStaff.filter((s) => s.eventId === event.id).length}</td>
                <td>
                  <Link to={`/events/${event.id}`} className="text-xs font-semibold text-brand-700">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
