import axios from 'axios';
import type { AxiosResponse, AxiosError } from 'axios';
import { getToken } from '@/lib/auth';
import type {
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  UserProfileResponseDto,
  AdminUserResponseDto,
  CreateUserRequestDto,
  UpdateUserRequestDto,
  RoleResponseDto,
  CreateRoleRequestDto,
  UpdateRoleRequestDto,
  MachineResponseDto,
  CreateMachineRequestDto,
  UpdateMachineRequestDto,
  MachineSearchRequestDto,
  BulkCreateMachineRequestDto,
  ChangePasswordRequestDto,
  ResetPasswordRequestDto,
  UserPermissionsResponseDto,
  PageAccessResponseDto,
  MessageResponseDto,
  FabricStructureResponseDto,
  CreateFabricStructureRequestDto,
  UpdateFabricStructureRequestDto,
  FabricStructureSearchRequestDto,
  LocationResponseDto,
  CreateLocationRequestDto,
  UpdateLocationRequestDto,
  LocationSearchRequestDto,
  YarnTypeResponseDto,
  CreateYarnTypeRequestDto,
  UpdateYarnTypeRequestDto,
  YarnTypeSearchRequestDto,
  RefreshTokenRequestDto,
  SalesOrderDto,
  VoucherDto,
  ProductionAllotmentResponseDto,
  RollConfirmationRequestDto,
  RollConfirmationResponseDto,
  RollConfirmationUpdateDto,
  InspectionRequestDto,
  InspectionResponseDto,
  TapeColorResponseDto,
  CreateTapeColorRequestDto,
  UpdateTapeColorRequestDto,
  TapeColorSearchRequestDto,
  ShiftResponseDto,
  CreateShiftRequestDto,
  UpdateShiftRequestDto,
  ShiftSearchRequestDto,
  CreateRollAssignmentRequest,
  RollAssignmentResponseDto,
  GenerateStickersRequest,
  GenerateBarcodesRequest,
  StorageCaptureResponseDto,
  CreateStorageCaptureRequestDto,
  UpdateStorageCaptureRequestDto,
  StorageCaptureSearchRequestDto,
  StorageCaptureRollDataResponseDto,
  WeightDataRequestDto,
  WeightDataResponseDto,
  DispatchPlanningDto,
  CreateDispatchPlanningRequestDto,
  UpdateDispatchPlanningRequestDto,
  DispatchedRollDto,
  CreateDispatchedRollRequestDto,
  TransportResponseDto,
  CreateTransportRequestDto,
  UpdateTransportRequestDto,
  TransportSearchRequestDto,
  CourierResponseDto,
  CreateCourierRequestDto,
  UpdateCourierRequestDto,
  CourierSearchRequestDto,
  SlitLineResponseDto,
  CreateSlitLineRequestDto,
  UpdateSlitLineRequestDto,
  SlitLineSearchRequestDto,
  UploadFgRollsResponseDto,
  FinalFabricReportDto,
  FabricStockReportDto,
  UpdateMachineAllocationsRequest
} from '@/types/api-types';

// Add TallyApiResponse interface
interface TallyApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// Add StockItem interface for Tally integration
interface StockItem {
  id: number;
  name: string;
  alias?: string;
  unit?: string;
  category?: string;
  hsncode?: string;
  yarnCount?: string;
  fabricType?: string;
}

// API Configuration
const API_CONFIG = {
  DEVELOPMENT_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  PRODUCTION_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
};

// Determine base URL based on environment
const getBaseUrl = () => {
  return import.meta.env.DEV ? API_CONFIG.DEVELOPMENT_URL : API_CONFIG.PRODUCTION_URL;
};

// Create a separate axios instance for auth refresh to avoid circular dependencies
const authRefreshClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to refresh token without using authApi (to avoid circular dependency)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const refreshAuthToken = async (refreshToken: string): Promise<unknown> => {
  try {
    const response = await authRefreshClient.post('/Auth/refresh', { refreshToken });
    return response.data;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    throw error;
  }
};

// Create axios instance
const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      apiUtils.clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Export the main API client
export default apiClient;

// Add apiUtils object with helper functions
export const apiUtils = {
  // Extract data from Axios response
  extractData: <T>(response: AxiosResponse<T>): T => {
    return response.data;
  },

  // Handle API errors and return user-friendly messages
  handleError: (error: unknown): string => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as AxiosError<{ message?: string; error?: string }>;
      if (axiosError.response?.data?.message) {
        return axiosError.response.data.message;
      }

      if (axiosError.response?.data?.error) {
        return axiosError.response.data.error;
      }
    }

    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }

    return 'An unexpected error occurred';
  },

  // Auth token management
  getAuthToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },

  setAuthToken: (token: string): void => {
    localStorage.setItem('auth_token', token);
  },

  clearAuth: (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
  },
};

// ============================================
// AUTHENTICATION API (/api/Auth)
// ============================================

