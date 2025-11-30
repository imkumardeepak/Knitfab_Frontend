// Export all React Query hooks for easy importing

// User Management Queries
export {
  userKeys,
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from './useUserQueries';

// Role Management Queries
export {
  roleKeys,
  useRoles,
  useRole,
  useRolePageAccesses,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from './useRoleQueries';

// Machine Management Queries
export {
  machineKeys,
  useMachines,
  useMachine,
  useSearchMachines,
  useCreateMachine,
  useUpdateMachine,
  useDeleteMachine,
  useBulkCreateMachines,
} from './useMachineQueries';

// Fabric Structure Queries
export {
  fabricStructureKeys,
  useFabricStructures,
  useFabricStructure,
  useSearchFabricStructures,
  useCreateFabricStructure,
  useUpdateFabricStructure,
  useDeleteFabricStructure,
} from './useFabricStructureQueries';

// Location Queries
export {
  locationKeys,
  useLocations,
  useLocation,
  useSearchLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from './useLocationQueries';

// Additional Role Queries - Removed

// Chat Management Queries - Removed

// Yarn Type Queries
export {
  yarnTypeKeys,
  useYarnTypes,
  useYarnType,
  useSearchYarnTypes,
  useCreateYarnType,
  useUpdateYarnType,
  useDeleteYarnType,
} from './useYarnTypeQueries';

// Tape Color Queries
export {
  tapeColorKeys,
  useTapeColors,
  useTapeColor,
  useSearchTapeColors,
  useCreateTapeColor,
  useUpdateTapeColor,
  useDeleteTapeColor,
} from './useTapeColorQueries';

// Shift Queries
export {
  shiftKeys,
  useShifts,
  useShift,
  useSearchShifts,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
} from './useShiftQueries';

// Notification Management Queries - Removed

// Export all query hooks
export * from './useUserQueries';
export * from './useRoleQueries';
export * from './useMachineQueries';
export * from './useFabricStructureQueries';
export * from './useLocationQueries';
export * from './useYarnTypeQueries';
export * from './useTapeColorQueries';
export * from './useShiftQueries';
export * from './useSalesOrderQueries';
export * from './useProductionAllotmentQueries';

// Slit Line Queries
export {
  slitLineKeys,
  useSlitLines,
  useSlitLine,
  useSearchSlitLines,
  useCreateSlitLine,
  useUpdateSlitLine,
  useDeleteSlitLine,
} from './useSlitLineQueries';

// Export transport and courier hooks
export * from './useTransportQueries';
export * from './useCourierQueries';
export * from './useSlitLineQueries';

// Common Query Utilities
export const queryUtils = {
  // Invalidate all queries for a specific entity type
  invalidateUserQueries: (queryClient: { invalidateQueries: (args: { queryKey: string[] }) => void }) => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
  
  invalidateRoleQueries: (queryClient: { invalidateQueries: (args: { queryKey: string[] }) => void }) => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
  },
  
  invalidateMachineQueries: (queryClient: { invalidateQueries: (args: { queryKey: string[] }) => void }) => {
    queryClient.invalidateQueries({ queryKey: ['machines'] });
  },
  
  invalidateFabricStructureQueries: (queryClient: { invalidateQueries: (args: { queryKey: string[] }) => void }) => {
    queryClient.invalidateQueries({ queryKey: ['fabricStructures'] });
  },
  
  invalidateLocationQueries: (queryClient: { invalidateQueries: (args: { queryKey: string[] }) => void }) => {
    queryClient.invalidateQueries({ queryKey: ['locations'] });
  },
  
  invalidateTapeColorQueries: (queryClient: { invalidateQueries: (args: { queryKey: string[] }) => void }) => {
    queryClient.invalidateQueries({ queryKey: ['tapeColors'] });
  },
  
  invalidateShiftQueries: (queryClient: { invalidateQueries: (args: { queryKey: string[] }) => void }) => {
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
  },
  
  invalidateSlitLineQueries: (queryClient: { invalidateQueries: (args: { queryKey: string[] }) => void }) => {
    queryClient.invalidateQueries({ queryKey: ['slitLines'] });
  },

  // Clear all caches
  clearAllCaches: (queryClient: { clear: () => void }) => {
    queryClient.clear();
  },
};

// Query key factories for consistent key generation
export const createQueryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...createQueryKeys.users.all, 'list'] as const,
    list: (filters: unknown) => [...createQueryKeys.users.lists(), { filters }] as const,
    details: () => [...createQueryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...createQueryKeys.users.details(), id] as const,
  },
  
  roles: {
    all: ['roles'] as const,
    lists: () => [...createQueryKeys.roles.all, 'list'] as const,
    list: (filters: unknown) => [...createQueryKeys.roles.lists(), { filters }] as const,
    details: () => [...createQueryKeys.roles.all, 'detail'] as const,
    detail: (id: number) => [...createQueryKeys.roles.details(), id] as const,
  },
  
  machines: {
    all: ['machines'] as const,
    lists: () => [...createQueryKeys.machines.all, 'list'] as const,
    list: (filters: unknown) => [...createQueryKeys.machines.lists(), { filters }] as const,
    details: () => [...createQueryKeys.machines.all, 'detail'] as const,
    detail: (id: number) => [...createQueryKeys.machines.details(), id] as const,
  },
  
  fabricStructures: {
    all: ['fabricStructures'] as const,
    lists: () => [...createQueryKeys.fabricStructures.all, 'list'] as const,
    list: (filters: unknown) => [...createQueryKeys.fabricStructures.lists(), { filters }] as const,
    details: () => [...createQueryKeys.fabricStructures.all, 'detail'] as const,
    detail: (id: number) => [...createQueryKeys.fabricStructures.details(), id] as const,
  },
  
  locations: {
    all: ['locations'] as const,
    lists: () => [...createQueryKeys.locations.all, 'list'] as const,
    list: (filters: unknown) => [...createQueryKeys.locations.lists(), { filters }] as const,
    details: () => [...createQueryKeys.locations.all, 'detail'] as const,
    detail: (id: number) => [...createQueryKeys.locations.details(), id] as const,
  },
  
  tapeColors: {
    all: ['tapeColors'] as const,
    lists: () => [...createQueryKeys.tapeColors.all, 'list'] as const,
    list: (filters: unknown) => [...createQueryKeys.tapeColors.lists(), { filters }] as const,
    details: () => [...createQueryKeys.tapeColors.all, 'detail'] as const,
    detail: (id: number) => [...createQueryKeys.tapeColors.details(), id] as const,
  },
  
  shifts: {
    all: ['shifts'] as const,
    lists: () => [...createQueryKeys.shifts.all, 'list'] as const,
    list: (filters: unknown) => [...createQueryKeys.shifts.lists(), { filters }] as const,
    details: () => [...createQueryKeys.shifts.all, 'detail'] as const,
    detail: (id: number) => [...createQueryKeys.shifts.details(), id] as const,
  },
  
  slitLines: {
    all: ['slitLines'] as const,
    lists: () => [...createQueryKeys.slitLines.all, 'list'] as const,
    list: (filters: unknown) => [...createQueryKeys.slitLines.lists(), { filters }] as const,
    details: () => [...createQueryKeys.slitLines.all, 'detail'] as const,
    detail: (id: number) => [...createQueryKeys.slitLines.details(), id] as const,
  },
};

