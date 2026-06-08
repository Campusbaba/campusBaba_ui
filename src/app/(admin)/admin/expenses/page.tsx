"use client";
import { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/reusable/FormDialog";
import { ConfirmDialog } from "@/components/reusable/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { useExpenses } from "@/hooks/useExpenses";
import { Expense } from "@/types/viewModels";
import { Plus, Pencil, Trash2, Zap, Wifi, Building2, Droplets, ShieldCheck, Wrench, GraduationCap, Phone } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useTranslation } from "react-i18next";

type TF = { category: string; subcategory: string; amount: string; description: string; date: string; paymentMethod: string; transactionId: string; status: string; remarks: string };
const blank: TF = { category: "other", subcategory: "", amount: "", description: "", date: "", paymentMethod: "cash", transactionId: "", status: "pending", remarks: "" };

const STATUS_COLORS: Record<string, string> = { pending: "#f59e0b", approved: "#3b82f6", paid: "#10b981", rejected: "#ef4444" };
const CATEGORY_COLORS: Record<string, string> = { salary: "#6366f1", fixed: "#0ea5e9", other: "#f59e0b" };
const SUB_CATEGORY_COLORS: Record<string, string> = {
    "salary - Staff Salary": "#6366f1",
    "fixed - Electricity Bill": "#facc15",
    "fixed - Internet Bill": "#0ea5e9",
    "fixed - Rent": "#8b5cf6",
    "fixed - Water Bill": "#06b6d4",
    "fixed - Communication": "#f43f5e",
    "fixed - Security Service": "#22c55e",
    "other - Maintenance": "#f97316",
};

type RecurringTemplate = { label: string; icon: React.ReactNode; category: string; subcategory: string; description: string; color: string };

