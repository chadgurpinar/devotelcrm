import { useState } from "react";
import type { WeekComment } from "./types";

export function GeneralCommentsCard({ comments, onAdd }: { comments: WeekComment[]; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");

  function handlePost() {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">General Comments</p>
      </div>
      <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
        {comments.length === 0 && <p className="text-xs text-gray-400 italic py-2">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className={`py-1.5 pl-3 border-l-2 ${c.aiGenerated ? "border-violet-300" : "border-gray-200"}`}>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[7px] font-bold text-indigo-600">{c.authorInitials}</span>
              <span className="font-semibold text-gray-700">{c.authorName}</span>
              {c.aiGenerated && <span className="rounded-full bg-violet-100 px-1 py-px text-[8px] font-medium text-violet-700">AI</span>}
              <span className="text-gray-400">· {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">{c.text}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <input className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Add a comment..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePost()} />
        <button onClick={handlePost} disabled={!text.trim()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30">Post</button>
      </div>
    </div>
  );
}
