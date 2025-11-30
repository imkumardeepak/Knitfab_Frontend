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
import { useYarnType, useCreateYarnType, useUpdateYarnType } from '@/hooks/queries';
import { yarnTypeApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import type {
  YarnTypeResponseDto,
  CreateYarnTypeRequestDto,
  UpdateYarnTypeRequestDto,
} from '@/types/api-types';

const yarnTypeSchema = z.object({
  yarnType: z
    .string()
    .min(1, 'Yarn type is required')
    .max(200, 'Yarn type must be less than 200 characters'),
  yarnCode: z
    .string()
    .min(1, 'Yarn code is required')
    .max(3, 'Yarn code must be less than 3 characters'),
  shortCode: z
    .string()
    .min(1, 'Short code is required')
    .max(1, 'Short code must be less than 1 characters'),
  isActive: z.boolean().optional(),
});

type YarnTypeFormData = z.infer<typeof yarnTypeSchema>;

const fetchYarnType = async (id: number): Promise<YarnTypeResponseDto> => {
  const response = await yarnTypeApi.getYarnType(id);
  return apiUtils.extractData(response);
};

const YarnTypeForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: yarnType } = useYarnType(parseInt(id!), isEdit);
  const { mutate: createMutation, isPending: isCreating } = useCreateYarnType();
  const { mutate: updateMutation, isPending: isUpdating } = useUpdateYarnType();

  const form = useForm<YarnTypeFormData>({
    resolver: zodResolver(yarnTypeSchema),
    defaultValues: {
      yarnType: '',
      yarnCode: '',
      shortCode: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit && yarnType) {
      form.setValue('yarnType', yarnType.yarnType);
      form.setValue('yarnCode', yarnType.yarnCode);
      form.setValue('shortCode', yarnType.shortCode);
      form.setValue('isActive', yarnType.isActive);
    }
  }, [yarnType, form, isEdit]);

  const onSubmit = (data: YarnTypeFormData) => {
    if (isEdit) {
      updateMutation(
        {
          id: parseInt(id!),
          yarnTypeData: {
            ...data,
            isActive: data.isActive ?? true,
          },
        },
        {
          onSuccess: () => {
            toast.success('Success', 'Yarn type updated successfully');
            // Refetch the yarn types list after successful update
            queryClient.invalidateQueries({ queryKey: ['yarnTypes', 'list'] });
            navigate('/yarn-types');
          },
          onError: (error) => {
            const errorMessage = apiUtils.handleError(error);
            toast.error('Error', errorMessage);
          },
        }
      );
    } else {
      createMutation(data, {
        onSuccess: () => {
          toast.success('Success', 'Yarn type created successfully');
          // Refetch the yarn types list after successful creation
          queryClient.invalidateQueries({ queryKey: ['yarnTypes', 'list'] });
          navigate('/yarn-types');
        },
        onError: (error) => {
          const errorMessage = apiUtils.handleError(error);
          toast.error('Error', errorMessage);
        },
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/yarn-types')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Yarn Types
        </Button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Yarn Type' : 'Create Yarn Type'}</h1>
        <p className="text-muted-foreground">
          {isEdit ? 'Update the yarn type details' : 'Add a new yarn type with its codes'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yarn Type Details</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Modify the yarn type information below'
              : 'Enter the details for the new yarn type'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="yarnType">Yarn Type</Label>
              <Input id="yarnType" {...form.register('yarnType')} placeholder="Enter yarn type" />
              {form.formState.errors.yarnType && (
                <p className="text-sm text-destructive">{form.formState.errors.yarnType.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yarnCode">Yarn Code</Label>
                <Input id="yarnCode" {...form.register('yarnCode')} placeholder="Enter yarn code" />
                {form.formState.errors.yarnCode && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.yarnCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortCode">Short Code</Label>
                <Input
                  id="shortCode"
                  {...form.register('shortCode')}
                  placeholder="Enter short code"
                />
                {form.formState.errors.shortCode && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.shortCode.message}
                  </p>
                )}
              </div>
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
              <Button type="button" variant="outline" onClick={() => navigate('/yarn-types')}>
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
                    {isEdit ? 'Update Yarn Type' : 'Create Yarn Type'}
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

export default YarnTypeForm;
