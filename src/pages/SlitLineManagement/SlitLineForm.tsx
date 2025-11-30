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
import { slitLineApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save } from 'lucide-react';
import type {
  SlitLineResponseDto,
  CreateSlitLineRequestDto,
  UpdateSlitLineRequestDto,
} from '@/types/api-types';

const slitLineSchema = z.object({
  slitLine: z
    .string()
    .min(1, 'Slit line name is required')
    .max(200, 'Slit line name must be less than 200 characters'),
  slitLineCode: z
    .string()
    .length(1, 'Slit line code must be exactly 1 character'),
  isActive: z.boolean().optional(),
});

type SlitLineFormData = z.infer<typeof slitLineSchema>;

const fetchSlitLine = async (id: number): Promise<SlitLineResponseDto> => {
  const response = await slitLineApi.getSlitLine(id);
  return apiUtils.extractData(response);
};

const createSlitLine = async (data: CreateSlitLineRequestDto): Promise<SlitLineResponseDto> => {
  const response = await slitLineApi.createSlitLine(data);
  return apiUtils.extractData(response);
};

const updateSlitLine = async (
  id: number,
  data: UpdateSlitLineRequestDto
): Promise<SlitLineResponseDto> => {
  const response = await slitLineApi.updateSlitLine(id, data);
  return apiUtils.extractData(response);
};

const SlitLineForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: slitLine } = useQuery<SlitLineResponseDto>({
    queryKey: ['slitLine', id],
    queryFn: () => fetchSlitLine(parseInt(id!)),
    enabled: isEdit,
  });

  const { mutate: createMutation, isPending: isCreating } = useMutation({
    mutationFn: createSlitLine,
    onSuccess: () => {
      toast.success('Success', 'Slit line created successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['slitLines'] });
      navigate('/slit-lines');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSlitLineRequestDto }) =>
      updateSlitLine(id, data),
    onSuccess: () => {
      toast.success('Success', 'Slit line updated successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['slitLines'] });
      queryClient.invalidateQueries({ queryKey: ['slitLine', id] });
      navigate('/slit-lines');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<SlitLineFormData>({
    resolver: zodResolver(slitLineSchema),
    defaultValues: {
      slitLine: '',
      slitLineCode: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit && slitLine) {
      form.setValue('slitLine', slitLine.slitLine);
      form.setValue('slitLineCode', slitLine.slitLineCode);
      form.setValue('isActive', slitLine.isActive);
    }
  }, [slitLine, form, isEdit]);

  const onSubmit = (data: SlitLineFormData) => {
    if (isEdit) {
      updateMutation({
        id: parseInt(id!),
        data: {
          slitLine: data.slitLine,
          slitLineCode: data.slitLineCode,
          isActive: data.isActive ?? true,
        } as UpdateSlitLineRequestDto,
      });
    } else {
      createMutation({
        slitLine: data.slitLine,
        slitLineCode: data.slitLineCode,
      } as CreateSlitLineRequestDto);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/slit-lines')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Slit Lines
        </Button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Slit Line' : 'Create Slit Line'}</h1>
        <p className="text-muted-foreground">
          {isEdit ? 'Update the slit line details' : 'Add a new slit line'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Save className="h-5 w-5 mr-2" />
            Slit Line Details
          </CardTitle>
          <CardDescription>
            {isEdit
              ? 'Modify the slit line information below'
              : 'Enter the details for the new slit line'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slitLine">Slit Line Name</Label>
                <Input
                  id="slitLine"
                  {...form.register('slitLine')}
                  placeholder="Enter slit line name"
                />
                {form.formState.errors.slitLine && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.slitLine.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slitLineCode">Slit Line Code</Label>
                <Input
                  id="slitLineCode"
                  {...form.register('slitLineCode')}
                  placeholder="Enter slit line code"
                  maxLength={1}
                />
                {form.formState.errors.slitLineCode && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.slitLineCode.message}
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
              <Button type="button" variant="outline" onClick={() => navigate('/slit-lines')}>
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
                    {isEdit ? 'Update Slit Line' : 'Create Slit Line'}
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

export default SlitLineForm;