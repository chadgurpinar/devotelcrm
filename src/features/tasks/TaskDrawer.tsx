import { useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Task, TaskAttachment, TaskComment, TaskLabel, TaskPriority, TaskStatus, TaskVisibility, User } from "../../store/types";
import { MultiSelectDropdown } from "../../ui/MultiSelectDropdown";

export interface TaskDrawerDraft {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string;
  assigneeUserId: string;
  visibility: TaskVisibility;
  watcherUserIds: string[];
  isUrgent?: boolean;
  labelIds?: string[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface TaskDrawerProps {
  task: Task;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  users: User[];
  labels: TaskLabel[];
  getUserName: (userId: string) => string;
  onSave: (task: Task, draft: TaskDrawerDraft) => void;
  onClose: () => void;
  onArchive: (task: Task) => void;
  onUnarchive: (task: Task) => void;
  onAddComment: (taskId: string, text: string, kind?: TaskComment["kind"]) => void;
  onAddAttachment?: (taskId: string, file: File) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
}

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function TaskDrawer({ task, comments, attachments, users, labels, getUserName, onSave, onClose, onArchive, onUnarchive, onAddComment, onAddAttachment, onRemoveAttachment }: TaskDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<TaskDrawerDraft>({ title: task.title, description: task.description, status: task.status, priority: task.priority, dueAt: task.dueAt ? task.dueAt.slice(0, 10) : "", assigneeUserId: task.assigneeUserId, visibility: task.visibility, watcherUserIds: task.watcherUserIds, isUrgent: task.isUrgent, labelIds: task.labelIds ?? [] });
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentKind, setNewCommentKind] = useState<"Comment" | "Blocker">("Comment");

  useEffect(() => { setDraft({ title: task.title, description: task.description, status: task.status, priority: task.priority, dueAt: task.dueAt ? task.dueAt.slice(0, 10) : "", assigneeUserId: task.assigneeUserId, visibility: task.visibility, watcherUserIds: task.watcherUserIds, isUrgent: task.isUrgent, labelIds: task.labelIds ?? [] }); }, [task]);

  const toggleWatcher = (userId: string) => { const mustKeep = userId === task.createdByUserId || userId === draft.assigneeUserId; if (mustKeep) return; setDraft((p) => { const exists = p.watcherUserIds.includes(userId); return { ...p, watcherUserIds: exists ? p.watcherUserIds.filter((id) => id !== userId) : [...p.watcherUserIds, userId] }; }); };
  const toggleLabel = (labelId: string) => { setDraft((p) => { const c = p.labelIds ?? []; return { ...p, labelIds: c.includes(labelId) ? c.filter((id) => id !== labelId) : [...c, labelId] }; }); };
  const saveTaskDetail = () => { onSave(task, draft); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
          <div><p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-0.5">Task Detail</p><h2 className="text-base font-semibold text-gray-900 line-clamp-1">{task.title}</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-gray-500">Title</label><input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Status</label><select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as TaskStatus }))} className={inputCls}><option value="Backlog">Backlog</option><option value="ToDo">To Do</option><option value="InProgress">In Progress</option><option value="Done">Done</option><option value="Cancelled">Cancelled</option></select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Priority</label><select value={draft.priority} onChange={(e) => setDraft((p) => ({ ...p, priority: e.target.value as TaskPriority }))} className={inputCls}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Assignee</label><select value={draft.assigneeUserId} onChange={(e) => { const n = e.target.value; setDraft((p) => ({ ...p, assigneeUserId: n, watcherUserIds: Array.from(new Set([...p.watcherUserIds, task.createdByUserId, n])) })); }} className={inputCls}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Due Date</label><input type="date" value={draft.dueAt} onChange={(e) => setDraft((p) => ({ ...p, dueAt: e.target.value }))} className={inputCls} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Visibility</label><select value={draft.visibility} onChange={(e) => setDraft((p) => ({ ...p, visibility: e.target.value as TaskVisibility }))} className={inputCls}><option value="Private">Private</option><option value="Shared">Shared</option></select></div>
            <div><label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={draft.isUrgent ?? false} onChange={(e) => setDraft((p) => ({ ...p, isUrgent: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600" /><span className="text-sm font-medium text-gray-700">Mark as Urgent</span></label></div>
            <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-gray-500">Description</label><textarea rows={2} value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} className={`${inputCls} resize-none`} /></div>
          </div>

          {/* Labels dropdown */}
          {labels.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Labels</label>
              <MultiSelectDropdown items={labels} selectedIds={draft.labelIds ?? []} getItemId={(l) => l.id} getItemLabel={(l) => l.name} getItemColor={(l) => l.color} onToggle={toggleLabel} label="Labels" />
            </div>
          )}

          {/* Watchers dropdown */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Watchers</label>
            <MultiSelectDropdown
              items={users}
              selectedIds={draft.watcherUserIds}
              getItemId={(u) => u.id}
              getItemLabel={(u) => u.name}
              isDisabled={(u) => u.id === task.createdByUserId || u.id === draft.assigneeUserId}
              getDisabledLabel={() => "(required)"}
              onToggle={toggleWatcher}
              label="Watchers"
              renderPill={(u) => {
                const initials = u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                const forced = u.id === task.createdByUserId || u.id === draft.assigneeUserId;
                return (
                  <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    {initials}
                    {!forced && <button type="button" onClick={() => toggleWatcher(u.id)} className="hover:opacity-70"><X className="h-2.5 w-2.5" /></button>}
                  </span>
                );
              }}
            />
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-500">Attachments {attachments.length > 0 && `(${attachments.length})`}</p>
              {onAddAttachment && <><input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAddAttachment(task.id, f); e.target.value = ""; }} /><button onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">+ Add</button></>}
            </div>
            {attachments.length === 0 ? <p className="text-xs text-gray-400">No attachments.</p> : (
              <div className="space-y-1">{attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0"><Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" /><span className="truncate font-medium text-gray-700">{att.fileName}</span><span className="text-gray-400 flex-shrink-0">{formatFileSize(att.sizeBytes)}</span></div>
                  {onRemoveAttachment && <button onClick={() => onRemoveAttachment(att.id)} className="ml-2 text-gray-400 hover:text-rose-500"><X className="h-3 w-3" /></button>}
                </div>
              ))}</div>
            )}
          </div>

          {/* Comments — compact */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500">Comments {comments.length > 0 && `(${comments.length})`}</p>
            <div className="space-y-0 mb-3 max-h-48 overflow-y-auto">
              {comments.length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className={`py-1.5 pl-3 border-l-2 ${c.kind === "Blocker" ? "border-rose-400" : "border-gray-200"}`}>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-gray-700">{getUserName(c.authorUserId)}</span>
                    {c.kind === "Blocker" && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-medium text-rose-700">Blocker</span>}
                    <span className="text-[10px] text-gray-400">· {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add a comment..." className={`flex-1 ${inputCls}`} />
              <select value={newCommentKind} onChange={(e) => setNewCommentKind(e.target.value as "Comment" | "Blocker")} className="rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-700">
                <option value="Comment">Comment</option>
                <option value="Blocker">Blocker</option>
              </select>
              <button onClick={() => { const t = newCommentText.trim(); if (!t) return; onAddComment(task.id, t, newCommentKind); setNewCommentText(""); setNewCommentKind("Comment"); }} disabled={!newCommentText.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Post</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl">
          <div className="flex gap-2">
            <button onClick={() => onArchive(task)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${task.archivedAt ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{task.archivedAt ? "⭐ Starred" : "☆ Star"}</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
            <button onClick={saveTaskDetail} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">Save Task</button>
          </div>
        </div>
      </div>
    </div>
  );
}
