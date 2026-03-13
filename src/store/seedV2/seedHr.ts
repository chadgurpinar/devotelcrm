import {
  HrAsset,
  HrAssetAssignment,
  HrAuditLogEntry,
  HrCountryLeaveProfile,
  HrCurrencyCode,
  HrDepartment,
  HrEmployee,
  HrEmployeeCompensation,
  HrExpense,
  HrFxRate,
  HrLegalEntity,
  HrLeaveRequest,
  HrPayrollMonthSnapshot,
  HrProvisionRequest,
  HrSoftwareProduct,
  HrSoftwareSeat,
  HrSoftwareLicense,
  OurEntity,
  User,
} from "../types";
import { computePayrollPreview, convertCurrency, workingDaysBetween } from "../hrUtils";
import { SeedIdFactory } from "./ids";
import { SeedPrng } from "./prng";
import { ScenarioConfig } from "./scenarios";
import { BASE_EMPLOYEE_ROWS } from "./seedEvents";
import { addDaysToIso } from "./time";

export interface SeedHrResult {
  hrLegalEntities: HrLegalEntity[];
  hrFxRates: HrFxRate[];
  hrDepartments: HrDepartment[];
  hrEmployees: HrEmployee[];
  hrCompensations: HrEmployeeCompensation[];
  hrPayrollSnapshots: HrPayrollMonthSnapshot[];
  hrLeaveProfiles: HrCountryLeaveProfile[];
  hrLeaveRequests: HrLeaveRequest[];
  hrAssets: HrAsset[];
  hrAssetAssignments: HrAssetAssignment[];
  hrSoftwareProducts: HrSoftwareProduct[];
  hrSoftwareSeats: HrSoftwareSeat[];
  hrProvisionRequests: HrProvisionRequest[];
  hrSoftwareLicenses: HrSoftwareLicense[];
  hrExpenses: HrExpense[];
  hrAuditLogs: HrAuditLogEntry[];
}

const DEPARTMENT_NAMES = ["Management", "Sales", "Interconnection", "NOC", "Routing", "Product", "Finance", "Human Resources"];
const DIVISION_BY_DEPARTMENT: Record<string, string> = {
  Management: "Executive Office",
  Sales: "Revenue",
  Interconnection: "Carrier Partnerships",
  NOC: "Network Operations",
  Routing: "Network Operations",
  Product: "Product and Platforms",
  Finance: "Corporate Services",
  "Human Resources": "Corporate Services",
};

const WORK_LOCATIONS = ["Atlas HQ", "Helix Office", "Nova Campus", "Remote", "Hybrid", "Pulse Hub"];
const FIRST_PARTS = ["Ari", "Nex", "Lio", "Mav", "Sol", "Kae", "Ryn", "Tiv", "Vex", "Ira", "Zen", "Quin"];
const LAST_PARTS = ["Arden", "Kest", "Morrow", "Lyric", "Prax", "Sable", "Torin", "Vale", "Warden", "Yarrow", "Zephyr", "Brink"];
const UNIVERSITIES = ["Northbridge Institute", "Helix Technical College", "Lattice University", "Arcadia School of Business"];
const UNIVERSITY_DEPARTMENTS = ["Computer Systems", "Business Strategy", "Industrial Engineering", "Network Technologies"];
const DEGREES = ["Bachelor", "Master", "MBA"];
const BANKS = ["SeedBank One", "Vertex Financial", "Orbit Credit", "Nova Treasury"];
const LICENSE_NAMES = ["Suite Workspace", "Issue Tracker Pro", "Design Studio", "Comm Stream", "Sales Orbit", "Docs Vault"];
const LICENSE_VENDORS = ["CloudAxis", "TrackForge", "VisioGrid", "SignalHub", "MarketLoop", "Northbridge Labs"];
const EXPENSE_CATEGORIES = ["Travel", "Meal", "Hotel", "Taxi", "Equipment", "Training"];
const HARDWARE_REQUEST_CATEGORIES: Array<HrAsset["category"]> = ["Laptop", "Phone", "Accessory", "Monitor", "Other"];

function currencyByCountry(country: string): HrCurrencyCode {
  if (country === "Turkey") return "TRY";
  if (country === "United States") return "USD";
  if (country === "United Kingdom") return "GBP";
  return "EUR";
}

function countryByEntity(entity: "USA" | "UK" | "TR"): string {
  if (entity === "USA") return "United States";
  if (entity === "TR") return "Turkey";
  return "United Kingdom";
}

function normalizeCountryLabel(country: string): string {
  const normalized = country.trim().toLowerCase();
  if (normalized === "uk" || normalized === "united kingdom") return "United Kingdom";
  if (normalized === "usa" || normalized === "us" || normalized === "united states") return "United States";
  if (normalized === "tr" || normalized === "turkey") return "Turkey";
  if (normalized === "uae") return "United Arab Emirates";
  return country.trim();
}

function legalEntityFromCountry(country: string, idx: number): OurEntity {
  const normalized = normalizeCountryLabel(country).toLowerCase();
  if (normalized === "turkey") return "TR";
  if (normalized === "united kingdom") return "UK";
  if (normalized === "united states") return "USA";
  if (normalized === "united arab emirates") return "TR";
  if (idx % 5 === 0) return "USA";
  if (idx % 3 === 0) return "TR";
  return "UK";
}

function mapEmploymentType(raw: string): HrEmployee["employmentType"] {
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes("part")) return "Part-time";
  if (normalized.includes("contract")) return "Contractor";
  return "Full-time";
}

function gradeFromTitle(title: string): string {
  const normalized = title.trim().toLowerCase();
  if (normalized === "ceo" || normalized.includes("chief")) return "E1";
  if (normalized.includes("head")) return "M2";
  if (normalized.includes("manager") || normalized.includes("lead")) return "M1";
  if (normalized.includes("senior")) return "L3";
  return "L2";
}

function positionFromTitle(title: string): string {
  const normalized = title.trim().toLowerCase();
  if (normalized === "ceo" || normalized.includes("chief")) return "Executive";
  if (normalized.includes("head")) return "Department Head";
  if (normalized.includes("manager") || normalized.includes("lead")) return "Team Lead";
  if (normalized.includes("senior")) return "Senior IC";
  return "IC";
}

