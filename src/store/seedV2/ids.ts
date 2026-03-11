type EntityKey =
  | "user"
  | "event"
  | "eventStaff"
  | "company"
  | "contact"
  | "meeting"
  | "note"
  | "task"
  | "taskComment"
  | "taskLabel"
  | "interconnectionProcess"
  | "contract"
  | "contractFile"
  | "project"
  | "projectWeeklyReport"
  | "hrLegalEntity"
  | "hrFxRate"
  | "hrDepartment"
  | "hrEmployee"
  | "hrCompensation"
  | "hrLeaveProfile"
  | "hrLeaveRequest"
  | "hrAsset"
  | "hrAssetAssignment"
  | "hrSoftwareProduct"
  | "hrSoftwareSeat"
  | "hrProvisionRequest"
  | "hrSoftwareLicense"
  | "hrExpense"
  | "hrAudit"
  | "hrPayrollSnapshot"
  | "opsSignal"
  | "opsCase"
  | "opsRequest"
  | "opsAudit"
  | "opsShift";

const PREFIX: Record<EntityKey, string> = {
  user: "u",
  event: "e",
  eventStaff: "es",
  company: "c",
  contact: "p",
  meeting: "m",
  note: "n",
  task: "t",
  taskComment: "tc",
  taskLabel: "tl",
  interconnectionProcess: "ip",
  contract: "ct",
  contractFile: "cf",
  project: "pr",
  projectWeeklyReport: "pwr",
  hrLegalEntity: "hr-le",
  hrFxRate: "hr-fx",
  hrDepartment: "hr-dept",
  hrEmployee: "hr-emp",
  hrCompensation: "hr-comp",
  hrLeaveProfile: "hr-lp",
  hrLeaveRequest: "hr-leave",
  hrAsset: "hr-asset",
  hrAssetAssignment: "hr-asset-assignment",
  hrSoftwareProduct: "hr-software-product",
  hrSoftwareSeat: "hr-software-seat",
  hrProvisionRequest: "hr-provision",
  hrSoftwareLicense: "hr-license",
  hrExpense: "hr-expense",
  hrAudit: "hr-audit",
  hrPayrollSnapshot: "hr-payroll",
  opsSignal: "ops-signal",
  opsCase: "ops-case",
  opsRequest: "ops-req",
  opsAudit: "ops-audit",
  opsShift: "ops-shift",
};

function pad(value: number): string {
  return String(value).padStart(4, "0");
}

export interface SeedIdFactory {
  next: (entity: EntityKey) => string;
  peek: (entity: EntityKey) => number;
}

export function createSeedIdFactory(): SeedIdFactory {
  const counters = new Map<EntityKey, number>();

  function next(entity: EntityKey): string {
    const current = (counters.get(entity) ?? 0) + 1;
    counters.set(entity, current);
    return `${PREFIX[entity]}-${pad(current)}`;
  }

  function peek(entity: EntityKey): number {
    return counters.get(entity) ?? 0;
  }

  return {
    next,
    peek,
  };
}
