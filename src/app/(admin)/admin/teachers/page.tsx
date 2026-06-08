"use client";
import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/reusable/FormDialog";
import { ConfirmDialog } from "@/components/reusable/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { useTeachers } from "@/hooks/useTeachers";
import { useDepartments } from "@/hooks/useDepartments";
import { Teacher, Department } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";
type TF = {
    firstName: string; lastName: string; email: string; phone: string; dateOfBirth: string; gender: string;
    qualification: string; specialization: string; experience: string; joiningDate: string; salary: string; status: string;
    street: string; city: string; state: string; zipCode: string; country: string;
    emergencyName: string; emergencyRelationship: string; emergencyPhone: string;
    departmentId: string;
};
const blank: TF = {
    firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", gender: "male",
    qualification: "", specialization: "", experience: "", joiningDate: "", salary: "", status: "active",
    street: "", city: "", state: "", zipCode: "", country: "",
    emergencyName: "", emergencyRelationship: "", emergencyPhone: "",
    departmentId: ""
};

export default function TeachersPage() {
    const { t } = useTranslation();
    const { teachers, loading, pagination, createTeacher, updateTeacher, deleteTeacher } = useTeachers();
    const { departments } = useDepartments();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Teacher | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Teacher | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    const basicFields = [
        { key: "firstName" as keyof TF, label: t("teachers.firstName"), type: "text", required: true },
        { key: "lastName" as keyof TF, label: t("teachers.lastName"), type: "text", required: true },
        { key: "email" as keyof TF, label: t("teachers.email"), type: "email", required: true },
        { key: "phone" as keyof TF, label: t("teachers.phone"), type: "text", required: true },
        { key: "dateOfBirth" as keyof TF, label: t("teachers.dateOfBirth"), type: "date", required: true },
    ];

    const teacherFields = [
        { key: "qualification" as keyof TF, label: t("teachers.qualification"), type: "text", required: true },
        { key: "specialization" as keyof TF, label: t("teachers.specializationLabel"), type: "text", required: false, placeholder: t("teachers.specializationPlaceholder") },
        { key: "experience" as keyof TF, label: t("teachers.experienceYears"), type: "number", required: true },
        { key: "joiningDate" as keyof TF, label: t("teachers.joiningDate"), type: "date", required: false },
        { key: "salary" as keyof TF, label: t("teachers.salary"), type: "number", required: true },
    ];

    const addressFields = [
        { key: "street" as keyof TF, label: t("teachers.street"), required: true },
        { key: "city" as keyof TF, label: t("teachers.city"), required: true },
        { key: "state" as keyof TF, label: t("teachers.state"), required: true },
        { key: "zipCode" as keyof TF, label: t("teachers.zipCode"), required: true },
        { key: "country" as keyof TF, label: t("teachers.country"), required: true },
    ];

    const emergencyFields = [
        { key: "emergencyName" as keyof TF, label: t("teachers.name"), required: true },
        { key: "emergencyRelationship" as keyof TF, label: t("teachers.relationship"), required: true },
        { key: "emergencyPhone" as keyof TF, label: t("teachers.phone"), required: true },
    ];

    const genderOptions = [
        { value: "male", label: t("teachers.male") },
        { value: "female", label: t("teachers.female") },
        { value: "other", label: t("teachers.other") },
    ];

    const statusOptions = [
        { value: "active", label: t("common.fields.active") },
        { value: "inactive", label: t("common.fields.inactive") },
        { value: "on-leave", label: t("teachers.onLeave") },
    ];

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(t: Teacher) {
        setEditing(t);
        setForm({
            firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone,
            dateOfBirth: t.dateOfBirth?.slice(0, 10) ?? "", gender: t.gender,
            qualification: t.qualification, specialization: (t.specialization ?? []).join(", "),
            experience: String(t.experience ?? ""), joiningDate: t.joiningDate?.slice(0, 10) ?? "",
            salary: String(t.salary ?? ""), status: t.status,
            street: t.address?.street ?? "", city: t.address?.city ?? "", state: t.address?.state ?? "",
            zipCode: t.address?.zipCode ?? "", country: t.address?.country ?? "",
            emergencyName: t.emergencyContact?.name ?? "", emergencyRelationship: t.emergencyContact?.relationship ?? "",
            emergencyPhone: t.emergencyContact?.phone ?? "",
            departmentId: typeof t.departmentId === 'string' ? t.departmentId : (t.departmentId as any)?._id ?? ""
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload: any = {
                firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone,
                dateOfBirth: form.dateOfBirth, gender: form.gender, qualification: form.qualification,
                specialization: form.specialization.split(",").map(s => s.trim()).filter(Boolean),
                experience: Number(form.experience), joiningDate: form.joiningDate, salary: Number(form.salary), status: form.status,
                address: { street: form.street, city: form.city, state: form.state, zipCode: form.zipCode, country: form.country },
                emergencyContact: { name: form.emergencyName, relationship: form.emergencyRelationship, phone: form.emergencyPhone }
            };
            if (form.departmentId) payload.departmentId = form.departmentId;
            if (editing) { await updateTeacher(editing._id, payload); toast.success(t("teachers.teacherUpdated")); }
            else { await createTeacher(payload); toast.success(t("teachers.teacherAdded")); }
            setOpen(false);
        }         catch { toast.error(t("teachers.failedToSave")); } finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteTeacher(confirm._id); toast.success(t("teachers.teacherDeleted")); setConfirm(null); }
        catch { toast.error(t("teachers.failedToDelete")); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Teacher, unknown>[] = [
        {
            id: "teacherId", accessorKey: "teacherId", header: t("teachers.teacherId"),
            cell: ({ getValue }) => <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{String(getValue() ?? "—")}</span>
        },
        {
            id: "name", header: t("teachers.name"), accessorFn: r => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—",
            cell: ({ row: { original: r } }) => {
                const fullName = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
                const initials = `${r.firstName?.[0] ?? ""}${r.lastName?.[0] ?? ""}`.toUpperCase() || "?";
                return (<div className="flex items-center gap-2"><div><p className="font-medium text-sm">{fullName || "—"}</p><p className="text-xs text-[--muted-foreground]">{r.email}</p></div></div>);
            }
        },
        { id: "phone", accessorKey: "phone", header: t("teachers.phone") },
        { id: "qualification", accessorKey: "qualification", header: t("teachers.qualification") },
        { id: "specialization", header: t("teachers.specialization"), accessorFn: r => (r.specialization ?? []).join(", ") || "—" },
        { id: "experience", header: t("teachers.experience"), accessorFn: r => `${r.experience ?? 0} ${t("teachers.yrs")}` },
        { id: "joiningDate", header: t("teachers.joined"), accessorFn: r => formatDate(r.joiningDate) },
        { id: "salary", header: t("teachers.salary"), accessorFn: r => `৳${(r.salary ?? 0).toLocaleString()}` },
        { id: "status", header: t("teachers.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{String(getValue())}</Badge> },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title={t("common.pages.teachers")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("teachers.allTeachers")}</h2><p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} {t("teachers.total")}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("teachers.addTeacher")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={teachers} columns={columns} title={t("common.pages.teachers")} exportFilename="teachers" />}
            </main>
            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("teachers.editTeacher") : t("teachers.addTeacher")}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {basicFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && "*"}</Label>
                                <Input
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={e => f(field.key, e.target.value)}
                                    required={field.required}
                                />
                            </div>
                        ))}
                        <div>
                            <Label>{t("teachers.gender")}*</Label>
                            <FormCombobox
                                items={genderOptions}
                                value={form.gender}
                                onValueChange={v => f("gender", v ?? "")}
                                placeholder={t("teachers.selectGender")}
                                required
                                getItemValue={opt => opt.value}
                                renderItem={opt => opt.label}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        {teacherFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && "*"}</Label>
                                <Input
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={e => f(field.key, e.target.value)}
                                    required={field.required}
                                    placeholder={field.placeholder}
                                />
                            </div>
                        ))}
                        <div>
                            <Label>{t("teachers.status")}</Label>
                            <FormCombobox
                                items={statusOptions}
                                value={form.status}
                                onValueChange={v => f("status", v ?? "")}
                                placeholder={t("teachers.selectStatus")}
                                getItemValue={opt => opt.value}
                                renderItem={opt => opt.label}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        <div>
                            <Label>{t("teachers.department")}</Label>
                            <FormCombobox
                                items={departments}
                                value={form.departmentId}
                                onValueChange={v => f("departmentId", v ?? "")}
                                placeholder={t("teachers.selectDepartment")}
                                getItemValue={dept => dept._id}
                                renderItem={dept => dept.name}
                                getItemLabel={dept => dept.name}
                            />
                        </div>
                        <div className="col-span-2"><p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mt-2">{t("teachers.address")}</p></div>
                        {addressFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && "*"}</Label>
                                <Input
                                    value={form[field.key]}
                                    onChange={e => f(field.key, e.target.value)}
                                    required={field.required}
                                />
                            </div>
                        ))}
                        <div className="col-span-2"><p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mt-2">{t("teachers.emergencyContact")}</p></div>
                        {emergencyFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && "*"}</Label>
                                <Input
                                    value={form[field.key]}
                                    onChange={e => f(field.key, e.target.value)}
                                    required={field.required}
                                />
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
                message={confirm ? t("teachers.deleteConfirmMessage", { firstName: confirm.firstName, lastName: confirm.lastName }) : ""} />
        </>
    );
}