function workLocationFromCountry(country: string): string {
  const normalized = normalizeCountryLabel(country).toLowerCase();
  if (normalized === "turkey") return "Istanbul HQ";
  if (normalized === "united kingdom") return "London Office";
  if (normalized === "united states") return "New York Office";
  if (normalized === "spain") return "Barcelona Hub";
  if (normalized === "croatia") return "Zagreb Office";
  if (normalized === "serbia") return "Belgrade Office";
  return "Remote";
}

function syntheticName(index: number): { firstName: string; lastName: string; displayName: string } {
  const firstName = FIRST_PARTS[index % FIRST_PARTS.length];
  const lastName = LAST_PARTS[Math.floor(index / FIRST_PARTS.length) % LAST_PARTS.length];
  return {
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
  };
}

function legalEntityByIndex(idx: number): "USA" | "UK" | "TR" {
  if (idx % 5 === 0) return "USA";
  if (idx % 3 === 0) return "TR";
  return "UK";
}

function buildDepartments(idFactory: SeedIdFactory, baseNowIso: string, count: number): HrDepartment[] {
  const baseNames = Array.from(
    new Set(
      BASE_EMPLOYEE_ROWS.map((row) => (typeof row.department === "string" && row.department.trim() ? row.department.trim() : "Management")),
    ),
  );
  const names: string[] = [];
  baseNames.forEach((name) => {
    if (!names.includes(name)) names.push(name);
  });
  DEPARTMENT_NAMES.forEach((name) => {
    if (!names.includes(name)) names.push(name);
  });
  while (names.length < count) {
    names.push(`Department ${names.length + 1}`);
  }
  const selected = names.slice(0, Math.max(count, baseNames.length));
  const targetHeadcounts: Record<string, number> = {
    Management: 5,
    Sales: 8,
    Interconnection: 6,
    NOC: 10,
    Routing: 6,
    Product: 4,
    Finance: 4,
    "Human Resources": 3,
    "Product Development": 8,
    "Branding & Marketing": 5,
    "Telecom Operations": 12,
    Operations: 10,
    "Software Development": 10,
    "Business Development & Sales": 8,
  };
  const rows: HrDepartment[] = selected.map((name) => ({
    id: idFactory.next("hrDepartment"),
    name,
    parentDepartmentId: undefined,
    targetHeadcount: targetHeadcounts[name] ?? 5,
    createdAt: baseNowIso,
    updatedAt: baseNowIso,
  }));
  const management = rows.find((row) => row.name === "Management") ?? rows[0];
  rows.forEach((row) => {
    if (row.id === management.id) return;
    row.parentDepartmentId = management.id;
  });
  return rows.sort((left, right) => left.id.localeCompare(right.id));
}

