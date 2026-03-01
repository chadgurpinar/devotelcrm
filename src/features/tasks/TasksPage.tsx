import { useMemo, useState } from "react";
import { Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { TaskPriority, TaskStatus } from "../../store/types";
import { getCompanyName, getUserName } from "../../store/selectors";

type Tab = "My tasks" | "Assigned to me" | "Assigned by me";

export function TasksPage() {
  const state = useAppStore();
  const [tab, setTab] = useState<Tab>("My tasks");
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeUserId: state.activeUserId,
    priority: "Medium" as TaskPriority,
  });
  const [updateText, setUpdateText] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    if (tab === "Assigned to me") {
      return state.tasks.filter((t) => t.assigneeUserId === state.activeUserId);
    }
    if (tab === "Assigned by me") {
      return state.tasks.filter((t) => t.createdByUserId === state.activeUserId);
    }
    return state.tasks.filter((t) => t.assigneeUserId === state.activeUserId || t.createdByUserId === state.activeUserId);
  }, [state.activeUserId, state.tasks, tab]);

  return (
    <div className="space-y-4">
      <Card title="Task management (simple and practical)">
        <div className="mb-3 flex flex-wrap gap-2">
          {(["My tasks", "Assigned to me", "Assigned by me"] as Tab[]).map((x) => (
            <Button key={x} variant={tab === x ? "primary" : "secondary"} onClick={() => setTab(x)}>
              {x}
            </Button>
          ))}
        </div>
        <form
          className="mb-3 grid gap-2 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            state.createTask({
              ...form,
              status: "Open",
              createdByUserId: state.activeUserId,
              description: form.description,
            });
            setForm({ title: "", description: "", assigneeUserId: state.activeUserId, priority: "Medium" });
          }}
        >
          <div>
            <FieldLabel>Title</FieldLabel>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Assignee</FieldLabel>
            <select value={form.assigneeUserId} onChange={(e) => setForm((f) => ({ ...f, assigneeUserId: e.target.value }))}>
              {state.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Priority</FieldLabel>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <Button type="submit">Create task</Button>
          </div>
        </form>

        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Created by</th>
              <th>Assignee</th>
              <th>Company</th>
              <th>Updates</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((task) => (
              <tr key={task.id}>
                <td>
                  <p className="font-semibold">{task.title}</p>
                  <p className="text-slate-500">{task.description}</p>
                </td>
                <td>
                  <select
                    value={task.status}
                    onChange={(e) =>
                      state.updateTask({
                        ...task,
                        status: e.target.value as TaskStatus,
                      })
                    }
                  >
                    <option>Open</option>
                    <option>Doing</option>
                    <option>Done</option>
                  </select>
                </td>
                <td>{task.priority}</td>
                <td>{getUserName(state, task.createdByUserId)}</td>
                <td>{getUserName(state, task.assigneeUserId)}</td>
                <td>{getCompanyName(state, task.relatedCompanyId)}</td>
                <td>
                  <div className="space-y-1">
                    {task.updates.slice(-2).map((update) => (
                      <p key={update.id} className="text-xs text-slate-500">
                        {update.text}
                      </p>
                    ))}
                    <input
                      placeholder="Add update note"
                      value={updateText[task.id] ?? ""}
                      onChange={(e) => setUpdateText((x) => ({ ...x, [task.id]: e.target.value }))}
                    />
                    <Button
                      onClick={() => {
                        const text = updateText[task.id]?.trim();
                        if (!text) return;
                        state.addTaskUpdate(task.id, text);
                        setUpdateText((x) => ({ ...x, [task.id]: "" }));
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
