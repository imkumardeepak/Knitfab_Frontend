import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roleApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  RoleResponseDto,
  CreateRoleRequestDto,
  UpdateRoleRequestDto,
  PageAccessResponseDto
} from '@/types/api-types';

// Query Keys
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (filters: string) => [...roleKeys.lists(), { filters }] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: number) => [...roleKeys.details(), id] as const,
  pageAccesses: (id: number) => [...roleKeys.detail(id), 'pageAccesses'] as const,
};

// Role Queries
export const useRoles = () => {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: async () => {
      const response = await roleApi.getAllRoles();
      return apiUtils.extractData(response) as RoleResponseDto[];
    },
  });
};

export const useRole = (id: number, enabled = true) => {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: async () => {
      const response = await roleApi.getRole(id);
      return apiUtils.extractData(response) as RoleResponseDto;
    },
    enabled: enabled && !!id,
  });
};

export const useRolePageAccesses = (roleId: number, enabled = true) => {
  return useQuery({
    queryKey: roleKeys.pageAccesses(roleId),
    queryFn: async () => {
      const response = await roleApi.getRolePageAccesses(roleId);
      return apiUtils.extractData(response) as PageAccessResponseDto[];
    },
    enabled: enabled && !!roleId,
  });
};

// Role Mutations
export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleData: CreateRoleRequestDto) => {
      const response = await roleApi.createRole(roleData);
      return apiUtils.extractData(response) as RoleResponseDto;
    },
    onSuccess: (newRole) => {
      // Invalidate and refetch roles list
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });

      // Add the new role to the cache
      queryClient.setQueryData(roleKeys.detail(newRole.id), newRole);

      toast.success('Success', 'Role created successfully');
    },
    onError: (error: any) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, roleData }: { id: number; roleData: UpdateRoleRequestDto }) => {
      const response = await roleApi.updateRole(id, roleData);
      return apiUtils.extractData(response) as RoleResponseDto;
    },
    onSuccess: (updatedRole) => {
      // Update the role in the cache
      queryClient.setQueryData(roleKeys.detail(updatedRole.id), updatedRole);

      // Invalidate roles list to reflect changes
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });

      toast.success('Success', 'Role updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await roleApi.deleteRole(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove role from cache
      queryClient.removeQueries({ queryKey: roleKeys.detail(deletedId) });

      // Invalidate roles list
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });

      toast.success('Success', 'Role deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};