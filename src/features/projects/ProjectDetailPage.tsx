import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckSquare, ChevronLeft, ChevronRight, AlertTriangle, Pencil, Plus, Sparkles, Eye, LayoutGrid, FileText, Star, Shield, MessageSquare } from "lucide-react";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import type { Task, TaskPriority, TaskStatus, TaskVisibility, Project } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { TaskDrawer, TaskDrawerDraft } from "../tasks/TaskDrawer";
import { ProjectWeeklyReportTab } from "./ProjectWeeklyReportTab";
import { ProjectFormModal } from "./ProjectFormModal";

type DetailView = "team" | "reports" | "executive";

const STATUS_BADGE: Record<string, string> = { Planning: "bg-blue-50 text-blue-700", InProgress: "bg-blue-50 text-blue-700", Paused: "bg-amber-50 text-amber-700", Completed: "bg-emerald-50 text-emerald-700", OnHold: "bg-gray-100 text-gray-600", Cancelled: "bg-rose-50 text-rose-700" };
const STATUS_LABEL: Record<string, string> = { Planning: "Planning", InProgress: "In Progress", Paused: "Paused", Completed: "Completed", OnHold: "On Hold", Cancelled: "Cancelled" };
const TASK_STATUS_BADGE: Record<string, string> = { Backlog: "bg-gray-100 text-gray-600", Open: "bg-blue-50 text-blue-700", InProgress: "bg-indigo-50 text-indigo-700", Done: "bg-emerald-50 text-emerald-700", Completed: "bg-emerald-100 text-emerald-800", Archived: "bg-amber-50 text-amber-700" };
const PRIORITY_BADGE: Record<string, string> = { Critical: "bg-rose-50 text-rose-700", High: "bg-orange-50 text-orange-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-gray-100 text-gray-500" };
const RISK_CLR: Record<string, string> = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-emerald-50 text-emerald-700" };
const EXEC_STATUS_CLR: Record<string, string> = { approved: "bg-emerald-50 text-emerald-700", changes_requested: "bg-amber-50 text-amber-700", escalated: "bg-rose-50 text-rose-700" };
const EXEC_STATUS_LABEL: Record<string, string> = { approved: "Approved", changes_requested: "Changes Requested", escalated: "Escalated" };

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function timeAgo(iso: string): string { const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return `${Math.floor(hrs / 24)}d ago`; }
function getCurrentMonday(): string { const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; const mon = new Date(d); mon.setDate(d.getDate() + diff); return mon.toISOString().slice(0, 10); }
function shiftWeek(w: string, delta: number): string { const d = new Date(w + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + delta * 7); const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day; d.setUTCDate(d.getUTCDate() + diff); return d.toISOString().slice(0, 10); }
function fmtWeek(w: string): string { return new Date(w + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

/* ─── Create Task Modal ─── */
function CreateTaskModal({ projectName, projectId, users, onClose }: { projectName: string; projectId: string; users: { id: string; name: string }[]; onClose: () => void }) {
  const state = useAppStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState(state.activeUserId);
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [status, setStatus] = useState<TaskStatus>("Backlog");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [labels, setLabels] = useState("");

  function handleSave() {
    if (!title.trim()) return;
    state.createTask({ title: title.trim(), description: description.trim(), status, priority, createdByUserId: state.activeUserId, assigneeUserId: assignee, visibility: "Shared" as TaskVisibility, kanbanStage: status === "InProgress" ? "InProgress" : "Backlog", projectId, dueAt: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined, estimatedHours: estimatedHours ? Number(estimatedHours) : undefined, labelIds: labels.split(",").map((l) => l.trim()).filter(Boolean) });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-base font-semibold text-gray-900">Add Task to {projectName}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Title *</label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Description</label><textarea rows={3} className={`${inputCls} resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Assignee</label><select className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value)}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Priority</label><select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Status</label><select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}><option value="Backlog">To Do</option><option value="InProgress">In Progress</option><option value="Done">Done</option></select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Due Date</label><input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Estimated Hours</label><input type="number" min={0} className={inputCls} value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="e.g. 8" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Labels (comma separated)</label><input className={inputCls} value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="e.g. bug, frontend" /></div>
          </div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Add Task</button>
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const state = useAppStore();
  const [view, setView] = useState<DetailView>("team");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [execWeek, setExecWeek] = useState(getCurrentMonday);
  const [mgrComment, setMgrComment] = useState<string | null>(null);
  const currentMonday = getCurrentMonday();

  const project = state.projects.find((p) => p.id === projectId);
  const activeUser = state.users.find((u) => u.id === state.activeUserId);
  const isSuperAdmin = activeUser?.role === "SuperAdmin";
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);
  const projectTasks = useMemo(() => state.tasks.filter((t) => t.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [state.tasks, projectId]);
  const doneTasks = projectTasks.filter((t) => t.status === "Done" || t.status === "Completed").length;
  const overdueTasks = projectTasks.filter((t) => t.dueAt && t.dueAt < new Date().toISOString() && t.status !== "Done" && t.status !== "Completed").length;
  const selectedTask = selectedTaskId ? state.tasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const commentsByTaskId = useMemo(() => { const map = new Map<string, typeof state.taskComments>(); state.taskComments.forEach((c) => { const l = map.get(c.taskId) ?? []; l.push(c); map.set(c.taskId, l); }); return map; }, [state.taskComments]);
  const isManager = project ? (isSuperAdmin || project.managerUserIds.includes(state.activeUserId) || project.ownerUserId === state.activeUserId) : false;

  const execReport = useMemo(() => state.projectWeeklyReports.find((r) => r.projectId === projectId && r.weekStartDate === execWeek) ?? null, [state.projectWeeklyReports, projectId, execWeek]);
  const execComments = useMemo(() => execReport ? state.weeklyReportManagerComments.filter((c) => c.reportId === execReport.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [], [state.weeklyReportManagerComments, execReport]);

  const allReports = useMemo(() => state.projectWeeklyReports.filter((r) => r.projectId === projectId).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)), [state.projectWeeklyReports, projectId]);
  const openRisks = useMemo(() => { let count = 0; for (const r of allReports.slice(0, 1)) { if (r.managerSummary?.riskLevel === "High" || r.managerSummary?.riskLevel === "Medium") count++; for (const role of ["technical", "sales", "product"] as const) { count += r.roleReports[role]?.blockers.length ?? 0; } } return count; }, [allReports]);

  const saveTaskDetail = useCallback((task: Task, draft: TaskDrawerDraft) => { state.updateTask({ ...task, title: draft.title.trim(), description: draft.description.trim(), status: draft.status, priority: draft.priority, dueAt: draft.dueAt ? new Date(`${draft.dueAt}T12:00:00`).toISOString() : undefined, assigneeUserId: draft.assigneeUserId, visibility: draft.visibility, watcherUserIds: draft.watcherUserIds, isUrgent: draft.isUrgent, labelIds: draft.labelIds }); }, [state]);

  if (!project) return (<div className="flex flex-col items-center justify-center py-20"><p className="text-sm text-gray-500 mb-3">Project not found.</p><Link to="/projects" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">← Back to Projects</Link></div>);

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const completedPct = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;

  function handleSaveMgrComment() {
    if (mgrComment === null) return;
    state.updateProject({ ...project!, managerComment: mgrComment, managerCommentUpdatedAt: new Date().toISOString() });
    setMgrComment(null);
  }

  function handleExecStatus(status: Project["executiveStatus"]) {
    state.updateProject({ ...project!, executiveStatus: status });
  }

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition">← Projects</Link>

      <UiPageHeader title={project.name} subtitle={`${STATUS_LABEL[project.status] ?? project.status} · ${project.strategicPriority} priority`} actions={
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-600"}`}>{STATUS_LABEL[project.status] ?? project.status}</span>
          <button onClick={() => setShowEditProject(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"><Pencil className="h-3.5 w-3.5" /> Edit</button>
        </div>
      } />

      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button onClick={() => setView("team")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "team" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><LayoutGrid className="h-4 w-4" /> Team View</button>
        <button onClick={() => setView("reports")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "reports" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FileText className="h-4 w-4" /> Weekly Reports</button>
        <button onClick={() => setView("executive")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "executive" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><Eye className="h-4 w-4" /> Executive Summary</button>
      </div>

      {/* ═══ TEAM VIEW ═══ */}
      {view === "team" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Project Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-500">Name</p><p className="text-sm font-medium text-gray-900">{project.name}</p></div>
                  <div><p className="text-xs text-gray-500">Status</p><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-600"}`}>{STATUS_LABEL[project.status] ?? project.status}</span></div>
                  <div><p className="text-xs text-gray-500">Priority</p><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${project.strategicPriority === "High" ? "bg-rose-50 text-rose-700" : project.strategicPriority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{project.strategicPriority}</span></div>
                  <div><p className="text-xs text-gray-500">Created</p><p className="text-sm text-gray-700">{new Date(project.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
                  {project.startDate && <div><p className="text-xs text-gray-500">Start</p><p className="text-sm text-gray-700">{new Date(project.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p></div>}
                  {project.endDate && <div><p className="text-xs text-gray-500">End</p><p className="text-sm text-gray-700">{new Date(project.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p></div>}
                </div>
                {project.description && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm text-gray-700">{project.description}</p></div>}
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Responsibles</h3>
                <div className="space-y-3">{[{ label: "Owner", userId: project.ownerUserId }, { label: "Technical", userId: project.technicalResponsibleUserId }, { label: "Sales", userId: project.salesResponsibleUserId }, { label: "Product", userId: project.productResponsibleUserId }].map((r) => { const user = userById.get(r.userId); if (!user) return null; return (<div key={r.label} className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 flex-shrink-0">{initials(user.name)}</div><div><p className="text-xs text-gray-500">{r.label}</p><p className="text-sm font-medium text-gray-900">{user.name}</p></div></div>); })}</div>
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-3">{[{ label: "Total Tasks", value: projectTasks.length }, { label: "Done", value: doneTasks }, { label: "Overdue", value: overdueTasks }].map((kpi) => (<div key={kpi.label} className="rounded-lg border border-gray-200 bg-white p-3"><p className="text-xs text-gray-500">{kpi.label}</p><p className={`text-2xl font-bold ${kpi.label === "Overdue" && kpi.value > 0 ? "text-rose-600" : "text-gray-900"}`}>{kpi.value}</p></div>))}</div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Activity</h3>
                {projectTasks.slice(0, 5).length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No activity yet</p> : <div className="space-y-2">{projectTasks.slice(0, 5).map((t) => (<div key={t.id} className="flex items-center justify-between"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-700 truncate">{t.title}</p><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${TASK_STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status}</span></div><span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{timeAgo(t.updatedAt)}</span></div>))}</div>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-gray-800">{projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}</p><button onClick={() => setShowCreateTask(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"><Plus className="h-4 w-4" /> Add Task</button></div>
            {projectTasks.length === 0 ? (<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16"><CheckSquare className="h-10 w-10 text-gray-300 mb-3" /><p className="text-sm text-gray-500">No tasks yet</p></div>) : (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due</th></tr></thead>
                  <tbody>{projectTasks.map((t) => { const assignee = userById.get(t.assigneeUserId); const isOd = t.dueAt && t.dueAt < new Date().toISOString() && t.status !== "Done" && t.status !== "Completed"; return (<tr key={t.id} className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => setSelectedTaskId(t.id)}><td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{t.title}</p></td><td className="px-4 py-3">{assignee ? <div className="flex items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-600">{initials(assignee.name)}</div><span className="text-sm text-gray-700">{assignee.name}</span></div> : <span className="text-xs text-gray-400">—</span>}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TASK_STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status === "InProgress" ? "In Progress" : t.status}</span></td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[t.priority] ?? "bg-gray-100 text-gray-500"}`}>{t.priority}</span></td><td className="px-4 py-3">{t.dueAt ? <span className={`text-xs ${isOd ? "font-medium text-rose-600" : "text-gray-600"}`}>{new Date(t.dueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span> : <span className="text-xs text-gray-400">—</span>}</td></tr>); })}</tbody>
                </table>
              </div>
            )}
            {showCreateTask && <CreateTaskModal projectName={project.name} projectId={projectId!} users={state.users} onClose={() => setShowCreateTask(false)} />}
          </div>
        </>
      )}

      {/* ═══ WEEKLY REPORTS ═══ */}
      {view === "reports" && <ProjectWeeklyReportTab projectId={projectId!} />}

      {/* ═══ EXECUTIVE SUMMARY ═══ */}
      {view === "executive" && (
        <div className="space-y-5">
          {/* Executive status badge */}
          {project.executiveStatus && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Executive Status:</span>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${EXEC_STATUS_CLR[project.executiveStatus] ?? "bg-gray-100 text-gray-600"}`}>{EXEC_STATUS_LABEL[project.executiveStatus] ?? project.executiveStatus}</span>
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1"><CheckSquare className="h-4 w-4 text-indigo-500" /><p className="text-xs font-medium text-gray-500">Total Tasks</p></div>
              <p className="text-2xl font-bold text-gray-900">{projectTasks.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4 text-emerald-500" /><p className="text-xs font-medium text-gray-500">Completed</p></div>
              <p className="text-2xl font-bold text-emerald-600">{completedPct}%</p>
              <div className="mt-1 w-full h-2 rounded-full bg-gray-200"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completedPct}%` }} /></div>
            </div>
            <div className={`rounded-xl border shadow-sm p-4 ${overdueTasks > 0 ? "border-rose-200 bg-rose-50/30" : "border-gray-200 bg-white"}`}>
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-rose-500" /><p className="text-xs font-medium text-gray-500">Overdue</p></div>
              <p className={`text-2xl font-bold ${overdueTasks > 0 ? "text-rose-600" : "text-gray-900"}`}>{overdueTasks}</p>
            </div>
            <div className={`rounded-xl border shadow-sm p-4 ${openRisks > 0 ? "border-amber-200 bg-amber-50/30" : "border-gray-200 bg-white"}`}>
              <div className="flex items-center gap-2 mb-1"><Shield className="h-4 w-4 text-amber-500" /><p className="text-xs font-medium text-gray-500">Open Risks</p></div>
              <p className={`text-2xl font-bold ${openRisks > 0 ? "text-amber-600" : "text-gray-900"}`}>{openRisks}</p>
            </div>
          </div>

          {/* Weekly Reports mini-summary */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Weekly Reports Summary</h3>
            {allReports.length === 0 ? <p className="text-xs text-gray-400 py-4 text-center">No weekly reports submitted yet</p> : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b"><tr><th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Week</th><th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Status</th><th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Risk</th><th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Submitted By</th></tr></thead>
                  <tbody>{allReports.slice(0, 4).map((r) => {
                    const risk = r.managerSummary?.riskLevel ?? "—";
                    const statusLabel = risk === "High" ? "At Risk" : risk === "Medium" ? "Delayed" : "On Track";
                    const statusClr = risk === "High" ? "text-rose-600" : risk === "Medium" ? "text-amber-600" : "text-emerald-600";
                    const submitters: string[] = [];
                    for (const role of ["technical", "sales", "product"] as const) { if (r.roleReports[role]?.submittedAt) submitters.push(getUserName(state, r.roleReports[role]!.authorUserId)); }
                    if (r.managerSummary?.submittedAt) submitters.push(getUserName(state, r.managerSummary.authorUserId));
                    return (<tr key={r.id} className="border-b border-gray-50"><td className="px-3 py-2 text-xs text-gray-700">{fmtWeek(r.weekStartDate)}</td><td className={`px-3 py-2 text-xs font-medium ${statusClr}`}>{statusLabel}</td><td className="px-3 py-2">{risk !== "—" ? <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${RISK_CLR[risk] ?? "bg-gray-100 text-gray-500"}`}>{risk}</span> : <span className="text-[10px] text-gray-400">—</span>}</td><td className="px-3 py-2 text-xs text-gray-600">{submitters.length > 0 ? submitters.join(", ") : "—"}</td></tr>);
                  })}</tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Summary + Week selector */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">AI Summary</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setExecWeek((w) => shiftWeek(w, -1))} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs text-gray-600">{fmtWeek(execWeek)}</span>
                <button onClick={() => { const next = shiftWeek(execWeek, 1); if (next <= currentMonday) setExecWeek(next); }} disabled={shiftWeek(execWeek, 1) > currentMonday} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition"><ChevronRight className="h-4 w-4" /></button>
                {isManager && <button onClick={() => { state.createProjectWeeklyReport({ projectId: projectId!, weekStartDate: execWeek, roleReports: {} }); state.generateProjectAiSummary(projectId!, execWeek); }} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"><Sparkles className="h-3.5 w-3.5" /> {execReport?.aiSummary ? "Re-generate" : "Generate"}</button>}
              </div>
            </div>
            {execReport?.aiSummary ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-800 font-medium">{execReport.aiSummary.shortText}</p>
                {execReport.aiSummary.keyBlockers.length > 0 && <div><p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Key Blockers</p><ul className="list-disc pl-4 text-xs text-gray-700">{execReport.aiSummary.keyBlockers.map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
                {execReport.aiSummary.decisionsRequired.length > 0 && <div><p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Decisions Required</p><ul className="list-disc pl-4 text-xs text-gray-700">{execReport.aiSummary.decisionsRequired.map((d, i) => <li key={i}>{d}</li>)}</ul></div>}
                {execReport.aiSummary.missingRoles.length > 0 && <p className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> Missing: {execReport.aiSummary.missingRoles.join(", ")}</p>}
                <div className="flex items-center gap-3 pt-1">{(["technical", "sales", "product", "manager"] as const).map((key) => { const sub = key === "manager" ? execReport.aiSummary!.coverage.managerSubmittedAt : execReport.aiSummary!.coverage[`${key}SubmittedAt` as keyof typeof execReport.aiSummary.coverage]; return <span key={key} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sub ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{sub ? "✓" : "✗"} {key}</span>; })}</div>
              </div>
            ) : <p className="text-xs text-gray-400">No AI summary generated yet.</p>}
          </div>

          {/* Manager Comment section */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3"><MessageSquare className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold text-gray-800">Executive / Manager Feedback</h3></div>
            <textarea rows={3} className={`${inputCls} resize-none`} value={mgrComment ?? project.managerComment ?? ""} onChange={(e) => setMgrComment(e.target.value)} placeholder="Add feedback or notes for this project..." />
            {project.managerCommentUpdatedAt && mgrComment === null && <p className="text-[10px] text-gray-400 mt-1">Last updated: {new Date(project.managerCommentUpdatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
            {mgrComment !== null && mgrComment !== (project.managerComment ?? "") && (
              <div className="flex justify-end mt-2"><button onClick={handleSaveMgrComment} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition">Save Comment</button></div>
            )}
          </div>

          {/* Role sections (read-only, collapsible) */}
          {(["technical", "sales", "product"] as const).map((role) => {
            const rr = execReport?.roleReports[role];
            if (!rr?.submittedAt) return (<div key={role} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4"><p className="text-sm font-medium text-gray-600 capitalize">{role}</p><p className="text-xs text-gray-400 mt-0.5">Not submitted</p></div>);
            return (
              <details key={role} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition">
                  <div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-800 capitalize">{role} Report</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Submitted</span></div>
                  <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 pb-4 border-t border-gray-100 pt-3 space-y-2">
                  {(["achievements", "inProgress", "blockers", "decisionsRequired", "nextWeekFocus"] as const).map((field) => { const items = rr[field]; if (!items.length) return null; return <div key={field}><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{field.replace(/([A-Z])/g, " $1").trim()}</p><ul className="list-disc pl-4 text-xs text-gray-700 space-y-0.5">{items.map((v, i) => <li key={i}>{v}</li>)}</ul></div>; })}
                </div>
              </details>
            );
          })}

          {/* Manager Comments (read-only) */}
          {execComments.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Manager Comments</h3>
              <div className="space-y-2">{execComments.map((c) => (<div key={c.id} className="py-1.5 pl-3 border-l-2 border-gray-200"><div className="flex items-center gap-1.5 text-xs"><span className="font-semibold text-gray-700">{getUserName(state, c.managerUserId)}</span><span className="text-[10px] text-gray-400">· {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></div><p className="text-xs text-gray-600 mt-0.5">{c.commentText}</p></div>))}</div>
            </div>
          )}

          {/* Status action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => handleExecStatus("approved")} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${project.executiveStatus === "approved" ? "bg-emerald-600 text-white" : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}>✓ Approve</button>
            <button onClick={() => handleExecStatus("changes_requested")} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${project.executiveStatus === "changes_requested" ? "bg-amber-500 text-white" : "border border-amber-300 text-amber-700 hover:bg-amber-50"}`}>⟳ Request Changes</button>
            <button onClick={() => handleExecStatus("escalated")} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${project.executiveStatus === "escalated" ? "bg-rose-600 text-white" : "border border-rose-300 text-rose-700 hover:bg-rose-50"}`}>⚠ Escalate</button>
          </div>
        </div>
      )}

      {selectedTask && (<TaskDrawer task={selectedTask} comments={commentsByTaskId.get(selectedTask.id) ?? []} attachments={state.taskAttachments.filter((a) => a.taskId === selectedTask.id)} users={state.users} labels={state.taskLabels} getUserName={(uid) => getUserName(state, uid)} onSave={saveTaskDetail} onClose={() => setSelectedTaskId(null)} onArchive={(t) => state.updateTask({ ...t, status: "Archived" })} onUnarchive={(t) => state.updateTask({ ...t, status: "Done", archivedAt: undefined })} onAddComment={(tid, text, kind) => state.addTaskComment(tid, text, kind)} onAddAttachment={(tid, file) => state.addTaskAttachment(tid, file, state.activeUserId)} onRemoveAttachment={(aid) => state.removeTaskAttachment(aid)} />)}
      {showEditProject && project && <ProjectFormModal editingProject={project} onClose={() => setShowEditProject(false)} />}
    </div>
  );
}
