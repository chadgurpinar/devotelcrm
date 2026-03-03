import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";

type DepartmentForm = {
  name: string;
  parentDepartmentId: string;
};

function emptyForm(): DepartmentForm {
  return {
    name: "",
    parentDepartmentId: "",
  };
}

export function HrOrganizationPage() {
  const state = useAppStore();
  const [search, setSearch] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [form, setForm] = useState<DepartmentForm>(emptyForm);
  const [isModalOpen, setModalOpen] = useState(false);

  const departmentById = useMemo(() => {
    const map = new Map<string, string>();
    state.hrDepartments.forEach((department) => map.set(department.id, department.name));
    return map;
  }, [state.hrDepartments]);

  const headcountByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    state.hrEmployees
      .filter((employee) => employee.active)
      .forEach((employee) => {
        map.set(employee.departmentId, (map.get(employee.departmentId) ?? 0) + 1);
      });
    return map;
  }, [state.hrEmployees]);

  const rows = useMemo(() => {
    let dataset = state.hrDepartments.slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      dataset = dataset.filter((department) => {
        const parentName = department.parentDepartmentId ? departmentById.get(department.parentDepartmentId) ?? "" : "";
        return department.name.toLowerCase().includes(q) || parentName.toLowerCase().includes(q);
      });
    }
    return dataset.sort((left, right) => left.name.localeCompare(right.name));
  }, [departmentById, search, state.hrDepartments]);

  const reportingManagers = useMemo(() => {
    return state.hrEmployees
      .filter((employee) => employee.active)
      .map((employee) => ({
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        directCount: state.hrEmployees.filter((entry) => entry.managerId === employee.id && entry.active).length,
        departmentName: departmentById.get(employee.departmentId) ?? "-",
      }))
      .filter((entry) => entry.directCount > 0)
      .sort((left, right) => right.directCount - left.directCount)
      .slice(0, 8);
  }, [departmentById, state.hrEmployees]);

  function openCreateModal() {
    setEditingDepartmentId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEditModal(departmentId: string) {
    const department = state.hrDepartments.find((row) => row.id === departmentId);
    if (!department) return;
    setEditingDepartmentId(department.id);
    setForm({
      name: department.name,
      parentDepartmentId: department.parentDepartmentId ?? "",
    });
    setModalOpen(true);
  }

  function saveDepartment() {
    if (!form.name.trim()) return;
    if (editingDepartmentId) {
      const existing = state.hrDepartments.find((row) => row.id === editingDepartmentId);
      if (!existing) return;
      state.updateHrDepartment({
        ...existing,
        name: form.name.trim(),
        parentDepartmentId: form.parentDepartmentId || undefined,
      });
    } else {
      state.createHrDepartment({
        name: form.name.trim(),
        parentDepartmentId: form.parentDepartmentId || undefined,
      });
    }
    setModalOpen(false);
  }

  return (
    <div className="space-y-4">
      <Card
        title="Organization"
        actions={
          <Button size="sm" onClick={openCreateModal}>
            Add department
          </Button>
        }
      >
        <div className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Department or parent department..." />
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Departments</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrDepartments.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Active headcount</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrEmployees.filter((employee) => employee.active).length}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Parent department</th>
                <th>Headcount</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((department) => (
                <tr key={department.id}>
                  <td>
                    <p className="font-semibold text-slate-700">{department.name}</p>
                    <p className="text-[11px] text-slate-500">{department.id}</p>
                  </td>
                  <td>{department.parentDepartmentId ? departmentById.get(department.parentDepartmentId) ?? "-" : "-"}</td>
                  <td>
                    <Badge className="bg-slate-100 text-slate-700">{headcountByDepartment.get(department.id) ?? 0}</Badge>
                  </td>
                  <td>{new Date(department.updatedAt).toLocaleString()}</td>
                  <td>
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => openEditModal(department.id)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => state.deleteHrDepartment(department.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Reporting Chain Highlights">
        <div className="grid gap-2 md:grid-cols-4">
          {reportingManagers.length === 0 ? (
            <p className="text-xs text-slate-500">No reporting chains available yet.</p>
          ) : (
            reportingManagers.map((entry) => (
              <div key={entry.id} className="rounded-md border border-slate-200 p-2">
                <p className="text-xs font-semibold text-slate-800">{entry.name}</p>
                <p className="text-[11px] text-slate-500">{entry.departmentName}</p>
                <p className="mt-1 text-[11px] text-slate-600">Direct reports: {entry.directCount}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">{editingDepartmentId ? "Edit department" : "Create department"}</h3>
              <Button size="sm" variant="secondary" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <FieldLabel>Name</FieldLabel>
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Parent department</FieldLabel>
                <select
                  value={form.parentDepartmentId}
                  onChange={(event) => setForm((prev) => ({ ...prev, parentDepartmentId: event.target.value }))}
                >
                  <option value="">None</option>
                  {state.hrDepartments
                    .filter((department) => department.id !== editingDepartmentId)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveDepartment} disabled={!form.name.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
