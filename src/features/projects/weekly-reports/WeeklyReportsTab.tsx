import { useWeeklyReports } from "./useWeeklyReports";
import { WeekSelector } from "./WeekSelector";
import { WeekDetails } from "./WeekDetails";

export function WeeklyReportsTab({ projectId }: { projectId: string }) {
  const { weeks, selectedWeekId, selectedWeek, selectWeek, addManagerNote, createQuickTask, submitManagerSummary, regenerateAiSummary, addComment, updateManagerField, users } = useWeeklyReports(projectId);

  const thisWeekId = weeks[0]?.id ?? "";

  return (
    <div className="space-y-6">
      {/* Zone 1 — Weekly Timeline */}
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
