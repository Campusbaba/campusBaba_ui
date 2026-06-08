"use client";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePayments } from "@/hooks/usePayments";
import { useAttendance } from "@/hooks/useAttendance";
import { useParents } from "@/hooks/useParents";
import { useExams } from "@/hooks/useExams";
import { useExamMarks } from "@/hooks/useExamMarks";
import { useRoutines } from "@/hooks/useRoutines";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { CreditCard, CalendarCheck, GraduationCap, BookOpen, FileCheck, LayoutList } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildMonthlyChartData } from "@/utils/attendanceChart";
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

export default function ParentDashboard() {
    const { referenceId } = useAuth();
    const { children, childrenLoading, fetchChildren } = useParents({}, false);
    const { payments, loading: pLoading, fetchStudentPayments } = usePayments({}, false);
    const { attendances, loading: aLoading, fetchAttendances } = useAttendance({}, false);
    const { exams, fetchExamsByClassRooms } = useExams({}, false);
    const { marks, fetchStudentExamResults } = useExamMarks();
    const { routines, fetchRoutinesByClassRoom } = useRoutines({}, false);
    const { t } = useTranslation();
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");

    // Load children, default to first child
    useEffect(() => {
        if (!referenceId) return;
        fetchChildren(referenceId).then((kids) => {
            if (kids.length > 0) setSelectedStudentId(kids[0]._id);
        });
    }, [referenceId, fetchChildren]);

    // Re-fetch all data whenever selected child changes
    useEffect(() => {
        if (!selectedStudentId || children.length === 0) return;
        const student = children.find((c) => c._id === selectedStudentId);
        if (!student) return;

        fetchStudentPayments(selectedStudentId);
        fetchAttendances({ studentId: selectedStudentId, limit: 200 });
        fetchStudentExamResults(selectedStudentId);

        const classRoomId = typeof student.classRoomId === "string"
            ? student.classRoomId
            : (student.classRoomId as { _id?: string })?._id;
        if (classRoomId) {
            fetchExamsByClassRooms([classRoomId]);
            fetchRoutinesByClassRoom(classRoomId);
        }
    }, [selectedStudentId, children, fetchStudentPayments, fetchAttendances, fetchStudentExamResults, fetchExamsByClassRooms, fetchRoutinesByClassRoom]);

    const selectedStudent = children.find((c) => c._id === selectedStudentId);
    const classroomName = selectedStudent
        ? (selectedStudent.classRoomId as { name?: string })?.name ?? "—"
        : "—";

    const totalPaid = payments.filter((p) => p.paymentStatus === "paid").reduce((acc, p) => acc + p.amount, 0);
    const pendingAmount = payments.filter((p) => p.paymentStatus !== "paid").reduce((acc, p) => acc + p.amount, 0);
    const presentDays = attendances.filter((a) => a.status === "present").length;
    const totalDays = attendances.length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;
    const upcomingExams = exams.filter((e) => e.status === "scheduled").length;
    const validMarks = marks.filter((m) => (m.examId as { totalMarks?: number })?.totalMarks);
    const avgMarks = validMarks.length > 0
        ? Math.round(validMarks.reduce((acc, m) => acc + (m.marksObtained / ((m.examId as { totalMarks?: number })?.totalMarks ?? 100)) * 100, 0) / validMarks.length)
        : null;
    const uniqueSubjects = [...new Set(routines.map((r) => r.subject).filter(Boolean))];

    const monthlyChartData = useMemo(() => buildMonthlyChartData(attendances), [attendances]);

    const stats = [
        { label: t("parentPortal.dashboard.totalPaid"), value: formatCurrency(totalPaid), icon: CreditCard, color: "text-green-600", bg: "bg-green-50", sub: pendingAmount > 0 ? `${formatCurrency(pendingAmount)} ${t("parentPortal.dashboard.pending")}` : t("parentPortal.dashboard.allClear") },
        { label: t("parentPortal.dashboard.attendance"), value: attendanceRate !== null ? `${attendanceRate}%` : "—", icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50", sub: `${presentDays} / ${totalDays} days` },
        { label: t("parentPortal.dashboard.class"), value: classroomName, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50", sub: selectedStudent?.studentId ?? "" },
        { label: t("parentPortal.dashboard.upcomingExams"), value: String(upcomingExams), icon: FileCheck, color: "text-orange-600", bg: "bg-orange-50", sub: `${exams.length} total` },
        { label: t("parentPortal.dashboard.avgMarks"), value: avgMarks !== null ? `${avgMarks}%` : "—", icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50", sub: `${marks.length} ${t("parentPortal.dashboard.results")}` },
        { label: t("parentPortal.dashboard.subjects"), value: String(uniqueSubjects.length), icon: LayoutList, color: "text-teal-600", bg: "bg-teal-50", sub: uniqueSubjects.slice(0, 2).join(", ") || "—" },
    ];

    return (
        <>
            <Header title={t("parentPortal.dashboard.title")} />
            <main className="p-5 space-y-6">

                {/* Child selector */}
                {children.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-[--muted-foreground]">{t("parentPortal.dashboard.viewingStatsFor")}</span>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                            <SelectTrigger className="w-56"><SelectValue placeholder={t("parentPortal.dashboard.selectChild")} /></SelectTrigger>
                            <SelectContent>
                                {children.map((c) => (
                                    <SelectItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                    {stats.map((s) => (
                        <Card key={s.label}>
                            <CardContent className="pt-5">
                                <div className="flex flex-col gap-2">
                                    <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.bg}`}>
                                        <s.icon size={18} className={s.color} />
                                    </span>
                                    <div>
                                        <p className="text-xs text-[--muted-foreground]">{s.label}</p>
                                        <p className="text-xl font-bold text-[--foreground] mt-0.5">{childrenLoading ? "…" : s.value}</p>
                                        {s.sub && <p className="text-xs text-[--muted-foreground] mt-0.5 truncate">{s.sub}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle>{t("parentPortal.dashboard.recentPayments")}</CardTitle></CardHeader>
                        <CardContent>
                            {pLoading ? <p className="text-sm text-[--muted-foreground]">{t("parentPortal.dashboard.loading")}</p> : (
                                <div className="space-y-2">
                                    {payments.slice(0, 5).map((p, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-[--border] last:border-0">
                                            <div>
                                                <p className="text-sm text-[--foreground]">{p.paymentType}</p>
                                                <p className="text-xs text-[--muted-foreground]">{formatDate(p.dueDate)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-[--success]">{formatCurrency(p.amount)}</span>
                                                <Badge variant={p.paymentStatus === "paid" ? "default" : "secondary"}>{p.paymentStatus}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {payments.length === 0 && <p className="text-sm text-[--muted-foreground]">{t("parentPortal.dashboard.noPaymentsFound")}</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>{t("parentPortal.dashboard.monthlyAttendance")}</CardTitle></CardHeader>
                        <CardContent>
                            {aLoading ? (
                                <p className="text-sm text-[--muted-foreground]">{t("parentPortal.dashboard.loading")}</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={monthlyChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                                        <Tooltip formatter={(v: unknown) => [`${v}%`, t("parentPortal.dashboard.attendanceRate")]} />
                                        <Legend />
                                        <Line type="monotone" dataKey="Attendance Rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 5 }} connectNulls={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
