"use client";
import { useState, useEffect } from "react";
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
import { useStudents } from "@/hooks/useStudents";
import { useParents } from "@/hooks/useParents";
import { useClassRooms } from "@/hooks/useClassRooms";
import { Student } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

type TF = {
    firstName: string; lastName: string; email: string; phone: string; gender: string; dateOfBirth: string; status: string;
    street: string; city: string; state: string; zipCode: string; country: string;
    emergencyName: string; emergencyRelationship: string; emergencyPhone: string;
    parentId: string; classRoomId: string;
};
const blank: TF = {
    firstName: "", lastName: "", email: "", phone: "", gender: "male", dateOfBirth: "", status: "active",
    street: "", city: "", state: "", zipCode: "", country: "",
    emergencyName: "", emergencyRelationship: "", emergencyPhone: "",
    parentId: "", classRoomId: ""
};

export default function StudentsPage() {
    const { t } = useTranslation();
    const { students, loading, pagination, createStudent, updateStudent, deleteStudent } = useStudents();
    const { parents } = useParents();
    const { classRooms } = useClassRooms();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Student | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Student | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    const basicFields = [
        { key: "firstName" as keyof TF, label: t("students.firstName"), type: "text", required: true },
        { key: "lastName" as keyof TF, label: t("students.lastName"), type: "text", required: true },
        { key: "email" as keyof TF, label: t("students.email"), type: "email", required: true },
        { key: "phone" as keyof TF, label: t("students.phone"), type: "text", required: true },
        { key: "dateOfBirth" as keyof TF, label: t("students.dateOfBirth"), type: "date", required: true },
    ];

    const addressFields = [
        { key: "street" as keyof TF, label: t("students.street"), required: true },
        { key: "city" as keyof TF, label: t("students.city"), required: true },
        { key: "state" as keyof TF, label: t("students.state"), required: true },
        { key: "zipCode" as keyof TF, label: t("students.zipCode"), required: true },
        { key: "country" as keyof TF, label: t("students.country"), required: true },
    ];

    const emergencyFields = [
        { key: "emergencyName" as keyof TF, label: t("common.fields.name"), required: true },
        { key: "emergencyRelationship" as keyof TF, label: t("students.relationship"), required: true },
        { key: "emergencyPhone" as keyof TF, label: t("students.phone"), required: true },
    ];

    const genderOptions = [
        { value: "male", label: t("students.male") },
        { value: "female", label: t("students.female") },
        { value: "other", label: t("students.other") },
    ];

    const statusOptions = [
        { value: "active", label: t("common.fields.active") },
        { value: "inactive", label: t("common.fields.inactive") },
        { value: "graduated", label: t("students.graduated") },
        { value: "suspended", label: t("students.suspended") },
    ];

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(s: Student) {
        setEditing(s);
        setForm({
            firstName: s.firstName, lastName: s.lastName, email: s.email, phone: s.phone,
            gender: s.gender, dateOfBirth: s.dateOfBirth?.slice(0, 10) ?? "", status: s.status,
            street: s.address?.street ?? "", city: s.address?.city ?? "", state: s.address?.state ?? "",
            zipCode: s.address?.zipCode ?? "", country: s.address?.country ?? "",
            emergencyName: s.emergencyContact?.name ?? "", emergencyRelationship: s.emergencyContact?.relationship ?? "",
            emergencyPhone: s.emergencyContact?.phone ?? "",
            parentId: typeof s.parentId === 'string' ? s.parentId : (s.parentId as any)?._id ?? "",
            classRoomId: typeof s.classRoomId === 'string' ? s.classRoomId : (s.classRoomId as any)?._id ?? ""
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload: any = {
                firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone,
                gender: form.gender, dateOfBirth: form.dateOfBirth, status: form.status, enrollmentDate: editing?.enrollmentDate ?? new Date().toISOString(),
                address: { street: form.street, city: form.city, state: form.state, zipCode: form.zipCode, country: form.country },
                emergencyContact: { name: form.emergencyName, relationship: form.emergencyRelationship, phone: form.emergencyPhone }
            };
            if (form.parentId) payload.parentId = form.parentId;
            if (form.classRoomId) payload.classRoomId = form.classRoomId;
            if (editing) { await updateStudent(editing._id, payload); toast.success(t("students.studentUpdated")); }
            else { await createStudent(payload); toast.success(t("students.studentAdded")); }
            setOpen(false);
        } catch (err: any) {
            const message =
                err?.response?.data?.message ?? err?.message ?? t("students.somethingWentWrong");
            toast.error(message);
        }
        finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteStudent(confirm._id); toast.success(t("students.studentDeleted")); setConfirm(null); }
        catch { toast.error(t("students.failedToDelete")); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Student, unknown>[] = [
        {
            id: "studentId", accessorKey: "studentId", header: t("students.studentId"),
            cell: ({ getValue }) => <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{String(getValue() ?? "—")}</span>
        },
        {
            id: "name", header: t("common.fields.student"), accessorFn: r => `${r.firstName} ${r.lastName}`,
            cell: ({ row: { original: r } }) => (<div className="flex items-center gap-2"><div><p className="font-medium text-sm">{r.firstName} {r.lastName}</p><p className="text-xs text-[--muted-foreground]">{r.email}</p></div></div>)
        },
        { id: "email", accessorKey: "email", header: t("students.email") },
        { id: "phone", accessorKey: "phone", header: t("students.phone") },
        { id: "gender", accessorKey: "gender", header: t("students.gender"), cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span> },
        { id: "dob", header: t("students.dob"), accessorFn: r => formatDate(r.dateOfBirth) },
        {
            id: "address", header: t("students.address"),
            accessorFn: r => r.address ? `${r.address.street}, ${r.address.city}, ${r.address.state} ${r.address.zipCode}` : "—",
            cell: ({ row: { original: r } }) => r.address ? (
                <div className="text-xs">
                    <p>{r.address.street}</p>
                    <p className="text-[--muted-foreground]">{r.address.city}, {r.address.state} {r.address.zipCode}</p>
                    <p className="text-[--muted-foreground]">{r.address.country}</p>
                </div>
            ) : "—"
        },
        {
            id: "emergency", header: t("students.emergencyContact"),
            accessorFn: r => r.emergencyContact ? `${r.emergencyContact.name} (${r.emergencyContact.relationship})` : "—",
            cell: ({ row: { original: r } }) => r.emergencyContact ? (
                <div className="text-xs">
                    <p>{r.emergencyContact.name}</p>
                    <p className="text-[--muted-foreground]">{r.emergencyContact.relationship}</p>
                    <p className="text-[--muted-foreground]">{r.emergencyContact.phone}</p>
                </div>
            ) : "—"
        },
        { id: "class", header: t("students.class"), accessorFn: r => (r.classRoomId as { name?: string })?.name ?? "—" },
        {
            id: "parent", header: t("students.parent"), accessorFn: r => {
                const parent = r.parentId as { firstName?: string; lastName?: string } | undefined;
                return parent ? `${parent.firstName} ${parent.lastName}` : "—";
            }
        },
        { id: "enrollmentDate", header: t("students.enrolled"), accessorFn: r => formatDate(r.enrollmentDate) },
        { id: "status", header: t("students.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{String(getValue())}</Badge> },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title={t("common.pages.students")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("students.allStudents")}</h2><p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} {t("common.fields.total")}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("students.addStudent")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={students} columns={columns} title={t("common.pages.students")} exportFilename="students" />}
            </main>
            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("students.editStudent") : t("students.addStudent")}>
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
                            <Label>{t("students.gender")}*</Label>
                            <FormCombobox
                                items={genderOptions}
                                value={form.gender}
                                onValueChange={v => f("gender", v ?? "")}
                                placeholder={t("students.selectGender")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mt-2">{t("students.address")}</p>
                        </div>
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
                        <div>
                            <Label>{t("students.status")}</Label>
                            <FormCombobox
                                items={statusOptions}
                                value={form.status}
                                onValueChange={v => f("status", v ?? "")}
                                placeholder={t("students.selectStatus")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mt-2">{t("students.assignment")}</p>
                        </div>
                        <div>
                            <Label>{t("students.parent")}</Label>
                            <FormCombobox
                                items={parents}
                                value={form.parentId}
                                onValueChange={v => f("parentId", v ?? "")}
                                placeholder={t("students.selectParent")}
                                getItemValue={p => p._id}
                                getItemLabel={p => `${p.firstName} ${p.lastName}`}
                                renderItem={p => (
                                    <>
                                        {p.parentId ? <span className="font-mono text-xs text-blue-600 mr-2">{p.parentId}</span> : null}
                                        {p.firstName} {p.lastName}
                                    </>
                                )}
                            />
                        </div>
                        <div>
                            <Label>{t("students.classroom")}</Label>
                            <FormCombobox
                                items={classRooms}
                                value={form.classRoomId}
                                onValueChange={v => f("classRoomId", v ?? "")}
                                placeholder={t("students.selectClassroom")}
                                getItemValue={c => c._id}
                                getItemLabel={c => `${c.name} - ${c.roomNumber}`}
                                renderItem={c => `${c.name} - ${c.roomNumber}`}
                            />
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mt-2">{t("students.emergencyContact")}</p>
                        </div>
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
                message={t("students.deleteConfirm", { firstName: confirm?.firstName ?? "", lastName: confirm?.lastName ?? "" })} />
        </>
    );
}

