/**
 * Complete API Types for Avyaan Knitfab Backend
 * Based on the official API documentation
 * Exact match with all DTO specifications
 */

// ============================================
// AUTHENTICATION DTOs (AvyyanBackend.DTOs.Auth)
// ============================================

export interface LoginRequestDto {
  email: string;          // Required, email format
  password: string;       // Required
  rememberMe?: boolean;   // Optional, default: false
}

export interface LoginResponseDto {
  token: string;          // JWT token
  refreshToken: string;
  expiresAt: string;      // ISO 8601 datetime
  user: AuthUserDto;
  roles: string[];
  pageAccesses: AuthPageAccessDto[];
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface RegisterRequestDto {
  firstName: string;      // Required, max 100 chars
  lastName: string;       // Required, max 100 chars
  email: string;          // Required, email format, max 255 chars
  password: string;       // Required, min 6 chars
  confirmPassword: string;// Required, must match password
  phoneNumber?: string;   // Optional, max 20 chars
}

export interface ChangePasswordRequestDto {
  currentPassword: string;  // Required
  newPassword: string;      // Required, min 6 chars
  confirmPassword: string;  // Required, must match newPassword
}

export interface ResetPasswordRequestDto {
  email: string;           // Required, email format
}

export interface AuthUserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  lastLoginAt?: string;    // Optional datetime
  createdAt: string;       // ISO 8601 datetime
  roleName: string;
}

export interface AuthPageAccessDto {
  id: number;
  roleId: number;
  pageName: string;
  isView: boolean;
  isAdd: boolean;
  isEdit: boolean;
  isDelete: boolean;
}

// ============================================
// USER DTOs (AvyyanBackend.DTOs.User)
// ============================================

export interface UserProfileResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  roleName: string;
  isActive: boolean;
}

export interface UpdateUserProfileRequestDto {
  firstName: string;      // Required, max 100 chars
  lastName: string;       // Required, max 100 chars
  email: string;          // Required, email format, max 255 chars
  phoneNumber?: string;   // Optional, max 20 chars
}

export interface AdminUserResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  roleName: string;
  isActive: boolean;
}

export interface CreateUserRequestDto {
  firstName: string;      // Required, max 100 chars
  lastName: string;       // Required, max 100 chars
  email: string;          // Required, email format, max 255 chars
  password: string;       // Required, min 6 chars
  phoneNumber?: string;   // Optional, max 20 chars
  roleName: string;       // Required
  isActive?: boolean;     // Optional, default: true
}

export interface UpdateUserRequestDto {
  firstName: string;      // Required, max 100 chars
  lastName: string;       // Required, max 100 chars
  email: string;          // Required, email format, max 255 chars
  phoneNumber?: string;   // Optional, max 20 chars
  roleName: string;       // Required
  isActive?: boolean;     // Optional, default: true
}

export interface UserPermissionsResponseDto {
  userId: number;
  roleName: string;
  pageAccesses: UserPageAccessDto[];
}

export interface UserPageAccessDto {
  id: number;
  roleId: number;
  pageName: string;
  isView: boolean;
  isAdd: boolean;
  isEdit: boolean;
  isDelete: boolean;
}

// ============================================
// ROLE DTOs (AvyyanBackend.DTOs.Role)
// ============================================

export interface RoleResponseDto {
  id: number;
  roleName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  pageAccesses: RolePageAccessDto[];
}

export interface CreateRoleRequestDto {
  name: string;           // Required, max 100 chars
  description?: string;   // Optional, max 500 chars
  isActive?: boolean;     // Optional, default: true
  pageAccesses?: CreatePageAccessRequestDto[]; // Optional, page access permissions
}

export interface UpdateRoleRequestDto {
  name: string;           // Required, max 100 chars
  description?: string;   // Optional, max 500 chars
  isActive?: boolean;     // Optional, default: true
  pageAccesses?: UpdatePageAccessRequestDto[]; // Optional, page access permissions
}

// Add this interface for page access creation
export interface CreatePageAccessRequestDto {
  roleId: number;
  pageName: string;
  isView: boolean;
  isAdd: boolean;
  isEdit: boolean;
  isDelete: boolean;
}

// Add this interface for page access updates
export interface UpdatePageAccessRequestDto {
  roleId: number;
  pageName: string;
  isView: boolean;
  isAdd: boolean;
  isEdit: boolean;
  isDelete: boolean;
}

export interface RolePageAccessDto {
  id: number;
  pageName: string;
  isView: boolean;
  isAdd: boolean;
  isEdit: boolean;
  isDelete: boolean;
}

