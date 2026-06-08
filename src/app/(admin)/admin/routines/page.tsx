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
import { useRoutines } from "@/hooks/useRoutines";
import { useClassRooms } from "@/hooks/useClassRooms";
import { useTeachers } from "@/hooks/useTeachers";
import { Routine } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const STATUS_KEYS = ["active", "cancelled", "rescheduled"] as const;

type TF = { classRoomId: string; teacherId: string; subject: string; dayOfWeek: string; startTime: string; endTime: string; roomNumber: string; status: string };
const blank: TF = { classRoomId: "", teacherId: "", subject: "", dayOfWeek: "monday", startTime: "", endTime: "", roomNumber: "", status: "active" };

export default function RoutinesPage() {
    const { t } = useTranslation();
    const { routines, loading, createRoutine, updateRoutine, deleteRoutine } = useRoutines();
    const { classRooms } = useClassRooms();
    const { teachers } = useTeachers();

    const DAY_OPTIONS = DAY_KEYS.map(d => ({ value: d, label: t(`routines.${d}`) }));
    const STATUS_OPTIONS = STATUS_KEYS.map(s => ({ value: s, label: t(`routines.${s}`) }));

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Routine | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Routine | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(r: Routine) {
        setEditing(r);
        setForm({
            classRoomId: r.classRoomId && typeof r.classRoomId === "object" ? (r.classRoomId as { _id: string })._id : String(r.classRoomId ?? ""),
            teacherId: r.teacherId && typeof r.teacherId === "object" ? (r.teacherId as { _id: string })._id : String(r.teacherId ?? ""),
            subject: r.subject,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            roomNumber: r.roomNumber,
            status: r.status,
        });
        setOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.classRoomId) { toast.error(t("routines.pleaseSelectClassroom")); return; }
        if (!form.teacherId) { toast.error(t("routines.pleaseSelectTeacher")); return; }
        setBusy(true);
        try {
            const payload = {
                ...form,
                status: form.status as "active" | "cancelled" | "rescheduled",
                dayOfWeek: form.dayOfWeek as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
            };
            if (editing) { await updateRoutine(editing._id, payload); toast.success(t("routines.routineUpdated")); }
            else { await createRoutine(payload); toast.success(t("routines.routineCreated")); }
            setOpen(false);
        } catch { toast.error(t("routines.failedToSave")); } finally { setBusy(false); }
    }

    async function handleDelete() {
        if (!confirm) return;
        setBusy(true);
        try { await deleteRoutine(confirm._id); toast.success(t("routines.routineDeleted")); setConfirm(null); }
        catch { toast.error(t("routines.failedToDelete")); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Routine, unknown>[] = [
        {
            id: "class", header: t("routines.classroom"),
            accessorFn: r => typeof r.classRoomId === "object" ? (r.classRoomId as { name: string }).name : String(r.classRoomId)
        },
        {
            id: "teacher", header: t("routines.teacher"),
            accessorFn: r => r.teacherId && typeof r.teacherId === "object"
                ? `${(r.teacherId as { firstName: string; lastName: string }).firstName} ${(r.teacherId as { firstName: string; lastName: string }).lastName}`
                : r.teacherId ? String(r.teacherId) : t("routines.unassigned")
        },
        { id: "subject", accessorKey: "subject", header: t("routines.subject") },
        {
            id: "dayOfWeek", accessorKey: "dayOfWeek", header: t("routines.day"),
            cell: ({ getValue }) => <span className="capitalize">{t(`routines.${String(getValue())}`)}</span>
        },
        { id: "startTime", accessorKey: "startTime", header: t("routines.startLabel") },
        { id: "endTime", accessorKey: "endTime", header: t("routines.endLabel") },
        { id: "roomNumber", accessorKey: "roomNumber", header: t("routines.roomNumber") },
        {
            id: "status", header: t("routines.status"), accessorKey: "status",
            cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{t(`routines.${String(getValue())}`)}</Badge>
        },
        {
            id: "actions", header: "",
            cell: ({ row: { original: r } }) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button>
                </div>
            )
        },
    ];

    return (
        <>
            <Header title={t("common.pages.routines")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold">{t("routines.classRoutines")}</h2>
                        <p className="text-sm text-[--muted-foreground]">{routines.length} {t("routines.entries")}</p>
                    </div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("routines.addRoutine")}</Button>
                </div>
                {loading
                    ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={routines} columns={columns} title={t("common.pages.routines")} exportFilename="routines" />
                }
            </main>

            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("routines.editRoutine") : t("routines.addRoutine")} className="max-w-lg">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Classroom */}
                    <div className="flex flex-col gap-1">
                        <Label>{t("routines.classroomLabel")}</Label>
                        <FormCombobox
                            items={classRooms}
                            value={form.classRoomId}
                            onValueChange={v => f("classRoomId", v)}
                            placeholder={t("routines.selectClassroom")}
                            renderItem={cr => `${cr.name} ${cr.roomNumber ? `— ${t("routines.room")} ${cr.roomNumber}` : ""}`}
                            getItemValue={cr => cr._id}
                            getItemLabel={cr => `${cr.name} ${cr.roomNumber ? `— ${t("routines.room")} ${cr.roomNumber}` : ""}`}
                        />
                    </div>

                    {/* Teacher */}
                    <div className="flex flex-col gap-1">
                        <Label>{t("routines.teacherLabel")}</Label>
                        <FormCombobox
                            items={teachers}
                            value={form.teacherId}
                            onValueChange={v => f("teacherId", v)}
                            placeholder={t("routines.selectTeacher")}
                            renderItem={t => `${t.firstName} ${t.lastName}`}
                            getItemValue={t => t._id}
                            getItemLabel={t => `${t.firstName} ${t.lastName}`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Subject */}
                        <div className="flex flex-col gap-1">
                            <Label>{t("routines.subjectLabel")}</Label>
                            <Input value={form.subject} onChange={e => f("subject", e.target.value)} required placeholder={t("routines.subjectPlaceholder")} />
                        </div>

                        {/* Day of Week */}
                        <div className="flex flex-col gap-1">
                            <Label>{t("routines.dayLabel")}</Label>
                            <FormCombobox
                                items={DAY_OPTIONS}
                                value={form.dayOfWeek}
                                onValueChange={v => f("dayOfWeek", v)}
                                placeholder={t("routines.selectDay")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>

                        {/* Start Time */}
                        <div className="flex flex-col gap-1">
                            <Label>{t("routines.startTimeLabel")}</Label>
                            <Input type="time" value={form.startTime} onChange={e => f("startTime", e.target.value)} required />
                        </div>

                        {/* End Time */}
                        <div className="flex flex-col gap-1">
                            <Label>{t("routines.endTimeLabel")}</Label>
                            <Input type="time" value={form.endTime} onChange={e => f("endTime", e.target.value)} required />
                        </div>

                        {/* Room Number */}
                        <div className="flex flex-col gap-1">
                            <Label>{t("routines.roomNumberLabel")}</Label>
                            <Input value={form.roomNumber} onChange={e => f("roomNumber", e.target.value)} required placeholder={t("routines.roomNumberPlaceholder")} />
                        </div>

                        {/* Status */}
                        <div className="flex flex-col gap-1">
                            <Label>{t("routines.statusLabel")}</Label>
                            <FormCombobox
                                items={STATUS_OPTIONS}
                                value={form.status}
                                onValueChange={v => f("status", v)}
                                placeholder={t("routines.selectStatus")}
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

            <ConfirmDialog
                open={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={handleDelete}
                loading={busy}
                message={t("routines.deleteConfirmMessage")}
            />
        </>
    );
}
