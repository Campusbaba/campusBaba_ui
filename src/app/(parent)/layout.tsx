import { ParentSidebar } from "@/components/layout/ParentSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatBot } from "@/components/chatbot/ChatBot";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <ParentSidebar />
            <SidebarInset className="flex flex-col min-w-0 bg-[--background]">
                {children}
            </SidebarInset>
            <ChatBot />
        </SidebarProvider>
    );
}
