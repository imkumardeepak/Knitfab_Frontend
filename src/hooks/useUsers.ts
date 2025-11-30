import { useState, useEffect, useCallback } from 'react';
import { userApi, apiUtils } from '@/lib/api-client';
import type {
  AdminUserResponseDto,
  CreateUserRequestDto,
  UpdateUserRequestDto,
  ChangePasswordRequestDto,
  RoleResponseDto,
} from '@/types/api-types';
import { AxiosError } from 'axios';

// Helper function to handle errors
const handleError = (err: unknown, defaultMessage: string): string => {
  if (err instanceof AxiosError) {
    return err.response?.data?.message || err.message || defaultMessage;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return defaultMessage;
};

export const useUsers = () => {
  const [users, setUsers] = useState<AdminUserResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.getAllUsers();
      const usersData = apiUtils.extractData(response);
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(handleError(err, 'Failed to fetch users'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single user
  const getUser = async (id: number): Promise<AdminUserResponseDto | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.getUser(id);
      const userData = apiUtils.extractData(response);
      return userData;
    } catch (err) {
      setError(handleError(err, 'Failed to fetch user'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create user
  const createUser = async (data: CreateUserRequestDto): Promise<AdminUserResponseDto | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.createUser(data);
      const newUser = apiUtils.extractData(response);
      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (err) {
      setError(handleError(err, 'Failed to create user'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update user
  const updateUser = async (id: number, data: UpdateUserRequestDto): Promise<AdminUserResponseDto | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.updateUser(id, data);
      const updatedUser = apiUtils.extractData(response);
      setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
      return updatedUser;
    } catch (err) {
      setError(handleError(err, 'Failed to update user'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await userApi.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      return true;
    } catch (err) {
      setError(handleError(err, 'Failed to delete user'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Change password (for current user)
  const changePassword = async (passwordData: ChangePasswordRequestDto): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await userApi.changePassword(passwordData);
      return true;
    } catch (err) {
      setError(handleError(err, 'Failed to change password'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get all roles
  const getAllRoles = async (): Promise<RoleResponseDto[]> => {
    try {
      const response = await userApi.getPermissions();
      // This is a placeholder since we don't have a direct API for getting all roles
      // In a real implementation, you would call the role API
      return [];
    } catch (err) {
      setError(handleError(err, 'Failed to fetch roles'));
      return [];
    }
  };

  // Search users (local search for now)
  const searchUsers = async (query: string): Promise<AdminUserResponseDto[]> => {
    try {
      setLoading(true);
      setError(null);
      // Filter current users by query
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(query.toLowerCase())
      );
      return filtered;
    } catch (err) {
      setError(handleError(err, 'Failed to search users'));
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get user statistics
  const getUserStats = async () => {
    try {
      return {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
      };
    } catch (err) {
      setError(handleError(err, 'Failed to fetch user statistics'));
      return null;
    }
  };

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    fetchUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    getAllRoles,
    searchUsers,
    getUserStats,
  };
};