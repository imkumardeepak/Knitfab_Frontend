import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courierApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  CourierResponseDto,
  CreateCourierRequestDto,
  UpdateCourierRequestDto,
  CourierSearchRequestDto
} from '@/types/api-types';

// Query Keys
export const courierKeys = {
  all: ['couriers'] as const,
  lists: () => [...courierKeys.all, 'list'] as const,
  list: (filters: string) => [...courierKeys.lists(), { filters }] as const,
  details: () => [...courierKeys.all, 'detail'] as const,
  detail: (id: number) => [...courierKeys.details(), id] as const,
  search: (params: CourierSearchRequestDto) => [...courierKeys.lists(), 'search', params] as const,
};

// Courier Queries
export const useCouriers = () => {
  return useQuery({
    queryKey: courierKeys.lists(),
    queryFn: async () => {
      const response = await courierApi.getAllCouriers();
      return apiUtils.extractData(response) as CourierResponseDto[];
    },
  });
};

export const useCourier = (id: number, enabled = true) => {
  return useQuery({
    queryKey: courierKeys.detail(id),
    queryFn: async () => {
      const response = await courierApi.getCourier(id);
      return apiUtils.extractData(response) as CourierResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useSearchCouriers = (params: CourierSearchRequestDto, enabled = true) => {
  return useQuery({
    queryKey: courierKeys.search(params),
    queryFn: async () => {
      const response = await courierApi.searchCouriers(params);
      return apiUtils.extractData(response) as CourierResponseDto[];
    },
    enabled,
  });
};

// Courier Mutations
export const useCreateCourier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courierData: CreateCourierRequestDto) => {
      const response = await courierApi.createCourier(courierData);
      return apiUtils.extractData(response) as CourierResponseDto;
    },
    onSuccess: (newCourier) => {
      // Invalidate and refetch couriers list
      queryClient.invalidateQueries({ queryKey: courierKeys.lists() });

      // Add the new courier to the cache
      queryClient.setQueryData(courierKeys.detail(newCourier.id), newCourier);

      toast.success('Success', 'Courier created successfully');
    },
    onError: (error: any) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateCourier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, courierData }: { id: number; courierData: UpdateCourierRequestDto }) => {
      const response = await courierApi.updateCourier(id, courierData);
      return apiUtils.extractData(response) as CourierResponseDto;
    },
    onSuccess: (updatedCourier) => {
      // Update the courier in the cache
      queryClient.setQueryData(courierKeys.detail(updatedCourier.id), updatedCourier);

      // Invalidate couriers list to reflect changes
      queryClient.invalidateQueries({ queryKey: courierKeys.lists() });

      toast.success('Success', 'Courier updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteCourier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await courierApi.deleteCourier(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove courier from cache
      queryClient.removeQueries({ queryKey: courierKeys.detail(deletedId) });

      // Invalidate couriers list
      queryClient.invalidateQueries({ queryKey: courierKeys.lists() });

      toast.success('Success', 'Courier deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};