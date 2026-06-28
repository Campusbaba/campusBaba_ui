import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatBot } from "@/components/chatbot/ChatBot";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <TeacherSidebar />
            <SidebarInset className="flex flex-col min-w-0 bg-[--background]">
                {children}
            </SidebarInset>
            <ChatBot />
        </SidebarProvider>
    );
}
