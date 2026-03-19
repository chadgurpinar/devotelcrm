import { ReactNode, useState } from "react";

export interface UiDataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  width?: string;
}

interface UiDataTableProps<T> {
  columns: UiDataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  toolbar?: ReactNode;
}

type SortDir = "asc" | "desc";

export function UiDataTable<T>({ columns, data, rowKey, onRowClick, emptyMessage = "No data found.", toolbar }: UiDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(col: UiDataTableColumn<T>) {
    if (!col.sortable || !col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  const sorted = (() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const getValue = col.sortValue;
    return [...data].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {toolbar && (
        <div className="border-b border-gray-100 px-5 py-3.5">
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 ${
                    col.sortable ? "cursor-pointer select-none hover:text-gray-700" : ""
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`}>
                        <path d="M6 3L9 7H3L6 3Z" fill="currentColor" />
                      </svg>
                    )}
                    {col.sortable && sortKey !== col.key && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-300">
                        <path d="M6 3L8.5 6H3.5L6 3Z" fill="currentColor" />
                        <path d="M6 9L3.5 6H8.5L6 9Z" fill="currentColor" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-50 transition-colors last:border-0 ${
                    onRowClick ? "cursor-pointer hover:bg-gray-50/80" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3 text-sm text-gray-700">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-2.5">
          <p className="text-xs text-gray-400">{sorted.length} row{sorted.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}
