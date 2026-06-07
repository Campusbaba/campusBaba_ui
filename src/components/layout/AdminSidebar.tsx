"use client";
import { AppSidebar } from "./Sidebar";
import {
    LayoutDashboard, Users, GraduationCap, Briefcase, UserCheck,
    BookOpen, Building2, DoorOpen, CalendarCheck, Clock, FilePen,
    CreditCard, Wallet, Bell, BarChart3, TrendingDown, DollarSign, TrendingUp, ClipboardCheck,
} from "lucide-react";

export function AdminSidebar() {
    return (
        <AppSidebar
            role="admin"
            navItems={[
                { labelKey: "common.pages.dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
                {
                    labelKey: "sidebar.groups.users",
                    icon: Users,
                    items: [
                        { labelKey: "common.pages.students", href: "/admin/students", icon: GraduationCap },
                        { labelKey: "common.pages.teachers", href: "/admin/teachers", icon: UserCheck },
                        { labelKey: "common.pages.employees", href: "/admin/employees", icon: Briefcase },
                        { labelKey: "common.pages.parents", href: "/admin/parents", icon: Users },
                    ],
                },
                {
                    labelKey: "sidebar.groups.academics",
                    icon: BookOpen,
                    items: [
                        { labelKey: "common.pages.departments", href: "/admin/departments", icon: Building2 },
                        { labelKey: "common.pages.courses", href: "/admin/courses", icon: BookOpen },
                        { labelKey: "sidebar.items.classRooms", href: "/admin/classrooms", icon: DoorOpen },
                        { labelKey: "common.pages.attendance", href: "/admin/attendance", icon: CalendarCheck },
                        { labelKey: "common.pages.routines", href: "/admin/routines", icon: Clock },
                    ],
                },
                {
                    labelKey: "sidebar.groups.examManagement",
                    icon: FilePen,
                    items: [
                        { labelKey: "common.pages.exams", href: "/admin/exams", icon: FilePen },
                        { labelKey: "common.pages.exammarks", href: "/admin/exams/marks", icon: ClipboardCheck },
                    ],
                },
                {
                    labelKey: "sidebar.groups.paymentManagement",
                    icon: CreditCard,
                    items: [
                        { labelKey: "common.pages.payments", href: "/admin/payments", icon: CreditCard },
                    ],
                },
                {
                    labelKey: "sidebar.groups.expenseManagement",
                    icon: Wallet,
                    items: [
                        { labelKey: "common.pages.expenses", href: "/admin/expenses", icon: Wallet },
                    ],
                },
                {
                    labelKey: "sidebar.groups.noticeManagement",
                    icon: Bell,
                    items: [
                        { labelKey: "common.pages.notices", href: "/admin/notices", icon: Bell },
                    ],
                },
                {
                    labelKey: "sidebar.groups.reports",
                    icon: BarChart3,
                    items: [
                        { labelKey: "sidebar.items.profitExpense", href: "/admin/reports/profit-expense", icon: TrendingDown },
                        { labelKey: "common.pages.income", href: "/admin/reports/income", icon: DollarSign },
                        { labelKey: "common.pages.enrollment", href: "/admin/reports/enrollment", icon: Users },
                        { labelKey: "common.pages.projection", href: "/admin/reports/projection", icon: TrendingUp },
                    ],
                },
            ]}
        />
    );
}
