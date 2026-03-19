import { ReactNode, useRef, useState } from "react";

interface UiTopbarProps {
  sidebarCollapsed: boolean;
  userName?: string;
  userRole?: string;
  onToggleMobileSidebar?: () => void;
  searchPlaceholder?: string;
  children?: ReactNode;
}

export function UiTopbar({ sidebarCollapsed, userName, userRole, searchPlaceholder = "Search..." }: UiTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const initials = (userName ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      className={`fixed top-0 right-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 transition-all duration-200 ${
        sidebarCollapsed ? "left-[70px]" : "left-[264px]"
      }`}
    >
      {/* Left: breadcrumb area */}
      <div className="flex items-center gap-3">
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-72 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0">
                <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                onBlur={() => { if (!searchValue) setSearchOpen(false); }}
                autoFocus
              />
              {searchValue && (
                <button onClick={() => { setSearchValue(""); searchRef.current?.focus(); }} className="text-gray-400 hover:text-gray-600">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4L10 10M10 4L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              )}
            </div>
            <button onClick={() => { setSearchOpen(false); setSearchValue(""); }} className="text-xs text-gray-500 hover:text-gray-700">
              Esc
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
              <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">{searchPlaceholder}</span>
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-gray-300 bg-white px-1.5 text-[10px] font-medium text-gray-400">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C7.24 2 5 4.24 5 7V10.5L3.5 13H16.5L15 10.5V7C15 4.24 12.76 2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8.5 16C8.5 16.83 9.17 17.5 10 17.5C10.83 17.5 11.5 16.83 11.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        {/* Divider */}
        <div className="mx-1 h-6 w-px bg-gray-200" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block text-right">
            <p className="text-[13px] font-semibold text-gray-800 leading-tight">{userName ?? "User"}</p>
            <p className="text-[11px] text-gray-500 leading-tight">{userRole ?? "—"}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white ring-2 ring-indigo-500/20">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
