import React, { useState, useEffect, type JSX } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Folder,
  ChevronLeft,
  ChevronRight,
  Cog,
  BarChart3,
  Shield,
  MessageSquare,
  Package,
  type LucideIcon,
  BaggageClaim,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { PAGE_NAMES } from '@/constants/pages';

type Icon = LucideIcon;

interface NavItem {
  title: string;
  href: string;
  icon: Icon;
  description: string;
  isParentOnly?: boolean;
  children?: NavItem[];
  badge?: string;
}

const navConfig: NavItem[] = [
  {
    title: PAGE_NAMES.DASHBOARD,
    href: '/dashboard',
    icon: BarChart3,
    description: 'Main dashboard with overview and analytics',
  },
  {
    title: 'Master',
    href: '#master',
    icon: Folder,
    description: 'Master data management',
    isParentOnly: true,
    children: [
      {
        title: PAGE_NAMES.MACHINE_MASTER,
        href: '/machines',
        icon: ArrowRight,
        description: 'Manage manufacturing machines and equipment',
      },
      {
        title: PAGE_NAMES.FABRIC_STRUCTURE,
        href: '/fabric-structures',
        icon: ArrowRight,
        description: 'Manage fabric structure and components',
      },
      {
        title: PAGE_NAMES.LOCATION_MASTER,
        href: '/locations',
        icon: ArrowRight,
        description: 'Manage manufacturing locations and facilities',
      },
      {
        title: PAGE_NAMES.YARNTYPE_MASTER,
        href: '/yarn-types',
        icon: ArrowRight,
        description: 'Manage yarn types and codes',
      },
      {
        title: PAGE_NAMES.TAPE_COLOR_MASTER,
        href: '/tape-colors',
        icon: ArrowRight,
        description: 'Manage tape colors for production',
      },
      {
        title: PAGE_NAMES.SHIFT_MASTER,
        href: '/shifts',
        icon: ArrowRight,
        description: 'Manage shifts for production',
      },
      {
        title: PAGE_NAMES.TRANSPORT_MASTER,
        href: '/transports',
        icon: ArrowRight,
        description: 'Manage transport companies and vehicles',
      },
      {
        title: PAGE_NAMES.COURIER_MASTER,
        href: '/couriers',
        icon: ArrowRight,
        description: 'Manage courier companies and services',
      },
      {
        title: PAGE_NAMES.SLIT_LINE_MASTER,
        href: '/slit-lines',
        icon: ArrowRight,
        description: 'Manage slit lines for production',
      },
 
      {
        title: PAGE_NAMES.EXCEL_UPLOAD,
        href: '/excel-upload',
        icon: ArrowRight,
        description: 'Upload Excel and CSV files',
      },
    ],
  },
  {
    title: 'Operations',
    href: '#sales',
    icon: Cog,
    description: 'Operations management',
    isParentOnly: true,
    children: [
      {
        title: PAGE_NAMES.SALES_ORDERS,
        href: '/sales-orders',
        icon: ArrowRight,
        description: 'Manage unprocessed sales orders',
      },
      {
        title: PAGE_NAMES.PRODUCTION_ALLOTMENT,
        href: '/production-allotment',
        icon: ArrowRight,
        description: 'View production allotment details',
      },
      {
        title: PAGE_NAMES.ROLL_CAPTURE,
        href: '/confirmation',
        icon: ArrowRight,
        description: 'rolls confirmation',
      },
      {
        title: PAGE_NAMES.QUALITY_CHECKING,
        href: '/quality-checking',
        icon: ArrowRight,
        description: 'Perform quality checking for rolls',
      },
      {
        title: PAGE_NAMES.ROLL_INSPECTION,
        href: '/rollInspection',
        icon: ArrowRight,
        description: 'check all rolls good conditon or not',
      },
      {
        title: PAGE_NAMES.FG_ROLL_CAPTURE,
        href: '/fg-sticker-confirmation',
        icon: ArrowRight,
        description: 'Capture and manage FG rolls',
      },
      {
        title: 'FG Sticker Reprint',
        href: '/fg-sticker-reprint',
        icon: ArrowRight,
        description: 'Reprint FG roll stickers',
      },
     
    ],
  },
  {
    title: 'Storage',
    href: '#storage',
    icon: Package,
    description: 'Storage management',
    isParentOnly: true,
    children: [
      {
        title: PAGE_NAMES.STORAGE_CAPTURE,
        href: '/storage-capture',
        icon: ArrowRight,
        description: 'Capture and allocate FG rolls to storage locations',
      },
    ],
  },
  {
    title: 'Dispatch',
    href: '#dispatch',
    icon: BaggageClaim,
    description: 'dispatch management',
    isParentOnly: true,
    children: [
      {
        title: PAGE_NAMES.DISPATCH_PLANNING,
        href: '/dispatch-planning',
        icon: ArrowRight,
        description: 'Plan and manage dispatch of finished goods',
      },
      {
        title: 'Loading Sheets',
        href: '/loading-sheets',
        icon:  ArrowRight,
        description: 'View and manage loading sheets',
      },
      //  {
      //   title: PAGE_NAMES.PICK_ROLL_CAPTURE,
      //   href: '/pick-roll-capture',
      //   icon: ArrowRight,
      //   description: 'Capture and manage pick rolls',
      // },
      // {
      //   title: PAGE_NAMES.LOAD_CAPTURE,
      //   href: '/load-capture',
      //   icon: ArrowRight,
      //   description: 'Capture and manage load operations',
      // },
      {
        title: PAGE_NAMES.PICKING_AND_LOADING,
        href: '/picking-loading',
        icon: ArrowRight,
        description: 'Manage both picking and loading operations',
      },
      {
        title: PAGE_NAMES.INVOICE_GENERATION,
        href: '/invoice',
        icon: ArrowRight,
        description: 'Generate invoices for fully dispatched orders',
      },
    ],
  },
    {
    title: 'Reports',
    href: '#reports',
    icon: FileText,
    description: 'View and generate reports',
    isParentOnly: true,
    children: [
      {
        title: PAGE_NAMES.PRODUCTION_REPORT,
        href: '/productionreport',
        icon: ArrowRight,
        description: 'View production reports',
      },
      {
        title: PAGE_NAMES.FABRIC_STOCK_REPORT,
        href: '/fabric-stock-report',
        icon: ArrowRight,
        description: 'View fabric stock reports',
      },
      {
        title: PAGE_NAMES.FABRIC_PLAN_REPORT,
        href: '/fabric-plan-report',
        icon: ArrowRight,
        description: 'View fabric plan reports',
      },
    ],
  },
  {
    title: 'Communication',
    href: '#communication',
    icon: MessageSquare,
    description: 'Chat and notifications',
    isParentOnly: true,
    children: [
      {
        title: PAGE_NAMES.CHAT,
        href: '/chat',
        icon: ArrowRight,
        description: 'Real-time messaging and communication',
      },
      {
        title: PAGE_NAMES.NOTIFICATIONS,
        href: '/notifications',
        icon: ArrowRight,
        description: 'View and manage notifications',
      },
    ],
  },
  {
    title: 'Administration',
    href: '#administration',
    icon: Shield,
    description: 'User and role administration',
    isParentOnly: true,
    children: [
      {
        title: PAGE_NAMES.ROLE_MASTER,
        href: '/roles',
        icon: ArrowRight,
        description: 'Manage user roles and permissions',
      },
      {
        title: PAGE_NAMES.USER_MANAGEMENT,
        href: '/users',
        icon: ArrowRight,
        description: 'Manage user accounts and profiles',
      },
    ],
  },

];

