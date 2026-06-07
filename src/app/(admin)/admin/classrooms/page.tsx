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
import { useClassRooms } from "@/hooks/useClassRooms";
import { useDepartments } from "@/hooks/useDepartments";
import { useCourses } from "@/hooks/useCourses";
import { ClassRoom, Department, Course } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

type TF = { classRoomId: string; name: string; roomNumber: string; departmentId: string; courseId: string; capacity: string; academicYear: string; semester: string; status: string };
const blank: TF = { classRoomId: "", name: "", roomNumber: "", departmentId: "", courseId: "", capacity: "", academicYear: "", semester: "", status: "active" };

const basicFields: { key: keyof TF; label: string; type: string; required: boolean; placeholder?: string }[] = [
    { key: "name", label: "Class Name", type: "text", required: true },
    { key: "roomNumber", label: "Room Number", type: "text", required: true },
];

const detailFields: { key: keyof TF; label: string; type: string; required: boolean; placeholder?: string }[] = [
    { key: "capacity", label: "Capacity", type: "number", required: true },
    { key: "academicYear", label: "Academic Year", type: "text", required: true, placeholder: "2024-2025" },
    { key: "semester", label: "Semester", type: "text", required: true, placeholder: "Spring" },
];

const statusOptions = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "completed", label: "Completed" }];

export default function ClassRoomsPage() {
    const { t } = useTranslation();
    const { classRooms, loading, pagination, createClassRoom, updateClassRoom, deleteClassRoom } = useClassRooms();
    const { departments } = useDepartments();
    const { courses } = useCourses();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ClassRoom | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<ClassRoom | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(c: ClassRoom) {
        setEditing(c);
        setForm({
            classRoomId: c.classRoomId ?? "", name: c.name, roomNumber: c.roomNumber,
            departmentId: typeof c.departmentId === 'string' ? c.departmentId : (c.departmentId as any)?._id ?? "",
            courseId: typeof c.courseId === 'string' ? c.courseId : (c.courseId as any)?._id ?? "",
            capacity: String(c.capacity), academicYear: c.academicYear, semester: c.semester, status: c.status
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload: any = { ...form, capacity: Number(form.capacity), currentEnrollment: 0 };
            if (editing) { await updateClassRoom(editing._id, payload); toast.success("Classroom updated"); }
            else { await createClassRoom(payload); toast.success("Classroom added"); }
            setOpen(false);
        } catch { toast.error("Failed to save"); } finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteClassRoom(confirm._id); toast.success("Classroom deleted"); setConfirm(null); }
        catch { toast.error("Failed to delete"); } finally { setBusy(false); }
    }

    const columns: ColumnDef<ClassRoom, unknown>[] = [
        { id: "classRoomId", accessorKey: "classRoomId", header: t("common.fields.id") },
        { id: "name", accessorKey: "name", header: t("classrooms.className") },
        { id: "roomNumber", accessorKey: "roomNumber", header: t("classrooms.roomNumber") },
        { id: "course", header: t("classrooms.course"), accessorFn: r => (r.courseId as { name?: string })?.name ?? "—" },
        { id: "department", header: t("classrooms.department"), accessorFn: r => (r.departmentId as { name?: string })?.name ?? "—" },
        { id: "capacity", accessorKey: "capacity", header: t("classrooms.capacity") },
        { id: "enrolled", accessorKey: "currentEnrollment", header: t("classrooms.enrolled") },
        { id: "academicYear", accessorKey: "academicYear", header: t("classrooms.academicYear") },
        { id: "semester", accessorKey: "semester", header: t("classrooms.semester") },
        { id: "status", header: t("classrooms.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{t(`common.fields.${getValue()}`, String(getValue()))}</Badge> },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title="Classrooms" />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("classrooms.allClassrooms")}</h2><p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} {t("common.fields.total")}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("classrooms.addClassroom")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={classRooms} columns={columns} title={t("common.pages.classrooms")} exportFilename="classrooms" />}
            </main>
            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("classrooms.editClassroom") : t("classrooms.addClassroom")}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <Label>{t("classrooms.classId")}</Label>
                            <Input value={form.classRoomId} onChange={e => f("classRoomId", e.target.value)} placeholder="e.g. CR-0001" />
                        </div>
                        {basicFields.map(field => (
                            <div key={field.key}>
                                <Label>{t(field.key === "name" ? "classrooms.className" : `classrooms.${field.key}`, field.label)}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} placeholder={field.placeholder} />
                            </div>
                        ))}
                        <div>
                            <Label>{t("classrooms.department")} *</Label>
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
                        <div>
                            <Label>{t("classrooms.course")} *</Label>
                            <FormCombobox
                                items={courses}
                                value={form.courseId}
                                onValueChange={v => f("courseId", v)}
                                placeholder={t("common.operations.select")}
                                renderItem={course => course.name}
                                getItemValue={course => course._id}
                                getItemLabel={course => course.name}
                            />
                        </div>
                        {detailFields.map(field => (
                            <div key={field.key}>
                                <Label>{t(`classrooms.${field.key}`, field.label)}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} placeholder={field.placeholder} />
                            </div>
                        ))}
                        <div>
                            <Label>{t("classrooms.status")}</Label>
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
