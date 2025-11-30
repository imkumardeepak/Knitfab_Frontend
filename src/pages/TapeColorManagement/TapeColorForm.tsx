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
import { tapeColorApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save, Palette } from 'lucide-react';
import type {
  TapeColorResponseDto,
  CreateTapeColorRequestDto,
  UpdateTapeColorRequestDto,
} from '@/types/api-types';

const tapeColorSchema = z.object({
  tapeColor: z
    .string()
    .min(1, 'Tape color name is required')
    .max(200, 'Tape color name must be less than 200 characters'),
  isActive: z.boolean().optional(),
});

type TapeColorFormData = z.infer<typeof tapeColorSchema>;

const fetchTapeColor = async (id: number): Promise<TapeColorResponseDto> => {
  const response = await tapeColorApi.getTapeColor(id);
  return apiUtils.extractData(response);
};

const createTapeColor = async (data: CreateTapeColorRequestDto): Promise<TapeColorResponseDto> => {
  const response = await tapeColorApi.createTapeColor(data);
  return apiUtils.extractData(response);
};

const updateTapeColor = async (
  id: number,
  data: UpdateTapeColorRequestDto
): Promise<TapeColorResponseDto> => {
  const response = await tapeColorApi.updateTapeColor(id, data);
  return apiUtils.extractData(response);
};

const TapeColorForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: tapeColor } = useQuery<TapeColorResponseDto>({
    queryKey: ['tapeColor', id],
    queryFn: () => fetchTapeColor(parseInt(id!)),
    enabled: isEdit,
  });

  const { mutate: createMutation, isPending: isCreating } = useMutation({
    mutationFn: createTapeColor,
    onSuccess: () => {
      toast.success('Success', 'Tape color created successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tapeColors'] });
      navigate('/tape-colors');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTapeColorRequestDto }) =>
      updateTapeColor(id, data),
    onSuccess: () => {
      toast.success('Success', 'Tape color updated successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tapeColors'] });
      queryClient.invalidateQueries({ queryKey: ['tapeColor', id] });
      navigate('/tape-colors');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<TapeColorFormData>({
    resolver: zodResolver(tapeColorSchema),
    defaultValues: {
      tapeColor: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit && tapeColor) {
      form.setValue('tapeColor', tapeColor.tapeColor);
      form.setValue('isActive', tapeColor.isActive);
    }
  }, [tapeColor, form, isEdit]);

  const onSubmit = (data: TapeColorFormData) => {
    if (isEdit) {
      updateMutation({
        id: parseInt(id!),
        data: {
          ...data,
          isActive: data.isActive ?? true,
        } as UpdateTapeColorRequestDto,
      });
    } else {
      createMutation(data as CreateTapeColorRequestDto);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/tape-colors')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tape Colors
        </Button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Tape Color' : 'Create Tape Color'}</h1>
        <p className="text-muted-foreground">
          {isEdit ? 'Update the tape color details' : 'Add a new tape color'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            Tape Color Details
          </CardTitle>
          <CardDescription>
            {isEdit
              ? 'Modify the tape color information below'
              : 'Enter the details for the new tape color'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tapeColor">Tape Color Name</Label>
                <Input
                  id="tapeColor"
                  {...form.register('tapeColor')}
                  placeholder="Enter tape color name"
                />
                {form.formState.errors.tapeColor && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.tapeColor.message}
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
              <Button type="button" variant="outline" onClick={() => navigate('/tape-colors')}>
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
                    {isEdit ? 'Update Tape Color' : 'Create Tape Color'}
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

export default TapeColorForm;