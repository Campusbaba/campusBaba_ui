"use client";
import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { FormDialog } from "@/components/reusable/FormDialog";
import { ConfirmDialog } from "@/components/reusable/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { useEmployees } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { Employee } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type TF = { employeeId: string, firstName: string; lastName: string; email: string; phone: string; dateOfBirth: string; gender: string; street: string; city: string; state: string; zipCode: string; country: string; position: string; department: string; joiningDate: string; salary: string; status: string; emergencyName: string; emergencyRelationship: string; emergencyPhone: string };
const blank: TF = { employeeId: "", firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", gender: "male", street: "", city: "", state: "", zipCode: "", country: "", position: "", department: "", joiningDate: "", salary: "", status: "active", emergencyName: "", emergencyRelationship: "", emergencyPhone: "" };

export default function EmployeesPage() {
    const { t } = useTranslation();
    const { employees, loading, pagination, createEmployee, updateEmployee, deleteEmployee } = useEmployees();
    const { departments } = useDepartments();

    const basicFields: { key: keyof TF; label: string; type: string; required: boolean; placeholder?: string; readOnly?: boolean }[] = [
        { key: "employeeId", label: t("employees.employeeId"), type: "text", required: false, placeholder: "EMP-001", readOnly: false },
        { key: "firstName", label: t("employees.firstName"), type: "text", required: true },
        { key: "lastName", label: t("employees.lastName"), type: "text", required: true },
        { key: "email", label: t("employees.email"), type: "email", required: true },
        { key: "phone", label: t("employees.phone"), type: "text", required: true },
        { key: "dateOfBirth", label: t("employees.dateOfBirth"), type: "date", required: true },
    ];

    const addressFields: { key: keyof TF; label: string; type: string; required: boolean }[] = [
        { key: "street", label: t("employees.street"), type: "text", required: true },
        { key: "city", label: t("employees.city"), type: "text", required: true },
        { key: "state", label: t("employees.state"), type: "text", required: true },
        { key: "zipCode", label: t("employees.zipCode"), type: "text", required: true },
        { key: "country", label: t("employees.country"), type: "text", required: true },
    ];

    const employmentFields: { key: keyof TF; label: string; type: string; required: boolean }[] = [
        { key: "joiningDate", label: t("employees.joiningDate"), type: "date", required: false },
        { key: "salary", label: t("employees.salary"), type: "number", required: true },
    ];

    const positionOptions = [
        { value: "admin", label: t("sidebar.roles.admin") },
        // { value: "teacher", label: "Teacher" },
        // { value: "staff", label: "Staff" },
        // { value: "accountant", label: "Accountant" },
        // { value: "librarian", label: "Librarian" },
        // { value: "security", label: "Security" },
        // { value: "janitor", label: "Janitor" },
    ];

    const emergencyFields: { key: keyof TF; label: string; type: string; required: boolean }[] = [
        { key: "emergencyName", label: t("common.fields.name"), type: "text", required: true },
        { key: "emergencyRelationship", label: t("employees.relationship"), type: "text", required: true },
        { key: "emergencyPhone", label: t("common.fields.phone"), type: "text", required: true },
    ];

    const genderOptions = [{ value: "male", label: t("employees.male") }, { value: "female", label: t("employees.female") }, { value: "other", label: t("employees.other") }];
    const statusOptions = [{ value: "active", label: t("common.fields.active") }, { value: "inactive", label: t("common.fields.inactive") }, { value: "on-leave", label: t("employees.onLeave") }];
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Employee | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Employee | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(emp: Employee) {
        setEditing(emp);
        const addr = emp.address as { street?: string; city?: string; state?: string; zipCode?: string; country?: string } | undefined;
        const ec = emp.emergencyContact as { name?: string; relationship?: string; phone?: string } | undefined;
        setForm({
            employeeId: emp.employeeId ?? "",
            firstName: emp.firstName, lastName: emp.lastName, email: emp.email, phone: emp.phone,
            dateOfBirth: emp.dateOfBirth?.slice(0, 10) ?? "", gender: emp.gender,
            street: addr?.street ?? "", city: addr?.city ?? "", state: addr?.state ?? "",
            zipCode: addr?.zipCode ?? "", country: addr?.country ?? "",
            position: emp.position, department: (emp.department as { _id?: string })?._id ?? String(emp.department),
            joiningDate: emp.joiningDate?.slice(0, 10) ?? "", salary: String(emp.salary ?? ""), status: emp.status,
            emergencyName: ec?.name ?? "", emergencyRelationship: ec?.relationship ?? "", emergencyPhone: ec?.phone ?? ""
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload = {
                employeeId: form.employeeId,
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                phone: form.phone,
                dateOfBirth: form.dateOfBirth,
                gender: form.gender as "male" | "female" | "other",
                address: { street: form.street, city: form.city, state: form.state, zipCode: form.zipCode, country: form.country },
                position: form.position, department: form.department, joiningDate: form.joiningDate,
                salary: Number(form.salary), status: form.status as "active" | "inactive" | "on-leave",
                emergencyContact: { name: form.emergencyName, relationship: form.emergencyRelationship, phone: form.emergencyPhone }
            };
            if (editing) { await updateEmployee(editing._id, payload); toast.success(t("employees.employeeUpdated")); }
            else { await createEmployee(payload); toast.success(t("employees.employeeAdded")); }
            setOpen(false);
        } catch { toast.error(t("employees.failedToSave")); } finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteEmployee(confirm._id); toast.success(t("employees.employeeDeleted")); setConfirm(null); }
        catch { toast.error(t("employees.failedToDelete")); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Employee, unknown>[] = [
        {
            id: "employeeId", accessorKey: "employeeId", header: t("employees.employeeId"),
            cell: ({ getValue }) => <span className="font-mono text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{String(getValue() ?? "—")}</span>
        },
        {
            id: "name", header: t("employees.name"), accessorFn: r => `${r.firstName} ${r.lastName}`,
            cell: ({ row: { original: r } }) => (<div className="flex items-center gap-2"><div><p className="font-medium text-sm">{r.firstName} {r.lastName}</p><p className="text-xs text-[--muted-foreground]">{r.email}</p></div></div>)
        },
        { id: "phone", accessorKey: "phone", header: t("employees.phone") },
        { id: "gender", accessorKey: "gender", header: t("employees.gender") },
        { id: "position", accessorKey: "position", header: t("employees.position") },
        { id: "address", accessorKey: "address", header: t("employees.address"), cell: ({ getValue }) => { const addr = getValue() as { street?: string; city?: string; state?: string; zipCode?: string; country?: string } | undefined; return <span>{[addr?.street, addr?.city, addr?.state, addr?.zipCode, addr?.country].filter(Boolean).join(", ") || "—"}</span> } },
        {
            id: "emergency", header: t("employees.emergencyContact"),
            accessorFn: r => r.emergencyContact ? `${r.emergencyContact.name} (${r.emergencyContact.relationship})` : "—",
            cell: ({ row: { original: r } }) => r.emergencyContact ? (
                <div className="text-xs">
                    <p>{r.emergencyContact.name}</p>
                    <p className="text-[--muted-foreground]">{r.emergencyContact.relationship}</p>
                    <p className="text-[--muted-foreground]">{r.emergencyContact.phone}</p>
                </div>
            ) : "—"
        },
        // { id: "department", header: "Department", accessorFn: r => (r.department as { name?: string })?.name ?? "—" },
        { id: "joiningDate", header: t("employees.joiningDate"), accessorFn: r => formatDate(r.joiningDate) },
        { id: "salary", header: t("employees.salary"), accessorFn: r => `৳${(r.salary ?? 0).toLocaleString()}` },
        { id: "status", header: t("employees.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{String(getValue())}</Badge> },
        { id: "createdAt", header: t("employees.created"), accessorFn: r => formatDate(r.createdAt) },
        { id: "updatedAt", header: t("employees.updated"), accessorFn: r => formatDate(r.updatedAt) },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title={t("common.pages.employees")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("employees.allEmployees")}</h2><p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} {t("common.fields.total")}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("employees.addEmployee")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={employees} columns={columns} title={t("common.pages.employees")} exportFilename="employees" />}
            </main>
            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("employees.editEmployee") : t("employees.addEmployee")}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        {basicFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} placeholder={field.placeholder} readOnly={field.readOnly} className={field.readOnly ? "bg-muted cursor-not-allowed" : ""} />
                            </div>
                        ))}
                        <div>
                            <Label>{t("employees.gender")} *</Label>
                            <FormCombobox
                                items={genderOptions}
                                value={form.gender}
                                onValueChange={v => f("gender", v)}
                                placeholder={t("common.operations.select")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                    </div>
                    <div className="col-span-2 pt-2"><Label className="font-semibold">{t("employees.address")}</Label></div>
                    <div className="grid grid-cols-2 gap-3">
                        {addressFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} />
                            </div>
                        ))}
                    </div>
                    <div className="col-span-2 pt-2"><Label className="font-semibold">{t("employees.employmentDetails")}</Label></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>{t("employees.positionRole")} *</Label>
                            <FormCombobox
                                items={positionOptions}
                                value={form.position}
                                onValueChange={v => f("position", v)}
                                placeholder={t("common.operations.select")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        <div>
                            <Label>{t("classrooms.department")} *</Label>
                            <FormCombobox
                                items={departments}
                                value={form.department}
                                onValueChange={v => f("department", v)}
                                placeholder={t("common.operations.select")}
                                renderItem={dept => dept.name}
                                getItemValue={dept => dept._id}
                                getItemLabel={dept => dept.name}
                            />
                        </div>
                        {employmentFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} />
                            </div>
                        ))}
                        <div>
                            <Label>{t("common.fields.status")} *</Label>
                            <FormCombobox
                                items={statusOptions}
                                value={form.status}
                                onValueChange={v => f("status", v)}
                                placeholder={t("common.operations.select")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}

                            />
                        </div>
                    </div>
                    <div className="col-span-2 pt-2"><Label className="font-semibold">{t("employees.emergencyContact")}</Label></div>
                    <div className="grid grid-cols-2 gap-3">
                        {emergencyFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>{t("common.operations.cancel")}</Button>
                        <Button size="sm" type="submit" disabled={busy}>{busy ? t("common.operations.saving") : editing ? t("common.operations.update") : t("common.operations.create")}</Button>
                    </div>
                </form>
            </FormDialog>
            <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} loading={busy}
                message={t("employees.deleteConfirm", { name: `${confirm?.firstName} ${confirm?.lastName}` })} />
        </>
    );
}
