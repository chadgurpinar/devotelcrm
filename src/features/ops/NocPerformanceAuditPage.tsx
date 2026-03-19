import { useMemo, useState } from "react";
import { ClipboardList, Search, Trophy, Users } from "lucide-react";
import { useAppStore } from "../../store/db";
import { NocMember, NocPerfMonthSummary } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { NocMemberDetailView } from "./NocMemberDetailView";

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-brand-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function scoreBarColor(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 75) return "bg-brand-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function scoreTier(score: number): string {
  if (score >= 98) return "🏆 Platinum Operator";
  if (score >= 90) return "🥇 Gold Operator";
  if (score >= 80) return "✅ Standard";
  if (score >= 60) return "⚠️ Needs Improvement";
  return "🔴 At Risk";
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value.toFixed(0)}</span>
    </div>
  );
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
}

function MemberCard({ member, summary, onClick }: { member: NocMember; summary: NocPerfMonthSummary | undefined; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
            {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{member.name}</p>
            <p className="text-xs text-slate-500">
              {member.teamType} NOC{member.role ? ` · ${member.role}` : ""}
            </p>
          </div>
        </div>

        {summary ? (
          <div className="text-right">
            <p className={`text-2xl font-bold ${scoreColor(summary.finalScore)}`}>{summary.finalScore.toFixed(1)}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Final Score</p>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">No data</span>
        )}
      </div>

      {summary && (
        <div className="mt-3">
          <div className="flex gap-4 mb-2">
            <ScorePill label="Technical" value={summary.technicalScore} />
            <ScorePill label="Discipline" value={summary.disciplineScore} />
            <ScorePill label="Opinion" value={summary.managerOpinionScore} />
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${scoreBarColor(summary.finalScore)}`}
              style={{ width: `${Math.min(summary.finalScore, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-slate-400 text-right">{scoreTier(summary.finalScore)}</p>
        </div>
      )}
    </article>
  );
}

export function NocPerformanceAuditPage() {
  const state = useAppStore();

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [teamFilter, setTeamFilter] = useState<"All" | "Monitoring" | "Routing">("All");
  const [search, setSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const availableMonths = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const months = new Set<string>([currentMonth]);
    state.nocPerfMonthSummaries.forEach((s) => months.add(s.month));
    return [...months].sort().reverse();
  }, [state.nocPerfMonthSummaries]);

  const getSummary = (memberId: string) =>
    state.nocPerfMonthSummaries.find((s) => s.memberId === memberId && s.month === selectedMonth);

  const filteredMembers = useMemo(
    () =>
      state.nocMembers
        .filter((m) => m.active)
        .filter((m) => teamFilter === "All" || m.teamType === teamFilter)
        .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          const sa = getSummary(a.id)?.finalScore ?? 0;
          const sb = getSummary(b.id)?.finalScore ?? 0;
          return sb - sa;
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.nocMembers, state.nocPerfMonthSummaries, teamFilter, search, selectedMonth],
  );

  if (selectedMemberId) {
    return <NocMemberDetailView memberId={selectedMemberId} month={selectedMonth} onBack={() => setSelectedMemberId(null)} />;
  }

  const avgScore = filteredMembers.length > 0
    ? Math.round(filteredMembers.reduce((s, m) => s + (getSummary(m.id)?.finalScore ?? 0), 0) / filteredMembers.length * 10) / 10
    : 0;
  const topPerformers = filteredMembers.filter((m) => (getSummary(m.id)?.finalScore ?? 0) >= 90).length;
  const needsImprovement = filteredMembers.filter((m) => { const s = getSummary(m.id)?.finalScore ?? 0; return s > 0 && s < 70; }).length;

  return (
    <div className="space-y-5">
      <UiPageHeader
        title="NOC Performance Audit"
        subtitle="Manager view · Monthly performance overview"
        actions={
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiKpiCard label="Team Members" value={filteredMembers.length} icon={<Users className="h-5 w-5" />} />
        <UiKpiCard label="Avg Score" value={avgScore} icon={<ClipboardList className="h-5 w-5" />} className={avgScore >= 80 ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"} />
        <UiKpiCard label="Top Performers" value={topPerformers} icon={<Trophy className="h-5 w-5 text-emerald-400" />} className="border-emerald-200 bg-emerald-50/40" />
        <UiKpiCard label="Needs Improvement" value={needsImprovement} className={needsImprovement > 0 ? "border-rose-200 bg-rose-50/40" : ""} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(["All", "Monitoring", "Routing"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setTeamFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              teamFilter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto flex h-9 w-48 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member) => (
          <MemberCard key={member.id} member={member} summary={getSummary(member.id)} onClick={() => setSelectedMemberId(member.id)} />
        ))}
        {filteredMembers.length === 0 && <p className="col-span-full text-center text-sm text-slate-400 py-8">No members found.</p>}
      </div>
    </div>
  );
}
