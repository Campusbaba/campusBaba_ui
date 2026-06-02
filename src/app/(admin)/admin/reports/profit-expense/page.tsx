"use client";

import { useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line, ResponsiveContainer,
} from "recharts";
import { ReportStatCard } from "../_components/ReportStatCard";
import { DataTable } from "@/components/datatable/DataTable";
import { type ColumnDef } from "@tanstack/react-table";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ProfitExpensePage() {
    const router = useRouter();
    const { expenses } = useExpenses();
    const { payments } = usePayments();
    const [year, setYear] = useState(new Date().getFullYear());

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
        { accessorKey: "month", header: "Month" },
        { accessorKey: "income", header: "Income (৳)", cell: ({ getValue }) => <span className="text-emerald-400">৳{(getValue() as number).toLocaleString()}</span> },
        { accessorKey: "expense", header: "Expense (৳)", cell: ({ getValue }) => <span className="text-rose-400">৳{(getValue() as number).toLocaleString()}</span> },
        { accessorKey: "profit", header: "Net Profit (৳)", cell: ({ getValue }) => { const v = getValue() as number; return <span className={v >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>৳{v.toLocaleString()}</span>; } },
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
                    <h1 className="text-xl font-bold text-[--foreground]">Profit / Expense Report</h1>
                    <p className="text-xs text-[--muted-foreground]">Annual income vs expense comparison</p>
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
                <ReportStatCard title="Total Income" value={`৳${totalIncome.toLocaleString()}`} color="text-emerald-400" />
                <ReportStatCard title="Total Expense" value={`৳${totalExpense.toLocaleString()}`} color="text-rose-400" />
                <ReportStatCard
                    title="Net Profit"
                    value={`৳${netProfit.toLocaleString()}`}
                    color={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}
                />
                <ReportStatCard
                    title="Profit Margin"
                    value={totalIncome ? `${((netProfit / totalIncome) * 100).toFixed(1)}%` : "—"}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="card p-4">
                    <h3 className="text-sm font-semibold mb-4">Income vs Expense</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: any) => `৳${(v ?? 0).toLocaleString()}`} />
                            <Legend />
                            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                            <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card p-4">
                    <h3 className="text-sm font-semibold mb-4">Net Profit Trend</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: any) => `৳${(v ?? 0).toLocaleString()}`} />
                            <Line
                                type="monotone"
                                dataKey="profit"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                name="Net Profit"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <DataTable
                data={chartData}
                columns={peColumns}
                title="Monthly Breakdown"
                exportFilename={`profit_expense_${year}`}
                pageSize={12}
            />
        </div>
    );
}
