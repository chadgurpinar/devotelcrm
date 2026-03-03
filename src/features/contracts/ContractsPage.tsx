import { ChangeEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { Contract, ContractFile, ContractStatus, ContractType, InterconnectionTrack, OurEntity } from "../../store/types";

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
const contractTypes: ContractType[] = ["NDA", "ServiceAgreement", "Addendum", "Other"];

function statusBadgeClass(status: ContractStatus): string {
  if (status === "FullySigned") return "bg-emerald-50 text-emerald-700";
  if (status === "InternalSignatureRequested" || status === "CounterpartySignatureRequested") return "bg-amber-50 text-amber-700";
  if (status === "Expired" || status === "Rejected") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function contractTypeLabel(contract: Pick<Contract, "contractType" | "customTypeName">): string {
  if (contract.contractType === "Other" && contract.customTypeName?.trim()) {
    return contract.customTypeName.trim();
  }
  return contract.contractType;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function normalizeKind(value: string): ContractFile["kind"] {
  if (value === "Signed" || value === "Other") return value;
  return "Draft";
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
  const [openCompanyId, setOpenCompanyId] = useState<string | null>(null);
  const [newContractType, setNewContractType] = useState<ContractType>("NDA");
  const [newContractCustomTypeName, setNewContractCustomTypeName] = useState("");
  const [newContractNote, setNewContractNote] = useState("");
  const [newContractFile, setNewContractFile] = useState<File | null>(null);
  const [fileActionModal, setFileActionModal] = useState<
    | {
        mode: "replace" | "delete";
        contractId: string;
        fileId: string;
      }
    | null
  >(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  const companyById = useMemo(() => {
    const map = new Map<string, (typeof state.companies)[number]>();
    state.companies.forEach((company) => map.set(company.id, company));
    return map;
  }, [state.companies]);

  const filteredContracts = useMemo(() => {
    return state.contracts
      .filter((contract) => (track === "all" ? true : contract.track === track))
      .filter((contract) => (ourEntity === "all" ? true : contract.ourEntity === ourEntity))
      .filter((contract) => (status === "all" ? true : contract.status === status))
      .filter((contract) => (companyId ? contract.companyId === companyId : true))
      .filter((contract) => {
        const companyName = companyById.get(contract.companyId)?.name ?? contract.companyId;
        const haystack = `${companyName} ${contractTypeLabel(contract)} ${contract.status} ${contract.track}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .filter((contract) => (fromDate ? contract.createdAt.slice(0, 10) >= fromDate : true))
      .filter((contract) => (toDate ? contract.createdAt.slice(0, 10) <= toDate : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [companyById, companyId, fromDate, ourEntity, search, state.contracts, status, toDate, track]);

  const companyRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        companyId: string;
        companyName: string;
        contracts: Contract[];
        latestUpdatedAt: string;
      }
    >();
    filteredContracts.forEach((contract) => {
      const existing = grouped.get(contract.companyId);
      const companyName = companyById.get(contract.companyId)?.name ?? contract.companyId;
      if (!existing) {
        grouped.set(contract.companyId, {
          companyId: contract.companyId,
          companyName,
          contracts: [contract],
          latestUpdatedAt: contract.updatedAt,
        });
        return;
      }
      existing.contracts.push(contract);
      if (contract.updatedAt > existing.latestUpdatedAt) {
        existing.latestUpdatedAt = contract.updatedAt;
      }
    });
    return Array.from(grouped.values()).sort((a, b) => b.latestUpdatedAt.localeCompare(a.latestUpdatedAt));
  }, [companyById, filteredContracts]);

  const selectedCompany = useMemo(
    () => (openCompanyId ? state.companies.find((company) => company.id === openCompanyId) : undefined),
    [openCompanyId, state.companies],
  );
  const selectedCompanyContracts = useMemo(
    () =>
      openCompanyId
        ? state.contracts.filter((contract) => contract.companyId === openCompanyId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        : [],
    [openCompanyId, state.contracts],
  );
  const selectedCompanyProcesses = useMemo(
    () =>
      openCompanyId
        ? state.interconnectionProcesses
            .filter((process) => process.companyId === openCompanyId)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        : [],
    [openCompanyId, state.interconnectionProcesses],
  );
  const defaultProcessForCreate = selectedCompanyProcesses[0];
  const selectedCompanyFileRows = useMemo(
    () =>
      selectedCompanyContracts.flatMap((contract) =>
        contract.files.map((file) => ({
          contractId: contract.id,
          contractTrack: contract.track,
          contractTypeLabel: contractTypeLabel(contract),
          contractStatus: contract.status,
          file,
        })),
      ),
    [selectedCompanyContracts],
  );
  const fileActionTarget = useMemo(() => {
    if (!fileActionModal) return null;
    const contract = state.contracts.find((row) => row.id === fileActionModal.contractId);
    if (!contract) return null;
    const file = contract.files.find((row) => row.id === fileActionModal.fileId);
    if (!file) return null;
    return { contract, file };
  }, [fileActionModal, state.contracts]);

  async function createFilePayload(contractId: string, file: File, status: ContractStatus): Promise<Omit<ContractFile, "id">> {
    const contentDataUrl = await readFileAsDataUrl(file);
    const rawKind = status === "FullySigned" ? "Signed" : "Draft";
    return {
      kind: normalizeKind(rawKind),
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedByUserId: state.activeUserId,
      storageRef: `upload://${contractId}/${file.name}`,
      contentDataUrl,
    };
  }

  function openCompanyModal(targetCompanyId: string) {
    setOpenCompanyId(targetCompanyId);
    setNewContractType("NDA");
    setNewContractCustomTypeName("");
    setNewContractNote("");
    setNewContractFile(null);
    setFileActionModal(null);
    setReplacementFile(null);
  }

  function closeCompanyModal() {
    setOpenCompanyId(null);
    setFileActionModal(null);
    setReplacementFile(null);
  }

  function openFileModal(mode: "replace" | "delete", contractId: string, fileId: string) {
    setFileActionModal({ mode, contractId, fileId });
    setReplacementFile(null);
  }

  function closeFileModal() {
    setFileActionModal(null);
    setReplacementFile(null);
  }

  function confirmDeleteFile() {
    if (!fileActionTarget) return;
    state.updateContract({
      ...fileActionTarget.contract,
      files: fileActionTarget.contract.files.filter((file) => file.id !== fileActionTarget.file.id),
    });
    closeFileModal();
  }

  async function confirmReplaceFile() {
    if (!fileActionTarget || !replacementFile) return;
    try {
      const payload = await createFilePayload(fileActionTarget.contract.id, replacementFile, fileActionTarget.contract.status);
      state.updateContract({
        ...fileActionTarget.contract,
        files: fileActionTarget.contract.files.map((file) =>
          file.id === fileActionTarget.file.id
            ? {
                ...file,
                ...payload,
              }
            : file,
        ),
      });
      closeFileModal();
    } catch {
      state.setContractStatus(fileActionTarget.contract.id, "Rejected");
    }
  }

  async function createNewContractForCompany() {
    if (!selectedCompany || !defaultProcessForCreate || !newContractFile) return;
    const customTypeName = newContractType === "Other" ? newContractCustomTypeName.trim() : "";
    if (newContractType === "Other" && !customTypeName) return;
    const contractId = state.createContract({
      companyId: selectedCompany.id,
      interconnectionProcessId: defaultProcessForCreate.id,
      track: defaultProcessForCreate.track,
      ourEntity: selectedCompany.ourEntity,
      contractType: newContractType,
      customTypeName: customTypeName || undefined,
      note: newContractNote.trim() || undefined,
      status: "Draft",
      files: [],
      requestedByUserId: state.activeUserId,
      internalSignerUserId: undefined,
      counterpartySignerName: undefined,
    });
    try {
      const payload = await createFilePayload(contractId, newContractFile, "Draft");
      state.addContractFile(contractId, payload);
      setNewContractCustomTypeName("");
      setNewContractNote("");
      setNewContractFile(null);
    } catch {
      state.setContractStatus(contractId, "Rejected");
    }
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
              <th>Our entity</th>
              <th>Tracks</th>
              <th>Contracts</th>
              <th>Total</th>
              <th>Last update</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {companyRows.map((row) => {
              const company = companyById.get(row.companyId);
              const trackSet = Array.from(new Set(row.contracts.map((contract) => contract.track)));
              return (
                <tr key={row.companyId} className="cursor-pointer hover:bg-slate-50" onClick={() => openCompanyModal(row.companyId)}>
                  <td>
                    <p className="font-semibold">{row.companyName}</p>
                    <p className="text-[11px] text-slate-500">{row.companyId}</p>
                  </td>
                  <td>
                    <Badge>{company?.ourEntity ?? "-"}</Badge>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {trackSet.map((entry) => (
                        <Badge key={`${row.companyId}-${entry}`}>{entry}</Badge>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {row.contracts.slice(0, 4).map((contract) => (
                        <Badge key={contract.id} className={statusBadgeClass(contract.status)}>
                          {contract.track} {contractTypeLabel(contract)}
                        </Badge>
                      ))}
                      {row.contracts.length > 4 && <Badge>+{row.contracts.length - 4} more</Badge>}
                    </div>
                  </td>
                  <td>{row.contracts.length}</td>
                  <td>{new Date(row.latestUpdatedAt).toLocaleString()}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        openCompanyModal(row.companyId);
                      }}
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {selectedCompany && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4" onClick={closeCompanyModal}>
          <div
            className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Contracts · {selectedCompany.name}</h3>
                <p className="text-xs text-slate-500">
                  Company appears once in table; all related contracts are managed here.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={closeCompanyModal}>
                Close
              </Button>
            </div>

            <div className="space-y-3">
              <section className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entity</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
                  <Badge className="bg-slate-100 text-slate-700">{selectedCompany.ourEntity}</Badge>
                  <span className="font-semibold text-slate-800">{selectedCompany.name}</span>
                  <span className="text-slate-500">·</span>
                  <span>{selectedCompanyContracts.length} contracts</span>
                  <Link to={`/companies/${selectedCompany.id}`} className="ml-auto text-[11px] font-semibold text-brand-700">
                    Open company
                  </Link>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contract files</p>
                  <Badge className="bg-slate-100 text-slate-700">{selectedCompanyFileRows.length}</Badge>
                </div>
                {selectedCompanyFileRows.length === 0 ? (
                  <p className="text-xs text-slate-500">No files uploaded yet for this company.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {selectedCompanyFileRows.map((entry) => (
                      <div key={entry.file.id} className="rounded-md border border-slate-200 p-2">
                        <a
                          href={entry.file.contentDataUrl || undefined}
                          download={entry.file.filename}
                          className="flex flex-col items-center gap-1 text-center"
                          title={`${entry.contractTrack} · ${entry.contractTypeLabel}`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                              <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                              <path d="M14 3v5h5" />
                            </svg>
                          </div>
                          <p className="w-full truncate text-[11px] font-medium text-slate-700">{entry.file.filename}</p>
                        </a>
                        <div className="mt-2 flex items-center justify-center gap-1">
                          <Button size="sm" variant="secondary" onClick={() => openFileModal("replace", entry.contractId, entry.file.id)}>
                            Replace
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openFileModal("delete", entry.contractId, entry.file.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Add new contract</p>
                <div className="grid gap-2 md:grid-cols-4">
                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <select
                      value={newContractType}
                      onChange={(e) => {
                        const nextType = e.target.value as ContractType;
                        setNewContractType(nextType);
                        if (nextType !== "Other") setNewContractCustomTypeName("");
                      }}
                    >
                      {contractTypes.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  {newContractType === "Other" && (
                    <div>
                      <FieldLabel>Custom type</FieldLabel>
                      <input
                        value={newContractCustomTypeName}
                        onChange={(e) => setNewContractCustomTypeName(e.target.value)}
                        placeholder="Custom contract name"
                      />
                    </div>
                  )}
                  <div>
                    <FieldLabel>File</FieldLabel>
                    <input
                      type="file"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setNewContractFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Note</FieldLabel>
                    <input value={newContractNote} onChange={(e) => setNewContractNote(e.target.value)} placeholder="Optional note" />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={createNewContractForCompany}
                      disabled={!defaultProcessForCreate || !newContractFile || (newContractType === "Other" && !newContractCustomTypeName.trim())}
                    >
                      Upload
                    </Button>
                  </div>
                </div>
                {!defaultProcessForCreate && (
                  <p className="mt-2 text-xs text-amber-700">No interconnection process found for this company. Start process first.</p>
                )}
                {defaultProcessForCreate && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Auto-linked process: {defaultProcessForCreate.track} · {defaultProcessForCreate.stage}
                  </p>
                )}
              </section>
            </div>
            {fileActionModal && fileActionTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={closeFileModal}>
                <div
                  className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {fileActionModal.mode === "delete" ? "Delete file" : "Replace file"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{fileActionTarget.file.filename}</p>
                  {fileActionModal.mode === "replace" && (
                    <div className="mt-3">
                      <FieldLabel>New file</FieldLabel>
                      <input
                        type="file"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setReplacementFile(event.target.files?.[0] ?? null)}
                      />
                    </div>
                  )}
                  {fileActionModal.mode === "delete" && (
                    <p className="mt-3 text-xs text-rose-700">This file will be removed from this contract.</p>
                  )}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={closeFileModal}>
                      Cancel
                    </Button>
                    {fileActionModal.mode === "delete" ? (
                      <Button size="sm" onClick={confirmDeleteFile}>
                        Delete
                      </Button>
                    ) : (
                      <Button size="sm" onClick={confirmReplaceFile} disabled={!replacementFile}>
                        Replace
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
