"use client";

import { useMemo, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { ReportStatCard } from "../_components/ReportStatCard";
import { DataTable } from "@/components/datatable/DataTable";
import { type ColumnDef } from "@tanstack/react-table";
import { TrendingUp } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useTranslation } from "react-i18next";
import { useExamMarks } from "@/hooks/useExamMarks";

// Dummy data for visual representation since fetching all cross-school exam marks requires heavy aggregation
// In a real scenario, this would be powered by a dedicated /reports/exams endpoint.
const EXAM_DATA = [
    { name: "Midterm 2024", avgScore: 78, passRate: 85, highest: 98 },
    { name: "Final 2024", avgScore: 82, passRate: 90, highest: 100 },
    { name: "Unit Test 1", avgScore: 75, passRate: 80, highest: 95 },
    { name: "Unit Test 2", avgScore: 79, passRate: 88, highest: 97 },
];

const GRADE_DISTRIBUTION = [
    { grade: "A+", count: 120 },
    { grade: "A", count: 200 },
    { grade: "B", count: 150 },
    { grade: "C", count: 80 },
    { grade: "F", count: 20 },
];

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

export default function ExamPerformancePage() {
    const { t } = useTranslation();
    const { examMarks } = useExamMarks();
    const [year, setYear] = useState(new Date().getFullYear());

    // We use dummy aggregated data to show a professional dashboard
    // since the standard hook requires specific Exam IDs to fetch marks.
    const averageScore = Math.round(EXAM_DATA.reduce((acc, curr) => acc + curr.avgScore, 0) / EXAM_DATA.length);
    const overallPassRate = Math.round(EXAM_DATA.reduce((acc, curr) => acc + curr.passRate, 0) / EXAM_DATA.length);

    type ExamRow = typeof EXAM_DATA[0];
    const columns: ColumnDef<ExamRow, unknown>[] = [
        { accessorKey: "name", header: t("reports.examName") },
        { accessorKey: "avgScore", header: t("reports.averageScore"), cell: ({ getValue }) => <span className="font-medium">{getValue() as number}%</span> },
        { accessorKey: "passRate", header: t("reports.passRate"), cell: ({ getValue }) => <span className="text-emerald-500 font-medium">{getValue() as number}%</span> },
        { accessorKey: "highest", header: t("reports.highestScore") },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <>
            <Header title={t("common.pages.examPerformance")} />
            <div className="p-4 sm:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="text-violet-500" /> 
                            {t("reports.examPerformanceTitle")}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">{t("reports.examPerformanceDesc")}</p>
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
                <ReportStatCard title={t("reports.overallAverageScore")} value={`${averageScore}%`} color="text-violet-600" />
                <ReportStatCard title={t("reports.overallPassRate")} value={`${overallPassRate}%`} color="text-emerald-500" />
                <ReportStatCard title={t("reports.totalExamsConducted")} value={EXAM_DATA.length.toString()} color="text-blue-500" />
                <ReportStatCard title={t("reports.highestAchiever")} value="99%" color="text-amber-500" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card p-5 lg:col-span-2 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        {t("reports.averageScoresOverTime")}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={EXAM_DATA}>
                            <defs>
                                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dx={-10} domain={[0, 100]} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`${value}%`, t("reports.averageScore")]}
                            />
                            <Area type="monotone" dataKey="avgScore" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAvg)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card p-5 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6">{t("reports.gradeDistribution")}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={GRADE_DISTRIBUTION}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="grade"
                            >
                                {GRADE_DISTRIBUTION.map((entry, index) => (
                                    <Cell key={entry.grade} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number, name: string) => [value, t("reports.gradeLabel", { name })]}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card shadow-sm border-gray-100 overflow-hidden">
                <DataTable
                    data={EXAM_DATA}
                    columns={columns}
                    title={t("reports.detailedExamBreakdown")}
                    exportFilename={`exam_performance_${year}`}
                    pageSize={10}
                />
            </div>
        </div>
        </>
    );
}
