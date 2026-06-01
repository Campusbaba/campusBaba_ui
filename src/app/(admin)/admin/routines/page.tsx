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

const DAY_OPTIONS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }));
const STATUS_OPTIONS = [{ value: "active", label: "Active" }, { value: "cancelled", label: "Cancelled" }, { value: "rescheduled", label: "Rescheduled" }];

type TF = { classRoomId: string; teacherId: string; subject: string; dayOfWeek: string; startTime: string; endTime: string; roomNumber: string; status: string };
const blank: TF = { classRoomId: "", teacherId: "", subject: "", dayOfWeek: "monday", startTime: "", endTime: "", roomNumber: "", status: "active" };

export default function RoutinesPage() {
    const { routines, loading, createRoutine, updateRoutine, deleteRoutine } = useRoutines();
    const { classRooms } = useClassRooms();
    const { teachers } = useTeachers();

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
        if (!form.classRoomId) { toast.error("Please select a classroom"); return; }
        if (!form.teacherId) { toast.error("Please select a teacher"); return; }
        setBusy(true);
        try {
            const payload = {
                ...form,
                status: form.status as "active" | "cancelled" | "rescheduled",
                dayOfWeek: form.dayOfWeek as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
            };
            if (editing) { await updateRoutine(editing._id, payload); toast.success("Routine updated"); }
            else { await createRoutine(payload); toast.success("Routine created"); }
            setOpen(false);
        } catch { toast.error("Failed to save routine"); } finally { setBusy(false); }
    }

    async function handleDelete() {
        if (!confirm) return;
        setBusy(true);
        try { await deleteRoutine(confirm._id); toast.success("Routine deleted"); setConfirm(null); }
        catch { toast.error("Failed to delete"); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Routine, unknown>[] = [
        {
            id: "class", header: "Classroom",
            accessorFn: r => typeof r.classRoomId === "object" ? (r.classRoomId as { name: string }).name : String(r.classRoomId)
        },
        {
            id: "teacher", header: "Teacher",
            accessorFn: r => r.teacherId && typeof r.teacherId === "object"
                ? `${(r.teacherId as { firstName: string; lastName: string }).firstName} ${(r.teacherId as { firstName: string; lastName: string }).lastName}`
                : r.teacherId ? String(r.teacherId) : "Unassigned"
        },
        { id: "subject", accessorKey: "subject", header: "Subject" },
        {
            id: "dayOfWeek", accessorKey: "dayOfWeek", header: "Day",
            cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span>
        },
        { id: "startTime", accessorKey: "startTime", header: "Start" },
        { id: "endTime", accessorKey: "endTime", header: "End" },
        { id: "roomNumber", accessorKey: "roomNumber", header: "Room" },
        {
            id: "status", header: "Status", accessorKey: "status",
            cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{String(getValue())}</Badge>
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
            <Header title="Routines" />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold">Class Routines</h2>
                        <p className="text-sm text-[--muted-foreground]">{routines.length} entries</p>
                    </div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />Add Routine</Button>
                </div>
                {loading
                    ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">Loading…</div>
                    : <DataTable data={routines} columns={columns} title="Routines" exportFilename="routines" />
                }
            </main>

            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? "Edit Routine" : "Add Routine"} className="max-w-lg">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Classroom */}
                    <div className="flex flex-col gap-1">
                        <Label>Classroom *</Label>
                        <FormCombobox
                            items={classRooms}
                            value={form.classRoomId}
                            onValueChange={v => f("classRoomId", v)}
                            placeholder="Select classroom"
                            renderItem={cr => `${cr.name} ${cr.roomNumber ? `— Room ${cr.roomNumber}` : ""}`}
                            getItemValue={cr => cr._id}
                            getItemLabel={cr => `${cr.name} ${cr.roomNumber ? `— Room ${cr.roomNumber}` : ""}`}
                        />
                    </div>

                    {/* Teacher */}
                    <div className="flex flex-col gap-1">
                        <Label>Teacher *</Label>
                        <FormCombobox
                            items={teachers}
                            value={form.teacherId}
                            onValueChange={v => f("teacherId", v)}
                            placeholder="Select teacher"
                            renderItem={t => `${t.firstName} ${t.lastName}`}
                            getItemValue={t => t._id}
                            getItemLabel={t => `${t.firstName} ${t.lastName}`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Subject */}
                        <div className="flex flex-col gap-1">
                            <Label>Subject *</Label>
                            <Input value={form.subject} onChange={e => f("subject", e.target.value)} required placeholder="e.g. Mathematics" />
                        </div>

                        {/* Day of Week */}
                        <div className="flex flex-col gap-1">
                            <Label>Day *</Label>
                            <FormCombobox
                                items={DAY_OPTIONS}
                                value={form.dayOfWeek}
                                onValueChange={v => f("dayOfWeek", v)}
                                placeholder="Select day"
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>

                        {/* Start Time */}
                        <div className="flex flex-col gap-1">
                            <Label>Start Time *</Label>
                            <Input type="time" value={form.startTime} onChange={e => f("startTime", e.target.value)} required />
                        </div>

                        {/* End Time */}
                        <div className="flex flex-col gap-1">
                            <Label>End Time *</Label>
                            <Input type="time" value={form.endTime} onChange={e => f("endTime", e.target.value)} required />
                        </div>

                        {/* Room Number */}
                        <div className="flex flex-col gap-1">
                            <Label>Room Number *</Label>
                            <Input value={form.roomNumber} onChange={e => f("roomNumber", e.target.value)} required placeholder="e.g. 101" />
                        </div>

                        {/* Status */}
                        <div className="flex flex-col gap-1">
                            <Label>Status</Label>
                            <FormCombobox
                                items={STATUS_OPTIONS}
                                value={form.status}
                                onValueChange={v => f("status", v)}
                                placeholder="Select status"
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button size="sm" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Update" : "Create"}</Button>
                    </div>
                </form>
            </FormDialog>

            <ConfirmDialog
                open={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={handleDelete}
                loading={busy}
                message="Delete this routine entry? This cannot be undone."
            />
        </>
    );
}
