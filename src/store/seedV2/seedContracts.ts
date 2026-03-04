import { Company, Contract, ContractFile, ContractStatus, ContractType, InterconnectionProcess, User } from "../types";
import { SeedIdFactory } from "./ids";
import { SeedPrng } from "./prng";
import { ScenarioConfig } from "./scenarios";
import { addDaysToIso } from "./time";

function statusForContract(processStage: InterconnectionProcess["stage"], contractType: ContractType, seed: number): ContractStatus {
  if (processStage === "Failed") return seed % 2 === 0 ? "Rejected" : "Expired";
  if (contractType === "NDA") {
    if (processStage === "NDA") return seed % 3 === 0 ? "InternalSignatureRequested" : "Draft";
    return "FullySigned";
  }
  if (contractType === "ServiceAgreement") {
    if (processStage === "NDA") return "Draft";
    if (processStage === "Contract") return seed % 2 === 0 ? "InternalSignatureRequested" : "CounterpartySignatureRequested";
    if (processStage === "Technical" || processStage === "AM_Assigned") return "CounterpartySignatureRequested";
    return "FullySigned";
  }
  if (contractType === "Addendum") {
    return processStage === "Completed" ? "FullySigned" : "Draft";
  }
  return "Draft";
}

function fileKindForStatus(status: ContractStatus): ContractFile["kind"] {
  if (status === "FullySigned") return "Signed";
  if (status === "Rejected" || status === "Expired") return "Other";
  return "Draft";
}

function syntheticFilename(companyName: string, track: Contract["track"], contractType: ContractType, sequence: number): string {
  const safeCompany = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const kind = contractType === "ServiceAgreement" ? "service" : contractType.toLowerCase();
  return `${safeCompany}_${track.toLowerCase()}_${kind}_${sequence}.pdf`;
}

export function seedContracts(params: {
  rng: SeedPrng;
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  users: User[];
  companies: Company[];
  interconnectionProcesses: InterconnectionProcess[];
}): Contract[] {
  const { idFactory, scenario, users, companies, interconnectionProcesses } = params;
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const defaultRequester = users.find((user) => user.role === "Interconnection Manager")?.id ?? users[0]?.id ?? "u1";
  const signerSms = users.find((user) => user.role === "Head of SMS")?.id ?? defaultRequester;
  const signerVoice = users.find((user) => user.role === "Head of Voice")?.id ?? defaultRequester;

  const contracts: Contract[] = [];
  interconnectionProcesses.forEach((process, idx) => {
    const company = companyById.get(process.companyId);
    if (!company) return;
    const createdAt = process.startedAt;
    const updatedAt = process.updatedAt;
    const baseTypes: ContractType[] = ["NDA", "ServiceAgreement"];
    if (scenario.toggles.forceContractsRichFiles && idx % 4 === 0) baseTypes.push("Addendum");
    if (scenario.toggles.forceContractsRichFiles && idx % 7 === 0) baseTypes.push("Other");

    baseTypes.forEach((contractType, typeIdx) => {
      const status = statusForContract(process.stage, contractType, idx + typeIdx);
      const contractId = idFactory.next("contract");
      const fileCount = scenario.toggles.forceContractsRichFiles ? 1 + ((idx + typeIdx) % 3) : 1;
      const files: ContractFile[] = Array.from({ length: fileCount }).map((_, fileIdx) => {
        const fileKind: ContractFile["kind"] = fileIdx === 0 ? fileKindForStatus(status) : fileIdx % 2 === 0 ? "Draft" : "Other";
        const uploadedAt = addDaysToIso(createdAt, fileIdx);
        return {
          id: idFactory.next("contractFile"),
          kind: fileKind,
          filename: syntheticFilename(company.name, process.track, contractType, fileIdx + 1),
          mimeType: "application/pdf",
          size: 90_000 + (idx + fileIdx) * 900,
          uploadedAt,
          uploadedByUserId: process.ownerUserId || defaultRequester,
          storageRef: `seedv2://${contractId}/file-${fileIdx + 1}`,
        };
      });
      if (status === "FullySigned" && !files.some((file) => file.kind === "Signed")) {
        files[0] = {
          ...files[0],
          kind: "Signed",
        };
      }

      contracts.push({
        id: contractId,
        companyId: company.id,
        interconnectionProcessId: process.id,
        track: process.track,
        ourEntity: company.ourEntity,
        contractType,
        customTypeName: contractType === "Other" ? `CustomTerm-${idx + 1}` : undefined,
        note: contractType === "Other" ? "Synthetic custom contract type." : undefined,
        status,
        files,
        requestedByUserId: process.ownerUserId || defaultRequester,
        internalSignerUserId:
          status === "Draft" ? undefined : process.track === "SMS" ? signerSms : signerVoice,
        counterpartySignerName: status === "FullySigned" ? `CounterSigner-${String(idx + 1).padStart(3, "0")}` : undefined,
        createdAt,
        updatedAt,
        signedAt: status === "FullySigned" ? updatedAt : undefined,
      });
    });
  });

  return contracts.sort((left, right) => left.id.localeCompare(right.id));
}
