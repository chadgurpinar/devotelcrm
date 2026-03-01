import { useMemo, useState } from "react";
import { Button, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { CompanyType, InterconnectionType, Meeting, OurEntity, Workscope } from "../../store/types";
import { addMinutes, combineDateTimeLocal, localDateKey, startOfDay, toInputDate, toInputTime } from "../../utils/datetime";

interface MeetingModalProps {
  mode: "create" | "edit";
  eventId: string;
  meeting?: Meeting;
  prefill?: {
    date: string;
    time: string;
    duration?: number;
  };
  onClose: () => void;
  embedded?: boolean;
  compact?: boolean;
}

const durations = [15, 30, 45, 60];
const slotTimes = Array.from({ length: 24 }, (_, idx) => {
  const h = 8 + Math.floor(idx / 2);
  const m = idx % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export function MeetingModal({ mode, eventId, meeting, prefill, onClose, embedded, compact }: MeetingModalProps) {
  const store = useAppStore();
  const users = store.users.filter((u) => u.role === "Sales");
  const event = store.events.find((e) => e.id === eventId);
  const existingMeeting = mode === "edit" ? meeting : undefined;

  const initialCompany = existingMeeting
    ? store.companies.find((c) => c.id === existingMeeting.companyId)?.name ?? ""
    : "";
  const initialContact = existingMeeting
    ? store.contacts.find((c) => c.id === existingMeeting.contactId)?.name ?? ""
    : "";
  const initialStart =
    existingMeeting
      ? new Date(existingMeeting.startAt)
      : prefill
        ? combineDateTimeLocal(prefill.date, prefill.time)
        : new Date();
  const initialDuration = existingMeeting
    ? Math.max(15, Math.round((new Date(existingMeeting.endAt).getTime() - new Date(existingMeeting.startAt).getTime()) / 60000))
    : prefill?.duration ?? 30;

  const [companyQuery, setCompanyQuery] = useState(initialCompany);
  const [companyId, setCompanyId] = useState(existingMeeting?.companyId ?? "");
  const [contactQuery, setContactQuery] = useState(initialContact);
  const [contactId, setContactId] = useState(existingMeeting?.contactId ?? "");
  const [date, setDate] = useState(toInputDate(initialStart));
  const [time, setTime] = useState(toInputTime(initialStart));
  const [duration, setDuration] = useState(durations.includes(initialDuration) ? initialDuration : 30);
  const [place, setPlace] = useState(existingMeeting?.place ?? "Our Booth");
  const [ownerUserId, setOwnerUserId] = useState(existingMeeting?.ownerUserId ?? store.activeUserId);
  const [secondPersonTitle, setSecondPersonTitle] = useState(existingMeeting?.secondPersonTitle ?? "");
  const [mobileOverride, setMobileOverride] = useState(existingMeeting?.mobileOverride ?? "");
  const [emailOverride, setEmailOverride] = useState(
    existingMeeting ? store.contacts.find((c) => c.id === existingMeeting.contactId)?.email ?? "" : "",
  );
  const [description, setDescription] = useState(existingMeeting?.description ?? "");
  const dayOptions = useMemo(() => {
    if (!event) return [];
    const start = startOfDay(event.startDate);
    const end = startOfDay(event.endDate);
    const opts: Array<{ value: string; label: string }> = [];
    const preEvent = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const afterEvent = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    const labelFor = (value: Date) =>
      new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(value);
    opts.push({ value: localDateKey(preEvent), label: "Pre-Event day" });
    let cursor = new Date(start);
    let dayNo = 1;
    while (cursor.getTime() <= end.getTime()) {
      opts.push({
        value: localDateKey(cursor),
        label: `Day ${dayNo} (${labelFor(cursor)})`,
      });
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
      dayNo += 1;
    }
    opts.push({ value: localDateKey(afterEvent), label: "After Event day" });
    if (date && !opts.some((x) => x.value === date)) {
      opts.unshift({ value: date, label: `Custom date (${date})` });
    }
    return opts;
  }, [date, event]);

  const companyMatches = useMemo(
    () =>
      store.companies
        .filter((c) => c.name.toLowerCase().includes(companyQuery.toLowerCase()))
        .slice(0, 8),
    [companyQuery, store.companies],
  );

  const contactsBase = useMemo(
    () =>
      store.contacts.filter((c) =>
        companyId ? c.companyId === companyId : c.name.toLowerCase().includes(contactQuery.toLowerCase()),
      ),
    [companyId, contactQuery, store.contacts],
  );
  const contactMatches = useMemo(
    () => contactsBase.filter((c) => c.name.toLowerCase().includes(contactQuery.toLowerCase())).slice(0, 8),
    [contactQuery, contactsBase],
  );
  const selectedCompanyName = companyId ? store.companies.find((c) => c.id === companyId)?.name ?? "" : "";
  const selectedContactName = contactId ? store.contacts.find((c) => c.id === contactId)?.name ?? "" : "";
  const showCompanyMatches = Boolean(companyQuery) && (!companyId || companyQuery.trim() !== selectedCompanyName);
  const showContactMatches = Boolean(contactQuery) && (!contactId || contactQuery.trim() !== selectedContactName);

  const canCreateCompany = Boolean(companyQuery.trim()) && !companyMatches.some((c) => c.name === companyQuery.trim());
  const canCreateContact = Boolean(contactQuery.trim()) && !contactMatches.some((c) => c.name === contactQuery.trim());

  const startDate = combineDateTimeLocal(date, time);
  const endDate = addMinutes(startDate, duration);

  function resolveCompanyId(): string | null {
    if (companyId) {
      return companyId;
    }
    const name = companyQuery.trim();
    if (!name) {
      return null;
    }
    if (canCreateCompany) {
      const owner = ownerUserId || store.activeUserId;
      const ownerDefaultEntity =
        store.users.find((user) => user.id === owner)?.defaultOurEntity ??
        store.users.find((user) => user.id === store.activeUserId)?.defaultOurEntity ??
        ("UK" as OurEntity);
      return store.createCompany({
        name,
        companyStatus: "LEAD",
        leadDisposition: "Open",
        createdFrom: "Event",
        createdFromEventId: eventId,
        region: event?.city,
        type: "Aggregator" as CompanyType,
        interconnectionType: "Two-way" as InterconnectionType,
        workscope: ["SMS" as Workscope],
        ownerUserId: owner,
        watcherUserIds: [owner],
        ourEntity: ownerDefaultEntity,
        evaluation: {
          technicalFit: "Unknown",
          commercialFit: "Unknown",
          riskLevel: "Unknown",
        },
        tags: [],
        emails: {},
      });
    }
    return store.companies.find((c) => c.name === name)?.id ?? null;
  }

  function resolveContactId(finalCompanyId: string): string | null {
    if (contactId) {
      return contactId;
    }
    const name = contactQuery.trim();
    if (!name) {
      return null;
    }
    if (canCreateContact) {
      return store.createContact({
        companyId: finalCompanyId,
        name,
        title: "",
        phone: "",
        skypeId: "",
        email: emailOverride || "",
      });
    }
    return store.contacts.find((c) => c.name === name)?.id ?? null;
  }

  function onSave() {
    const finalCompanyId = resolveCompanyId();
    if (!finalCompanyId) return;
    const finalContactId = resolveContactId(finalCompanyId);
    if (!finalContactId) return;

    if (mode === "create") {
      store.createMeeting({
        eventId,
        companyId: finalCompanyId,
        contactId: finalContactId,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        place,
        ownerUserId,
        secondPersonTitle: secondPersonTitle || undefined,
        mobileOverride: mobileOverride || undefined,
        description: description || undefined,
      });
    } else if (existingMeeting) {
      store.updateMeeting({
        ...existingMeeting,
        companyId: finalCompanyId,
        contactId: finalContactId,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        place,
        ownerUserId,
        secondPersonTitle: secondPersonTitle || undefined,
        mobileOverride: mobileOverride || undefined,
        description: description || undefined,
      });
    }
    onClose();
  }

  const content = (
    <div
      className={`w-full rounded-xl border border-slate-200 bg-white ${embedded ? "shadow-sm" : "shadow-xl"} ${
        embedded ? (compact ? "p-2.5" : "p-4") : "max-h-[90vh] max-w-3xl overflow-y-auto p-4"
      }`}
    >
      <div className={`${compact ? "mb-2" : "mb-3"} flex items-center justify-between`}>
        <h3 className="text-sm font-semibold text-slate-800">{mode === "create" ? "Schedule meeting" : "Edit meeting"}</h3>
        {!embedded && (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <div className={`grid ${compact ? "gap-1 md:grid-cols-12" : "gap-2 md:grid-cols-3"}`}>
        <div className={compact ? "md:col-span-3" : "md:col-span-2"}>
          <FieldLabel>Company (search or create new Lead)</FieldLabel>
          <input
            value={companyQuery}
            onChange={(e) => {
              setCompanyQuery(e.target.value);
              setCompanyId("");
              setEmailOverride("");
            }}
            placeholder="Search company..."
          />
          {showCompanyMatches && (
            <div className="mt-1 rounded-md border border-slate-200 bg-white p-1">
              {companyMatches.map((company) => (
                <button
                  key={company.id}
                  className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-100"
                  onClick={() => {
                    setCompanyId(company.id);
                    setCompanyQuery(company.name);
                  }}
                >
                  {company.name}
                </button>
              ))}
              {canCreateCompany && (
                <p className="px-2 py-1 text-xs text-brand-700">Create new Lead: {companyQuery.trim()}</p>
              )}
            </div>
          )}
        </div>
        <div className={compact ? "md:col-span-3" : "md:col-span-2"}>
          <FieldLabel>Contact (search or create)</FieldLabel>
          <input
            value={contactQuery}
            onChange={(e) => {
              setContactQuery(e.target.value);
              setContactId("");
            }}
            placeholder="Search contact..."
          />
          {showContactMatches && (
            <div className="mt-1 rounded-md border border-slate-200 bg-white p-1">
              {contactMatches.map((contact) => (
                <button
                  key={contact.id}
                  className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-100"
                  onClick={() => {
                    setContactId(contact.id);
                    setContactQuery(contact.name);
                    setEmailOverride(contact.email ?? "");
                  }}
                >
                  {contact.name}
                </button>
              ))}
              {canCreateContact && (
                <p className="px-2 py-1 text-xs text-brand-700">Create new Contact: {contactQuery.trim()}</p>
              )}
            </div>
          )}
        </div>

        <div className={compact ? "md:col-span-3" : ""}>
          <FieldLabel>Owner</FieldLabel>
          <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        {compact && (
          <div className="md:col-span-3">
            <FieldLabel>2nd person/title</FieldLabel>
            <input value={secondPersonTitle} onChange={(e) => setSecondPersonTitle(e.target.value)} />
          </div>
        )}

        <div className={compact ? "md:col-span-3" : ""}>
          <FieldLabel>Place</FieldLabel>
          <input value={place} onChange={(e) => setPlace(e.target.value)} />
        </div>
        <div className={compact ? "md:col-span-3" : ""}>
          <FieldLabel>Date</FieldLabel>
          {compact ? (
            <select value={date} onChange={(e) => setDate(e.target.value)}>
              {dayOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
        </div>
        <div className={compact ? "md:col-span-3" : ""}>
          <FieldLabel>Time</FieldLabel>
          {compact ? (
            <>
              <input list="meeting-time-slots" value={time} onChange={(e) => setTime(e.target.value)} placeholder="HH:mm" />
              <datalist id="meeting-time-slots">
                {slotTimes.map((slot) => (
                  <option key={slot} value={slot} />
                ))}
              </datalist>
            </>
          ) : (
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          )}
        </div>
        <div className={compact ? "md:col-span-3" : ""}>
          <FieldLabel>Duration</FieldLabel>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {durations.map((item) => (
              <option value={item} key={item}>
                {item} min
              </option>
            ))}
          </select>
        </div>

        <div className={compact ? "md:col-span-4" : ""}>
          <FieldLabel>Mobile (optional)</FieldLabel>
          <input value={mobileOverride} onChange={(e) => setMobileOverride(e.target.value)} />
        </div>
        <div className={compact ? "md:col-span-4" : ""}>
          <FieldLabel>Email (optional)</FieldLabel>
          <input value={emailOverride} onChange={(e) => setEmailOverride(e.target.value)} />
        </div>

        <div className={compact ? "md:col-span-4" : "md:col-span-3"}>
          <FieldLabel>Pre Meeting Notes</FieldLabel>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={compact ? 3 : 4} />
        </div>
        {compact && (
          <div className="md:col-span-1 flex items-end">
            <Button className="w-full px-2" onClick={onSave}>
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        )}
        {!compact && (
          <div>
            <FieldLabel>Computed end time</FieldLabel>
            <input value={toInputTime(endDate)} disabled />
          </div>
        )}
        {!compact && (
          <div>
            <FieldLabel>2nd person/title</FieldLabel>
            <input value={secondPersonTitle} onChange={(e) => setSecondPersonTitle(e.target.value)} />
          </div>
        )}
        {!compact && (
          <div>
            <FieldLabel>Place</FieldLabel>
            <input value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
        )}
      </div>

      <div className={`${compact ? "mt-0" : "mt-2"} flex flex-wrap gap-2`}>
        {!compact && <Button onClick={onSave}>{mode === "create" ? "Create meeting" : "Save changes"}</Button>}
        {mode === "edit" && existingMeeting && (
          <Button
            variant="danger"
            onClick={() => {
              store.deleteMeeting(existingMeeting.id);
              onClose();
            }}
          >
            Delete meeting
          </Button>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      {content}
    </div>
  );
}
