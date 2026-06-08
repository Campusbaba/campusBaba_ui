"use client";
import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Badge } from "@/components/ui/badge";
import { useRoutines } from "@/hooks/useRoutines";
import { useAuth } from "@/hooks/useAuth";
import { Routine } from "@/types/viewModels";
import { useTranslation } from "react-i18next";

export default function TeacherRoutinesPage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { fetchRoutinesByTeacher } = useRoutines();
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!referenceId) return;
        setLoading(true);
        fetchRoutinesByTeacher(referenceId)
            .then((grouped) => setRoutines(Object.values(grouped).flat()))
            .catch((err) => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, [referenceId, fetchRoutinesByTeacher]);

    const columns: ColumnDef<Routine, unknown>[] = [
        { id: "subject", accessorKey: "subject", header: t("teacherPortal.routines.subjectHeader") },
        { id: "class", header: t("teacherPortal.routines.classHeader"), accessorFn: (r) => (r.classRoomId as { name?: string })?.name ?? String(r.classRoomId) },
        { id: "dayOfWeek", accessorKey: "dayOfWeek", header: t("teacherPortal.routines.dayHeader") },
        { id: "startTime", accessorKey: "startTime", header: t("teacherPortal.routines.startHeader") },
        { id: "endTime", accessorKey: "endTime", header: t("teacherPortal.routines.endHeader") },
        { id: "roomNumber", accessorKey: "roomNumber", header: t("teacherPortal.routines.roomHeader") },
        { id: "status", header: t("teacherPortal.routines.statusHeader"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "active" ? "default" : "secondary"}>{String(getValue())}</Badge> },
    ];

    return (
        <>
            <Header title={t("teacherPortal.routines.title")} />
            <main className="p-5 space-y-4">
                <h2 className="text-base font-semibold text-[--foreground]">{t("teacherPortal.routines.myClassRoutines")}</h2>
                {error && (
                    <div className="card p-4 text-sm text-red-500">{error}</div>
                )}
                {loading ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">{t("teacherPortal.routines.loading")}</div>
                ) : (
                    <DataTable data={routines} columns={columns} title="My Routines" exportFilename="teacher-routines" />
                )}
            </main>
        </>
    );
}
