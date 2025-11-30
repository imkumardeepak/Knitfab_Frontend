import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fabricStructureApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  FabricStructureResponseDto,
  CreateFabricStructureRequestDto,
  UpdateFabricStructureRequestDto,
  FabricStructureSearchRequestDto
} from '@/types/api-types';

// Query Keys
export const fabricStructureKeys = {
  all: ['fabricStructures'] as const,
  lists: () => [...fabricStructureKeys.all, 'list'] as const,
  list: (filters: string) => [...fabricStructureKeys.lists(), { filters }] as const,
  details: () => [...fabricStructureKeys.all, 'detail'] as const,
  detail: (id: number) => [...fabricStructureKeys.details(), id] as const,
  search: (params: FabricStructureSearchRequestDto) => [...fabricStructureKeys.lists(), 'search', params] as const,
};

// Fabric Structure Queries
export const useFabricStructures = () => {
  return useQuery({
    queryKey: fabricStructureKeys.lists(),
    queryFn: async () => {
      const response = await fabricStructureApi.getAllFabricStructures();
      return apiUtils.extractData(response) as FabricStructureResponseDto[];
    },
  });
};

export const useFabricStructure = (id: number, enabled = true) => {
  return useQuery({
    queryKey: fabricStructureKeys.detail(id),
    queryFn: async () => {
      const response = await fabricStructureApi.getFabricStructure(id);
      return apiUtils.extractData(response) as FabricStructureResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useSearchFabricStructures = (params: FabricStructureSearchRequestDto, enabled = true) => {
  return useQuery({
    queryKey: fabricStructureKeys.search(params),
    queryFn: async () => {
      const response = await fabricStructureApi.searchFabricStructures(params);
      return apiUtils.extractData(response) as FabricStructureResponseDto[];
    },
    enabled,
  });
};

// Fabric Structure Mutations
export const useCreateFabricStructure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fabricStructureData: CreateFabricStructureRequestDto) => {
      const response = await fabricStructureApi.createFabricStructure(fabricStructureData);
      return apiUtils.extractData(response) as FabricStructureResponseDto;
    },
    onSuccess: (newFabricStructure) => {
      // Invalidate and refetch fabric structures list
      queryClient.invalidateQueries({ queryKey: fabricStructureKeys.lists() });

      // Add the new fabric structure to the cache
      queryClient.setQueryData(fabricStructureKeys.detail(newFabricStructure.id), newFabricStructure);

      toast.success('Success', 'Fabric structure created successfully');
    },
    onError: (error: any) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateFabricStructure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fabricStructureData }: { id: number; fabricStructureData: UpdateFabricStructureRequestDto }) => {
      const response = await fabricStructureApi.updateFabricStructure(id, fabricStructureData);
      return apiUtils.extractData(response) as FabricStructureResponseDto;
    },
    onSuccess: (updatedFabricStructure) => {
      // Update the fabric structure in the cache
      queryClient.setQueryData(fabricStructureKeys.detail(updatedFabricStructure.id), updatedFabricStructure);

      // Invalidate fabric structures list to reflect changes
      queryClient.invalidateQueries({ queryKey: fabricStructureKeys.lists() });

      toast.success('Success', 'Fabric structure updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteFabricStructure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await fabricStructureApi.deleteFabricStructure(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove fabric structure from cache
      queryClient.removeQueries({ queryKey: fabricStructureKeys.detail(deletedId) });

      // Invalidate fabric structures list
      queryClient.invalidateQueries({ queryKey: fabricStructureKeys.lists() });

      toast.success('Success', 'Fabric structure deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};