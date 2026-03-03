import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, FieldLabel, StatCard } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getCompanyName, getContactName, getUserName } from "../../store/selectors";
import { formatDay, formatTime, localDateKey, startOfDay, toInputTime } from "../../utils/datetime";
import { EventStaff, Meeting } from "../../store/types";
import { MeetingModal } from "./MeetingModal";
import { EventCalendar2Day } from "./EventCalendar2Day";
import { StaffTravelModal } from "./StaffTravelModal";
import { MeetingCard } from "./MeetingCard";
import { MeetingStartModal } from "./MeetingStartModal";

type Tab = "Stream Board" | "Meetings List" | "Event Notes" | "Team Travel";

function toDateTimeLocalInput(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const state = useAppStore();
  const event = state.events.find((e) => e.id === eventId);
  const [tab, setTab] = useState<Tab>("Stream Board");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [meetingDayFilter, setMeetingDayFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<{ date: string; time: string } | undefined>(undefined);
  const [embeddedCreateVersion, setEmbeddedCreateVersion] = useState(0);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [startingMeeting, setStartingMeeting] = useState<Meeting | null>(null);
  const [staffCreateOpen, setStaffCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<EventStaff | null>(null);

  const [noteText, setNoteText] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [noteCompanyId, setNoteCompanyId] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingReminderAt, setEditingReminderAt] = useState("");
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const allEventMeetings = useMemo(() => {
    if (!eventId) return [];
    return state.meetings
      .filter((m) => m.eventId === eventId)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [eventId, state.meetings]);
  const eventMeetings = useMemo(() => {
    return allEventMeetings
      .filter((m) => (ownerFilter ? m.ownerUserId === ownerFilter : true))
      .filter((m) => (meetingDayFilter !== "all" ? localDateKey(m.startAt) === meetingDayFilter : true))
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [allEventMeetings, meetingDayFilter, ownerFilter]);

  const eventNotes = useMemo(
    () => state.notes.filter((n) => n.relatedEventId === eventId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [eventId, state.notes],
  );
  const eventStaff = useMemo(
    () => state.eventStaff.filter((x) => x.eventId === eventId),
    [eventId, state.eventStaff],
  );
  const eventCompanies = useMemo(() => {
    const ids = Array.from(new Set(allEventMeetings.map((meeting) => meeting.companyId)));
    return ids
      .map((id) => state.companies.find((company) => company.id === id))
      .filter((company): company is NonNullable<typeof company> => Boolean(company));
  }, [allEventMeetings, state.companies]);
  const noteCompanyOptions = useMemo(
    () => (eventCompanies.length > 0 ? eventCompanies : state.companies),
    [eventCompanies, state.companies],
  );

  useEffect(() => {
    if (!noteCompanyOptions.length) {
      if (noteCompanyId) setNoteCompanyId("");
      return;
    }
    if (!noteCompanyOptions.some((company) => company.id === noteCompanyId)) {
      setNoteCompanyId(noteCompanyOptions[0].id);
    }
  }, [noteCompanyId, noteCompanyOptions]);

  if (!event || !eventId) {
    return (
      <Card title="Event not found">
        <Link to="/events" className="text-xs font-semibold text-brand-700">
          Back to events
        </Link>
      </Card>
    );
  }

  const salesUsers = state.users.filter((u) => u.role === "Sales");
  const leadsCreated = eventCompanies.filter((company) => company.companyStatus === "LEAD").length;
  const completedCount = allEventMeetings.filter((meeting) => meeting.status === "Completed").length;
  const teamMemberCount = new Set(eventStaff.map((row) => row.userId)).size;
  const dayFilterOptions = useMemo(() => {
    const start = startOfDay(event.startDate);
    const end = startOfDay(event.endDate);
    const options: Array<{ value: string; label: string }> = [{ value: "all", label: "All days" }];
    const preEvent = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const afterEvent = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    const dayLabel = (date: Date) =>
      new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(date);
    options.push({ value: localDateKey(preEvent), label: "Pre-Event day" });
    let cursor = new Date(start);
    let idx = 1;
    while (cursor.getTime() <= end.getTime()) {
      options.push({
        value: localDateKey(cursor),
        label: `Day ${idx} (${dayLabel(cursor)})`,
      });
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
      idx += 1;
    }
    options.push({ value: localDateKey(afterEvent), label: "After Event day" });
    return options;
  }, [event.endDate, event.startDate]);
  const getOwnerColor = (userId: string) => state.users.find((user) => user.id === userId)?.color ?? "#3b82f6";
  const getCompanyMeta = (companyId: string) => {
    const company = state.companies.find((row) => row.id === companyId);
    return {
      companyStatus: company?.companyStatus ?? "LEAD",
      type: company?.type ?? "Aggregator",
      workscope: company?.workscope ?? [],
    };
  };
  const conflictMeetingIds = useMemo(() => {
    const slotCounts = new Map<string, number>();
    eventMeetings.forEach((meeting) => {
      const key = `${meeting.ownerUserId}|${localDateKey(meeting.startAt)}|${toInputTime(meeting.startAt)}`;
      slotCounts.set(key, (slotCounts.get(key) ?? 0) + 1);
    });
    const conflicts = new Set<string>();
    eventMeetings.forEach((meeting) => {
      const key = `${meeting.ownerUserId}|${localDateKey(meeting.startAt)}|${toInputTime(meeting.startAt)}`;
      if ((slotCounts.get(key) ?? 0) > 1) {
        conflicts.add(meeting.id);
      }
    });
    return conflicts;
  }, [eventMeetings]);
  const editingNote = useMemo(
    () => (editingNoteId ? eventNotes.find((row) => row.id === editingNoteId) ?? null : null),
    [editingNoteId, eventNotes],
  );

  const resetEditingNote = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
    setEditingReminderAt("");
    setEditingCompanyId("");
  };

  const startEditingNote = (noteId: string) => {
    const note = eventNotes.find((row) => row.id === noteId);
    if (!note) return;
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
    setEditingReminderAt(toDateTimeLocalInput(note.reminderAt));
    setEditingCompanyId(note.companyId);
  };

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-[10px] font-medium text-slate-500">Events / {event.name}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{event.name}</h1>
            <p className="text-[11px] text-slate-500">
              {event.city}, {event.venue} - {formatDay(event.startDate)} - {formatDay(event.endDate)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Smart Scheduling
            </Button>
            <Button variant="outline" size="sm">
              Public Link
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Meetings" value={allEventMeetings.length} size="xs" />
        <StatCard label="Leads Created" value={leadsCreated} size="xs" />
        <StatCard label="Completed" value={completedCount} accent="success" size="xs" />
        <StatCard label="Team Members" value={teamMemberCount} size="xs" />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1">
        {(["Stream Board", "Meetings List", "Event Notes", "Team Travel"] as Tab[]).map((item) => (
          <Button
            key={item}
            variant={item === tab ? "primary" : "ghost"}
            size="sm"
            className={item === tab ? "" : "text-slate-500"}
            onClick={() => setTab(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      {tab === "Meetings List" && (
        <div className="space-y-4">
          <MeetingModal
            key={`${embeddedCreateVersion}-${createPrefill?.date ?? ""}-${createPrefill?.time ?? ""}`}
            mode="create"
            eventId={eventId}
            prefill={createPrefill}
            embedded
            compact
            onClose={() => {
              setCreatePrefill(undefined);
              setEmbeddedCreateVersion((v) => v + 1);
            }}
          />
          <Card
            title="Scheduled meetings"
            actions={
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-[170px]">
                  <FieldLabel>Owner</FieldLabel>
                  <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                    <option value="">All</option>
                    {salesUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-[220px]">
                  <FieldLabel>Event day</FieldLabel>
                  <select value={meetingDayFilter} onChange={(e) => setMeetingDayFilter(e.target.value)}>
                    {dayFilterOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }
          >
            <div className="space-y-2">
              {eventMeetings.map((meeting) => {
                return (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    dense
                    className="w-full"
                    companyName={getCompanyName(state, meeting.companyId)}
                    ownerName={getUserName(state, meeting.ownerUserId)}
                    ownerColor={getOwnerColor(meeting.ownerUserId)}
                    companyMeta={getCompanyMeta(meeting.companyId)}
                    contactName={getContactName(state, meeting.contactId)}
                    conflict={conflictMeetingIds.has(meeting.id)}
                    onClick={() => {
                      setCreateOpen(false);
                      setStartingMeeting(null);
                      setEditingMeeting(meeting);
                    }}
                    onEdit={() => {
                      setCreateOpen(false);
                      setStartingMeeting(null);
                      setEditingMeeting(meeting);
                    }}
                    onStart={() => {
                      setCreateOpen(false);
                      setEditingMeeting(null);
                      setStartingMeeting(meeting);
                    }}
                    onDelete={() => state.deleteMeeting(meeting.id)}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === "Stream Board" && (
        <EventCalendar2Day
          meetings={allEventMeetings}
          getCompanyName={(companyId) => getCompanyName(state, companyId)}
          getOwnerName={(userId) => getUserName(state, userId)}
          getOwnerColor={getOwnerColor}
          getCompanyMeta={getCompanyMeta}
          onOpenMeeting={(meeting) => {
            setCreateOpen(false);
            setStartingMeeting(null);
            setEditingMeeting(meeting);
          }}
          onStartMeeting={(meeting) => {
            setCreateOpen(false);
            setEditingMeeting(null);
            setStartingMeeting(meeting);
          }}
          onCreateMeeting={(payload) => {
            setStartingMeeting(null);
            setEditingMeeting(null);
            setCreatePrefill(payload);
            setCreateOpen(true);
          }}
        />
      )}

      {tab === "Event Notes" && (
        <Card title="Event notes (same note also in company CRM)">
          <form
            className="mb-3 grid gap-2 md:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteText.trim()) return;
              const companyId = noteCompanyId.trim();
              if (!companyId) return;
              state.createNote({
                companyId,
                createdByUserId: state.activeUserId,
                text: noteText,
                relatedEventId: eventId,
                reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined,
              });
              setNoteText("");
              setReminderAt("");
            }}
          >
            <div className="md:col-span-3">
              <FieldLabel>Note</FieldLabel>
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Meeting note..." />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Company</FieldLabel>
              <select value={noteCompanyId} onChange={(e) => setNoteCompanyId(e.target.value)} disabled={!noteCompanyOptions.length}>
                {!noteCompanyOptions.length ? (
                  <option value="">No company available</option>
                ) : (
                  noteCompanyOptions.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <FieldLabel>Reminder</FieldLabel>
              <input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
            </div>
            <div className="md:col-span-6">
              <Button type="submit" disabled={!noteText.trim() || !noteCompanyId}>
                Add event note
              </Button>
            </div>
          </form>
          <div className="space-y-2">
            {eventNotes.map((note) => (
              <div key={note.id} className="rounded-md border border-slate-200 p-3 text-xs">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-semibold">{note.text}</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => startEditingNote(note.id)}>
                      Edit
                    </Button>
                    <Button onClick={() => state.convertNoteToTask(note.id, state.activeUserId)}>To task</Button>
                    <Button variant="danger" onClick={() => state.deleteNote(note.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="text-slate-500">
                  {formatDay(note.createdAt)} {formatTime(note.createdAt)} | Company:{" "}
                  <Link className="text-brand-700" to={`/companies/${note.companyId}`}>
                    {getCompanyName(state, note.companyId)}
                  </Link>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "Team Travel" && (
        <Card title="Event attendees, flights and hotel" actions={<Button onClick={() => setStaffCreateOpen(true)}>Add attendee</Button>}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Outbound flight</th>
                <th>Return flight</th>
                <th>PNR</th>
                <th>Hotel</th>
                <th>Dates</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {eventStaff.map((staff) => (
                <tr
                  key={staff.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setEditingStaff(staff)}
                >
                  <td>{getUserName(state, staff.userId)}</td>
                  <td>
                    <p>{staff.flightOutNumber || "-"}</p>
                    <p className="text-slate-500">
                      {staff.flightOutDepartAt
                        ? `${formatDay(staff.flightOutDepartAt)} ${formatTime(staff.flightOutDepartAt)} - ${formatTime(staff.flightOutArriveAt)}`
                        : "-"}
                    </p>
                  </td>
                  <td>
                    <p>{staff.flightBackNumber || "-"}</p>
                    <p className="text-slate-500">
                      {staff.flightBackDepartAt
                        ? `${formatDay(staff.flightBackDepartAt)} ${formatTime(staff.flightBackDepartAt)} - ${formatTime(staff.flightBackArriveAt)}`
                        : "-"}
                    </p>
                  </td>
                  <td>{staff.pnr}</td>
                  <td>{staff.hotelName}</td>
                  <td>
                    {formatDay(staff.checkIn)} - {formatDay(staff.checkOut)}
                  </td>
                  <td>
                    <Button
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        state.deleteEventStaff(staff.id);
                      }}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {createOpen && (
        <MeetingModal
          mode="create"
          eventId={eventId}
          prefill={createPrefill}
          compact
          onClose={() => {
            setCreateOpen(false);
            setCreatePrefill(undefined);
          }}
        />
      )}
      {editingMeeting && (
        <MeetingModal
          mode="edit"
          eventId={eventId}
          meeting={editingMeeting}
          compact
          onClose={() => setEditingMeeting(null)}
        />
      )}
      {startingMeeting && <MeetingStartModal eventId={eventId} meeting={startingMeeting} onClose={() => setStartingMeeting(null)} />}
      {staffCreateOpen && (
        <StaffTravelModal eventId={eventId} mode="create" onClose={() => setStaffCreateOpen(false)} />
      )}
      {editingNote && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={resetEditingNote}>
          <div className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Edit event note</h3>
              <Button size="sm" variant="secondary" onClick={resetEditingNote}>
                Close
              </Button>
            </div>
            <form
              className="grid gap-2 md:grid-cols-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (!editingNoteText.trim() || !editingCompanyId) return;
                state.updateNote({
                  ...editingNote,
                  text: editingNoteText.trim(),
                  companyId: editingCompanyId,
                  reminderAt: editingReminderAt ? new Date(editingReminderAt).toISOString() : undefined,
                });
                resetEditingNote();
              }}
            >
              <div className="md:col-span-3">
                <FieldLabel>Note</FieldLabel>
                <input value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)} autoFocus />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Company</FieldLabel>
                <select value={editingCompanyId} onChange={(e) => setEditingCompanyId(e.target.value)}>
                  {state.companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Reminder</FieldLabel>
                <input type="datetime-local" value={editingReminderAt} onChange={(e) => setEditingReminderAt(e.target.value)} />
              </div>
              <div className="md:col-span-6 flex items-center justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={resetEditingNote}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={!editingNoteText.trim() || !editingCompanyId}>
                  Save note
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingStaff && (
        <StaffTravelModal
          eventId={eventId}
          mode="edit"
          row={editingStaff}
          onClose={() => setEditingStaff(null)}
        />
      )}
    </div>
  );
}