export default function ExpensesPage() {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const { expenses, loading, pagination, createExpense, updateExpense, deleteExpense } = useExpenses();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Expense | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Expense | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    const basicFields: { key: keyof TF; label: string; type: string; required: boolean }[] = [
        { key: "subcategory", label: t("expenses.subcategory"), type: "text", required: false },
        { key: "amount", label: t("expenses.amount"), type: "number", required: true },
        { key: "date", label: t("expenses.date"), type: "date", required: false },
        { key: "transactionId", label: t("expenses.transactionId"), type: "text", required: false },
    ];

    const categoryOptions = [{ value: "salary", label: t("expenses.salary") }, { value: "fixed", label: t("expenses.fixed") }, { value: "other", label: t("expenses.other") }];
    const paymentMethodOptions = [{ value: "cash", label: t("expenses.cash") }, { value: "card", label: t("expenses.card") }, { value: "bank-transfer", label: t("expenses.bankTransfer") }, { value: "cheque", label: t("expenses.cheque") }];
    const statusOptions = [{ value: "pending", label: t("expenses.pendingStatus") }, { value: "approved", label: t("expenses.approved") }, { value: "paid", label: t("expenses.paid") }, { value: "rejected", label: t("expenses.rejected") }];

    const RECURRING_TEMPLATES: RecurringTemplate[] = [
        { label: t("expenses.electricity"), icon: <Zap size={18} />, category: "fixed", subcategory: "Electricity Bill", description: t("expenses.monthlyElectricityBill"), color: "text-yellow-500 bg-yellow-50" },
        { label: t("expenses.internet"), icon: <Wifi size={18} />, category: "fixed", subcategory: "Internet Bill", description: t("expenses.monthlyInternetBill"), color: "text-blue-500 bg-blue-50" },
        { label: t("expenses.rent"), icon: <Building2 size={18} />, category: "fixed", subcategory: "Rent", description: t("expenses.monthlyRentPayment"), color: "text-purple-500 bg-purple-50" },
        { label: t("expenses.water"), icon: <Droplets size={18} />, category: "fixed", subcategory: "Water Bill", description: t("expenses.monthlyWaterBill"), color: "text-cyan-500 bg-cyan-50" },
        { label: t("expenses.security"), icon: <ShieldCheck size={18} />, category: "fixed", subcategory: "Security Service", description: t("expenses.monthlySecurityService"), color: "text-green-500 bg-green-50" },
        { label: t("expenses.maintenance"), icon: <Wrench size={18} />, category: "other", subcategory: "Maintenance", description: t("expenses.monthlyMaintenanceCost"), color: "text-orange-500 bg-orange-50" },
        { label: t("expenses.staffSalary"), icon: <GraduationCap size={18} />, category: "salary", subcategory: "Staff Salary", description: t("expenses.monthlyStaffSalary"), color: "text-indigo-500 bg-indigo-50" },
        { label: t("expenses.phoneComm"), icon: <Phone size={18} />, category: "fixed", subcategory: "Communication", description: t("expenses.monthlyPhoneCommBill"), color: "text-rose-500 bg-rose-50" },
    ];

    // ── Derived stats ───────────────────────────────────────────────────────
    const now = new Date();
    const thisMonthExpenses = useMemo(() =>
        expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }),
        [expenses]
    );
    const totalThisMonth = useMemo(() => thisMonthExpenses.reduce((s, e) => s + (e.amount ?? 0), 0), [thisMonthExpenses]);
    const totalPaid = useMemo(() => expenses.filter(e => e.status === "paid").reduce((s, e) => s + (e.amount ?? 0), 0), [expenses]);
    const totalPending = useMemo(() => expenses.filter(e => e.status === "pending").reduce((s, e) => s + (e.amount ?? 0), 0), [expenses]);

    const categoryChartData = useMemo(() => {
        const map: Record<string, number> = {};
        expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    const subcategoryChartData = useMemo(() => {
        const map: Record<string, number> = {};
        expenses.forEach(e => { const key = `${e.category} - ${e.subcategory}`; map[key] = (map[key] ?? 0) + e.amount; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    const statusChartData = useMemo(() => {
        const map: Record<string, number> = {};
        expenses.forEach(e => { map[e.status] = (map[e.status] ?? 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    const monthlyChartData = useMemo(() => {
        const map: Record<string, number> = {};
        expenses.forEach(e => {
            const d = new Date(e.date);
            const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
            map[key] = (map[key] ?? 0) + e.amount;
        });
        return Object.entries(map).slice(-6).map(([month, total]) => ({ month, total }));
    }, [expenses]);

    const statusLabel = (status: string) => {
        const map: Record<string, string> = { pending: t("expenses.pendingStatus"), approved: t("expenses.approved"), paid: t("expenses.paid"), rejected: t("expenses.rejected") };
        return map[status] ?? status;
    };

    const categoryLabel = (cat: string) => {
        const map: Record<string, string> = { salary: t("expenses.salary"), fixed: t("expenses.fixed"), other: t("expenses.other") };
        return map[cat] ?? cat;
    };

    // ── Handlers ────────────────────────────────────────────────────────────
    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openFromTemplate(template: RecurringTemplate) {
        setEditing(null);
        setForm({ ...blank, category: template.category, subcategory: template.subcategory, description: template.description, date: new Date().toISOString().slice(0, 10) });
        setOpen(true);
    }
    function openEdit(ex: Expense) {
        setEditing(ex);
        setForm({
            category: ex.category, subcategory: ex.subcategory, amount: String(ex.amount),
            description: ex.description, date: ex.date?.slice(0, 10) ?? "",
            paymentMethod: ex.paymentMethod, transactionId: ex.transactionId ?? "",
            status: ex.status, remarks: ex.remarks ?? ""
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload = {
                ...form,
                amount: Number(form.amount),
                category: form.category as "salary" | "fixed" | "other",
                paymentMethod: form.paymentMethod as "cash" | "card" | "bank-transfer" | "cheque",
                status: form.status as "pending" | "approved" | "paid" | "rejected",
            };
            if (editing) { await updateExpense(editing._id, payload); toast.success(t("expenses.expenseUpdated")); }
            else { await createExpense(payload); toast.success(t("expenses.expenseAdded")); }
            setOpen(false);
        } catch { toast.error(t("expenses.failedToSave")); } finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteExpense(confirm._id); toast.success(t("expenses.expenseDeleted")); setConfirm(null); }
        catch { toast.error(t("expenses.failedToDelete")); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Expense, unknown>[] = [
        { id: "category", accessorKey: "category", header: t("expenses.category") },
        { id: "subcategory", accessorKey: "subcategory", header: t("expenses.subcategory") },
        { id: "amount", header: t("expenses.amount"), accessorFn: r => formatCurrency(r.amount) },
        { id: "paymentMethod", accessorKey: "paymentMethod", header: t("expenses.method") },
        { id: "date", header: t("expenses.date"), accessorFn: r => formatDate(r.date) },
        { id: "status", header: t("expenses.status"), accessorKey: "status", cell: ({ getValue }) => {
            const val = String(getValue());
            return <Badge variant={val === "approved" ? "default" : "secondary"}>{statusLabel(val)}</Badge>;
        } },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title={t("common.pages.expenses")} />
            <main className="p-5 space-y-5">

                {/* ── Stat Cards ───────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card p-4 space-y-1">
                        <p className="text-xs text-[--muted-foreground]">{t("expenses.thisMonth")}</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalThisMonth)}</p>
                        <p className="text-xs text-[--muted-foreground]">{t("expenses.expensesCount", { count: thisMonthExpenses.length })}</p>
                    </div>
                    <div className="card p-4 space-y-1">
                        <p className="text-xs text-[--muted-foreground]">{t("expenses.totalPaid")}</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="card p-4 space-y-1">
                        <p className="text-xs text-[--muted-foreground]">{t("expenses.pending")}</p>
                        <p className="text-2xl font-bold text-amber-500">{formatCurrency(totalPending)}</p>
                    </div>
                </div>

                {/* ── Charts ───────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card p-4">
                        <p className="text-xs font-semibold text-[--muted-foreground] mb-3">{t("expenses.monthlySpend")}</p>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card p-4">
                        <p className="text-xs font-semibold text-[--muted-foreground] mb-3">{t("expenses.byCategory")}</p>
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name }) => name} fontSize={11}>
                                    {categoryChartData.map((entry) => (
                                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? "#94a3b8"} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                                {!isMobile && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card p-4">
                        <p className="text-xs font-semibold text-[--muted-foreground] mb-3">{t("expenses.bySubcategory")}</p>
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie data={subcategoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name }) => name} fontSize={11}>
                                    {subcategoryChartData.map((entry) => (
                                        <Cell key={entry.name} fill={SUB_CATEGORY_COLORS[entry.name] ?? "#94a3b8"} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                                {!isMobile && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Status breakdown ─────────────────────────────────────── */}
                <div className="flex flex-wrap gap-3">
                    {statusChartData.map(s => (
                        <div key={s.name} className="card px-4 py-2 flex items-center gap-2 flex-1">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.name] ?? "#94a3b8" }} />
                            <span className="text-xs capitalize text-[--muted-foreground]">{statusLabel(s.name)}</span>
                            <span className="ml-auto text-sm font-semibold">{s.value}</span>
                        </div>
                    ))}
                </div>

                {/* ── Recurring Templates ──────────────────────────────────── */}
                <div>
                    <h3 className="text-sm font-semibold mb-3">{t("expenses.monthlyRecurring")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {RECURRING_TEMPLATES.map(template => (
                            <button key={template.label} onClick={() => openFromTemplate(template)}
                                className="card p-3 flex items-center gap-3 hover:border-[--primary] hover:shadow-sm transition-all text-left group">
                                <span className={`p-2 rounded-lg ${template.color}`}>{template.icon}</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{template.label}</p>
                                    <p className="text-xs text-[--muted-foreground] capitalize">{categoryLabel(template.category)}</p>
                                </div>
                                <Plus size={14} className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 text-[--primary] transition-opacity" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Table ────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("expenses.allExpenses")}</h2><p className="text-sm text-[--muted-foreground]">{t("expenses.total")} {pagination?.totalItems ?? 0}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("expenses.addExpense")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={expenses} columns={columns} title={t("expenses.allExpenses")} exportFilename="expenses" />}
            </main>

            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("expenses.editExpense") : t("expenses.addExpense")}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <Label>{t("expenses.category")}</Label>
                            <FormCombobox
                                items={categoryOptions}
                                value={form.category}
                                onValueChange={v => f("category", v)}
                                placeholder={t("expenses.selectCategory")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        {basicFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} />
                            </div>
                        ))}
                        <div>
                            <Label>{t("expenses.method")}</Label>
                            <FormCombobox
                                items={paymentMethodOptions}
                                value={form.paymentMethod}
                                onValueChange={v => f("paymentMethod", v)}
                                placeholder={t("expenses.selectPaymentMethod")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        <div>
                            <Label>{t("expenses.status")}</Label>
                            <FormCombobox
                                items={statusOptions}
                                value={form.status}
                                onValueChange={v => f("status", v)}
                                placeholder={t("expenses.selectStatus")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        <div className="col-span-2"><Label>{t("expenses.description")}</Label><Input value={form.description} onChange={e => f("description", e.target.value)} /></div>
                        <div className="col-span-2"><Label>{t("common.fields.remarks")}</Label><Input value={form.remarks} onChange={e => f("remarks", e.target.value)} /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>{t("common.operations.cancel")}</Button>
                        <Button size="sm" type="submit" disabled={busy}>{busy ? t("common.operations.saving") : editing ? t("common.operations.update") : t("common.operations.create")}</Button>
                    </div>
                </form>
            </FormDialog>
            <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} loading={busy}
                message={t("expenses.deleteConfirmMessage")} />
        </>
    );
}
