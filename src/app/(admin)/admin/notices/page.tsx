"use client";
import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/reusable/FormDialog";
import { ConfirmDialog } from "@/components/reusable/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { useNotices } from "@/hooks/useNotices";
import { useAuth } from "@/hooks/useAuth";
import { Notice } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type TF = {
    title: string;
    content: string;
    category: "general" | "academic" | "exam" | "event" | "holiday" | "urgent";
    targetAudience: ("student" | "parent" | "teacher" | "employee" | "all")[];
    publishDate: string;
    expiryDate: string;
    priority: "low" | "medium" | "high";
    status: "draft" | "published" | "archived";
    createdBy: string;
    createdByModel: "Teacher" | "Employee";
};
const blank: TF = { title: "", content: "", category: "general", targetAudience: ["all"], publishDate: "", expiryDate: "", priority: "medium", status: "draft", createdBy: "", createdByModel: "Employee" };

export default function NoticesPage() {
    const { t } = useTranslation();
    const { notices, loading, pagination, createNotice, updateNotice, deleteNotice } = useNotices();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Notice | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Notice | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    const dateFields: { key: keyof TF; label: string; type: string; required: boolean }[] = [
        { key: "publishDate", label: t("notices.publishDate"), type: "date", required: false },
        { key: "expiryDate", label: t("notices.expiryDate"), type: "date", required: false },
    ];

    const categoryOptions = [{ value: "general", label: t("notices.general") }, { value: "academic", label: t("notices.academic") }, { value: "exam", label: t("notices.exam") }, { value: "event", label: t("notices.event") }, { value: "holiday", label: t("notices.holiday") }, { value: "urgent", label: t("notices.urgent") }];
    const priorityOptions = [{ value: "low", label: t("notices.low") }, { value: "medium", label: t("notices.medium") }, { value: "high", label: t("notices.high") }];
    const statusOptions = [{ value: "draft", label: t("notices.draft") }, { value: "published", label: t("notices.publishedStatus") }, { value: "archived", label: t("notices.archived") }];
    const targetAudienceOptions = [{ value: "all", label: t("notices.all") }, { value: "student", label: t("notices.students") }, { value: "parent", label: t("notices.parents") }, { value: "teacher", label: t("notices.teachers") }, { value: "employee", label: t("notices.employees") }];

    const toggleAudience = (value: "student" | "parent" | "teacher" | "employee" | "all") => {
        setForm(p => {
            const current = p.targetAudience;
            if (current.includes(value)) {
                const filtered = current.filter(v => v !== value);
                return { ...p, targetAudience: filtered.length > 0 ? filtered : current };
            } else {
                return { ...p, targetAudience: [...current, value] as typeof p.targetAudience };
            }
        });
    };

    function openAdd() {
        setEditing(null);
        setForm({ ...blank, createdBy: user?.referenceId || "", createdByModel: "Employee" });
        setOpen(true);
    }
    function openEdit(n: Notice) {
        setEditing(n);
        setForm({
            title: n.title, content: n.content, category: n.category,
            targetAudience: Array.isArray(n.targetAudience) ? n.targetAudience : [n.targetAudience as "student" | "parent" | "teacher" | "employee" | "all"],
            publishDate: n.publishDate?.slice(0, 10) ?? "", expiryDate: n.expiryDate?.slice(0, 10) ?? "",
            priority: n.priority, status: n.status,
            createdBy: typeof n.createdBy === 'string' ? n.createdBy : (n.createdBy?._id || user?.referenceId || ""),
            createdByModel: (n as any).createdByModel ?? "Employee",
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload = { ...form };
            if (editing) {
                await updateNotice(editing._id, {
                    ...payload,
                    modifiedBy: user?.referenceId,
                    modifiedByModel: "Employee",
                });
                toast.success(t("notices.noticeUpdated"));
            }
            else { await createNotice(payload); toast.success(t("notices.noticePublished")); }
            setOpen(false);
        } catch { toast.error(t("notices.failedToSave")); } finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteNotice(confirm._id); toast.success(t("notices.noticeDeleted")); setConfirm(null); }
        catch { toast.error(t("notices.failedToDelete")); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Notice, unknown>[] = [
        { id: "title", accessorKey: "title", header: t("notices.title") },
        {
            id: "content", accessorKey: "content", header: t("notices.content"),
            cell: ({ getValue }) => (
                <textarea
                    readOnly
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm leading-snug focus:outline-none"
                    value={String(getValue())}
                />
            )
        },
        { id: "category", accessorKey: "category", header: t("notices.category") },
        { id: "targetAudience", header: t("notices.audience"), accessorFn: r => Array.isArray(r.targetAudience) ? r.targetAudience.join(", ") : String(r.targetAudience) },
        { id: "priority", header: t("notices.priority"), accessorKey: "priority", cell: ({ getValue }) => <Badge variant={String(getValue()) === "high" ? "destructive" : "default"}>{String(getValue())}</Badge> },
        { id: "createdBy", header: t("notices.createdBy"), accessorFn: r => typeof r.createdBy === "string" ? r.createdBy : `${(r.createdBy as any)?.firstName ?? ""} ${(r.createdBy as any)?.lastName ?? ""}`.trim() || "—" },
        {
            id: "modifiedBy", header: t("notices.modifiedBy"), accessorFn: r => {
                if (!r.modifiedBy) return "—";
                if (typeof r.modifiedBy === "object") return `${(r.modifiedBy as any).firstName ?? ""} ${(r.modifiedBy as any).lastName ?? ""}`.trim() || "—";
                return r.modifiedBy;
            }
        },
        { id: "publishDate", header: t("notices.published"), accessorFn: r => r.publishDate ? formatDate(r.publishDate) : "—" },
        { id: "expiryDate", header: t("notices.expires"), accessorFn: r => r.expiryDate ? formatDate(r.expiryDate) : "—" },
        { id: "status", header: t("notices.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "published" ? "default" : "secondary"}>{String(getValue())}</Badge> },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title={t("common.pages.notices")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("notices.allNotices")}</h2><p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} {t("common.fields.total")}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("notices.postNotice")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={notices} columns={columns} title={t("common.pages.notices")} exportFilename="notices" />}
            </main>
            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("notices.editNotice") : t("notices.postNotice")}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><Label>{t("notices.title")} *</Label><Input value={form.title} onChange={e => f("title", e.target.value)} required /></div>
                        <div>
                            <Label>{t("notices.category")}</Label>
                            <FormCombobox
                                items={categoryOptions}
                                value={form.category}
                                onValueChange={v => f("category", v)}
                                placeholder={t("notices.selectCategory")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        <div>
                            <Label>{t("notices.priority")}</Label>
                            <FormCombobox
                                items={priorityOptions}
                                value={form.priority}
                                onValueChange={v => f("priority", v)}
                                placeholder={t("notices.selectPriority")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        <div className="col-span-2">
                            <Label>{t("notices.targetAudience")} *</Label>
                            <div className="flex flex-wrap gap-4 mt-2">
                                {targetAudienceOptions.map(opt => (
                                    <div key={opt.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`audience-${opt.value}`}
                                            checked={form.targetAudience.includes(opt.value as "student" | "parent" | "teacher" | "employee" | "all")}
                                            onCheckedChange={() => toggleAudience(opt.value as "student" | "parent" | "teacher" | "employee" | "all")}
                                        />
                                        <label htmlFor={`audience-${opt.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                            {opt.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label>{t("notices.status")}</Label>
                            <FormCombobox
                                items={statusOptions}
                                value={form.status}
                                onValueChange={v => f("status", v)}
                                placeholder={t("notices.selectStatus")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        {dateFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} />
                            </div>
                        ))}
                        <div className="col-span-2"><Label>{t("notices.content")} *</Label><textarea className="flex min-h-20 w-full rounded border border-[--border] bg-[--card] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--ring]" value={form.content} onChange={e => f("content", e.target.value)} required /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>{t("common.operations.cancel")}</Button>
                        <Button size="sm" type="submit" disabled={busy}>{busy ? t("common.operations.saving") : editing ? t("common.operations.update") : t("notices.postNotice")}</Button>
                    </div>
                </form>
            </FormDialog>
            <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} loading={busy}
                message={t("notices.deleteConfirmMessage", { title: confirm?.title })} />
        </>
    );
}
