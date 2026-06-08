"use client";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePayments } from "@/hooks/usePayments";
import { useAttendance } from "@/hooks/useAttendance";
import { useStudents } from "@/hooks/useStudents";
import { useExams } from "@/hooks/useExams";
import { useExamMarks } from "@/hooks/useExamMarks";
import { useRoutines } from "@/hooks/useRoutines";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, CalendarCheck, GraduationCap, BookOpen, FileCheck, LayoutList } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";

export default function StudentDashboard() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { student, loading: sLoading, fetchStudent } = useStudents();
    const { payments, loading: pLoading, fetchStudentPayments } = usePayments({}, false);
    const { attendances, loading: aLoading, fetchAttendances } = useAttendance({}, false);
    const { exams, fetchExamsByClassRooms } = useExams({}, false);
    const { marks, fetchStudentExamResults } = useExamMarks();
    const { routines, fetchRoutinesByClassRoom } = useRoutines({}, false);

    // Load student profile
    useEffect(() => {
        if (!referenceId) return;
        fetchStudent(referenceId);
    }, [referenceId, fetchStudent]);

    // Load related data once student is loaded
    useEffect(() => {
        if (!student || !student._id) return;

        fetchStudentPayments(student._id);
        fetchAttendances({ studentId: student._id, limit: 200 });
        fetchStudentExamResults(student._id);

        const classRoomId = typeof student.classRoomId === "string"
            ? student.classRoomId
            : (student.classRoomId as { _id?: string })?._id;

        if (classRoomId) {
            fetchExamsByClassRooms([classRoomId]);
            fetchRoutinesByClassRoom(classRoomId);
        }
    }, [student, fetchStudentPayments, fetchAttendances, fetchStudentExamResults, fetchExamsByClassRooms, fetchRoutinesByClassRoom]);

    const classroomName = student
        ? (student.classRoomId as { name?: string })?.name ?? "—"
        : "—";

    const totalPaid = payments.filter((p) => p.paymentStatus === "paid").reduce((acc, p) => acc + p.amount, 0);
    const pendingAmount = payments.filter((p) => p.paymentStatus !== "paid").reduce((acc, p) => acc + p.amount, 0);
    const presentDays = attendances.filter((a) => a.status === "present").length;
    const totalDays = attendances.length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;
    const upcomingExams = exams.filter((e) => e.status === "scheduled").length;

    // Calculate marks
    const validMarks = marks.filter((m) => (m.examId as { totalMarks?: number })?.totalMarks);
    const obtainedSum = validMarks.reduce((acc, m) => acc + m.marksObtained, 0);
    const totalPossibleSum = validMarks.reduce((acc, m) => acc + ((m.examId as { totalMarks?: number })?.totalMarks ?? 100), 0);
    const avgScore = totalPossibleSum > 0 ? Math.round((obtainedSum / totalPossibleSum) * 100) : null;

    const uniqueSubjects = [...new Set(routines.map((r) => r.subject).filter(Boolean))];

    // Chart data for attendance
    const attendanceChartData = useMemo(() => {
        if (!attendances.length) return [];
        const monthlyStats = attendances.reduce((acc, curr) => {
            const month = new Date(curr.date).toLocaleDateString('default', { month: 'short' });
            if (!acc[month]) acc[month] = { present: 0, absent: 0, total: 0 };
            acc[month].total++;
            if (curr.status === 'present') acc[month].present++;
            else acc[month].absent++;
            return acc;
        }, {} as Record<string, { present: number; absent: number; total: number }>);

        return Object.entries(monthlyStats).map(([name, data]) => ({
            name,
            Attendance: Math.round((data.present / data.total) * 100),
        }));
    }, [attendances]);

    const loading = sLoading || pLoading || aLoading;

    if (loading && !student) {
        return (
            <>
                <Header title={t("dashboard.title")} />
                <main className="p-5 flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="text-[--muted-foreground]">{t("studentPortal.dashboard.loading")}</div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header title={t("studentPortal.dashboard.title")} />
            <main className="p-5 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-green-50 text-green-600"><CreditCard size={24} /></div>
                            <div>
                                <p className="text-sm font-medium text-[--muted-foreground]">{t("studentPortal.dashboard.feesPaid")}</p>
                                <h3 className="text-2xl font-bold">{formatCurrency(totalPaid)}</h3>
                                <p className="text-xs text-[--muted-foreground]">
                                    {pendingAmount > 0 ? t("studentPortal.dashboard.pendingAmount", { amount: formatCurrency(pendingAmount) }) : t("studentPortal.dashboard.allCleared")}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-50 text-blue-600"><CalendarCheck size={24} /></div>
                            <div>
                                <p className="text-sm font-medium text-[--muted-foreground]">{t("studentPortal.dashboard.attendance")}</p>
                                <h3 className="text-2xl font-bold">{attendanceRate !== null ? `${attendanceRate}%` : "—"}</h3>
                                <p className="text-xs text-[--muted-foreground]">{t("studentPortal.dashboard.daysPresent", { present: presentDays, total: totalDays })}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-indigo-50 text-indigo-600"><BookOpen size={24} /></div>
                            <div>
                                <p className="text-sm font-medium text-[--muted-foreground]">{t("studentPortal.dashboard.avgScore")}</p>
                                <h3 className="text-2xl font-bold">{avgScore !== null ? `${avgScore}%` : "—"}</h3>
                                <p className="text-xs text-[--muted-foreground]">{t("studentPortal.dashboard.examsGraded", { count: marks.length })}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-purple-50 text-purple-600"><GraduationCap size={24} /></div>
                            <div>
                                <p className="text-sm font-medium text-[--muted-foreground]">{t("studentPortal.dashboard.classroom")}</p>
                                <h3 className="text-lg font-bold truncate max-w-[150px]">{classroomName}</h3>
                                <p className="text-xs text-[--muted-foreground]">{t("studentPortal.dashboard.courseLabel", { name: (student?.classRoomId as { courseId?: { name?: string } })?.courseId?.name ?? "—" })}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-orange-50 text-orange-600"><FileCheck size={24} /></div>
                            <div>
                                <p className="text-sm font-medium text-[--muted-foreground]">{t("studentPortal.dashboard.upcomingExams")}</p>
                                <h3 className="text-2xl font-bold">{upcomingExams}</h3>
                                <p className="text-xs text-[--muted-foreground]">{t("studentPortal.dashboard.next7Days")}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-teal-50 text-teal-600"><LayoutList size={24} /></div>
                            <div>
                                <p className="text-sm font-medium text-[--muted-foreground]">{t("studentPortal.dashboard.subjects")}</p>
                                <h3 className="text-2xl font-bold">{uniqueSubjects.length}</h3>
                                <p className="text-xs text-[--muted-foreground]">{(student?.classRoomId as { academicYear?: string })?.academicYear ?? t("studentPortal.dashboard.currentYear")}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle className="text-base">{t("studentPortal.dashboard.attendanceTrend")}</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {attendanceChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={attendanceChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} unit="%" />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="Attendance"
                                            stroke="var(--primary)"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: "var(--background)", strokeWidth: 2 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-[--muted-foreground] text-sm">
                                    {t("studentPortal.dashboard.noAttendanceData")}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Fees Summary or Other Chart can go here - placeholder for now */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle className="text-base">{t("studentPortal.dashboard.recentActivities")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {exams.slice(0, 3).map((exam) => (
                                    <div key={exam._id} className="flex items-center gap-3 pb-3 border-b border-[--border] last:border-0">
                                        <div className="p-2 rounded-full bg-orange-50 text-orange-600">
                                            <FileCheck size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{exam.name}</p>
                                            <p className="text-xs text-[--muted-foreground]">{formatDate(exam.date)} • {exam.startTime}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs capitalize">{exam.status}</Badge>
                                    </div>
                                ))}
                                {exams.length === 0 && (
                                    <div className="text-center py-4 text-sm text-[--muted-foreground]">{t("studentPortal.dashboard.noRecentActivities")}</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
