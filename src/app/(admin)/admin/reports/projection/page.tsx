"use client";

import { useMemo, useState } from "react";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { ReportStatCard } from "../_components/ReportStatCard";
import { DataTable } from "@/components/datatable/DataTable";
import { type ColumnDef } from "@tanstack/react-table";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { useStudents } from "@/hooks/useStudents";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Simple linear regression projection for N future months */
function projectNext(values: number[], n: number): number[] {
    const nonZero = values.filter(v => v > 0);
    if (nonZero.length < 2) return Array(n).fill(nonZero[0] ?? 0);
    const len = values.length;
    const meanX = (len - 1) / 2;
    const meanY = values.reduce((a, b) => a + b, 0) / len;
    const ssXX = values.reduce((s, _, x) => s + (x - meanX) ** 2, 0);
    const ssXY = values.reduce((s, y, x) => s + (x - meanX) * (y - meanY), 0);
    const slope = ssXY / ssXX;
    const intercept = meanY - slope * meanX;
    return Array.from({ length: n }, (_, i) =>
        Math.max(0, Math.round(intercept + slope * (len + i)))
    );
}

export default function ProjectionPage() {
    const router = useRouter();
    const { expenses } = useExpenses();
    const { payments } = usePayments();
    const { students } = useStudents();
    const [growthRate, setGrowthRate] = useState(5);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const historicalData = useMemo(() => {
        return MONTHS.map((month, i) => {
            const income = (payments ?? [])
                .filter(p => {
                    const d = new Date(p.paidDate ?? p.createdAt);
                    return d.getFullYear() === currentYear && d.getMonth() === i && p.paymentStatus === "paid";
                })
                .reduce((s, p) => s + (p.amount ?? 0), 0);
            const expense = (expenses ?? [])
                .filter(e => {
                    const d = new Date(e.date ?? e.createdAt);
                    return d.getFullYear() === currentYear && d.getMonth() === i;
                })
                .reduce((s, e) => s + (e.amount ?? 0), 0);
            return { month, income, expense, profit: income - expense };
        });
    }, [expenses, payments, currentYear]);

    const projectedIncomes = useMemo(
        () => projectNext(historicalData.map(r => r.income), 6),
        [historicalData]
    );
    const projectedExpenses = useMemo(
        () => projectNext(historicalData.map(r => r.expense), 6),
        [historicalData]
    );

    const projectionData = useMemo(() =>
        Array.from({ length: 6 }, (_, i) => {
            const monthIdx = (currentMonth + 1 + i) % 12;
            const projIncome = Math.round(projectedIncomes[i] * (1 + growthRate / 100));
            const projExpense = projectedExpenses[i];
            return {
                month: `${MONTHS[monthIdx]}*`,
                income: projIncome,
                expense: projExpense,
                profit: projIncome - projExpense,
            };
        }),
        [projectedIncomes, projectedExpenses, currentMonth, growthRate]
    );

    const combinedData = [
        ...historicalData,
        ...projectionData,
    ];

    const totalProjectedIncome = projectionData.reduce((s, r) => s + r.income, 0);
    const totalProjectedExpense = projectionData.reduce((s, r) => s + r.expense, 0);
    const totalCurrentIncome = historicalData.reduce((s, r) => s + r.income, 0);

    type ProjRow = typeof projectionData[0];
    const projColumns: ColumnDef<ProjRow, unknown>[] = [
        { accessorKey: "month", header: "Month" },
        { accessorKey: "income", header: "Projected Income (৳)", cell: ({ getValue }) => <span className="text-emerald-400">৳{(getValue() as number).toLocaleString()}</span> },
        { accessorKey: "expense", header: "Projected Expense (৳)", cell: ({ getValue }) => <span className="text-rose-400">৳{(getValue() as number).toLocaleString()}</span> },
        { accessorKey: "profit", header: "Projected Profit (৳)", cell: ({ getValue }) => { const v = getValue() as number; return <span className={v >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>৳{v.toLocaleString()}</span>; } },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft size={16} />
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-[--foreground]">Business Projection</h1>
                    <p className="text-xs text-[--muted-foreground]">6-month forecast based on historical data + growth rate</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <TrendingUp size={14} className="text-[--muted-foreground]" />
                        <span className="text-[--muted-foreground] text-xs">Growth %</span>
                        <input
                            type="number"
                            value={growthRate}
                            min={-50}
                            max={200}
                            onChange={e => setGrowthRate(Number(e.target.value))}
                            className="input h-9 w-20 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportStatCard
                    title="YTD Income"
                    value={`৳${totalCurrentIncome.toLocaleString()}`}
                    color="text-emerald-400"
                />
                <ReportStatCard
                    title="Projected 6-mo Income"
                    value={`৳${totalProjectedIncome.toLocaleString()}`}
                    color="text-blue-400"
                    sub={`at ${growthRate}% growth`}
                />
                <ReportStatCard
                    title="Projected 6-mo Expense"
                    value={`৳${totalProjectedExpense.toLocaleString()}`}
                    color="text-rose-400"
                />
                <ReportStatCard
                    title="Total Students"
                    value={(students ?? []).length.toLocaleString()}
                    sub="active base"
                />
            </div>

            {/* Combined Chart */}
            <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Historical + 6-Month Projection</h3>
                    <span className="text-xs text-[--muted-foreground]">* = projected months</span>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={combinedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => `৳${(v ?? 0).toLocaleString()}`} />
                        <Legend />
                        <ReferenceLine
                            x={MONTHS[currentMonth]}
                            stroke="var(--primary)"
                            strokeDasharray="4 4"
                            label={{ value: "Now", fontSize: 10, fill: "var(--primary)" }}
                        />
                        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" opacity={0.85} />
                        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" opacity={0.85} />
                        <Line
                            type="monotone"
                            dataKey="profit"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            name="Net Profit"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <DataTable
                data={projectionData}
                columns={projColumns}
                title="6-Month Projection"
                exportFilename="business_projection"
                pageSize={6}
            />
        </div>
    );
}
