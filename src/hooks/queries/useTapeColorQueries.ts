import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tapeColorApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  TapeColorResponseDto,
  CreateTapeColorRequestDto,
  UpdateTapeColorRequestDto,
  TapeColorSearchRequestDto
} from '@/types/api-types';

// Query Keys
export const tapeColorKeys = {
  all: ['tapeColors'] as const,
  lists: () => [...tapeColorKeys.all, 'list'] as const,
  list: (filters: string) => [...tapeColorKeys.lists(), { filters }] as const,
  details: () => [...tapeColorKeys.all, 'detail'] as const,
  detail: (id: number) => [...tapeColorKeys.details(), id] as const,
  search: (params: TapeColorSearchRequestDto) => [...tapeColorKeys.lists(), 'search', params] as const,
  assigned: (lotmentId: string, tapeColor: string) => [...tapeColorKeys.all, 'assigned', lotmentId, tapeColor] as const,
};

// TapeColor Queries
export const useTapeColors = () => {
  return useQuery({
    queryKey: tapeColorKeys.lists(),
    queryFn: async () => {
      const response = await tapeColorApi.getAllTapeColors();
      return apiUtils.extractData(response) as TapeColorResponseDto[];
    },
  });
};

export const useTapeColor = (id: number, enabled = true) => {
  return useQuery({
    queryKey: tapeColorKeys.detail(id),
    queryFn: async () => {
      const response = await tapeColorApi.getTapeColor(id);
      return apiUtils.extractData(response) as TapeColorResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useSearchTapeColors = (params: TapeColorSearchRequestDto, enabled = true) => {
  return useQuery({
    queryKey: tapeColorKeys.search(params),
    queryFn: async () => {
      const response = await tapeColorApi.searchTapeColors(params);
      return apiUtils.extractData(response) as TapeColorResponseDto[];
    },
    enabled,
  });
};

// New hook to check if tape color is assigned to lotment
export const useIsTapeColorAssignedToLotment = (lotmentId: string, tapeColor: string, enabled = true) => {
  return useQuery({
    queryKey: tapeColorKeys.assigned(lotmentId, tapeColor),
    queryFn: async () => {
      const response = await tapeColorApi.isTapeColorAssignedToLotment(lotmentId, tapeColor);
      return apiUtils.extractData(response) as boolean;
    },
    enabled: enabled && !!lotmentId && !!tapeColor,
  });
};

// TapeColor Mutations
export const useCreateTapeColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tapeColorData: CreateTapeColorRequestDto) => {
      const response = await tapeColorApi.createTapeColor(tapeColorData);
      return apiUtils.extractData(response) as TapeColorResponseDto;
    },
    onSuccess: (newTapeColor) => {
      // Invalidate and refetch tape colors list
      queryClient.invalidateQueries({ queryKey: tapeColorKeys.lists() });

      // Add the new tape color to the cache
      queryClient.setQueryData(tapeColorKeys.detail(newTapeColor.id), newTapeColor);

      toast.success('Success', 'Tape color created successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateTapeColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tapeColorData }: { id: number; tapeColorData: UpdateTapeColorRequestDto }) => {
      const response = await tapeColorApi.updateTapeColor(id, tapeColorData);
      return apiUtils.extractData(response) as TapeColorResponseDto;
    },
    onSuccess: (updatedTapeColor) => {
      // Update the tape color in the cache
      queryClient.setQueryData(tapeColorKeys.detail(updatedTapeColor.id), updatedTapeColor);

      // Invalidate tape colors list to reflect changes
      queryClient.invalidateQueries({ queryKey: tapeColorKeys.lists() });

      toast.success('Success', 'Tape color updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteTapeColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await tapeColorApi.deleteTapeColor(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove tape color from cache
      queryClient.removeQueries({ queryKey: tapeColorKeys.detail(deletedId) });

      // Invalidate tape colors list to reflect changes
      queryClient.invalidateQueries({ queryKey: tapeColorKeys.lists() });

      toast.success('Success', 'Tape color deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};