"use client";
import { useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Badge } from "@/components/ui/badge";
import { useExams } from "@/hooks/useExams";
import { useParents } from "@/hooks/useParents";
import { useAuth } from "@/hooks/useAuth";
import { Exam } from "@/types/viewModels";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const statusVariant = (s: string) =>
    s === "completed" ? "default" : s === "ongoing" ? "destructive" : "secondary";

export default function ParentExamsPage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { children, fetchChildren } = useParents({}, false);
    const { exams, loading, fetchExamsByClassRooms } = useExams({}, false);

    useEffect(() => {
        if (!referenceId) return;
        fetchChildren(referenceId).then((kids) => {
            if (kids.length === 0) return;
            const classRoomIds = kids
                .map((k) => typeof k.classRoomId === "string" ? k.classRoomId : (k.classRoomId as { _id?: string })?._id)
                .filter((id): id is string => Boolean(id));
            const uniqueIds = [...new Set(classRoomIds)];
            if (uniqueIds.length > 0) fetchExamsByClassRooms(uniqueIds);
        });
    }, [referenceId, fetchChildren, fetchExamsByClassRooms]);

    const columns: ColumnDef<Exam, unknown>[] = [
        { id: "name", accessorKey: "name", header: t("parentPortal.exams.examHeader") },
        { id: "examId", accessorKey: "examId", header: t("parentPortal.exams.examIdHeader") },
        {
            id: "student", header: t("parentPortal.exams.studentHeader"),
            accessorFn: (r) => {
                const crId = typeof r.classRoomId === "string" ? r.classRoomId : (r.classRoomId as { _id?: string })?._id;
                const child = children.find((c) => {
                    const cId = typeof c.classRoomId === "string" ? c.classRoomId : (c.classRoomId as { _id?: string })?._id;
                    return cId === crId;
                });
                return child ? `${child.firstName} ${child.lastName}` : "—";
            },
        },
        { id: "examType", accessorKey: "examType", header: t("parentPortal.exams.typeHeader") },
        {
            id: "course", header: t("parentPortal.exams.courseHeader"),
            accessorFn: (r) => (r.courseId as { name?: string })?.name ?? String(r.courseId ?? "—"),
        },
        {
            id: "classroom", header: t("parentPortal.exams.classHeader"),
            accessorFn: (r) => (r.classRoomId as { name?: string })?.name ?? String(r.classRoomId ?? "—"),
        },
        {
            id: "room", header: t("parentPortal.exams.roomHeader"),
            accessorFn: (r) => (r.classRoomId as { roomNumber?: string })?.roomNumber ?? "—",
        },
        { id: "date", header: t("parentPortal.exams.dateHeader"), accessorFn: (r) => formatDate(r.date) },
        { id: "startTime", accessorKey: "startTime", header: t("parentPortal.exams.startHeader") },
        { id: "endTime", accessorKey: "endTime", header: t("parentPortal.exams.endHeader") },
        { id: "totalMarks", accessorKey: "totalMarks", header: t("parentPortal.exams.totalMarksHeader") },
        { id: "passingMarks", accessorKey: "passingMarks", header: t("parentPortal.exams.passingMarksHeader") },
        { id: "instructions", accessorKey: "instructions", header: t("parentPortal.exams.instructionsHeader") },
        {
            id: "status", header: t("parentPortal.exams.statusHeader"), accessorKey: "status",
            cell: ({ getValue }) => <Badge variant={statusVariant(String(getValue()))}>{String(getValue())}</Badge>,
        },
    ];

    return (
        <>
            <Header title={t("parentPortal.exams.title")} />
            <main className="p-5 space-y-4">
                <h2 className="text-base font-semibold text-[--foreground]">{t("parentPortal.exams.upcomingPastExams")}</h2>
                {loading ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">{t("parentPortal.exams.loading")}</div>
                ) : (
                    <DataTable data={exams} columns={columns} title="Exams" exportFilename="parent-exams" />
                )}
            </main>
        </>
    );
}
