"use client";

import { useMemo, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Legend
} from "recharts";
import { ReportStatCard } from "../_components/ReportStatCard";
import { DataTable } from "@/components/datatable/DataTable";
import { type ColumnDef } from "@tanstack/react-table";
import { ClipboardCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useTranslation } from "react-i18next";

// Dummy data for visual representation of historical analytics since fetching large sets of attendance across 
// the whole school requires backend aggregations (often missing in small ERP defaults).
const MONTHLY_ATTENDANCE = [
    { month: "Jan", present: 92, absent: 5, late: 3 },
    { month: "Feb", present: 94, absent: 4, late: 2 },
    { month: "Mar", present: 88, absent: 8, late: 4 },
    { month: "Apr", present: 95, absent: 3, late: 2 },
    { month: "May", present: 91, absent: 6, late: 3 },
    { month: "Jun", present: 96, absent: 2, late: 2 },
];

const WEEKLY_ATTENDANCE = [
    { day: "Mon", rate: 96 },
    { day: "Tue", rate: 94 },
    { day: "Wed", rate: 92 },
    { day: "Thu", rate: 91 },
    { day: "Fri", rate: 88 },
];

export default function AttendanceAnalyticsPage() {
    const { t } = useTranslation();
    const [year, setYear] = useState(new Date().getFullYear());

    const avgRate = 94;
    const totalDays = 113;
    const highestMonth = "Jun";
    const lowestMonth = "Jan";

    type AttendanceRow = typeof MONTHLY_ATTENDANCE[0];
    const columns: ColumnDef<AttendanceRow, unknown>[] = [
        { accessorKey: "month", header: t("reports.month") },
        { accessorKey: "totalDays", header: t("reports.totalDays") },
        { accessorKey: "present", header: t("reports.presentDays"), cell: ({ getValue }) => <span className="text-emerald-600 font-medium">{getValue() as number}</span> },
        { accessorKey: "excused", header: t("reports.excusedDays"), cell: ({ getValue }) => <span className="text-amber-600">{getValue() as number}</span> },
        { accessorKey: "unexcused", header: t("reports.unexcusedDays"), cell: ({ getValue }) => <span className="text-rose-600">{getValue() as number}</span> },
        { accessorKey: "rate", header: t("reports.attendanceRate"), cell: ({ getValue }) => <span className="font-bold">{getValue() as number}%</span> },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <>
            <Header title={t("common.pages.attendanceAnalytics")} />
            <div className="p-4 sm:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardCheck className="text-orange-500" /> 
                            {t("reports.attendanceAnalytics")}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">{t("reports.attendanceAnalyticsDesc")}</p>
                    </div>
                </div>
                <select
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="input text-sm h-10 w-full sm:w-32 bg-white border-gray-200 shadow-sm rounded-lg"
                >
                    {years.map(y => <option key={y} value={y}>{t("reports.academicYearParam", { year: y })}</option>)}
                </select>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportStatCard title={t("reports.averageAttendanceRate")} value={`${avgRate}%`} color="text-emerald-600" />
                <ReportStatCard title={t("reports.totalSchoolDays")} value={totalDays.toString()} color="text-blue-500" />
                <ReportStatCard title={t("reports.highestAttendanceMonth")} value={highestMonth} color="text-violet-500" />
                <ReportStatCard title={t("reports.lowestAttendanceMonth")} value={lowestMonth} color="text-rose-500" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card p-5 lg:col-span-2 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        {t("reports.monthlyAttendanceTrends")}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={MONTHLY_ATTENDANCE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 100]} />
                            <Tooltip 
                                cursor={{ fill: '#f3f4f6' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => `${value}`}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar dataKey="present" name={t("reports.presentDays")} stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="excused" name={t("reports.excusedDays")} stackId="a" fill="#f59e0b" />
                            <Bar dataKey="unexcused" name={t("reports.unexcusedDays")} stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card p-5 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6">{t("reports.absenceReasons")}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={WEEKLY_ATTENDANCE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} domain={[70, 100]} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [`${value}%`, t("reports.absencePercent")]}
                            />
                            <Area type="monotone" dataKey="rate" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card shadow-sm border-gray-100 overflow-hidden">
                <DataTable
                    data={MONTHLY_ATTENDANCE}
                    columns={columns}
                    title={t("reports.detailedAttendanceBreakdown")}
                    exportFilename={`attendance_analytics_${year}`}
                    pageSize={12}
                />
            </div>
        </div>
        </>
    );
}
