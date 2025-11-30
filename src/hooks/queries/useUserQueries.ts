import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi, roleApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
  AdminUserResponseDto,
  CreateUserRequestDto,
  UpdateUserRequestDto,
  RoleResponseDto
} from '@/types/api-types';

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
  roles: (id: number) => [...userKeys.detail(id), 'roles'] as const,
};

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (filters: string) => [...roleKeys.lists(), { filters }] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: number) => [...roleKeys.details(), id] as const,
  pageAccesses: () => [...roleKeys.all, 'pageAccesses'] as const,
};

// User Queries
export const useUsers = () => {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: async () => {
      const response = await userApi.getAllUsers();
      return apiUtils.extractData(response) as AdminUserResponseDto[];
    },
  });
};

export const useUser = (id: number, enabled = true) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const response = await userApi.getUser(id);
      return apiUtils.extractData(response) as AdminUserResponseDto;
    },
    enabled: enabled && !!id,
  });
};

// getUserRoles is not available in the current API

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

export const usePageAccesses = () => {
  return useQuery({
    queryKey: roleKeys.pageAccesses(),
    queryFn: async () => {
      // Get page accesses from roles
      const response = await roleApi.getAllRoles();
      const roles = apiUtils.extractData(response) as RoleResponseDto[];
      // Extract all page accesses from all roles
      const allPageAccesses = roles.flatMap(role => role.pageAccesses || []);
      return allPageAccesses;
    },
  });
};

// User Mutations
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserRequestDto) => {
      const response = await userApi.createUser(userData);
      return apiUtils.extractData(response) as AdminUserResponseDto;
    },
    onSuccess: (newUser) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });

      // Add the new user to the cache
      queryClient.setQueryData(userKeys.detail(newUser.id), newUser);

      toast.success('Success', 'User created successfully');
    },
    onError: (error: any) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: UpdateUserRequestDto }) => {
      const response = await userApi.updateUser(id, userData);
      return apiUtils.extractData(response) as AdminUserResponseDto;
    },
    onSuccess: (updatedUser) => {
      // Update the user in the cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);

      // Invalidate users list to reflect changes
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });

      toast.success('Success', 'User updated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await userApi.deleteUser(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove user from cache
      queryClient.removeQueries({ queryKey: userKeys.detail(deletedId) });

      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });

      toast.success('Success', 'User deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });
};

// Lock/Unlock user functions are not available in the current API