export interface PageAccessResponseDto {
  id: number;
  roleId: number;
  roleName: string;
  pageName: string;
  isView: boolean;
  isAdd: boolean;
  isEdit: boolean;
  isDelete: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// MACHINE DTOs (AvyyanBackend.DTOs.Machine)
// ============================================

export interface MachineResponseDto {
  id: number;
  machineName: string;
  dia: number;
  gg: number;
  needle: number;
  feeder: number;
  rpm: number;
  constat?: number;
  efficiency: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  machineType?: string; // Added machineType field
}

export interface CreateMachineRequestDto {
  machineName: string;    // Required, max 200 chars
  dia: number;            // Required, > 0
  gg: number;             // Required, > 0
  needle: number;         // Required, > 0
  feeder: number;         // Required, > 0
  rpm: number;            // Required, > 0
  constat?: number;       // Optional, >= 0
  efficiency: number;     // Required, 0.01-100
  description?: string;   // Optional, max 500 chars
  machineType?: string;   // Added machineType field
}

export interface UpdateMachineRequestDto {
  machineName: string;    // Required, max 200 chars
  dia: number;            // Required, > 0
  gg: number;             // Required, > 0
  needle: number;         // Required, > 0
  feeder: number;         // Required, > 0
  rpm: number;            // Required, > 0
  constat?: number;       // Optional, >= 0
  efficiency: number;     // Required, 0.01-100
  description?: string;   // Optional, max 500 chars
  isActive?: boolean;     // Optional, default: true
  machineType?: string;   // Added machineType field
}

export interface MachineSearchRequestDto {
  machineName?: string;   // Optional, max 200 chars
  dia?: number;          // Optional, > 0
  isActive?: boolean;    // Optional
}

export interface BulkCreateMachineRequestDto {
  machines: CreateMachineRequestDto[]; // Required, min 1 item
}

// ============================================
// WEBSOCKET DTOs (AvyyanBackend.DTOs.WebSocket)
// ============================================

export interface WebSocketConnectionRequestDto {
  employeeId: string;     // Required
  connectionId?: string;  // Optional
  timestamp?: string;     // Optional, default: current UTC
}

export interface ChatMessageDto {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;      // Default: current UTC
  isRead: boolean;        // Default: false
}

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  timestamp: string;      // Default: current UTC
  isRead: boolean;        // Default: false
}

export interface WebSocketResponseDto {
  type: string;
  data: unknown;              // Generic object
  timestamp: string;      // Default: current UTC
  success: boolean;       // Default: true
}

// ============================================
// COMMON DTOs (AvyyanBackend.DTOs.Common)
// ============================================

export interface ApiResponseDto<T> {
  success: boolean;       // Default: true
  message: string;
  data?: T;              // Generic type
  timestamp: string;     // Default: current UTC
  errors: string[];
}

export interface PaginatedResponseDto<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;  // Computed
  hasPreviousPage: boolean; // Computed
}

export interface MessageResponseDto {
  message: string;
  timestamp: string;     // Default: current UTC
  success: boolean;      // Default: true
}

export interface ErrorResponseDto {
  error: string;
  details?: string;      // Optional
  timestamp: string;     // Default: current UTC
  statusCode: number;
}

export interface BaseAuditDto {
  createdAt: string;
  updatedAt?: string;    // Optional
  isActive: boolean;     // Default: true
}

export interface ValidationErrorResponse {
  success: false;
  message: "Validation failed";
  data: null;
  timestamp: string;
  errors: string[];
}

// ============================================
// FABRIC STRUCTURE DTOs (AvyyanBackend.DTOs.FabricStructure)
// ============================================

export interface FabricStructureResponseDto {
  id: number;
  fabricstr: string;
  standardeffencny: number;
  fabricCode?: string; // Added new optional FabricCode property
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface CreateFabricStructureRequestDto {
  fabricstr: string;
  standardeffencny: number;
  fabricCode?: string; // Added new optional FabricCode property
}

export interface UpdateFabricStructureRequestDto {
  fabricstr: string;
  standardeffencny: number;
  fabricCode?: string; // Added new optional FabricCode property
  isActive: boolean;
}

export interface FabricStructureSearchRequestDto {
  fabricstr?: string;
  fabricCode?: string; // Added new optional FabricCode property
  isActive?: boolean;
}

// ============================================
// LEGACY COMPATIBILITY TYPES
// ============================================

// For backward compatibility with existing code
// Type aliases for backward compatibility
export type LoginDto = LoginRequestDto;
export type RegisterDto = RegisterRequestDto;
export type ChangePasswordDto = ChangePasswordRequestDto;
export type ResetPasswordDto = ResetPasswordRequestDto;
export type UserDto = AuthUserDto;
export type CreateUserDto = CreateUserRequestDto;
export type UpdateUserDto = UpdateUserRequestDto;
export type RoleDto = RoleResponseDto;
export type CreateRoleDto = CreateRoleRequestDto;
export type UpdateRoleDto = UpdateRoleRequestDto;
export type PageAccessDto = AuthPageAccessDto;
export type ApiResponse<T> = ApiResponseDto<T>;
export type ErrorResponse = ErrorResponseDto;
export type MessageResponse = MessageResponseDto;
export type PaginatedResponse<T> = PaginatedResponseDto<T>;

// ============================================
// TYPE ALIASES FOR COMPONENT COMPATIBILITY
// ============================================

export type User = AdminUserResponseDto;
export type Role = RoleResponseDto;
export type PageAccess = PageAccessResponseDto;
export type Machine = MachineResponseDto;
export type CreateUser = CreateUserRequestDto;
export type UpdateUser = UpdateUserRequestDto;
export type CreateRole = CreateRoleRequestDto;
export type UpdateRole = UpdateRoleRequestDto;
export type CreateMachine = CreateMachineRequestDto;
export type UpdateMachine = UpdateMachineRequestDto;

// ============================================
// ENUMS AND CONSTANTS
// ============================================

// User Status Values
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export type UserStatusType = typeof UserStatus[keyof typeof UserStatus];

// Permission Type Values
export const PermissionType = {
  VIEW: 'view',
  ADD: 'add',
  EDIT: 'edit',
  DELETE: 'delete'
} as const;

export type PermissionTypeType = typeof PermissionType[keyof typeof PermissionType];

export const VALIDATION_RULES = {
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 6,
  PHONE_MAX_LENGTH: 20,
  DESCRIPTION_MAX_LENGTH: 500,
  MACHINE_NAME_MAX_LENGTH: 200,
  ROLE_NAME_MAX_LENGTH: 100,
  EFFICIENCY_MIN: 0.01,
  EFFICIENCY_MAX: 100
} as const;

// ============================================
// FORM DATA TYPES FOR COMPONENTS
// ============================================

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  roleName: string;
  isActive: boolean;
  password?: string;
}

