import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { InterconnectionProcess, InterconnectionStage, OurEntity } from "../../store/types";

const stages: InterconnectionStage[] = ["NDA", "Contract", "Technical", "AM_Assigned", "Completed", "Failed"];

function ProcessStageCell({
  process,
  onCreate,
  onUpdateStage,
}: {
  process?: InterconnectionProcess;
  onCreate: () => void;
  onUpdateStage: (stage: InterconnectionStage) => void;
}) {
  if (!process) {
    return (
      <Button size="sm" variant="secondary" onClick={onCreate}>
        Start
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <select className="min-w-[140px]" value={process.stage} onChange={(e) => onUpdateStage(e.target.value as InterconnectionStage)}>
        {stages.map((stage) => (
          <option key={stage}>{stage}</option>
        ))}
      </select>
      <Badge>{process.stage}</Badge>
    </div>
  );
}

export function InterconnectionPage() {
  const state = useAppStore();
  const [ownerFilter, setOwnerFilter] = useState("");
  const [ourEntityFilter, setOurEntityFilter] = useState<"" | OurEntity>("");

  const rows = useMemo(
    () =>
      state.companies
        .filter((company) => company.companyStatus === "INTERCONNECTION")
        .filter((company) => (ownerFilter ? company.ownerUserId === ownerFilter : true))
        .filter((company) => (ourEntityFilter ? company.ourEntity === ourEntityFilter : true))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ourEntityFilter, ownerFilter, state.companies],
  );

  const processMap = useMemo(() => {
    const map = new Map<string, InterconnectionProcess[]>();
    state.interconnectionProcesses.forEach((process) => {
      const list = map.get(process.companyId) ?? [];
      list.push(process);
      map.set(process.companyId, list);
    });
    return map;
  }, [state.interconnectionProcesses]);

  return (
    <div className="space-y-4">
      <Card title="Interconnection operational list">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <div>
            <FieldLabel>Owner</FieldLabel>
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
              <option value="">All</option>
              {state.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Our entity</FieldLabel>
            <select value={ourEntityFilter} onChange={(e) => setOurEntityFilter(e.target.value as "" | OurEntity)}>
              <option value="">All</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="TR">TR</option>
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Our entity</th>
              <th>Owner</th>
              <th>SMS process</th>
              <th>Voice process</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => {
              const processes = processMap.get(company.id) ?? [];
              const smsProcess = processes.find((process) => process.track === "SMS");
              const voiceProcess = processes.find((process) => process.track === "Voice");
              const updatedValues = [smsProcess?.updatedAt, voiceProcess?.updatedAt].filter(Boolean) as string[];
              const lastUpdated = updatedValues.length ? updatedValues.sort()[updatedValues.length - 1] : undefined;
              return (
                <tr key={company.id}>
                  <td>
                    <p className="font-semibold">{company.name}</p>
                    <p className="text-[11px] text-slate-500">{company.companyStatus}</p>
                  </td>
                  <td>
                    <Badge>{company.ourEntity}</Badge>
                  </td>
                  <td>{getUserName(state, company.ownerUserId)}</td>
                  <td>
                    <ProcessStageCell
                      process={smsProcess}
                      onCreate={() => state.startInterconnectionProcess(company.id, "SMS")}
                      onUpdateStage={(stage) => state.setInterconnectionStage(smsProcess!.id, stage)}
                    />
                  </td>
                  <td>
                    <ProcessStageCell
                      process={voiceProcess}
                      onCreate={() => state.startInterconnectionProcess(company.id, "Voice")}
                      onUpdateStage={(stage) => state.setInterconnectionStage(voiceProcess!.id, stage)}
                    />
                  </td>
                  <td>{lastUpdated ? new Date(lastUpdated).toLocaleString() : "-"}</td>
                  <td>
                    <Link to={`/companies/${company.id}`} className="text-xs font-semibold text-brand-700">
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
