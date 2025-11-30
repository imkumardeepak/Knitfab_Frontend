import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Settings, Edit, Trash2, QrCode } from 'lucide-react';
import { useMachines, useDeleteMachine } from '@/hooks/queries';
import { apiUtils, machineApi } from '@/lib/api-client';
import type { Row } from '@tanstack/react-table';
import type { MachineResponseDto } from '@/types/api-types';

type MachineCellProps = { row: Row<MachineResponseDto> };

const MachineManagement = () => {
  const navigate = useNavigate();
  const { data: machines = [], isLoading, error } = useMachines();
  const { mutate: deleteMachineMutation, isPending: isDeleting } = useDeleteMachine();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    machine: MachineResponseDto | null;
  }>({
    open: false,
    machine: null,
  });

  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const columns = [
    {
      accessorKey: 'machineName',
      header: 'Machine',
      cell: ({ row }: MachineCellProps) => {
        const machine = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="font-medium">{machine.machineName}</div>
              <div className="text-sm text-muted-foreground">
                {machine.description || 'No description'}
              </div>
              {!machine.isActive && (
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
      accessorKey: 'dia',
      header: 'Specifications',
      cell: ({ row }: MachineCellProps) => {
        const machine = row.original;
        const machineType = machine.machineType || 'Single Jersey';
        
        return (
          <div className="space-y-1">
            <div className="text-sm">
              <span className="font-medium">Dia:</span> {machine.dia}"
            </div>
            <div className="text-sm">
              <span className="font-medium">GG:</span> {machine.gg}
            </div>
            <div className="text-sm">
              <span className="font-medium">Needles:</span> {machine.needle}
            </div>
            <div className="text-sm">
              <span className="font-medium">Type:</span> {machineType}
              {machineType === 'Double Jersey' && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">DJ</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: MachineCellProps) => {
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
      cell: ({ row }: MachineCellProps) => {
        const machine = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/machines/${machine.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateQRCode(machine)}
              disabled={isGeneratingQR}
            >
              {isGeneratingQR ? (
                <span className="h-4 w-4">...</span>
              ) : (
                <QrCode className="h-4 w-4" />
              )}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(machine.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (id: number) => {
    const machine = machines.find((m) => m.id === id);
    if (machine) {
      setDeleteDialog({
        open: true,
        machine,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.machine) {
      deleteMachineMutation(deleteDialog.machine.id);
      setDeleteDialog({ open: false, machine: null });
    }
  };

  const handleGenerateQRCode = async (machine: MachineResponseDto) => {
    try {
      setIsGeneratingQR(true);
      const response = await machineApi.generateQRCode(machine.id);
      alert(response.data.message || 'QR code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
      const errorMessage = apiUtils.handleError(error);
      alert(`Failed to generate QR code: ${errorMessage}`);
    } finally {
      setIsGeneratingQR(false);
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
      <div className="text-center text-red-500 p-4">Error loading machines: {errorMessage}</div>
    );
  }

  const activeMachines = machines.filter((machine) => machine.isActive).length;
  const inactiveMachines = machines.length - activeMachines;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Machine Management</h1>
          <p className="text-muted-foreground">Manage knitting machines and their specifications</p>
        </div>
        <Button onClick={() => navigate('/machines/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Machine
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machines.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeMachines} active, {inactiveMachines} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMachines}</div>
            <p className="text-xs text-muted-foreground">Currently operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RPM Info</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {machines.length > 0 ? `${Math.max(...machines.map((m) => m.rpm))}` : '0'}
            </div>
            <p className="text-xs text-muted-foreground">Max RPM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feeders</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {machines.length > 0 ? `${Math.max(...machines.map((m) => m.feeder))}` : '0'}
            </div>
            <p className="text-xs text-muted-foreground">Max Feeders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Machine Types</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {machines.filter(m => m.machineType === 'Double Jersey').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {machines.filter(m => m.machineType === 'Single Jersey').length} Single, {machines.filter(m => m.machineType === 'Double Jersey').length} Double
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Double Jersey machines have 2x needle count
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Machines Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Machines</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({machines.length} machines)
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={machines}
            searchKey="machineName"
            searchPlaceholder="Search by machine name..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, machine: null })}
        itemName={deleteDialog.machine ? deleteDialog.machine.machineName : ''}
        itemType="Machine"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default MachineManagement;
