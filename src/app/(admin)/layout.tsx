import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatBot } from "@/components/chatbot/ChatBot";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset className="flex flex-col min-w-0 bg-[--background]">
                {children}
            </SidebarInset>
            <ChatBot />
        </SidebarProvider>
    );
}
