import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  // Get initial sidebar collapse state from localStorage
  const getInitialSidebarState = (): boolean => {
    try {
      const stored = localStorage.getItem('sidebar_collapsed');
      return stored ? JSON.parse(stored) : false;
    } catch (error) {
      console.error('Error reading sidebar state from localStorage:', error);
      return false;
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(getInitialSidebarState);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Save sidebar collapse state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
    } catch (error) {
      console.error('Error saving sidebar state to localStorage:', error);
    }
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const value = {
    isSidebarCollapsed,
    isMobileSidebarOpen,
    toggleSidebar,
    toggleMobileSidebar,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};
