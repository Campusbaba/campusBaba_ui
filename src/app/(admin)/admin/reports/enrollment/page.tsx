"use client";

import { useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from "recharts";
import { ReportStatCard } from "../_components/ReportStatCard";
import { DataTable } from "@/components/datatable/DataTable";
import { type ColumnDef } from "@tanstack/react-table";
import { useStudents } from "@/hooks/useStudents";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ClassRoom } from "@/types/viewModels";
import { useTranslation } from "react-i18next";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GENDER_COLORS = ["#6366f1", "#ec4899", "#f59e0b"];

export default function EnrollmentReportPage() {
    const router = useRouter();
    const { students } = useStudents();
    const [year, setYear] = useState(new Date().getFullYear());
    const { t } = useTranslation();

    const allStudents = students ?? [];

    const monthlyData = useMemo(() =>
        MONTHS.map((month, i) => ({
            month,
            enrolled: allStudents.filter(s => {
                const d = new Date(s.enrollmentDate ?? s.createdAt);
                return d.getFullYear() === year && d.getMonth() === i;
            }).length,
        })),
        [allStudents, year]
    );

    const genderData = useMemo(() => {
        const male = allStudents.filter(s => s.gender === "male").length;
        const female = allStudents.filter(s => s.gender === "female").length;
        const other = allStudents.filter(s => s.gender === "other").length;
        return [
            { name: t("reports.male"), value: male },
            { name: t("reports.female"), value: female },
            ...(other > 0 ? [{ name: "Other", value: other }] : []),
        ];
    }, [allStudents, t]);

    const classData = useMemo(() => {
        const map: Record<string, number> = {};
        allStudents.forEach(s => {
            const cr = s.classRoomId as ClassRoom | string | undefined;
            const name = typeof cr === "object" && cr !== null ? cr.name : (cr ?? "Unassigned");
            map[name] = (map[name] ?? 0) + 1;
        });
        return Object.entries(map)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [allStudents]);

    const totalThisYear = monthlyData.reduce((s, r) => s + r.enrolled, 0);

    type EnrollRow = typeof monthlyData[0];
    const enrollColumns: ColumnDef<EnrollRow, unknown>[] = [
        { accessorKey: "month", header: t("reports.month") },
        { accessorKey: "enrolled", header: t("reports.enrolled"), cell: ({ getValue }) => <span className="text-blue-400 font-semibold">{String(getValue())}</span> },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft size={16} />
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-[--foreground]">{t("reports.studentEnrollmentReport")}</h1>
                    <p className="text-xs text-[--muted-foreground]">{t("reports.enrollmentTrends")}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <select
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        className="input text-sm h-9 w-28"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportStatCard title={t("reports.totalStudents")} value={allStudents.length.toLocaleString()} color="text-blue-400" />
                <ReportStatCard title={t("reports.enrolledIn", { year })} value={totalThisYear.toLocaleString()} />
                <ReportStatCard
                    title={t("reports.male")}
                    value={(genderData.find(g => g.name === t("reports.male"))?.value ?? 0).toLocaleString()}
                    color="text-indigo-400"
                />
                <ReportStatCard
                    title={t("reports.female")}
                    value={(genderData.find(g => g.name === t("reports.female"))?.value ?? 0).toLocaleString()}
                    color="text-pink-400"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="card p-4 xl:col-span-2">
                    <h3 className="text-sm font-semibold mb-4">{t("reports.monthlyEnrollments")}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="enrolled" fill="#6366f1" radius={[4, 4, 0, 0]} name={t("reports.enrolled")} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card p-4">
                    <h3 className="text-sm font-semibold mb-4">{t("reports.genderDistribution")}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={genderData}
                                cx="50%"
                                cy="45%"
                                innerRadius={60}
                                outerRadius={90}
                                dataKey="value"
                                nameKey="name"
                            >
                                {genderData.map((_, i) => (
                                    <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Class Distribution */}
            {classData.length > 0 && (
                <div className="card p-4">
                    <h3 className="text-sm font-semibold mb-4">{t("reports.enrollmentByClass")}</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={classData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} name={t("reports.students")} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <DataTable
                data={monthlyData}
                columns={enrollColumns}
                title={t("reports.monthlyBreakdown")}
                exportFilename={`enrollment_${year}`}
                pageSize={12}
            />
        </div>
    );
}