export interface RoleFormData {
  name: string;
  description: string;
  isActive: boolean;
  pageAccesses: {
    pageName: string;
    isView: boolean;
    isAdd: boolean;
    isEdit: boolean;
    isDelete: boolean;
  }[];
}

export interface MachineFormData {
  machineName: string;
  dia: number;
  gg: number;
  needle: number;
  feeder: number;
  rpm: number;
  constat?: number;
  efficiency: number;
  description?: string;
  isActive: boolean;
  machineType?: string; // Added machineType field
}

// ============================================
// LOCATION DTOs (AvyyanBackend.DTOs.Location)
// ============================================

export interface LocationResponseDto {
  id: number;
  warehousename: string;
  location: string;
  sublocation: string;
  locationcode: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface CreateLocationRequestDto {
  warehousename: string;
  location: string;
  sublocation: string;
  locationcode: string;
}

export interface UpdateLocationRequestDto {
  warehousename: string;
  location: string;
  sublocation: string;
  locationcode: string;
  isActive: boolean;
}

export interface LocationSearchRequestDto {
  warehousename?: string;
  location?: string;
  sublocation?: string;
  locationcode?: string;
  isActive?: boolean;
}

// ============================================
// YARN TYPE DTOs (AvyyanBackend.DTOs.YarnType)
// ============================================

export interface YarnTypeResponseDto {
  id: number;
  yarnType: string;
  yarnCode: string;
  shortCode: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface CreateYarnTypeRequestDto {
  yarnType: string;
  yarnCode: string;
  shortCode: string;
}

export interface UpdateYarnTypeRequestDto {
  yarnType: string;
  yarnCode: string;
  shortCode: string;
  isActive: boolean;
}

export interface YarnTypeSearchRequestDto {
  yarnType?: string;
  yarnCode?: string;
  shortCode?: string;
  isActive?: boolean;
}

// ============================================
// VOUCHER DTOs
// ============================================

export interface VoucherDto {
  id: number;
  vchType: string;
  date: string; // ISO 8601 datetime
  guid: string;
  gstRegistrationType: string;
  stateName: string;
  partyName: string;
  partyLedgerName: string;
  voucherNumber: string;
  reference: string;
  companyAddress: string;
  buyerAddress: string;
  orderTerms: string;
  ledgerEntries: string;
  processFlag: number;
  processDate: string; // ISO 8601 datetime
  createdAt: string; // ISO 8601 datetime
  createdBy: string;
  updatedAt: string; // ISO 8601 datetime
  updatedBy: string;
  items: VoucherItemDto[];
}

export interface VoucherItemDto {
  id: number;
  voucherId: number;
  stockItemName: string;
  rate: string;
  amount: string;
  actualQty: string;
  billedQty: string;
  descriptions: string;
  batchName: string;
  orderNo: string;
  orderDueDate: string;
}

// ============================================
// SALES ORDER DTOs
// ============================================

export interface SalesOrderItemDto {
  id: number;
  salesOrderId: number;
  stockItemName: string;
  rate: string;
  amount: string;
  actualQty: string;
  billedQty: string;
  descriptions: string;
  batchName: string;
  orderNo: string;
  orderDueDate: string;
  processFlag: number;
  processDate: string; // ISO 8601 datetime
}

export interface SalesOrderDto {
  id: number;
  vchType: string;
  salesDate: string; // ISO 8601 datetime
  guid: string;
  gstRegistrationType: string;
  stateName: string;
  partyName: string;
  partyLedgerName: string;
  voucherNumber: string;
  reference: string;
  companyAddress: string;
  buyerAddress: string;
  orderTerms: string;
  ledgerEntries: string;
  processFlag: number;
  processDate: string; // ISO 8601 datetime
  createdAt: string; // ISO 8601 datetime
  createdBy: string;
  updatedAt: string; // ISO 8601 datetime
  updatedBy: string;
  items: SalesOrderItemDto[];
}

// ============================================
// PRODUCTION ALLOTMENT API (/api/ProductionAllotment)
// ============================================

export interface CreateProductionAllotmentRequest {
  allotmentId: string;
  voucherNumber: string;
  itemName: string;
  salesOrderId: number;
  salesOrderItemId: number;
  actualQuantity: number;
  yarnCount: string;
  diameter: number;
  gauge: number;
  fabricType: string;
  slitLine: string;
  stitchLength: string;
  efficiency: number;
  composition: string;
  yarnLotNo: string;
  counter: string;
  colourCode: string;
  reqGreyGsm: number | null;
  reqGreyWidth: number | null;
  reqFinishGsm: number | null;
  reqFinishWidth: number | null;
  yarnPartyName: string; // New field for yarn party name
  polybagColor: string; // New field for polybag color
  partyName: string;
  // Other Reference field
  otherReference?: string;
  // Packaging Details
  tubeWeight: number;
  shrinkRapWeight?: number;
  totalWeight?: number;
  tapeColor: string;
  machineAllocations: MachineAllocationRequest[];
}

export interface ProductionAllotmentResponseDto {
  id: number;
  allotmentId: string;
  voucherNumber: string;
  itemName: string;
  salesOrderId: number;
  salesOrderItemId: number;
  actualQuantity: number;
  yarnCount: string;
  diameter: number;
  gauge: number;
  fabricType: string;
  slitLine: string;
  stitchLength: number;
  efficiency: number;
  composition: string;
  totalProductionTime: number;
  createdDate: string;
  yarnLotNo: string;
  counter: string;
  colourCode: string;
  reqGreyGsm: number | null;
  reqGreyWidth: number | null;
  reqFinishGsm: number | null;
  reqFinishWidth: number | null;
  yarnPartyName: string; // New field for yarn party name
  polybagColor: string; // New field for polybag color
  partyName: string;
  otherReference?: string;
  tubeWeight: number;
  shrinkRapWeight?: number;
  totalWeight: number;
  tapeColor: string;
  serialNo: string;
  productionStatus: number; // New field for unified production status (0 = normal, 1 = on hold, 2 = suspended)
  isOnHold: boolean; // For backward compatibility
  isSuspended: boolean; // For backward compatibility
  machineAllocations: MachineAllocationResponseDto[];
}

export interface MachineAllocationResponseDto {
  id: number;
  productionAllotmentId: number;
  machineName: string;
  machineId: number;
  numberOfNeedles: number;
  feeders: number;
  rpm: number;
  rollPerKg: number;
  totalLoadWeight: number;
  totalRolls: number;
  rollBreakdown: RollBreakdown;
  estimatedProductionTime: number;
}

export interface MachineAllocationRequest {
  machineName: string;
  machineId: number;
  numberOfNeedles: number;
  feeders: number;
  rpm: number;
  rollPerKg: number;
  totalLoadWeight: number;
  totalRolls: number;
  rollBreakdown: RollBreakdown;
  estimatedProductionTime: number;
}

// New interface for updating machine allocations
export interface UpdateMachineAllocationsRequest {
  machineAllocations: (MachineAllocationRequest & { id?: number })[];
}

// Roll Breakdown Interfaces
export interface RollItem {
  quantity: number;
  weightPerRoll: number;
  totalWeight: number;
}

export interface RollBreakdown {
  wholeRolls: RollItem[];
  fractionalRoll: RollItem;
}

// Add this interface for the search request
export interface ProductionAllotmentSearchRequestDto {
  voucherNumber?: string;
  fromDate?: string; // ISO date string
  toDate?: string; // ISO date string
}

// ============================================
// PRODUCTION CONFIRMATION DTOs (AvyyanBackend.DTOs.ProductionConfirmation)
// ============================================

export interface WeightDataRequestDto {
  ipAddress: string;
  port?: number; // Optional, default: 23
}

export interface WeightDataResponseDto {
  grossWeight: string;
  tareWeight: string;
  netWeight: string;
}

// ============================================
// ROLL CONFIRMATION DTOs
// ============================================

export interface RollConfirmationRequestDto {
  allotId: string;
  machineName: string;
  rollPerKg: number;
  greyGsm: number;
  greyWidth: number;
  blendPercent: number;
  cotton: number;
  polyester: number;
  spandex: number;
  rollNo: string;
  // Weight fields for FG Sticker Confirmation
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  // Flag to indicate if FG Sticker has been generated
  isFGStickerGenerated?: boolean;
}

export interface RollConfirmationResponseDto {
  id: number;
  allotId: string;
  machineName: string;
  rollPerKg: number;
  greyGsm: number;
  greyWidth: number;
  blendPercent: number;
  cotton: number;
  polyester: number;
  spandex: number;
  rollNo: string;
  // Weight fields for FG Sticker Confirmation
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  // FG Roll Number - Auto-incremented per AllotId
  fgRollNo?: number;
  // Flag to indicate if FG Sticker has been generated
  isFGStickerGenerated: boolean;
  createdDate: string;
}

export interface RollConfirmationUpdateDto {
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  // Fabric specification fields
  greyGsm?: number;
  greyWidth?: number;
  blendPercent?: number;
  cotton?: number;
  polyester?: number;
  spandex?: number;
  // FG Roll Number - Auto-incremented per AllotId
  fgRollNo?: number;
  // Flag to indicate if FG Sticker has been generated
  isFGStickerGenerated?: boolean;
}

// ============================================
// ROLL ASSIGNMENT DTOs
// ============================================

export interface CreateRollAssignmentRequest {
  machineAllocationId: number;
  shiftId: number;
  assignedRolls: number;
  operatorName: string;
  timestamp: string;
}

export interface GenerateStickersRequest {
  rollAssignmentId: number;
  stickerCount: number;
}

export interface GenerateBarcodesRequest {
  rollAssignmentId: number;
  barcodeCount: number;
}

// New interface for generating stickers for specific roll numbers
export interface GenerateStickersForRollsRequest {
  rollNumbers: number[];
}

export interface RollAssignmentResponseDto {
  id: number;
  machineAllocationId: number;
  shiftId: number;
  assignedRolls: number;
  generatedStickers: number;
  remainingRolls: number;
  operatorName: string;
  timestamp: string;
  generatedBarcodes: GeneratedBarcodeDto[];
}

export interface GeneratedBarcodeDto {
  id: number;
  rollAssignmentId: number;
  barcode: string;
  rollNumber: number;
  generatedAt: string;
}

// ============================================
// INSPECTION DTOs
// ============================================

export interface InspectionRequestDto {
  allotId: string;
  machineName: string;
  rollNo: string;
  // Spinning Faults
  thinPlaces: number;
  thickPlaces: number;
  thinLines: number;
  thickLines: number;
  doubleParallelYarn: number;
  // Contamination Faults
  haidJute: number;
  colourFabric: number;
  // Column 3 Faults
  holes: number;
  dropStitch: number;
  lycraStitch: number;
  lycraBreak: number;
  ffd: number;
  needleBroken: number;
  knitFly: number;
  oilSpots: number;
  oilLines: number;
  verticalLines: number;
  // Summary
  grade: string;
  totalFaults: number;
  remarks: string;
  createdDate: string;
  // Flag for approval status (true = approved, false = rejected)
  flag: boolean;
}

export interface InspectionResponseDto {
  id: number;
  allotId: string;
  machineName: string;
  rollNo: string;
  // Spinning Faults
  thinPlaces: number;
  thickPlaces: number;
  thinLines: number;
  thickLines: number;
  doubleParallelYarn: number;
  // Contamination Faults
  haidJute: number;
  colourFabric: number;
  // Column 3 Faults
  holes: number;
  dropStitch: number;
  lycraStitch: number;
  lycraBreak: number;
  ffd: number;
  needleBroken: number;
  knitFly: number;
  oilSpots: number;
  oilLines: number;
  verticalLines: number;
  // Summary
  grade: string;
  totalFaults: number;
  remarks: string;
  createdDate: string;
  // Flag for approval status (true = approved, false = rejected)
  flag: boolean;
}

// ============================================
// TAPE COLOR DTOs (AvyyanBackend.DTOs.TapeColor)
// ============================================

export interface TapeColorResponseDto {
  id: number;
  tapeColor: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface CreateTapeColorRequestDto {
  tapeColor: string;
}

export interface UpdateTapeColorRequestDto {
  tapeColor: string;
  isActive: boolean;
}

export interface TapeColorSearchRequestDto {
  tapeColor?: string;
  isActive?: boolean;
}

// ============================================
// SHIFT DTOs (AvyyanBackend.DTOs.Shift)
// ============================================

export interface ShiftResponseDto {
  id: number;
  shiftName: string;
  startTime: string; // ISO 8601 time format
  endTime: string; // ISO 8601 time format
  durationInHours: number;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface CreateShiftRequestDto {
  shiftName: string;
  startTime: string; // ISO 8601 time format
  endTime: string; // ISO 8601 time format
  durationInHours: number;
}

export interface UpdateShiftRequestDto {
  shiftName: string;
  startTime: string; // ISO 8601 time format
  endTime: string; // ISO 8601 time format
  durationInHours: number;
  isActive: boolean;
}

export interface ShiftSearchRequestDto {
  shiftName?: string;
  isActive?: boolean;
}

// ============================================
// PRODUCTION ALLOTMENT API (/api/ProductionAllotment)
// ============================================

export interface StorageCaptureResponseDto {
  id: number;
  lotNo: string;
  fgRollNo: string;
  locationCode: string;
  tape: string;
  customerName: string;
  isDispatched: boolean;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface CreateStorageCaptureRequestDto {
  lotNo: string;
  fgRollNo: string;
  locationCode: string;
  tape: string;
  customerName: string;
  isDispatched?: boolean;
}

export interface UpdateStorageCaptureRequestDto {
  lotNo: string;
  fgRollNo: string;
  locationCode: string;
  tape: string;
  customerName: string;
  isDispatched?: boolean;
  isActive: boolean;
}

export interface StorageCaptureSearchRequestDto {
  lotNo?: string;
  fgRollNo?: string;
  locationCode?: string;
  tape?: string;
  customerName?: string;
  isActive?: boolean;
  isDispatched?: boolean;
}

// New DTOs for StorageCapture roll data response
export interface StorageCaptureRollDataResponseDto {
  rollConfirmation: RollConfirmationResponseDto;
  machineAllocation: MachineAllocationDto;
  productionAllotment: ProductionAllotmentDto;
}

export interface MachineAllocationDto {
  id: number;
  productionAllotmentId: number;
  machineName: string;
  machineId: number;
  numberOfNeedles: number;
  feeders: number;
  rpm: number;
  rollPerKg: number;
  totalLoadWeight: number;
  totalRolls: number;
  rollBreakdown: string;
  estimatedProductionTime: number;
}

export interface ProductionAllotmentDto {
  id: number;
  allotmentId: string;
  voucherNumber: string;
  itemName: string;
  salesOrderId: number;
  salesOrderItemId: number;
  actualQuantity: number;
  yarnCount: string;
  diameter: number;
  gauge: number;
  fabricType: string;
  slitLine: string;
  stitchLength: number;
  efficiency: number;
  composition: string;
  totalProductionTime: number;
  createdDate: string;
  yarnLotNo: string;
  counter: string;
  colourCode: string;
  reqGreyGsm?: number;
  reqGreyWidth?: number;
  reqFinishGsm?: number;
  reqFinishWidth?: number;
  partyName: string;
  tubeWeight: number;
  tapeColor: string;
}

// ============================================
// PRODUCTION ALLOTMENT API (/api/ProductionAllotment)
// ============================================

// ============================================
// DISPATCH PLANNING DTOs (AvyyanBackend.DTOs.DispatchPlanning)
// ============================================

export interface DispatchPlanningDto {

