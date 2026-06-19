"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Payment, Student, Course } from "@/types/viewModels";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Printer, Download, Share2, X } from "lucide-react";
import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────
interface InvoiceDialogProps {
    open: boolean;
    onClose: () => void;
    payment: Payment | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStudent(p: Payment): Student | null {
    return typeof p.studentId === "object" ? (p.studentId as Student) : null;
}
function getCourse(p: Payment): Course | null {
    return typeof p.courseId === "object" ? (p.courseId as Course) : null;
}
function statusColor(s: string) {
    switch (s) {
        case "paid": return "bg-emerald-100 text-emerald-700";
        case "pending": return "bg-yellow-100 text-yellow-700";
        case "overdue": return "bg-red-100 text-red-700";
        case "cancelled": return "bg-gray-100 text-gray-500";
        default: return "bg-gray-100 text-gray-500";
    }
}
function invoiceNumber(payment: Payment): string {
    return `INV-${payment._id.slice(-8).toUpperCase()}`;
}

// ─── Invoice Layout (also used for print/pdf) ─────────────────────────────────
function InvoiceLayout({ payment }: { payment: Payment }) {
    const student = getStudent(payment);
    const course = getCourse(payment);
    const inv = invoiceNumber(payment);
    
    const orgName = process.env.NEXT_PUBLIC_ORG_NAME || "Schooler";
    const orgSubTitle = process.env.NEXT_PUBLIC_ORG_SUBTITLE || "Education Management System";

    return (
        <div id="invoice-content" className="bg-white text-gray-900 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 leading-none">{orgName}</h1>
                            <p className="text-xs text-gray-500">{orgSubTitle}</p>
                        </div>
                    </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-3xl font-bold text-gray-900">INVOICE</p>
                    <p className="text-sm font-semibold text-gray-600 mt-1">{inv}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusColor(payment.paymentStatus)}`}>
                        {payment.paymentStatus}
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 mb-6" />

            {/* Bill To / Invoice Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
                    {student ? (
                        <>
                            <p className="text-base font-bold text-gray-900">{student.firstName} {student.lastName}</p>
                            {student.studentId && <p className="text-sm text-gray-500">ID: {student.studentId}</p>}
                            <p className="text-sm text-gray-500">{student.email}</p>
                            {student.phone && <p className="text-sm text-gray-500">{student.phone}</p>}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">{String(payment.studentId)}</p>
                    )}
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Invoice Details</p>
                    <table className="mr-auto sm:ml-auto text-sm">
                        <tbody>
                            <tr>
                                <td className="text-gray-500 pr-4 py-0.5">Issue Date</td>
                                <td className="font-medium text-gray-800">{formatDate(payment.createdAt)}</td>
                            </tr>
                            <tr>
                                <td className="text-gray-500 pr-4 py-0.5">Due Date</td>
                                <td className="font-medium text-gray-800">{formatDate(payment.dueDate)}</td>
                            </tr>
                            {payment.paidDate && (
                                <tr>
                                    <td className="text-gray-500 pr-4 py-0.5">Paid Date</td>
                                    <td className="font-medium text-emerald-600">{formatDate(payment.paidDate)}</td>
                                </tr>
                            )}
                            <tr>
                                <td className="text-gray-500 pr-4 py-0.5">Academic Year</td>
                                <td className="font-medium text-gray-800">{payment.academicYear}</td>
                            </tr>
                            <tr>
                                <td className="text-gray-500 pr-4 py-0.5">Semester</td>
                                <td className="font-medium text-gray-800">{payment.semester}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-8 overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                    <thead>
                        <tr className="bg-gray-900 text-white">
                            <th className="text-left px-4 py-3 rounded-tl-lg font-semibold">Description</th>
                            <th className="text-left px-4 py-3 font-semibold">Course</th>
                            <th className="text-left px-4 py-3 font-semibold">Method</th>
                            {payment.transactionId && (
                                <th className="text-left px-4 py-3 font-semibold">Txn ID</th>
                            )}
                            <th className="text-right px-4 py-3 rounded-tr-lg font-semibold">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-100">
                            <td className="px-4 py-4">
                                <p className="font-medium capitalize">{payment.paymentType} Fee</p>
                                <p className="text-xs text-gray-400 mt-0.5">Payment for {payment.semester}</p>
                            </td>
                            <td className="px-4 py-4 text-gray-600">
                                {course ? (
                                    <>
                                        <p className="font-medium">{course.name}</p>
                                        <p className="text-xs text-gray-400">{course.code}</p>
                                    </>
                                ) : "—"}
                            </td>
                            <td className="px-4 py-4 text-gray-600 capitalize">
                                {payment.paymentMethod ?? "—"}
                            </td>
                            {payment.transactionId && (
                                <td className="px-4 py-4 text-gray-500 text-xs font-mono">
                                    {payment.transactionId}
                                </td>
                            )}
                            <td className="px-4 py-4 text-right font-semibold">
                                {formatCurrency(payment.amount)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Total */}
            <div className="flex justify-start sm:justify-end mb-8">
                <div className="w-full sm:w-64">
                    <div className="flex justify-between py-2 text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(payment.amount)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm text-gray-500">
                        <span>Tax / Discount</span>
                        <span>—</span>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-3 flex justify-between text-base font-bold text-gray-900">
                        <span>Total</span>
                        <span>{formatCurrency(payment.amount)}</span>
                    </div>
                    {payment.paymentStatus === "paid" && (
                        <div className="mt-3 text-center py-2 bg-emerald-50 rounded-lg">
                            <span className="text-emerald-600 font-semibold text-sm">✓ Payment Received</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Remarks */}
            {payment.remarks && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Remarks</p>
                    <p className="text-sm text-gray-600">{payment.remarks}</p>
                </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                <p className="text-xs text-gray-400 text-center sm:text-left">Generated by {orgName} · {new Date().toLocaleDateString()}</p>
                <p className="text-xs text-gray-400">Invoice {inv}</p>
            </div>
        </div>
    );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────
export function InvoiceDialog({ open, onClose, payment }: InvoiceDialogProps) {
    const printRef = useRef<HTMLDivElement>(null);

    if (!payment) return null;
    const p: Payment = payment; // narrowed non-null reference for closures
    const student = getStudent(p);
    const inv = invoiceNumber(p);
    
    const orgName = process.env.NEXT_PUBLIC_ORG_NAME || "Schooler";
    const orgSubTitle = process.env.NEXT_PUBLIC_ORG_SUBTITLE || "Education Management System";

    // ── Print ─────────────────────────────────────────────────────────────────
    function handlePrint(type: "normal" | "thermal" = "normal") {
        let htmlContent = "";
        
        if (type === "thermal") {
            const course = getCourse(p);
            const studentName = student ? `${student.firstName} ${student.lastName}` : String(p.studentId);
            const thermalHtml = `
                <div style="width: 80mm; padding: 5mm; font-family: monospace; font-size: 12px; color: black; margin: 0 auto;">
                    <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 2px;">${orgName}</div>
                    <div style="text-align: center; font-size: 10px; margin-bottom: 10px;">${orgSubTitle}</div>
                    <div style="text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 10px;">INVOICE</div>
                    <div style="border-top: 1px dashed black; margin-bottom: 5px;"></div>
                    <div>Inv No: ${inv}</div>
                    <div>Date  : ${formatDate(p.createdAt)}</div>
                    <div>Student: ${studentName}</div>
                    ${student?.studentId ? `<div>ID     : ${student.studentId}</div>` : ''}
                    <div>Status: ${p.paymentStatus.toUpperCase()}</div>
                    <div style="border-top: 1px dashed black; margin-top: 5px; margin-bottom: 5px;"></div>
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>Item</span>
                        <span>Amount</span>
                    </div>
                    <div style="border-top: 1px dashed black; margin-top: 5px; margin-bottom: 5px;"></div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>${p.paymentType.charAt(0).toUpperCase() + p.paymentType.slice(1)} Fee</span>
                        <span>${formatCurrency(p.amount)}</span>
                    </div>
                    ${course ? `<div style="font-size: 10px;">Course: ${course.name}</div>` : ''}
                    <div style="border-top: 1px dashed black; margin-top: 10px; margin-bottom: 5px;"></div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
                        <span>TOTAL</span>
                        <span>${formatCurrency(p.amount)}</span>
                    </div>
                    <div style="border-top: 1px dashed black; margin-top: 5px; margin-bottom: 10px;"></div>
                    <div style="text-align: center; font-size: 10px;">Thank you!</div>
                    <div style="text-align: center; font-size: 10px;">Generated on ${new Date().toLocaleDateString()}</div>
                </div>
            `;
            const style = `
                <style>
                    @page { margin: 0; }
                    body { margin: 0; background: white; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                </style>
            `;
            htmlContent = style + thermalHtml;
        } else {
            const el = document.getElementById("invoice-content");
            if (!el) return;
            const style = `
                <style>
                    @page { margin: 20mm; }
                    body { font-family: sans-serif; color: #111; background: white; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                </style>
            `;
            htmlContent = style + el.outerHTML;
        }

        // Print using an iframe to avoid reloading the page
        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
            // Get all styles from parent window
            const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
                .map((el) => el.outerHTML)
                .join("");

            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    ${styles}
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `);
            iframeDoc.close();
            
            iframe.contentWindow?.focus();
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 500); // 500ms delay to allow external CSS links to load
        }
    }

    // ── PDF Download ──────────────────────────────────────────────────────────
    async function handleDownload() {
        const el = document.getElementById("invoice-content");
        if (!el) return;

        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const col = margin;
        let y = 20;

        // Header
        pdf.setFillColor(17, 17, 17);
        pdf.roundedRect(col, y, 12, 12, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("S", col + 4, y + 8);
        pdf.setTextColor(17, 17, 17);
        pdf.setFontSize(18);
        pdf.text(orgName, col + 16, y + 9);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(120, 120, 120);
        pdf.text(orgSubTitle, col + 16, y + 14);

        // Invoice label (right)
        pdf.setFontSize(22);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(17, 17, 17);
        pdf.text("INVOICE", pageWidth - margin, y + 9, { align: "right" });
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 100, 100);
        pdf.text(inv, pageWidth - margin, y + 15, { align: "right" });

        y += 28;
        pdf.setDrawColor(220, 220, 220);
        pdf.line(col, y, pageWidth - margin, y);
        y += 8;

        // Bill To
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(150, 150, 150);
        pdf.text("BILL TO", col, y);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(17, 17, 17);
        const name = student ? `${student.firstName} ${student.lastName}` : String(p.studentId);
        pdf.text(name, col, y + 7);
        if (student?.studentId) {
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(100, 100, 100);
            pdf.text(`ID: ${student.studentId}`, col, y + 13);
            pdf.text(student.email ?? "", col, y + 19);
        }

        // Invoice details (right column)
        const details: [string, string][] = [
            ["Issue Date", formatDate(p.createdAt)],
            ["Due Date", formatDate(p.dueDate)],
            ...(p.paidDate ? [["Paid Date", formatDate(p.paidDate)] as [string, string]] : []),
            ["Academic Year", p.academicYear],
            ["Semester", p.semester],
        ];
        let dy = y;
        for (const [label, val] of details) {
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(120, 120, 120);
            pdf.text(label, pageWidth - margin - 50, dy);
            pdf.setTextColor(17, 17, 17);
            pdf.setFont("helvetica", "bold");
            pdf.text(val, pageWidth - margin, dy, { align: "right" });
            dy += 6;
        }

        y += 32;

        // Table header
        pdf.setFillColor(17, 17, 17);
        pdf.roundedRect(col, y, pageWidth - margin * 2, 10, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Description", col + 3, y + 6.5);
        pdf.text("Course", col + 70, y + 6.5);
        pdf.text("Method", col + 110, y + 6.5);
        pdf.text("Amount", pageWidth - margin - 3, y + 6.5, { align: "right" });
        y += 14;

        // Table row
        pdf.setTextColor(17, 17, 17);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${p.paymentType.charAt(0).toUpperCase() + p.paymentType.slice(1)} Fee`, col + 3, y);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Payment for ${p.semester}`, col + 3, y + 5);

        const course = getCourse(p);
        pdf.setTextColor(17, 17, 17);
        pdf.setFontSize(9);
        pdf.text(course?.name ?? "—", col + 70, y);
        if (course?.code) {
            pdf.setFontSize(7);
            pdf.setTextColor(120, 120, 120);
            pdf.text(course.code, col + 70, y + 5);
        }
        pdf.setFontSize(9);
        pdf.setTextColor(17, 17, 17);
        pdf.text(p.paymentMethod ?? "—", col + 110, y);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text(formatCurrency(p.amount), pageWidth - margin - 3, y, { align: "right" });

        y += 14;
        pdf.setDrawColor(220, 220, 220);
        pdf.line(col, y, pageWidth - margin, y);
        y += 10;

        // Total
        const totalX = pageWidth - margin - 60;
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(120, 120, 120);
        pdf.text("Subtotal", totalX, y);
        pdf.text(formatCurrency(p.amount), pageWidth - margin, y, { align: "right" });
        y += 6;
        pdf.text("Tax / Discount", totalX, y);
        pdf.text("—", pageWidth - margin, y, { align: "right" });
        y += 4;
        pdf.setDrawColor(220, 220, 220);
        pdf.line(totalX, y, pageWidth - margin, y);
        y += 6;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(17, 17, 17);
        pdf.text("Total", totalX, y);
        pdf.text(formatCurrency(p.amount), pageWidth - margin, y, { align: "right" });

        if (p.paymentStatus === "paid") {
            y += 8;
            pdf.setFillColor(236, 253, 245);
            pdf.roundedRect(totalX - 2, y, pageWidth - margin - totalX + 2, 8, 2, 2, "F");
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(5, 150, 105);
            pdf.text("✓ Payment Received", (totalX + pageWidth - margin) / 2, y + 5.5, { align: "center" });
        }

        // Remarks
        if (p.remarks) {
            y += 16;
            pdf.setFillColor(248, 248, 248);
            pdf.roundedRect(col, y, pageWidth - margin * 2, 14, 2, 2, "F");
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(150, 150, 150);
            pdf.text("REMARKS", col + 3, y + 5);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(80, 80, 80);
            pdf.text(p.remarks, col + 3, y + 11);
        }

        // Footer
        const footerY = pdf.internal.pageSize.getHeight() - 15;
        pdf.setDrawColor(220, 220, 220);
        pdf.line(col, footerY - 4, pageWidth - margin, footerY - 4);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Generated by ${orgName} · ${new Date().toLocaleDateString()}`, col, footerY);
        pdf.text(inv, pageWidth - margin, footerY, { align: "right" });

        pdf.save(`${inv}.pdf`);
    }

    // ── WhatsApp Share ────────────────────────────────────────────────────────
    function handleWhatsApp() {
        const course = getCourse(p);
        const lines = [
            `📄 *PAYMENT INVOICE — ${inv}*`,
            ``,
            `👤 *Student:* ${student ? `${student.firstName} ${student.lastName}` : String(p.studentId)}`,
            student?.studentId ? `🆔 *Student ID:* ${student.studentId}` : "",
            `📚 *Course:* ${course ? `${course.name} (${course.code})` : String(p.courseId)}`,
            `💳 *Fee Type:* ${p.paymentType.charAt(0).toUpperCase() + p.paymentType.slice(1)}`,
            `💰 *Amount:* ${formatCurrency(p.amount)}`,
            `📅 *Due Date:* ${formatDate(p.dueDate)}`,
            p.paidDate ? `✅ *Paid Date:* ${formatDate(p.paidDate)}` : "",
            `🏫 *Academic Year:* ${p.academicYear} | ${p.semester}`,
            `📌 *Status:* ${p.paymentStatus.toUpperCase()}`,
            p.transactionId ? `🔖 *Transaction ID:* ${p.transactionId}` : "",
            p.remarks ? `📝 *Remarks:* ${p.remarks}` : "",
            ``,
            `_Powered by ${orgName}_`,
        ].filter(Boolean).join("\n");

        const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
        window.open(url, "_blank");
    }

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-50 flex flex-col"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    {/* Scrim */}
                    <div className="absolute inset-0 bg-black/50" onClick={onClose} />

                    {/* Panel */}
                    <div className="relative z-10 m-auto flex flex-col rounded-xl shadow-2xl overflow-hidden bg-white"
                        style={{ width: 720, maxWidth: "95vw", maxHeight: "92vh" }}
                    >
                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-b bg-gray-50 shrink-0 gap-3">
                            <p className="font-semibold text-sm text-gray-700">{inv}</p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => handlePrint("normal")} className="gap-1.5">
                                    <Printer size={14} /> Normal Print
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handlePrint("thermal")} className="gap-1.5">
                                    <Printer size={14} /> Thermal Print
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
                                    <Download size={14} /> PDF
                                </Button>
                                <Button size="sm" className="gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={handleWhatsApp}>
                                    <Share2 size={14} /> WhatsApp
                                </Button>
                                <Button size="icon" variant="ghost" onClick={onClose}><X size={16} /></Button>
                            </div>
                        </div>

                        {/* Invoice Preview */}
                        <div className="overflow-y-auto flex-1 p-3 sm:p-6 bg-gray-100">
                            <div
                                ref={printRef}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-10 mx-auto"
                                style={{ maxWidth: 640 }}
                            >
                                <InvoiceLayout payment={payment} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
