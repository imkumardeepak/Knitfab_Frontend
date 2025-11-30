import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transportApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  TransportResponseDto,
  CreateTransportRequestDto,
  UpdateTransportRequestDto,
  TransportSearchRequestDto
} from '@/types/api-types';

// Query Keys
export const transportKeys = {
  all: ['transports'] as const,
  lists: () => [...transportKeys.all, 'list'] as const,
  list: (filters: string) => [...transportKeys.lists(), { filters }] as const,
  details: () => [...transportKeys.all, 'detail'] as const,
  detail: (id: number) => [...transportKeys.details(), id] as const,
  search: (params: TransportSearchRequestDto) => [...transportKeys.lists(), 'search', params] as const,
};

// Transport Queries
export const useTransports = () => {
  return useQuery({
    queryKey: transportKeys.lists(),
    queryFn: async () => {
      const response = await transportApi.getAllTransports();
      return apiUtils.extractData(response) as TransportResponseDto[];
    },
  });
};

export const useTransport = (id: number, enabled = true) => {
  return useQuery({
    queryKey: transportKeys.detail(id),
    queryFn: async () => {
      const response = await transportApi.getTransport(id);
      return apiUtils.extractData(response) as TransportResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useSearchTransports = (params: TransportSearchRequestDto, enabled = true) => {
  return useQuery({
    queryKey: transportKeys.search(params),
    queryFn: async () => {
      const response = await transportApi.searchTransports(params);
      return apiUtils.extractData(response) as TransportResponseDto[];
    },
    enabled,
  });
};

// Transport Mutations
export const useCreateTransport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transportData: CreateTransportRequestDto) => {
      const response = await transportApi.createTransport(transportData);
      return apiUtils.extractData(response) as TransportResponseDto;
    },
    onSuccess: (newTransport) => {
      // Invalidate and refetch transports list
      queryClient.invalidateQueries({ queryKey: transportKeys.lists() });

      // Add the new transport to the cache
      queryClient.setQueryData(transportKeys.detail(newTransport.id), newTransport);

      toast.success('Success', 'Transport created successfully');
    },
    onError: (error: any) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateTransport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, transportData }: { id: number; transportData: UpdateTransportRequestDto }) => {
      const response = await transportApi.updateTransport(id, transportData);
      return apiUtils.extractData(response) as TransportResponseDto;
    },
    onSuccess: (updatedTransport) => {
      // Update the transport in the cache
      queryClient.setQueryData(transportKeys.detail(updatedTransport.id), updatedTransport);

      // Invalidate transports list to reflect changes
      queryClient.invalidateQueries({ queryKey: transportKeys.lists() });

      toast.success('Success', 'Transport updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteTransport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await transportApi.deleteTransport(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove transport from cache
      queryClient.removeQueries({ queryKey: transportKeys.detail(deletedId) });

      // Invalidate transports list
      queryClient.invalidateQueries({ queryKey: transportKeys.lists() });

      toast.success('Success', 'Transport deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};