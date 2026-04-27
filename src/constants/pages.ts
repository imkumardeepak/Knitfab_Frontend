/**
 * Application Page Names
 * These constants ensure consistency between sidebar navigation and role permissions
 */

export const PAGE_NAMES = {
    DASHBOARD: 'Dashboard',
    USER_MANAGEMENT: 'User Management',
    FABRIC_STRUCTURE: 'Fabric Structure',
    LOCATION_MASTER: 'Location Master',
    YARNTYPE_MASTER: 'Yarn Type',
    ROLE_MASTER: 'Role Master',
    MACHINE_MASTER: 'Machine Master',
    SALES_ORDERS: 'Sales Orders',
    CHAT: 'Chat',
    NOTIFICATIONS: 'Notifications',
    PRODUCTION_ALLOTMENT: 'Lot List',
    TAPE_COLOR_MASTER: 'Tape Color',
    SHIFT_MASTER: 'Shift Master',
    DISPATCH_PLANNING: 'Dispatch Planning',
    ROLL_CAPTURE: 'Roll Capture',
    QUALITY_CHECKING: 'Quality Checking',
    ROLL_INSPECTION: 'Roll Inspection',
    FG_ROLL_CAPTURE: 'FG Roll Capture',
    FG_STICKER_REPRINT: 'FG Sticker Reprint',
    PICK_ROLL_CAPTURE: 'Pick Roll Capture',
    LOAD_CAPTURE: 'Load Capture',
    PICKING_AND_LOADING: 'Picking and Loading',
    TRANSPORT_MASTER: 'Transport Master',
    COURIER_MASTER: 'Courier Master',
    SLIT_LINE_MASTER: 'Slit Line Master',
    INVOICE_GENERATION: 'Invoice Generation',
    PRODUCTION_REPORT: 'Production Report',
    FABRIC_STOCK_REPORT: 'Fabric Stock Report',
    FINAL_FABRIC_REPORT: 'Final Fabric Report',
    EXCEL_UPLOAD: 'Excel Upload'
} as const;

// Array of all page names for role management
export const AVAILABLE_PAGES = Object.values(PAGE_NAMES);

// Type for page names
export type PageName = typeof PAGE_NAMES[keyof typeof PAGE_NAMES];

// Map path segments to their corresponding PAGE_NAMES for breadcrumb permission checking
export const PATH_TO_PAGE_MAP: Record<string, string> = {
    'dashboard': PAGE_NAMES.DASHBOARD,
    'home': PAGE_NAMES.DASHBOARD,
    'users': PAGE_NAMES.USER_MANAGEMENT,
    'roles': PAGE_NAMES.ROLE_MASTER,
    'machines': PAGE_NAMES.MACHINE_MASTER,
    'fabric-structures': PAGE_NAMES.FABRIC_STRUCTURE,
    'locations': PAGE_NAMES.LOCATION_MASTER,
    'yarn-types': PAGE_NAMES.YARNTYPE_MASTER,
    'tape-colors': PAGE_NAMES.TAPE_COLOR_MASTER,
    'shifts': PAGE_NAMES.SHIFT_MASTER,
    'transports': PAGE_NAMES.TRANSPORT_MASTER,
    'couriers': PAGE_NAMES.COURIER_MASTER,
    'slit-lines': PAGE_NAMES.SLIT_LINE_MASTER,
    'sales-orders': PAGE_NAMES.SALES_ORDERS,
    'production-allotment': PAGE_NAMES.PRODUCTION_ALLOTMENT,
    'confirmation': PAGE_NAMES.ROLL_CAPTURE,
    'quality-checking': PAGE_NAMES.QUALITY_CHECKING,
    'rollInspection': PAGE_NAMES.ROLL_INSPECTION,
    'fg-sticker-confirmation': PAGE_NAMES.FG_ROLL_CAPTURE,
    'fg-sticker-reprint': PAGE_NAMES.FG_STICKER_REPRINT,
    'pick-roll-capture': PAGE_NAMES.PICK_ROLL_CAPTURE,
    'load-capture': PAGE_NAMES.LOAD_CAPTURE,
    'picking-loading': PAGE_NAMES.PICKING_AND_LOADING,
    'dispatch-planning': PAGE_NAMES.DISPATCH_PLANNING,
    'loading-sheets': PAGE_NAMES.DISPATCH_PLANNING,
    'invoice': PAGE_NAMES.INVOICE_GENERATION,
    'productionreport': PAGE_NAMES.PRODUCTION_REPORT,
    'fabric-stock-report': PAGE_NAMES.FABRIC_STOCK_REPORT,
    'final-fabric-report': PAGE_NAMES.FINAL_FABRIC_REPORT,
    'excel-upload': PAGE_NAMES.EXCEL_UPLOAD,
    'chat': PAGE_NAMES.CHAT,
    'notifications': PAGE_NAMES.NOTIFICATIONS
};