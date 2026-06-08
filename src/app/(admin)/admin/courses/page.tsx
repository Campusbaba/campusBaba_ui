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
import { useCourses } from "@/hooks/useCourses";
import { useDepartments } from "@/hooks/useDepartments";
import { Course, Department } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

type TF = { name: string; code: string; description: string; departmentId: string; credits: string; duration: string; status: string };
const blank: TF = { name: "", code: "", description: "", departmentId: "", credits: "", duration: "", status: "active" };

const basicFields: { key: keyof TF; label: string; type: string; required: boolean }[] = [
    { key: "name", label: "Course Name", type: "text", required: true },
    { key: "code", label: "Code", type: "text", required: true },
];

const detailFields: { key: keyof TF; label: string; type: string; required: boolean }[] = [
    { key: "credits", label: "Credits", type: "number", required: true },
    { key: "duration", label: "Duration (months)", type: "number", required: true },
];

const statusOptions = [{ value: "active", label: "active" }, { value: "inactive", label: "inactive" }];

export default function CoursesPage() {
    const { t } = useTranslation();
    const { courses, loading, pagination, createCourse, updateCourse, deleteCourse } = useCourses();
    const { departments } = useDepartments();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Course | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Course | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(c: Course) {
        setEditing(c);
        setForm({
            name: c.name, code: c.code, description: c.description ?? "",
            departmentId: typeof c.departmentId === 'string' ? c.departmentId : (c.departmentId as any)?._id ?? "",
            credits: String(c.credits ?? ""), duration: String(c.duration ?? ""), status: c.status
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload: any = { ...form, credits: Number(form.credits), duration: Number(form.duration) };
            if (editing) { await updateCourse(editing._id, payload); toast.success(t("courses.courseName") + " " + t("common.operations.update").toLowerCase()); }
            else { await createCourse(payload); toast.success(t("courses.courseName") + " " + t("common.operations.add").toLowerCase()); }
            setOpen(false);
        } catch { toast.error(t("common.operations.save") + " " + t("common.fields.id")); } finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteCourse(confirm._id); toast.success(t("courses.courseName") + " " + t("common.operations.delete").toLowerCase()); setConfirm(null); }
        catch { toast.error(t("common.operations.delete") + " " + t("common.fields.id")); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Course, unknown>[] = [
        { id: "name", accessorKey: "name", header: t("courses.courseName") },
        { id: "code", accessorKey: "code", header: t("courses.code") },
        { id: "department", header: t("courses.department"), accessorFn: r => (r.departmentId as { name?: string })?.name ?? String(r.departmentId) },
        { id: "credits", accessorKey: "credits", header: t("courses.credits") },
        { id: "duration", accessorKey: "duration", header: t("courses.duration") },
        { id: "status", header: t("courses.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{String(getValue())}</Badge> },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title={t("common.pages.courses")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("courses.allCourses")}</h2><p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} {t("common.fields.total")}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("courses.addCourse")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={courses} columns={columns} title={t("common.pages.courses")} exportFilename="courses" />}
            </main>
            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("courses.editCourse") : t("courses.addCourse")}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        {basicFields.map(field => (
                            <div key={field.key}>
                                <Label>{t(`courses.${field.key}`)}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} />
                            </div>
                        ))}
                        <div className="col-span-2"><Label>{t("courses.description")}</Label><Input value={form.description} onChange={e => f("description", e.target.value)} /></div>
                        <div>
                            <Label>{t("courses.department")} *</Label>
                            <FormCombobox
                                items={departments}
                                value={form.departmentId}
                                onValueChange={v => f("departmentId", v)}
                                placeholder={t("common.operations.select")}
                                renderItem={dept => dept.name}
                                getItemValue={dept => dept._id}
                                getItemLabel={dept => dept.name}
                            />
                        </div>
                        {detailFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.key === "duration" ? t("courses.duration") : t(`courses.${field.key}`)}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} />
                            </div>
                        ))}
                        <div>
                            <Label>{t("courses.status")}</Label>
                            <FormCombobox
                                items={statusOptions.map(o => ({ ...o, label: t(`common.fields.${o.value}`) }))}
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
                message={`${t("common.operations.deleteConfirm")} "${confirm?.name}"?`} />
        </>
    );
}