export const authApi = {
  // POST /api/Auth/login - User login
  login: (data: LoginRequestDto): Promise<AxiosResponse<LoginResponseDto>> =>
    apiClient.post('/Auth/login', data),

  // POST /api/Auth/refresh - Refresh authentication token
  refreshToken: (data: RefreshTokenRequestDto): Promise<AxiosResponse<LoginResponseDto>> =>
    apiClient.post('/Auth/refresh', data),

  // POST /api/Auth/register - User registration
  register: (data: RegisterRequestDto): Promise<AxiosResponse<LoginResponseDto>> =>
    apiClient.post('/Auth/register', data),

  // POST /api/Auth/change-password - Change user password
  changePassword: (data: ChangePasswordRequestDto): Promise<AxiosResponse<MessageResponseDto>> =>
    apiClient.post('/Auth/change-password', data),

  // POST /api/Auth/reset-password - Reset user password
  resetPassword: (data: ResetPasswordRequestDto): Promise<AxiosResponse<MessageResponseDto>> =>
    apiClient.post('/Auth/reset-password', data),

  // GET /api/Auth/profile - Get current user profile
  getProfile: (): Promise<AxiosResponse<UserProfileResponseDto>> =>
    apiClient.get('/Auth/profile'),

  // PUT /api/Auth/profile - Update current user profile
  updateProfile: (data: Partial<UserProfileResponseDto>): Promise<AxiosResponse<UserProfileResponseDto>> =>
    apiClient.put('/Auth/profile', data),

  // POST /api/Auth/logout - User logout
  logout: (): Promise<AxiosResponse<MessageResponseDto>> =>
    apiClient.post('/Auth/logout'),
};

// ============================================
// USER MANAGEMENT API (/api/User)
// ============================================

export const userApi = {
  // GET /api/User - Get all users (admin only)
  getAllUsers: (): Promise<AxiosResponse<AdminUserResponseDto[]>> =>
    apiClient.get('/User'),

  // GET /api/User/{id} - Get user by ID (admin only)
  getUser: (id: number): Promise<AxiosResponse<AdminUserResponseDto>> =>
    apiClient.get(`/User/${id}`),

  // GET /api/User/permissions/{userId} - Get user permissions
  getUserPermissions: (userId: number): Promise<AxiosResponse<UserPermissionsResponseDto>> =>
    apiClient.get(`/User/permissions/${userId}`),

  // POST /api/User - Create new user (admin only)
  createUser: (data: CreateUserRequestDto): Promise<AxiosResponse<AdminUserResponseDto>> =>
    apiClient.post('/User', data),

  // PUT /api/User/{id} - Update user (admin only)
  updateUser: (id: number, data: UpdateUserRequestDto): Promise<AxiosResponse<AdminUserResponseDto>> =>
    apiClient.put(`/User/${id}`, data),

  // DELETE /api/User/{id} - Delete user (admin only)
  deleteUser: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/User/${id}`),

  // GET /api/User/profile - Get current user profile (alternative endpoint)
  getProfile: (): Promise<AxiosResponse<UserProfileResponseDto>> =>
    apiClient.get('/User/profile'),

  // POST /api/User/change-password - Change user password
  changePassword: (data: ChangePasswordRequestDto): Promise<AxiosResponse<MessageResponseDto>> =>
    apiClient.post('/User/change-password', data),

  // GET /api/User/permissions - Get current user permissions
  getPermissions: (): Promise<AxiosResponse<UserPermissionsResponseDto>> =>
    apiClient.get('/User/permissions'),
};

// ============================================
// ROLE MANAGEMENT API (/api/Role)
// ============================================

export const roleApi = {
  // GET /api/Role - Get all roles
  getAllRoles: (): Promise<AxiosResponse<RoleResponseDto[]>> =>
    apiClient.get('/Role'),

  // GET /api/Role/{id} - Get role by ID
  getRole: (id: number): Promise<AxiosResponse<RoleResponseDto>> =>
    apiClient.get(`/Role/${id}`),

  // GET /api/Role/{id}/page-accesses - Get role page accesses
  getRolePageAccesses: (id: number): Promise<AxiosResponse<PageAccessResponseDto[]>> =>
    apiClient.get(`/Role/${id}/page-accesses`),

  // POST /api/Role - Create new role
  createRole: (data: CreateRoleRequestDto): Promise<AxiosResponse<RoleResponseDto>> =>
    apiClient.post('/Role', data),

  // PUT /api/Role/{id} - Update role
  updateRole: (id: number, data: UpdateRoleRequestDto): Promise<AxiosResponse<RoleResponseDto>> =>
    apiClient.put(`/Role/${id}`, data),

  // DELETE /api/Role/{id} - Delete role
  deleteRole: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/Role/${id}`),
};

// ============================================
// MACHINE MANAGEMENT API (/api/Machine)
// ============================================

