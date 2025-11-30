import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Shield, Users, Settings, Edit, Trash2, Key } from 'lucide-react';
import { useRoles, useDeleteRole } from '@/hooks/queries';
import { roleApi, apiUtils } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import type { Row } from '@tanstack/react-table';
import type { RoleResponseDto } from '@/types/api-types';

type RoleCellProps = { row: Row<RoleResponseDto> };

const fetchRoles = async (): Promise<RoleResponseDto[]> => {
  const response = await roleApi.getAllRoles();
  return apiUtils.extractData(response);
};

const deleteRole = async (id: number): Promise<void> => {
  await roleApi.deleteRole(id);
};

const RoleManagement = () => {
  const navigate = useNavigate();

  const { data: roles = [], isLoading, error } = useRoles();

  const { mutate: deleteRoleMutation, isPending: isDeleting } = useDeleteRole();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    role: RoleResponseDto | null;
  }>({
    open: false,
    role: null,
  });

  const columns = [
    {
      accessorKey: 'roleName',
      header: 'Role Name',
      cell: ({ row }: RoleCellProps) => {
        const role = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="font-medium">{role.roleName}</div>
              <div className="text-sm text-muted-foreground">
                {role.description || 'No description'}
              </div>
              {!role.isActive && (
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
      accessorKey: 'pageAccesses',
      header: 'Permissions',
      cell: ({ row }: RoleCellProps) => {
        const role = row.original;
        const totalPermissions = role.pageAccesses?.length || 0;
        const activePermissions =
          role.pageAccesses?.filter((p) => p.isView || p.isAdd || p.isEdit || p.isDelete).length ||
          0;

        return (
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {activePermissions} of {totalPermissions} pages
            </div>
            <div className="flex flex-wrap gap-1">
              {role.pageAccesses?.slice(0, 3).map((page, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {page.pageName}
                </Badge>
              ))}
              {(role.pageAccesses?.length || 0) > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{(role.pageAccesses?.length || 0) - 3} more
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: RoleCellProps) => {
        const isActive = row.getValue('isActive') as boolean;
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: RoleCellProps) => {
        const role = row.original;
        return (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/roles/${role.id}/edit`)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/roles/${role.id}/permissions`)}
            >
              <Key className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(role.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (id: number) => {
    const role = roles.find((r) => r.id === id);
    if (role) {
      setDeleteDialog({
        open: true,
        role,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.role) {
      deleteRoleMutation(deleteDialog.role.id);
      setDeleteDialog({ open: false, role: null });
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
    return <div className="text-center text-red-500 p-4">Error loading roles: {errorMessage}</div>;
  }

  const activeRoles = roles.filter((role) => role.isActive).length;
  const totalPermissions = roles.reduce(
    (total, role) => total + (role.pageAccesses?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Role Management</h1>
          <p className="text-muted-foreground">Manage system roles and permissions</p>
        </div>
        <Button onClick={() => navigate('/roles/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">{activeRoles} active roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRoles}</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPermissions}</div>
            <p className="text-xs text-muted-foreground">Across all roles</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Roles</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">({roles.length} roles)</span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={roles}
            searchKey="roleName"
            searchPlaceholder="Search by role name..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, role: null })}
        itemName={deleteDialog.role ? deleteDialog.role.roleName : ''}
        itemType="Role"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default RoleManagement;
