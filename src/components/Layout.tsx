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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <TopHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex">
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
        <div className="flex flex-1 flex-col">
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      
      {/* Sticky Footer */}
      <Footer />
    </div>
  );
};

export default Layout;