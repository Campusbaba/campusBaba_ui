"use client";
import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAttendance } from "@/hooks/useAttendance";
import { useParents } from "@/hooks/useParents";
import { useAuth } from "@/hooks/useAuth";
import { Attendance } from "@/types/viewModels";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function ParentAttendancePage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { children, fetchChildren } = useParents({}, false);
    const { attendances, loading, fetchAttendances } = useAttendance({}, false);
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");

    useEffect(() => {
        if (!referenceId) return;
        fetchChildren(referenceId).then((kids) => {
            if (kids.length > 0) setSelectedStudentId(kids[0]._id);
        });
    }, [referenceId, fetchChildren]);

    useEffect(() => {
        if (!selectedStudentId) return;
        fetchAttendances({ studentId: selectedStudentId });
    }, [selectedStudentId, fetchAttendances]);

    const columns: ColumnDef<Attendance, unknown>[] = [
        { id: "student", header: t("parentPortal.attendance.studentHeader"), accessorFn: (r) => { const s = r.studentId as { firstName?: string; lastName?: string }; return s?.firstName ? `${s.firstName} ${s.lastName ?? ""}`.trim() : String(r.studentId); } },
        { id: "class", header: t("parentPortal.attendance.classHeader"), accessorFn: (r) => (r.classRoomId as { name?: string })?.name ?? String(r.classRoomId) },
        { id: "date", header: t("parentPortal.attendance.dateHeader"), accessorFn: (r) => formatDate(r.date) },
        { id: "status", header: t("parentPortal.attendance.statusHeader"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "present" ? "default" : "destructive"}>{String(getValue())}</Badge> },
        { id: "remarks", accessorKey: "remarks", header: t("parentPortal.attendance.remarksHeader") },
    ];

    const selectedStudent = children.find((c) => c._id === selectedStudentId);

    return (
        <>
            <Header title={t("parentPortal.attendance.title")} />
            <main className="p-5 space-y-4">
                {children.length > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[--muted-foreground]">{t("parentPortal.attendance.child")}</span>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                            <SelectTrigger className="w-52"><SelectValue placeholder={t("parentPortal.attendance.selectChild")} /></SelectTrigger>
                            <SelectContent>
                                {children.map((c) => (
                                    <SelectItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <h2 className="text-base font-semibold text-[--foreground]">
                    {t("parentPortal.attendance.attendanceRecords")}{selectedStudent ? ` — ${selectedStudent.firstName} ${selectedStudent.lastName}` : ""}
                </h2>
                {loading ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">{t("parentPortal.attendance.loading")}</div>
                ) : (
                    <DataTable data={attendances} columns={columns} title="Attendance" exportFilename="parent-attendance" />
                )}
            </main>
        </>
    );
}
