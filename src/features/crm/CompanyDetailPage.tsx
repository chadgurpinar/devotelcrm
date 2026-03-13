import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getContactName, getEventName, getUserName } from "../../store/selectors";
import { formatDay, formatTime } from "../../utils/datetime";
import {
  Company,
  CompanyType,
  ContactRoleTag,
  ContractType,
  InterconnectionProcess,
  InterconnectionStage,
  InterconnectionType,
  OurEntity,
  Workscope,
} from "../../store/types";
import { getInterconnectionByTrack, getInterconnectionSummary } from "../../store/interconnection";
import { getInterconnectionStartReadiness } from "../leads/readiness";

const leadTabs = ["Overview", "Contacts", "Meetings", "Notes", "Evaluation", "History"] as const;
const nonLeadTabs = ["Overview", "Contacts", "Meetings", "Notes", "Interconnection", "Contracts", "History"] as const;
type Tab = (typeof leadTabs)[number] | (typeof nonLeadTabs)[number];

const stages: InterconnectionStage[] = ["NDA", "Contract", "Technical", "AM_Assigned", "Completed", "Failed"];
const types: CompanyType[] = ["MNO", "Exclusive", "Aggregator", "MVNO", "Large Aggregator", "Wholesale Carrier", "Enterprise"];
const interconnections: InterconnectionType[] = ["One-way", "Two-way"];
const scopes: Workscope[] = ["SMS", "Voice", "Data", "Software", "RCS"];
const contactRoleTags: ContactRoleTag[] = ["Commercial", "Technical", "Finance"];
const billingTermOptions = ["Prepaid", "Net 7", "Net 15", "Net 30", "Net 45", "Custom"];
const currencyOptions = ["USD", "EUR", "GBP", "TRY", "AED", "Other"];
const ourEntities: OurEntity[] = ["USA", "UK", "TR"];

function createEmptyContactForm() {
  return {
    name: "",
    title: "",
    phone: "",
    mobile: "",
    skypeId: "",
    email: "",
    roleTags: [] as ContactRoleTag[],
  };
}

function hasSignedContract(
  contracts: Array<{ interconnectionProcessId: string; contractType: ContractType; status: string }>,
  processId: string,
  contractType: ContractType,
): boolean {
  return contracts.some(
    (contract) =>
      contract.interconnectionProcessId === processId &&
      contract.contractType === contractType &&
      contract.status === "FullySigned",
  );
}

