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
import { fabricStructureApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save } from 'lucide-react';
import type {
  FabricStructureResponseDto,
  CreateFabricStructureRequestDto,
  UpdateFabricStructureRequestDto,
} from '@/types/api-types';

const fabricStructureSchema = z.object({
  fabricstr: z
    .string()
    .min(1, 'Fabric structure name is required')
    .max(200, 'Fabric structure name must be less than 200 characters'),
  fabricCode: z.string().max(4, 'Fabric code must be less than 4 characters').optional().nullable(),
  standardeffencny: z
    .number()
    .min(0.01, 'Standard efficiency must be greater than 0')
    .max(100, 'Standard efficiency must be less than or equal to 100'),
  isActive: z.boolean().optional(),
});

type FabricStructureFormData = z.infer<typeof fabricStructureSchema>;

const fetchFabricStructure = async (id: number): Promise<FabricStructureResponseDto> => {
  const response = await fabricStructureApi.getFabricStructure(id);
  return apiUtils.extractData(response);
};

const createFabricStructure = async (
  data: CreateFabricStructureRequestDto
): Promise<FabricStructureResponseDto> => {
  const response = await fabricStructureApi.createFabricStructure(data);
  return apiUtils.extractData(response);
};

const updateFabricStructure = async (
  id: number,
  data: UpdateFabricStructureRequestDto
): Promise<FabricStructureResponseDto> => {
  const response = await fabricStructureApi.updateFabricStructure(id, data);
  return apiUtils.extractData(response);
};

const FabricStructureForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: fabricStructure } = useQuery<FabricStructureResponseDto>({
    queryKey: ['fabricStructure', id],
    queryFn: () => fetchFabricStructure(parseInt(id!)),
    enabled: isEdit,
  });

  const { mutate: createMutation, isPending: isCreating } = useMutation({
    mutationFn: createFabricStructure,
    onSuccess: () => {
      toast.success('Success', 'Fabric structure created successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['fabricStructures'] });
      navigate('/fabric-structures');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFabricStructureRequestDto }) =>
      updateFabricStructure(id, data),
    onSuccess: () => {
      toast.success('Success', 'Fabric structure updated successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['fabricStructures'] });
      queryClient.invalidateQueries({ queryKey: ['fabricStructure', id] });
      navigate('/fabric-structures');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<FabricStructureFormData>({
    resolver: zodResolver(fabricStructureSchema),
    defaultValues: {
      fabricstr: '',
      fabricCode: undefined, // Initialize fabricCode as undefined
      standardeffencny: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit && fabricStructure) {
      form.setValue('fabricstr', fabricStructure.fabricstr);
      form.setValue('fabricCode', fabricStructure.fabricCode || undefined); // Set fabricCode value
      form.setValue('standardeffencny', fabricStructure.standardeffencny);
      form.setValue('isActive', fabricStructure.isActive);
    }
  }, [fabricStructure, form, isEdit]);

  const onSubmit = (data: FabricStructureFormData) => {
    if (isEdit) {
      updateMutation({
        id: parseInt(id!),
        data: {
          ...data,
          fabricCode: data.fabricCode || undefined, // Convert null to undefined for API
          isActive: data.isActive ?? true,
        },
      });
    } else {
      createMutation({
        fabricstr: data.fabricstr,
        fabricCode: data.fabricCode || undefined, // Convert null to undefined for API
        standardeffencny: data.standardeffencny,
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/fabric-structures')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Fabric Structures
        </Button>
        <h1 className="text-3xl font-bold">
          {isEdit ? 'Edit Fabric Structure' : 'Create Fabric Structure'}
        </h1>
        <p className="text-muted-foreground">
          {isEdit
            ? 'Update the fabric structure details'
            : 'Add a new fabric structure with its standard efficiency'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fabric Structure Details</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Modify the fabric structure information below'
              : 'Enter the details for the new fabric structure'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fabricstr">Fabric Structure Name</Label>
              <Input
                id="fabricstr"
                {...form.register('fabricstr')}
                placeholder="Enter fabric structure name"
              />
              {form.formState.errors.fabricstr && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.fabricstr.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fabricCode">Fabric Code (Optional)</Label>
              <Input
                id="fabricCode"
                {...form.register('fabricCode')}
                placeholder="Enter fabric code (optional)"
              />
              {form.formState.errors.fabricCode && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.fabricCode.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="standardeffencny">Standard Efficiency (%)</Label>
              <Input
                id="standardeffencny"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                {...form.register('standardeffencny', { valueAsNumber: true })}
                placeholder="Enter standard efficiency"
              />
              {form.formState.errors.standardeffencny && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.standardeffencny.message}
                </p>
              )}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/fabric-structures')}
              >
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
                    {isEdit ? 'Update Fabric Structure' : 'Create Fabric Structure'}
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

export default FabricStructureForm;
