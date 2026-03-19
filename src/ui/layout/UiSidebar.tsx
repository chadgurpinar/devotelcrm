import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
}

export interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
}

interface UiSidebarProps {
  groups: SidebarNavGroup[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  headerSlot?: ReactNode;
  footerSlot?: ReactNode;
}

export function UiSidebar({ groups, collapsed, onToggleCollapse, headerSlot, footerSlot }: UiSidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-[#1c1c2e] transition-all duration-200 ${
        collapsed ? "w-[70px]" : "w-[264px]"
      }`}
    >
      {/* Header */}
      <div className={`flex h-16 items-center border-b border-white/5 ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
        {collapsed ? (
          <span className="text-lg font-bold text-white">D</span>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-xs font-bold text-white">D</div>
            <span className="text-[15px] font-semibold text-white tracking-tight">Devotel CRM</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition ${
            collapsed ? "hidden lg:flex" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform ${collapsed ? "rotate-180" : ""}`}>
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {headerSlot}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <p className="mb-1.5 px-5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5 px-3">
              {group.items.map((item) => {
                const isActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-500/15 text-indigo-400"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span
                      className={`inline-flex flex-shrink-0 items-center justify-center ${
                        collapsed ? "[&>svg]:h-[18px] [&>svg]:w-[18px]" : "[&>svg]:h-4 [&>svg]:w-4"
                      } ${
                        isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footerSlot && (
        <div className={`border-t border-white/5 p-3 ${collapsed ? "flex justify-center" : ""}`}>
          {footerSlot}
        </div>
      )}
    </aside>
  );
}
