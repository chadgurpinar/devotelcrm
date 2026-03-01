import { ChangeEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { Contract, ContractStatus, InterconnectionTrack, OurEntity } from "../../store/types";

const statuses: Array<ContractStatus | "all"> = [
  "all",
  "Draft",
  "InternalSignatureRequested",
  "CounterpartySignatureRequested",
  "FullySigned",
  "Expired",
  "Rejected",
];

const tracks: Array<InterconnectionTrack | "all"> = ["all", "SMS", "Voice"];
const entities: Array<OurEntity | "all"> = ["all", "USA", "UK", "TR"];

function statusBadgeClass(status: ContractStatus): string {
  if (status === "FullySigned") return "bg-emerald-50 text-emerald-700";
  if (status === "InternalSignatureRequested" || status === "CounterpartySignatureRequested") return "bg-amber-50 text-amber-700";
  if (status === "Expired" || status === "Rejected") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ContractsPage() {
  const state = useAppStore();
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState<InterconnectionTrack | "all">("all");
  const [ourEntity, setOurEntity] = useState<OurEntity | "all">("all");
  const [status, setStatus] = useState<ContractStatus | "all">("all");
  const [companyId, setCompanyId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openContractId, setOpenContractId] = useState<string | null>(null);
  const [internalSignerId, setInternalSignerId] = useState(state.activeUserId);
  const [counterpartySignerName, setCounterpartySignerName] = useState("");

  const companyById = useMemo(() => {
    const map = new Map<string, string>();
    state.companies.forEach((company) => map.set(company.id, company.name));
    return map;
  }, [state.companies]);

  const rows = useMemo(() => {
    return state.contracts
      .filter((contract) => (track === "all" ? true : contract.track === track))
      .filter((contract) => (ourEntity === "all" ? true : contract.ourEntity === ourEntity))
      .filter((contract) => (status === "all" ? true : contract.status === status))
      .filter((contract) => (companyId ? contract.companyId === companyId : true))
      .filter((contract) => {
        const companyName = companyById.get(contract.companyId) ?? contract.companyId;
        const haystack = `${companyName} ${contract.contractType} ${contract.status} ${contract.track}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .filter((contract) => (fromDate ? contract.createdAt.slice(0, 10) >= fromDate : true))
      .filter((contract) => (toDate ? contract.createdAt.slice(0, 10) <= toDate : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [companyById, companyId, fromDate, ourEntity, search, state.contracts, status, toDate, track]);

  const selectedContract = useMemo(
    () => (openContractId ? state.contracts.find((contract) => contract.id === openContractId) : undefined),
    [openContractId, state.contracts],
  );

  async function handleUpload(contract: Contract, event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    for (const file of list) {
      try {
        const contentDataUrl = await readFileAsDataUrl(file);
        state.addContractFile(contract.id, {
          kind: contract.status === "FullySigned" ? "Signed" : "Draft",
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedByUserId: state.activeUserId,
          storageRef: `upload://${contract.id}/${file.name}`,
          contentDataUrl,
        });
      } catch {
        state.setContractStatus(contract.id, "Rejected");
      }
    }
    event.target.value = "";
  }

  return (
    <div className="space-y-4">
      <Card title="Contracts">
        <div className="mb-3 grid gap-2 md:grid-cols-6">
          <div className="md:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Company, track, status..." />
          </div>
          <div>
            <FieldLabel>Track</FieldLabel>
            <select value={track} onChange={(e) => setTrack(e.target.value as InterconnectionTrack | "all")}>
              {tracks.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All" : value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Our entity</FieldLabel>
            <select value={ourEntity} onChange={(e) => setOurEntity(e.target.value as OurEntity | "all")}>
              {entities.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All" : value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <select value={status} onChange={(e) => setStatus(e.target.value as ContractStatus | "all")}>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All" : value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Company</FieldLabel>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">All</option>
              {state.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Created from</FieldLabel>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Created to</FieldLabel>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Track</th>
              <th>Our entity</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((contract) => {
              const companyName = companyById.get(contract.companyId) ?? contract.companyId;
              const downloadable = contract.files.find((file) => file.contentDataUrl || file.storageRef);
              return (
                <tr key={contract.id}>
                  <td>
                    <p className="font-semibold">{companyName}</p>
                    <p className="text-[11px] text-slate-500">{contract.id}</p>
                  </td>
                  <td>{contract.track}</td>
                  <td>
                    <Badge>{contract.ourEntity}</Badge>
                  </td>
                  <td>{contract.contractType}</td>
                  <td>
                    <Badge className={statusBadgeClass(contract.status)}>{contract.status}</Badge>
                  </td>
                  <td>{new Date(contract.updatedAt).toLocaleString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setOpenContractId(contract.id)}>
                        Open
                      </Button>
                      {downloadable?.contentDataUrl && (
                        <a
                          href={downloadable.contentDataUrl}
                          download={downloadable.filename}
                          className="text-[11px] font-semibold text-brand-700"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {selectedContract && (
        <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => setOpenContractId(null)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Contract detail</h3>
              <Button size="sm" variant="secondary" onClick={() => setOpenContractId(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-800">{companyById.get(selectedContract.companyId) ?? selectedContract.companyId}</p>
                <p className="mt-1">Track: {selectedContract.track}</p>
                <p>Our entity: {selectedContract.ourEntity}</p>
                <p>Type: {selectedContract.contractType}</p>
                <p>Status: {selectedContract.status}</p>
                <p>Requested by: {selectedContract.requestedByUserId}</p>
                <p>Created: {new Date(selectedContract.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(selectedContract.updatedAt).toLocaleString()}</p>
                {selectedContract.signedAt && <p>Signed at: {new Date(selectedContract.signedAt).toLocaleString()}</p>}
                <div className="mt-2">
                  <Link to={`/companies/${selectedContract.companyId}`} className="text-[11px] font-semibold text-brand-700">
                    Open company
                  </Link>
                </div>
              </div>

              <section className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Files</p>
                <input type="file" multiple onChange={(event) => handleUpload(selectedContract, event)} />
                <div className="mt-2 space-y-1">
                  {selectedContract.files.length === 0 ? (
                    <p className="text-xs text-slate-500">No files uploaded.</p>
                  ) : (
                    selectedContract.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1 text-xs">
                        <div>
                          <p className="font-semibold text-slate-700">{file.filename}</p>
                          <p className="text-[11px] text-slate-500">
                            {file.kind} · {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        {file.contentDataUrl && (
                          <a href={file.contentDataUrl} download={file.filename} className="text-[11px] font-semibold text-brand-700">
                            Download
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow actions</p>
                {selectedContract.status === "Draft" && (
                  <div className="space-y-2">
                    <div>
                      <FieldLabel>Internal signer</FieldLabel>
                      <select value={internalSignerId} onChange={(e) => setInternalSignerId(e.target.value)}>
                        {state.users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button onClick={() => state.requestContractInternalSignature(selectedContract.id, internalSignerId)}>
                      Request internal signature
                    </Button>
                  </div>
                )}

                {selectedContract.status === "InternalSignatureRequested" && (
                  <Button onClick={() => state.markContractInternallySigned(selectedContract.id)}>Mark as internally signed</Button>
                )}

                {selectedContract.status === "CounterpartySignatureRequested" && (
                  <div className="space-y-2">
                    <div>
                      <FieldLabel>Counterparty signer</FieldLabel>
                      <input
                        value={counterpartySignerName}
                        onChange={(e) => setCounterpartySignerName(e.target.value)}
                        placeholder="Counterparty signer name"
                      />
                    </div>
                    <Button onClick={() => state.markContractCounterpartySigned(selectedContract.id, counterpartySignerName)}>
                      Mark as counterparty signed
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => state.setContractStatus(selectedContract.id, "Rejected")}>
                    Mark Rejected
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => state.setContractStatus(selectedContract.id, "Expired")}>
                    Mark Expired
                  </Button>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
