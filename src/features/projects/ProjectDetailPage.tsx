import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckSquare, ChevronLeft, ChevronRight, AlertTriangle, Pencil, Plus, Sparkles, Eye, LayoutGrid, FileText, Star, Shield, MessageSquare, X, Trash2 } from "lucide-react";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import type { Task, TaskPriority, TaskStatus, TaskVisibility, Project, ProjectRoleKey } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { TaskDrawer, TaskDrawerDraft } from "../tasks/TaskDrawer";
import { WeeklyReportsTab } from "./weekly-reports/WeeklyReportsTab";
import { ProjectFormModal } from "./ProjectFormModal";

type DetailView = "team" | "reports" | "executive";
type TaskView = "list" | "board";

const STATUS_BADGE: Record<string, string> = { Planning: "bg-blue-50 text-blue-700", InProgress: "bg-blue-50 text-blue-700", Paused: "bg-amber-50 text-amber-700", Completed: "bg-emerald-50 text-emerald-700", OnHold: "bg-gray-100 text-gray-600", Cancelled: "bg-rose-50 text-rose-700" };
const STATUS_LABEL: Record<string, string> = { Planning: "Planning", InProgress: "In Progress", Paused: "Paused", Completed: "Completed", OnHold: "On Hold", Cancelled: "Cancelled" };
const TASK_STATUS_BADGE: Record<string, string> = { Backlog: "bg-gray-100 text-gray-600", Open: "bg-blue-50 text-blue-700", InProgress: "bg-indigo-50 text-indigo-700", Done: "bg-emerald-50 text-emerald-700", Completed: "bg-emerald-100 text-emerald-800", Archived: "bg-amber-50 text-amber-700" };
const PRIORITY_BADGE: Record<string, string> = { Critical: "bg-rose-50 text-rose-700", High: "bg-orange-50 text-orange-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-gray-100 text-gray-500" };
const RISK_CLR: Record<string, string> = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-emerald-50 text-emerald-700" };
const EXEC_STATUS_CLR: Record<string, string> = { approved: "bg-emerald-600 text-white", changes_requested: "bg-amber-500 text-white", escalated: "bg-rose-600 text-white" };
const EXEC_STATUS_OUTLINE: Record<string, string> = { approved: "border-emerald-300 text-emerald-700 hover:bg-emerald-50", changes_requested: "border-amber-300 text-amber-700 hover:bg-amber-50", escalated: "border-rose-300 text-rose-700 hover:bg-rose-50" };
const EXEC_STATUS_LBL: Record<string, string> = { approved: "Approved", changes_requested: "Changes Requested", escalated: "Escalated" };

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const KANBAN_COLS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "Backlog", label: "Backlog", color: "border-t-gray-400" },
  { key: "Open", label: "To Do", color: "border-t-blue-400" },
  { key: "InProgress", label: "In Progress", color: "border-t-indigo-400" },
  { key: "Done", label: "Done", color: "border-t-emerald-400" },
  { key: "Archived", label: "Cancelled", color: "border-t-amber-400" },
];