function buildEmployees(params: {
  rng: SeedPrng;
  idFactory: SeedIdFactory;
  users: User[];
  departments: HrDepartment[];
  employeeCount: number;
  baseNowIso: string;
  forceDeep: boolean;
}): HrEmployee[] {
  const { rng, idFactory, users, departments, employeeCount, baseNowIso, forceDeep } = params;
  const employeeRows: HrEmployee[] = [];
  const departmentByName = new Map(departments.map((department) => [department.name, department.id]));
  const managementDepartmentId = departments.find((row) => row.name === "Management")?.id ?? departments[0]?.id ?? "hr-dept-0001";
  const nonManagementDepartments = departments.filter((row) => row.id !== managementDepartmentId);
  const startBase = "2022-01-10";
  const totalCount = Math.max(employeeCount, BASE_EMPLOYEE_ROWS.length);
  const activeCountTarget = Math.max(1, Math.floor(totalCount * 0.88));

  const baseEmployees: HrEmployee[] = BASE_EMPLOYEE_ROWS.map((row, idx) => {
    const normalizedCountry = normalizeCountryLabel(row.country);
    const legalEntity = legalEntityFromCountry(normalizedCountry, idx);
    const title = row.title?.trim() || "Specialist";
    const departmentName = row.department?.trim() || "Management";
    const departmentId = departmentByName.get(departmentName) ?? managementDepartmentId;
    const startDate = addDaysToIso(`${startBase}T00:00:00.000Z`, idx * 11).slice(0, 10);
    const currency = currencyByCountry(normalizedCountry);
    return {
      id: row.employeeId,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: `${row.firstName} ${row.lastName}`.trim(),
      active: true,
      employmentType: mapEmploymentType(row.employmentType),
      startDate,
      managerId: typeof row.managerId === "string" && row.managerId.trim() ? row.managerId.trim() : undefined,
      departmentId,
      division: DIVISION_BY_DEPARTMENT[departmentName] ?? "Operations",
      position: positionFromTitle(title),
      jobTitle: title,
      gradeLevel: gradeFromTitle(title),
      workLocation: workLocationFromCountry(normalizedCountry),
      countryOfEmployment: normalizedCountry,
      legalEntityId: legalEntity,
      company: "Devotel Group",
      citizenshipIdNumber: `ID-BASE-${String(idx + 1).padStart(4, "0")}`,
      email: row.email,
      phone: `+44 7000 ${String(100000 + idx).slice(-6)}`,
      address: `${idx + 1} Dataset Avenue`,
      emergencyContactName: `Emergency Contact ${idx + 1}`,
      emergencyContactPhone: `+44 7100 ${String(100000 + idx).slice(-6)}`,
      nationality: normalizedCountry,
      gender: idx % 7 === 0 ? "PreferNotToSay" : idx % 2 === 0 ? "Female" : "Male",
      birthDate: addDaysToIso("1988-01-05T00:00:00.000Z", idx * 40).slice(0, 10),
      maritalStatus: idx % 3 === 0 ? "Married" : "Single",
      numberOfChildren: idx % 4 === 0 ? idx % 3 : 0,
      university: UNIVERSITIES[idx % UNIVERSITIES.length],
      universityDepartment: UNIVERSITY_DEPARTMENTS[idx % UNIVERSITY_DEPARTMENTS.length],
      degree: DEGREES[idx % DEGREES.length],
      salaryTry: currency === "TRY" ? 76000 + idx * 430 : undefined,
      salaryGbp: currency === "GBP" ? 5200 + idx * 55 : undefined,
      salaryUsd: currency === "USD" ? 6100 + idx * 65 : undefined,
      salaryEur: currency === "EUR" ? 5600 + idx * 60 : undefined,
      totalSalaryUsdEq: 6400 + idx * 52,
      bankName: BANKS[idx % BANKS.length],
      ibanOrTrc20: `IBAN-BASE-${String(idx + 1).padStart(6, "0")}`,
      employeeFolderUrl: idx % 3 === 0 ? `https://seed.local/hr/employee/${row.employeeId}` : undefined,
      masterContractSignedAt: `${startDate}T10:00:00.000Z`,
      createdAt: `${startDate}T09:00:00.000Z`,
      updatedAt: `${startDate}T09:00:00.000Z`,
      systemUserId: users[idx % Math.max(1, users.length)]?.id,
    };
  });
  employeeRows.push(...baseEmployees);

  const ceoId =
    baseEmployees.find((employee) => !employee.managerId)?.id ??
    baseEmployees.find((employee) => employee.jobTitle?.toLowerCase().includes("ceo"))?.id ??
    baseEmployees[0]?.id ??
    "";

  while (employeeRows.length < totalCount) {
    const idx = employeeRows.length;
    const person = syntheticName(idx + 17);
    const id = idFactory.next("hrEmployee");
    const department = nonManagementDepartments[idx % Math.max(1, nonManagementDepartments.length)] ?? departments[0];
    const managersInDepartment = employeeRows.filter((entry) => entry.departmentId === department.id && entry.id !== ceoId);
    const leads = managersInDepartment.filter((entry) => (entry.position ?? "").includes("Lead") || (entry.jobTitle ?? "").toLowerCase().includes("manager"));
    const heads = managersInDepartment.filter((entry) => (entry.position ?? "").includes("Head") || (entry.jobTitle ?? "").toLowerCase().includes("head"));
    const managerPool = [...leads, ...heads, ...managersInDepartment];
    const managerPick = managerPool.length > 0 ? managerPool[rng.int(0, managerPool.length - 1)] : undefined;
    const managerId = managerPick?.id ?? ceoId;
    const entity = legalEntityByIndex(idx + 11);
    const country = countryByEntity(entity);
    const currency = currencyByCountry(country);
    const active = idx < activeCountTarget;
    const startDate = addDaysToIso(`${startBase}T00:00:00.000Z`, 420 + idx * 5).slice(0, 10);
    const endDate = active ? undefined : addDaysToIso(`${startDate}T00:00:00.000Z`, 360).slice(0, 10);
    employeeRows.push({
      id,
      firstName: person.firstName,
      lastName: person.lastName,
      displayName: person.displayName,
      active,
      employmentType: idx % 9 === 0 ? "Contractor" : idx % 4 === 0 ? "Part-time" : "Full-time",
      startDate,
      endDate,
      seniorityYears: idx % 5 === 0 ? undefined : Math.max(0, Math.floor((new Date(baseNowIso).getTime() - new Date(`${startDate}T00:00:00.000Z`).getTime()) / (365 * 24 * 60 * 60 * 1000))),
      managerId,
      departmentId: department.id,
      division: DIVISION_BY_DEPARTMENT[department.name] ?? "Operations",
      position: idx % 4 === 0 ? "Senior IC" : "IC",
      jobTitle: `${department.name} Specialist`,
      gradeLevel: idx % 5 === 0 ? "L3" : idx % 3 === 0 ? "L2" : "L1",
      workLocation: WORK_LOCATIONS[(idx + 3) % WORK_LOCATIONS.length],
      countryOfEmployment: country,
      legalEntityId: entity,
      company: "Devotel Group",
      citizenshipIdNumber: idx % 7 === 0 ? undefined : `ID-IC-${String(idx + 1).padStart(5, "0")}`,
      email: `employee-${String(idx + 1).padStart(4, "0")}@staff.seed.local`,
      phone: `+44 7000 4${String(idx + 1).padStart(5, "0")}`,
      address: `${idx + 50} Synthetic Street`,
      emergencyContactName: `Emergency Contact ${idx + 50}`,
      emergencyContactPhone: `+44 7000 5${String(idx + 1).padStart(5, "0")}`,
      nationality: country,
      gender: idx % 11 === 0 ? "PreferNotToSay" : idx % 2 === 0 ? "Female" : "Male",
      birthDate: addDaysToIso("1993-01-05T00:00:00.000Z", idx * 13).slice(0, 10),
      maritalStatus: idx % 4 === 0 ? "Married" : "Single",
      numberOfChildren: idx % 4 === 0 ? idx % 3 : 0,
      university: UNIVERSITIES[idx % UNIVERSITIES.length],
      universityDepartment: UNIVERSITY_DEPARTMENTS[idx % UNIVERSITY_DEPARTMENTS.length],
      degree: DEGREES[idx % DEGREES.length],
      salaryTry: currency === "TRY" ? 52000 + (idx % 12) * 900 : undefined,
      salaryGbp: currency === "GBP" ? 3600 + (idx % 10) * 80 : undefined,
      salaryUsd: currency === "USD" ? 4500 + (idx % 10) * 100 : undefined,
      salaryEur: currency === "EUR" ? 3900 + (idx % 10) * 85 : undefined,
      totalSalaryUsdEq: idx % 3 === 0 ? 4200 + idx * 22 : undefined,
      bankName: idx % 3 === 0 ? BANKS[idx % BANKS.length] : undefined,
      ibanOrTrc20: idx % 3 === 0 ? `IBAN-IC-${String(idx + 1).padStart(7, "0")}` : undefined,
      employeeFolderUrl: idx % 4 === 0 ? `https://seed.local/hr/employee/${id}` : undefined,
      masterContractSignedAt: addDaysToIso(`${startDate}T11:00:00.000Z`, 2),
      createdAt: `${startDate}T09:00:00.000Z`,
      updatedAt: `${startDate}T09:00:00.000Z`,
      systemUserId: idx < users.length ? users[idx].id : undefined,
    });
  }

  const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]));
  const deptHeadsByDepartment = new Map<string, string[]>();
  const teamLeadsByDepartment = new Map<string, string[]>();
  employeeRows.forEach((employee) => {
    if (employee.id === ceoId) return;
    const title = `${employee.position ?? ""} ${employee.jobTitle ?? ""}`.toLowerCase();
    if (title.includes("head")) {
      const list = deptHeadsByDepartment.get(employee.departmentId) ?? [];
      list.push(employee.id);
      deptHeadsByDepartment.set(employee.departmentId, list);
    }
    if (title.includes("lead") || title.includes("manager")) {
      const list = teamLeadsByDepartment.get(employee.departmentId) ?? [];
      list.push(employee.id);
      teamLeadsByDepartment.set(employee.departmentId, list);
    }
  });

  employeeRows.forEach((employee) => {
    if (employee.id === ceoId) {
      employee.managerId = undefined;
      return;
    }
    if (!employee.managerId || employee.managerId === employee.id || !employeeById.has(employee.managerId)) {
      const teamLeads = teamLeadsByDepartment.get(employee.departmentId) ?? [];
      const deptHeads = deptHeadsByDepartment.get(employee.departmentId) ?? [];
      employee.managerId = teamLeads[0] ?? deptHeads[0] ?? ceoId;
    }
    if (employee.position === "Department Head" && employee.id !== ceoId) {
      employee.managerId = ceoId;
    }
  });

  if (forceDeep) {
    const firstHead = employeeRows.find((entry) => entry.position === "Department Head" && entry.id !== ceoId);
    const firstLead =
      employeeRows.find((entry) => entry.position === "Team Lead" && entry.departmentId === firstHead?.departmentId) ??
      employeeRows.find((entry) => entry.position === "Team Lead");
    const firstIc =
      employeeRows.find((entry) => (entry.position === "IC" || entry.position === "Senior IC") && entry.departmentId === firstLead?.departmentId) ??
      employeeRows.find((entry) => entry.position === "IC" || entry.position === "Senior IC");
    if (firstHead && firstLead && firstIc) {
      firstHead.managerId = ceoId;
      firstLead.managerId = firstHead.id;
      firstIc.managerId = firstLead.id;
    }
  }

  return employeeRows.sort((left, right) => left.id.localeCompare(right.id));
}