export const machineApi = {
  // GET /api/Machine - Get all machines
  getAllMachines: (): Promise<AxiosResponse<MachineResponseDto[]>> =>
    apiClient.get('/Machine'),

  // GET /api/Machine/{id} - Get machine by ID
  getMachine: (id: number): Promise<AxiosResponse<MachineResponseDto>> =>
    apiClient.get(`/Machine/${id}`),

  // POST /api/Machine - Create new machine
  createMachine: (data: CreateMachineRequestDto): Promise<AxiosResponse<MachineResponseDto>> =>
    apiClient.post('/Machine', data),

  // PUT /api/Machine/{id} - Update machine
  updateMachine: (id: number, data: UpdateMachineRequestDto): Promise<AxiosResponse<MachineResponseDto>> =>
    apiClient.put(`/Machine/${id}`, data),

  // DELETE /api/Machine/{id} - Delete machine
  deleteMachine: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/Machine/${id}`),

  // GET /api/Machine/search - Search machines
  searchMachines: (params: MachineSearchRequestDto): Promise<AxiosResponse<MachineResponseDto[]>> =>
    apiClient.get('/Machine/search', { params }),

  // POST /api/Machine/bulk - Bulk create machines
  createBulkMachines: (data: BulkCreateMachineRequestDto): Promise<AxiosResponse<MachineResponseDto[]>> =>
    apiClient.post('/Machine/bulk', data),

  // POST /api/Machine/generate-qr/{id} - Generate QR code for machine
  generateQRCode: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    apiClient.post(`/Machine/generate-qr/${id}`),
};

// ============================================
// LOCATION API (/api/Location)
// ============================================

export const locationApi = {
  // GET /api/Location - Get all locations
  getAllLocations: (): Promise<AxiosResponse<LocationResponseDto[]>> =>
    apiClient.get('/Location'),

  // GET /api/Location/{id} - Get location by ID
  getLocation: (id: number): Promise<AxiosResponse<LocationResponseDto>> =>
    apiClient.get(`/Location/${id}`),

  // POST /api/Location - Create new location
  createLocation: (data: CreateLocationRequestDto): Promise<AxiosResponse<LocationResponseDto>> =>
    apiClient.post('/Location', data),

  // PUT /api/Location/{id} - Update location
  updateLocation: (id: number, data: UpdateLocationRequestDto): Promise<AxiosResponse<LocationResponseDto>> =>
    apiClient.put(`/Location/${id}`, data),

  // DELETE /api/Location/{id} - Delete location
  deleteLocation: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/Location/${id}`),

  // GET /api/Location/search - Search locations
  searchLocations: (params: LocationSearchRequestDto): Promise<AxiosResponse<LocationResponseDto[]>> =>
    apiClient.get('/Location/search', { params }),
};

// ============================================
// FABRIC STRUCTURE API (/api/FabricStructure)
// ============================================

export const fabricStructureApi = {
  // GET /api/FabricStructure - Get all fabric structures
  getAllFabricStructures: (): Promise<AxiosResponse<FabricStructureResponseDto[]>> =>
    apiClient.get('/FabricStructure'),

  // GET /api/FabricStructure/{id} - Get fabric structure by ID
  getFabricStructure: (id: number): Promise<AxiosResponse<FabricStructureResponseDto>> =>
    apiClient.get(`/FabricStructure/${id}`),

  // POST /api/FabricStructure - Create new fabric structure
  createFabricStructure: (data: CreateFabricStructureRequestDto): Promise<AxiosResponse<FabricStructureResponseDto>> =>
    apiClient.post('/FabricStructure', data),

  // PUT /api/FabricStructure/{id} - Update fabric structure
  updateFabricStructure: (id: number, data: UpdateFabricStructureRequestDto): Promise<AxiosResponse<FabricStructureResponseDto>> =>
    apiClient.put(`/FabricStructure/${id}`, data),

  // DELETE /api/FabricStructure/{id} - Delete fabric structure
  deleteFabricStructure: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/FabricStructure/${id}`),

  // GET /api/FabricStructure/search - Search fabric structures
  searchFabricStructures: (params: FabricStructureSearchRequestDto): Promise<AxiosResponse<FabricStructureResponseDto[]>> =>
    apiClient.get('/FabricStructure/search', { params }),
};

// ============================================
// YARN TYPE API (/api/YarnType)
// ============================================

export const yarnTypeApi = {
  // GET /api/YarnType - Get all yarn types
  getAllYarnTypes: (): Promise<AxiosResponse<YarnTypeResponseDto[]>> =>
    apiClient.get('/YarnType'),

  // GET /api/YarnType/{id} - Get yarn type by ID
  getYarnType: (id: number): Promise<AxiosResponse<YarnTypeResponseDto>> =>
    apiClient.get(`/YarnType/${id}`),

  // POST /api/YarnType - Create new yarn type
  createYarnType: (data: CreateYarnTypeRequestDto): Promise<AxiosResponse<YarnTypeResponseDto>> =>
    apiClient.post('/YarnType', data),

  // PUT /api/YarnType/{id} - Update yarn type
  updateYarnType: (id: number, data: UpdateYarnTypeRequestDto): Promise<AxiosResponse<YarnTypeResponseDto>> =>
    apiClient.put(`/YarnType/${id}`, data),

  // DELETE /api/YarnType/{id} - Delete yarn type
  deleteYarnType: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/YarnType/${id}`),

  // POST /api/YarnType/search - Search yarn types
  searchYarnTypes: (data: YarnTypeSearchRequestDto): Promise<AxiosResponse<YarnTypeResponseDto[]>> =>
    apiClient.post('/YarnType/search', data),
};

// ============================================
// TAPE COLOR API (/api/TapeColor)
// ============================================

