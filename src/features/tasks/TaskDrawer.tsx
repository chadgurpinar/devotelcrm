import { useEffect, useRef, useState } from "react";
import { ChevronDown, Paperclip, X } from "lucide-react";
import { Task, TaskAttachment, TaskComment, TaskLabel, TaskPriority, TaskStatus, TaskVisibility, User } from "../../store/types";

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

export function TaskDrawer({
  task,
  comments,
  attachments,
  users,
  labels,
  getUserName,
  onSave,
  onClose,
  onArchive,
  onUnarchive,
  onAddComment,
  onAddAttachment,
  onRemoveAttachment,
}: TaskDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<TaskDrawerDraft>({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt ? task.dueAt.slice(0, 10) : "",
    assigneeUserId: task.assigneeUserId,
    visibility: task.visibility,
    watcherUserIds: task.watcherUserIds,
    isUrgent: task.isUrgent,
    labelIds: task.labelIds ?? [],
  });
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentKind, setNewCommentKind] = useState<"Comment" | "Blocker">("Comment");

  useEffect(() => {
    setDraft({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt ? task.dueAt.slice(0, 10) : "",
      assigneeUserId: task.assigneeUserId,
      visibility: task.visibility,
      watcherUserIds: task.watcherUserIds,
      isUrgent: task.isUrgent,
      labelIds: task.labelIds ?? [],
    });
  }, [task]);

  const toggleWatcher = (userId: string) => {
    const mustKeep = userId === task.createdByUserId || userId === draft.assigneeUserId;
    if (mustKeep) return;
    setDraft((prev) => {
      const exists = prev.watcherUserIds.includes(userId);
      const next = exists ? prev.watcherUserIds.filter((id) => id !== userId) : [...prev.watcherUserIds, userId];
      return { ...prev, watcherUserIds: next };
    });
  };

  const toggleLabel = (labelId: string) => {
    setDraft((prev) => {
      const current = prev.labelIds ?? [];
      const has = current.includes(labelId);
      const next = has ? current.filter((id) => id !== labelId) : [...current, labelId];
      return { ...prev, labelIds: next };
    });
  };

  const saveTaskDetail = () => {
    onSave(task, draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
          <div>
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-0.5">Task Detail</p>
            <h2 className="text-base font-semibold text-gray-900 line-clamp-1">{task.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
              <input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
              <select value={draft.status} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as TaskStatus }))} className={inputCls}>
                <option value="Backlog">Backlog</option>
                <option value="Open">Open</option>
                <option value="InProgress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
              <select value={draft.priority} onChange={(e) => setDraft((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))} className={inputCls}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Assignee</label>
              <select
                value={draft.assigneeUserId}
                onChange={(e) => {
                  const nextAssignee = e.target.value;
                  setDraft((prev) => {
                    const nextWatchers = Array.from(new Set([...prev.watcherUserIds, task.createdByUserId, nextAssignee]));
                    return { ...prev, assigneeUserId: nextAssignee, watcherUserIds: nextWatchers };
                  });
                }}
                className={inputCls}
              >
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Due Date</label>
              <input type="date" value={draft.dueAt} onChange={(e) => setDraft((prev) => ({ ...prev, dueAt: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Visibility</label>
              <select value={draft.visibility} onChange={(e) => setDraft((prev) => ({ ...prev, visibility: e.target.value as TaskVisibility }))} className={inputCls}>
                <option value="Private">Private</option>
                <option value="Shared">Shared</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
              <textarea rows={2} value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} className={`${inputCls} resize-none`} />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={draft.isUrgent ?? false} onChange={(e) => setDraft((prev) => ({ ...prev, isUrgent: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="font-medium">Mark as Urgent</span>
              </label>
            </div>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Labels</p>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => {
                  const checked = (draft.labelIds ?? []).includes(label.id);
                  return (
                    <label key={label.id} className={`flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition ${checked ? `${label.color} text-white border-transparent` : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                      <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleLabel(label.id)} />
                      {label.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Watchers */}
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 select-none">
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              Watchers ({draft.watcherUserIds.length})
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1 pl-5 sm:grid-cols-3">
              {users.map((user) => {
                const forced = user.id === task.createdByUserId || user.id === draft.assigneeUserId;
                const checked = draft.watcherUserIds.includes(user.id) || forced;
                return (
                  <label key={user.id} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={checked} disabled={forced} onChange={() => toggleWatcher(user.id)} className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600" />
                    <span>{user.name}</span>
                    {forced && <span className="text-[10px] text-gray-400">(required)</span>}
                  </label>
                );
              })}
            </div>
          </details>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500">Attachments {attachments.length > 0 && `(${attachments.length})`}</p>
              {onAddAttachment && (
                <>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onAddAttachment(task.id, file); e.target.value = ""; }} />
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">+ Add attachment</button>
                </>
              )}
            </div>
            {attachments.length === 0 ? (
              <p className="text-xs text-gray-400">No attachments yet.</p>
            ) : (
              <div className="space-y-1">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate font-medium text-gray-700">{att.fileName}</span>
                      <span className="flex-shrink-0 text-gray-400">{formatFileSize(att.sizeBytes)}</span>
                    </div>
                    {onRemoveAttachment && (
                      <button onClick={() => onRemoveAttachment(att.id)} className="ml-2 text-gray-400 hover:text-rose-500 transition">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Comments {comments.length > 0 && `(${comments.length})`}</p>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {comments.length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
              {comments.map((comment) => (
                <div key={comment.id} className={`rounded-lg p-3 text-xs ${comment.kind === "Blocker" ? "bg-rose-50 border border-rose-100" : "bg-gray-50 border border-gray-100"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-700">{getUserName(comment.authorUserId)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${comment.kind === "Blocker" ? "bg-rose-100 text-rose-700" : "bg-gray-200 text-gray-600"}`}>{comment.kind}</span>
                      <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                    </div>
                  </div>
                  <p className="text-gray-600">{comment.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add a comment..." className={`flex-1 ${inputCls}`} />
              <select value={newCommentKind} onChange={(e) => setNewCommentKind(e.target.value as "Comment" | "Blocker")} className="rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="Comment">Comment</option>
                <option value="Blocker">Blocker</option>
              </select>
              <button
                onClick={() => { const text = newCommentText.trim(); if (!text) return; onAddComment(task.id, text, newCommentKind); setNewCommentText(""); setNewCommentKind("Comment"); }}
                disabled={!newCommentText.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition"
              >
                Post
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl">
          <div className="flex gap-2">
            {task.status !== "Done" && task.status !== "Completed" && task.status !== "Archived" && (
              <button onClick={() => onArchive(task)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">⭐ Star</button>
            )}
            {(task.status === "Archived" || (task.status === "Done" && task.archivedAt)) && (
              <button onClick={() => onUnarchive(task)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">Unstar</button>
            )}
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
