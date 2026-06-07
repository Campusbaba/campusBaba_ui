"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
    Sidebar, SidebarContent, SidebarGroup,
    SidebarGroupContent, SidebarHeader,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem,
    SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: string | number;
}

export interface NavGroup {
    label: string;
    icon: LucideIcon;
    items: NavItem[];
}

export type NavItemOrGroup = NavItem | NavGroup;

function isNavGroup(item: NavItemOrGroup): item is NavGroup {
    return "items" in item;
}

interface AppSidebarProps {
    role: "admin" | "teacher" | "parent" | "student";
    navItems: NavItemOrGroup[];
    logo?: React.ReactNode;
}

export function AppSidebar({ role, navItems }: AppSidebarProps) {
    const pathname = usePathname();
    const { isMobile, setOpenMobile } = useSidebar();
    const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
        // Auto-open the group whose child is active
        const active = new Set<string>();
        navItems.forEach(item => {
            if (isNavGroup(item) && item.items.some(c => pathname.startsWith(c.href))) {
                active.add(item.label);
            }
        });
        return active;
    });

    const roleLabel: Record<string, string> = {
        admin: "Administrator",
        teacher: "Teacher Portal",
        parent: "Parent Portal",
    };

    const toggleGroup = (label: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };

    const handleLinkClick = () => {
        if (isMobile) setOpenMobile(false);
    };

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-[--sidebar-border] px-3 py-3">
                {/* Expanded */}
                <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                    <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-[--sidebar-primary] text-[--sidebar-primary-foreground] font-bold text-sm shrink-0">
                        S
                    </span>
                    <div className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-[--sidebar-foreground] truncate">Schooler</span>
                        <span className="block text-[10px] text-[--sidebar-foreground]/50 capitalize">{roleLabel[role]}</span>
                    </div>
                </div>
                {/* Collapsed — show logo icon centered */}
                <div className="hidden group-data-[collapsible=icon]:flex justify-center">
                    <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-[--sidebar-primary] text-[--sidebar-primary-foreground] font-bold text-sm">
                        S
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item, index) => {
                                if (isNavGroup(item)) {
                                    const isOpen = openGroups.has(item.label);
                                    const hasActiveChild = item.items.some(child =>
                                        pathname === child.href ||
                                        (child.href !== `/${role}` && pathname.startsWith(child.href))
                                    );
                                    return (
                                        <SidebarMenuItem key={index}>
                                            <Collapsible
                                                open={isOpen}
                                                onOpenChange={() => toggleGroup(item.label)}
                                            >
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        isActive={hasActiveChild}
                                                        tooltip={item.label}
                                                        className={cn(
                                                            "w-full",
                                                            hasActiveChild &&
                                                            "bg-[--sidebar-primary] text-[--sidebar-primary-foreground] hover:bg-[--sidebar-primary]/90 hover:text-[--sidebar-primary-foreground]"
                                                        )}
                                                    >
                                                        <item.icon size={16} className="shrink-0" />
                                                        <span className="flex-1 text-left">{item.label}</span>
                                                        <ChevronDown
                                                            size={14}
                                                            className={cn(
                                                                "ml-auto shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                                                                isOpen && "rotate-180"
                                                            )}
                                                        />
                                                    </SidebarMenuButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <SidebarMenuSub>
                                                        {item.items.map(child => {
                                                            const active =
                                                                pathname === child.href ||
                                                                (child.href !== `/${role}` && pathname.startsWith(child.href));
                                                            return (
                                                                <SidebarMenuSubItem key={child.href}>
                                                                    <SidebarMenuSubButton
                                                                        asChild
                                                                        isActive={active}
                                                                        className={cn(
                                                                            active &&
                                                                            "bg-[--sidebar-primary] text-[--sidebar-primary-foreground] hover:bg-[--sidebar-primary]/90 hover:text-[--sidebar-primary-foreground]"
                                                                        )}
                                                                    >
                                                                        <Link href={child.href} onClick={handleLinkClick}>
                                                                            <child.icon size={14} />
                                                                            <span>{child.label}</span>
                                                                            {child.badge !== undefined && (
                                                                                <span className="ml-auto text-[10px] font-semibold bg-[--sidebar-primary] text-[--sidebar-primary-foreground] rounded-full px-1.5 py-0.5 min-w-4.5 text-center">
                                                                                    {child.badge}
                                                                                </span>
                                                                            )}
                                                                        </Link>
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            );
                                                        })}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </SidebarMenuItem>
                                    );
                                } else {
                                    const active =
                                        pathname === item.href ||
                                        (item.href !== `/${role}` && pathname.startsWith(item.href));
                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={active}
                                                tooltip={item.label}
                                                className={cn(
                                                    active &&
                                                    "bg-[--sidebar-primary] text-[--sidebar-primary-foreground] hover:bg-[--sidebar-primary]/90 hover:text-[--sidebar-primary-foreground]"
                                                )}
                                            >
                                                <Link href={item.href} onClick={handleLinkClick}>
                                                    <item.icon size={16} className="shrink-0" />
                                                    <span>{item.label}</span>
                                                    {item.badge !== undefined && (
                                                        <span className="ml-auto text-[10px] font-semibold bg-[--sidebar-primary] text-[--sidebar-primary-foreground] rounded-full px-1.5 py-0.5 min-w-4.5 text-center">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                }
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

        </Sidebar>
    );
}
