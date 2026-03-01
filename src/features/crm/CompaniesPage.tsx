import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { CompanyStatus, CompanyType, InterconnectionType, OurEntity, Workscope } from "../../store/types";
import { getTrackStage } from "../../store/interconnection";

const types: CompanyType[] = ["MNO", "Exclusive", "Aggregator", "MVNO", "Large Aggregator", "Wholesale Carrier", "Enterprise"];
const scopes: Workscope[] = ["SMS", "Voice", "Data", "Software", "RCS"];
const interconnectionTypes: InterconnectionType[] = ["One-way", "Two-way"];

interface CompaniesPageProps {
  companyStatus: CompanyStatus;
  title: string;
}

export function CompaniesPage({ companyStatus, title }: CompaniesPageProps) {
  const state = useAppStore();
  const [ownerUserId, setOwnerUserId] = useState("");
  const [ourEntity, setOurEntity] = useState<"" | OurEntity>("");
  const [type, setType] = useState("");
  const [workscope, setWorkscope] = useState("");
  const [interconnectionType, setInterconnectionType] = useState("");

  const processMap = useMemo(() => {
    const map = new Map<string, typeof state.interconnectionProcesses>();
    state.interconnectionProcesses.forEach((row) => {
      const list = map.get(row.companyId) ?? [];
      list.push(row);
      map.set(row.companyId, list);
    });
    return map;
  }, [state.interconnectionProcesses]);

  const rows = useMemo(
    () =>
      state.companies
        .filter((company) => company.companyStatus === companyStatus)
        .filter((company) => (ownerUserId ? company.ownerUserId === ownerUserId : true))
        .filter((company) => (ourEntity ? company.ourEntity === ourEntity : true))
        .filter((company) => (type ? company.type === type : true))
        .filter((company) => (workscope ? company.workscope.includes(workscope as Workscope) : true))
        .filter((company) => (interconnectionType ? company.interconnectionType === interconnectionType : true))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [companyStatus, interconnectionType, ourEntity, ownerUserId, state.companies, type, workscope],
  );

  return (
    <div className="space-y-4">
      <Card title={title}>
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <div>
            <FieldLabel>Owner</FieldLabel>
            <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
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
            <select value={ourEntity} onChange={(e) => setOurEntity(e.target.value as "" | OurEntity)}>
              <option value="">All</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="TR">TR</option>
            </select>
          </div>
          <div>
            <FieldLabel>Type</FieldLabel>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              {types.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Workscope</FieldLabel>
            <select value={workscope} onChange={(e) => setWorkscope(e.target.value)}>
              <option value="">All</option>
              {scopes.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Interconnection type</FieldLabel>
            <select value={interconnectionType} onChange={(e) => setInterconnectionType(e.target.value)}>
              <option value="">All</option>
              {interconnectionTypes.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Our entity</th>
              <th>Owner</th>
              <th>Type</th>
              <th>Workscope</th>
              <th>SMS process</th>
              <th>Voice process</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => {
              const rowsForCompany = processMap.get(company.id) ?? [];
              const smsStage = getTrackStage(rowsForCompany, "SMS");
              const voiceStage = getTrackStage(rowsForCompany, "Voice");
              const missingVoice = voiceStage === "None";
              const missingSms = smsStage === "None";
              return (
                <tr key={company.id}>
                  <td>
                    <div>
                      <p className="font-semibold">{company.name}</p>
                      <p className="text-[11px] text-slate-500">{company.companyStatus}</p>
                    </div>
                  </td>
                  <td>
                    <Badge>{company.ourEntity}</Badge>
                  </td>
                  <td>{getUserName(state, company.ownerUserId)}</td>
                  <td>{company.type}</td>
                  <td>{company.workscope.join(", ")}</td>
                  <td>
                    <Badge>{smsStage}</Badge>
                  </td>
                  <td>
                    <Badge>{voiceStage}</Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {missingSms && (
                        <Button size="sm" onClick={() => state.startInterconnectionProcess(company.id, "SMS")}>
                          Start SMS
                        </Button>
                      )}
                      {missingVoice && (
                        <Button size="sm" variant="secondary" onClick={() => state.startInterconnectionProcess(company.id, "Voice")}>
                          Start Voice
                        </Button>
                      )}
                      <Link to={`/companies/${company.id}`} className="text-xs font-semibold text-brand-700">
                        Open
                      </Link>
                    </div>
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
