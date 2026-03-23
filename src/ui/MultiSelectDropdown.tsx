import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectDropdownProps<T> {
  label: string;
  items: T[];
  selectedIds: string[];
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemColor?: (item: T) => string;
  isDisabled?: (item: T) => boolean;
  getDisabledLabel?: (item: T) => string;
  onToggle: (id: string) => void;
  renderPill?: (item: T) => ReactNode;
}

export function MultiSelectDropdown<T>({ label, items, selectedIds, getItemId, getItemLabel, getItemColor, isDisabled, getDisabledLabel, onToggle, renderPill }: MultiSelectDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const selectedItems = items.filter((i) => selectedIds.includes(getItemId(i)));

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-white">
        <span>{label}{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {items.map((item) => {
            const id = getItemId(item);
            const checked = selectedIds.includes(id);
            const disabled = isDisabled?.(item) ?? false;
            return (
              <label key={id} className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                <input type="checkbox" checked={checked || disabled} disabled={disabled} onChange={() => !disabled && onToggle(id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                {getItemColor && <span className={`inline-block h-3 w-3 rounded-full flex-shrink-0 ${getItemColor(item)}`} />}
                <span className="flex-1 text-gray-700">{getItemLabel(item)}</span>
                {disabled && getDisabledLabel && <span className="text-[10px] text-gray-400">{getDisabledLabel(item)}</span>}
              </label>
            );
          })}
          {items.length === 0 && <p className="px-3 py-4 text-xs text-gray-400 text-center">No items</p>}
        </div>
      )}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedItems.map((item) => {
            const id = getItemId(item);
            const forced = isDisabled?.(item) ?? false;
            return renderPill ? renderPill(item) : (
              <span key={id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white ${getItemColor?.(item) ?? "bg-gray-400"}`}>
                {getItemLabel(item)}
                {!forced && <button type="button" onClick={() => onToggle(id)} className="ml-0.5 hover:opacity-70"><X className="h-2.5 w-2.5" /></button>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
