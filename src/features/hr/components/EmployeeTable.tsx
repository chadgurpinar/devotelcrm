import { Badge, Button } from "../../../components/ui";
import { HrEmployee } from "../../../store/types";
import { EmployeeAvatar } from "./HrEmployeeProfileModal";

function employeeName(row: Pick<HrEmployee, "firstName" | "lastName">): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

function fallbackWorkLocation(countryOfEmployment: string | undefined): string {
  const normalized = (countryOfEmployment ?? "").trim().toLowerCase();
  if (normalized.includes("turkey") || normalized === "tr") return "Istanbul HQ";
  if (normalized.includes("united kingdom") || normalized === "uk" || normalized === "gb") return "London Office";
  if (normalized.includes("united states") || normalized.includes("usa") || normalized === "us") return "New York Office";
  if (normalized.includes("spain")) return "Barcelona Hub";
  if (normalized.includes("germany")) return "Berlin Office";
  return "Remote";
}

function resolveWorkLocation(workLocation: string | undefined, countryOfEmployment: string | undefined): string {
  const value = workLocation?.trim();
  return value ? value : fallbackWorkLocation(countryOfEmployment);
}

interface EmployeeTableProps {
  rows: HrEmployee[];
  employeeById: Map<string, HrEmployee>;
  departmentById: Map<string, string>;
  onProfile: (employeeId: string) => void;
  onEdit: (employee: HrEmployee) => void;
  onToggleActive: (employee: HrEmployee) => void;
}

export function EmployeeTable(props: EmployeeTableProps) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Title / Job title</th>
            <th>Manager</th>
            <th>Employment type</th>
            <th>Work location</th>
            <th>Legal entity</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {props.rows.map((employee) => {
            const manager = employee.managerId ? props.employeeById.get(employee.managerId) : undefined;
            return (
              <tr key={employee.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <EmployeeAvatar employee={employee} size="sm" />
                    <div>
                      <p className="font-semibold text-slate-700">{employee.displayName || employeeName(employee)}</p>
                      <p className="text-[11px] text-slate-500">{employee.email}</p>
                    </div>
                  </div>
                </td>
                <td>{props.departmentById.get(employee.departmentId) ?? "-"}</td>
                <td>{employee.jobTitle ?? employee.position ?? "-"}</td>
                <td className="text-xs">{manager ? manager.displayName || employeeName(manager) : "-"}</td>
                <td>
                  <Badge className="bg-slate-100 text-slate-700">{employee.employmentType}</Badge>
                </td>
                <td>{resolveWorkLocation(employee.workLocation, employee.countryOfEmployment)}</td>
                <td>
                  <Badge className="bg-slate-100 text-slate-700">{employee.legalEntityId}</Badge>
                </td>
                <td>
                  <Badge className={employee.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                    {employee.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="secondary" onClick={() => props.onProfile(employee.id)}>
                      Profile
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => props.onEdit(employee)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => props.onToggleActive(employee)}>
                      {employee.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

