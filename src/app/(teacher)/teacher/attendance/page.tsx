"use client";
import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/reusable/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { useAttendance } from "@/hooks/useAttendance";
import { useStudents } from "@/hooks/useStudents";
import { useClassRooms } from "@/hooks/useClassRooms";
import { useAuth } from "@/hooks/useAuth";
import { Attendance, Student } from "@/types/viewModels";
import { formatDate } from "@/lib/utils";
import { ClipboardList, History } from "lucide-react";
import { useTranslation } from "react-i18next";

type AttendanceMark = "present" | "absent" | "late" | "excused";

const statusOptions = [
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "late", label: "Late" },
    { value: "excused", label: "Excused" },
];

export default function TeacherAttendancePage() {
    const { t } = useTranslation();
    const { referenceId, user } = useAuth();
    const { attendances, loading: histLoading, fetchAttendances, createAttendance, fetchTodayAttendance: fetchTodayAtt } = useAttendance({}, false);
    const { students, fetchStudents, loading: studLoading } = useStudents({}, false);
    const { classRooms: assignedClassRooms } = useClassRooms({ teacherId: referenceId ?? undefined }, true);

    const [activeTab, setActiveTab] = useState<"mark" | "history">("mark");
    const [selectedClassRoomId, setSelectedClassRoomId] = useState<string>("");
    const [markingStudent, setMarkingStudent] = useState<Student | null>(null);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
    const [markStatus, setMarkStatus] = useState<AttendanceMark>("present");
    const [markRemarks, setMarkRemarks] = useState("");
    const [historyDate, setHistoryDate] = useState("");
    const [historyClassRoomId, setHistoryClassRoomId] = useState<string>("");
    const [todayAttMap, setTodayAttMap] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

    // Auto-select first classroom once available
    useEffect(() => {
        if (assignedClassRooms.length > 0 && !selectedClassRoomId) {
            setSelectedClassRoomId(assignedClassRooms[0]._id);
            setHistoryClassRoomId(assignedClassRooms[0]._id);
        }
    }, [assignedClassRooms, selectedClassRoomId]);

    // Fetch students for selected classroom
    useEffect(() => {
        if (!selectedClassRoomId) return;
        fetchStudents({ classRoomId: selectedClassRoomId, limit: 200 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClassRoomId]);

    const todayStr = new Date().toISOString().slice(0, 10);

    useEffect(() => {
        if (!selectedClassRoomId) return;
        fetchTodayAtt(selectedClassRoomId).then(setTodayAttMap).catch(() => {});
    }, [selectedClassRoomId, fetchTodayAtt]);

    // Fetch history filtered to teacher's classroom + optional date
    useEffect(() => {
        if (!historyClassRoomId) return;
        const params: Record<string, unknown> = { classRoomId: historyClassRoomId, limit: 200 };
        if (historyDate) { params.startDate = historyDate; params.endDate = historyDate + "T23:59:59"; }
        fetchAttendances(params);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyDate, historyClassRoomId]);

    function openMarkModal(s: Student) {
        setMarkingStudent(s);
        setAttendanceDate(new Date().toISOString().slice(0, 10));
        setMarkStatus("present");
        setMarkRemarks("");
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

    const studentColumns: ColumnDef<Student, unknown>[] = [
        { id: "name", header: t("attendance.student"), accessorFn: r => `${r.firstName} ${r.lastName}` },
        { id: "studentId", accessorKey: "studentId", header: t("attendance.studentId") },
        {
            id: "status", accessorKey: "status", header: t("attendance.status"),
            cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{t(`attendance.${getValue()}`, String(getValue()))}</Badge>,
        },
        {
            id: "today", header: t("attendance.today"),
            cell: ({ row: { original: s } }) => {
                const st = todayAttMap[s._id];
                if (!st) return <span className="text-xs text-[--muted-foreground]">—</span>;
                return <Badge variant={st === "present" ? "default" : "destructive"}>{t(`attendance.${st}`)}</Badge>;
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
            },
        },
    ];

    const historyColumns: ColumnDef<Attendance, unknown>[] = [
        { id: "student", header: t("attendance.student"), accessorFn: r => { const s = r.studentId; return s && typeof s === "object" ? `${(s as { firstName: string; lastName: string }).firstName} ${(s as { firstName: string; lastName: string }).lastName}` : String(s ?? ""); } },
        { id: "date", header: t("attendance.date"), accessorFn: r => formatDate(r.date) },
        { id: "status", header: t("attendance.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "present" ? "default" : "destructive"}>{t(`attendance.${getValue()}`, String(getValue()))}</Badge> },
        { id: "remarks", accessorKey: "remarks", header: t("attendance.remarks") },
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
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs">{t("attendance.classroom")}</Label>
                                <Select value={selectedClassRoomId} onValueChange={setSelectedClassRoomId}
                                    disabled={assignedClassRooms.length === 0}>
                                    <SelectTrigger className="w-52">
                                        <SelectValue placeholder={assignedClassRooms.length === 0 ? t("attendance.noAssignedClasses") : t("attendance.selectClassroom")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignedClassRooms.map(cr => <SelectItem key={cr._id} value={cr._id}>{cr.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {studLoading
                            ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("header.loading")}</div>
                            : <DataTable data={students} columns={studentColumns} title={t("attendance.students")} exportFilename="students" />}
                    </div>
                )}

                {/* History Tab */}
                {activeTab === "history" && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs">{t("attendance.classroom")}</Label>
                                <Select value={historyClassRoomId} onValueChange={setHistoryClassRoomId}
                                    disabled={assignedClassRooms.length === 0}>
                                    <SelectTrigger className="w-52"><SelectValue placeholder={t("attendance.selectClassroom")} /></SelectTrigger>
                                    <SelectContent>
                                        {assignedClassRooms.map(cr => <SelectItem key={cr._id} value={cr._id}>{cr.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs">{t("attendance.filterByDate")}</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="w-44" />
                                    {historyDate && <Button variant="ghost" size="sm" onClick={() => setHistoryDate("")}>{t("attendance.clear")}</Button>}
                                </div>
                            </div>
                            <p className="text-sm text-[--muted-foreground] pb-1">{t("attendance.records", { count: attendances.length })}</p>
                        </div>
                        {histLoading
                            ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("header.loading")}</div>
                            : <DataTable data={attendances} columns={historyColumns} title={t("attendance.attendanceHistory")} exportFilename="teacher-attendance-history" />}
                    </div>
                )}
            </main>

            {/* Per-student Mark Modal */}
            <FormDialog
                open={!!markingStudent}
                onClose={() => setMarkingStudent(null)}
                title={markingStudent ? t("attendance.markAttendanceTitle", { name: `${markingStudent.firstName} ${markingStudent.lastName}` }) : ""}
            >
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("attendance.date")} *</Label>
                        <Input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-44" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("attendance.status")} *</Label>
                        <Select value={markStatus} onValueChange={v => setMarkStatus(v as AttendanceMark)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{t(`attendance.${opt.value}`)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("attendance.remarks")}</Label>
                        <Input placeholder={t("attendance.optional")} value={markRemarks} onChange={e => setMarkRemarks(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setMarkingStudent(null)}>{t("attendance.cancel")}</Button>
                        <Button size="sm" onClick={handleMarkSubmit} disabled={busy}>{busy ? t("attendance.saving") : t("attendance.submit")}</Button>
                    </div>
                </div>
            </FormDialog>
        </>
    );
}