function isStageBlocked(
  stage: InterconnectionStage,
  process: InterconnectionProcess,
  company: Company,
  contracts: Array<{ interconnectionProcessId: string; contractType: ContractType; status: string }>,
): string[] {
  const missing: string[] = [];
  if (stage === "Contract" || stage === "Technical" || stage === "AM_Assigned" || stage === "Completed") {
    if (!hasSignedContract(contracts, process.id, "NDA")) {
      missing.push("NDA fully signed");
    }
  }
  if (stage === "Technical" || stage === "AM_Assigned" || stage === "Completed") {
    if (!hasSignedContract(contracts, process.id, "ServiceAgreement")) {
      missing.push("Service Agreement fully signed");
    }
  }
  if (stage === "Completed") {
    if (!company.internalAmUserId && !company.ownerUserId) missing.push("Internal AM assigned");
    if (!company.counterpartyAmName?.trim()) missing.push("Counterparty AM name");
  }
  return missing;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function CompanyDetailPage() {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const state = useAppStore();
  const [tab, setTab] = useState<Tab>("Overview");
  const [noteText, setNoteText] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [watchersOpen, setWatchersOpen] = useState(false);
  const watchersPopoverRef = useRef<HTMLDivElement | null>(null);
  const [contactForm, setContactForm] = useState(createEmptyContactForm());
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingContactForm, setEditingContactForm] = useState(createEmptyContactForm());

  const company = state.companies.find((row) => row.id === companyId);
  const notes = useMemo(
    () => state.notes.filter((row) => row.companyId === companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [companyId, state.notes],
  );
  const contacts = useMemo(() => state.contacts.filter((row) => row.companyId === companyId), [companyId, state.contacts]);
  const interconnectionRows = useMemo(
    () => state.interconnectionProcesses.filter((row) => row.companyId === companyId),
    [companyId, state.interconnectionProcesses],
  );
  const companyMeetings = useMemo(
    () => state.meetings.filter((meeting) => meeting.companyId === companyId).sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [companyId, state.meetings],
  );
  const contracts = useMemo(
    () => state.contracts.filter((row) => row.companyId === companyId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [companyId, state.contracts],
  );

  if (!company || !companyId) {
    return (
      <Card title="Company not found">
        <Link to="/leads" className="text-xs font-semibold text-brand-700">
          Back
        </Link>
      </Card>
    );
  }
  const resolvedCompanyId = companyId;

  const isLeadMode = company.companyStatus === "LEAD";
  const tabs = isLeadMode ? leadTabs : nonLeadTabs;
  const activeTab: Tab = (tabs as readonly string[]).includes(tab) ? tab : "Overview";
  const watcherUserIds = Array.from(new Set([...(company.watcherUserIds ?? []), company.ownerUserId]));
  const extraWatcherUserIds = watcherUserIds.filter((id) => id !== company.ownerUserId);
  const extraWatcherNames = extraWatcherUserIds.map((id) => getUserName(state, id));
  const watchersSummaryLabel =
    extraWatcherNames.length === 0
      ? "No extra watcher"
      : extraWatcherNames.length <= 2
        ? extraWatcherNames.join(", ")
        : `${extraWatcherNames.slice(0, 2).join(", ")} +${extraWatcherNames.length - 2}`;
  const smsInterconnection = getInterconnectionByTrack(interconnectionRows, "SMS");
  const voiceInterconnection = getInterconnectionByTrack(interconnectionRows, "Voice");
  const interconnectionSummary = getInterconnectionSummary(interconnectionRows);
  const ourCompanyInfo = state.ourCompanyInfo.find((row) => row.ourEntity === company.ourEntity);
  const smsStartReadiness = getInterconnectionStartReadiness(company, contacts, "SMS");
  const voiceStartReadiness = getInterconnectionStartReadiness(company, contacts, "Voice");
  const smsSignedContract = contracts.some((contract) => contract.track === "SMS" && contract.status === "FullySigned");
  const voiceSignedContract = contracts.some((contract) => contract.track === "Voice" && contract.status === "FullySigned");
  const smsStartDisabled = !smsInterconnection && !smsStartReadiness.ready;
  const voiceStartDisabled = !voiceInterconnection && !voiceStartReadiness.ready;
  const bothStartMissing = Array.from(
    new Set([
      ...(!smsInterconnection ? smsStartReadiness.missing : []),
      ...(!voiceInterconnection ? voiceStartReadiness.missing : []),
    ]),
  );
  const bothStartDisabled = bothStartMissing.length > 0;
  const ourEntityLocked = interconnectionRows.length > 0;

  useEffect(() => {
    if (!watchersOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!watchersPopoverRef.current?.contains(target)) {
        setWatchersOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setWatchersOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [watchersOpen]);

  const historyItems = useMemo(() => {
    const timeline: Array<{ id: string; at: string; title: string; detail: string }> = [];
    notes.forEach((note) => {
      timeline.push({
        id: `note-${note.id}`,
        at: note.createdAt,
        title: "Note",
        detail: note.text,
      });
    });
    interconnectionRows.forEach((row) => {
      (row.stageHistory ?? []).forEach((entry, idx) => {
        timeline.push({
          id: `process-${row.id}-${idx}`,
          at: entry.at,
          title: `${row.track} process`,
          detail: `Stage changed to ${entry.stage}`,
        });
      });
    });
    if (company.movedToInterconnectionAt) {
      timeline.push({
        id: `moved-${company.id}`,
        at: company.movedToInterconnectionAt,
        title: "Moved to Interconnection",
        detail: "Company transitioned from LEAD to INTERCONNECTION.",
      });
    }
    if (company.becameClientAt) {
      timeline.push({
        id: `client-${company.id}`,
        at: company.becameClientAt,
        title: "Became Client",
        detail: "At least one interconnection track reached Completed.",
      });
    }
    return timeline.sort((a, b) => b.at.localeCompare(a.at));
  }, [company.becameClientAt, company.id, company.movedToInterconnectionAt, interconnectionRows, notes]);

  function updateEvaluation(patch: Partial<NonNullable<Company["evaluation"]>>) {
    if (!company) return;
    state.updateCompany({
      ...company,
      evaluation: {
        technicalFit: company.evaluation?.technicalFit ?? "Unknown",
        commercialFit: company.evaluation?.commercialFit ?? "Unknown",
        riskLevel: company.evaluation?.riskLevel ?? "Unknown",
        ...company.evaluation,
        ...patch,
        evaluationUpdatedAt: new Date().toISOString(),
      },
    });
  }

  function startTrack(track: "SMS" | "Voice") {
    state.startInterconnectionProcess(resolvedCompanyId, track);
    navigate("/interconnection");
  }

  function createDraftContract(process: InterconnectionProcess, contractType: ContractType) {
    state.createContract({
      companyId: resolvedCompanyId,
      interconnectionProcessId: process.id,
      track: process.track,
      ourEntity: company?.ourEntity ?? "UK",
      contractType,
      status: "Draft",
      files: [],
      requestedByUserId: state.activeUserId,
      internalSignerUserId: undefined,
      counterpartySignerName: undefined,
    });
  }

  async function uploadFiles(contractId: string, event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const contentDataUrl = await readFileAsDataUrl(file);
      state.addContractFile(contractId, {
        kind: "Draft",
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedByUserId: state.activeUserId,
        storageRef: `upload://${contractId}/${file.name}`,
        contentDataUrl,
      });
    }
    event.target.value = "";
  }

  function resetContactForm() {
    setContactForm(createEmptyContactForm());
  }

  function closeContactEditModal() {
    setEditingContactId(null);
    setEditingContactForm(createEmptyContactForm());
  }

  return (
    <div className="space-y-4">
      <Card title={company.name}>
        <div className="flex flex-wrap gap-2">
          <Badge>{company.companyStatus}</Badge>
          <Badge>Disposition: {company.leadDisposition}</Badge>
          <Badge>Our entity: {company.ourEntity}</Badge>
          <Badge>{company.type}</Badge>
          <Badge>{company.interconnectionType}</Badge>
          <Badge>{company.workscope.join(", ")}</Badge>
          <Badge>Interconnection: {interconnectionSummary}</Badge>
          <Badge className={smsSignedContract ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}>
            SMS Contract: {smsSignedContract ? "Signed" : "Pending"}
          </Badge>
          <Badge className={voiceSignedContract ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}>
            Voice Contract: {voiceSignedContract ? "Signed" : "Pending"}
          </Badge>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button key={item} onClick={() => setTab(item)} variant={item === activeTab ? "primary" : "secondary"}>
            {item}
          </Button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <Card title="Company profile">
          <div className="space-y-3">
            <section className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Identity</p>
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <input value={company.name} onChange={(e) => state.updateCompany({ ...company, name: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Company status</FieldLabel>
                  <input value={company.companyStatus} disabled />
                </div>
                <div>
                  <FieldLabel>Lead disposition</FieldLabel>
                  {isLeadMode ? (
                    <select
                      value={company.leadDisposition}
                      onChange={(e) =>
                        state.updateCompany({
                          ...company,
                          leadDisposition: e.target.value as "Open" | "Rejected" | "OnHold",
                        })
                      }
                    >
                      <option value="Open">Open</option>
                      <option value="OnHold">OnHold</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  ) : (
                    <input value={company.leadDisposition} disabled />
                  )}
                </div>
                <div>
                  <FieldLabel>Our entity</FieldLabel>
                  {ourEntityLocked ? (
                    <input value={company.ourEntity} disabled />
                  ) : (
                    <select
                      value={company.ourEntity}
                      onChange={(e) => state.updateCompany({ ...company, ourEntity: e.target.value as OurEntity })}
                    >
                      {ourEntities.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <select value={company.type} onChange={(e) => state.updateCompany({ ...company, type: e.target.value as CompanyType })}>
                    {types.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Region</FieldLabel>
                  <input value={company.region ?? ""} onChange={(e) => state.updateCompany({ ...company, region: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Source</FieldLabel>
                  <input value={company.createdFromEventId ? getEventName(state, company.createdFromEventId) : "Manual"} disabled />
                </div>
                <div>
                  <FieldLabel>Website</FieldLabel>
                  <input
                    value={company.website ?? ""}
                    onChange={(e) => state.updateCompany({ ...company, website: e.target.value || undefined })}
                    placeholder="https://"
                  />
                </div>
                <div>
                  <FieldLabel>Main phone</FieldLabel>
                  <input
                    value={company.mainPhone ?? ""}
                    onChange={(e) => state.updateCompany({ ...company, mainPhone: e.target.value || undefined })}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Address</p>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="md:col-span-2">
                  <FieldLabel>Street</FieldLabel>
                  <input
                    value={company.address?.street ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        address: { ...company.address, street: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>City</FieldLabel>
                  <input
                    value={company.address?.city ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        address: { ...company.address, city: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>State</FieldLabel>
                  <input
                    value={company.address?.state ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        address: { ...company.address, state: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Zip</FieldLabel>
                  <input
                    value={company.address?.zip ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        address: { ...company.address, zip: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <input
                    value={company.address?.country ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        address: { ...company.address, country: e.target.value || undefined },
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Commercial & Billing</p>
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <FieldLabel>Interconnection type</FieldLabel>
                  <select
                    value={company.interconnectionType}
                    onChange={(e) => state.updateCompany({ ...company, interconnectionType: e.target.value as InterconnectionType })}
                  >
                    {interconnections.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Billing term</FieldLabel>
                  <select
                    value={company.billingTerm ?? ""}
                    onChange={(e) => state.updateCompany({ ...company, billingTerm: e.target.value || undefined })}
                  >
                    <option value="">Not set</option>
                    {billingTermOptions.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Currency</FieldLabel>
                  <select
                    value={company.currency ?? ""}
                    onChange={(e) => state.updateCompany({ ...company, currency: e.target.value || undefined })}
                  >
                    <option value="">Not set</option>
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Credit limit</FieldLabel>
                  <input
                    type="number"
                    value={company.creditLimit ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      const value = raw ? Number(raw) : undefined;
                      state.updateCompany({
                        ...company,
                        creditLimit: typeof value === "number" && Number.isFinite(value) ? value : undefined,
                      });
                    }}
                  />
                </div>
                <div>
                  <FieldLabel>Tax ID</FieldLabel>
                  <input
                    value={company.taxId ?? ""}
                    onChange={(e) => state.updateCompany({ ...company, taxId: e.target.value || undefined })}
                  />
                </div>
                <div className="md:col-span-3">
                  <FieldLabel>Workscope</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {scopes.map((scope) => {
                      const checked = company.workscope.includes(scope);
                      return (
                        <label
                          key={scope}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                            checked ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...company.workscope, scope]))
                                : company.workscope.filter((item) => item !== scope);
                              state.updateCompany({ ...company, workscope: next });
                            }}
                          />
                          {scope}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Official emails</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <FieldLabel>Technical email</FieldLabel>
                  <input
                    value={company.emails.technical ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        emails: { ...company.emails, technical: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Finance email</FieldLabel>
                  <input
                    value={company.emails.finance ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        emails: { ...company.emails, finance: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Invoice email</FieldLabel>
                  <input
                    value={company.emails.invoice ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        emails: { ...company.emails, invoice: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Rate email</FieldLabel>
                  <input
                    value={company.emails.rates ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        emails: { ...company.emails, rates: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>CC Email</FieldLabel>
                  <input
                    value={company.emails.cc ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        emails: { ...company.emails, cc: e.target.value || undefined },
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank Details</p>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Finance use only</span>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <FieldLabel>Bank Name</FieldLabel>
                  <input
                    value={company.bankDetails?.bankName ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        bankDetails: { ...company.bankDetails, bankName: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>IBAN</FieldLabel>
                  <input
                    value={company.bankDetails?.iban ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        bankDetails: { ...company.bankDetails, iban: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>SWIFT / BIC</FieldLabel>
                  <input
                    value={company.bankDetails?.swift ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        bankDetails: { ...company.bankDetails, swift: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Account Holder</FieldLabel>
                  <input
                    value={company.bankDetails?.accountHolder ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        bankDetails: { ...company.bankDetails, accountHolder: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Currency</FieldLabel>
                  <input
                    value={company.bankDetails?.currency ?? ""}
                    onChange={(e) =>
                      state.updateCompany({
                        ...company,
                        bankDetails: { ...company.bankDetails, currency: e.target.value || undefined },
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ownership</p>
              <div className="grid gap-2 md:grid-cols-4">
                <div>
                  <FieldLabel>Owner (Devotel account manager)</FieldLabel>
                  <select
                    value={company.ownerUserId}
                    onChange={(e) => {
                      const ownerUserId = e.target.value;
                      state.updateCompany({
                        ...company,
                        ownerUserId,
                        watcherUserIds: Array.from(new Set([...(company.watcherUserIds ?? []), ownerUserId])),
                      });
                    }}
                  >
                    {state.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Internal AM</FieldLabel>
                  <select
                    value={company.internalAmUserId ?? ""}
                    onChange={(e) => state.updateCompany({ ...company, internalAmUserId: e.target.value || undefined })}
                  >
                    <option value="">Not assigned</option>
                    {state.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Counterparty AM</FieldLabel>
                  <input
                    value={company.counterpartyAmName ?? ""}
                    onChange={(e) => state.updateCompany({ ...company, counterpartyAmName: e.target.value || undefined })}
                    placeholder="Counterparty AM name"
                  />
                </div>
                <div className="md:col-span-4">
                  <FieldLabel>Watchers</FieldLabel>
                  <div ref={watchersPopoverRef} className="relative max-w-[460px]">
                    <button
                      type="button"
                      className="flex min-h-[36px] w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition hover:border-slate-300"
                      aria-haspopup="listbox"
                      aria-expanded={watchersOpen}
                      onClick={() => setWatchersOpen((open) => !open)}
                    >
                      <div className="min-w-0 text-left">
                        <p className="truncate font-medium text-slate-800">{watchersSummaryLabel}</p>
                        <p className="text-[10px] text-slate-500">Owner included: {getUserName(state, company.ownerUserId)}</p>
                      </div>
                      <span className="ml-2 shrink-0 text-[10px] font-semibold text-slate-500">
                        {extraWatcherUserIds.length} selected {watchersOpen ? "▴" : "▾"}
                      </span>
                    </button>

                    {watchersOpen && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
                        <div className="mb-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Selected watchers</p>
                          <div className="mt-1 flex min-h-[24px] flex-wrap gap-1">
                            {extraWatcherUserIds.length === 0 ? (
                              <span className="text-[11px] text-slate-400">No extra watcher selected</span>
                            ) : (
                              extraWatcherUserIds.map((userId) => (
                                <span
                                  key={userId}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                >
                                  {getUserName(state, userId)}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Team</p>
                          <div className="max-h-44 space-y-1 overflow-auto pr-1">
                            {state.users.map((user) => {
                              const checked = watcherUserIds.includes(user.id);
                              const disabled = user.id === company.ownerUserId;
                              return (
                                <label
                                  key={user.id}
                                  className={`flex items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-xs text-slate-700 hover:border-slate-200 hover:bg-slate-50 ${
                                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                                  }`}
                                >
                                  <span>{disabled ? `${user.name} (Owner)` : user.name}</span>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? Array.from(new Set([...(company.watcherUserIds ?? []), user.id]))
                                        : (company.watcherUserIds ?? []).filter((id) => id !== user.id);
                                      state.updateCompany({ ...company, watcherUserIds: next });
                                    }}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Card>
      )}

      {activeTab === "Contacts" && (
        <>
          <Card title="Contacts">
            <form
              className="mb-3 grid gap-2 md:grid-cols-6"
              onSubmit={(e) => {
                e.preventDefault();
                state.createContact({
                  ...contactForm,
                  companyId,
                  mobile: contactForm.mobile || undefined,
                  skypeId: contactForm.skypeId || undefined,
                  email: contactForm.email || undefined,
                  roleTags: contactForm.roleTags.length ? contactForm.roleTags : undefined,
                });
                resetContactForm();
              }}
            >
              <div>
                <FieldLabel>Name</FieldLabel>
                <input value={contactForm.name} onChange={(e) => setContactForm((row) => ({ ...row, name: e.target.value }))} required />
              </div>
              <div>
                <FieldLabel>Title</FieldLabel>
                <input value={contactForm.title} onChange={(e) => setContactForm((row) => ({ ...row, title: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <input value={contactForm.phone} onChange={(e) => setContactForm((row) => ({ ...row, phone: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Mobile</FieldLabel>
                <input value={contactForm.mobile} onChange={(e) => setContactForm((row) => ({ ...row, mobile: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Skype</FieldLabel>
                <input value={contactForm.skypeId} onChange={(e) => setContactForm((row) => ({ ...row, skypeId: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <input value={contactForm.email} onChange={(e) => setContactForm((row) => ({ ...row, email: e.target.value }))} />
              </div>
              <div className="md:col-span-6">
                <FieldLabel>Role tags</FieldLabel>
                <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50/70 p-2">
                  {contactRoleTags.map((tag) => {
                    const checked = contactForm.roleTags.includes(tag);
                    return (
                      <label
                        key={tag}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                          checked ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setContactForm((row) => ({
                              ...row,
                              roleTags: e.target.checked
                                ? Array.from(new Set([...row.roleTags, tag]))
                                : row.roleTags.filter((item) => item !== tag),
                            }));
                          }}
                        />
                        {tag}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-6 flex items-center gap-2">
                <Button type="submit">Add contact</Button>
              </div>
            </form>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Phone</th>
                  <th>Mobile</th>
                  <th>Skype</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.name}</td>
                    <td>{contact.title}</td>
                    <td>{contact.phone}</td>
                    <td>{contact.mobile ?? "-"}</td>
                    <td>{contact.skypeId ?? "-"}</td>
                    <td>{contact.email ?? "-"}</td>
                    <td>{contact.roleTags?.length ? contact.roleTags.join(", ") : "-"}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingContactId(contact.id);
                          setEditingContactForm({
                            name: contact.name,
                            title: contact.title,
                            phone: contact.phone,
                            mobile: contact.mobile ?? "",
                            skypeId: contact.skypeId ?? "",
                            email: contact.email ?? "",
                            roleTags: contact.roleTags ?? [],
                          });
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {editingContactId && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={closeContactEditModal}>
              <div
                className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">Edit contact</h3>
                  <Button size="sm" variant="secondary" onClick={closeContactEditModal}>
                    Close
                  </Button>
                </div>
                <form
                  className="grid gap-2 md:grid-cols-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const existing = state.contacts.find((row) => row.id === editingContactId);
                    if (!existing) return;
                    state.updateContact({
                      ...existing,
                      ...editingContactForm,
                      companyId,
                      mobile: editingContactForm.mobile || undefined,
                      skypeId: editingContactForm.skypeId || undefined,
                      email: editingContactForm.email || undefined,
                      roleTags: editingContactForm.roleTags.length ? editingContactForm.roleTags : undefined,
                    });
                    closeContactEditModal();
                  }}
                >
                  <div>
                    <FieldLabel>Name</FieldLabel>
                    <input
                      value={editingContactForm.name}
                      onChange={(e) => setEditingContactForm((row) => ({ ...row, name: e.target.value }))}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <FieldLabel>Title</FieldLabel>
                    <input value={editingContactForm.title} onChange={(e) => setEditingContactForm((row) => ({ ...row, title: e.target.value }))} />
                  </div>
                  <div>
                    <FieldLabel>Phone</FieldLabel>
                    <input value={editingContactForm.phone} onChange={(e) => setEditingContactForm((row) => ({ ...row, phone: e.target.value }))} />
                  </div>
                  <div>
                    <FieldLabel>Mobile</FieldLabel>
                    <input value={editingContactForm.mobile} onChange={(e) => setEditingContactForm((row) => ({ ...row, mobile: e.target.value }))} />
                  </div>
                  <div>
                    <FieldLabel>Skype</FieldLabel>
                    <input value={editingContactForm.skypeId} onChange={(e) => setEditingContactForm((row) => ({ ...row, skypeId: e.target.value }))} />
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <input value={editingContactForm.email} onChange={(e) => setEditingContactForm((row) => ({ ...row, email: e.target.value }))} />
                  </div>
                  <div className="md:col-span-6">
                    <FieldLabel>Role tags</FieldLabel>
                    <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50/70 p-2">
                      {contactRoleTags.map((tag) => {
                        const checked = editingContactForm.roleTags.includes(tag);
                        return (
                          <label
                            key={tag}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                              checked ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setEditingContactForm((row) => ({
                                  ...row,
                                  roleTags: e.target.checked
                                    ? Array.from(new Set([...row.roleTags, tag]))
                                    : row.roleTags.filter((item) => item !== tag),
                                }));
                              }}
                            />
                            {tag}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="md:col-span-6 flex items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={closeContactEditModal}>
                      Cancel
                    </Button>
                    <Button size="sm" type="submit" disabled={!editingContactForm.name.trim()}>
                      Save contact
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "Meetings" && (
        <Card title="Meetings">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Time</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Place</th>
              </tr>
            </thead>
            <tbody>
              {companyMeetings.map((meeting) => (
                <tr key={meeting.id}>
                  <td>{getEventName(state, meeting.eventId)}</td>
                  <td>{formatDay(meeting.startAt)}</td>
                  <td>
                    {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}
                  </td>
                  <td>{getUserName(state, meeting.ownerUserId)}</td>
                  <td>{meeting.status ?? "Scheduled"}</td>
                  <td>{meeting.place}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === "Notes" && (
        <Card title="CRM notes">
          <form
            className="mb-3 grid gap-2 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteText.trim()) return;
              state.createNote({
                companyId: resolvedCompanyId,
                createdByUserId: state.activeUserId,
                text: noteText,
                reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined,
              });
              setNoteText("");
              setReminderAt("");
            }}
          >
            <div className="md:col-span-3">
              <FieldLabel>New note</FieldLabel>
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Reminder</FieldLabel>
              <input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
            </div>
            <div className="md:col-span-4">
              <Button type="submit">Save note</Button>
            </div>
          </form>
          <div className="space-y-2">
            {notes.map((note) => {
              const meeting = state.meetings.find((row) => row.id === note.relatedMeetingId);
              return (
                <div key={note.id} className="rounded-md border border-slate-200 p-3 text-xs">
                  <p className="font-semibold">{note.text}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {note.relatedEventId && <Badge>Event: {getEventName(state, note.relatedEventId)}</Badge>}
                    {meeting && <Badge>Meeting owner: {getUserName(state, meeting.ownerUserId)}</Badge>}
                    {note.relatedContactId && <Badge>Contact: {getContactName(state, note.relatedContactId)}</Badge>}
                  </div>
                  <p className="mt-1 text-slate-500">
                    {formatDay(note.createdAt)} {formatTime(note.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeTab === "Evaluation" && (
        <Card title="Lead evaluation and decision">
          {!isLeadMode ? (
            <p className="text-xs text-slate-500">Evaluation is available only while company status is LEAD.</p>
          ) : (
            <>
              <div className="mb-3 grid gap-2 md:grid-cols-3">
                <div>
                  <FieldLabel>Technical fit</FieldLabel>
                  <select
                    value={company.evaluation?.technicalFit ?? "Unknown"}
                    onChange={(e) => updateEvaluation({ technicalFit: e.target.value as "Unknown" | "Pass" | "Fail" })}
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Commercial fit</FieldLabel>
                  <select
                    value={company.evaluation?.commercialFit ?? "Unknown"}
                    onChange={(e) =>
                      updateEvaluation({ commercialFit: e.target.value as "Unknown" | "Low" | "Medium" | "High" | "Risk" })
                    }
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Risk">Risk</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Risk level</FieldLabel>
                  <select
                    value={company.evaluation?.riskLevel ?? "Unknown"}
                    onChange={(e) => updateEvaluation({ riskLevel: e.target.value as "Unknown" | "Low" | "Medium" | "High" })}
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <FieldLabel>Next action</FieldLabel>
                  <input
                    value={company.evaluation?.nextAction ?? ""}
                    onChange={(e) => updateEvaluation({ nextAction: e.target.value })}
                    placeholder="Call / Start interconnection / Hold / Reject ..."
                  />
                </div>
                <div className="md:col-span-3">
                  <FieldLabel>Evaluation notes</FieldLabel>
                  <textarea
                    rows={4}
                    value={company.evaluation?.evaluationNotes ?? ""}
                    onChange={(e) => updateEvaluation({ evaluationNotes: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-3 rounded-md border border-slate-200 bg-slate-50/70 p-2 text-xs text-slate-700">
                <p className="mb-1 font-semibold text-slate-800">Pre-interconnection readiness</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="font-medium">SMS: {smsStartReadiness.ready ? "Ready" : "Missing fields"}</p>
                    {!smsStartReadiness.ready && (
                      <p className="text-slate-500">Missing: {smsStartReadiness.missing.join(", ")}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Voice: {voiceStartReadiness.ready ? "Ready" : "Missing fields"}</p>
                    {!voiceStartReadiness.ready && (
                      <p className="text-slate-500">Missing: {voiceStartReadiness.missing.join(", ")}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => startTrack("SMS")}
                  disabled={smsStartDisabled}
                  title={smsStartDisabled ? `Missing: ${smsStartReadiness.missing.join(", ")}` : undefined}
                >
                  {smsInterconnection ? "Open SMS process" : "Start SMS Interconnection"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => startTrack("Voice")}
                  disabled={voiceStartDisabled}
                  title={voiceStartDisabled ? `Missing: ${voiceStartReadiness.missing.join(", ")}` : undefined}
                >
                  {voiceInterconnection ? "Open Voice process" : "Start Voice Interconnection"}
                </Button>
                <Button
                  variant="outline"
                  disabled={bothStartDisabled}
                  title={bothStartDisabled ? `Missing: ${bothStartMissing.join(", ")}` : undefined}
                  onClick={() => {
                    if (!smsInterconnection) state.startInterconnectionProcess(resolvedCompanyId, "SMS");
                    if (!voiceInterconnection) state.startInterconnectionProcess(resolvedCompanyId, "Voice");
                    navigate("/interconnection");
                  }}
                >
                  Start Both
                </Button>
                <Button variant="danger" onClick={() => state.updateCompany({ ...company, leadDisposition: "Rejected" })}>
                  Reject
                </Button>
                <Button variant="secondary" onClick={() => state.updateCompany({ ...company, leadDisposition: "OnHold" })}>
                  Put On Hold
                </Button>
                <Button variant="ghost" onClick={() => state.updateCompany({ ...company, leadDisposition: "Open" })}>
                  Re-open
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {activeTab === "Interconnection" && (
        <Card title="Interconnection tracks">
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-800">Our entity: {company.ourEntity}</p>
            {ourCompanyInfo ? (
              <p className="mt-1 text-slate-600">
                {ourCompanyInfo.legalName} · {ourCompanyInfo.address.city}, {ourCompanyInfo.address.country} ·
                Signatory: {ourCompanyInfo.signatory.name}
              </p>
            ) : (
              <p className="mt-1 text-slate-500">Our Company Info not configured in Settings.</p>
            )}
            <p className="mt-1">
              AM assignment: {company.internalAmUserId ? getUserName(state, company.internalAmUserId) : "Missing internal AM"} /{" "}
              {company.counterpartyAmName ?? "Missing counterparty AM"}
            </p>
            <Link to="/settings" className="mt-1 inline-flex text-[11px] font-semibold text-brand-700">
              View Our Company Info in Settings
            </Link>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {!smsInterconnection && (
              <Button size="sm" onClick={() => state.startInterconnectionProcess(resolvedCompanyId, "SMS")}>
                Start SMS
              </Button>
            )}
            {!voiceInterconnection && (
              <Button size="sm" variant="secondary" onClick={() => state.startInterconnectionProcess(resolvedCompanyId, "Voice")}>
                Start Voice
              </Button>
            )}
          </div>
          {interconnectionRows.length === 0 ? (
            <p className="text-xs text-slate-500">No interconnection process started yet.</p>
          ) : (
            <div className="space-y-3">
              {interconnectionRows.map((row) => {
                const processContracts = contracts.filter((contract) => contract.interconnectionProcessId === row.id);
                const ndaSigned = hasSignedContract(processContracts, row.id, "NDA");
                const serviceSigned = hasSignedContract(processContracts, row.id, "ServiceAgreement");
                const completionMissing = isStageBlocked("Completed", row, company, processContracts);
                return (
                  <div key={row.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold">{row.track} process</p>
                      <Badge>{row.stage}</Badge>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <FieldLabel>Current stage</FieldLabel>
                        <select value={row.stage} onChange={(e) => state.setInterconnectionStage(row.id, e.target.value as InterconnectionStage)}>
                          {stages.map((stage) => (
                            <option key={stage}>{stage}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Started</FieldLabel>
                        <input value={`${formatDay(row.startedAt)} ${formatTime(row.startedAt)}`} disabled />
                      </div>
                      <div>
                        <FieldLabel>Completed</FieldLabel>
                        <input value={row.completedAt ? `${formatDay(row.completedAt)} ${formatTime(row.completedAt)}` : "-"} disabled />
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
                      <p>NDA signed: {ndaSigned ? "Yes" : "No"}</p>
                      <p>Service Agreement signed: {serviceSigned ? "Yes" : "No"}</p>
                      <p>Completion checks: {completionMissing.length === 0 ? "Ready" : `Missing ${completionMissing.join(", ")}`}</p>
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contracts</p>
                        <Button size="sm" variant="secondary" onClick={() => createDraftContract(row, "NDA")}>
                          New NDA
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => createDraftContract(row, "ServiceAgreement")}>
                          New Service Agreement
                        </Button>
                      </div>

                      {processContracts.length === 0 ? (
                        <p className="text-xs text-slate-500">No contracts yet for this track.</p>
                      ) : (
                        <div className="space-y-2">
                          {processContracts.map((contract) => (
                            <div key={contract.id} className="rounded-md border border-slate-200 bg-white p-2">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-slate-800">{contract.contractType}</p>
                                  <p className="text-[11px] text-slate-500">
                                    Updated: {new Date(contract.updatedAt).toLocaleString()}
                                  </p>
                                </div>
                                <Badge>{contract.status}</Badge>
                              </div>

                              <div className="mb-2">
                                <input type="file" multiple onChange={(event) => uploadFiles(contract.id, event)} />
                              </div>

                              <div className="mb-2 space-y-1">
                                {contract.files.length === 0 ? (
                                  <p className="text-[11px] text-slate-500">No files uploaded.</p>
                                ) : (
                                  contract.files.map((file) => (
                                    <div
                                      key={file.id}
                                      className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-[11px]"
                                    >
                                      <span>{file.filename}</span>
                                      {file.contentDataUrl && (
                                        <a href={file.contentDataUrl} download={file.filename} className="font-semibold text-brand-700">
                                          Download
                                        </a>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {contract.status === "Draft" && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      state.requestContractInternalSignature(
                                        contract.id,
                                        contract.internalSignerUserId ?? company.internalAmUserId ?? row.ownerUserId,
                                      )
                                    }
                                  >
                                    Request internal signature
                                  </Button>
                                )}
                                {contract.status === "InternalSignatureRequested" && (
                                  <Button size="sm" onClick={() => state.markContractInternallySigned(contract.id)}>
                                    Mark internally signed
                                  </Button>
                                )}
                                {contract.status === "CounterpartySignatureRequested" && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      state.markContractCounterpartySigned(
                                        contract.id,
                                        contract.counterpartySignerName ?? company.counterpartyAmName ?? "Counterparty Signer",
                                      )
                                    }
                                  >
                                    Mark counterparty signed
                                  </Button>
                                )}
                                {contract.status !== "FullySigned" && (
                                  <>
                                    <Button size="sm" variant="secondary" onClick={() => state.setContractStatus(contract.id, "Rejected")}>
                                      Reject
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => state.setContractStatus(contract.id, "Expired")}>
                                      Expire
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === "Contracts" && (
        <Card title="Company contracts">
          {contracts.length === 0 ? (
            <p className="text-xs text-slate-500">No contracts available for this company.</p>
          ) : (
            <>
              {company.companyStatus === "CLIENT" ? (
                <div className="mb-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="font-semibold text-slate-800">SMS contracts</p>
                    <p className="text-slate-600">Signed: {contracts.filter((row) => row.track === "SMS" && row.status === "FullySigned").length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="font-semibold text-slate-800">Voice contracts</p>
                    <p className="text-slate-600">Signed: {contracts.filter((row) => row.track === "Voice" && row.status === "FullySigned").length}</p>
                  </div>
                </div>
              ) : null}

              <table>
                <thead>
                  <tr>
                    <th>Track</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Files</th>
                  </tr>
                </thead>
                <tbody>
                  {(company.companyStatus === "CLIENT" ? contracts.filter((row) => row.status === "FullySigned") : contracts).map((contract) => (
                    <tr key={contract.id}>
                      <td>{contract.track}</td>
                      <td>{contract.contractType}</td>
                      <td>
                        <Badge>{contract.status}</Badge>
                      </td>
                      <td>{new Date(contract.updatedAt).toLocaleString()}</td>
                      <td>{contract.files.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      )}

      {activeTab === "History" && (
        <Card title="Timeline">
          {historyItems.length === 0 ? (
            <p className="text-xs text-slate-500">No history yet.</p>
          ) : (
            <div className="space-y-2">
              {historyItems.map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-slate-500">
                      {formatDay(item.at)} {formatTime(item.at)}
                    </p>
                  </div>
                  <p className="text-slate-700">{item.detail}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
