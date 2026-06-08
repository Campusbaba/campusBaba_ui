"use client";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Badge } from "@/components/ui/badge";
import { useAttendance } from "@/hooks/useAttendance";
import { useAuth } from "@/hooks/useAuth";
import { Attendance } from "@/types/viewModels";
import { formatDate } from "@/lib/utils";

export default function StudentAttendancePage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { attendances, loading, fetchAttendances } = useAttendance({}, false);

    useEffect(() => {
        if (!referenceId) return;
        fetchAttendances({ studentId: referenceId, limit: 100 });
    }, [referenceId, fetchAttendances]);

    const columns: ColumnDef<Attendance, unknown>[] = [
        { id: "date", header: t("studentPortal.attendance.date"), accessorFn: (r) => formatDate(r.date) },
        { id: "subject", header: t("studentPortal.attendance.subject"), accessorFn: (r) => t("studentPortal.attendance.general") },
        { id: "status", header: t("studentPortal.attendance.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "present" ? "default" : "destructive"}>{String(getValue())}</Badge> },
        { id: "remarks", accessorKey: "remarks", header: t("studentPortal.attendance.remarks") },
    ];

    return (
        <>
            <Header title={t("studentPortal.attendance.myAttendance")} />
            <main className="p-5 space-y-4">
                <h2 className="text-base font-semibold text-[--foreground]">
                    {t("studentPortal.attendance.attendanceRecords")}
                </h2>
                {loading ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">{t("studentPortal.attendance.loading")}</div>
                ) : (
                    <DataTable data={attendances} columns={columns} title={t("studentPortal.attendance.attendance")} exportFilename="my-attendance" />
                )}
            </main>
        </>
    );
}
