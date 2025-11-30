import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save, Clock } from 'lucide-react';
import type {
  ShiftResponseDto,
  CreateShiftRequestDto,
  UpdateShiftRequestDto,
} from '@/types/api-types';

const shiftSchema = z.object({
  shiftName: z
    .string()
    .min(1, 'Shift name is required')
    .max(100, 'Shift name must be less than 100 characters'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  durationInHours: z
    .number()
    .min(0, 'Duration must be a positive number')
    .max(24, 'Duration cannot exceed 24 hours'),
  // Removed companyId field as requested
  isActive: z.boolean().optional(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

const fetchShift = async (id: number): Promise<ShiftResponseDto> => {
  const response = await shiftApi.getShift(id);
  return apiUtils.extractData(response);
};

const createShift = async (data: CreateShiftRequestDto): Promise<ShiftResponseDto> => {
  const response = await shiftApi.createShift(data);
  return apiUtils.extractData(response);
};

const updateShift = async (
  id: number,
  data: UpdateShiftRequestDto
): Promise<ShiftResponseDto> => {
  const response = await shiftApi.updateShift(id, data);
  return apiUtils.extractData(response);
};

const ShiftForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: shift } = useQuery<ShiftResponseDto>({
    queryKey: ['shift', id],
    queryFn: () => fetchShift(parseInt(id!)),
    enabled: isEdit,
  });

  const { mutate: createMutation, isPending: isCreating } = useMutation({
    mutationFn: createShift,
    onSuccess: () => {
      toast.success('Success', 'Shift created successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      navigate('/shifts');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateShiftRequestDto }) =>
      updateShift(id, data),
    onSuccess: () => {
      toast.success('Success', 'Shift updated successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
      navigate('/shifts');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      shiftName: '',
      startTime: '',
      endTime: '',
      durationInHours: 0,
      // Removed companyId field as requested
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit && shift) {
      form.setValue('shiftName', shift.shiftName);
      form.setValue('startTime', shift.startTime);
      form.setValue('endTime', shift.endTime);
      form.setValue('durationInHours', shift.durationInHours);
      // companyId field was removed as requested
      form.setValue('isActive', shift.isActive);
    }
  }, [shift, form, isEdit]);

  const onSubmit = (data: ShiftFormData) => {
    if (isEdit) {
      updateMutation({
        id: parseInt(id!),
        data: {
          ...data,
          isActive: data.isActive ?? true,
        } as UpdateShiftRequestDto,
      });
    } else {
      createMutation(data as CreateShiftRequestDto);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/shifts')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shifts
        </Button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Shift' : 'Create Shift'}</h1>
        <p className="text-muted-foreground">
          {isEdit ? 'Update the shift details' : 'Add a new shift'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Shift Details
          </CardTitle>
          <CardDescription>
            {isEdit
              ? 'Modify the shift information below'
              : 'Enter the details for the new shift'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shiftName">Shift Name</Label>
                <Input
                  id="shiftName"
                  {...form.register('shiftName')}
                  placeholder="Enter shift name (e.g., Morning, Evening)"
                />
                {form.formState.errors.shiftName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.shiftName.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="durationInHours">Duration (Hours)</Label>
                <Input
                  id="durationInHours"
                  type="number"
                  min="0"
                  max="24"
                  {...form.register('durationInHours', { valueAsNumber: true })}
                  placeholder="Enter duration in hours"
                />
                {form.formState.errors.durationInHours && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.durationInHours.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register('startTime')}
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.startTime.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register('endTime')}
                />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.endTime.message}
                  </p>
                )}
              </div>
              
              {/* Removed companyId field as requested */}
            </div>

            {isEdit && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={form.watch('isActive')}
                  onCheckedChange={(checked) => form.setValue('isActive', !!checked)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => navigate('/shifts')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isCreating ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEdit ? 'Update Shift' : 'Create Shift'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftForm;