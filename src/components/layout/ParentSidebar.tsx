"use client";
import { LayoutDashboard, Users, CreditCard, CalendarCheck, Clock, FilePen, ClipboardCheck, BookOpen } from "lucide-react";
import { AppSidebar } from "./Sidebar";

export function ParentSidebar() {
    return (
        <AppSidebar
            role="parent"
            navItems={[
                { labelKey: "common.pages.dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
                { labelKey: "sidebar.items.myChildren", href: "/parent/children", icon: Users },
                { labelKey: "common.pages.payments", href: "/parent/payments", icon: CreditCard },
                {
                    labelKey: "sidebar.groups.academics",
                    icon: BookOpen,
                    items: [
                        { labelKey: "sidebar.items.myRoutines", href: "/parent/routines", icon: Clock },
                        { labelKey: "common.pages.attendance", href: "/parent/attendance", icon: CalendarCheck },
                    ],
                },
                {
                    labelKey: "sidebar.groups.examManagement",
                    icon: FilePen,
                    items: [
                        { labelKey: "common.pages.exams", href: "/parent/exams", icon: FilePen },
                        { labelKey: "common.pages.exammarks", href: "/parent/exams/marks", icon: ClipboardCheck },
                    ],
                },
            ]}
        />
    );
}
