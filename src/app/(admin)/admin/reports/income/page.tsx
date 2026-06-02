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
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#ec4899", "#f97316"];

export default function IncomeReportPage() {
    const router = useRouter();
    const { payments } = usePayments();
    const [year, setYear] = useState(new Date().getFullYear());

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
        { accessorKey: "month", header: "Month" },
        { accessorKey: "amount", header: "Income (৳)", cell: ({ getValue }) => <span className="text-emerald-400">৳{(getValue() as number).toLocaleString()}</span> },
        { id: "pct", header: "% of Total", accessorFn: r => total ? `${((r.amount / total) * 100).toFixed(1)}%` : "—" },
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
                    <h1 className="text-xl font-bold text-[--foreground]">Income Report</h1>
                    <p className="text-xs text-[--muted-foreground]">All income sources breakdown</p>
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
                <ReportStatCard title="Total Income" value={`৳${total.toLocaleString()}`} color="text-emerald-400" />
                <ReportStatCard title="Monthly Average" value={`৳${Math.round(avg).toLocaleString()}`} />
                <ReportStatCard
                    title="Best Month"
                    value={best?.month ?? "—"}
                    sub={`৳${best?.amount.toLocaleString()}`}
                    color="text-blue-400"
                />
                <ReportStatCard title="Payment Types" value={String(categoryData.length)} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="card p-4 xl:col-span-2">
                    <h3 className="text-sm font-semibold mb-4">Monthly Income</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: any) => `৳${(v ?? 0).toLocaleString()}`} />
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#10b981"
                                fill="url(#incomeGrad)"
                                strokeWidth={2}
                                name="Income"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="card p-4">
                    <h3 className="text-sm font-semibold mb-4">By Payment Type</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="45%"
                                innerRadius={60}
                                outerRadius={90}
                                dataKey="value"
                                nameKey="name"
                            >
                                {categoryData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => `৳${(v ?? 0).toLocaleString()}`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <DataTable
                data={monthlyData}
                columns={incomeColumns}
                title="Monthly Breakdown"
                exportFilename={`income_${year}`}
                pageSize={12}
            />
        </div>
    );
}
