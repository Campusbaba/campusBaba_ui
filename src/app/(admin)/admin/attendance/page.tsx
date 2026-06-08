"use client";
import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { FormDialog } from "@/components/reusable/FormDialog";
import { ConfirmDialog } from "@/components/reusable/ConfirmDialog";
import { useAttendance } from "@/hooks/useAttendance";
import { useClassRooms } from "@/hooks/useClassRooms";
import { useStudents } from "@/hooks/useStudents";
import { useAuth } from "@/hooks/useAuth";
import { Attendance, Student } from "@/types/viewModels";
import { ClipboardList, History, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const statusValues = ["present", "absent", "late", "excused"] as const;

type AttendanceMark = "present" | "absent" | "late" | "excused";

export default function AttendancePage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { attendances, loading: histLoading, fetchAttendances, createAttendance, updateAttendance, deleteAttendance, fetchTodayAttendance: fetchTodayAtt } = useAttendance();
    const { classRooms, loading: crLoading } = useClassRooms();
    const { students, fetchStudents, loading: studLoading } = useStudents();

    const [activeTab, setActiveTab] = useState<"mark" | "history">("mark");
    const [selectedClassRoomId, setSelectedClassRoomId] = useState<string>("all");
    const [markingStudent, setMarkingStudent] = useState<Student | null>(null);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
    const [markStatus, setMarkStatus] = useState<AttendanceMark>("present");
    const [markRemarks, setMarkRemarks] = useState("");
    const [historyDate, setHistoryDate] = useState("");
    const [historyClassRoomId, setHistoryClassRoomId] = useState<string>("all");
    const [todayAttMap, setTodayAttMap] = useState<Record<string, string>>({});
    const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
    const [editStatus, setEditStatus] = useState<AttendanceMark>("present");
    const [editRemarks, setEditRemarks] = useState("");
    const [editDate, setEditDate] = useState("");
    const [deletingRecord, setDeletingRecord] = useState<Attendance | null>(null);
    const [busy, setBusy] = useState(false);

    // Load students whenever classroom filter changes
    useEffect(() => {
        const params: Record<string, unknown> = { limit: 200 };
        if (selectedClassRoomId !== "all") params.classRoomId = selectedClassRoomId;
        fetchStudents(params);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClassRoomId]);

    const todayStr = new Date().toISOString().slice(0, 10);

    useEffect(() => {
        fetchTodayAtt(selectedClassRoomId !== "all" ? selectedClassRoomId : undefined).then(setTodayAttMap).catch(() => {});
    }, [selectedClassRoomId, fetchTodayAtt]);

    // Refetch history whenever filters change
    useEffect(() => {
        const params: Record<string, unknown> = { limit: 200 };
        if (historyDate) {
            params.startDate = historyDate;
            params.endDate = historyDate + "T23:59:59";
        }
        if (historyClassRoomId !== "all") params.classRoomId = historyClassRoomId;
        fetchAttendances(params);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyDate, historyClassRoomId]);

    function openMarkModal(s: Student) {
        setMarkingStudent(s);
        setAttendanceDate(new Date().toISOString().slice(0, 10));
        setMarkStatus("present");
        setMarkRemarks("");
    }

    function openEditModal(r: Attendance) {
        setEditingRecord(r);
        setEditStatus((r.status as AttendanceMark) ?? "present");
        setEditRemarks((r.remarks as string) ?? "");
        setEditDate(r.date ? new Date(r.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    }

    async function handleEditSubmit() {
        if (!editingRecord) return;
        setBusy(true);
        try {
            await updateAttendance(editingRecord._id, {
                status: editStatus,
                remarks: editRemarks || undefined,
                date: editDate,
            } as Partial<Attendance>);
            toast.success(t("attendance.attendanceUpdated"));
            setEditingRecord(null);
            // Refresh history
            const params: Record<string, unknown> = { limit: 200 };
            if (historyDate) {
                params.startDate = historyDate;
                params.endDate = historyDate + "T23:59:59";
            }
            if (historyClassRoomId !== "all") params.classRoomId = historyClassRoomId;
            fetchAttendances(params);
        } catch {
            toast.error(t("attendance.failedToUpdate"));
        } finally {
            setBusy(false);
        }
    }

    async function handleDeleteConfirm() {
        if (!deletingRecord) return;
        setBusy(true);
        try {
            await deleteAttendance(deletingRecord._id);
            toast.success(t("attendance.recordDeleted"));
            setDeletingRecord(null);
            const params: Record<string, unknown> = { limit: 200 };
            if (historyDate) {
                params.startDate = historyDate;
                params.endDate = historyDate + "T23:59:59";
            }
            if (historyClassRoomId !== "all") params.classRoomId = historyClassRoomId;
            fetchAttendances(params);
        } catch {
            toast.error(t("attendance.failedToDelete"));
        } finally {
            setBusy(false);
        }
    }

    async function quickMark(s: Student, status: AttendanceMark) {
        setBusy(true);
        try {
            await createAttendance({
                studentId: s._id,
                classRoomId: typeof s.classRoomId === "object"
                    ? (s.classRoomId as { _id: string })._id
                    : (s.classRoomId as string),
                date: todayStr,
                status,
                ...(user ? { markedBy: user.role } : {}),
            });
            setTodayAttMap(prev => ({ ...prev, [s._id]: status }));
            toast.success(t("attendance.markedStatus", { name: `${s.firstName} ${s.lastName}`, status: t(`attendance.${status}`) }));
        } catch {
            toast.error(t("attendance.failedToMark", { name: `${s.firstName} ${s.lastName}` }));
        } finally {
            setBusy(false);
        }
    }

    async function handleMarkSubmit() {
        if (!markingStudent) return;
        setBusy(true);
        try {
            await createAttendance({
                studentId: markingStudent._id,
                classRoomId: typeof markingStudent.classRoomId === "object"
                    ? (markingStudent.classRoomId as { _id: string })._id
                    : (markingStudent.classRoomId as string),
                date: attendanceDate,
                status: markStatus,
                ...(markRemarks ? { remarks: markRemarks } : {}),
                ...(user ? {
                    markedBy: user.role,
                } : {}),
            });
            if (attendanceDate === todayStr) {
                setTodayAttMap(prev => ({ ...prev, [markingStudent._id]: markStatus }));
            }
            toast.success(t("attendance.attendanceSaved", { name: `${markingStudent.firstName} ${markingStudent.lastName}` }));
            setMarkingStudent(null);
        } catch {
            toast.error(t("attendance.failedToSaveAttendance"));
        } finally {
            setBusy(false);
        }
    }

    const statusOptions = statusValues.map(v => ({ value: v, label: t(`attendance.${v}`) }));

    const studentColumns: ColumnDef<Student, unknown>[] = [
        { id: "name", header: t("attendance.student"), accessorFn: r => `${r.firstName} ${r.lastName}` },
        { id: "studentId", accessorKey: "studentId", header: t("attendance.studentId") },
        {
            id: "classroom", header: t("attendance.classroom"),
            accessorFn: r => typeof r.classRoomId === "object"
                ? (r.classRoomId as { name?: string }).name ?? "—"
                : classRooms.find(cr => cr._id === r.classRoomId)?.name ?? "—"
        },
        {
            id: "status", accessorKey: "status", header: t("attendance.status"),
            cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{t(`attendance.${getValue()}`, String(getValue()))}</Badge>
        },
        {
            id: "today", header: t("attendance.today"),
            cell: ({ row: { original: s } }) => {
                const st = todayAttMap[s._id];
                if (!st) return <span className="text-xs text-[--muted-foreground]">—</span>;
                return <Badge variant={st === "present" ? "default" : "destructive"}>{t(`attendance.${st}`, st)}</Badge>;
            }
        },
        {
            id: "actions", header: "",
            cell: ({ row: { original: s } }) => {
                const current = todayAttMap[s._id];
                return (
                    <div className="flex gap-1">
                        <Button size="sm" variant={current === "present" ? "default" : "outline"} className={current === "present" ? "" : "text-green-600 border-green-600 hover:bg-green-50"} onClick={() => quickMark(s, "present")} title={t("attendance.present")}>
                            ✓
                        </Button>
                        <Button size="sm" variant={current === "absent" ? "destructive" : "outline"} className={current === "absent" ? "" : "text-red-600 border-red-600 hover:bg-red-50"} onClick={() => quickMark(s, "absent")} title={t("attendance.absent")}>
                            ✗
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openMarkModal(s)}>
                            <ClipboardList size={13} className="mr-1" /> {t("attendance.mark")}
                        </Button>
                    </div>
                );
            }
        },
    ];

    const historyColumns: ColumnDef<Attendance, unknown>[] = [
        {
            id: "student", header: t("attendance.student"),
            accessorFn: r => {
                const s = r.studentId;
                return s && typeof s === "object"
                    ? `${(s as { firstName: string; lastName: string }).firstName} ${(s as { firstName: string; lastName: string }).lastName}`
                    : String(s ?? "");
            }
        },
        {
            id: "class", header: t("attendance.classroom"),
            accessorFn: r => { const c = r.classRoomId; return typeof c === "object" ? (c as { name: string }).name : String(c); }
        },
        { id: "date", header: t("attendance.date"), accessorFn: r => formatDate(r.date) },
        {
            id: "status", header: t("attendance.status"), accessorKey: "status",
            cell: ({ getValue }) => (
                <Badge variant={String(getValue()) === "present" ? "default" : "destructive"}>{t(`attendance.${getValue()}`, String(getValue()))}</Badge>
            )
        },
        { id: "remarks", accessorKey: "remarks", header: t("attendance.remarks") },
        {
            id: "markedBy", header: t("attendance.markedBy"),
            accessorFn: r => {
                const mb = r.markedBy;
                return typeof mb === "object"
                    ? `${(mb as { firstName: string; lastName: string }).firstName} ${(mb as { firstName: string; lastName: string }).lastName}`
                    : String(mb ?? "—");
            }
        },
        {
            id: "actions", header: "",
            cell: ({ row: { original: r } }) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(r)}>
                        <Pencil size={13} className="mr-1" /> {t("common.operations.edit")}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeletingRecord(r)}>
                        <Trash2 size={13} className="mr-1" /> {t("common.operations.delete")}
                    </Button>
                </div>
            )
        },
    ];

    return (
        <>
            <Header title={t("attendance.title")} />
            <main className="p-5 space-y-4">

                {/* Tabs */}
                <div className="flex gap-2 border-b pb-3">
                    <Button variant={activeTab === "mark" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("mark")}>
                        <ClipboardList size={14} className="mr-1" /> {t("attendance.markAttendance")}
                    </Button>
                    <Button variant={activeTab === "history" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("history")}>
                        <History size={14} className="mr-1" /> {t("attendance.history")}
                    </Button>
                </div>

                {/* Mark Attendance Tab */}
                {activeTab === "mark" && (
                    <div className="space-y-4">
                        {/* Classroom Filter */}
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs">{t("attendance.filterByClassroom")}</Label>
                                <FormCombobox
                                    items={classRooms}
                                    value={selectedClassRoomId}
                                    onValueChange={setSelectedClassRoomId}
                                    placeholder={t("attendance.selectClassroom")}
                                    renderItem={cr => cr.name}
                                    getItemValue={cr => cr._id}
                                    getItemLabel={cr => cr.name}
                                />
                            </div>
                        </div>

                        {crLoading || studLoading
                            ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("attendance.loading")}</div>
                            : <DataTable data={students} columns={studentColumns} title={t("attendance.students")} exportFilename="students" />
                        }
                    </div>
                )}

                {/* History Tab */}
                {activeTab === "history" && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs">{t("attendance.filterByDate")}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={historyDate}
                                        onChange={e => setHistoryDate(e.target.value)}
                                        className="w-44"
                                    />
                                    {historyDate && (
                                        <Button variant="ghost" size="sm" onClick={() => setHistoryDate("")}>{t("attendance.clear")}</Button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs">{t("attendance.filterByClassroom")}</Label>
                                <FormCombobox
                                    items={classRooms}
                                    value={historyClassRoomId}
                                    onValueChange={setHistoryClassRoomId}
                                    placeholder={t("attendance.selectClassroom")}
                                    renderItem={cr => cr.name}
                                    getItemValue={cr => cr._id}
                                    getItemLabel={cr => cr.name}
                                />
                            </div>
                            <p className="text-sm text-[--muted-foreground] pb-1">{t("attendance.records", { count: attendances.length })}</p>
                        </div>

                        {histLoading
                            ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("attendance.loading")}</div>
                            : <DataTable data={attendances} columns={historyColumns} title={t("attendance.attendanceHistory")} exportFilename="attendance-history" />
                        }
                    </div>
                )}
            </main>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deletingRecord}
                onClose={() => setDeletingRecord(null)}
                onConfirm={handleDeleteConfirm}
                title={t("attendance.deleteAttendance")}
                message={deletingRecord
                    ? (typeof deletingRecord.studentId === "object"
                        ? t("attendance.deleteAttendanceConfirm", { name: `${(deletingRecord.studentId as { firstName: string; lastName: string }).firstName} ${(deletingRecord.studentId as { firstName: string; lastName: string }).lastName}` })
                        : t("attendance.deleteAttendanceConfirmDefault"))
                    : ""}
                confirmText={t("common.operations.delete")}
                loading={busy}
            />

            {/* Edit Attendance Record Modal */}
            <FormDialog
                open={!!editingRecord}
                onClose={() => setEditingRecord(null)}
                title={editingRecord
                    ? t("attendance.editAttendanceTitle", { name: typeof editingRecord.studentId === "object" ? `${(editingRecord.studentId as { firstName: string; lastName: string }).firstName} ${(editingRecord.studentId as { firstName: string; lastName: string }).lastName}` : "Record" })
                    : ""}
            >
                <div className="p-6 space-y-4">
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("attendance.date")} *</Label>
                        <Input
                            type="date"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            className="w-44"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("attendance.status")} *</Label>
                        <FormCombobox
                            items={statusOptions}
                            value={editStatus}
                            onValueChange={v => setEditStatus(v as AttendanceMark)}
                            placeholder={t("common.operations.select")}
                            renderItem={opt => opt.label}
                            getItemValue={opt => opt.value}
                            getItemLabel={opt => opt.label}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("attendance.remarks")}</Label>
                        <Input
                            placeholder={t("attendance.optional")}
                            value={editRemarks}
                            onChange={e => setEditRemarks(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingRecord(null)}>{t("attendance.cancel")}</Button>
                        <Button size="sm" onClick={handleEditSubmit} disabled={busy}>
                            {busy ? t("attendance.saving") : t("attendance.saveChanges")}
                        </Button>
                    </div>
                </div>
            </FormDialog>

            {/* Per-student Mark Attendance Modal */}
            <FormDialog
                open={!!markingStudent}
                onClose={() => setMarkingStudent(null)}
                title={markingStudent ? t("attendance.markAttendanceTitle", { name: `${markingStudent.firstName} ${markingStudent.lastName}` }) : ""}
            >
                <div className="p-6 space-y-4">
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("attendance.date")} *</Label>
                        <Input
                            type="date"
                            value={attendanceDate}
                            onChange={e => setAttendanceDate(e.target.value)}
                            className="w-44"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("attendance.status")} *</Label>
                        <FormCombobox
                            items={statusOptions}
                            value={markStatus}
                            onValueChange={v => setMarkStatus(v as AttendanceMark)}
                            placeholder={t("common.operations.select")}
                            renderItem={opt => opt.label}
                            getItemValue={opt => opt.value}
                            getItemLabel={opt => opt.label}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("attendance.remarks")}</Label>
                        <Input
                            placeholder={t("attendance.optional")}
                            value={markRemarks}
                            onChange={e => setMarkRemarks(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setMarkingStudent(null)}>{t("attendance.cancel")}</Button>
                        <Button size="sm" onClick={handleMarkSubmit} disabled={busy}>
                            {busy ? t("attendance.saving") : t("attendance.submit")}
                        </Button>
                    </div>
                </div>
            </FormDialog>
        </>
    );
}
