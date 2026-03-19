import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { UiSidebar, SidebarNavGroup } from "./UiSidebar";
import { UiTopbar } from "./UiTopbar";

interface UiAppShellProps {
  navGroups: SidebarNavGroup[];
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  userName?: string;
  userRole?: string;
  sidebarHeaderSlot?: ReactNode;
  sidebarFooterSlot?: ReactNode;
  children?: ReactNode;
}

export function UiAppShell({
  navGroups,
  sidebarCollapsed,
  onToggleSidebar,
  userName,
  userRole,
  sidebarHeaderSlot,
  sidebarFooterSlot,
  children,
}: UiAppShellProps) {
  return (
    <div className="min-h-screen bg-[#f8f8fb]">
      <UiSidebar
        groups={navGroups}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
        headerSlot={sidebarHeaderSlot}
        footerSlot={sidebarFooterSlot}
      />

      <UiTopbar
        sidebarCollapsed={sidebarCollapsed}
        userName={userName}
        userRole={userRole}
      />

      <main
        className={`pt-16 min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? "pl-[70px]" : "pl-[264px]"
        }`}
      >
        <div className="p-6">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
}
