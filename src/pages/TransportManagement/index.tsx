import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useTransports, useDeleteTransport } from '@/hooks/queries';
import { apiUtils } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import type { Row } from '@tanstack/react-table';
import type { TransportResponseDto } from '@/types/api-types';

type TransportCellProps = { row: Row<TransportResponseDto> };

const TransportManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: transports = [], isLoading, error } = useTransports();
  const { mutate: deleteTransportMutation, isPending: isDeleting } =
    useDeleteTransport();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    transport: TransportResponseDto | null;
  }>({
    open: false,
    transport: null,
  });

  const columns = [
    {
      accessorKey: 'transportName',
      header: 'Transport Name',
      cell: ({ row }: TransportCellProps) => {
        const transport = row.original;
        return <div className="font-medium">{transport.transportName}</div>;
      },
    },
    {
      accessorKey: 'contactPerson',
      header: 'Contact Person',
      cell: ({ row }: TransportCellProps) => {
        const transport = row.original;
        return <div>{transport.contactPerson || '-'}</div>;
      },
    },
    {
      accessorKey: 'vehicleNumber',
      header: 'Vehicle Number',
      cell: ({ row }: TransportCellProps) => {
        const transport = row.original;
        return <div>{transport.vehicleNumber || '-'}</div>;
      },
    },
    {
      accessorKey: 'driverName',
      header: 'Driver Name',
      cell: ({ row }: TransportCellProps) => {
        const transport = row.original;
        return <div>{transport.driverName || '-'}</div>;
      },
    },
    {
      accessorKey: 'driverNumber',
      header: 'Driver Number',
      cell: ({ row }: TransportCellProps) => {
        const transport = row.original;
        return <div>{transport.driverNumber || '-'}</div>;
      },
    },
    {
      accessorKey: 'licenseNumber',
      header: 'License Number',
      cell: ({ row }: TransportCellProps) => {
        const transport = row.original;
        return <div>{transport.licenseNumber || '-'}</div>;
      },
    },
    {
      accessorKey: 'maximumCapacityKgs',
      header: 'Max Capacity (Kgs)',
      cell: ({ row }: TransportCellProps) => {
        const transport = row.original;
        return <div>{transport.maximumCapacityKgs ? transport.maximumCapacityKgs.toFixed(2) : '-'}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: TransportCellProps) => {
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
      cell: ({ row }: TransportCellProps) => {
        const transport = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/transports/${transport.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(transport.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (id: number) => {
    const transport = transports.find((m) => m.id === id);
    if (transport) {
      setDeleteDialog({
        open: true,
        transport,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.transport) {
      deleteTransportMutation(deleteDialog.transport.id);
      // Add query invalidation to refresh the list after delete
      queryClient.invalidateQueries({ queryKey: ['transports'] });
      setDeleteDialog({ open: false, transport: null });
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
        Error loading transports: {errorMessage}
      </div>
    );
  }

  const activeTransports = transports.filter(
    (transport) => transport.isActive
  ).length;
  const inactiveTransports = transports.length - activeTransports;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Transport Management</h1>
          <p className="text-muted-foreground">
            Manage transport companies and their details
          </p>
        </div>
        <Button onClick={() => navigate('/transports/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transport
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transports.length}</div>
            <p className="text-xs text-muted-foreground">{activeTransports} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Transports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTransports}</div>
            <p className="text-xs text-muted-foreground">{inactiveTransports} inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transports.length > 0 && transports.some(t => t.maximumCapacityKgs)
                ? `${(transports
                    .filter(t => t.maximumCapacityKgs)
                    .reduce((sum, t) => sum + (t.maximumCapacityKgs || 0), 0) / 
                  transports.filter(t => t.maximumCapacityKgs).length).toFixed(0)} Kgs`
                : '0 Kgs'}
            </div>
            <p className="text-xs text-muted-foreground">Across transports with capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Transports Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Transports</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({transports.length} transports)
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={transports}
            searchKey="transportName"
            searchPlaceholder="Search by transport name..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, transport: null })}
        itemName={deleteDialog.transport ? deleteDialog.transport.transportName : ''}
        itemType="Transport"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default TransportManagement;