import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { locationApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  LocationResponseDto,
  CreateLocationRequestDto,
  UpdateLocationRequestDto,
  LocationSearchRequestDto
} from '@/types/api-types';

// Query Keys
export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (filters: string) => [...locationKeys.lists(), { filters }] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: number) => [...locationKeys.details(), id] as const,
  search: (params: LocationSearchRequestDto) => [...locationKeys.lists(), 'search', params] as const,
};

// Location Queries
export const useLocations = () => {
  return useQuery({
    queryKey: locationKeys.lists(),
    queryFn: async () => {
      const response = await locationApi.getAllLocations();
      return apiUtils.extractData(response) as LocationResponseDto[];
    },
  });
};

export const useLocation = (id: number, enabled = true) => {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: async () => {
      const response = await locationApi.getLocation(id);
      return apiUtils.extractData(response) as LocationResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useSearchLocations = (params: LocationSearchRequestDto, enabled = true) => {
  return useQuery({
    queryKey: locationKeys.search(params),
    queryFn: async () => {
      const response = await locationApi.searchLocations(params);
      return apiUtils.extractData(response) as LocationResponseDto[];
    },
    enabled,
  });
};

// Location Mutations
export const useCreateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationData: CreateLocationRequestDto) => {
      const response = await locationApi.createLocation(locationData);
      return apiUtils.extractData(response) as LocationResponseDto;
    },
    onSuccess: (newLocation) => {
      // Invalidate and refetch locations list
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });

      // Add the new location to the cache
      queryClient.setQueryData(locationKeys.detail(newLocation.id), newLocation);

      toast.success('Success', 'Location created successfully');
    },
    onError: (error: any) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, locationData }: { id: number; locationData: UpdateLocationRequestDto }) => {
      const response = await locationApi.updateLocation(id, locationData);
      return apiUtils.extractData(response) as LocationResponseDto;
    },
    onSuccess: (updatedLocation) => {
      // Update the location in the cache
      queryClient.setQueryData(locationKeys.detail(updatedLocation.id), updatedLocation);

      // Invalidate locations list to reflect changes
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });

      toast.success('Success', 'Location updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await locationApi.deleteLocation(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove location from cache
      queryClient.removeQueries({ queryKey: locationKeys.detail(deletedId) });

      // Invalidate locations list
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });

      toast.success('Success', 'Location deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};