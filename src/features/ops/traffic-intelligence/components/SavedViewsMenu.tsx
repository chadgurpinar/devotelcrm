import { useState } from "react";
import { Button } from "../../../../components/ui";
import type { SavedTrafficViewV1 } from "../useSavedTrafficViews";

interface Props {
  views: SavedTrafficViewV1[];
  onSave: (name: string) => void;
  onLoad: (v: SavedTrafficViewV1) => void;
  onDelete: (id: string) => void;
}

export function SavedViewsMenu({ views, onSave, onLoad, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="relative">
      <Button size="sm" variant="outline" type="button" onClick={() => setOpen((o) => !o)}>
        Saved views
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex gap-1">
            <input
              className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
              placeholder="Name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              size="sm"
              type="button"
              onClick={() => {
                const n = name.trim();
                if (!n) return;
                onSave(n);
                setName("");
                setOpen(false);
              }}
            >
              Save
            </Button>
          </div>
          <ul className="mt-2 max-h-48 overflow-auto border-t border-slate-100 pt-1">
            {views.length === 0 && <li className="px-1 py-2 text-[11px] text-slate-400">No saved views yet.</li>}
            {views.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-1 border-b border-slate-50 py-1">
                <button type="button" className="truncate text-left text-xs font-medium text-indigo-700 hover:underline" onClick={() => { onLoad(v); setOpen(false); }}>
                  {v.name}
                </button>
                <button type="button" className="shrink-0 text-[10px] text-rose-600 hover:underline" onClick={() => onDelete(v.id)}>
                  Del
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
