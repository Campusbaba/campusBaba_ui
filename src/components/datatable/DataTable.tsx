"use client";
import React, { useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState,
} from "@tanstack/react-table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ChevronUp, ChevronDown, ChevronsUpDown, FileText, Download, Copy, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T, unknown>[];
    title?: string;
    searchable?: boolean;
    pageSize?: number;
    exportFilename?: string;
}

function getCellValue<T>(row: T, col: ColumnDef<T, unknown>): string {
    const key = (col as { accessorKey?: string }).accessorKey;
    const fn = (col as { accessorFn?: (row: T) => unknown }).accessorFn;
    let val: unknown;
    if (fn) {
        val = fn(row);
    } else if (key) {
        val = (row as Record<string, unknown>)[key];
    } else {
        return "";
    }
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
}

function exportCSV<T>(data: T[], columns: ColumnDef<T, unknown>[], filename: string) {
    const exportCols = columns.filter((c) => c.id !== "actions");
    const headers = exportCols.map((c) => (typeof c.header === "string" ? c.header : c.id ?? ""));
    const rows = data.map((row) => exportCols.map((c) => getCellValue(row, c)));
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportPDF<T>(data: T[], columns: ColumnDef<T, unknown>[], filename: string, title: string) {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    const exportCols = columns.filter((c) => c.id !== "actions");
    const head = exportCols.map((c) => (typeof c.header === "string" ? c.header : c.id ?? ""));
    const body = data.map((row) => exportCols.map((c) => getCellValue(row, c)));
    autoTable(doc, { head: [head], body, startY: 22, styles: { fontSize: 9 }, headStyles: { fillColor: [59, 110, 248] } });
    doc.save(`${filename}.pdf`);
}

async function copyToClipboard<T>(data: T[], columns: ColumnDef<T, unknown>[], onDone: () => void) {
    const exportCols = columns.filter((c) => c.id !== "actions");
    const headers = exportCols.map((c) => (typeof c.header === "string" ? c.header : c.id ?? ""));
    const rows = data.map((row) => exportCols.map((c) => getCellValue(row, c)));
    const text = [headers, ...rows].map((r) => r.join("\t")).join("\n");
    await navigator.clipboard.writeText(text);
    onDone();
}

export function DataTable<T>({
    data,
    columns,
    title = "Table",
    searchable = true,
    pageSize = 10,
    exportFilename = "export",
}: DataTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [copied, setCopied] = useState(false);
    const [currentPageSize, setCurrentPageSize] = useState(pageSize);

    const table = useReactTable({
        data,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: currentPageSize } },
    });

    // Read fresh at call time — memo([table]) is stale because the table ref never changes
    const getAllRows = () => table.getFilteredRowModel().rows.map((r) => r.original);

    return (
        <div className="card p-0 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-[--border]">
                <h3 className="text-sm font-semibold text-[--foreground]">{title}</h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {searchable && (
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--muted-foreground]" />
                            <Input
                                placeholder="Search…"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="pl-8 h-8 w-full sm:w-44 text-xs"
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(getAllRows(), columns, () => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
                            <Copy size={13} /> {copied ? "Copied!" : "Copy"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportCSV(getAllRows(), columns, exportFilename)}>
                            <Download size={13} /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportPDF(getAllRows(), columns, exportFilename, title)}>
                            <FileText size={13} /> PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-[--border]">
                {table.getRowModel().rows.length === 0 ? (
                    <div className="text-center py-8 text-[--muted-foreground] text-sm">No records found</div>
                ) : (
                    table.getRowModel().rows.map((row) => (
                        <div key={row.id} className="p-4 space-y-2">
                            {row.getVisibleCells().filter((cell) => cell.column.id !== "actions").map((cell) => {
                                const hdr = cell.column.columnDef.header;
                                const label = typeof hdr === "string" ? hdr : cell.column.id;
                                return (
                                    <div key={cell.id} className="flex items-start justify-between gap-3 text-sm">
                                        <span className="font-medium text-[--muted-foreground] shrink-0 min-w-22.5">{label}</span>
                                        <span className="text-right text-[--foreground] break-all">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </span>
                                    </div>
                                );
                            })}
                            {row.getVisibleCells().filter((cell) => cell.column.id === "actions").map((cell) => (
                                <div key={cell.id} className="pt-2 border-t border-[--border] flex justify-end">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="dt-table">
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id}>
                                {hg.headers.map((header) => (
                                    <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={cn(header.column.getCanSort() && "cursor-pointer select-none")}>
                                        <span className="inline-flex items-center gap-1">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getCanSort() && (
                                                header.column.getIsSorted() === "asc" ? <ChevronUp size={13} /> :
                                                    header.column.getIsSorted() === "desc" ? <ChevronDown size={13} /> :
                                                        <ChevronsUpDown size={13} className="opacity-40" />
                                            )}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-8 text-[--muted-foreground] text-sm">
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-[--border] text-sm text-[--muted-foreground]">
                <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                        value={currentPageSize === Infinity ? "all" : currentPageSize}
                        onChange={e => {
                            const val = e.target.value;
                            const size = val === "all" ? Infinity : Number(val);
                            setCurrentPageSize(size);
                            table.setPageSize(size === Infinity ? Math.max(table.getFilteredRowModel().rows.length, 1) : size);
                            table.setPageIndex(0);
                        }}
                        className="h-7 rounded-md border border-[--border] bg-[--card] text-xs px-2 outline-none cursor-pointer"
                    >
                        {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                        <option value="all">All</option>
                    </select>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:gap-4">
                    <span>
                        {table.getFilteredRowModel().rows.length} record{table.getFilteredRowModel().rows.length !== 1 && "s"}
                        {currentPageSize !== Infinity && (
                            <> &middot; Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</>
                        )}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage() || currentPageSize === Infinity}>
                            <ChevronLeft size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage() || currentPageSize === Infinity}>
                            <ChevronRight size={15} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