// Error handling utilities
export const queryErrorHandlers = {
  // Standard error handler for mutations
  handleMutationError: (error: unknown, defaultMessage: string) => {
    const message = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
      (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
      (error as { message?: string })?.message ||
      defaultMessage;

    return {
      title: 'Error',
      description: message,
      variant: 'destructive' as const,
    };
  },

  // Check if error is authentication related
  isAuthError: (error: unknown) => {
    return (error as { response?: { status?: number } })?.response?.status === 401 || (error as { response?: { status?: number } })?.response?.status === 403;
  },

  // Check if error is network related
  isNetworkError: (error: unknown) => {
    return !(error as { response?: unknown })?.response && (error as { code?: string })?.code === 'NETWORK_ERROR';
  },

  // Get user-friendly error message
  getUserFriendlyMessage: (error: unknown) => {
    if (queryErrorHandlers.isAuthError(error)) {
      return 'You are not authorized to perform this action.';
    }

    if (queryErrorHandlers.isNetworkError(error)) {
      return 'Network error. Please check your connection and try again.';
    }

    const responseStatus = (error as { response?: { status?: number } })?.response?.status;
    if (responseStatus === 404) {
      return 'The requested resource was not found.';
    }

    if (responseStatus && responseStatus >= 500) {
      return 'Server error. Please try again later.';
    }

    return (error as { response?: { data?: { message?: string } }, message?: string })?.response?.data?.message || (error as { message?: string })?.message || 'An unexpected error occurred.';
  },
};

// Performance optimization utilities
export const queryOptimizations = {
  // Background refetch for critical data
  setupBackgroundRefetch: () => {
    // Can add background refetch logic here if needed
  },

  // Prefetch common data
  prefetchCommonData: async (queryClient: unknown) => {
    try {
      // Prefetch roles for user management (pageAccesses included)
      await (queryClient as { prefetchQuery?: (args: unknown) => Promise<unknown> })?.prefetchQuery?.({
        queryKey: ['roles', 'list'],
        queryFn: async () => {
          const { roleApi } = await import('@/lib/api-client');
          const response = await roleApi.getAllRoles();
          return response.data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
      });
    } catch (error) {
      console.warn('Failed to prefetch common data:', error);
    }
  },
};