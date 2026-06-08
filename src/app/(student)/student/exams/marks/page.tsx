"use client";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { useExamMarks } from "@/hooks/useExamMarks";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/datatable/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { ExamMark } from "@/types/viewModels";

export default function StudentExamMarksPage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { marks, loading, fetchStudentExamResults } = useExamMarks();

    useEffect(() => {
        if (!referenceId) return;
        fetchStudentExamResults(referenceId);
    }, [referenceId, fetchStudentExamResults]);

    const columns: ColumnDef<ExamMark, unknown>[] = [
        {
            id: "exam", header: t("studentPortal.examMarks.exam"),
            accessorFn: (r) => (r.examId as { name?: string })?.name ?? "—"
        },
        {
            id: "subject", header: t("studentPortal.examMarks.subject"),
            accessorFn: (r) => {
                const exam = r.examId as any;
                return exam?.courseId?.name ?? "—";
            }
        },
        {
            id: "marks", header: t("studentPortal.examMarks.marks"),
            cell: ({ row: { original: r } }) => {
                const total = (r.examId as any)?.totalMarks ?? 100;
                const percentage = Math.round((r.marksObtained / total) * 100);
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{r.marksObtained} / {total}</span>
                        <span className="text-xs text-[--muted-foreground]">{percentage}%</span>
                    </div>
                );
            }
        },
        {
            id: "grade", header: t("studentPortal.examMarks.grade"), accessorKey: "grade",
            cell: ({ getValue }) => {
                const grade = String(getValue() || "—");
                return <Badge variant={grade === "F" ? "destructive" : "outline"}>{grade}</Badge>;
            }
        },
        { id: "remarks", header: t("studentPortal.examMarks.remarks"), accessorKey: "remarks" },
    ];

    return (
        <>
            <Header title={t("studentPortal.examMarks.examResults")} />
            <main className="p-5 space-y-6">
                {loading ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">{t("studentPortal.examMarks.loading")}</div>
                ) : (
                    <DataTable data={marks} columns={columns} title={t("studentPortal.examMarks.marksTitle")} exportFilename="my-marks" />
                )}
            </main>
        </>
    );
}
