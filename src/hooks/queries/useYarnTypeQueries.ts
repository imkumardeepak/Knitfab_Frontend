import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { yarnTypeApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  YarnTypeResponseDto,
  CreateYarnTypeRequestDto,
  UpdateYarnTypeRequestDto,
  YarnTypeSearchRequestDto
} from '@/types/api-types';

// Query Keys
export const yarnTypeKeys = {
  all: ['yarnTypes'] as const,
  lists: () => [...yarnTypeKeys.all, 'list'] as const,
  list: (filters: string) => [...yarnTypeKeys.lists(), { filters }] as const,
  details: () => [...yarnTypeKeys.all, 'detail'] as const,
  detail: (id: number) => [...yarnTypeKeys.details(), id] as const,
  search: (params: YarnTypeSearchRequestDto) => [...yarnTypeKeys.lists(), 'search', params] as const,
};

// Yarn Type Queries
export const useYarnTypes = () => {
  return useQuery({
    queryKey: yarnTypeKeys.lists(),
    queryFn: async () => {
      const response = await yarnTypeApi.getAllYarnTypes();
      return apiUtils.extractData(response) as YarnTypeResponseDto[];
    },
  });
};

export const useYarnType = (id: number, enabled = true) => {
  return useQuery({
    queryKey: yarnTypeKeys.detail(id),
    queryFn: async () => {
      const response = await yarnTypeApi.getYarnType(id);
      return apiUtils.extractData(response) as YarnTypeResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useSearchYarnTypes = (params: YarnTypeSearchRequestDto, enabled = true) => {
  return useQuery({
    queryKey: yarnTypeKeys.search(params),
    queryFn: async () => {
      const response = await yarnTypeApi.searchYarnTypes(params);
      return apiUtils.extractData(response) as YarnTypeResponseDto[];
    },
    enabled,
  });
};

// Yarn Type Mutations
export const useCreateYarnType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (yarnTypeData: CreateYarnTypeRequestDto) => {
      const response = await yarnTypeApi.createYarnType(yarnTypeData);
      return apiUtils.extractData(response) as YarnTypeResponseDto;
    },
    onSuccess: (newYarnType) => {
      // Invalidate and refetch yarn types list
      queryClient.invalidateQueries({ queryKey: yarnTypeKeys.lists() });

      // Add the new yarn type to the cache
      queryClient.setQueryData(yarnTypeKeys.detail(newYarnType.id), newYarnType);

      toast.success('Success', 'Yarn type created successfully');
    },
    onError: (error: any) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateYarnType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, yarnTypeData }: { id: number; yarnTypeData: UpdateYarnTypeRequestDto }) => {
      const response = await yarnTypeApi.updateYarnType(id, yarnTypeData);
      return apiUtils.extractData(response) as YarnTypeResponseDto;
    },
    onSuccess: (updatedYarnType) => {
      // Update the yarn type in the cache
      queryClient.setQueryData(yarnTypeKeys.detail(updatedYarnType.id), updatedYarnType);

      // Invalidate yarn types list to reflect changes
      queryClient.invalidateQueries({ queryKey: yarnTypeKeys.lists() });

      toast.success('Success', 'Yarn type updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteYarnType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await yarnTypeApi.deleteYarnType(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove yarn type from cache
      queryClient.removeQueries({ queryKey: yarnTypeKeys.detail(deletedId) });

      // Invalidate yarn types list
      queryClient.invalidateQueries({ queryKey: yarnTypeKeys.lists() });

      toast.success('Success', 'Yarn type deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};