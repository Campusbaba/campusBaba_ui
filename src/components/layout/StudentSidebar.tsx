"use client";
import { LayoutDashboard, CreditCard, CalendarCheck, Clock, FilePen, ClipboardCheck, BookOpen } from "lucide-react";
import { AppSidebar } from "./Sidebar";

export function StudentSidebar() {
    return (
        <AppSidebar
            role="student"
            navItems={[
                { labelKey: "common.pages.dashboard", href: "/student/dashboard", icon: LayoutDashboard },
                { labelKey: "common.pages.payments", href: "/student/payments", icon: CreditCard },
                {
                    labelKey: "sidebar.groups.academics",
                    icon: BookOpen,
                    items: [
                        { labelKey: "sidebar.items.myRoutines", href: "/student/routines", icon: Clock },
                        { labelKey: "common.pages.attendance", href: "/student/attendance", icon: CalendarCheck },
                    ],
                },
                {
                    labelKey: "sidebar.groups.examManagement",
                    icon: FilePen,
                    items: [
                        { labelKey: "sidebar.items.examSchedule", href: "/student/exams", icon: FilePen },
                        { labelKey: "common.pages.exammarks", href: "/student/exams/marks", icon: ClipboardCheck },
                    ],
                },
            ]}
        />
    );
}