function seedHrLegalEntities(baseNowIso: string): HrLegalEntity[] {
  return [
    {
      id: "USA",
      name: "Synthetic Telecom USA LLC",
      country: "United States",
      currency: "USD",
      bankDetailsRef: "SEED-BANK-USA",
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
    {
      id: "UK",
      name: "Synthetic Telecom UK Ltd",
      country: "United Kingdom",
      currency: "GBP",
      bankDetailsRef: "SEED-BANK-UK",
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
    {
      id: "TR",
      name: "Synthetic Telecom TR AS",
      country: "Turkey",
      currency: "TRY",
      bankDetailsRef: "SEED-BANK-TR",
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
  ];
}

function seedFxRates(idFactory: SeedIdFactory): HrFxRate[] {
  const effectiveDates = ["2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z", "2026-03-01T00:00:00.000Z"];
  const table: Record<HrCurrencyCode, number[]> = {
    EUR: [1, 1, 1],
    USD: [0.92, 0.93, 0.94],
    GBP: [1.16, 1.17, 1.18],
    TRY: [0.029, 0.028, 0.027],
  };
  const rows: HrFxRate[] = [];
  (Object.keys(table) as HrCurrencyCode[]).forEach((currency) => {
    effectiveDates.forEach((effectiveAt, idx) => {
      rows.push({
        id: idFactory.next("hrFxRate"),
        from: currency,
        to: "EUR",
        rate: table[currency][idx],
        effectiveAt,
        createdAt: effectiveAt,
        updatedAt: effectiveAt,
      });
    });
  });
  return rows;
}

function seedCompensations(idFactory: SeedIdFactory, employees: HrEmployee[]): HrEmployeeCompensation[] {
  return employees.map((employee, idx) => {
    const currency = currencyByCountry(employee.countryOfEmployment);
    const baseSalaryNet =
      employee.salaryTry ?? employee.salaryGbp ?? employee.salaryUsd ?? employee.salaryEur ?? (currency === "TRY" ? 52000 : 3800);
    const gross = baseSalaryNet * (currency === "TRY" ? 1.42 : 1.35);
    const employerCost = gross * 1.18;
    const bonusEntries =
      idx % 3 === 0
        ? [
            {
              id: `bonus-${employee.id}-01`,
              employeeId: employee.id,
              date: "2026-02-15",
              amount: Math.round(baseSalaryNet * 0.1),
              currency,
              description: "Synthetic performance bonus",
            },
          ]
        : [];
    return {
      id: idFactory.next("hrCompensation"),
      employeeId: employee.id,
      baseSalaryNet: Math.round(baseSalaryNet * 100) / 100,
      baseSalaryGross: Math.round(gross * 100) / 100,
      employerCost: Math.round(employerCost * 100) / 100,
      currency,
      bonusEntries,
      salaryDistribution:
        idx % 5 === 0
          ? [
              {
                id: `dist-${employee.id}-01`,
                legalEntityId: employee.legalEntityId,
                mode: "Percent",
                percent: 70,
                currency,
              },
              {
                id: `dist-${employee.id}-02`,
                legalEntityId: employee.legalEntityId === "TR" ? "UK" : "TR",
                mode: "Percent",
                percent: 30,
                currency,
              },
            ]
          : [
              {
                id: `dist-${employee.id}-01`,
                legalEntityId: employee.legalEntityId,
                mode: "Percent",
                percent: 100,
                currency,
              },
            ],
      createdAt: "2026-03-01T09:00:00.000Z",
      updatedAt: "2026-03-01T09:00:00.000Z",
    };
  });
}

function seedLeaveProfiles(baseNowIso: string): HrCountryLeaveProfile[] {
  return [
    {
      id: "leave-profile-tr",
      country: "Turkey",
      annualLeaveDays: 20,
      sickLeaveDays: 10,
      carryOverPolicy: "Up to 5 days",
      resetPolicy: "January 1",
      seniorityTiers: [
        { minYears: 0, maxYears: 1, days: 14 },
        { minYears: 1, maxYears: 5, days: 14 },
        { minYears: 5, maxYears: 15, days: 20 },
        { minYears: 15, maxYears: null, days: 26 },
      ],
      workingDays: [1, 2, 3, 4, 5],
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
    {
      id: "leave-profile-uk",
      country: "United Kingdom",
      annualLeaveDays: 25,
      sickLeaveDays: 10,
      carryOverPolicy: "Up to 3 days",
      resetPolicy: "January 1",
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
    {
      id: "leave-profile-us",
      country: "United States",
      annualLeaveDays: 15,
      sickLeaveDays: 8,
      carryOverPolicy: "No carry over",
      resetPolicy: "January 1",
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
    {
      id: "leave-profile-de",
      country: "Germany",
      annualLeaveDays: 24,
      sickLeaveDays: 12,
      carryOverPolicy: "Up to 5 days",
      resetPolicy: "January 1",
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
    {
      id: "leave-profile-es",
      country: "Spain",
      annualLeaveDays: 23,
      sickLeaveDays: 10,
      carryOverPolicy: "Up to 5 days",
      resetPolicy: "January 1",
      createdAt: baseNowIso,
      updatedAt: baseNowIso,
    },
  ];
}

export function seedHr(params: {
  rng: SeedPrng;
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  users: User[];
  baseNowIso: string;
  activeUserId: string;
}): SeedHrResult {
  const { rng, idFactory, scenario, users, baseNowIso, activeUserId } = params;
  const hrLegalEntities = seedHrLegalEntities(baseNowIso);
  const hrFxRates = seedFxRates(idFactory);
  const hrDepartments = buildDepartments(idFactory, baseNowIso, scenario.counts.hrDepartments);
  const hrEmployees = buildEmployees({
    rng,
    idFactory,
    users,
    departments: hrDepartments,
    employeeCount: scenario.counts.hrEmployees,
    baseNowIso,
    forceDeep: scenario.toggles.forceDeepHrOrg || scenario.scenarioId === "SCENARIO_HR_ORG_DEEP",
  });
  const hrCompensations = seedCompensations(idFactory, hrEmployees);
  const hrLeaveProfiles = seedLeaveProfiles(baseNowIso);

  const hrLeaveRequests: HrLeaveRequest[] = Array.from({ length: scenario.counts.hrLeaveRequests }).map((_, idx) => {
    const employee = hrEmployees[idx % hrEmployees.length];
    const startDate = addDaysToIso("2026-02-01T00:00:00.000Z", idx * 2).slice(0, 10);
    const endDate = addDaysToIso(`${startDate}T00:00:00.000Z`, (idx % 4) + 1).slice(0, 10);
    const status: HrLeaveRequest["status"] =
      idx % 6 === 0 ? "PendingManager" : idx % 6 === 1 ? "PendingHR" : idx % 6 === 2 ? "Rejected" : "Approved";
    const createdAt = addDaysToIso(`${startDate}T08:00:00.000Z`, -7);
    const managerApprovedAt =
      status === "PendingHR" || status === "Approved" || status === "Rejected" ? addDaysToIso(createdAt, 2) : undefined;
    const hrApprovedAt = status === "Approved" ? addDaysToIso(createdAt, 4) : undefined;
    const rejectedAt = status === "Rejected" ? addDaysToIso(createdAt, 4) : undefined;
    return {
      id: idFactory.next("hrLeaveRequest"),
      employeeId: employee.id,
      leaveType: idx % 8 === 0 ? "Sick" : idx % 9 === 0 ? "Other" : "Annual",
      startDate,
      endDate,
      totalDays: workingDaysBetween(startDate, endDate),
      status,
      managerApprovedAt,
      hrApprovedAt,
      rejectedAt,
      rejectionReason: status === "Rejected" ? "Coverage constraints for selected dates." : undefined,
      createdAt,
      updatedAt: hrApprovedAt ?? rejectedAt ?? managerApprovedAt ?? createdAt,
    };
  });

  const hrAssets: HrAsset[] = Array.from({ length: scenario.counts.hrAssets }).map((_, idx) => {
    const employee = hrEmployees[idx % hrEmployees.length];
    const category: HrAsset["category"] = HARDWARE_REQUEST_CATEGORIES[idx % HARDWARE_REQUEST_CATEGORIES.length];
    const createdAt = addDaysToIso("2025-12-12T09:00:00.000Z", idx);
    const assignedAt = addDaysToIso("2026-01-10T09:00:00.000Z", idx);
    const returnedAt = idx % 13 === 0 ? addDaysToIso(assignedAt, 45) : undefined;
    const retired = idx % 23 === 0;
    const assigned = !retired && idx % 8 !== 0 && !returnedAt;
    const status: HrAsset["status"] = retired ? "Retired" : returnedAt ? "Returned" : assigned ? "Assigned" : "Available";
    return {
      id: idFactory.next("hrAsset"),
      name:
        category === "Laptop"
          ? `Device Laptop ${idx + 1}`
          : category === "Phone"
            ? `Device Phone ${idx + 1}`
            : category === "Accessory"
              ? `Accessory Kit ${idx + 1}`
              : category === "Monitor"
                ? `Display Monitor ${idx + 1}`
                : `Shared Peripheral ${idx + 1}`,
      category,
      status,
      assignedToEmployeeId: assigned ? employee.id : undefined,
      assignedAt: assigned ? assignedAt : undefined,
      returnedAt,
      digitalAcceptance: assigned && idx % 5 !== 0,
      notes: retired ? "Retired from active lifecycle." : idx % 10 === 0 ? "Lifecycle review pending." : undefined,
      createdAt,
      updatedAt: addDaysToIso("2026-03-01T09:00:00.000Z", idx % 9),
    };
  });

  const hrAssetAssignments: HrAssetAssignment[] = hrAssets
    .filter((asset) => Boolean(asset.assignedToEmployeeId))
    .map((asset) => ({
      id: idFactory.next("hrAssetAssignment"),
      assetId: asset.id,
      employeeId: asset.assignedToEmployeeId as string,
      assignedAt: asset.assignedAt ?? asset.createdAt,
      returnedAt: asset.returnedAt,
      acceptanceStatus: asset.digitalAcceptance ? "Accepted" : "Pending",
      acceptedAt: asset.digitalAcceptance ? addDaysToIso(asset.assignedAt ?? asset.createdAt, 1) : undefined,
      revokedAt: undefined,
      assignedByUserId: activeUserId,
      notes: asset.notes,
      createdAt: asset.assignedAt ?? asset.createdAt,
      updatedAt: asset.updatedAt,
    }));

  const hrSoftwareProducts: HrSoftwareProduct[] = LICENSE_NAMES.map((name, idx) => ({
    id: idFactory.next("hrSoftwareProduct"),
    name,
    vendor: LICENSE_VENDORS[idx % LICENSE_VENDORS.length],
    licenseType: idx % 5 === 0 ? "Enterprise" : idx % 2 === 0 ? "Seat" : "Other",
    notes: idx % 3 === 0 ? "Used by multiple teams." : undefined,
    createdAt: "2025-12-01T09:00:00.000Z",
    updatedAt: "2026-03-01T09:00:00.000Z",
  }));
  const productById = new Map(hrSoftwareProducts.map((product) => [product.id, product]));

  const hrSoftwareSeats: HrSoftwareSeat[] = Array.from({ length: scenario.counts.hrSoftwareLicenses }).map((_, idx) => {
    const employee = hrEmployees[idx % hrEmployees.length];
    const product = hrSoftwareProducts[idx % hrSoftwareProducts.length];
    const createdAt = addDaysToIso("2025-12-01T09:00:00.000Z", idx);
    const assignedAt = addDaysToIso("2026-01-07T10:00:00.000Z", idx);
    const revokedAt = idx % 11 === 0 ? addDaysToIso(assignedAt, 75) : undefined;
    const endDate = idx % 9 === 0 ? addDaysToIso(assignedAt, 180).slice(0, 10) : undefined;
    const status: HrSoftwareSeat["status"] =
      revokedAt ? "Revoked" : endDate && endDate < "2026-03-01" ? "Expired" : idx % 4 === 0 ? "Available" : "Assigned";
    const assignedToEmployeeId = status === "Assigned" ? employee.id : undefined;
    return {
      id: idFactory.next("hrSoftwareSeat"),
      softwareProductId: product.id,
      status,
      assignedToEmployeeId,
      assignedToEmail:
        status === "Assigned"
          ? `${employee.firstName.toLowerCase()}.${employee.lastName.toLowerCase()}@workspace.seed.local`
          : undefined,
      assignedAt: status === "Assigned" ? assignedAt : undefined,
      revokedAt,
      endDate,
      cost: idx % 6 === 0 ? undefined : 8 + (idx % 10) * 4,
      currency: idx % 3 === 0 ? "USD" : idx % 3 === 1 ? "EUR" : "GBP",
      notes: idx % 12 === 0 ? "Seat tracked in enterprise pool." : undefined,
      createdAt,
      updatedAt: "2026-03-01T09:00:00.000Z",
    };
  });

  const hrSoftwareLicenses: HrSoftwareLicense[] = hrSoftwareSeats.map((seat, idx) => {
    const product = productById.get(seat.softwareProductId) ?? hrSoftwareProducts[0];
    const startDate = (seat.assignedAt ?? seat.createdAt).slice(0, 10);
    return {
      id: idFactory.next("hrSoftwareLicense"),
      name: product.name,
      vendor: product.vendor,
      licenseType: product.licenseType === "Enterprise" ? "Enterprise Seat" : product.licenseType === "Other" ? "Other" : "Seat",
      assignedToEmployeeId: seat.assignedToEmployeeId,
      startDate,
      endDate: seat.endDate,
      cost: seat.cost,
      currency: seat.currency,
      notes: idx % 11 === 0 ? "Legacy compatibility row." : seat.notes,
      createdAt: seat.createdAt,
      updatedAt: seat.updatedAt,
    };
  });

  const activeAssetAssignments = hrAssetAssignments.filter((assignment) => !assignment.returnedAt);
  const activeSoftwareSeats = hrSoftwareSeats.filter((seat) => seat.status === "Assigned");
  const provisionRequestCount = Math.max(24, Math.floor(hrEmployees.length * 0.55));
  const hrProvisionRequests: HrProvisionRequest[] = Array.from({ length: provisionRequestCount }).map((_, idx) => {
    const requester = hrEmployees[(idx * 3) % hrEmployees.length];
    const requestType: HrProvisionRequest["requestType"] = idx % 2 === 0 ? "Hardware" : "Software";
    const createdAt = addDaysToIso("2026-01-15T09:00:00.000Z", idx);
    const status: HrProvisionRequest["status"] =
      idx % 9 === 0
        ? "PendingManager"
        : idx % 9 === 1
          ? "PendingHR"
          : idx % 9 === 2
            ? "Rejected"
            : idx % 9 === 3
              ? "Cancelled"
              : "Fulfilled";
    const managerApprovedAt =
      status === "PendingHR" || status === "Rejected" || status === "Fulfilled"
        ? addDaysToIso(createdAt, 1)
        : undefined;
    const hrApprovedAt =
      status === "Fulfilled" || (status === "PendingHR" && idx % 2 === 0)
        ? addDaysToIso(createdAt, 2)
        : undefined;
    const fulfilledAt = status === "Fulfilled" ? addDaysToIso(createdAt, 3) : undefined;
    const linkedAssetAssignmentId =
      status === "Fulfilled" && requestType === "Hardware"
        ? activeAssetAssignments[idx % Math.max(1, activeAssetAssignments.length)]?.id
        : undefined;
    const linkedSoftwareSeatId =
      status === "Fulfilled" && requestType === "Software"
        ? activeSoftwareSeats[idx % Math.max(1, activeSoftwareSeats.length)]?.id
        : undefined;
    return {
      id: idFactory.next("hrProvisionRequest"),
      requesterEmployeeId: requester.id,
      requestType,
      requestedAssetCategory: requestType === "Hardware" ? HARDWARE_REQUEST_CATEGORIES[idx % HARDWARE_REQUEST_CATEGORIES.length] : undefined,
      requestedSoftwareProductId: requestType === "Software" ? hrSoftwareProducts[idx % hrSoftwareProducts.length]?.id : undefined,
      justification:
        requestType === "Hardware"
          ? "Workstation refresh required for current workload."
          : "Access required for team collaboration platform.",
      priority: idx % 5 === 0 ? "High" : idx % 2 === 0 ? "Medium" : "Low",
      status,
      managerApproverUserId: managerApprovedAt ? users[(idx + 1) % Math.max(1, users.length)]?.id ?? activeUserId : undefined,
      hrApproverUserId: hrApprovedAt ? users[(idx + 2) % Math.max(1, users.length)]?.id ?? activeUserId : undefined,
      managerApprovedAt,
      hrApprovedAt,
      fulfilledAt,
      rejectionReason: status === "Rejected" ? "Request deferred due to current budget cycle." : undefined,
      cancellationReason: status === "Cancelled" ? "Requester cancelled before manager approval." : undefined,
      linkedAssetAssignmentId,
      linkedSoftwareSeatId,
      createdAt,
      updatedAt: fulfilledAt ?? hrApprovedAt ?? managerApprovedAt ?? createdAt,
    };
  });

  const hrExpenses: HrExpense[] = Array.from({ length: scenario.counts.hrExpenses }).map((_, idx) => {
    const employee = hrEmployees[idx % hrEmployees.length];
    const currency = currencyByCountry(employee.countryOfEmployment);
    const createdAt = addDaysToIso("2026-02-01T09:00:00.000Z", idx);
    const claimType: HrExpense["claimType"] = idx % 4 === 0 ? "Advance" : "Reimbursement";
    const amount = currency === "TRY" ? 2500 + (idx % 10) * 420 : 60 + (idx % 8) * 24;
    const convertedAmountEUR = convertCurrency(amount, currency, "EUR", hrFxRates, createdAt) ?? amount;
    const status: HrExpense["status"] =
      idx % 6 === 0
        ? "PendingManager"
        : idx % 6 === 1
          ? "PendingFinance"
          : idx % 6 === 2
            ? "Approved"
            : idx % 6 === 3
              ? "Rejected"
              : idx % 6 === 4
                ? "Paid"
                : "Cancelled";
    const rejectedByFinance = status === "Rejected" && idx % 2 === 0;
    const managerApprovedAt =
      status === "PendingFinance" || status === "Approved" || status === "Paid" || rejectedByFinance
        ? addDaysToIso(createdAt, 1)
        : undefined;
    const financeApprovedAt = status === "Approved" || status === "Paid" ? addDaysToIso(createdAt, 2) : undefined;
    const rejectedAt = status === "Rejected" ? (rejectedByFinance ? addDaysToIso(createdAt, 2) : addDaysToIso(createdAt, 1)) : undefined;
    const paidAt = status === "Paid" ? addDaysToIso(createdAt, 4) : undefined;
    const cancelledAt = status === "Cancelled" ? addDaysToIso(createdAt, 1) : undefined;
    const receiptUrl = claimType === "Reimbursement" && idx % 9 !== 0 ? `upload://seed/expense/${idx + 1}/receipt.pdf` : undefined;
    const attachmentMeta =
      claimType === "Advance"
        ? idx % 3 === 0
          ? {
              url: `upload://seed/advance/${idx + 1}/supporting.pdf`,
              fileName: `advance-support-${idx + 1}.pdf`,
              mimeType: "application/pdf",
              sizeBytes: 48_000 + idx * 120,
              uploadedAt: createdAt,
            }
          : undefined
        : receiptUrl
          ? {
              url: receiptUrl,
              fileName: `expense-receipt-${idx + 1}.pdf`,
              mimeType: "application/pdf",
              sizeBytes: 36_000 + idx * 90,
              uploadedAt: createdAt,
            }
          : undefined;
    return {
      id: idFactory.next("hrExpense"),
      employeeId: employee.id,
      claimType,
      advanceType: claimType === "Advance" ? (idx % 2 === 0 ? "TravelAdvance" : "PerDiem") : undefined,
      category: claimType === "Advance" ? "Travel" : EXPENSE_CATEGORIES[idx % EXPENSE_CATEGORIES.length],
      amount: Math.round(amount * 100) / 100,
      currency,
      convertedAmountEUR: Math.round(convertedAmountEUR * 100) / 100,
      description:
        claimType === "Advance"
          ? "Synthetic advance request for travel-related upfront costs."
          : idx % 2 === 0
            ? "Synthetic client travel reimbursement."
            : "Synthetic operational reimbursement.",
      receiptUrl,
      attachmentMeta,
      travelStartDate: claimType === "Advance" ? addDaysToIso(createdAt, 14).slice(0, 10) : undefined,
      travelEndDate: claimType === "Advance" ? addDaysToIso(createdAt, 17).slice(0, 10) : undefined,
      advancePurpose: claimType === "Advance" ? "Conference travel advance request." : undefined,
      status,
      managerApprovedAt,
      financeApprovedAt,
      rejectedAt,
      paidAt,
      cancelledAt,
      createdAt,
      updatedAt: paidAt ?? rejectedAt ?? cancelledAt ?? financeApprovedAt ?? managerApprovedAt ?? createdAt,
    };
  });

  const hrPayrollSnapshots: HrPayrollMonthSnapshot[] = ["2026-02", "2026-03"].map((month) => {
    const snapshotId = idFactory.next("hrPayrollSnapshot");
    const preview = computePayrollPreview({
      employees: hrEmployees,
      compensations: hrCompensations,
      fxRates: hrFxRates,
      month,
      snapshotId,
    });
    return {
      id: snapshotId,
      month,
      createdAt: `${month}-28T18:00:00.000Z`,
      createdByUserId: activeUserId,
      notes: "Deterministic synthetic payroll snapshot.",
      filtersUsed: {},
      fxRateSetRef: `fx-${month}`,
      lines: preview.lines,
      totals: preview.totals,
    };
  });

  const hrAuditLogs: SeedHrResult["hrAuditLogs"] = [];
  hrLeaveRequests.slice(0, 40).forEach((request) => {
    hrAuditLogs.push({
      id: idFactory.next("hrAudit"),
      parentType: "Leave",
      parentId: request.id,
      actionType: request.status === "Rejected" ? "HR_REJECT" : request.status === "Approved" ? "HR_APPROVE" : "MANAGER_APPROVE",
      performedByUserId: activeUserId,
      comment: "Synthetic leave workflow audit.",
      timestamp: request.updatedAt,
    });
  });
  hrExpenses.slice(0, 40).forEach((expense) => {
    hrAuditLogs.push({
      id: idFactory.next("hrAudit"),
      parentType: "Expense",
      parentId: expense.id,
      actionType: "SUBMIT",
      performedByUserId: activeUserId,
      comment: expense.claimType === "Advance" ? "Synthetic advance submitted." : "Synthetic reimbursement submitted.",
      timestamp: expense.createdAt,
    });
    if (expense.managerApprovedAt) {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "Expense",
        parentId: expense.id,
        actionType: "MANAGER_APPROVE",
        performedByUserId: activeUserId,
        timestamp: expense.managerApprovedAt,
      });
    }
    if (expense.status === "Rejected") {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "Expense",
        parentId: expense.id,
        actionType: expense.managerApprovedAt ? "FINANCE_REJECT" : "MANAGER_REJECT",
        performedByUserId: activeUserId,
        comment: "Synthetic rejection in workflow.",
        timestamp: expense.rejectedAt ?? expense.updatedAt,
      });
    }
    if (expense.financeApprovedAt) {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "Expense",
        parentId: expense.id,
        actionType: "FINANCE_APPROVE",
        performedByUserId: activeUserId,
        timestamp: expense.financeApprovedAt,
      });
    }
    if (expense.status === "Cancelled") {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "Expense",
        parentId: expense.id,
        actionType: "CANCEL",
        performedByUserId: activeUserId,
        comment: "Synthetic employee cancellation.",
        timestamp: expense.cancelledAt ?? expense.updatedAt,
      });
    }
    if (expense.status === "Paid") {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "Expense",
        parentId: expense.id,
        actionType: "MARK_PAID",
        performedByUserId: activeUserId,
        timestamp: expense.paidAt ?? expense.updatedAt,
      });
    }
  });
  hrAssets.slice(0, 40).forEach((asset) => {
    hrAuditLogs.push({
      id: idFactory.next("hrAudit"),
      parentType: "Asset",
      parentId: asset.id,
      actionType: asset.status === "Returned" ? "ASSET_RETURNED" : asset.digitalAcceptance ? "ASSET_ACCEPTED" : "ASSET_ASSIGNED",
      performedByUserId: activeUserId,
      comment: "Synthetic asset lifecycle audit.",
      timestamp: asset.updatedAt,
    });
  });
  hrAssetAssignments.slice(0, 40).forEach((assignment) => {
    hrAuditLogs.push({
      id: idFactory.next("hrAudit"),
      parentType: "AssetAssignment",
      parentId: assignment.id,
      actionType: assignment.acceptanceStatus === "Accepted" ? "ASSET_ASSIGNMENT_ACCEPTED" : "ASSET_ASSIGNMENT_CREATED",
      performedByUserId: assignment.assignedByUserId,
      comment: assignment.notes,
      timestamp: assignment.updatedAt,
    });
  });
  hrSoftwareSeats.slice(0, 40).forEach((seat) => {
    if (seat.status === "Assigned") {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "SoftwareSeat",
        parentId: seat.id,
        actionType: "SOFTWARE_SEAT_ASSIGNED",
        performedByUserId: activeUserId,
        timestamp: seat.assignedAt ?? seat.updatedAt,
      });
    }
    if (seat.status === "Revoked") {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "SoftwareSeat",
        parentId: seat.id,
        actionType: "SOFTWARE_SEAT_REVOKED",
        performedByUserId: activeUserId,
        timestamp: seat.revokedAt ?? seat.updatedAt,
      });
    }
  });
  hrProvisionRequests.forEach((request) => {
    hrAuditLogs.push({
      id: idFactory.next("hrAudit"),
      parentType: "ProvisionRequest",
      parentId: request.id,
      actionType: "PROVISION_REQUEST_CREATED",
      performedByUserId: activeUserId,
      timestamp: request.createdAt,
    });
    if (request.managerApprovedAt) {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "ProvisionRequest",
        parentId: request.id,
        actionType: "PROVISION_MANAGER_APPROVED",
        performedByUserId: request.managerApproverUserId ?? activeUserId,
        timestamp: request.managerApprovedAt,
      });
    }
    if (request.hrApprovedAt) {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "ProvisionRequest",
        parentId: request.id,
        actionType: "PROVISION_HR_APPROVED",
        performedByUserId: request.hrApproverUserId ?? activeUserId,
        timestamp: request.hrApprovedAt,
      });
    }
    if (request.status === "Rejected") {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "ProvisionRequest",
        parentId: request.id,
        actionType: request.hrApproverUserId ? "PROVISION_HR_REJECTED" : "PROVISION_MANAGER_REJECTED",
        performedByUserId: request.hrApproverUserId ?? request.managerApproverUserId ?? activeUserId,
        comment: request.rejectionReason,
        timestamp: request.updatedAt,
      });
    }
    if (request.status === "Cancelled") {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "ProvisionRequest",
        parentId: request.id,
        actionType: "PROVISION_CANCELLED",
        performedByUserId: activeUserId,
        comment: request.cancellationReason,
        timestamp: request.updatedAt,
      });
    }
    if (request.fulfilledAt) {
      hrAuditLogs.push({
        id: idFactory.next("hrAudit"),
        parentType: "ProvisionRequest",
        parentId: request.id,
        actionType: "PROVISION_FULFILLED",
        performedByUserId: request.hrApproverUserId ?? activeUserId,
        timestamp: request.fulfilledAt,
      });
    }
  });
  hrPayrollSnapshots.forEach((snapshot) => {
    hrAuditLogs.push({
      id: idFactory.next("hrAudit"),
      parentType: "PayrollSnapshot",
      parentId: snapshot.id,
      actionType: "PAYROLL_SNAPSHOT_GENERATED",
      performedByUserId: snapshot.createdByUserId,
      timestamp: snapshot.createdAt,
    });
  });

  return {
    hrLegalEntities,
    hrFxRates: hrFxRates.sort((left, right) => left.id.localeCompare(right.id)),
    hrDepartments: hrDepartments.sort((left, right) => left.id.localeCompare(right.id)),
    hrEmployees,
    hrCompensations: hrCompensations.sort((left, right) => left.id.localeCompare(right.id)),
    hrPayrollSnapshots: hrPayrollSnapshots.sort((left, right) => left.month.localeCompare(right.month)),
    hrLeaveProfiles: hrLeaveProfiles.sort((left, right) => left.id.localeCompare(right.id)),
    hrLeaveRequests: hrLeaveRequests.sort((left, right) => left.id.localeCompare(right.id)),
    hrAssets: hrAssets.sort((left, right) => left.id.localeCompare(right.id)),
    hrAssetAssignments: hrAssetAssignments.sort((left, right) => left.id.localeCompare(right.id)),
    hrSoftwareProducts: hrSoftwareProducts.sort((left, right) => left.id.localeCompare(right.id)),
    hrSoftwareSeats: hrSoftwareSeats.sort((left, right) => left.id.localeCompare(right.id)),
    hrProvisionRequests: hrProvisionRequests.sort((left, right) => left.id.localeCompare(right.id)),
    hrSoftwareLicenses: hrSoftwareLicenses.sort((left, right) => left.id.localeCompare(right.id)),
    hrExpenses: hrExpenses.sort((left, right) => left.id.localeCompare(right.id)),
    hrAuditLogs: hrAuditLogs.sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.id.localeCompare(right.id)),
  };
}
