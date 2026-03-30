import React, { useMemo, useState } from "react";
import { BarChart2, FileText, LayoutGrid } from "lucide-react";
import { useAppStore } from "../../store/db";
import { UiPageHeader } from "../../ui/UiPageHeader";
import type { HrEmployee } from "../../store/types";
import { MyReportTab } from "./MyReportTab";
import { TeamViewTab } from "./TeamViewTab";
import { ManagementTab } from "./ManagementTab";

export function ManagementReportsPage() {
  const state = useAppStore();
  const [activeTab, setActiveTab] = useState<"my" | "team" | "management">("my");

  const myEmployee = useMemo<HrEmployee | null>(() => {
    const bySystem = state.hrEmployees.find((e) => e.systemUserId === state.activeUserId && e.active);
    if (bySystem) return bySystem;
    return state.hrEmployees.find((e) => e.active) ?? state.hrEmployees[0] ?? null;
  }, [state.hrEmployees, state.activeUserId]);

  const tabs: { key: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { key: "my", label: "My Report", icon: <FileText className="h-3.5 w-3.5" /> },
    { key: "team", label: "Team View", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { key: "management", label: "Management", icon: <BarChart2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <UiPageHeader title="Management Reports" subtitle="Weekly staff reports & team analytics" />

      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "my" && <MyReportTab myEmployee={myEmployee} />}
      {activeTab === "team" && <TeamViewTab myEmployee={myEmployee} />}
      {activeTab === "management" && <ManagementTab />}
    </div>
  );
}