export const tapeColorApi = {
  // GET /api/TapeColor - Get all tape colors
  getAllTapeColors: (): Promise<AxiosResponse<TapeColorResponseDto[]>> =>
    apiClient.get('/TapeColor'),

  // GET /api/TapeColor/{id} - Get tape color by ID
  getTapeColor: (id: number): Promise<AxiosResponse<TapeColorResponseDto>> =>
    apiClient.get(`/TapeColor/${id}`),

  // GET /api/TapeColor/is-assigned/{lotmentId} - Check if tape color is assigned to lotment
  isTapeColorAssignedToLotment: (lotmentId: string, tapeColor: string): Promise<AxiosResponse<boolean>> =>
    apiClient.get(`/TapeColor/is-assigned/${lotmentId}`, { params: { tapeColor } }),

  // POST /api/TapeColor - Create new tape color
  createTapeColor: (data: CreateTapeColorRequestDto): Promise<AxiosResponse<TapeColorResponseDto>> =>
    apiClient.post('/TapeColor', data),

  // PUT /api/TapeColor/{id} - Update tape color
  updateTapeColor: (id: number, data: UpdateTapeColorRequestDto): Promise<AxiosResponse<TapeColorResponseDto>> =>
    apiClient.put(`/TapeColor/${id}`, data),

  // DELETE /api/TapeColor/{id} - Delete tape color
  deleteTapeColor: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/TapeColor/${id}`),

  // GET /api/TapeColor/search - Search tape colors
  searchTapeColors: (params: TapeColorSearchRequestDto): Promise<AxiosResponse<TapeColorResponseDto[]>> =>
    apiClient.get('/TapeColor/search', { params }),
};

// ============================================
// SHIFT API (/api/Shift)
// ============================================

export const shiftApi = {
  // GET /api/Shift - Get all shifts
  getAllShifts: (): Promise<AxiosResponse<ShiftResponseDto[]>> =>
    apiClient.get('/Shift'),

  // GET /api/Shift/{id} - Get shift by ID
  getShift: (id: number): Promise<AxiosResponse<ShiftResponseDto>> =>
    apiClient.get(`/Shift/${id}`),

  // POST /api/Shift - Create new shift
  createShift: (data: CreateShiftRequestDto): Promise<AxiosResponse<ShiftResponseDto>> =>
    apiClient.post('/Shift', data),

  // PUT /api/Shift/{id} - Update shift
  updateShift: (id: number, data: UpdateShiftRequestDto): Promise<AxiosResponse<ShiftResponseDto>> =>
    apiClient.put(`/Shift/${id}`, data),

  // DELETE /api/Shift/{id} - Delete shift
  deleteShift: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/Shift/${id}`),

  // GET /api/Shift/search - Search shifts
  searchShifts: (params: ShiftSearchRequestDto): Promise<AxiosResponse<ShiftResponseDto[]>> =>
    apiClient.get('/Shift/search', { params }),
};

// ============================================
// VOUCHERS API (/api/Vouchers)
// ============================================

export const vouchersApi = {
  // GET /api/Vouchers - Get all vouchers
  getAllVouchers: (): Promise<AxiosResponse<VoucherDto[]>> =>
    apiClient.get('/Vouchers'),
};

// ============================================
// COMPANY API (/api/Company)
// ============================================

export const companyApi = {
  // GET /api/Company - Get company names
  getCompanyNames: (): Promise<AxiosResponse<TallyApiResponse<string[]>>> =>
    apiClient.get('/Company'),

  // GET /api/Company/details - Get detailed company information
  getCompanyDetails: (): Promise<AxiosResponse<TallyApiResponse<any[]>>> =>
    apiClient.get('/Company/details'),
};

// ============================================
// ALL LEDGER API (/api/AllLedger)
// ============================================

export const allLedgerApi = {
  // GET /api/AllLedger/GetCustomer - Get all customers
  getCustomers: (): Promise<AxiosResponse<TallyApiResponse<string[]>>> =>
    apiClient.get('/AllLedger/GetCustomer'),

  // GET /api/AllLedger/GetSupplier - Get all suppliers
  getSuppliers: (): Promise<AxiosResponse<TallyApiResponse<string[]>>> =>
    apiClient.get('/AllLedger/GetSupplier'),

  // GET /api/AllLedger/GetCustomerData - Get detailed customer data
  getCustomerData: (): Promise<AxiosResponse<TallyApiResponse<any[]>>> =>
    apiClient.get('/AllLedger/GetCustomerData'),
};

// ============================================
// STOCK ITEM API (/api/StockItem)
// ============================================

export const stockItemApi = {
  // GET /api/StockItem - Get all stock items
  getStockItems: (): Promise<AxiosResponse<TallyApiResponse<StockItem[]>>> =>
    apiClient.get('/StockItem'),
};

// ============================================
// SALES ORDER API (/api/SalesOrder)
// ============================================

export const salesOrderApi = {
  // GET /api/SalesOrder/unprocessed - Get all unprocessed sales orders
  getUnprocessedSalesOrders: (): Promise<AxiosResponse<SalesOrderDto[]>> =>
    apiClient.get('/SalesOrder/unprocessed'),

  // GET /api/SalesOrder/processed - Get all processed sales orders
  getProcessedSalesOrders: (): Promise<AxiosResponse<SalesOrderDto[]>> =>
    apiClient.get('/SalesOrder/processed'),

  // GET /api/SalesOrder - Get all sales orders
  getAllSalesOrders: (): Promise<AxiosResponse<SalesOrderDto[]>> =>
    apiClient.get('/SalesOrder'),

  // GET /api/SalesOrder/{id} - Get sales order by ID
  getSalesOrderById: (id: number): Promise<AxiosResponse<SalesOrderDto>> =>
    apiClient.get(`/SalesOrder/${id}`),
};

// ============================================
// PRODUCTION ALLOTMENT API (/api/ProductionAllotment)
// ============================================

// Add this interface for the search request
export interface ProductionAllotmentSearchRequestDto {
  voucherNumber?: string;
  fromDate?: string; // ISO date string
  toDate?: string; // ISO date string
}

