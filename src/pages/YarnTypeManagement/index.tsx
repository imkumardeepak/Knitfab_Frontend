import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useYarnTypes, useDeleteYarnType } from '@/hooks/queries';
import { apiUtils } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import type { Row } from '@tanstack/react-table';
import type { YarnTypeResponseDto } from '@/types/api-types';

type YarnTypeCellProps = { row: Row<YarnTypeResponseDto> };

const YarnTypeManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: yarnTypes = [], isLoading, error } = useYarnTypes();
  const { mutate: deleteYarnTypeMutation, isPending: isDeleting } = useDeleteYarnType();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    yarnType: YarnTypeResponseDto | null;
  }>({
    open: false,
    yarnType: null,
  });

  const columns = [
    {
      accessorKey: 'yarnType',
      header: 'Yarn Type',
      cell: ({ row }: YarnTypeCellProps) => {
        const yarnType = row.original;
        return <div className="font-medium">{yarnType.yarnType}</div>;
      },
    },
    {
      accessorKey: 'yarnCode',
      header: 'Yarn Code',
      cell: ({ row }: YarnTypeCellProps) => {
        const yarnType = row.original;
        return <div>{yarnType.yarnCode}</div>;
      },
    },
    {
      accessorKey: 'shortCode',
      header: 'Short Code',
      cell: ({ row }: YarnTypeCellProps) => {
        const yarnType = row.original;
        return <div>{yarnType.shortCode}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: YarnTypeCellProps) => {
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
      cell: ({ row }: YarnTypeCellProps) => {
        const yarnType = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/yarn-types/${yarnType.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(yarnType.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (id: number) => {
    const yarnType = yarnTypes.find((m) => m.id === id);
    if (yarnType) {
      setDeleteDialog({
        open: true,
        yarnType,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.yarnType) {
      deleteYarnTypeMutation(deleteDialog.yarnType.id, {
        onSuccess: () => {
          // Refetch the yarn types list after successful deletion
          queryClient.invalidateQueries({ queryKey: ['yarnTypes', 'list'] });
        },
      });
      setDeleteDialog({ open: false, yarnType: null });
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
    return (
      <div className="text-center text-red-500 p-4">Error loading yarn types: {errorMessage}</div>
    );
  }

  const activeYarnTypes = yarnTypes.filter((yarnType) => yarnType.isActive).length;
  const inactiveYarnTypes = yarnTypes.length - activeYarnTypes;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Yarn Type Management</h1>
          <p className="text-muted-foreground">Manage yarn types and their codes</p>
        </div>
        <Button onClick={() => navigate('/yarn-types/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Yarn Type
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Yarn Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{yarnTypes.length}</div>
            <p className="text-xs text-muted-foreground">{activeYarnTypes} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Yarn Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeYarnTypes}</div>
            <p className="text-xs text-muted-foreground">{inactiveYarnTypes} inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(yarnTypes.map((yt) => yt.yarnCode))).length}
            </div>
            <p className="text-xs text-muted-foreground">Different yarn codes</p>
          </CardContent>
        </Card>
      </div>

      {/* Yarn Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Yarn Types</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({yarnTypes.length} yarn types)
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={yarnTypes}
            searchKey="yarnType"
            searchPlaceholder="Search by yarn type..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, yarnType: null })}
        itemName={deleteDialog.yarnType ? deleteDialog.yarnType.yarnType : ''}
        itemType="Yarn Type"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default YarnTypeManagement;
