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
import { Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import type { ClassRoom } from "@/types/viewModels";
import { useTranslation } from "react-i18next";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GENDER_COLORS = ["#6366f1", "#ec4899", "#f59e0b"];

export default function EnrollmentReportPage() {
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
        <>
            <Header title={t("reports.studentEnrollmentReport")} />
            <div className="p-4 sm:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="text-blue-500" />
                            {t("reports.studentEnrollmentReport")}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">{t("reports.enrollmentTrends")}</p>
                    </div>
                </div>
                <select
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="input text-sm h-10 w-full sm:w-32 bg-white border-gray-200 shadow-sm rounded-lg"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportStatCard title={t("reports.totalStudents")} value={allStudents.length.toLocaleString()} color="text-blue-500" />
                <ReportStatCard title={t("reports.enrolledIn", { year })} value={totalThisYear.toLocaleString()} color="text-violet-500" />
                <ReportStatCard
                    title={t("reports.male")}
                    value={(genderData.find(g => g.name === t("reports.male"))?.value ?? 0).toLocaleString()}
                    color="text-indigo-500"
                />
                <ReportStatCard
                    title={t("reports.female")}
                    value={(genderData.find(g => g.name === t("reports.female"))?.value ?? 0).toLocaleString()}
                    color="text-pink-500"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="card p-5 xl:col-span-2 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6">{t("reports.monthlyEnrollments")}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                            <Tooltip 
                                cursor={{ fill: '#f3f4f6' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="enrolled" fill="#6366f1" radius={[4, 4, 0, 0]} name={t("reports.enrolled")} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card p-5 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6">{t("reports.genderDistribution")}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={genderData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                dataKey="value"
                                nameKey="name"
                            >
                                {genderData.map((_, i) => (
                                    <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Class Distribution */}
            {classData.length > 0 && (
                <div className="card p-5 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6">{t("reports.enrollmentByClass")}</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={classData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={90} />
                            <Tooltip 
                                cursor={{ fill: '#f3f4f6' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
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
        </>
    );
}
