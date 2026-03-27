import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWeeklyReports } from "./useWeeklyReports";
import { WeekSelector } from "./WeekSelector";
import { WeekDetails } from "./WeekDetails";

function fmtWeekLabel(w: string): string {
  return "Week of " + new Date(w + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function shiftWeek(w: string, delta: number): string {
  const d = new Date(w + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + delta * 7);
  const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day; d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getWeeksForYear(year: number, projectCreatedAt: string, currentMonday: string): string[] {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const day1 = jan1.getUTCDay();
  const diff1 = day1 <= 1 ? 1 - day1 : 8 - day1;
  const firstMon = new Date(jan1);
  firstMon.setUTCDate(jan1.getUTCDate() + diff1);

  const createdDate = projectCreatedAt.slice(0, 10);
  const weeks: string[] = [];
  const cursor = new Date(firstMon);

  while (cursor.getUTCFullYear() <= year) {
    const iso = cursor.toISOString().slice(0, 10);
    if (iso > currentMonday) break;
    if (iso >= createdDate) weeks.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
    if (cursor.getUTCFullYear() > year && cursor.getUTCMonth() > 0) break;
  }

  return weeks.reverse();
}

const dropdownCls = "rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function WeeklyReportsTab({ projectId }: { projectId: string }) {
  const { weeks, selectedWeekId, selectedWeek, selectWeek, addManagerNote, createQuickTask, submitManagerSummary, regenerateAiSummary, addComment, updateManagerField, users, currentMonday, projectCreatedAt } = useWeeklyReports(projectId);

  const thisWeekId = weeks[0]?.id ?? "";
  const selectedYear = Number(selectedWeekId.slice(0, 4));

  const yearOptions = useMemo(() => {
    const startYear = new Date(projectCreatedAt).getFullYear();
    const endYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = endYear; y >= startYear; y--) years.push(y);
    return years;
  }, [projectCreatedAt]);

  const weekOptions = useMemo(() => getWeeksForYear(selectedYear, projectCreatedAt, currentMonday), [selectedYear, projectCreatedAt, currentMonday]);

  function handleYearChange(year: number) {
    const now = new Date();
    if (year === now.getFullYear()) {
      selectWeek(currentMonday);
    } else {
      const dec31 = new Date(Date.UTC(year, 11, 31));
      const day = dec31.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      dec31.setUTCDate(dec31.getUTCDate() + diff);
      selectWeek(dec31.toISOString().slice(0, 10));
    }
  }

  function handlePrev() { selectWeek(shiftWeek(selectedWeekId, -1)); }
  function handleNext() { const next = shiftWeek(selectedWeekId, 1); if (next <= currentMonday) selectWeek(next); }

  return (
    <div className="space-y-6">
      {/* Week navigator: ← [Year] [Week] → */}
      <div className="flex items-center gap-2">
        <button onClick={handlePrev} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"><ChevronLeft className="h-4 w-4" /></button>
        <select value={String(selectedYear)} onChange={(e) => handleYearChange(Number(e.target.value))} className={`w-20 ${dropdownCls}`}>
          {yearOptions.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={selectedWeekId} onChange={(e) => selectWeek(e.target.value)} className={`w-44 ${dropdownCls}`}>
          {weekOptions.map((w) => <option key={w} value={w}>{fmtWeekLabel(w)}</option>)}
        </select>
        <button onClick={handleNext} disabled={shiftWeek(selectedWeekId, 1) > currentMonday} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {/* Zone 1 — Weekly Timeline cards */}
      <WeekSelector weeks={weeks} selectedWeekId={selectedWeekId} thisWeekId={thisWeekId} onSelect={selectWeek} />

      {/* Zone 2 — Selected Week Details */}
      {selectedWeek ? (
        <WeekDetails week={selectedWeek} users={users} onAddNote={addManagerNote} onCreateTask={createQuickTask} onSubmitManager={submitManagerSummary} onUpdateManager={updateManagerField} onRegenerate={regenerateAiSummary} onAddComment={addComment} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <p className="text-sm text-gray-500">Select a week from the timeline above to view details.</p>
        </div>
      )}
    </div>
  );
}
