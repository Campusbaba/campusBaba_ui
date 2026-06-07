"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RegisterUserModal } from "@/components/reusable/RegisterUserModal";
import { useDashboard } from "@/hooks/useDashboard";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
    GraduationCap, UserCheck, Briefcase, Clock,
    TrendingUp, UserPlus, CreditCard, Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types/viewModels";
import { useTranslation } from "react-i18next";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_COLORS: Record<string, string> = {
    active: "#22c55e", inactive: "#94a3b8", suspended: "#ef4444", graduated: "#3b6ef8",
    paid: "#22c55e", pending: "#f59e0b", overdue: "#ef4444", cancelled: "#94a3b8",
};
const PIE_COLORS = ["#3b6ef8", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ─── Raw API shapes ───────────────────────────────────────────────────────────
interface EnrollmentRaw { _id: { year: number; month: number }; count: number; }
interface ActiveRatioRaw { status: string; count: number; }
interface AttendanceRaw { date: string; attendanceRate: string | number; present: number; total: number; }
interface PaymentStatsByStatus { _id: string; count: number; totalAmount: number; }
interface PaymentStatsRaw { byStatus: PaymentStatsByStatus[]; totalRevenue: number; pendingAmount: number; }
interface ScheduleRaw {
    _id: string; subject: string; startTime: string; endTime: string;
    classRoomId?: { name: string; roomNumber: string };
    teacherId?: { firstName: string; lastName: string };
}

// ─── Shared empty chart placeholder ──────────────────────────────────────────
function EmptyChart() {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center h-50 text-[--muted-foreground]">
            <TrendingUp size={32} className="mb-2 opacity-20" />
            <p className="text-sm">{t("dashboard.noData")}</p>
        </div>
    );
}

