import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slitLineApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Row } from '@tanstack/react-table';
import type { SlitLineResponseDto } from '@/types/api-types';

type SlitLineCellProps = { row: Row<SlitLineResponseDto> };

const fetchSlitLines = async (): Promise<SlitLineResponseDto[]> => {
  const response = await slitLineApi.getAllSlitLines();
  return apiUtils.extractData(response);
};

const deleteSlitLine = async (id: number): Promise<void> => {
  const response = await slitLineApi.deleteSlitLine(id);
  return apiUtils.extractData(response);
};

const SlitLineManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: slitLines = [], isLoading, error } = useQuery<SlitLineResponseDto[]>({
    queryKey: ['slitLines'],
    queryFn: fetchSlitLines,
  });

  const { mutate: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: deleteSlitLine,
    onSuccess: () => {
      toast.success('Success', 'Slit line deleted successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['slitLines'] });
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    slitLine: SlitLineResponseDto | null;
  }>({
    open: false,
    slitLine: null,
  });

  const columns = [
    {
      accessorKey: 'slitLine',
      header: 'Slit Line',
      cell: ({ row }: SlitLineCellProps) => {
        const slitLine = row.original;
        return <div className="font-medium">{slitLine.slitLine}</div>;
      },
    },
    {
      accessorKey: 'slitLineCode',
      header: 'Slit Line Code',
      cell: ({ row }: SlitLineCellProps) => {
        const slitLine = row.original;
        return <div className="font-mono">{slitLine.slitLineCode}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: SlitLineCellProps) => {
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
      cell: ({ row }: SlitLineCellProps) => {
        const slitLine = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/slit-lines/${slitLine.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => handleDelete(slitLine)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (slitLine: SlitLineResponseDto) => {
    setDeleteDialog({
      open: true,
      slitLine,
    });
  };

  const confirmDelete = () => {
    if (deleteDialog.slitLine) {
      deleteMutation(deleteDialog.slitLine.id);
      setDeleteDialog({ open: false, slitLine: null });
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
      <div className="text-center text-red-500 p-4">Error loading slit lines: {errorMessage}</div>
    );
  }

  const activeSlitLines = slitLines.filter((slitLine) => slitLine.isActive).length;
  const inactiveSlitLines = slitLines.length - activeSlitLines;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Slit Line Management</h1>
          <p className="text-muted-foreground">Manage slit lines for production</p>
        </div>
        <Button onClick={() => navigate('/slit-lines/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Slit Line
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Slit Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slitLines.length}</div>
            <p className="text-xs text-muted-foreground">{activeSlitLines} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Slit Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSlitLines}</div>
            <p className="text-xs text-muted-foreground">{inactiveSlitLines} inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Slit Line Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(slitLines.map((sl) => sl.slitLineCode))).length}
            </div>
            <p className="text-xs text-muted-foreground">Distinct slit line codes</p>
          </CardContent>
        </Card>
      </div>

      {/* Slit Lines Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Slit Lines</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({slitLines.length} slit lines)
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={slitLines}
            searchKey="slitLine"
            searchPlaceholder="Search by Slit Line..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, slitLine: null })}
        itemName={deleteDialog.slitLine ? deleteDialog.slitLine.slitLine : ''}
        itemType="Slit Line"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default SlitLineManagement;