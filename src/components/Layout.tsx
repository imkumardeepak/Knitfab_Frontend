import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import Footer from "./Footer";
import { SidebarProvider, useSidebar } from "../contexts/SidebarContext";

const Layout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

const LayoutContent = () => {
  const { isMobileSidebarOpen, toggleMobileSidebar } =
    useSidebar();

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="shrink-0">
        <TopHeader />
      </div>
      
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex h-full border-r shrink-0">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={toggleMobileSidebar}
            />
            <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r">
              <Sidebar />
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0 h-full relative">
          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-gray-50/30 flex flex-col relative">
            <div className="w-full p-4 sm:p-6 md:p-8 flex-1">
              <Outlet />
            </div>
            
            <div className="shrink-0 w-full mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;