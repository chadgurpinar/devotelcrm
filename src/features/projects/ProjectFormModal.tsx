import { useEffect, useState } from "react";
import { X, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useAppStore } from "../../store/db";
import type { Project } from "../../store/types";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

interface ProjectFormModalProps {
  editingProject?: Project | null;
  onClose: () => void;
}

type RoleRow = { key: string; label: string; userId: string };

type FormState = {
  name: string; description: string; status: Project["status"]; strategicPriority: Project["strategicPriority"];
  ownerUserId: string; managerUserIds: string[]; tagsText: string;
  startDate: string; endDate: string; budget: string;
  responsibleRoles: RoleRow[];
  memberLockDay: string; memberLockTime: string; managerLockDay: string; managerLockTime: string;
};

function buildRolesFromLegacy(p: { technicalResponsibleUserId: string; salesResponsibleUserId: string; productResponsibleUserId: string }): RoleRow[] {
  const roles: RoleRow[] = [];
  if (p.technicalResponsibleUserId) roles.push({ key: "technical", label: "Technical Responsible", userId: p.technicalResponsibleUserId });
  if (p.salesResponsibleUserId) roles.push({ key: "sales", label: "Sales Responsible", userId: p.salesResponsibleUserId });
  if (p.productResponsibleUserId) roles.push({ key: "product", label: "Product Responsible", userId: p.productResponsibleUserId });
  return roles;
}

function emptyForm(activeUserId: string): FormState {
  return {
    name: "", description: "", status: "InProgress", strategicPriority: "Medium",
    ownerUserId: activeUserId, managerUserIds: [activeUserId], tagsText: "",
    startDate: "", endDate: "", budget: "",
    responsibleRoles: [
      { key: "technical", label: "Technical Responsible", userId: activeUserId },
      { key: "sales", label: "Sales Responsible", userId: activeUserId },
      { key: "product", label: "Product Responsible", userId: activeUserId },
    ],
    memberLockDay: "", memberLockTime: "", managerLockDay: "", managerLockTime: "",
  };
}

function fromProject(p: Project): FormState {
  const responsibleRoles = (p.responsibleRoles && p.responsibleRoles.length > 0)
    ? p.responsibleRoles
    : buildRolesFromLegacy(p);
  return {
    name: p.name, description: p.description, status: p.status, strategicPriority: p.strategicPriority,
    ownerUserId: p.ownerUserId, managerUserIds: p.managerUserIds,
    tagsText: (p.tags ?? []).join(", "), startDate: p.startDate ?? "", endDate: p.endDate ?? "",
    budget: p.budget != null ? String(p.budget) : "",
    responsibleRoles,
    memberLockDay: p.reportDeadlines ? String(p.reportDeadlines.memberLockDay) : "",
    memberLockTime: p.reportDeadlines?.memberLockTime ?? "",
    managerLockDay: p.reportDeadlines ? String(p.reportDeadlines.managerLockDay) : "",
    managerLockTime: p.reportDeadlines?.managerLockTime ?? "",
  };
}

