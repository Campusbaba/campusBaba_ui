"use client";

import { useState, useMemo } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from "recharts";
import { ReportStatCard } from "../_components/ReportStatCard";
import { DataTable } from "@/components/datatable/DataTable";
import { type ColumnDef } from "@tanstack/react-table";
import { usePayments } from "@/hooks/usePayments";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useTranslation } from "react-i18next";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#ec4899", "#f97316"];

export default function IncomeReportPage() {
    const { payments } = usePayments();
    const [year, setYear] = useState(new Date().getFullYear());
    const { t } = useTranslation();

    const paidPayments = useMemo(
        () => (payments ?? []).filter(p => p.paymentStatus === "paid"),
        [payments]
    );

    const monthlyData = useMemo(() =>
        MONTHS.map((month, i) => ({
            month,
            amount: paidPayments
                .filter(p => {
                    const d = new Date(p.paidDate ?? p.createdAt);
                    return d.getFullYear() === year && d.getMonth() === i;
                })
                .reduce((s, p) => s + (p.amount ?? 0), 0),
        })),
        [paidPayments, year]
    );

    const categoryData = useMemo(() => {
        const map: Record<string, number> = {};
        paidPayments
            .filter(p => {
                const d = new Date(p.paidDate ?? p.createdAt);
                return d.getFullYear() === year;
            })
            .forEach(p => {
                const k = p.paymentType ?? "other";
                map[k] = (map[k] ?? 0) + (p.amount ?? 0);
            });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [paidPayments, year]);

    const total = monthlyData.reduce((s, r) => s + r.amount, 0);
    const avg = total / 12;
    const best = [...monthlyData].sort((a, b) => b.amount - a.amount)[0];

    type IncomeRow = typeof monthlyData[0];
    const incomeColumns: ColumnDef<IncomeRow, unknown>[] = [
        { accessorKey: "month", header: t("reports.month") },
        { accessorKey: "amount", header: t("reports.incomeTaka"), cell: ({ getValue }) => <span className="text-emerald-400">৳{(getValue() as number).toLocaleString()}</span> },
        { id: "pct", header: t("reports.percentOfTotal"), accessorFn: r => total ? `${((r.amount / total) * 100).toFixed(1)}%` : "—" },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <>
            <Header title={t("reports.incomeReport")} />
            <div className="p-4 sm:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign className="text-emerald-500" />
                            {t("reports.incomeReportTitle")}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">{t("reports.allIncomeSources")}</p>
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
                <ReportStatCard title={t("reports.totalIncome")} value={`৳${total.toLocaleString()}`} color="text-emerald-500" />
                <ReportStatCard title={t("reports.monthlyAverage")} value={`৳${Math.round(avg).toLocaleString()}`} color="text-violet-500" />
                <ReportStatCard
                    title={t("reports.bestMonth")}
                    value={best?.month ?? "—"}
                    sub={`৳${best?.amount.toLocaleString()}`}
                    color="text-blue-500"
                />
                <ReportStatCard title={t("reports.paymentTypes")} value={String(categoryData.length)} color="text-amber-500" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="card p-5 xl:col-span-2 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6">{t("reports.monthlyIncome")}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(v: any) => [`৳${(v ?? 0).toLocaleString()}`, t("reports.incomeLabel")]} 
                            />
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#10b981"
                                fill="url(#incomeGrad)"
                                strokeWidth={3}
                                name={t("reports.incomeLabel")}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="card p-5 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6">{t("reports.byPaymentType")}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                dataKey="value"
                                nameKey="name"
                            >
                                {categoryData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(v: any) => `৳${(v ?? 0).toLocaleString()}`} 
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card shadow-sm border-gray-100 overflow-hidden">
                <DataTable
                    data={monthlyData}
                    columns={incomeColumns}
                    title={t("reports.monthlyBreakdown")}
                    exportFilename={`income_${year}`}
                    pageSize={12}
                />
            </div>
        </div>
        </>
    );
}
