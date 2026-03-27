import { useState } from "react";
import { X } from "lucide-react";
import type { Priority, QuickTaskInput } from "./types";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function QuickTaskModal({ defaultTitle, defaultAssignee, users, onConfirm, onCancel }: { defaultTitle: string; defaultAssignee: string; users: { id: string; name: string }[]; onConfirm: (input: QuickTaskInput) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(defaultTitle);
  const [assignee, setAssignee] = useState(defaultAssignee);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-40 rounded-xl border border-gray-200 bg-white shadow-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">Quick Task</p>
        <button onClick={onCancel} className="rounded p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"><X className="h-4 w-4" /></button>
      </div>
      <div><label className="text-[10px] text-gray-500">Title</label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-[10px] text-gray-500">Assignee</label><select className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value)}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        <div><label className="text-[10px] text-gray-500">Due Date</label><input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
      </div>
      <div>
        <label className="text-[10px] text-gray-500">Priority</label>
        <div className="flex gap-1 mt-0.5">{(["low", "medium", "high"] as const).map((p) => <button key={p} onClick={() => setPriority(p)} className={`rounded-lg px-3 py-1 text-xs font-medium transition ${priority === p ? (p === "high" ? "bg-rose-100 text-rose-700" : p === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700") : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>{p[0].toUpperCase() + p.slice(1)}</button>)}</div>
      </div>
      <button onClick={() => onConfirm({ title, assignee, dueDate, priority })} disabled={!title.trim()} className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">Create Task</button>
    </div>
  );
}
