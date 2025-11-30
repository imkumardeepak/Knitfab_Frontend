import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { slitLineApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  SlitLineResponseDto,
  CreateSlitLineRequestDto,
  UpdateSlitLineRequestDto,
  SlitLineSearchRequestDto
} from '@/types/api-types';

// Query Keys
export const slitLineKeys = {
  all: ['slitLines'] as const,
  lists: () => [...slitLineKeys.all, 'list'] as const,
  list: (filters: string) => [...slitLineKeys.lists(), { filters }] as const,
  details: () => [...slitLineKeys.all, 'detail'] as const,
  detail: (id: number) => [...slitLineKeys.details(), id] as const,
  search: (params: SlitLineSearchRequestDto) => [...slitLineKeys.lists(), 'search', params] as const,
};

// Slit Line Queries
export const useSlitLines = () => {
  return useQuery({
    queryKey: slitLineKeys.lists(),
    queryFn: async () => {
      const response = await slitLineApi.getAllSlitLines();
      return apiUtils.extractData(response) as SlitLineResponseDto[];
    },
  });
};

export const useSlitLine = (id: number, enabled = true) => {
  return useQuery({
    queryKey: slitLineKeys.detail(id),
    queryFn: async () => {
      const response = await slitLineApi.getSlitLine(id);
      return apiUtils.extractData(response) as SlitLineResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useSearchSlitLines = (params: SlitLineSearchRequestDto, enabled = true) => {
  return useQuery({
    queryKey: slitLineKeys.search(params),
    queryFn: async () => {
      const response = await slitLineApi.searchSlitLines(params);
      return apiUtils.extractData(response) as SlitLineResponseDto[];
    },
    enabled,
  });
};

// Slit Line Mutations
export const useCreateSlitLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slitLineData: CreateSlitLineRequestDto) => {
      const response = await slitLineApi.createSlitLine(slitLineData);
      return apiUtils.extractData(response) as SlitLineResponseDto;
    },
    onSuccess: (newSlitLine) => {
      // Invalidate and refetch slit lines list
      queryClient.invalidateQueries({ queryKey: slitLineKeys.lists() });

      // Add the new slit line to the cache
      queryClient.setQueryData(slitLineKeys.detail(newSlitLine.id), newSlitLine);

      toast.success('Success', 'Slit line created successfully');
    },
    onError: (error: any) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateSlitLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, slitLineData }: { id: number; slitLineData: UpdateSlitLineRequestDto }) => {
      const response = await slitLineApi.updateSlitLine(id, slitLineData);
      return apiUtils.extractData(response) as SlitLineResponseDto;
    },
    onSuccess: (updatedSlitLine) => {
      // Update the slit line in the cache
      queryClient.setQueryData(slitLineKeys.detail(updatedSlitLine.id), updatedSlitLine);

      // Invalidate slit lines list to reflect changes
      queryClient.invalidateQueries({ queryKey: slitLineKeys.lists() });

      toast.success('Success', 'Slit line updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteSlitLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await slitLineApi.deleteSlitLine(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove slit line from cache
      queryClient.removeQueries({ queryKey: slitLineKeys.detail(deletedId) });

      // Invalidate slit lines list
      queryClient.invalidateQueries({ queryKey: slitLineKeys.lists() });

      toast.success('Success', 'Slit line deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};