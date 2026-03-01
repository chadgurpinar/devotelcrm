import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getCompanyName, getEventName, getUserName } from "../../store/selectors";

export function NotesPage() {
  const state = useAppStore();
  const [eventFilter, setEventFilter] = useState("");
  const [days, setDays] = useState("30");

  const rows = useMemo(() => {
    const threshold = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
    return state.notes
      .filter((note) => (eventFilter ? note.relatedEventId === eventFilter : true))
      .filter((note) => new Date(note.createdAt).getTime() >= threshold)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [days, eventFilter, state.notes]);

  return (
    <div className="space-y-4">
      <Card title="Global Meeting Notes">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <div>
            <FieldLabel>Event filter</FieldLabel>
            <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
              <option value="">All events</option>
              {state.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Created in last days</FieldLabel>
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">7</option>
              <option value="30">30</option>
              <option value="90">90</option>
              <option value="365">365</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {rows.map((note) => (
            <div key={note.id} className="rounded-md border border-slate-200 p-3 text-xs">
              <p className="font-semibold">{note.text}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge>{getCompanyName(state, note.companyId)}</Badge>
                {note.relatedEventId && <Badge>{getEventName(state, note.relatedEventId)}</Badge>}
                <Badge>{getUserName(state, note.createdByUserId)}</Badge>
                {note.reminderAt && <Badge>Reminder: {new Date(note.reminderAt).toLocaleString()}</Badge>}
              </div>
              <p className="mt-1 text-slate-500">
                <Link className="text-brand-700" to={`/companies/${note.companyId}`}>
                  Go to CRM
                </Link>
              </p>
              <div className="mt-2 flex gap-2">
                <Button onClick={() => state.convertNoteToTask(note.id, state.activeUserId)}>Create task</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
