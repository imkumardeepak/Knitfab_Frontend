import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  ShiftResponseDto,
  CreateShiftRequestDto,
  UpdateShiftRequestDto,
  ShiftSearchRequestDto
} from '@/types/api-types';

// Query Keys
export const shiftKeys = {
  all: ['shifts'] as const,
  lists: () => [...shiftKeys.all, 'list'] as const,
  list: (filters: string) => [...shiftKeys.lists(), { filters }] as const,
  details: () => [...shiftKeys.all, 'detail'] as const,
  detail: (id: number) => [...shiftKeys.details(), id] as const,
  search: (params: ShiftSearchRequestDto) => [...shiftKeys.lists(), 'search', params] as const,
};

// Shift Queries
export const useShifts = () => {
  return useQuery({
    queryKey: shiftKeys.lists(),
    queryFn: async () => {
      const response = await shiftApi.getAllShifts();
      return apiUtils.extractData(response) as ShiftResponseDto[];
    },
  });
};

export const useShift = (id: number, enabled = true) => {
  return useQuery({
    queryKey: shiftKeys.detail(id),
    queryFn: async () => {
      const response = await shiftApi.getShift(id);
      return apiUtils.extractData(response) as ShiftResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useSearchShifts = (params: ShiftSearchRequestDto, enabled = true) => {
  return useQuery({
    queryKey: shiftKeys.search(params),
    queryFn: async () => {
      const response = await shiftApi.searchShifts(params);
      return apiUtils.extractData(response) as ShiftResponseDto[];
    },
    enabled,
  });
};

// Shift Mutations
export const useCreateShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftData: CreateShiftRequestDto) => {
      const response = await shiftApi.createShift(shiftData);
      return apiUtils.extractData(response) as ShiftResponseDto;
    },
    onSuccess: (newShift) => {
      // Invalidate and refetch shifts list
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });

      // Add the new shift to the cache
      queryClient.setQueryData(shiftKeys.detail(newShift.id), newShift);

      toast.success('Success', 'Shift created successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, shiftData }: { id: number; shiftData: UpdateShiftRequestDto }) => {
      const response = await shiftApi.updateShift(id, shiftData);
      return apiUtils.extractData(response) as ShiftResponseDto;
    },
    onSuccess: (updatedShift) => {
      // Update the shift in the cache
      queryClient.setQueryData(shiftKeys.detail(updatedShift.id), updatedShift);

      // Invalidate shifts list to reflect changes
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });

      toast.success('Success', 'Shift updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await shiftApi.deleteShift(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove shift from cache
      queryClient.removeQueries({ queryKey: shiftKeys.detail(deletedId) });

      // Invalidate shifts list
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });

      toast.success('Success', 'Shift deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};