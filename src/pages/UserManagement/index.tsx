import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Users, UserCheck, UserX, Clock, Eye, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, apiUtils } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import type { Row } from '@tanstack/react-table';
import type { AdminUserResponseDto } from '@/types/api-types';

type UserCellProps = { row: Row<AdminUserResponseDto> };

const fetchUsers = async (): Promise<AdminUserResponseDto[]> => {
  const response = await userApi.getAllUsers();
  return apiUtils.extractData(response);
};

const deleteUser = async (id: number): Promise<void> => {
  await userApi.deleteUser(id);
};

const UserManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery<AdminUserResponseDto[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const { mutate: deleteUserMutation, isPending: isDeleting } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: AdminUserResponseDto | null;
  }>({
    open: false,
    user: null,
  });

  const columns = [
    {
      accessorKey: 'firstName',
      header: 'User',
      cell: ({ row }: UserCellProps) => {
        const user = row.original;
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user.firstName?.[0] || 'U'}
                {user.lastName?.[0] || 'N'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{`${user.firstName} ${user.lastName}`}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              {!user.isActive && (
                <Badge variant="destructive" className="text-xs mt-1">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'roleName',
      header: 'Role',
      cell: ({ row }: UserCellProps) => <Badge variant="outline">{row.getValue('roleName')}</Badge>,
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last Login',
      cell: ({ row }: UserCellProps) => {
        const lastLogin = row.getValue('lastLoginAt') as string;
        return (
          <div className="text-sm">{lastLogin ? formatDate(new Date(lastLogin)) : 'Never'}</div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: UserCellProps) => {
        const user = row.original;
        return (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/users/${user.id}`)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/users/${user.id}/edit`)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (id: number) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      setDeleteDialog({
        open: true,
        user,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.user) {
      deleteUserMutation(deleteDialog.user.id);
      setDeleteDialog({ open: false, user: null });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    const errorMessage = apiUtils.handleError(error);
    return <div className="text-center text-red-500 p-4">Error loading users: {errorMessage}</div>;
  }

  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = users.length - activeUsers;
  const recentUsers = users.filter((user) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(user.createdAt) > oneWeekAgo;
  }).length;
  const usersWithRecentLogin = users.filter((user) => {
    if (!user.lastLoginAt) return false;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(user.lastLoginAt) > oneWeekAgo;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">User Management</h1>
          <p className="text-muted-foreground">Manage system users, roles, and permissions</p>
        </div>
        <Button onClick={() => navigate('/users/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeUsers} active, {inactiveUsers} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {usersWithRecentLogin} logged in this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">{recentUsers} created this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithRecentLogin}</div>
            <p className="text-xs text-muted-foreground">users logged in this week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">({users.length} users)</span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users}
            searchKey="firstName"
            searchPlaceholder="Search by name..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, user: null })}
        itemName={
          deleteDialog.user ? `${deleteDialog.user.firstName} ${deleteDialog.user.lastName}` : ''
        }
        itemType="User"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default UserManagement;
