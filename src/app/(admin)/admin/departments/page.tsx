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
import { useDepartments } from "@/hooks/useDepartments";
import { useTeachers } from "@/hooks/useTeachers";
import { Department, Teacher } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

type TF = { name: string; code: string; description: string; headOfDepartment: string; status: string };
const blank: TF = { name: "", code: "", description: "", headOfDepartment: "", status: "active" };

const basicFields: { key: keyof TF; label: string; type: string; required: boolean }[] = [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "code", label: "Code", type: "text", required: true },
];

const statusOptions = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }];

export default function DepartmentsPage() {
    const { t } = useTranslation();
    const { departments, loading, createDepartment, updateDepartment, deleteDepartment } = useDepartments();
    const { teachers } = useTeachers();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Department | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Department | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(d: Department) {
        setEditing(d);
        setForm({
            name: d.name, code: d.code, description: d.description ?? "",
            headOfDepartment: typeof d.headOfDepartment === 'string' ? d.headOfDepartment : (d.headOfDepartment as any)?._id ?? "",
            status: d.status
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload: any = { ...form };
            if (!payload.headOfDepartment) delete payload.headOfDepartment;
            if (editing) { await updateDepartment(editing._id, payload); toast.success("Department updated"); }
            else { await createDepartment(payload); toast.success("Department added"); }
            setOpen(false);
        } catch { toast.error("Failed to save"); } finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteDepartment(confirm._id); toast.success("Department deleted"); setConfirm(null); }
        catch { toast.error("Failed to delete"); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Department, unknown>[] = [
        { id: "name", accessorKey: "name", header: t("common.fields.name") },
        { id: "code", accessorKey: "code", header: t("courses.code") },
        { id: "head", header: t("teachers.designation"), accessorFn: r => { const h = r.headOfDepartment; return (typeof h === "object" && h !== null && 'firstName' in h) ? `${(h as any).firstName} ${(h as any).lastName}` : "—"; } },
        { id: "description", accessorKey: "description", header: t("common.fields.description") },
        { id: "status", header: t("common.fields.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{t(`common.fields.${getValue()}`, String(getValue()))}</Badge> },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title="Departments" />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("departments.allDepartments")}</h2><p className="text-sm text-[--muted-foreground]">{departments.length} {t("common.fields.total")}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("departments.addDepartment")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={departments} columns={columns} title={t("common.pages.departments")} exportFilename="departments" />}
            </main>
            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("departments.editDepartment") : t("departments.addDepartment")}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        {basicFields.map(field => (
                            <div key={field.key}>
                                <Label>{t(`common.fields.${field.key}`, field.label)}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} />
                            </div>
                        ))}
                        <div className="col-span-2"><Label>{t("common.fields.description")}</Label><Input value={form.description} onChange={e => f("description", e.target.value)} /></div>
                        <div>
                            <Label>{t("teachers.designation")}</Label>
                            <FormCombobox
                                items={teachers}
                                value={form.headOfDepartment}
                                onValueChange={v => f("headOfDepartment", v)}
                                placeholder={t("common.operations.select")}
                                renderItem={teacher => teacher.teacherId + "-" + teacher.firstName + " " + teacher.lastName}
                                getItemValue={teacher => teacher._id}
                                getItemLabel={teacher => teacher.teacherId + "-" + teacher.firstName + " " + teacher.lastName}
                            />
                        </div>
                        <div>
                            <Label>{t("common.fields.status")}</Label>
                            <FormCombobox
                                items={statusOptions.map(opt => ({ value: opt.value, label: t(`common.fields.${opt.value}`, opt.label) }))}
                                value={form.status}
                                onValueChange={v => f("status", v)}
                                placeholder={t("common.operations.select")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>{t("common.operations.cancel")}</Button>
                        <Button size="sm" type="submit" disabled={busy}>{busy ? t("common.operations.saving") : editing ? t("common.operations.update") : t("common.operations.create")}</Button>
                    </div>
                </form>
            </FormDialog>
            <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} loading={busy}
                message={t("common.operations.deleteConfirm")} />
        </>
    );
}