  id: number;
  lotNo: string;
  salesOrderId: number;
  salesOrderItemId: number;
  customerName: string;
  tape: string;
  totalRequiredRolls: number;
  totalReadyRolls: number;
  totalDispatchedRolls: number;
  isFullyDispatched: boolean;
  dispatchStartDate?: string; // ISO 8601 datetime
  dispatchEndDate?: string; // ISO 8601 datetime
  vehicleNo: string;
  driverName: string;
  license: string;
  mobileNumber: string;
  remarks: string;
  loadingNo: string;
  dispatchOrderId: string;
  createdAt: string; // ISO 8601 datetime
  updatedAt?: string; // ISO 8601 datetime
  isActive: boolean;
  // Transport/Courier fields
  isTransport?: boolean;
  isCourier?: boolean;
  transportId?: number | null;
  courierId?: number | null;
  // Manual transport details (new fields)
  transportName?: string;
  contactPerson?: string;
  phone?: string;
  maximumCapacityKgs?: number | null;
  // Weight fields for dispatch planning
  totalGrossWeight?: number | null;
  totalNetWeight?: number | null;
}

export interface CreateDispatchPlanningRequestDto {
  lotNo: string;
  salesOrderId: number;
  salesOrderItemId: number;
  customerName: string;
  tape: string;
  totalRequiredRolls: number;
  totalReadyRolls: number;
  totalDispatchedRolls: number;
  isFullyDispatched: boolean;
  dispatchStartDate?: string; // ISO 8601 datetime
  dispatchEndDate?: string; // ISO 8601 datetime
  vehicleNo: string;
  driverName: string;
  license: string;
  mobileNumber: string;
  remarks: string;
  // Transport/Courier fields
  isTransport?: boolean;
  isCourier?: boolean;
  transportId?: number | null;
  courierId?: number | null;
  // Manual transport details (new fields)
  transportName?: string;
  contactPerson?: string;
  phone?: string;
  maximumCapacityKgs?: number | null;
  // Weight fields for dispatch planning
  totalGrossWeight?: number | null;
  totalNetWeight?: number | null;
  // LoadingNo will be auto-generated
  // DispatchOrderId will be auto-generated
}

export interface UpdateDispatchPlanningRequestDto {
  lotNo: string;
  salesOrderId: number;
  salesOrderItemId: number;
  customerName: string;
  tape: string;
  totalRequiredRolls: number;
  totalReadyRolls: number;
  totalDispatchedRolls: number;
  isFullyDispatched: boolean;
  dispatchStartDate?: string; // ISO 8601 datetime
  dispatchEndDate?: string; // ISO 8601 datetime
  vehicleNo: string;
  driverName: string;
  license: string;
  mobileNumber: string;
  remarks: string;
  loadingNo: string;
  dispatchOrderId: string;
  // Transport/Courier fields
  isTransport?: boolean;
  isCourier?: boolean;
  transportId?: number | null;
  courierId?: number | null;
  // Manual transport details (new fields)
  transportName?: string;
  contactPerson?: string;
  phone?: string;
  maximumCapacityKgs?: number | null;
  // Weight fields for dispatch planning
  totalGrossWeight?: number | null;
  totalNetWeight?: number | null;
}

export interface DispatchedRollDto {
  id: number;
  dispatchPlanningId: number;
  lotNo: string;
  fgRollNo: string;
  isLoaded: boolean;
  loadedAt?: string; // ISO 8601 datetime
  loadedBy: string;
  createdAt: string; // ISO 8601 datetime
  updatedAt?: string; // ISO 8601 datetime
  isActive: boolean;
}

export interface CreateDispatchedRollRequestDto {
  dispatchPlanningId: number;
  lotNo: string;
  fgRollNo: string;
  isLoaded: boolean;
  loadedAt?: string; // ISO 8601 datetime
  loadedBy: string;
}

// Loading Sheet DTO (extension of DispatchPlanningDto with sequence number)
export interface LoadingSheetDto extends DispatchPlanningDto {
  sequenceNumber: number;
}

// ============================================
// TRANSPORT DTOs (AvyyanBackend.DTOs.Transport)
// ============================================

export interface TransportResponseDto {
  id: number;
  transportName: string;
  contactPerson?: string;
  address?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverNumber?: string;
  licenseNumber?: string;
  maximumCapacityKgs?: number;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface CreateTransportRequestDto {
  transportName: string;
  contactPerson?: string;
  address?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverNumber?: string;
  licenseNumber?: string;
  maximumCapacityKgs?: number;
}

export interface UpdateTransportRequestDto {
  transportName: string;
  contactPerson?: string;
  address?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverNumber?: string;
  licenseNumber?: string;
  maximumCapacityKgs?: number;
  isActive: boolean;
}

export interface TransportSearchRequestDto {
  transportName?: string;
  contactPerson?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverNumber?: string;
  licenseNumber?: string;
  isActive?: boolean;
}

// ============================================
// COURIER DTOs (AvyyanBackend.DTOs.Courier)
// ============================================

export interface CourierResponseDto {
  id: number;
  courierName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNo?: string;
  trackingUrl?: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface CreateCourierRequestDto {
  courierName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNo?: string;
  trackingUrl?: string;
}

export interface UpdateCourierRequestDto {
  courierName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNo?: string;
  trackingUrl?: string;
  isActive: boolean;
}

export interface CourierSearchRequestDto {
  courierName?: string;
  contactPerson?: string;
  isActive?: boolean;
}

// ============================================
// SALES ORDER WEB DTOs
// ============================================

export interface SalesOrderWebResponseDto {
  id: number;

