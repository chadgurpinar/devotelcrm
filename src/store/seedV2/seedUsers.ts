import { User } from "../types";
import { SeedPrng } from "./prng";
import { BASE_EMPLOYEE_ROWS, BaseEmployeeSeedRow } from "./seedEvents";

const ROLE_SEQUENCE: User["role"][] = [
  "SuperAdmin",
  "Sales",
  "Sales",
  "Sales",
  "Sales",
  "Sales",
  "Interconnection Manager",
  "NOC",
  "Head of SMS",
  "Head of Voice",
];

const COLOR_PALETTE = ["#4f46e5", "#1d4ed8", "#0f766e", "#0369a1", "#be123c", "#6d28d9", "#1e40af", "#0f766e", "#b45309", "#9333ea"];

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function isSalesOrBdEmployee(row: BaseEmployeeSeedRow): boolean {
  const department = normalizeText(row.department ?? "");
  const title = normalizeText(row.title ?? "");
  return (
    department.includes("sales") ||
    department.includes("business development") ||
    title.includes("sales") ||
    title.includes("business development") ||
    title.includes("partnership") ||
    title.includes("account manager")
  );
}

function defaultEntityFromCountry(country: string): User["defaultOurEntity"] {
  const normalized = normalizeText(country);
  if (normalized === "turkey" || normalized === "tr") return "TR";
  if (normalized === "united states" || normalized === "usa" || normalized === "us") return "USA";
  return "UK";
}

function uniqueEmployees(rows: BaseEmployeeSeedRow[]): BaseEmployeeSeedRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row.employeeId || seen.has(row.employeeId)) return false;
    seen.add(row.employeeId);
    return true;
  });
}

function fallbackSyntheticUser(index: number, rng: SeedPrng): User {
  const first = ["Astra", "Nexa", "Orin", "Vela", "Kyro", "Luma", "Zori", "Kano", "Mira", "Taro", "Rivo", "Sera"];
  const second = ["Flux", "Nova", "Axis", "Plex", "Drift", "Pulse", "Grid", "Field", "Beacon", "Orbit", "Wave", "Node"];
  return {
    id: `u-fallback-${index + 1}`,
    name: `${first[index % first.length]} ${second[(index * 3 + rng.int(0, second.length - 1)) % second.length]}`,
    role: ROLE_SEQUENCE[index] ?? "Sales",
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    defaultOurEntity: index % 5 === 0 ? "TR" : index % 4 === 0 ? "USA" : "UK",
  };
}

export function seedUsers(rng: SeedPrng, count: number): User[] {
  const sortedEmployees = uniqueEmployees(BASE_EMPLOYEE_ROWS.slice()).sort((left, right) => left.employeeId.localeCompare(right.employeeId));
  const salesEmployees = sortedEmployees.filter(isSalesOrBdEmployee);
  const otherEmployees = sortedEmployees.filter((row) => !isSalesOrBdEmployee(row));
  const prioritized = [...salesEmployees, ...otherEmployees];

  const users: User[] = [];
  for (let idx = 0; idx < count && idx < prioritized.length; idx += 1) {
    const employee = prioritized[idx];
    const role = ROLE_SEQUENCE[idx] ?? "Sales";
    users.push({
      id: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      role,
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
      defaultOurEntity: defaultEntityFromCountry(employee.country ?? ""),
    });
  }

  while (users.length < count) {
    users.push(fallbackSyntheticUser(users.length, rng));
  }

  return users;
}