export const productionAllotmentApi = {
  // GET /api/ProductionAllotment - Get all production allotments
  getAllProductionAllotments: (): Promise<AxiosResponse<ProductionAllotmentResponseDto[]>> =>
    apiClient.get('/ProductionAllotment'),

  // GET /api/ProductionAllotment/search - Search production allotments
  searchProductionAllotments: (params?: ProductionAllotmentSearchRequestDto): Promise<AxiosResponse<ProductionAllotmentResponseDto[]>> =>
    apiClient.get('/ProductionAllotment/search', { params }),

  // GET /api/ProductionAllotment/next-serial-number - Get next serial number
  getNextSerialNumber: (): Promise<AxiosResponse<string>> =>
    apiClient.get('/ProductionAllotment/next-serial-number'),

  // GET /api/ProductionAllotment/by-allot-id/{allotId} - Get production allotment by AllotmentId
  getProductionAllotmentByAllotId: (allotId: string): Promise<AxiosResponse<ProductionAllotmentResponseDto>> =>
    apiClient.get(`/ProductionAllotment/by-allot-id/${allotId}`),

  // PUT /api/ProductionAllotment/{id}/status - Update production allotment status
  updateStatus: (id: number, data: { status: string }): Promise<AxiosResponse<{ message: string; status: string }>> =>
    apiClient.put(`/ProductionAllotment/${id}/status`, data),

  // POST /api/ProductionAllotment/stkprint/{id} - Generate QR codes for machine allocation
  generateQRCodes: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    apiClient.post(`/ProductionAllotment/stkprint/${id}`),

  // POST /api/ProductionAllotment/stkprint/roll-assignment/{id} - Generate QR codes for specific roll numbers in a roll assignment
  generateQRCodesForRollAssignment: (id: number, rollNumbers: number[]): Promise<AxiosResponse<{ message: string }>> =>
    apiClient.post(`/ProductionAllotment/stkprint/roll-assignment/${id}`, { rollNumbers }),

  // POST /api/ProductionAllotment/fgsticker/{id} - Print FG Roll sticker
  printFGRollSticker: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    apiClient.post(`/ProductionAllotment/fgsticker/${id}`),

  // POST /api/ProductionAllotment/fgsticker/bulk - Print FG Roll stickers for multiple roll confirmations
  printFGRollStickersBulk: (ids: number[]): Promise<AxiosResponse<{ message: string; results?: any[]; success: boolean }>> =>
    apiClient.post(`/ProductionAllotment/fgsticker/bulk`, ids),

  // PUT /api/ProductionAllotment/machine-allocations/{allotmentId} - Update machine allocations for a production allotment
  updateMachineAllocations: (allotmentId: string, data: UpdateMachineAllocationsRequest): Promise<AxiosResponse<ProductionAllotmentResponseDto>> =>
    apiClient.put(`/ProductionAllotment/machine-allocations/${allotmentId}`, data),

  // PUT /api/ProductionAllotment/{id}/hold - Toggle hold status
  toggleHold: (id: number): Promise<AxiosResponse<ProductionAllotmentResponseDto>> =>
    apiClient.put(`/ProductionAllotment/${id}/hold`),

  // PUT /api/ProductionAllotment/{id}/suspend - Suspend production planning
  suspendPlanning: (id: number): Promise<AxiosResponse<ProductionAllotmentResponseDto>> =>
    apiClient.put(`/ProductionAllotment/${id}/suspend`),

  // GET /api/ProductionAllotment/{allotmentId}/status - Check if stickers have been generated or roll confirmations exist
  checkAllotmentStatus: (allotmentId: string): Promise<AxiosResponse<{ hasRollConfirmation: boolean; hasStickersGenerated: boolean; hasRollAssignment: boolean }>> =>
    apiClient.get(`/ProductionAllotment/${allotmentId}/status`),

  // PUT /api/ProductionAllotment/{id}/restart - Restart production from suspended status
  restartProduction: (id: number): Promise<AxiosResponse<ProductionAllotmentResponseDto>> =>
    apiClient.put(`/ProductionAllotment/${id}/restart`),

  // PUT /api/ProductionAllotment/{id}/status - Update production status
  updateProductionStatus: (id: number, status: number): Promise<AxiosResponse<ProductionAllotmentResponseDto>> =>
    apiClient.put(`/ProductionAllotment/${id}/status`, { status }),

  // GET /api/ProductionAllotment/sales-order/{salesOrderId}/lots - Get all lots for a sales order (without requiring itemId)
  getLotsForSalesOrder: (salesOrderId: number): Promise<AxiosResponse<ProductionAllotmentResponseDto[]>> =>
    apiClient.get(`/ProductionAllotment/sales-order/${salesOrderId}/lots`),

  // GET /api/ProductionAllotment/sales-order/{salesOrderId}/items/{salesOrderItemId}/lots - Get lots for a sales order item
  getLotsForSalesOrderItem: (salesOrderId: number, salesOrderItemId: number): Promise<AxiosResponse<ProductionAllotmentResponseDto[]>> =>
    apiClient.get(`/ProductionAllotment/sales-order/${salesOrderId}/items/${salesOrderItemId}/lots`),

  // GET /api/ProductionAllotment/sales-order/{salesOrderId}/items/{salesOrderItemId}/roll-confirmation-summary - Get roll confirmation summary for a sales order item
  getRollConfirmationSummaryForSalesOrderItem: (salesOrderId: number, salesOrderItemId: number): Promise<AxiosResponse<{ TotalLots: number; TotalRollConfirmations: number; TotalNetWeight: number }>> =>
    apiClient.get(`/ProductionAllotment/sales-order/${salesOrderId}/items/${salesOrderItemId}/roll-confirmation-summary`),
};