  // Voucher details
  voucherType: string;
  voucherNumber: string;
  orderDate: string; // ISO 8601 datetime
  termsOfPayment: string;
  isJobWork: boolean; // Checkbox for job work
  serialNo?: string; // Add serial number field

  // Company details
  companyName: string;
  companyGSTIN: string;
  companyState: string;

  // Buyer details (Bill To)
  buyerName: string;
  buyerGSTIN?: string | null;
  buyerState?: string | null;
  buyerPhone: string;
  buyerContactPerson: string;
  buyerAddress: string;

  // Consignee details (Ship To)
  consigneeName: string;
  consigneeGSTIN?: string | null;
  consigneeState?: string | null;
  consigneePhone: string;
  consigneeContactPerson: string;
  consigneeAddress: string;

  // Order details
  remarks: string;
  otherReference?: string;
  orderNo?: string;
  termsOfDelivery?: string;
  dispatchThrough?: string;

  // New fields for totals
  totalQuantity: number;
  totalAmount: number;

  // Items
  items: SalesOrderItemWebResponseDto[];

  // Process fields
  isProcess: boolean;
  processDate?: string;

  // Audit fields
  createdAt: string; // ISO 8601 datetime
  createdBy: string;
  updatedAt: string; // ISO 8601 datetime
  updatedBy: string;
}

export interface SalesOrderItemWebResponseDto {
  id: number;
  salesOrderWebId: number;
  itemName: string;
  hsncode: string;
  yarnCount: string;
  dia: number;
  gg: number;
  fabricType: string;
  composition: string;
  wtPerRoll: number;
  noOfRolls: number;
  rate: number;
  qty: number;
  amount: number;
  igst: number;
  sgst: number;
  cgst: number;
  remarks: string;
  unit?: string;
  slitLine?: string;
  stitchLength?: string;
  dueDate?: string;
  isProcess: boolean;
  processDate?: string;
}

export interface CreateSalesOrderWebRequestDto {
  // Voucher details
  voucherType: string;
  voucherNumber: string;
  orderDate: string; // ISO 8601 datetime
  termsOfPayment?: string;
  isJobWork: boolean; // Checkbox for job work
  serialNo?: string; // Add serial number field