// ─── Custom Pie % label ───────────────────────────────────────────────────────
function PiePctLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
}) {
    if (percent < 0.05) return null;
    const rad = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    return (
        <text x={cx + r * Math.cos(-midAngle * rad)} y={cy + r * Math.sin(-midAngle * rad)}
            fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg }: {
    label: string; value: string | number; icon: React.ElementType; color: string; bg: string;
}) {
    return (
        <Card>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-[--muted-foreground]">{label}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                    </div>
                    <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${bg}`}>
                        <Icon size={22} className={color} />
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const { t } = useTranslation();
    const { stats, enrollmentRatio, activeRatio, attendanceRatio, todaysSchedule, paymentStats } = useDashboard();

    const overview = stats.data as DashboardStats | null;
    const loading = stats.loading;
    const [registerOpen, setRegisterOpen] = useState(false);

    // ── Data transforms ───────────────────────────────────────────────────────

    // Enrollment trend: [{ _id:{year,month}, count }] → [{ month:"Jan '24", count }]
    const enrollmentTrend = (enrollmentRatio.data as EnrollmentRaw[] | null)
        ?.map(d => ({
            month: `${MONTH_NAMES[d._id.month - 1]} '${String(d._id.year).slice(2)}`,
            count: d.count,
        })) ?? [];

    // Student status pie: [{ status, count }] → [{ name, value, statusKey }]
    const studentStatusData = (activeRatio.data as ActiveRatioRaw[] | null)
        ?.map(d => ({
            name: t(`dashboard.${d.status.toLowerCase()}`, d.status.charAt(0).toUpperCase() + d.status.slice(1)),
            value: d.count,
            statusKey: d.status.toLowerCase(),
        })) ?? [];

    // Attendance trend: last 14 days → [{ date:"MM/DD", rate }]
    const attendanceTrend = (attendanceRatio.data as AttendanceRaw[] | null)
        ?.slice(-14)
        .map(d => ({
            date: d.date.slice(5).replace("-", "/"),
            rate: Number(Number(d.attendanceRate).toFixed(1)),
        })) ?? [];

    // Payment status: byStatus → [{ name, value, amount, fill }]
    const ps = paymentStats.data as PaymentStatsRaw | null;
    const paymentStatusData = (ps?.byStatus ?? []).map(s => ({
        name: t(`dashboard.${s._id.toLowerCase()}`, s._id.charAt(0).toUpperCase() + s._id.slice(1)),
        value: s.count,
        amount: s.totalAmount,
        fill: STATUS_COLORS[s._id.toLowerCase()] ?? "#94a3b8",
    }));

    // Today's schedule
    const schedule = (todaysSchedule.data as ScheduleRaw[] | null) ?? [];

    const statCards = [
        { label: t("dashboard.totalStudents"), value: overview?.studentsEnrolled ?? 0, icon: GraduationCap, color: "text-blue-500", bg: "bg-blue-50" },
        { label: t("dashboard.activeStudents"), value: overview?.activeStudents ?? 0, icon: UserCheck, color: "text-green-500", bg: "bg-green-50" },
        { label: t("dashboard.teachers"), value: overview?.teachersEnrolled ?? 0, icon: Briefcase, color: "text-yellow-500", bg: "bg-yellow-50" },
        { label: t("dashboard.classesToday"), value: overview?.todaysClasses ?? 0, icon: Clock, color: "text-red-500", bg: "bg-red-50" },
    ];

    return (
        <>
            <Header title="Dashboard" />
            <main className="p-5 space-y-6">
                {/* Top action bar */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-[--muted-foreground]">{t("dashboard.overview")}</p>
                    <Button size="sm" onClick={() => setRegisterOpen(true)}>
                        <UserPlus size={14} className="mr-2" />{t("dashboard.registerUser")}
                    </Button>
                </div>

                <RegisterUserModal open={registerOpen} onClose={() => setRegisterOpen(false)} />

                {/* ── Stat Cards ────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {statCards.map(s => (
                        <StatCard key={s.label} label={s.label}
                            value={loading ? "—" : s.value.toLocaleString()}
                            icon={s.icon} color={s.color} bg={s.bg}
                        />
                    ))}
                </div>

                {/* ── Payment Summary Mini-cards ─────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <span className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                                    <TrendingUp size={18} className="text-green-500" />
                                </span>
                                <div>
                                    <p className="text-xs text-[--muted-foreground]">{t("dashboard.totalRevenue")}</p>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(ps?.totalRevenue ?? 0)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <span className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                                    <CreditCard size={18} className="text-yellow-500" />
                                </span>
                                <div>
                                    <p className="text-xs text-[--muted-foreground]">{t("dashboard.pendingAmount")}</p>
                                    <p className="text-lg font-bold text-yellow-600">{formatCurrency(ps?.pendingAmount ?? 0)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <span className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Calendar size={18} className="text-blue-500" />
                                </span>
                                <div>
                                    <p className="text-xs text-[--muted-foreground]">{t("dashboard.activeTeachers")}</p>
                                    <p className="text-lg font-bold text-blue-600">{loading ? "—" : (overview?.activeTeachers ?? 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Charts Row 1: Enrollment Trend + Attendance ──────── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("dashboard.enrollmentTrend")}</CardTitle>
                            <p className="text-xs text-[--muted-foreground]">{t("dashboard.enrollmentTrendSub")}</p>
                        </CardHeader>
                        <CardContent>
                            {enrollmentTrend.length === 0 ? <EmptyChart /> : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={enrollmentTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                        <defs>
                                            <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b6ef8" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#3b6ef8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="count" name={t("dashboard.enrollments")}
                                            stroke="#3b6ef8" fill="url(#enrollGrad)" strokeWidth={2} dot={{ r: 3 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("dashboard.attendanceRate")}</CardTitle>
                            <p className="text-xs text-[--muted-foreground]">{t("dashboard.attendanceRateSub")}</p>
                        </CardHeader>
                        <CardContent>
                            {attendanceTrend.length === 0 ? <EmptyChart /> : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={attendanceTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                        <defs>
                                            <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                                        <Tooltip formatter={(v) => [`${v}%`, t("dashboard.attendance")]} />
                                        <Area type="monotone" dataKey="rate" name={t("dashboard.rate")}
                                            stroke="#22c55e" fill="url(#attendGrad)" strokeWidth={2} dot={{ r: 3 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Charts Row 2: Pie Charts ────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Student Status Pie */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("dashboard.statusBreakdown")}</CardTitle>
                            <p className="text-xs text-[--muted-foreground]">{t("dashboard.statusBreakdownSub")}</p>
                        </CardHeader>
                        <CardContent>
                            {studentStatusData.length === 0 ? <EmptyChart /> : (
                                <div className="flex items-center gap-6">
                                    <ResponsiveContainer width="55%" height={200}>
                                        <PieChart>
                                            <Pie data={studentStatusData} cx="50%" cy="50%"
                                                innerRadius={48} outerRadius={78} dataKey="value"
                                                labelLine={false} label={PiePctLabel as never} paddingAngle={3}>
                                                {studentStatusData.map((entry, i) => (
                                                    <Cell key={i} fill={STATUS_COLORS[entry.statusKey] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex flex-col gap-2.5 flex-1">
                                        {studentStatusData.map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ background: STATUS_COLORS[entry.statusKey] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                                                    <span className="text-[--muted-foreground]">{entry.name}</span>
                                                </div>
                                                <span className="font-semibold">{entry.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment Status Bar */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("dashboard.paymentOverview")}</CardTitle>
                            <p className="text-xs text-[--muted-foreground]">{t("dashboard.paymentOverviewSub")}</p>
                        </CardHeader>
                        <CardContent>
                            {paymentStatusData.length === 0 ? <EmptyChart /> : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={paymentStatusData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip formatter={(value, name) =>
                                            name === "value"
                                                ? [t("dashboard.paymentsCount", { count: value }), t("dashboard.count")]
                                                : [formatCurrency(Number(value)), t("dashboard.amount")]
                                        } />
                                        <Bar dataKey="value" name={t("dashboard.count")} radius={[4, 4, 0, 0]}>
                                            {paymentStatusData.map((entry, i) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Today's Schedule ──────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("dashboard.todaysSchedule")}</CardTitle>
                        <p className="text-xs text-[--muted-foreground]">{t("dashboard.todaysScheduleSub")}</p>
                    </CardHeader>
                    <CardContent>
                        {schedule.length === 0
                            ? (
                                <div className="flex flex-col items-center justify-center py-8 text-[--muted-foreground]">
                                    <Calendar size={32} className="mb-2 opacity-30" />
                                    <p className="text-sm">{t("dashboard.noClassesToday")}</p>
                                </div>
                            )
                            : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[--border]">
                                                {[t("dashboard.subject"), t("dashboard.time"), t("dashboard.room"), t("dashboard.teacher")].map((h, idx) => (
                                                    <th key={idx} className="text-left py-2 px-3 text-xs font-medium text-[--muted-foreground]">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedule.map(s => (
                                                <tr key={s._id} className="border-b border-[--border] last:border-0 hover:bg-[--muted]/30">
                                                    <td className="py-2.5 px-3 font-medium">{s.subject}</td>
                                                    <td className="py-2.5 px-3 text-[--muted-foreground]">{s.startTime} – {s.endTime}</td>
                                                    <td className="py-2.5 px-3 text-[--muted-foreground]">
                                                        {s.classRoomId ? `${s.classRoomId.name} (${s.classRoomId.roomNumber})` : "—"}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-[--muted-foreground]">
                                                        {s.teacherId ? `${s.teacherId.firstName} ${s.teacherId.lastName}` : "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                    </CardContent>
                </Card>
            </main>
        </>
    );
}