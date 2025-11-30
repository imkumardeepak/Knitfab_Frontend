import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useCouriers, useDeleteCourier } from '@/hooks/queries';
import { apiUtils } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import type { Row } from '@tanstack/react-table';
import type { CourierResponseDto } from '@/types/api-types';

type CourierCellProps = { row: Row<CourierResponseDto> };

const CourierManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: couriers = [], isLoading, error } = useCouriers();
  const { mutate: deleteCourierMutation, isPending: isDeleting } =
    useDeleteCourier();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    courier: CourierResponseDto | null;
  }>({
    open: false,
    courier: null,
  });

  const columns = [
    {
      accessorKey: 'courierName',
      header: 'Courier Name',
      cell: ({ row }: CourierCellProps) => {
        const courier = row.original;
        return <div className="font-medium">{courier.courierName}</div>;
      },
    },
    {
      accessorKey: 'contactPerson',
      header: 'Contact Person',
      cell: ({ row }: CourierCellProps) => {
        const courier = row.original;
        return <div>{courier.contactPerson || '-'}</div>;
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }: CourierCellProps) => {
        const courier = row.original;
        return <div>{courier.phone || '-'}</div>;
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }: CourierCellProps) => {
        const courier = row.original;
        return <div>{courier.email || '-'}</div>;
      },
    },
    {
      accessorKey: 'gstNo',
      header: 'GST No',
      cell: ({ row }: CourierCellProps) => {
        const courier = row.original;
        return <div>{courier.gstNo || '-'}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: CourierCellProps) => {
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
      cell: ({ row }: CourierCellProps) => {
        const courier = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/couriers/${courier.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(courier.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (id: number) => {
    const courier = couriers.find((m) => m.id === id);
    if (courier) {
      setDeleteDialog({
        open: true,
        courier,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.courier) {
      deleteCourierMutation(deleteDialog.courier.id);
      // Add query invalidation to refresh the list after delete
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      setDeleteDialog({ open: false, courier: null });
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
      <div className="text-center text-red-500 p-4">
        Error loading couriers: {errorMessage}
      </div>
    );
  }

  const activeCouriers = couriers.filter(
    (courier) => courier.isActive
  ).length;
  const inactiveCouriers = couriers.length - activeCouriers;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Courier Management</h1>
          <p className="text-muted-foreground">
            Manage courier companies and their details
          </p>
        </div>
        <Button onClick={() => navigate('/couriers/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Courier
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Couriers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{couriers.length}</div>
            <p className="text-xs text-muted-foreground">{activeCouriers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Couriers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCouriers}</div>
            <p className="text-xs text-muted-foreground">{inactiveCouriers} inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Couriers with GST</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {couriers.filter(c => c.gstNo).length}
            </div>
            <p className="text-xs text-muted-foreground">Out of {couriers.length} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Couriers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Couriers</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({couriers.length} couriers)
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={couriers}
            searchKey="courierName"
            searchPlaceholder="Search by courier name..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, courier: null })}
        itemName={deleteDialog.courier ? deleteDialog.courier.courierName : ''}
        itemType="Courier"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CourierManagement;