function timeAgo(iso: string): string { const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return `${Math.floor(hrs / 24)}d ago`; }
function getCurrentMonday(): string { const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; const mon = new Date(d); mon.setDate(d.getDate() + diff); return mon.toISOString().slice(0, 10); }
function shiftWeek(w: string, delta: number): string { const d = new Date(w + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + delta * 7); const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day; d.setUTCDate(d.getUTCDate() + diff); return d.toISOString().slice(0, 10); }
function fmtWeek(w: string): string { return new Date(w + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

const DEFAULT_LABELS = ["Frontend", "Backend", "Design", "Bug", "Feature", "Infra"];

/* ─── Create Task Modal ─── */
function CreateTaskModal({ projectName, projectId, users, projectLabels, onClose }: { projectName: string; projectId: string; users: { id: string; name: string }[]; projectLabels: string[]; onClose: () => void }) {
  const state = useAppStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState(state.activeUserId);
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [status, setStatus] = useState<TaskStatus>("Backlog");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const allLabels = [...new Set([...projectLabels, ...DEFAULT_LABELS])];

  function toggleLabel(l: string) { setSelectedLabels((p) => p.includes(l) ? p.filter((x) => x !== l) : [...p, l]); }
  function addNewLabel() { if (!newLabel.trim()) return; const l = newLabel.trim(); if (!allLabels.includes(l)) allLabels.push(l); setSelectedLabels((p) => [...p, l]); setNewLabel(""); }

  function handleSave() {
    if (!title.trim()) return;
    state.createTask({ title: title.trim(), description: description.trim(), status, priority, createdByUserId: state.activeUserId, assigneeUserId: assignee, visibility: "Shared" as TaskVisibility, kanbanStage: status === "InProgress" ? "InProgress" : "Backlog", projectId, dueAt: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined, estimatedHours: estimatedHours ? Number(estimatedHours) : undefined, labelIds: selectedLabels });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-base font-semibold text-gray-900">Add Task to {projectName}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Title *</label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Description</label><textarea rows={2} className={`${inputCls} resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Assignee</label><select className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value)}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Priority</label><select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Status</label><select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}><option value="Backlog">Backlog</option><option value="Open">To Do</option><option value="InProgress">In Progress</option><option value="Done">Done</option></select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Due Date</label><input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Estimated Hours</label><input type="number" min={0} className={inputCls} value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} /></div>
          {/* Labels multi-select */}
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-gray-500">Labels</label>
            <button type="button" onClick={() => setLabelDropdownOpen((o) => !o)} className={`${inputCls} text-left`}>{selectedLabels.length > 0 ? `${selectedLabels.length} selected` : "Select labels..."}</button>
            {selectedLabels.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{selectedLabels.map((l) => <span key={l} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">{l}<button type="button" onClick={() => toggleLabel(l)} className="hover:text-rose-500"><X className="h-2.5 w-2.5" /></button></span>)}</div>}
            {labelDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {allLabels.map((l) => <label key={l} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={selectedLabels.includes(l)} onChange={() => toggleLabel(l)} className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600" />{l}</label>)}
                <div className="border-t border-gray-100 px-3 py-2 flex gap-2"><input className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" placeholder="New label..." value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNewLabel()} /><button type="button" onClick={addNewLabel} className="text-xs text-indigo-600 font-medium">Add</button></div>
              </div>
            )}
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
  const [taskView, setTaskView] = useState<TaskView>("list");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [execWeek, setExecWeek] = useState(getCurrentMonday);
  const [feedbackText, setFeedbackText] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [statusNoteFor, setStatusNoteFor] = useState<Project["executiveStatus"] | null>(null);
  const [showAddResp, setShowAddResp] = useState(false);
  const [newRespLabel, setNewRespLabel] = useState("");
  const [newRespUser, setNewRespUser] = useState("");
  const [reportInitialWeek, setReportInitialWeek] = useState<string | undefined>(); // kept for executive → reports navigation
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const currentMonday = getCurrentMonday();

  const project = state.projects.find((p) => p.id === projectId);
  const activeUser = state.users.find((u) => u.id === state.activeUserId);
  const isSuperAdmin = activeUser?.role === "SuperAdmin";
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);
  const isManager = project ? (isSuperAdmin || project.managerUserIds.includes(state.activeUserId) || project.ownerUserId === state.activeUserId) : false;
  const projectTasks = useMemo(() => state.tasks.filter((t) => t.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [state.tasks, projectId]);
  const doneTasks = projectTasks.filter((t) => t.status === "Done" || t.status === "Completed").length;
  const overdueTasks = projectTasks.filter((t) => t.dueAt && t.dueAt < new Date().toISOString() && t.status !== "Done" && t.status !== "Completed").length;
  const selectedTask = selectedTaskId ? state.tasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const commentsByTaskId = useMemo(() => { const map = new Map<string, typeof state.taskComments>(); state.taskComments.forEach((c) => { const l = map.get(c.taskId) ?? []; l.push(c); map.set(c.taskId, l); }); return map; }, [state.taskComments]);

  const execReport = useMemo(() => state.projectWeeklyReports.find((r) => r.projectId === projectId && r.weekStartDate === execWeek) ?? null, [state.projectWeeklyReports, projectId, execWeek]);
  const execComments = useMemo(() => execReport ? state.weeklyReportManagerComments.filter((c) => c.reportId === execReport.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [], [state.weeklyReportManagerComments, execReport]);
  const allReports = useMemo(() => state.projectWeeklyReports.filter((r) => r.projectId === projectId).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)), [state.projectWeeklyReports, projectId]);

  const openRisks = useMemo(() => allReports.slice(0, 4).filter((r) => r.managerSummary?.riskLevel === "High").length, [allReports]);
  const completedPct = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;

  const responsibles = useMemo(() => {
    if (!project) return [];
    if (project.responsibles && project.responsibles.length > 0) return project.responsibles;
    const res: { roleLabel: string; userId: string }[] = [];
    if (project.technicalResponsibleUserId) res.push({ roleLabel: "Technical", userId: project.technicalResponsibleUserId });
    if (project.salesResponsibleUserId) res.push({ roleLabel: "Sales", userId: project.salesResponsibleUserId });
    if (project.productResponsibleUserId) res.push({ roleLabel: "Product", userId: project.productResponsibleUserId });
    return res;
  }, [project]);

  const projectLabels = project?.customLabels ?? DEFAULT_LABELS;

  const saveTaskDetail = useCallback((task: Task, draft: TaskDrawerDraft) => { state.updateTask({ ...task, title: draft.title.trim(), description: draft.description.trim(), status: draft.status, priority: draft.priority, dueAt: draft.dueAt ? new Date(`${draft.dueAt}T12:00:00`).toISOString() : undefined, assigneeUserId: draft.assigneeUserId, visibility: draft.visibility, watcherUserIds: draft.watcherUserIds, isUrgent: draft.isUrgent, labelIds: draft.labelIds }); }, [state]);

  if (!project) return (<div className="flex flex-col items-center justify-center py-20"><p className="text-sm text-gray-500 mb-3">Project not found.</p><Link to="/projects" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">← Back to Projects</Link></div>);

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  function addResponsible() {
    if (!newRespLabel.trim() || !newRespUser) return;
    const updated = [...responsibles, { roleLabel: newRespLabel.trim(), userId: newRespUser }];
    state.updateProject({ ...project!, responsibles: updated });
    setNewRespLabel(""); setNewRespUser(""); setShowAddResp(false);
  }

  function removeResponsible(idx: number) {
    const updated = responsibles.filter((_, i) => i !== idx);
    state.updateProject({ ...project!, responsibles: updated });
  }

  function handleExecStatus(s: Project["executiveStatus"]) {
    if (statusNoteFor === s) {
      state.updateProjectExecutiveStatus(projectId!, s, statusNote);
      setStatusNoteFor(null); setStatusNote("");
    } else {
      setStatusNoteFor(s); setStatusNote("");
    }
  }

  function submitFeedback() {
    if (!feedbackText.trim()) return;
    state.addExecutiveFeedback(projectId!, feedbackText.trim(), execWeek);
    setFeedbackText("");
  }

  function handleDrop(targetStatus: TaskStatus) {
    if (!dragTaskId) return;
    const task = state.tasks.find((t) => t.id === dragTaskId);
    if (task && task.status !== targetStatus) state.updateTask({ ...task, status: targetStatus, kanbanStage: targetStatus === "Done" || targetStatus === "Completed" ? "Done" : targetStatus === "InProgress" ? "InProgress" : "Backlog" });
    setDragTaskId(null);
  }

  return (
    <div className="space-y-5">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition">← Projects</Link>

      <UiPageHeader title={project.name} subtitle={`${STATUS_LABEL[project.status] ?? project.status} · ${project.strategicPriority} priority`} actions={
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-600"}`}>{STATUS_LABEL[project.status] ?? project.status}</span>
          {project.executiveStatus && <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${EXEC_STATUS_CLR[project.executiveStatus]}`}>{EXEC_STATUS_LBL[project.executiveStatus]}</span>}
          <button onClick={() => setShowEditProject(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"><Pencil className="h-3.5 w-3.5" /> Edit</button>
        </div>
      } />

      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button onClick={() => setView("team")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "team" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><LayoutGrid className="h-4 w-4" /> Team View</button>
        <button onClick={() => { setView("reports"); setReportInitialWeek(undefined); }} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "reports" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FileText className="h-4 w-4" /> Weekly Reports</button>
        <button onClick={() => setView("executive")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === "executive" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><Eye className="h-4 w-4" /> Executive Summary</button>
      </div>

      {/* ═══ TEAM VIEW ═══ */}
      {view === "team" && (
        <>
          {/* Compact Project Details + Responsibles */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div><span className="text-gray-400">Status</span><p className="mt-0.5"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-600"}`}>{STATUS_LABEL[project.status] ?? project.status}</span></p></div>
              <div><span className="text-gray-400">Priority</span><p className="mt-0.5"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[project.strategicPriority] ?? "bg-gray-100 text-gray-500"}`}>{project.strategicPriority}</span></p></div>
              <div><span className="text-gray-400">Created</span><p className="font-medium text-gray-800 mt-0.5">{new Date(project.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
              {project.endDate && <div><span className="text-gray-400">Deadline</span><p className="font-medium text-gray-800 mt-0.5">{new Date(project.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p></div>}
            </div>
            {project.description && <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100 line-clamp-2">{project.description}</p>}
          </div>

          {/* Responsibles — compact horizontal */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Responsibles</h3>
              {isManager && <button onClick={() => setShowAddResp(true)} className="text-xs text-indigo-600 font-medium hover:text-indigo-700"><Plus className="h-3.5 w-3.5 inline -mt-0.5" /> Add</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Owner */}
              {(() => { const u = userById.get(project.ownerUserId); return u ? <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 text-[8px] font-bold text-indigo-700">{initials(u.name)}</div><div><p className="text-[10px] text-indigo-500">Owner</p><p className="text-xs font-medium text-gray-800">{u.name}</p></div></div> : null; })()}
              {responsibles.map((r, i) => { const u = userById.get(r.userId); return (
                <div key={i} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 group">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[8px] font-bold text-gray-600">{u ? initials(u.name) : "?"}</div>
                  <div><p className="text-[10px] text-gray-400">{r.roleLabel}</p><p className="text-xs font-medium text-gray-800">{u?.name ?? "—"}</p></div>
                  {isManager && <button onClick={() => removeResponsible(i)} className="ml-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition"><X className="h-3 w-3" /></button>}
                </div>
              ); })}
            </div>
            {showAddResp && (
              <div className="flex items-end gap-2 mt-2 pt-2 border-t border-gray-100">
                <div className="flex-1"><label className="text-[10px] text-gray-400">Role</label><input className={`${inputCls} !py-1.5 !text-xs`} value={newRespLabel} onChange={(e) => setNewRespLabel(e.target.value)} placeholder="e.g. Finance" /></div>
                <div className="flex-1"><label className="text-[10px] text-gray-400">User</label><select className={`${inputCls} !py-1.5 !text-xs`} value={newRespUser} onChange={(e) => setNewRespUser(e.target.value)}><option value="">Select...</option>{state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                <button onClick={addResponsible} disabled={!newRespLabel.trim() || !newRespUser} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Add</button>
                <button onClick={() => setShowAddResp(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            )}
          </div>

          {/* KPIs row */}
          <div className="grid grid-cols-3 gap-3">
            {[{ label: "Total", value: projectTasks.length }, { label: "Done", value: doneTasks }, { label: "Overdue", value: overdueTasks }].map((k) => (
              <div key={k.label} className="rounded-lg border border-gray-200 bg-white p-3"><p className="text-[10px] text-gray-500">{k.label}</p><p className={`text-xl font-bold ${k.label === "Overdue" && k.value > 0 ? "text-rose-600" : "text-gray-900"}`}>{k.value}</p></div>
            ))}
          </div>

          {/* Tasks header + view toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-gray-800">Tasks</p>
              <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
                <button onClick={() => setTaskView("list")} className={`rounded px-2.5 py-1 text-[11px] font-medium transition ${taskView === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>List</button>
                <button onClick={() => setTaskView("board")} className={`rounded px-2.5 py-1 text-[11px] font-medium transition ${taskView === "board" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Board</button>
              </div>
            </div>
            <button onClick={() => setShowCreateTask(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"><Plus className="h-3.5 w-3.5" /> Add Task</button>
          </div>

          {/* List View */}
          {taskView === "list" && (
            projectTasks.length === 0 ? <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-12"><CheckSquare className="h-8 w-8 text-gray-300 mb-2" /><p className="text-sm text-gray-500">No tasks yet</p></div> : (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Task</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Assignee</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Status</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Priority</th><th className="px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Due</th></tr></thead>
                  <tbody>{projectTasks.map((t) => { const assignee = userById.get(t.assigneeUserId); const isOd = t.dueAt && t.dueAt < new Date().toISOString() && t.status !== "Done" && t.status !== "Completed"; return (<tr key={t.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => setSelectedTaskId(t.id)}><td className="px-3 py-2"><p className="text-sm font-medium text-gray-900">{t.title}</p>{(t.labelIds ?? []).length > 0 && <div className="flex gap-1 mt-0.5">{(t.labelIds ?? []).slice(0, 3).map((l) => <span key={l} className="rounded-full bg-gray-100 px-1.5 py-px text-[9px] text-gray-500">{l}</span>)}</div>}</td><td className="px-3 py-2">{assignee ? <span className="text-xs text-gray-700">{assignee.name}</span> : <span className="text-[10px] text-gray-400">—</span>}</td><td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${TASK_STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status === "InProgress" ? "In Progress" : t.status}</span></td><td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[t.priority] ?? "bg-gray-100 text-gray-500"}`}>{t.priority}</span></td><td className="px-3 py-2">{t.dueAt ? <span className={`text-[11px] ${isOd ? "font-medium text-rose-600" : "text-gray-600"}`}>{new Date(t.dueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span> : <span className="text-[10px] text-gray-400">—</span>}</td></tr>); })}</tbody>
                </table>
              </div>
            )
          )}

          {/* Board View (Kanban) */}
          {taskView === "board" && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {KANBAN_COLS.map((col) => {
                const colTasks = projectTasks.filter((t) => t.status === col.key);
                return (
                  <div key={col.key} className={`flex-shrink-0 w-56 rounded-xl border border-gray-200 bg-gray-50/50 border-t-2 ${col.color}`}
                    onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.key)}>
                    <div className="px-3 py-2 flex items-center justify-between"><p className="text-[11px] font-semibold text-gray-600">{col.label}</p><span className="text-[10px] text-gray-400">{colTasks.length}</span></div>
                    <div className="px-2 pb-2 space-y-1.5 min-h-[80px]">
                      {colTasks.map((t) => { const a = userById.get(t.assigneeUserId); return (
                        <div key={t.id} draggable onDragStart={() => setDragTaskId(t.id)} onClick={() => setSelectedTaskId(t.id)}
                          className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm cursor-pointer hover:border-indigo-200 hover:shadow transition">
                          <p className="text-xs font-medium text-gray-900 mb-1">{t.title}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">{a && <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[7px] font-bold text-indigo-600">{initials(a.name)}</div>}<span className={`rounded-full px-1.5 py-px text-[9px] font-medium ${PRIORITY_BADGE[t.priority]}`}>{t.priority[0]}</span></div>
                            {t.dueAt && <span className="text-[9px] text-gray-400">{new Date(t.dueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
                          </div>
                          {(t.labelIds ?? []).length > 0 && <div className="flex gap-0.5 mt-1">{(t.labelIds ?? []).slice(0, 2).map((l) => <span key={l} className="rounded bg-gray-100 px-1 py-px text-[8px] text-gray-500">{l}</span>)}</div>}
                        </div>
                      ); })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showCreateTask && <CreateTaskModal projectName={project.name} projectId={projectId!} users={state.users} projectLabels={projectLabels} onClose={() => setShowCreateTask(false)} />}
        </>
      )}

      {/* ═══ WEEKLY REPORTS ═══ */}
      {view === "reports" && <WeeklyReportsTab projectId={projectId!} />}

      {/* ═══ EXECUTIVE SUMMARY ═══ */}
      {view === "executive" && (
        <div className="space-y-5">
          {project.executiveStatus && <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Executive Status:</span><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${EXEC_STATUS_CLR[project.executiveStatus]}`}>{EXEC_STATUS_LBL[project.executiveStatus]}</span>{project.executiveStatusNote && <span className="text-xs text-gray-400 italic">— {project.executiveStatusNote}</span>}</div>}

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3"><div className="flex items-center gap-1.5 mb-0.5"><CheckSquare className="h-4 w-4 text-indigo-500" /><p className="text-[10px] text-gray-500">Total Tasks</p></div><p className="text-xl font-bold text-gray-900">{projectTasks.length}</p></div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3"><div className="flex items-center gap-1.5 mb-0.5"><Star className="h-4 w-4 text-emerald-500" /><p className="text-[10px] text-gray-500">Completed</p></div><p className="text-xl font-bold text-emerald-600">{completedPct}%</p><div className="mt-1 w-full h-1.5 rounded-full bg-gray-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${completedPct}%` }} /></div></div>
            <div className={`rounded-xl border shadow-sm p-3 ${overdueTasks > 0 ? "border-rose-200 bg-rose-50/30" : "border-gray-200 bg-white"}`}><div className="flex items-center gap-1.5 mb-0.5"><AlertTriangle className="h-4 w-4 text-rose-500" /><p className="text-[10px] text-gray-500">Overdue</p></div><p className={`text-xl font-bold ${overdueTasks > 0 ? "text-rose-600" : "text-gray-900"}`}>{overdueTasks}</p></div>
            <div className={`rounded-xl border shadow-sm p-3 ${openRisks > 0 ? "border-amber-200 bg-amber-50/30" : "border-gray-200 bg-white"}`}><div className="flex items-center gap-1.5 mb-0.5"><Shield className="h-4 w-4 text-amber-500" /><p className="text-[10px] text-gray-500">High Risk Weeks</p></div><p className={`text-xl font-bold ${openRisks > 0 ? "text-amber-600" : "text-gray-900"}`}>{openRisks}</p></div>
          </div>

          {/* Weekly Reports Summary — clickable rows */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Weekly Reports</h3>
            {allReports.length === 0 ? <p className="text-xs text-gray-400 py-3 text-center">No weekly reports submitted yet</p> : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-left"><thead className="bg-gray-50 border-b"><tr><th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Week</th><th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Status</th><th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Risk</th><th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Submitted By</th></tr></thead>
                  <tbody>{allReports.slice(0, 4).map((r) => {
                    const risk = r.managerSummary?.riskLevel ?? "—";
                    const statusLabel = risk === "High" ? "At Risk" : risk === "Medium" ? "Delayed" : "On Track";
                    const statusClr = risk === "High" ? "text-rose-600" : risk === "Medium" ? "text-amber-600" : "text-emerald-600";
                    const submitters: string[] = [];
                    for (const role of ["technical", "sales", "product"] as const) { if (r.roleReports[role]?.submittedAt) submitters.push(getUserName(state, r.roleReports[role]!.authorUserId)); }
                    if (r.managerSummary?.submittedAt) submitters.push(getUserName(state, r.managerSummary.authorUserId));
                    return (<tr key={r.id} className="border-b border-gray-50 hover:bg-indigo-50/30 cursor-pointer transition" onClick={() => { setReportInitialWeek(r.weekStartDate); setView("reports"); }}><td className="px-3 py-2 text-xs text-gray-700">{fmtWeek(r.weekStartDate)}</td><td className={`px-3 py-2 text-xs font-medium ${statusClr}`}>{statusLabel}</td><td className="px-3 py-2">{risk !== "—" ? <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${RISK_CLR[risk] ?? "bg-gray-100 text-gray-500"}`}>{risk}</span> : <span className="text-[10px] text-gray-400">—</span>}</td><td className="px-3 py-2 text-xs text-gray-600">{submitters.length > 0 ? submitters.join(", ") : "—"}</td></tr>);
                  })}</tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Summary */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">AI Summary</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setExecWeek((w) => shiftWeek(w, -1))} className="rounded p-1 text-gray-400 hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs text-gray-600">{fmtWeek(execWeek)}</span>
                <button onClick={() => { const n = shiftWeek(execWeek, 1); if (n <= currentMonday) setExecWeek(n); }} disabled={shiftWeek(execWeek, 1) > currentMonday} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                {isManager && <button onClick={() => { state.createProjectWeeklyReport({ projectId: projectId!, weekStartDate: execWeek, roleReports: {} }); state.generateProjectAiSummary(projectId!, execWeek); }} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 transition"><Sparkles className="h-3 w-3" /> {execReport?.aiSummary ? "Refresh" : "Generate"}</button>}
              </div>
            </div>
            {execReport?.aiSummary ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-800">{execReport.aiSummary.shortText}</p>
                {execReport.aiSummary.keyBlockers.length > 0 && <div><p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Key Blockers</p><ul className="list-disc pl-4 text-xs text-gray-700">{execReport.aiSummary.keyBlockers.map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
                {execReport.aiSummary.missingRoles.length > 0 && <p className="text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5 inline -mt-0.5" /> Missing: {execReport.aiSummary.missingRoles.join(", ")}</p>}
                <div className="flex items-center gap-2 pt-1">{(["technical", "sales", "product", "manager"] as const).map((key) => { const sub = key === "manager" ? execReport.aiSummary!.coverage.managerSubmittedAt : execReport.aiSummary!.coverage[`${key}SubmittedAt` as keyof typeof execReport.aiSummary.coverage]; return <span key={key} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sub ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{sub ? "✓" : "✗"} {key}</span>; })}</div>
              </div>
            ) : <p className="text-xs text-gray-400">No AI summary generated yet.</p>}
          </div>

          {/* Executive Feedback */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2"><MessageSquare className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold text-gray-800">Executive Feedback</h3></div>
            {(project.executiveFeedback ?? []).length > 0 && (
              <div className="space-y-2 mb-3">{(project.executiveFeedback ?? []).slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map((f) => (
                <div key={f.id} className="border-l-2 border-indigo-200 pl-3 py-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400"><span className="font-semibold text-gray-600">{getUserName(state, f.authorUserId)}</span><span>· {new Date(f.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></div>
                  <p className="text-xs text-gray-700 mt-0.5">{f.text}</p>
                </div>
              ))}</div>
            )}
            {isManager && (
              <div className="flex gap-2"><textarea rows={2} className={`${inputCls} resize-none flex-1 !text-xs`} value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Add feedback..." /><button onClick={submitFeedback} disabled={!feedbackText.trim()} className="self-end rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Submit</button></div>
            )}
          </div>

          {/* Role sections (read-only, collapsible) */}
          {(["technical", "sales", "product"] as const).map((role) => {
            const rr = execReport?.roleReports[role];
            if (!rr?.submittedAt) return (<div key={role} className="rounded-xl border border-gray-200 bg-white shadow-sm p-3"><p className="text-sm font-medium text-gray-600 capitalize">{role}</p><p className="text-xs text-gray-400 mt-0.5">Not submitted</p></div>);
            return (
              <details key={role} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden group">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-800 capitalize">{role}</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Submitted</span></div><ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" /></summary>
                <div className="px-4 pb-3 border-t border-gray-100 pt-2 space-y-1.5">{(["achievements", "inProgress", "blockers", "decisionsRequired", "nextWeekFocus"] as const).map((field) => { const items = rr[field]; if (!items.length) return null; return <div key={field}><p className="text-[10px] font-semibold text-gray-400 uppercase">{field.replace(/([A-Z])/g, " $1").trim()}</p><ul className="list-disc pl-4 text-xs text-gray-700">{items.map((v, i) => <li key={i}>{v}</li>)}</ul></div>; })}</div>
              </details>
            );
          })}

          {/* Manager Comments (read-only) */}
          {execComments.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Manager Comments</h3>
              <div className="space-y-1.5">{execComments.map((c) => (<div key={c.id} className="py-1 pl-3 border-l-2 border-gray-200"><div className="flex items-center gap-1.5 text-[10px]"><span className="font-semibold text-gray-700">{getUserName(state, c.managerUserId)}</span><span className="text-gray-400">· {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></div><p className="text-xs text-gray-600 mt-0.5">{c.commentText}</p></div>))}</div>
            </div>
          )}

          {/* Status action buttons */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {(["approved", "changes_requested", "escalated"] as const).map((s) => (
                <button key={s} onClick={() => handleExecStatus(s)} className={`rounded-lg px-4 py-2 text-sm font-medium border transition ${project.executiveStatus === s ? EXEC_STATUS_CLR[s] : EXEC_STATUS_OUTLINE[s]}`}>{s === "approved" ? "✓ Approve" : s === "changes_requested" ? "⟳ Request Changes" : "⚠ Escalate"}</button>
              ))}
            </div>
            {statusNoteFor && (
              <div className="flex items-center gap-2">
                <input className={`${inputCls} flex-1 !text-xs`} placeholder="Optional note..." value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
                <button onClick={() => { state.updateProjectExecutiveStatus(projectId!, statusNoteFor, statusNote); setStatusNoteFor(null); setStatusNote(""); }} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition">Confirm</button>
                <button onClick={() => setStatusNoteFor(null)} className="text-xs text-gray-400">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Drawer */}
      {selectedTask && (<TaskDrawer task={selectedTask} comments={commentsByTaskId.get(selectedTask.id) ?? []} attachments={state.taskAttachments.filter((a) => a.taskId === selectedTask.id)} users={state.users} labels={state.taskLabels} getUserName={(uid) => getUserName(state, uid)} onSave={saveTaskDetail} onClose={() => setSelectedTaskId(null)} onArchive={(t) => state.updateTask({ ...t, status: "Archived" })} onUnarchive={(t) => state.updateTask({ ...t, status: "Done", archivedAt: undefined })} onAddComment={(tid, text, kind) => state.addTaskComment(tid, text, kind)} onAddAttachment={(tid, file) => state.addTaskAttachment(tid, file, state.activeUserId)} onRemoveAttachment={(aid) => state.removeTaskAttachment(aid)} />)}
      {showEditProject && project && <ProjectFormModal editingProject={project} onClose={() => setShowEditProject(false)} />}
    </div>
  );
}