// Helper function to get expanded items from localStorage
const getExpandedItemsFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem('sidebar_expanded_items');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading expanded items from localStorage:', error);
    return [];
  }
};

// Helper function to save expanded items to localStorage
const saveExpandedItemsToStorage = (items: string[]): void => {
  try {
    localStorage.setItem('sidebar_expanded_items', JSON.stringify(items));
  } catch (error) {
    console.error('Error saving expanded items to localStorage:', error);
  }
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, pageAccesses } = useAuth();
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<string[]>(() => getExpandedItemsFromStorage());

  // Save expanded items to localStorage whenever they change
  useEffect(() => {
    saveExpandedItemsToStorage(expandedItems);
  }, [expandedItems]);

  const hasAccess = (pageTitle: string) => {
    // Allow admin users to access all pages
    if (user?.roleName === 'Admin') {
      return true;
    }

    // Normalize the page title for comparison
    const normalizedTitle = pageTitle.trim().toLowerCase();
    const page = pageAccesses.find((p) => {
      const normalizedPageName = p.pageName?.trim().toLowerCase() || '';
      return normalizedPageName === normalizedTitle;
    });

    return page?.isView ?? false;
  };

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => {
      // If the item is already expanded, collapse it
      if (prev.includes(href)) {
        return prev.filter((item) => item !== href);
      } 
      // If the item is not expanded, expand it and collapse all others
      else {
        // Find the parent category of the clicked item
        const parentCategory = navConfig.find(category => 
          category.href === href || category.children?.some(child => child.href === href)
        );
        
        // If we found a parent category, only keep that one expanded
        if (parentCategory) {
          return [parentCategory.href];
        }
        
        // Fallback: just expand the clicked item
        return [...prev, href];
      }
    });
  };

  const isActive = (href: string) => {
    return location.pathname.toLowerCase() === href.toLowerCase();
  };

  const renderNavItem = (item: NavItem, level = 0): JSX.Element | null => {
    // Special handling for Production section for admin users
    // This ensures the Production section is always visible for admin users
    // even if there are issues with page access configuration
    if (item.title === 'Production' && user?.roleName === 'Admin') {
      const isExpanded = expandedItems.includes(item.href);
      const active = isActive(item.href);

      return (
        <div key={item.href}>
          <NavLink
            to={item.isParentOnly ? '#' : item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
              active && 'bg-accent text-accent-foreground',
              level > 0 && 'ml-6',
              isSidebarCollapsed && level === 0 && 'justify-center px-2'
            )}
            onClick={(e) => {
              if (item.children && !isSidebarCollapsed) {
                e.preventDefault();
                toggleExpanded(item.href);
              }
            }}
          >
            <item.icon className={cn('h-4 w-4', isSidebarCollapsed && 'h-5 w-5')} />
            {!isSidebarCollapsed && (
              <>
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                    {item.badge}
                  </Badge>
                )}
                {item.children && (
                  <ChevronRight
                    className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')}
                  />
                )}
              </>
            )}
          </NavLink>

          {item.children && isExpanded && !isSidebarCollapsed && (
            <div className="mt-1 space-y-1">
              {item.children.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    const accessibleChildren = item.children?.filter((child) => hasAccess(child.title)) ?? [];
    const hasChildren = accessibleChildren.length > 0;

    // For parent items, we want to show them if they have accessible children
    // even if the user doesn't have direct access to the parent item itself
    const shouldShowItem = item.isParentOnly ? hasChildren : hasAccess(item.title) || hasChildren;

    if (!shouldShowItem) {
      return null;
    }

    const isExpanded = expandedItems.includes(item.href);
    const active = isActive(item.href);

    return (
      <div key={item.href}>
        <NavLink
          to={item.isParentOnly ? '#' : item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
            active && 'bg-accent text-accent-foreground',
            level > 0 && 'ml-6',
            isSidebarCollapsed && level === 0 && 'justify-center px-2'
          )}
          onClick={(e) => {
            if (hasChildren && !isSidebarCollapsed) {
              e.preventDefault();
              toggleExpanded(item.href);
            }
          }}
        >
          <item.icon className={cn('h-4 w-4', isSidebarCollapsed && 'h-5 w-5')} />
          {!isSidebarCollapsed && (
            <>
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
              {hasChildren && (
                <ChevronRight
                  className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')}
                />
              )}
            </>
          )}
        </NavLink>

        {hasChildren && isExpanded && !isSidebarCollapsed && (
          <div className="mt-1 space-y-1">
            {accessibleChildren.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r bg-card transition-all duration-300',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        {!isSidebarCollapsed && (
          <h2 className="text-lg font-semibold text-foreground">Avyaan Knitfab</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn('ml-auto h-8 w-8 p-0', isSidebarCollapsed && 'mx-auto')}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-3">{navConfig.map((item) => renderNavItem(item))}</nav>
      </div>

      {/* Footer */}
      {!isSidebarCollapsed && (
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>Online</span>
          </div>
          <div className="mt-1 truncate">
            {user?.firstName} {user?.lastName}
          </div>
        </div>
      )}
    </div>
  );
};