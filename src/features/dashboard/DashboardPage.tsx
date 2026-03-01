import { Card, Badge } from "../../components/ui";
import { useAppStore } from "../../store/db";

export function DashboardPage() {
  const events = useAppStore((s) => s.events);
  const meetings = useAppStore((s) => s.meetings);
  const companies = useAppStore((s) => s.companies);
  const interconnectionProcesses = useAppStore((s) => s.interconnectionProcesses);
  const notes = useAppStore((s) => s.notes);

  const due = notes.filter(
    (n) => n.reminderAt && !n.reminderTriggered && new Date(n.reminderAt).getTime() <= Date.now(),
  ).length;

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Card title="Upcoming Events">
        <p className="text-2xl font-bold text-slate-800">{events.length}</p>
      </Card>
      <Card title="Meetings">
        <p className="text-2xl font-bold text-slate-800">{meetings.length}</p>
      </Card>
      <Card title="Leads / Clients">
        <p className="text-2xl font-bold text-slate-800">
          {companies.filter((c) => c.companyStatus === "LEAD").length} /{" "}
          {companies.filter((c) => c.companyStatus === "CLIENT").length}
        </p>
      </Card>
      <Card title="Interconnection In Progress">
        <p className="text-2xl font-bold text-slate-800">
          {interconnectionProcesses.filter((p) => p.stage !== "Completed" && p.stage !== "Failed").length}
        </p>
      </Card>
      <Card title="Due reminders" className="lg:col-span-2">
        <p className="mb-3 text-xl font-semibold">{due}</p>
        <p className="text-xs text-slate-500">Triggered reminders are visible from top Notifications.</p>
      </Card>
      <Card title="Quick context" className="lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          <Badge>White + Blue Corporate UI</Badge>
          <Badge>Frontend only / localStorage</Badge>
          <Badge>50+ companies dummy data</Badge>
          <Badge>Event → CRM → Interconnection flow</Badge>
        </div>
      </Card>
    </div>
  );
}