export function ProjectFormModal({ editingProject, onClose }: ProjectFormModalProps) {
  const state = useAppStore();
  const isEdit = Boolean(editingProject);
  const [form, setForm] = useState<FormState>(() => editingProject ? fromProject(editingProject) : emptyForm(state.activeUserId));
  const [deadlinesOpen, setDeadlinesOpen] = useState(Boolean(editingProject?.reportDeadlines));
  const [error, setError] = useState("");

  useEffect(() => { setForm(editingProject ? fromProject(editingProject) : emptyForm(state.activeUserId)); }, [editingProject, state.activeUserId]);

  function toggleManager(userId: string) { setForm((p) => ({ ...p, managerUserIds: p.managerUserIds.includes(userId) ? p.managerUserIds.filter((id) => id !== userId) : [...p.managerUserIds, userId] })); }

  function updateRoleRow(index: number, patch: Partial<RoleRow>) {
    setForm((p) => ({ ...p, responsibleRoles: p.responsibleRoles.map((r, i) => i === index ? { ...r, ...patch } : r) }));
  }

  function addRoleRow() {
    setForm((p) => ({ ...p, responsibleRoles: [...p.responsibleRoles, { key: "", label: "", userId: "" }] }));
  }

  function removeRoleRow(index: number) {
    setForm((p) => ({ ...p, responsibleRoles: p.responsibleRoles.filter((_, i) => i !== index) }));
  }

  function handleSave() {
    if (!form.name.trim()) { setError("Project name is required."); return; }
    setError("");
    const tags = form.tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    const reportDeadlines = form.memberLockDay !== "" && form.memberLockTime && form.managerLockDay !== "" && form.managerLockTime
      ? { memberLockDay: Number(form.memberLockDay), memberLockTime: form.memberLockTime, managerLockDay: Number(form.managerLockDay), managerLockTime: form.managerLockTime }
      : undefined;
    const managerUserIds = Array.from(new Set([...form.managerUserIds, form.ownerUserId].filter(Boolean)));

    const cleanedRoles = form.responsibleRoles
      .map((r) => ({ key: (r.key || r.label.toLowerCase().replace(/\s+/g, "_")).trim(), label: r.label.trim(), userId: r.userId }))
      .filter((r) => r.label && r.userId);

    const findRole = (key: string) => cleanedRoles.find((r) => r.key === key)?.userId ?? form.ownerUserId;
    const technicalResponsibleUserId = findRole("technical");
    const salesResponsibleUserId = findRole("sales");
    const productResponsibleUserId = findRole("product");

    const allUserIds = [form.ownerUserId, technicalResponsibleUserId, salesResponsibleUserId, productResponsibleUserId, ...cleanedRoles.map((r) => r.userId), ...managerUserIds];
    const watcherUserIds = Array.from(new Set(allUserIds.filter(Boolean)));

    const base = {
      name: form.name.trim(), description: form.description.trim(), status: form.status,
      strategicPriority: form.strategicPriority, ownerUserId: form.ownerUserId, managerUserIds,
      technicalResponsibleUserId, salesResponsibleUserId, productResponsibleUserId,
      watcherUserIds, tags, responsibleRoles: cleanedRoles,
      startDate: form.startDate || undefined, endDate: form.endDate || undefined,
      budget: form.budget ? Number(form.budget) : undefined, reportDeadlines,
    };

    if (isEdit && editingProject) {
      state.updateProject({ ...editingProject, ...base });
    } else {
      state.createProject(base);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? "Edit Project" : "New Project"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Project Name *</label><input className={inputCls} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Description</label><textarea rows={3} className={`${inputCls} resize-none`} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Status</label><select className={inputCls} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as FormState["status"] }))}><option value="Planning">Planning</option><option value="InProgress">In Progress</option><option value="Paused">Paused</option><option value="Completed">Completed</option><option value="OnHold">On Hold</option><option value="Cancelled">Cancelled</option></select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Priority</label><select className={inputCls} value={form.strategicPriority} onChange={(e) => setForm((p) => ({ ...p, strategicPriority: e.target.value as FormState["strategicPriority"] }))}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Start Date</label><input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">End Date</label><input type="date" className={inputCls} value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Budget (USD)</label><input type="number" min={0} className={inputCls} value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} placeholder="Optional" /></div>
          </div>

          {/* Owner */}
          <div><label className="mb-1 block text-xs font-medium text-gray-500">Owner *</label><select className={inputCls} value={form.ownerUserId} onChange={(e) => setForm((p) => ({ ...p, ownerUserId: e.target.value }))}>{state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>

          {/* Dynamic Responsible Roles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Responsible Roles</label>
              <button type="button" onClick={addRoleRow} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"><Plus className="h-3.5 w-3.5" /> Add role</button>
            </div>
            <div className="space-y-2">
              {form.responsibleRoles.map((role, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input className={`flex-1 ${inputCls}`} value={role.label} onChange={(e) => updateRoleRow(idx, { label: e.target.value })} placeholder="Role label (e.g. Finance Responsible)" />
                  <select className={`flex-1 ${inputCls}`} value={role.userId} onChange={(e) => updateRoleRow(idx, { userId: e.target.value })}>
                    <option value="">— Select user —</option>
                    {state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <button type="button" onClick={() => removeRoleRow(idx)} className="rounded-lg p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {form.responsibleRoles.length === 0 && <p className="text-xs text-gray-400 italic py-2">No roles defined. Click "+ Add role" to add one.</p>}
            </div>
          </div>

          {/* Managers */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Managers</label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 p-2">
              {state.users.map((u) => <label key={u.id} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer"><input type="checkbox" checked={form.managerUserIds.includes(u.id)} onChange={() => toggleManager(u.id)} className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600" />{u.name}</label>)}
            </div>
          </div>

          <div><label className="mb-1 block text-xs font-medium text-gray-500">Tags (comma separated)</label><input className={inputCls} value={form.tagsText} onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} placeholder="e.g. telecom, q1, priority" /></div>

          {/* Report Deadlines — collapsible */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <button type="button" onClick={() => { if (!deadlinesOpen) { setForm((p) => ({ ...p, memberLockDay: p.memberLockDay || "5", memberLockTime: p.memberLockTime || "17:00", managerLockDay: p.managerLockDay || "1", managerLockTime: p.managerLockTime || "09:30" })); } setDeadlinesOpen((o) => !o); }} className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left">
              <span className="text-xs font-medium text-gray-700">Report Deadlines (optional)</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${deadlinesOpen ? "rotate-180" : ""}`} />
            </button>
            {deadlinesOpen && (
              <div className="px-4 py-3 border-t border-gray-100 space-y-3">
                <p className="text-[10px] text-gray-400">If set, role reporters cannot submit after member lock, managers cannot submit after manager lock each week.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 mb-1">Member Lock</p>
                    <div className="flex gap-2">
                      <select className={`flex-1 ${inputCls}`} value={form.memberLockDay} onChange={(e) => setForm((p) => ({ ...p, memberLockDay: e.target.value }))}><option value="">— Day —</option><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option><option value="0">Sun</option></select>
                      <input type="time" className={inputCls} value={form.memberLockTime} onChange={(e) => setForm((p) => ({ ...p, memberLockTime: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 mb-1">Manager Lock</p>
                    <div className="flex gap-2">
                      <select className={`flex-1 ${inputCls}`} value={form.managerLockDay} onChange={(e) => setForm((p) => ({ ...p, managerLockDay: e.target.value }))}><option value="">— Day —</option><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option><option value="0">Sun</option></select>
                      <input type="time" className={inputCls} value={form.managerLockTime} onChange={(e) => setForm((p) => ({ ...p, managerLockTime: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">{isEdit ? "Save Project" : "Create Project"}</button>
        </div>
      </div>
    </div>
  );
}