// ============================================
// ROLL CONFIRMATION API (/api/RollConfirmation)
// ============================================

export const rollConfirmationApi = {
  // POST /api/RollConfirmation - Create new roll confirmation
  createRollConfirmation: (data: RollConfirmationRequestDto): Promise<AxiosResponse<RollConfirmationResponseDto>> =>
    apiClient.post('/RollConfirmation', data),

  // GET /api/RollConfirmation/{id} - Get roll confirmation by ID
  getRollConfirmation: (id: number): Promise<AxiosResponse<RollConfirmationResponseDto>> =>
    apiClient.get(`/RollConfirmation/${id}`),

  // GET /api/RollConfirmation/by-allot-id/{allotId} - Get roll confirmations by AllotId
  getRollConfirmationsByAllotId: (allotId: string): Promise<AxiosResponse<RollConfirmationResponseDto[]>> =>
    apiClient.get(`/RollConfirmation/by-allot-id/${allotId}`),

  // GET /api/RollConfirmation/by-allot-ids - Get roll confirmations for multiple allot IDs (bulk fetch)
  getRollConfirmationsByAllotIds: (allotIds: string[]): Promise<AxiosResponse<Record<string, RollConfirmationResponseDto[]>>> =>
    apiClient.get('/RollConfirmation/by-allot-ids', {
      params: { allotIds: allotIds.join(',') }
    }),

  // PUT /api/RollConfirmation/{id} - Update roll confirmation with weight data
  updateRollConfirmation: (id: number, data: RollConfirmationUpdateDto): Promise<AxiosResponse<RollConfirmationResponseDto>> =>
    apiClient.put(`/RollConfirmation/${id}`, data),

  // GET /api/RollConfirmation/weight-data - Get weight data from TCP client
  getWeightData: (params: WeightDataRequestDto): Promise<AxiosResponse<WeightDataResponseDto>> =>
    apiClient.get('/RollConfirmation/weight-data', { params }),

  // GET /api/RollConfirmation - Get all roll confirmations
  getAllRollConfirmations: (): Promise<AxiosResponse<RollConfirmationResponseDto[]>> =>
    apiClient.get('/RollConfirmation'),
};

// ============================================
// ROLL ASSIGNMENT API (/api/RollAssignment)
// ============================================

export const rollAssignmentApi = {
  // POST /api/RollAssignment - Create new roll assignment
  createRollAssignment: (data: CreateRollAssignmentRequest): Promise<AxiosResponse<RollAssignmentResponseDto>> =>
    apiClient.post('/RollAssignment', data),

  // POST /api/RollAssignment/generate-stickers - Generate stickers for roll assignment
  generateStickers: (data: GenerateStickersRequest): Promise<AxiosResponse<RollAssignmentResponseDto>> =>
    apiClient.post('/RollAssignment/generate-stickers', data),

  // POST /api/RollAssignment/generate-barcodes - Generate barcodes for roll assignment
  generateBarcodes: (data: GenerateBarcodesRequest): Promise<AxiosResponse<RollAssignmentResponseDto>> =>
    apiClient.post('/RollAssignment/generate-barcodes', data),

  // GET /api/RollAssignment/by-machine-allocation/{machineAllocationId} - Get roll assignments by MachineAllocationId
  getRollAssignmentsByMachineAllocationId: (machineAllocationId: number): Promise<AxiosResponse<RollAssignmentResponseDto[]>> =>
    apiClient.get(`/RollAssignment/by-machine-allocation/${machineAllocationId}`),
};

// ============================================
// INSPECTION API (/api/Inspection)
// ============================================

export const inspectionApi = {
  // POST /api/Inspection - Create new inspection
  createInspection: (data: InspectionRequestDto): Promise<AxiosResponse<InspectionResponseDto>> =>
    apiClient.post('/Inspection', data),

  // GET /api/Inspection/{id} - Get inspection by ID
  getInspection: (id: number): Promise<AxiosResponse<InspectionResponseDto>> =>
    apiClient.get(`/Inspection/${id}`),

  // GET /api/Inspection/by-allot-id/{allotId} - Get inspections by AllotId
  getInspectionsByAllotId: (allotId: string): Promise<AxiosResponse<InspectionResponseDto[]>> =>
    apiClient.get(`/Inspection/by-allot-id/${allotId}`),
};

// ============================================
// STORAGE CAPTURE API (/api/StorageCapture)
// ============================================

export const storageCaptureApi = {
  // GET /api/StorageCapture - Get all storage captures
  getAllStorageCaptures: (): Promise<AxiosResponse<StorageCaptureResponseDto[]>> =>
    apiClient.get('/StorageCapture'),

  // GET /api/StorageCapture/by-lots - Get storage captures by multiple lot numbers
  getStorageCapturesByLots: (
    lotNumbers: string[]
  ): Promise<AxiosResponse<StorageCaptureResponseDto[]>> =>
    apiClient.get('/StorageCapture/by-lots', {
      params: { lotNumbers: lotNumbers.join(',') }
    }),

  // GET /api/StorageCapture/search - Search storage captures
  searchStorageCaptures: (
    params: StorageCaptureSearchRequestDto
  ): Promise<AxiosResponse<StorageCaptureResponseDto[]>> =>
    apiClient.get('/StorageCapture/search', { params }),

  // POST /api/StorageCapture - Create a new storage capture
  createStorageCapture: (
    data: CreateStorageCaptureRequestDto
  ): Promise<AxiosResponse<StorageCaptureResponseDto>> =>
    apiClient.post('/StorageCapture', data),

  // PUT /api/StorageCapture/{id} - Update a storage capture
  updateStorageCapture: (
    id: number,
    data: UpdateStorageCaptureRequestDto
  ): Promise<AxiosResponse<StorageCaptureResponseDto>> =>
    apiClient.put(`/StorageCapture/${id}`, data),

  // GET /api/StorageCapture/by-allot-id/{allotId} - Get roll confirmations by Allot ID
  getRollConfirmationsByAllotId: (
    allotId: string,
    fgroll: number
  ): Promise<AxiosResponse<StorageCaptureRollDataResponseDto>> =>
    apiClient.get(`/StorageCapture/by-allot-id/${allotId}?fgroll=${fgroll}`),
};