  // Company details
  companyName: string;
  companyGSTIN: string;
  companyState: string;

  // Buyer details (Bill To)
  buyerName: string;
  buyerGSTIN?: string | null;
  buyerState?: string | null;
  buyerPhone: string;
  buyerContactPerson: string;
  buyerAddress: string;

  // Consignee details (Ship To)
  consigneeName: string;
  consigneeGSTIN?: string | null;
  consigneeState?: string | null;
  consigneePhone: string;
  consigneeContactPerson: string;
  consigneeAddress: string;

  // Order details
  remarks: string;
  otherReference?: string;
  orderNo?: string;
  termsOfDelivery?: string;
  dispatchThrough?: string;
  isProcess: boolean;
  // New fields for totals
  totalQuantity: number;
  totalAmount: number;
  
  // Audit fields
  createdBy: string;

  // Items
  items: CreateSalesOrderItemWebRequestDto[];
}

export interface CreateSalesOrderItemWebRequestDto {
  // Item details
  itemName: string;
  hsncode: string;
  yarnCount: string;
  dia: number;
  gg: number;
  fabricType: string;
  composition: string;
  wtPerRoll: number;
  noOfRolls: number;
  rate: number;
  qty: number;
  amount: number;
  igst: number;
  sgst: number;
  cgst: number; // Added CGST field
  remarks: string;

