import { useMemo, useState } from "react";
import { Meeting } from "../../store/types";
import { formatDay, startOfDay } from "../../utils/datetime";
import { Button, Card } from "../../components/ui";
import { MeetingCard } from "./MeetingCard";

interface EventCalendar2DayProps {
  meetings: Meeting[];
  getCompanyName: (companyId: string) => string;
  getOwnerName: (userId: string) => string;
  getOwnerColor: (userId: string) => string;
  getCompanyMeta: (companyId: string) => {
    companyStatus: "LEAD" | "INTERCONNECTION" | "CLIENT";
    type: string;
    workscope: string[];
  };
  onOpenMeeting: (meeting: Meeting) => void;
  onStartMeeting: (meeting: Meeting) => void;
  onCreateMeeting: (payload: { date: string; time: string }) => void;
}

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 30;

function slotKeyFromDate(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${min}`;
}

function getDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildSlots(): string[] {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h += 1) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const slots = buildSlots();
type StreamFilter = "All" | "Lead" | "Client";

export function EventCalendar2Day({
  meetings,
  getCompanyName,
  getOwnerName,
  getOwnerColor,
  getCompanyMeta,
  onOpenMeeting,
  onStartMeeting,
  onCreateMeeting,
}: EventCalendar2DayProps) {
  const [anchor, setAnchor] = useState<Date>(() => {
    if (!meetings.length) return new Date();
    return startOfDay(meetings.map((m) => new Date(m.startAt)).sort((a, b) => a.getTime() - b.getTime())[0]);
  });

  const day1 = startOfDay(anchor);
  const day2 = startOfDay(new Date(anchor.getTime() + 24 * 60 * 60 * 1000));
  const [streamFilter, setStreamFilter] = useState<StreamFilter>("All");

  const filteredMeetings = useMemo(
    () =>
      meetings.filter((meeting) => {
        if (streamFilter === "All") return true;
        const companyStatus = getCompanyMeta(meeting.companyId).companyStatus;
        if (streamFilter === "Lead") return companyStatus === "LEAD";
        return companyStatus === "CLIENT";
      }),
    [getCompanyMeta, meetings, streamFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    filteredMeetings.forEach((meeting) => {
      const d = new Date(meeting.startAt);
      const key = `${getDayKey(d)}|${slotKeyFromDate(d)}`;
      const list = map.get(key) ?? [];
      list.push(meeting);
      map.set(key, list);
    });
    return map;
  }, [filteredMeetings]);
  const conflictIds = useMemo(() => {
    const slotCounts = new Map<string, number>();
    filteredMeetings.forEach((meeting) => {
      const start = new Date(meeting.startAt);
      const key = `${meeting.ownerUserId}|${getDayKey(start)}|${slotKeyFromDate(start)}`;
      slotCounts.set(key, (slotCounts.get(key) ?? 0) + 1);
    });
    const conflicts = new Set<string>();
    filteredMeetings.forEach((meeting) => {
      const start = new Date(meeting.startAt);
      const key = `${meeting.ownerUserId}|${getDayKey(start)}|${slotKeyFromDate(start)}`;
      if ((slotCounts.get(key) ?? 0) > 1) {
        conflicts.add(meeting.id);
      }
    });
    return conflicts;
  }, [filteredMeetings]);

  function rowsForDay(day: Date, slot: string): Meeting[] {
    return grouped.get(`${getDayKey(day)}|${slot}`) ?? [];
  }

  function moveDays(amount: number) {
    setAnchor((prev) => new Date(prev.getTime() + amount * 24 * 60 * 60 * 1000));
  }

  function renderMeetingCard(meeting: Meeting) {
    const companyMeta = getCompanyMeta(meeting.companyId);
    return (
      <MeetingCard
        key={meeting.id}
        meeting={meeting}
        compact
        companyName={getCompanyName(meeting.companyId)}
        ownerName={getOwnerName(meeting.ownerUserId)}
        ownerColor={getOwnerColor(meeting.ownerUserId)}
        companyMeta={companyMeta}
        conflict={conflictIds.has(meeting.id)}
        onStart={() => onStartMeeting(meeting)}
        onClick={() => onOpenMeeting(meeting)}
      />
    );
  }

  return (
    <Card
      title="Sales Event Stream Board"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-md border border-slate-200 p-0.5">
            {(["All", "Lead", "Client"] as StreamFilter[]).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={streamFilter === item ? "secondary" : "ghost"}
                className={streamFilter === item ? "" : "text-slate-500"}
                onClick={() => setStreamFilter(item)}
              >
                {item}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={() => moveDays(-1)}>
            Prev
          </Button>
          <Button size="sm" variant="secondary" onClick={() => moveDays(1)}>
            Next
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-[84px_1fr_1fr] gap-2">
        <div />
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700">
          {formatDay(day1)}
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700">
          {formatDay(day2)}
        </div>

        {slots.map((slot) => {
          const day1Meetings = rowsForDay(day1, slot);
          const day2Meetings = rowsForDay(day2, slot);
          return (
            <div key={slot} className="contents">
              <div className="rounded-md border border-slate-200 bg-white p-2 text-xs font-medium text-slate-500">
                {slot}
              </div>
              <div
                className="min-h-[58px] rounded-md border border-slate-200 bg-white p-1.5"
                onClick={() => onCreateMeeting({ date: getDayKey(day1), time: slot })}
              >
                <div className="grid grid-cols-3 gap-1">
                  {day1Meetings.map(renderMeetingCard)}
                </div>
              </div>
              <div
                className="min-h-[58px] rounded-md border border-slate-200 bg-white p-1.5"
                onClick={() => onCreateMeeting({ date: getDayKey(day2), time: slot })}
              >
                <div className="grid grid-cols-3 gap-1">
                  {day2Meetings.map(renderMeetingCard)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