// ============================================
// DISPATCH PLANNING API (/api/DispatchPlanning)
// ============================================

export const dispatchPlanningApi = {
  // GET /api/DispatchPlanning - Get all dispatch plannings
  getAllDispatchPlannings: (): Promise<AxiosResponse<DispatchPlanningDto[]>> =>
    apiClient.get('/DispatchPlanning'),

  // GET /api/DispatchPlanning/{id} - Get dispatch planning by ID
  getDispatchPlanningById: (id: number): Promise<AxiosResponse<DispatchPlanningDto>> =>
    apiClient.get(`/DispatchPlanning/${id}`),

  // GET /api/DispatchPlanning/by-dispatch-order/{dispatchOrderId} - Get dispatch plannings by dispatch order ID
  getDispatchPlanningsByDispatchOrderId: (dispatchOrderId: string): Promise<AxiosResponse<DispatchPlanningDto[]>> =>
    apiClient.get(`/DispatchPlanning/by-dispatch-order/${dispatchOrderId}`),

  // GET /api/DispatchPlanning/fully-dispatched-orders - Get unique fully dispatched dispatch order IDs
  getFullyDispatchedOrders: (): Promise<AxiosResponse<{ id: string, loadingNo: string, customerName: string }[]>> =>
    apiClient.get('/DispatchPlanning/fully-dispatched-orders'),

  // POST /api/DispatchPlanning - Create a new dispatch planning
  createDispatchPlanning: (data: CreateDispatchPlanningRequestDto): Promise<AxiosResponse<DispatchPlanningDto>> =>
    apiClient.post('/DispatchPlanning', data),

  // POST /api/DispatchPlanning/batch - Create multiple dispatch planning records with the same dispatch order ID
  createBatchDispatchPlanning: (data: CreateDispatchPlanningRequestDto[]): Promise<AxiosResponse<DispatchPlanningDto[]>> =>
    apiClient.post('/DispatchPlanning/batch', data),

  // PUT /api/DispatchPlanning/{id} - Update a dispatch planning
  updateDispatchPlanning: (id: number, data: UpdateDispatchPlanningRequestDto): Promise<AxiosResponse<DispatchPlanningDto>> =>
    apiClient.put(`/DispatchPlanning/${id}`, data),

  // DELETE /api/DispatchPlanning/{id} - Delete a dispatch planning
  deleteDispatchPlanning: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/DispatchPlanning/${id}`),

  // GET /api/DispatchPlanning/{id}/dispatched-rolls - Get dispatched rolls by planning ID
  getDispatchedRollsByPlanningId: (id: number): Promise<AxiosResponse<DispatchedRollDto[]>> =>
    apiClient.get(`/DispatchPlanning/${id}/dispatched-rolls`),

  // POST /api/DispatchPlanning/dispatched-rolls - Create a new dispatched roll
  createDispatchedRoll: (
    data: CreateDispatchedRollRequestDto
  ): Promise<AxiosResponse<DispatchedRollDto>> =>
    apiClient.post('/DispatchPlanning/dispatched-rolls', data),

  // DELETE /api/DispatchPlanning/dispatched-rolls/{id} - Delete a dispatched roll by ID
  deleteDispatchedRoll: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/DispatchPlanning/dispatched-rolls/${id}`),

  // POST /api/DispatchPlanning/dispatched-rolls/bulk - Create multiple dispatched rolls in bulk
  createDispatchedRollBulk: (
    data: CreateDispatchedRollRequestDto[]
  ): Promise<AxiosResponse<DispatchedRollDto[]>> =>
    apiClient.post('/DispatchPlanning/dispatched-rolls/bulk', data),

  // GET /api/DispatchPlanning/ordered-dispatched-rolls/{dispatchOrderId} - Get ordered dispatched rolls by dispatch order ID
  getOrderedDispatchedRollsByDispatchOrderId: (dispatchOrderId: string): Promise<AxiosResponse<DispatchedRollDto[]>> =>
    apiClient.get(`/DispatchPlanning/ordered-dispatched-rolls/${dispatchOrderId}`),
};

// ============================================
// TRANSPORT API (/api/Transport)
// ============================================

