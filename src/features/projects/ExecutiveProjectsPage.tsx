import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ChevronRight, Shield } from "lucide-react";
import { useAppStore } from "../../store/db";
import { UiPageHeader } from "../../ui/UiPageHeader";

const PRIORITY_CLR: Record<string, string> = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-gray-100 text-gray-500" };
const RISK_CLR: Record<string, string> = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-emerald-50 text-emerald-700" };

export function ExecutiveProjectsPage() {
  const state = useAppStore();
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);

  const activeProjects = useMemo(() => state.projects.filter((p) => p.status === "InProgress"), [state.projects]);

  const cards = useMemo(() => activeProjects.map((project) => {
    const reports = state.projectWeeklyReports
      .filter((r) => r.projectId === project.id)
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
    const latest = reports[0] ?? null;
    const aiShortText = latest?.aiSummary?.shortText ?? null;
    const riskLevel = latest?.managerSummary?.riskLevel ?? null;
    const coverage = (() => {
      if (!latest) return { submitted: 0, total: 4 };
      let submitted = 0;
      if (latest.roleReports.technical?.submittedAt) submitted++;
      if (latest.roleReports.sales?.submittedAt) submitted++;
      if (latest.roleReports.product?.submittedAt) submitted++;
      if (latest.managerSummary?.submittedAt) submitted++;
      return { submitted, total: 4 };
    })();
    const owner = userById.get(project.ownerUserId);
    return { project, latest, aiShortText, riskLevel, coverage, ownerName: owner?.name ?? "Unknown" };
  }), [activeProjects, state.projectWeeklyReports, userById]);

  return (
    <div className="space-y-6">
      <UiPageHeader title="Executive Overview" subtitle={`${activeProjects.length} active projects`} />

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <Briefcase className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No active projects</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ project, aiShortText, riskLevel, coverage, ownerName }) => (
            <div key={project.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-indigo-200 hover:shadow-md transition-all group">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{project.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{ownerName}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ml-2 ${PRIORITY_CLR[project.strategicPriority] ?? "bg-gray-100 text-gray-500"}`}>
                  {project.strategicPriority}
                </span>
              </div>

              {/* AI Summary */}
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">AI Summary</p>
                {aiShortText ? (
                  <p className="text-xs text-gray-600 line-clamp-3">{aiShortText}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">No AI summary yet</p>
                )}
              </div>

              {/* Risk + Coverage */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-[10px] text-gray-500">Risk:</span>
                  {riskLevel ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RISK_CLR[riskLevel] ?? "bg-gray-100 text-gray-500"}`}>{riskLevel}</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">—</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">{coverage.submitted} / {coverage.total} submitted</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: coverage.total }).map((_, i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < coverage.submitted ? "bg-emerald-500" : "bg-gray-200"}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <Link to={`/projects/${project.id}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition">
                View Report <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
