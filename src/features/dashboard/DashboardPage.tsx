import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckSquare, ChevronRight, Radio, TrendingUp, Users } from "lucide-react";
import { Badge } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";

const STATUS_STYLE: Record<string, string> = {
  Backlog: "bg-gray-100 text-gray-600",
  ToDo: "bg-blue-50 text-blue-700",
  InProgress: "bg-indigo-50 text-indigo-700",
  Done: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-600",
};

export function DashboardPage() {
  const state = useAppStore();
  const navigate = useNavigate();

  const activeUser = state.users.find((u) => u.id === state.activeUserId);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const openLeads = useMemo(
    () => state.companies.filter((c) => c.companyStatus === "LEAD" && c.leadDisposition === "Open").length,
    [state.companies],
  );
  const openTasks = useMemo(() => state.tasks.filter((t) => t.status !== "Done" && t.status !== "Cancelled" && !t.completedAt), [state.tasks]);
  const overdueTasks = useMemo(() => {
    const now = new Date().toISOString();
    return openTasks.filter((t) => t.dueAt && t.dueAt < now).length;
  }, [openTasks]);
  const urgentCases = useMemo(
    () => state.opsCases.filter((c) => (c.status === "NEW" || c.status === "IN_PROGRESS") && c.severity === "URGENT").length,
    [state.opsCases],
  );
  const activeCases = useMemo(
    () => state.opsCases.filter((c) => c.status === "NEW" || c.status === "IN_PROGRESS").length,
    [state.opsCases],
  );
  const activeEmployees = useMemo(() => state.hrEmployees.filter((e) => e.active).length, [state.hrEmployees]);

  const myTasks = useMemo(
    () => openTasks
      .filter((t) => t.assigneeUserId === state.activeUserId)
      .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))
      .slice(0, 5),
    [openTasks, state.activeUserId],
  );

  const recentLeads = useMemo(
    () => state.companies
      .filter((c) => c.companyStatus === "LEAD")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 5),
    [state.companies],
  );

  const urgentNocCases = useMemo(
    () => state.nocCases
      .filter((c) => c.status === "Open")
      .sort((a, b) => {
        const sp = (b.severity === "URGENT" ? 2 : b.severity === "HIGH" ? 1 : 0) - (a.severity === "URGENT" ? 2 : a.severity === "HIGH" ? 1 : 0);
        return sp || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5),
    [state.nocCases],
  );

  return (
    <div className="space-y-5">
      <UiPageHeader
        title={`Good morning, ${activeUser?.name?.split(" ")[0] ?? "there"} 👋`}
        subtitle={today}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiKpiCard label="Open Leads" value={openLeads} icon={<TrendingUp className="h-5 w-5" />} className="border-amber-200 bg-amber-50/40" />
        <UiKpiCard
          label="Open Tasks"
          value={openTasks.length}
          icon={<CheckSquare className="h-5 w-5" />}
          trend={overdueTasks > 0 ? { value: `${overdueTasks} overdue`, positive: false } : undefined}
        />
        <UiKpiCard
          label="Active Cases"
          value={activeCases}
          icon={<Radio className="h-5 w-5" />}
          trend={urgentCases > 0 ? { value: `${urgentCases} urgent`, positive: false } : undefined}
          className={urgentCases > 0 ? "border-rose-200 bg-rose-50/40" : ""}
        />
        <UiKpiCard label="Employees" value={activeEmployees} icon={<Users className="h-5 w-5" />} className="border-emerald-200 bg-emerald-50/40" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* My Open Tasks */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-800">My Open Tasks</h3>
            <button onClick={() => navigate("/tasks")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View all →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {myTasks.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-gray-400">No open tasks</p>
            ) : (
              myTasks.map((t) => {
                const isOverdue = t.dueAt && t.dueAt < new Date().toISOString();
                return (
                  <div key={t.id} onClick={() => navigate(`/tasks?task=${t.id}`)} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-gray-50/80 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status === "InProgress" ? "In Progress" : t.status === "ToDo" ? "To Do" : t.status}</span>
                        {t.dueAt && <span className={`text-[10px] ${isOverdue ? "text-rose-600 font-medium" : "text-gray-400"}`}>{new Date(t.dueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-800">Recent Leads</h3>
            <button onClick={() => navigate("/leads")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View all →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLeads.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-gray-400">No leads</p>
            ) : (
              recentLeads.map((c) => (
                <div key={c.id} onClick={() => navigate(`/companies/${c.id}`)} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-gray-50/80 transition">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 flex-shrink-0">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{c.type} · {getUserName(state, c.ownerUserId)}</p>
                  </div>
                  <Badge className={c.leadDisposition === "Open" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}>{c.leadDisposition}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Urgent NOC Cases */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-800">NOC Cases</h3>
            <button onClick={() => navigate("/ops/sms-noc")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View all →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {urgentNocCases.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-gray-400">No open cases</p>
            ) : (
              urgentNocCases.map((c) => (
                <div key={c.id} className="flex items-stretch hover:bg-gray-50/80 transition">
                  <div className={`w-1 flex-shrink-0 ${c.severity === "URGENT" ? "bg-rose-500" : c.severity === "HIGH" ? "bg-amber-500" : "bg-blue-400"}`} />
                  <div className="flex items-center gap-3 px-4 py-2.5 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{c.providerName ?? c.customerName ?? c.destination ?? "—"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${c.severity === "URGENT" ? "bg-rose-50 text-rose-700" : c.severity === "HIGH" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{c.severity}</span>
                        <span className="text-[10px] text-gray-400">{c.portalType}</span>
                      </div>
                    </div>
                    {c.severity === "URGENT" && <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