export const transportApi = {
  // GET /api/Transport - Get all transports
  getAllTransports: (): Promise<AxiosResponse<TransportResponseDto[]>> =>
    apiClient.get('/Transport'),

  // GET /api/Transport/{id} - Get transport by ID
  getTransport: (id: number): Promise<AxiosResponse<TransportResponseDto>> =>
    apiClient.get(`/Transport/${id}`),

  // GET /api/Transport/search - Search transports
  searchTransports: (params: TransportSearchRequestDto): Promise<AxiosResponse<TransportResponseDto[]>> =>
    apiClient.get('/Transport/search', { params }),

  // POST /api/Transport - Create new transport
  createTransport: (data: CreateTransportRequestDto): Promise<AxiosResponse<TransportResponseDto>> =>
    apiClient.post('/Transport', data),

  // PUT /api/Transport/{id} - Update transport
  updateTransport: (id: number, data: UpdateTransportRequestDto): Promise<AxiosResponse<TransportResponseDto>> =>
    apiClient.put(`/Transport/${id}`, data),

  // DELETE /api/Transport/{id} - Delete transport
  deleteTransport: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/Transport/${id}`),
};

// ============================================
// COURIER API (/api/Courier)
// ============================================

export const courierApi = {
  // GET /api/Courier - Get all couriers
  getAllCouriers: (): Promise<AxiosResponse<CourierResponseDto[]>> =>
    apiClient.get('/Courier'),

  // GET /api/Courier/{id} - Get courier by ID
  getCourier: (id: number): Promise<AxiosResponse<CourierResponseDto>> =>
    apiClient.get(`/Courier/${id}`),

  // GET /api/Courier/search - Search couriers
  searchCouriers: (params: CourierSearchRequestDto): Promise<AxiosResponse<CourierResponseDto[]>> =>
    apiClient.get('/Courier/search', { params }),

  // POST /api/Courier - Create new courier
  createCourier: (data: CreateCourierRequestDto): Promise<AxiosResponse<CourierResponseDto>> =>
    apiClient.post('/Courier', data),

  // PUT /api/Courier/{id} - Update courier
  updateCourier: (id: number, data: UpdateCourierRequestDto): Promise<AxiosResponse<CourierResponseDto>> =>
    apiClient.put(`/Courier/${id}`, data),

  // DELETE /api/Courier/{id} - Delete courier
  deleteCourier: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/Courier/${id}`),
};

// ============================================
// SLIT LINE API (/api/SlitLine)
// ============================================

export const slitLineApi = {
  // GET /api/SlitLine - Get all slit lines
  getAllSlitLines: (): Promise<AxiosResponse<SlitLineResponseDto[]>> =>
    apiClient.get('/SlitLine'),

  // GET /api/SlitLine/{id} - Get slit line by ID
  getSlitLine: (id: number): Promise<AxiosResponse<SlitLineResponseDto>> =>
    apiClient.get(`/SlitLine/${id}`),

  // GET /api/SlitLine/search - Search slit lines
  searchSlitLines: (params: SlitLineSearchRequestDto): Promise<AxiosResponse<SlitLineResponseDto[]>> =>
    apiClient.get('/SlitLine/search', { params }),

  // POST /api/SlitLine - Create new slit line
  createSlitLine: (data: CreateSlitLineRequestDto): Promise<AxiosResponse<SlitLineResponseDto>> =>
    apiClient.post('/SlitLine', data),

  // PUT /api/SlitLine/{id} - Update slit line
  updateSlitLine: (id: number, data: UpdateSlitLineRequestDto): Promise<AxiosResponse<SlitLineResponseDto>> =>
    apiClient.put(`/SlitLine/${id}`, data),

  // DELETE /api/SlitLine/{id} - Delete slit line
  deleteSlitLine: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/SlitLine/${id}`),
};

// ============================================
// FG ROLLS API (/api/fg-rolls)
// ============================================

export const fgRollsApi = {
  uploadFgRolls: (vouchers: any[]): Promise<AxiosResponse<UploadFgRollsResponseDto>> =>
    apiClient.post('/fg-rolls/upload', vouchers, {
      headers: {
        'Content-Type': 'application/json',
      },
    }),
};

// ============================================
// REPORT API (/api/Report)
// ============================================

export const reportApi = {


  // GET /api/Report/final-fabric-report - Get final fabric report
  getFinalFabricReport: (): Promise<AxiosResponse<FinalFabricReportDto[]>> =>
    apiClient.get('/Report/final-fabric-report'),

  // GET /api/Report/fabric-stock-report - Get fabric stock report
  getFabricStockReport: (): Promise<AxiosResponse<FabricStockReportDto[]>> =>
    apiClient.get('/Report/fabric-stock-report'),

  // GET /api/Report/final-fabric-report/{salesOrderId} - Get final fabric report by sales order ID
  getFinalFabricReportBySalesOrder: (salesOrderId: number): Promise<AxiosResponse<FinalFabricReportDto>> =>
    apiClient.get(`/Report/final-fabric-report/${salesOrderId}`),
};

// Export all APIs grouped by functionality
export const api = {
  auth: authApi,
  user: userApi,
  role: roleApi,
  machine: machineApi,
  fabricStructure: fabricStructureApi,
  location: locationApi,
  yarnType: yarnTypeApi,
  salesOrder: salesOrderApi,
  tapeColor: tapeColorApi,
  shift: shiftApi,
  productionAllotment: productionAllotmentApi,
  rollConfirmation: rollConfirmationApi,
  inspection: inspectionApi,
  rollAssignment: rollAssignmentApi,
  storageCapture: storageCaptureApi,
  dispatchPlanning: dispatchPlanningApi,
  slitLine: slitLineApi,
  vouchers: vouchersApi,
  company: companyApi,
  allLedger: allLedgerApi,
  stockItem: stockItemApi,
  fgRolls: fgRollsApi,
  report: reportApi  // Add report API
};
