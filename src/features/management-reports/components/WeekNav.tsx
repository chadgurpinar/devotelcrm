import { ChevronLeft, ChevronRight } from "lucide-react";

export function weekStartMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + delta);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function shiftWeek(w: string, delta: number): string {
  const d = new Date(w + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta * 7);
  return weekStartMonday(d);
}

export function formatWeekLabel(w: string): string {
  return new Date(w + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function getWeeksInMonth(year: number, month: number): string[] {
  const weeks: string[] = [];
  const lastDay = new Date(Date.UTC(year, month, 0));
  let cursor = weekStartMonday(new Date(Date.UTC(year, month - 1, 1)));
  while (new Date(cursor + "T00:00:00Z") <= lastDay) {
    weeks.push(cursor);
    cursor = shiftWeek(cursor, 1);
  }
  return weeks;
}

export function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function formatMonthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function WeekNav({ week, onPrev, onNext }: { week: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrev} className="rounded p-1 text-gray-400 hover:bg-gray-100 transition">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
        Week of {formatWeekLabel(week)}
      </span>
      <button onClick={onNext} className="rounded p-1 text-gray-400 hover:bg-gray-100 transition">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
