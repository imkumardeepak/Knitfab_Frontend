import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { machineApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  MachineResponseDto,
  CreateMachineRequestDto,
  UpdateMachineRequestDto,
  MachineSearchRequestDto,
  BulkCreateMachineRequestDto
} from '@/types/api-types';

// Query Keys
export const machineKeys = {
  all: ['machines'] as const,
  lists: () => [...machineKeys.all, 'list'] as const,
  list: (filters: string) => [...machineKeys.lists(), { filters }] as const,
  details: () => [...machineKeys.all, 'detail'] as const,
  detail: (id: number) => [...machineKeys.details(), id] as const,
  search: (params: MachineSearchRequestDto) => [...machineKeys.lists(), 'search', params] as const,
};

// Machine Queries
export const useMachines = () => {
  return useQuery({
    queryKey: machineKeys.lists(),
    queryFn: async () => {
      const response = await machineApi.getAllMachines();
      return apiUtils.extractData(response) as MachineResponseDto[];
    },
  });
};

export const useMachine = (id: number, enabled = true) => {
  return useQuery({
    queryKey: machineKeys.detail(id),
    queryFn: async () => {
      const response = await machineApi.getMachine(id);
      return apiUtils.extractData(response) as MachineResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useSearchMachines = (params: MachineSearchRequestDto, enabled = true) => {
  return useQuery({
    queryKey: machineKeys.search(params),
    queryFn: async () => {
      const response = await machineApi.searchMachines(params);
      return apiUtils.extractData(response) as MachineResponseDto[];
    },
    enabled,
  });
};

// Machine Mutations
export const useCreateMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (machineData: CreateMachineRequestDto) => {
      const response = await machineApi.createMachine(machineData);
      return apiUtils.extractData(response) as MachineResponseDto;
    },
    onSuccess: (newMachine) => {
      // Invalidate and refetch machines list
      queryClient.invalidateQueries({ queryKey: machineKeys.lists() });

      // Add the new machine to the cache
      queryClient.setQueryData(machineKeys.detail(newMachine.id), newMachine);

      toast.success('Success', 'Machine created successfully');
    },
    onError: (error: any) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, machineData }: { id: number; machineData: UpdateMachineRequestDto }) => {
      const response = await machineApi.updateMachine(id, machineData);
      return apiUtils.extractData(response) as MachineResponseDto;
    },
    onSuccess: (updatedMachine) => {
      // Update the machine in the cache
      queryClient.setQueryData(machineKeys.detail(updatedMachine.id), updatedMachine);

      // Invalidate machines list to reflect changes
      queryClient.invalidateQueries({ queryKey: machineKeys.lists() });

      toast.success('Success', 'Machine updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await machineApi.deleteMachine(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove machine from cache
      queryClient.removeQueries({ queryKey: machineKeys.detail(deletedId) });

      // Invalidate machines list
      queryClient.invalidateQueries({ queryKey: machineKeys.lists() });

      toast.success('Success', 'Machine deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useBulkCreateMachines = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bulkData: BulkCreateMachineRequestDto) => {
      const response = await machineApi.createBulkMachines(bulkData);
      return apiUtils.extractData(response) as MachineResponseDto[];
    },
    onSuccess: () => {
      // Invalidate machines list to reflect changes
      queryClient.invalidateQueries({ queryKey: machineKeys.lists() });

      toast.success('Success', 'Machines created successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};