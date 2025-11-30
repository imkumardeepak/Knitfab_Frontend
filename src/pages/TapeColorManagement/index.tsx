import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useTapeColors, useDeleteTapeColor } from '@/hooks/queries';
import { apiUtils } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import type { Row } from '@tanstack/react-table';
import type { TapeColorResponseDto } from '@/types/api-types';

type TapeColorCellProps = { row: Row<TapeColorResponseDto> };

const TapeColorManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tapeColors = [], isLoading, error } = useTapeColors();
  const { mutate: deleteTapeColorMutation, isPending: isDeleting } = useDeleteTapeColor();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    tapeColor: TapeColorResponseDto | null;
  }>({
    open: false,
    tapeColor: null,
  });

  const columns = [
    {
      accessorKey: 'tapeColor',
      header: 'Tape Color',
      cell: ({ row }: TapeColorCellProps) => {
        const tapeColor = row.original;
        return <div className="font-medium">{tapeColor.tapeColor}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: TapeColorCellProps) => {
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
      cell: ({ row }: TapeColorCellProps) => {
        const tapeColor = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tape-colors/${tapeColor.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(tapeColor.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (id: number) => {
    const tapeColor = tapeColors.find((m) => m.id === id);
    if (tapeColor) {
      setDeleteDialog({
        open: true,
        tapeColor,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.tapeColor) {
      deleteTapeColorMutation(deleteDialog.tapeColor.id);
      // Add query invalidation to refresh the list after delete
      queryClient.invalidateQueries({ queryKey: ['tapeColors'] });
      setDeleteDialog({ open: false, tapeColor: null });
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
      <div className="text-center text-red-500 p-4">Error loading tape colors: {errorMessage}</div>
    );
  }

  const activeTapeColors = tapeColors.filter((tapeColor) => tapeColor.isActive).length;
  const inactiveTapeColors = tapeColors.length - activeTapeColors;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Tape Color Management</h1>
          <p className="text-muted-foreground">Manage tape colors for production</p>
        </div>
        <Button onClick={() => navigate('/tape-colors/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tape Color
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tape Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tapeColors.length}</div>
            <p className="text-xs text-muted-foreground">{activeTapeColors} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tape Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTapeColors}</div>
            <p className="text-xs text-muted-foreground">{inactiveTapeColors} inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Tape Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(tapeColors.map((tc) => tc.tapeColor))).length}
            </div>
            <p className="text-xs text-muted-foreground">Distinct tape colors</p>
          </CardContent>
        </Card>
      </div>

      {/* Tape Colors Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tape Colors</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({tapeColors.length} tape colors)
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tapeColors}
            searchKey="tapeColor"
            searchPlaceholder="Search by Tape Color..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, tapeColor: null })}
        itemName={deleteDialog.tapeColor ? deleteDialog.tapeColor.tapeColor : ''}
        itemType="Tape Color"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default TapeColorManagement;