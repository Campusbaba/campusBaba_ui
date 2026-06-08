"use client";
import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { FormDialog } from "@/components/reusable/FormDialog";
import { ConfirmDialog } from "@/components/reusable/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { useParents } from "@/hooks/useParents";
import { Parent } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

type TF = {
    firstName: string; lastName: string; email: string; phone: string; occupation: string; relationship: string;
    street: string; city: string; state: string; zipCode: string; country: string;
};
const blank: TF = {
    firstName: "", lastName: "", email: "", phone: "", occupation: "", relationship: "father",
    street: "", city: "", state: "", zipCode: "", country: ""
};

export default function ParentsPage() {
    const { t } = useTranslation();
    const { parents, loading, pagination, createParent, updateParent, deleteParent } = useParents();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Parent | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Parent | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    const basicFields = [
        { key: "firstName" as keyof TF, label: t("parents.firstName"), type: "text", required: true },
        { key: "lastName" as keyof TF, label: t("parents.lastName"), type: "text", required: true },
        { key: "email" as keyof TF, label: t("parents.email"), type: "email", required: true },
        { key: "phone" as keyof TF, label: t("parents.phone"), type: "text", required: true },
        { key: "occupation" as keyof TF, label: t("parents.occupation"), type: "text", required: false },
    ];

    const addressFields = [
        { key: "street" as keyof TF, label: t("parents.street"), required: true },
        { key: "city" as keyof TF, label: t("parents.city"), required: true },
        { key: "state" as keyof TF, label: t("parents.state"), required: true },
        { key: "zipCode" as keyof TF, label: t("parents.zipCode"), required: true },
        { key: "country" as keyof TF, label: t("parents.country"), required: true },
    ];

    const relationshipOptions = [
        { value: "father", label: t("parents.father") },
        { value: "mother", label: t("parents.mother") },
        { value: "guardian", label: t("parents.guardian") },
    ];

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(p: Parent) {
        setEditing(p);
        setForm({
            firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone,
            occupation: p.occupation ?? "", relationship: p.relationship,
            street: p.address?.street ?? "", city: p.address?.city ?? "", state: p.address?.state ?? "",
            zipCode: p.address?.zipCode ?? "", country: p.address?.country ?? ""
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload: any = {
                firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone,
                occupation: form.occupation, relationship: form.relationship,
                address: { street: form.street, city: form.city, state: form.state, zipCode: form.zipCode, country: form.country }
            };
            if (editing) { await updateParent(editing._id, payload); toast.success(t("parents.parentUpdated")); }
            else { await createParent(payload); toast.success(t("parents.parentAdded")); }
            setOpen(false);
        } catch { toast.error(t("parents.failedToSave")); } finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteParent(confirm._id); toast.success(t("parents.parentDeleted")); setConfirm(null); }
        catch { toast.error(t("parents.failedToDelete")); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Parent, unknown>[] = [
        {
            id: "parentId", accessorKey: "parentId", header: t("parents.parentId"),
            cell: ({ getValue }) => <span className="font-mono text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded">{String(getValue() ?? "—")}</span>
        },
        {
            id: "name", header: t("parents.name"), accessorFn: r => `${r.firstName} ${r.lastName}`,
            cell: ({ row: { original: r } }) => (<div className="flex items-center gap-2"><div><p className="font-medium text-sm">{r.firstName} {r.lastName}</p><p className="text-xs text-[--muted-foreground]">{r.email}</p></div></div>)
        },
        { id: "phone", accessorKey: "phone", header: t("parents.phone") },
        { id: "relationship", accessorKey: "relationship", header: t("parents.relationship") },
        { id: "occupation", accessorKey: "occupation", header: t("parents.occupation") },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title={t("common.pages.parents")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("parents.allParents")}</h2><p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} {t("common.fields.total")}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("parents.addParent")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={parents} columns={columns} title={t("common.pages.parents")} exportFilename="parents" />}
            </main>
            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("parents.editParent") : t("parents.addParent")}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        {basicFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && "*"}</Label>
                                <Input
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={e => f(field.key, e.target.value)}
                                    required={field.required}
                                />
                            </div>
                        ))}
                        <div>
                            <Label>{t("parents.relationshipLabel")}</Label>
                            <FormCombobox
                                items={relationshipOptions}
                                value={form.relationship}
                                onValueChange={v => f("relationship", v)}
                                placeholder={t("parents.selectRelationship")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        <div className="col-span-2"><p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mt-2">{t("parents.address")}</p></div>
                        {addressFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && "*"}</Label>
                                <Input
                                    value={form[field.key]}
                                    onChange={e => f(field.key, e.target.value)}
                                    required={field.required}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>{t("common.operations.cancel")}</Button>
                        <Button size="sm" type="submit" disabled={busy}>{busy ? t("common.operations.saving") : editing ? t("common.operations.update") : t("common.operations.create")}</Button>
                    </div>
                </form>
            </FormDialog>
            <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} loading={busy}
                message={t("parents.deleteConfirm", { firstName: confirm?.firstName ?? "", lastName: confirm?.lastName ?? "" })} />
        </>
    );
}
