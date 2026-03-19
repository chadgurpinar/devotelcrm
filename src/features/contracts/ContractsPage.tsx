import { ChangeEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, AlertTriangle, ChevronRight, Search } from "lucide-react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { Contract, ContractFile, ContractStatus, ContractType, InterconnectionTrack, OurEntity } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

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

  const totalContracts = state.contracts.length;
  const activeContracts = state.contracts.filter((c) => c.status === "FullySigned" || c.status === "InternalSignatureRequested" || c.status === "CounterpartySignatureRequested").length;
  const expiringSoon = state.contracts.filter((c) => {
    if (c.status !== "FullySigned") return false;
    const age = Date.now() - new Date(c.updatedAt).getTime();
    return age > 180 * 86400000;
  }).length;

  return (
    <div className="space-y-5">
      <UiPageHeader title="Contracts" subtitle={`${totalContracts} contracts across ${companyRows.length} companies`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiKpiCard label="Total Contracts" value={totalContracts} icon={<FileText className="h-5 w-5" />} />
        <UiKpiCard label="Active" value={activeContracts} className="border-emerald-200 bg-emerald-50/40" />
        <UiKpiCard label="Expiring Soon" value={expiringSoon} className={expiringSoon > 0 ? "border-rose-200 bg-rose-50/40" : ""} icon={expiringSoon > 0 ? <AlertTriangle className="h-5 w-5 text-rose-400" /> : undefined} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-[11px] font-medium text-gray-500">Search</label>
              <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Company, track, status..." className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400" />
              </div>
            </div>
            <div className="w-28"><label className="mb-1 block text-[11px] font-medium text-gray-500">Track</label><select className={inputCls} value={track} onChange={(e) => setTrack(e.target.value as InterconnectionTrack | "all")}>{tracks.map((v) => <option key={v} value={v}>{v === "all" ? "All" : v}</option>)}</select></div>
            <div className="w-28"><label className="mb-1 block text-[11px] font-medium text-gray-500">Entity</label><select className={inputCls} value={ourEntity} onChange={(e) => setOurEntity(e.target.value as OurEntity | "all")}>{entities.map((v) => <option key={v} value={v}>{v === "all" ? "All" : v}</option>)}</select></div>
            <div className="w-40"><label className="mb-1 block text-[11px] font-medium text-gray-500">Status</label><select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ContractStatus | "all")}>{statuses.map((v) => <option key={v} value={v}>{v === "all" ? "All" : v}</option>)}</select></div>
            <div className="w-32"><label className="mb-1 block text-[11px] font-medium text-gray-500">From</label><input className={inputCls} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
            <div className="w-32"><label className="mb-1 block text-[11px] font-medium text-gray-500">To</label><input className={inputCls} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Company</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tracks</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Contracts</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Total</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Last Update</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {companyRows.map((row) => {
                const company = companyById.get(row.companyId);
                const trackSet = Array.from(new Set(row.contracts.map((c) => c.track)));
                const initials = row.companyName.slice(0, 2).toUpperCase();
                return (
                  <tr key={row.companyId} className="group cursor-pointer border-b border-gray-50 transition-colors hover:bg-indigo-50/40" onClick={() => openCompanyModal(row.companyId)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{initials}</div>
                        <span className="text-sm font-semibold text-gray-900">{row.companyName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><Badge>{company?.ourEntity ?? "-"}</Badge></td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {trackSet.map((t) => <span key={`${row.companyId}-${t}`} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{t}</span>)}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.contracts.slice(0, 4).map((contract) => (
                        <Badge key={contract.id} className={statusBadgeClass(contract.status)}>
                          {contract.track} {contractTypeLabel(contract)}
                        </Badge>
                      ))}
                      {row.contracts.length > 4 && <Badge>+{row.contracts.length - 4} more</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">{row.contracts.length}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{new Date(row.latestUpdatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-5 py-3"><ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {companyRows.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-2.5">
            <p className="text-xs text-gray-400">{companyRows.length} compan{companyRows.length !== 1 ? "ies" : "y"}</p>
          </div>
        )}
      </div>

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
