import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StickyNote, Plus } from "lucide-react";
import { Badge, Button, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getCompanyName, getEventName, getUserName } from "../../store/selectors";
import { UiPageHeader } from "../../ui/UiPageHeader";

const selectCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

export function NotesPage() {
  const state = useAppStore();
  const [eventFilter, setEventFilter] = useState("");
  const [days, setDays] = useState("30");
  const [companyFilter, setCompanyFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const rows = useMemo(() => {
    const threshold = Date.now() - Number(days) * 86400000;
    return state.notes
      .filter((n) => (!eventFilter || n.relatedEventId === eventFilter))
      .filter((n) => (!companyFilter || n.companyId === companyFilter))
      .filter((n) => (!userFilter || n.createdByUserId === userFilter))
      .filter((n) => new Date(n.createdAt).getTime() >= threshold)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [companyFilter, days, eventFilter, state.notes, userFilter]);

  return (
    <div className="space-y-5">
      <UiPageHeader
        title="Notes"
        subtitle={`${rows.length} notes`}
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition">
            <Plus className="h-4 w-4" /> New Note
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
        <div className="w-44">
          <FieldLabel>Event</FieldLabel>
          <select className={selectCls} value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
            <option value="">All events</option>
            {state.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
        <div className="w-44">
          <FieldLabel>Company</FieldLabel>
          <select className={selectCls} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">All</option>
            {state.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="w-40">
          <FieldLabel>Author</FieldLabel>
          <select className={selectCls} value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
            <option value="">All</option>
            {state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="w-28">
          <FieldLabel>Last days</FieldLabel>
          <select className={selectCls} value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">7</option>
            <option value="30">30</option>
            <option value="90">90</option>
            <option value="365">365</option>
          </select>
        </div>
      </div>

      {/* Card grid */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <StickyNote className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No notes yet</p>
          <p className="text-xs text-gray-400 mt-1">Meeting notes will appear here</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((note) => {
            const authorName = getUserName(state, note.createdByUserId);
            const initials = authorName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={note.id}
                className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
              >
                {/* Company tag */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                    {getCompanyName(state, note.companyId)}
                  </span>
                  {note.relatedEventId && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {getEventName(state, note.relatedEventId)}
                    </span>
                  )}
                </div>

                {/* Note text */}
                <p className="text-sm text-gray-800 leading-relaxed line-clamp-2 mb-3">{note.text}</p>

                {/* Footer: avatar + date + actions */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">{initials}</div>
                    <span className="text-[11px] text-gray-500">{timeAgo(note.createdAt)}</span>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => state.convertNoteToTask(note.id, state.activeUserId)}
                      className="rounded px-2 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      → Task
                    </button>
                    <Link
                      to={`/companies/${note.companyId}`}
                      className="rounded px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-100 transition"
                    >
                      CRM
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
