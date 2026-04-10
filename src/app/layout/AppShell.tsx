import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CheckSquare, BarChart2, Calendar, TrendingUp, GitMerge,
  Building2, FileText, StickyNote, Radio, Phone, Network, UserCheck,
  ClipboardList, PieChart, Users, UserCircle, Monitor, GitBranch, DollarSign,
  Receipt, CalendarOff, CreditCard, Settings2, Home, Landmark, Settings,
  FolderKanban, LayoutList, ClipboardCheck,
} from "lucide-react";
import { useAppStore } from "../../store/db";
import { Button } from "../../components/ui";
import { CompanyType, InterconnectionType, OurEntity, Workscope } from "../../store/types";
import { UiAppShell, SidebarNavGroup } from "../../ui/layout";

function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });
  const toggle = () => setCollapsed((prev) => { const next = !prev; try { localStorage.setItem("sidebar-collapsed", String(next)); } catch { /* noop */ } return next; });
  return { collapsed, toggle };
}

export function AppShell() {
  const navigate = useNavigate();
  const users = useAppStore((s) => s.users);
  const activeUserId = useAppStore((s) => s.activeUserId);
  const processReminders = useAppStore((s) => s.processReminders);
  const createCompany = useAppStore((s) => s.createCompany);
  const leadsCount = useAppStore(
    (s) => s.companies.filter((c) => c.companyStatus === "LEAD" && c.leadDisposition === "Open").length,
  );
  const interconnectionCount = useAppStore((s) => s.companies.filter((c) => c.companyStatus === "INTERCONNECTION").length);
  const tasksOpenCount = useAppStore((s) => s.tasks.filter((t) => (t.assigneeUserId === s.activeUserId || t.createdByUserId === s.activeUserId) && t.status !== "Done" && t.status !== "Cancelled" && !t.completedAt).length);
  const opsUrgentCount = useAppStore(
    (s) => s.opsCases.filter((entry) => (entry.status === "NEW" || entry.status === "IN_PROGRESS") && entry.severity === "URGENT").length,
  );
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    ownerUserId: activeUserId,
    ourEntity: "UK" as OurEntity,
    type: "Aggregator" as CompanyType,
    interconnectionType: "Two-way" as InterconnectionType,
    workscope: "SMS" as Workscope,
    region: "",
  });
  const { collapsed, toggle } = useSidebarCollapse();

  useEffect(() => {
    const id = setInterval(() => { processReminders(); }, 20_000);
    return () => clearInterval(id);
  }, [processReminders]);

  const activeUser = users.find((u) => u.id === activeUserId);

  useEffect(() => {
    if (!newLeadOpen) return;
    const currentUserDefaultEntity = users.find((user) => user.id === activeUserId)?.defaultOurEntity ?? "UK";
    setNewLeadForm((prev) => ({ ...prev, ownerUserId: activeUserId, ourEntity: currentUserDefaultEntity }));
  }, [activeUserId, newLeadOpen, users]);

  function closeNewLeadModal() {
    setNewLeadOpen(false);
    setNewLeadForm({
      name: "",
      ownerUserId: activeUserId,
      ourEntity: users.find((user) => user.id === activeUserId)?.defaultOurEntity ?? "UK",
      type: "Aggregator",
      interconnectionType: "Two-way",
      workscope: "SMS",
      region: "",
    });
  }

  function submitNewLead() {
    const name = newLeadForm.name.trim();
    if (!name) return;
    const companyId = createCompany({
      name,
      companyStatus: "LEAD",
      leadDisposition: "Open",
      createdFrom: "Manual",
      ownerUserId: newLeadForm.ownerUserId || activeUserId,
      watcherUserIds: [newLeadForm.ownerUserId || activeUserId],
      ourEntity: newLeadForm.ourEntity,
      type: newLeadForm.type,
      interconnectionType: newLeadForm.interconnectionType,
      workscope: [newLeadForm.workscope],
      region: newLeadForm.region.trim() || undefined,
      evaluation: { technicalFit: "Unknown", commercialFit: "Unknown", riskLevel: "Unknown" },
      tags: [],
      emails: {},
    });
    closeNewLeadModal();
    navigate(`/companies/${companyId}`);
  }

  function badge(count: number, color: string) {
    if (!count) return undefined;
    return (
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white ${color}`}>
        {count}
      </span>
    );
  }

  const navGroups: SidebarNavGroup[] = [
    {
      title: "Daily Management",
      items: [
        { to: "/projects", label: "Projects", icon: <FolderKanban size={16} /> },
        { to: "/tasks", label: "My Tasks", icon: <CheckSquare size={16} />, badge: badge(tasksOpenCount, "bg-sky-500") },
        { to: "/tasks/all", label: "All Tasks", icon: <LayoutList size={16} /> },
        { to: "/management-reports", label: "Management Reports", icon: <BarChart2 size={16} /> },
      ],
    },
    {
      title: "CRM",
      items: [
        { to: "/events", label: "Events", icon: <Calendar /> },
        { to: "/event-evaluation", label: "Event Planning", icon: <ClipboardCheck size={16} /> },
        { to: "/leads", label: "Leads", icon: <TrendingUp />, badge: badge(leadsCount, "bg-amber-500") },
        { to: "/interconnection", label: "Interconnection", icon: <GitMerge />, badge: badge(interconnectionCount, "bg-cyan-500") },
        { to: "/accounts", label: "Clients", icon: <Building2 /> },
        { to: "/contracts", label: "Contracts", icon: <FileText /> },
        { to: "/notes", label: "Notes", icon: <StickyNote /> },
      ],
    },
    {
      title: "Operations Command Center",
      items: [
        { to: "/ops/sms-noc", label: "SMS NOC Portal", icon: <Radio />, badge: opsUrgentCount > 0 ? badge(opsUrgentCount, "bg-rose-500") : undefined },
        { to: "/ops/voice-noc", label: "Voice NOC Portal", icon: <Phone /> },
        { to: "/ops/routing-noc", label: "Routing & NOC", icon: <Network /> },
        { to: "/ops/account-managers", label: "Account Managers", icon: <UserCheck /> },
        { to: "/ops/noc-performance-audit", label: "Performance Audit", icon: <ClipboardList /> },
        { to: "/ops/analytics", label: "A2P Analytics", icon: <PieChart /> },
      ],
    },
    {
      title: "Human Resources",
      items: [
        { to: "/hr/dashboard", label: "HR Dashboard", icon: <Users /> },
        { to: "/hr/people", label: "People", icon: <UserCircle /> },
        { to: "/hr/assets", label: "Assets & Software", icon: <Monitor /> },
        { to: "/hr/organization", label: "Organization", icon: <GitBranch /> },
        { to: "/hr/payroll", label: "Payroll & Comp", icon: <DollarSign /> },
        { to: "/hr/payslip", label: "My Payslip", icon: <Receipt /> },
        { to: "/hr/leave", label: "Leave Management", icon: <CalendarOff /> },
        { to: "/hr/expenses", label: "Expenses", icon: <CreditCard /> },
        { to: "/hr/settings", label: "HR Settings", icon: <Settings2 /> },
      ],
    },
    {
      title: "Other",
      items: [
        { to: "/", label: "Dashboard", icon: <Home /> },
        { to: "/finance", label: "Finance", icon: <Landmark /> },
        { to: "/settings", label: "Settings", icon: <Settings /> },
      ],
    },
  ];

  return (
    <>
      <UiAppShell
        navGroups={navGroups}
        sidebarCollapsed={collapsed}
        onToggleSidebar={toggle}
        userName={activeUser?.name}
        userRole={activeUser?.role}
        sidebarFooterSlot={
          !collapsed ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <p className="text-[10px] text-slate-500">Signed in as</p>
              <p className="text-xs font-semibold text-slate-200 truncate">{activeUser?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{activeUser?.role}</p>
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400" title={activeUser?.name}>
              {(activeUser?.name ?? "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          )
        }
      />

      {newLeadOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm p-4" onClick={closeNewLeadModal}>
          <div
            className="mx-auto mt-16 w-full max-w-xl rounded-xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-800">Create new lead</h3>
              <p className="text-sm text-gray-500">Manually add a company as LEAD.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Company name</label>
                <input
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. NovaTel Global"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Owner</label>
                <select value={newLeadForm.ownerUserId} onChange={(e) => setNewLeadForm((prev) => ({ ...prev, ownerUserId: e.target.value }))}>
                  {users.map((user) => (<option key={user.id} value={user.id}>{user.name}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
                <select value={newLeadForm.type} onChange={(e) => setNewLeadForm((prev) => ({ ...prev, type: e.target.value as CompanyType }))}>
                  {(["MNO", "Exclusive", "Aggregator", "MVNO", "Large Aggregator", "Wholesale Carrier", "Enterprise"] as CompanyType[]).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Our entity</label>
                <select value={newLeadForm.ourEntity} onChange={(e) => setNewLeadForm((prev) => ({ ...prev, ourEntity: e.target.value as OurEntity }))}>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                  <option value="TR">TR</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Interconnection type</label>
                <select value={newLeadForm.interconnectionType} onChange={(e) => setNewLeadForm((prev) => ({ ...prev, interconnectionType: e.target.value as InterconnectionType }))}>
                  <option value="One-way">One-way</option>
                  <option value="Two-way">Two-way</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Workscope</label>
                <select value={newLeadForm.workscope} onChange={(e) => setNewLeadForm((prev) => ({ ...prev, workscope: e.target.value as Workscope }))}>
                  <option value="SMS">SMS</option>
                  <option value="Voice">Voice</option>
                  <option value="Data">Data</option>
                  <option value="Software">Software</option>
                  <option value="RCS">RCS</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Region (optional)</label>
                <input
                  value={newLeadForm.region}
                  onChange={(e) => setNewLeadForm((prev) => ({ ...prev, region: e.target.value }))}
                  placeholder="e.g. Middle East"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={closeNewLeadModal}>Cancel</Button>
              <Button size="sm" onClick={submitNewLead} disabled={!newLeadForm.name.trim()}>Create lead</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
