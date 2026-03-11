import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/db";
import { Button } from "../../components/ui";
import { CompanyType, InterconnectionType, OurEntity, Workscope } from "../../store/types";

const navGroups = [
  {
    title: "Daily Management",
    items: [
      { to: "/tasks", label: "Tasks", icon: "T" },
      { to: "/reports", label: "Projects", icon: "P" },
      { to: "/management-reports", label: "Management Reports", icon: "R" },
    ],
  },
  {
    title: "CRM",
    items: [
      { to: "/events", label: "Events", icon: "E" },
      { to: "/leads", label: "Leads", icon: "L" },
      { to: "/interconnection", label: "Interconnection", icon: "I" },
      { to: "/accounts", label: "Clients", icon: "C" },
      { to: "/contracts", label: "Contracts", icon: "K" },
      { to: "/notes", label: "Notes", icon: "N" },
    ],
  },
  {
    title: "Operations Command Center",
    items: [
      { to: "/ops/sms-noc", label: "SMS NOC Portal", icon: "S" },
      { to: "/ops/voice-noc", label: "Voice NOC Portal", icon: "V" },
      { to: "/ops/routing-noc", label: "Routing & NOC Portal", icon: "R" },
      { to: "/ops/am-noc-routing", label: "AM & NOC & Routing Portal", icon: "A" },
      { to: "/ops/account-managers", label: "Account Managers Portal", icon: "M" },
      { to: "/ops/noc-performance-audit", label: "NOC Performance / Audit", icon: "P" },
    ],
  },
  {
    title: "Human Resources",
    items: [
      { to: "/hr/dashboard", label: "HR Dashboard", icon: "H" },
      { to: "/hr/people", label: "People", icon: "P" },
      { to: "/hr/organization", label: "Organization", icon: "O" },
      { to: "/hr/payroll", label: "Payroll & Compensation", icon: "Y" },
      { to: "/hr/leave", label: "Leave Management", icon: "L" },
      { to: "/hr/assets", label: "Assets & Software", icon: "A" },
      { to: "/hr/expenses", label: "Expenses", icon: "E" },
      { to: "/hr/settings", label: "HR Settings", icon: "S" },
    ],
  },
  {
    title: "Other",
    items: [
      { to: "/", label: "Dashboard", icon: "D" },
      { to: "/finance", label: "Finance", icon: "F" },
      { to: "/settings", label: "Settings", icon: "S" },
    ],
  },
];

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
  const tasksOpenCount = useAppStore((s) => s.tasks.filter((t) => t.status !== "Done").length);
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

  useEffect(() => {
    const id = setInterval(() => {
      processReminders();
    }, 20_000);
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
      evaluation: {
        technicalFit: "Unknown",
        commercialFit: "Unknown",
        riskLevel: "Unknown",
      },
      tags: [],
      emails: {},
    });
    closeNewLeadModal();
    navigate(`/companies/${companyId}`);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-60 flex-col border-r border-slate-800 bg-[#17366f] p-3 text-slate-100">
        <div className="mb-4 rounded-lg border border-white/20 bg-[#1d4184] p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-200">TelecomCRM</p>
          <h1 className="text-sm font-semibold">Event-Driven</h1>
        </div>
        <nav className="space-y-2">
          {navGroups.map((group) => (
            <section key={group.title} className="space-y-0.5">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300">{group.title}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition ${
                      isActive ? "bg-white/20 text-white" : "text-slate-200 hover:bg-white/10"
                    }`
                  }
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-white/15 text-[10px]">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.to === "/leads" && (
                    <span className="rounded-full bg-brand-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {leadsCount}
                    </span>
                  )}
                  {item.to === "/tasks" && (
                    <span className="rounded-full bg-sky-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {tasksOpenCount}
                    </span>
                  )}
                  {item.to === "/interconnection" && (
                    <span className="rounded-full bg-cyan-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {interconnectionCount}
                    </span>
                  )}
                  {item.to === "/ops/sms-noc" && opsUrgentCount > 0 && (
                    <span className="rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {opsUrgentCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
        <div className="mt-auto rounded-lg border border-white/15 bg-[#1a3b78] p-2">
          <p className="text-[10px] text-slate-300">Current user</p>
          <p className="text-xs font-semibold text-white">{activeUser?.name}</p>
          <p className="text-[10px] text-slate-300">{activeUser?.role}</p>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-3">
          <Outlet />
        </main>
      </div>
      {newLeadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 p-4" onClick={closeNewLeadModal}>
          <div
            className="mx-auto mt-16 w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Create new lead</h3>
              <p className="text-xs text-slate-500">Manually add a company as LEAD.</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Company name</label>
                <input
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. NovaTel Global"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Owner</label>
                <select
                  value={newLeadForm.ownerUserId}
                  onChange={(e) => setNewLeadForm((prev) => ({ ...prev, ownerUserId: e.target.value }))}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Type</label>
                <select
                  value={newLeadForm.type}
                  onChange={(e) => setNewLeadForm((prev) => ({ ...prev, type: e.target.value as CompanyType }))}
                >
                  {(["MNO", "Exclusive", "Aggregator", "MVNO", "Large Aggregator", "Wholesale Carrier", "Enterprise"] as CompanyType[]).map(
                    (type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Our entity</label>
                <select
                  value={newLeadForm.ourEntity}
                  onChange={(e) => setNewLeadForm((prev) => ({ ...prev, ourEntity: e.target.value as OurEntity }))}
                >
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                  <option value="TR">TR</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Interconnection type</label>
                <select
                  value={newLeadForm.interconnectionType}
                  onChange={(e) => setNewLeadForm((prev) => ({ ...prev, interconnectionType: e.target.value as InterconnectionType }))}
                >
                  <option value="One-way">One-way</option>
                  <option value="Two-way">Two-way</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Workscope</label>
                <select
                  value={newLeadForm.workscope}
                  onChange={(e) => setNewLeadForm((prev) => ({ ...prev, workscope: e.target.value as Workscope }))}
                >
                  <option value="SMS">SMS</option>
                  <option value="Voice">Voice</option>
                  <option value="Data">Data</option>
                  <option value="Software">Software</option>
                  <option value="RCS">RCS</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Region (optional)</label>
                <input
                  value={newLeadForm.region}
                  onChange={(e) => setNewLeadForm((prev) => ({ ...prev, region: e.target.value }))}
                  placeholder="e.g. Middle East"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={closeNewLeadModal}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitNewLead} disabled={!newLeadForm.name.trim()}>
                Create lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