  // New fields
  unit?: string; // Unit field
  slitLine?: string;
  stitchLength?: string;
  dueDate?: string;
  isProcess?: boolean; // Process flag
}

export interface UpdateSalesOrderWebRequestDto {
  // Voucher details
  voucherType: string;
  voucherNumber: string;
  orderDate: string; // ISO 8601 datetime
  termsOfPayment: string;
  isJobWork: boolean; // Checkbox for job work
  serialNo?: string; // Add serial number field

  // Company details
  companyName: string;
  companyGSTIN: string;
  companyState: string;

  // Buyer details (Bill To)
  buyerName: string;
  buyerGSTIN?: string | null;
  buyerState?: string | null;
  buyerPhone: string;
  buyerContactPerson: string;
  buyerAddress: string;

  // Consignee details (Ship To)
  consigneeName: string;
  consigneeGSTIN?: string | null;
  consigneeState?: string | null;
  consigneePhone: string;
  consigneeContactPerson: string;
  consigneeAddress: string;

  // Order details
  remarks: string;
  otherReference: string;
  orderNo?: string;
  termsOfDelivery?: string;
  dispatchThrough?: string;

  // New fields for totals
  totalQuantity: number;
  totalAmount: number;
  
  // Audit fields
  updatedBy: string;

  // Items
  items: UpdateSalesOrderItemWebRequestDto[];
}

export interface UpdateSalesOrderItemWebRequestDto {
  id?: number;

