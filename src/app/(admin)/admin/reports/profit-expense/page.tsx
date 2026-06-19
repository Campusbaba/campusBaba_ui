"use client";

import { useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    AreaChart, Area, ResponsiveContainer,
} from "recharts";
import { ReportStatCard } from "../_components/ReportStatCard";
import { DataTable } from "@/components/datatable/DataTable";
import { type ColumnDef } from "@tanstack/react-table";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useTranslation } from "react-i18next";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ProfitExpensePage() {
    const { expenses } = useExpenses();
    const { payments } = usePayments();
    const [year, setYear] = useState(new Date().getFullYear());
    const { t } = useTranslation();

    const chartData = useMemo(() => {
        return MONTHS.map((month, i) => {
            const income = (payments ?? [])
                .filter(p => {
                    const d = new Date(p.paidDate ?? p.createdAt);
                    return d.getFullYear() === year && d.getMonth() === i && p.paymentStatus === "paid";
                })
                .reduce((s, p) => s + (p.amount ?? 0), 0);

            const expense = (expenses ?? [])
                .filter(e => {
                    const d = new Date(e.date ?? e.createdAt);
                    return d.getFullYear() === year && d.getMonth() === i;
                })
                .reduce((s, e) => s + (e.amount ?? 0), 0);

            return { month, income, expense, profit: income - expense };
        });
    }, [expenses, payments, year]);

    const totalIncome = chartData.reduce((s, r) => s + r.income, 0);
    const totalExpense = chartData.reduce((s, r) => s + r.expense, 0);
    const netProfit = totalIncome - totalExpense;

    type PERow = typeof chartData[0];
    const peColumns: ColumnDef<PERow, unknown>[] = [
        { accessorKey: "month", header: t("reports.month") },
        { accessorKey: "income", header: t("reports.incomeTaka"), cell: ({ getValue }) => <span className="text-emerald-400">৳{(getValue() as number).toLocaleString()}</span> },
        { accessorKey: "expense", header: t("reports.expenseTaka"), cell: ({ getValue }) => <span className="text-rose-400">৳{(getValue() as number).toLocaleString()}</span> },
        { accessorKey: "profit", header: t("reports.netProfitTaka"), cell: ({ getValue }) => { const v = getValue() as number; return <span className={v >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>৳{v.toLocaleString()}</span>; } },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <>
            <Header title={t("reports.profitExpenseReport")} />
            <div className="p-4 sm:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingDown className="text-rose-500" />
                            {t("reports.profitExpenseReportTitle")}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">{t("reports.annualComparison")}</p>
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
                <ReportStatCard title={t("reports.totalIncome")} value={`৳${totalIncome.toLocaleString()}`} color="text-emerald-500" />
                <ReportStatCard title={t("reports.totalExpense")} value={`৳${totalExpense.toLocaleString()}`} color="text-rose-500" />
                <ReportStatCard
                    title={t("reports.netProfit")}
                    value={`৳${netProfit.toLocaleString()}`}
                    color={netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}
                />
                <ReportStatCard
                    title={t("reports.profitMargin")}
                    value={totalIncome ? `${((netProfit / totalIncome) * 100).toFixed(1)}%` : "—"}
                    color="text-blue-500"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="card p-5 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6">{t("reports.incomeVsExpense")}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <Tooltip 
                                cursor={{ fill: '#f3f4f6' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(v: any) => `৳${(v ?? 0).toLocaleString()}`} 
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name={t("reports.incomeLabel")} />
                            <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name={t("reports.expenseLabel")} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card p-5 shadow-sm border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6">{t("reports.netProfitTrend")}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(v: any) => [`৳${(v ?? 0).toLocaleString()}`, t("reports.netProfit")]} 
                            />
                            <Area
                                type="monotone"
                                dataKey="profit"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorProfit)"
                                name={t("reports.netProfit")}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card shadow-sm border-gray-100 overflow-hidden">
                <DataTable
                    data={chartData}
                    columns={peColumns}
                    title={t("reports.monthlyBreakdown")}
                    exportFilename={`profit_expense_${year}`}
                    pageSize={12}
                />
            </div>
        </div>
        </>
    );
}
