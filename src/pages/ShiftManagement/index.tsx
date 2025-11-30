import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useShifts, useDeleteShift } from '@/hooks/queries';
import { apiUtils } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import type { Row } from '@tanstack/react-table';
import type { ShiftResponseDto } from '@/types/api-types';

type ShiftCellProps = { row: Row<ShiftResponseDto> };

const ShiftManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: shifts = [], isLoading, error } = useShifts();
  const { mutate: deleteShiftMutation, isPending: isDeleting } = useDeleteShift();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    shift: ShiftResponseDto | null;
  }>({
    open: false,
    shift: null,
  });

  const formatTime = (time: string) => {
    // Convert TimeSpan to readable format
    const parts = time.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return time;
  };

  const columns = [
    {
      accessorKey: 'shiftName',
      header: 'Shift Name',
      cell: ({ row }: ShiftCellProps) => {
        const shift = row.original;
        return <div className="font-medium">{shift.shiftName}</div>;
      },
    },
    {
      accessorKey: 'startTime',
      header: 'Start Time',
      cell: ({ row }: ShiftCellProps) => {
        const shift = row.original;
        return <div>{formatTime(shift.startTime)}</div>;
      },
    },
    {
      accessorKey: 'endTime',
      header: 'End Time',
      cell: ({ row }: ShiftCellProps) => {
        const shift = row.original;
        return <div>{formatTime(shift.endTime)}</div>;
      },
    },
    {
      accessorKey: 'durationInHours',
      header: 'Duration (Hours)',
      cell: ({ row }: ShiftCellProps) => {
        const shift = row.original;
        return <div>{shift.durationInHours}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: ShiftCellProps) => {
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
      cell: ({ row }: ShiftCellProps) => {
        const shift = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/shifts/${shift.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(shift.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (id: number) => {
    const shift = shifts.find((m) => m.id === id);
    if (shift) {
      setDeleteDialog({
        open: true,
        shift,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.shift) {
      deleteShiftMutation(deleteDialog.shift.id);
      // Add query invalidation to refresh the list after delete
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setDeleteDialog({ open: false, shift: null });
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
      <div className="text-center text-red-500 p-4">Error loading shifts: {errorMessage}</div>
    );
  }

  const activeShifts = shifts.filter((shift) => shift.isActive).length;
  const inactiveShifts = shifts.length - activeShifts;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Shift Management</h1>
          <p className="text-muted-foreground">Manage shifts for production</p>
        </div>
        <Button onClick={() => navigate('/shifts/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Shift
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
            <p className="text-xs text-muted-foreground">{activeShifts} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeShifts}</div>
            <p className="text-xs text-muted-foreground">{inactiveShifts} inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(shifts.map((s) => s.shiftName))).length}
            </div>
            <p className="text-xs text-muted-foreground">Distinct shift names</p>
          </CardContent>
        </Card>
      </div>

      {/* Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Shifts</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({shifts.length} shifts)
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={shifts}
            searchKey="shiftName"
            searchPlaceholder="Search by Shift Name..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, shift: null })}
        itemName={deleteDialog.shift ? deleteDialog.shift.shiftName : ''}
        itemType="Shift"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ShiftManagement;