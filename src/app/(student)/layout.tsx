import { StudentSidebar } from "@/components/layout/StudentSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatBot } from "@/components/chatbot/ChatBot";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <StudentSidebar />
            <SidebarInset className="flex flex-col min-w-0 bg-[--background]">
                {children}
            </SidebarInset>
            <ChatBot />
        </SidebarProvider>
    );
}
