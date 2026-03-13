import { useState } from "react";
import { useAppStore } from "../../store/db";
import { NocPerfManagerOpinion, NocPerfWeekEntry } from "../../store/types";

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-brand-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
}

function SummaryCard({ title, value, detail }: { title: string; value: number; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${scoreColor(value)}`}>{value.toFixed(0)}</p>
      <p className="text-xs text-slate-400 mt-1">{detail}</p>
    </div>
  );
}

function WeeklyNoteEditor({ entry, onSave }: { entry: NocPerfWeekEntry; onSave: (note: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry.weeklyManagerNote ?? "");

  return editing ? (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Add weekly manager note..."
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { onSave(text); setEditing(false); }}
          className="h-7 px-3 rounded-lg bg-brand-600 text-white text-xs font-medium hover:opacity-90"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="h-7 px-3 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs text-slate-500 flex-1">
        {entry.weeklyManagerNote ? `"${entry.weeklyManagerNote}"` : <span className="italic">No manager note for this week</span>}
      </p>
      <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:underline flex-shrink-0">
        {entry.weeklyManagerNote ? "Edit" : "+ Add Note"}
      </button>
    </div>
  );
}

function MonthlyCommentEditor({ comment, onSave }: { comment?: string; onSave: (comment: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment ?? "");

  return editing ? (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Add monthly performance comment..."
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { onSave(text); setEditing(false); }}
          className="h-7 px-3 rounded-lg bg-brand-600 text-white text-xs font-medium hover:opacity-90"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="h-7 px-3 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs text-slate-500 flex-1">
        {comment ? `"${comment}"` : <span className="italic">No monthly comment yet</span>}
      </p>
      <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:underline flex-shrink-0">
        {comment ? "Edit" : "+ Add Comment"}
      </button>
    </div>
  );
}

export function NocMemberDetailView({ memberId, month, onBack }: { memberId: string; month: string; onBack: () => void }) {
  const state = useAppStore();
  const member = state.nocMembers.find((m) => m.id === memberId)!;
  const summary = state.nocPerfMonthSummaries.find((s) => s.memberId === memberId && s.month === month);
  const weekEntries = state.nocPerfWeekEntries.filter((w) => w.memberId === memberId && w.month === month).sort((a, b) => a.week - b.week);

  const weeks: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  const [activeWeek, setActiveWeek] = useState<1 | 2 | 3 | 4>(1);
  const activeEntry = weekEntries.find((e) => e.week === activeWeek);

  return (
    <div className="space-y-4">
      {/* C1 — Header */}
      <div className="mb-6">
        <button onClick={onBack} className="text-sm text-brand-600 hover:underline mb-3 flex items-center gap-1">
          ← Back to Overview
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{member.name}</h2>
            <p className="text-sm text-slate-500">
              {member.teamType} NOC · {member.role} · {formatMonth(month)}
            </p>
          </div>
          {summary && (
            <div className={`text-3xl font-bold ${scoreColor(summary.finalScore)}`}>
              {summary.finalScore.toFixed(1)}
              <span className="text-sm font-normal text-slate-400 ml-1">/ 100</span>
            </div>
          )}
        </div>
      </div>

      {/* C2 — Monthly Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <SummaryCard title="Technical Score" value={summary.technicalScore} detail={`${(summary.technicalScore * 0.6).toFixed(1)} pts contribution`} />
          <SummaryCard title="Discipline Score" value={summary.disciplineScore} detail={`${(summary.disciplineScore * 0.2).toFixed(1)} pts contribution`} />
          <SummaryCard title="Manager Opinion" value={summary.managerOpinionScore} detail={`${(summary.managerOpinionScore * 0.2).toFixed(1)} pts contribution`} />
        </div>
      )}

      {/* C3 — Manager Opinion Breakdown */}
      {summary && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Manager Opinion Breakdown</p>
          <div className="space-y-2">
            {(Object.entries(summary.managerOpinionBreakdown) as [keyof NocPerfManagerOpinion, number][]).map(([key, val]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-28 capitalize">{key}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(val / 20) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-8 text-right">{val}/20</span>
              </div>
            ))}
          </div>
          {(summary.spotlightBonus > 0 || summary.behavioralPenalty < 0) && (
            <div className="mt-3 flex gap-3">
              {summary.spotlightBonus > 0 && (
                <span className="text-xs bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">⭐ Spotlight +{summary.spotlightBonus}</span>
              )}
              {summary.behavioralPenalty < 0 && (
                <span className="text-xs bg-rose-50 text-rose-700 rounded-full px-2 py-0.5">⚠️ Penalty {summary.behavioralPenalty}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* C4 — Weekly Tabs */}
      <div className="flex gap-1 mb-4">
        {weeks.map((w) => {
          const entry = weekEntries.find((e) => e.week === w);
          const total = entry ? entry.caseActions.reduce((s, a) => s + a.pointsEarned, 0) : null;
          return (
            <button
              key={w}
              onClick={() => setActiveWeek(w)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                activeWeek === w ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              Week {w}
              {total !== null && (
                <span className={`block text-xs ${total >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {total > 0 ? "+" : ""}{total} pts
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* C5 — Weekly Case Action Table */}
      {activeEntry ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Case Type</th>
                <th className="text-center px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">SLA</th>
                <th className="text-center px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Bonus</th>
                <th className="text-right px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeEntry.caseActions.map((action) => (
                <tr key={action.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-700">{action.caseType}</td>
                  <td className="px-4 py-2 text-center">
                    {action.resolvedWithinSla ? <span className="text-emerald-600">✓ On time</span> : <span className="text-rose-600">✗ Late</span>}
                  </td>
                  <td className="px-4 py-2 text-center">{action.bonusApplied ? <span className="text-amber-600">⚡ Yes</span> : "–"}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${action.pointsEarned >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {action.pointsEarned > 0 ? "+" : ""}{action.pointsEarned}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-slate-600">
                  Week {activeWeek} Total
                </td>
                <td
                  className={`px-4 py-2 text-right font-bold ${
                    activeEntry.caseActions.reduce((s, a) => s + a.pointsEarned, 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {(() => {
                    const t = activeEntry.caseActions.reduce((s, a) => s + a.pointsEarned, 0);
                    return (t > 0 ? "+" : "") + t;
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Discipline Score</span>
            <span className="text-sm font-semibold text-slate-700">{activeEntry.disciplineScore}/100</span>
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <WeeklyNoteEditor
              entry={activeEntry}
              onSave={(note) =>
                state.upsertNocPerfWeekEntry({
                  memberId: activeEntry.memberId,
                  month: activeEntry.month,
                  week: activeEntry.week,
                  disciplineScore: activeEntry.disciplineScore,
                  weeklyManagerNote: note,
                })
              }
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 mb-4">
          No data recorded for Week {activeWeek}
        </div>
      )}

      {/* C7 — Monthly Manager Comment */}
      {summary && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Monthly Manager Comment</p>
          <MonthlyCommentEditor
            comment={summary.managerComment}
            onSave={(comment) =>
              state.upsertNocPerfMonthSummary({
                memberId: summary.memberId,
                month: summary.month,
                technicalScore: summary.technicalScore,
                disciplineScore: summary.disciplineScore,
                managerOpinionScore: summary.managerOpinionScore,
                managerOpinionBreakdown: summary.managerOpinionBreakdown,
                finalScore: summary.finalScore,
                spotlightBonus: summary.spotlightBonus,
                behavioralPenalty: summary.behavioralPenalty,
                managerComment: comment,
              })
            }
          />
        </div>
      )}
    </div>
  );
}
