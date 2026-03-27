import type { WeekSummary } from "./types";
import { WeekCard } from "./WeekCard";

export function WeekSelector({ weeks, selectedWeekId, thisWeekId, onSelect }: { weeks: WeekSummary[]; selectedWeekId: string; thisWeekId: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
      {weeks.map((w) => (
        <WeekCard key={w.id} week={w} isSelected={w.id === selectedWeekId} isThisWeek={w.id === thisWeekId} onClick={() => onSelect(w.id)} />
      ))}
    </div>
  );
}
