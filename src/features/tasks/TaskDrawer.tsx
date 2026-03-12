import { useEffect, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { Task, TaskComment, TaskLabel, TaskPriority, TaskStatus, TaskVisibility, User } from "../../store/types";

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

export interface TaskDrawerProps {
  task: Task;
  comments: TaskComment[];
  users: User[];
  labels: TaskLabel[];
  getUserName: (userId: string) => string;
  onSave: (task: Task, draft: TaskDrawerDraft) => void;
  onClose: () => void;
  onArchive: (task: Task) => void;
  onUnarchive: (task: Task) => void;
  onAddComment: (taskId: string, text: string, kind?: TaskComment["kind"]) => void;
}

export function TaskDrawer({
  task,
  comments,
  users,
  labels,
  getUserName,
  onSave,
  onClose,
  onArchive,
  onUnarchive,
  onAddComment,
}: TaskDrawerProps) {
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
    <Card
      title={`Task detail: ${task.title}`}
      actions={
        <Button size="sm" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <FieldLabel>Title</FieldLabel>
          <input
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select
            value={draft.status}
            onChange={(e) => setDraft((prev) => (prev ? { ...prev, status: e.target.value as TaskStatus } : prev))}
          >
            <option value="Backlog">Backlog</option>
            <option value="InProgress">In Progress</option>
            <option value="Done">Done</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
        <div>
          <FieldLabel>Priority</FieldLabel>
          <select
            value={draft.priority}
            onChange={(e) => setDraft((prev) => (prev ? { ...prev, priority: e.target.value as TaskPriority } : prev))}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Description</FieldLabel>
          <input
            value={draft.description}
            onChange={(e) => setDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
          />
        </div>
        <div>
          <FieldLabel>Assignee</FieldLabel>
          <select
            value={draft.assigneeUserId}
            onChange={(e) => {
              const nextAssignee = e.target.value;
              setDraft((prev) => {
                if (!prev) return prev;
                const nextWatchers = Array.from(new Set([...prev.watcherUserIds, task.createdByUserId, nextAssignee]));
                return { ...prev, assigneeUserId: nextAssignee, watcherUserIds: nextWatchers };
              });
            }}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Due date</FieldLabel>
          <input
            type="date"
            value={draft.dueAt}
            onChange={(e) => setDraft((prev) => (prev ? { ...prev, dueAt: e.target.value } : prev))}
          />
        </div>
        <div>
          <FieldLabel>Visibility</FieldLabel>
          <select
            value={draft.visibility}
            onChange={(e) => setDraft((prev) => (prev ? { ...prev, visibility: e.target.value as TaskVisibility } : prev))}
          >
            <option value="Private">Private</option>
            <option value="Shared">Shared</option>
          </select>
        </div>
        <div className="md:col-span-4 flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={draft.isUrgent ?? false}
              onChange={(e) => setDraft((prev) => ({ ...prev, isUrgent: e.target.checked }))}
            />
            Mark as Urgent
          </label>
        </div>
        {labels.length > 0 && (
          <div className="md:col-span-4 rounded-md border border-slate-200 p-2">
            <FieldLabel>Labels</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const checked = (draft.labelIds ?? []).includes(label.id);
                return (
                  <label key={label.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLabel(label.id)}
                    />
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${label.color}`}>
                      {label.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
        <div className="md:col-span-4 rounded-md border border-slate-200 p-2">
          <FieldLabel>Watchers</FieldLabel>
          <div className="grid gap-1 md:grid-cols-3">
            {users.map((user) => {
              const forced = user.id === task.createdByUserId || user.id === draft.assigneeUserId;
              const checked = draft.watcherUserIds.includes(user.id) || forced;
              return (
                <label key={user.id} className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={forced}
                    onChange={() => toggleWatcher(user.id)}
                  />
                  <span>{user.name}</span>
                  {forced && <span className="text-[10px] text-slate-400">(required)</span>}
                </label>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={saveTaskDetail}>Save task</Button>
        {task.status !== "Done" && task.status !== "Completed" && task.status !== "Archived" && (
          <Button variant="secondary" onClick={() => onArchive(task)}>
            Complete and archive
          </Button>
        )}
        {task.status === "Done" && (
          <Button variant="secondary" onClick={() => onArchive(task)}>
            Move to archive
          </Button>
        )}
        {(task.status === "Archived" || (task.status === "Done" && task.archivedAt)) && (
          <Button variant="secondary" onClick={() => onUnarchive(task)}>
            Remove from archive
          </Button>
        )}
      </div>

      <div className="mt-4 rounded-md border border-slate-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</p>
        <div className="space-y-2">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md border border-slate-100 bg-slate-50 p-2 text-xs">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700">{getUserName(comment.authorUserId)}</span>
                <div className="flex items-center gap-2">
                  <Badge className={comment.kind === "Blocker" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}>
                    {comment.kind}
                  </Badge>
                  <span className="text-[11px] text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-slate-600">{comment.content}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-6">
          <div className="md:col-span-4">
            <input
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add comment or blocker..."
            />
          </div>
          <div>
            <select value={newCommentKind} onChange={(e) => setNewCommentKind(e.target.value as "Comment" | "Blocker")}>
              <option value="Comment">Comment</option>
              <option value="Blocker">Blocker</option>
            </select>
          </div>
          <div>
            <Button
              onClick={() => {
                const text = newCommentText.trim();
                if (!text) return;
                onAddComment(task.id, text, newCommentKind);
                setNewCommentText("");
                setNewCommentKind("Comment");
              }}
              disabled={!newCommentText.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
