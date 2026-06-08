"use client";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { useExams } from "@/hooks/useExams";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";

export default function StudentExamsPage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { student, fetchStudent } = useStudents({}, false);
    const { exams, loading, fetchExamsByClassRooms } = useExams({}, false);

    useEffect(() => {
        if (!referenceId) return;
        fetchStudent(referenceId);
    }, [referenceId, fetchStudent]);

    useEffect(() => {
        if (!student) return;
        const classRoomId = typeof student.classRoomId === "string"
            ? student.classRoomId
            : (student.classRoomId as { _id?: string })?._id;

        if (classRoomId) {
            fetchExamsByClassRooms([classRoomId]);
        }
    }, [student, fetchExamsByClassRooms]);

    return (
        <>
            <Header title={t("studentPortal.exams.examSchedule")} />
            <main className="p-5 space-y-6">
                {loading ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">{t("studentPortal.exams.loading")}</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.length > 0 ? exams.map((exam) => (
                            <Card key={exam._id} className="border-l-4 border-l-[--primary]">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-semibold">{exam.name}</CardTitle>
                                        <Badge variant={exam.status === "scheduled" ? "default" : "secondary"} className="capitalize">
                                            {exam.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-[--muted-foreground] uppercase tracking-wide text-xs font-semibold">
                                        {(exam.courseId as { name?: string })?.name ?? t("studentPortal.exams.course")}
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-2">
                                    <div className="flex items-center gap-2 text-sm text-[--muted-foreground]">
                                        <Calendar size={16} />
                                        <span>{formatDate(exam.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-[--muted-foreground]">
                                        <Clock size={16} />
                                        <span>{exam.startTime} - {exam.endTime}</span>
                                    </div>
                                    <div className="pt-2 border-t border-[--border] mt-2 flex justify-between text-sm">
                                        <span>{t("studentPortal.exams.totalMarks")}</span>
                                        <span className="font-semibold">{exam.totalMarks}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="col-span-full py-10 text-center text-[--muted-foreground]">
                                {t("studentPortal.exams.noExams")}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}
