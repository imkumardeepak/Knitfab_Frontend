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
    STORAGE_CAPTURE: 'Storage Capture',
    TAPE_COLOR_MASTER: 'Tape Color',
    SHIFT_MASTER: 'Shift Master',
    DISPATCH_PLANNING: 'Dispatch Planning',
    ROLL_CAPTURE: 'Roll Capture',
    QUALITY_CHECKING: 'Quality Checking',
    ROLL_INSPECTION: 'Roll Inspection',
    FG_ROLL_CAPTURE: 'FG Roll Capture',
    PICK_ROLL_CAPTURE: 'Pick Roll Capture',
    LOAD_CAPTURE: 'Load Capture',
    PICKING_AND_LOADING: 'Picking and Loading',
    TRANSPORT_MASTER: 'Transport Master',
    COURIER_MASTER: 'Courier Master',
    SLIT_LINE_MASTER: 'Slit Line Master',
    INVOICE_GENERATION: 'Invoice Generation',
    PRODUCTION_REPORT: 'Production Report',
    FABRIC_STOCK_REPORT: 'Fabric Stock Report',
    EXCEL_UPLOAD: 'Excel Upload'
} as const;

// Array of all page names for role management
export const AVAILABLE_PAGES = Object.values(PAGE_NAMES);

// Type for page names
export type PageName = typeof PAGE_NAMES[keyof typeof PAGE_NAMES];