  // Item details
  itemName: string;
  hsncode: string;
  yarnCount: string;
  dia: number;
  gg: number;
  fabricType: string;
  composition: string;
  wtPerRoll: number;
  noOfRolls: number;
  rate: number;
  qty: number;
  amount: number;
  igst: number;
  sgst: number;
  cgst: number; // Added CGST field
  remarks: string;

  // New fields
  unit?: string; // Unit field
  slitLine?: string;
  stitchLength?: string;
  dueDate?: string;
  isProcess?: boolean; // Process flag
}

// ============================================
// SLIT LINE DTOs (AvyyanBackend.DTOs.SlitLine)
// ============================================

export interface SlitLineResponseDto {
  id: number;
  slitLine: string;
  slitLineCode: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface CreateSlitLineRequestDto {
  slitLine: string;
  slitLineCode: string;
}

export interface UpdateSlitLineRequestDto {
  slitLine: string;
  slitLineCode: string;
  isActive: boolean;
}

export interface SlitLineSearchRequestDto {
  slitLine?: string;
  slitLineCode?: string;
  isActive?: boolean;
}

export interface FgRollDto {
  machineNo: string;
  machineRollNo?: string;  // Added new optional field
  rollNumber: string;
  grossWt?: string;
  netWt?: string;
  isDispatched?: boolean;
}

export interface VoucherGroupDto {
  voucherNo: string;
  itemName: string;
  lotNo: string;
  tape?: string;
  location?: string;
  rolls: FgRollDto[];
}

export interface UploadFgRollsResponseDto {
  success: boolean;
  message: string;
  totalRolls: number;
  data: VoucherGroupDto[];
}

// ============================================
// REPORT DTOs
// ============================================

export interface FabricPlanReportDto {
  diaGg: string;
  programCompletionDate: string; // ISO 8601 datetime
  customerName: string;
  count: number;
  fabricLotNo: string;
  numberOfRunningMachines: number;
  sumOfPerDayProduction: number;
  sumOfOrderQuantity: number;
  sumOfUpdatedQuantity: number;
  sumOfBalanceQuantity: number;
  balanceDays: number;
}

export interface FabricPlanReportFilterDto {
  diaGg?: string;
  customerName?: string;
  yarnCount?: string;
  fromDate?: string; // ISO 8601 date
  toDate?: string; // ISO 8601 date
}

export interface FabricPlanReportSummaryDto {
  diaGg: string;
  totalPerDayProduction: number;
  totalOrderQuantity: number;
  totalUpdatedQuantity: number;
  totalBalanceQuantity: number;
  totalRunningMachines: number;
}

export interface FabricPlanReportResponseDto {
  reports: FabricPlanReportDto[];
  summaries: FabricPlanReportSummaryDto[];
  grandTotal: FabricPlanReportSummaryDto;
}

export interface FabricPlanFilterOptionsDto {
  diaGgOptions: string[];
  customerOptions: string[];
  yarnCountOptions: string[];
}
