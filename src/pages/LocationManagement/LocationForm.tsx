import { useEffect, useRef } from 'react';
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
import { locationApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save, MapPin } from 'lucide-react';
import type {
  LocationResponseDto,
  CreateLocationRequestDto,
  UpdateLocationRequestDto,
} from '@/types/api-types';

const locationSchema = z.object({
  warehousename: z
    .string()
    .min(1, 'Warehouse name is required')
    .max(200, 'Warehouse name must be less than 200 characters'),
  location: z
    .string()
    .min(1, 'Location is required')
    .max(200, 'Location must be less than 200 characters'),
  sublocation: z
    .string()
    .max(200, 'Sublocation must be less than 200 characters')
    .optional()
    .nullable(),
  locationcode: z
    .string()
    .min(1, 'Location code is required')
    .max(50, 'Location code must be less than 50 characters'),
  isActive: z.boolean().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

const fetchLocation = async (id: number): Promise<LocationResponseDto> => {
  const response = await locationApi.getLocation(id);
  return apiUtils.extractData(response);
};

const createLocation = async (data: CreateLocationRequestDto): Promise<LocationResponseDto> => {
  const response = await locationApi.createLocation(data);
  return apiUtils.extractData(response);
};

const updateLocation = async (
  id: number,
  data: UpdateLocationRequestDto
): Promise<LocationResponseDto> => {
  const response = await locationApi.updateLocation(id, data);
  return apiUtils.extractData(response);
};

const LocationForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const skipAutoGeneration = useRef(false);

  const { data: location } = useQuery<LocationResponseDto>({
    queryKey: ['location', id],
    queryFn: () => fetchLocation(parseInt(id!)),
    enabled: isEdit,
  });

  const { mutate: createMutation, isPending: isCreating } = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      toast.success('Success', 'Location created successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      navigate('/locations');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLocationRequestDto }) =>
      updateLocation(id, data),
    onSuccess: () => {
      toast.success('Success', 'Location updated successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location', id] });
      navigate('/locations');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      warehousename: '',
      location: '',
      sublocation: '',
      locationcode: '',
      isActive: true,
    },
  });

  // Auto-generate location code when warehouse, location, or sublocation changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Only generate code when one of the dependent fields changes
      if (
        name &&
        ['warehousename', 'location', 'sublocation'].includes(name) &&
        !skipAutoGeneration.current
      ) {
        const { warehousename, location, sublocation } = value;
        const codeParts = [warehousename || '', location || '', sublocation || ''].filter(
          (part) => part !== ''
        );

        const generatedCode = codeParts.join('-').substring(0, 50);

        // Prevent infinite loop by setting skip flag
        skipAutoGeneration.current = true;
        if (generatedCode) {
          form.setValue('locationcode', generatedCode, { shouldValidate: false });
        } else {
          form.setValue('locationcode', '', { shouldValidate: false });
        }

        // Reset the flag after a short delay to allow next change
        setTimeout(() => {
          skipAutoGeneration.current = false;
        }, 0);
      }
    });
    return () => {
      subscription.unsubscribe();
      skipAutoGeneration.current = false;
    };
  }, [form]);

  useEffect(() => {
    if (isEdit && location) {
      form.setValue('warehousename', location.warehousename);
      form.setValue('location', location.location);
      form.setValue('sublocation', location.sublocation || '');
      form.setValue('locationcode', location.locationcode);
      form.setValue('isActive', location.isActive);
    }
  }, [location, form, isEdit]);

  const onSubmit = (data: LocationFormData) => {
    // Clean up sublocation if it's an empty string
    const cleanedData = {
      ...data,
      sublocation: data.sublocation || undefined,
    };

    if (isEdit) {
      updateMutation({
        id: parseInt(id!),
        data: {
          ...cleanedData,
          isActive: cleanedData.isActive ?? true,
        } as UpdateLocationRequestDto,
      });
    } else {
      createMutation(cleanedData as CreateLocationRequestDto);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/locations')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Locations
        </Button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Location' : 'Create Location'}</h1>
        <p className="text-muted-foreground">
          {isEdit ? 'Update the location details' : 'Add a new location with warehouse information'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Location Details
          </CardTitle>
          <CardDescription>
            {isEdit
              ? 'Modify the location information below'
              : 'Enter the details for the new location'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehousename">Warehouse Name</Label>
                <Input
                  id="warehousename"
                  {...form.register('warehousename')}
                  placeholder="Enter warehouse name"
                />
                {form.formState.errors.warehousename && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.warehousename.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationcode">Location Code</Label>
                <Input
                  id="locationcode"
                  {...form.register('locationcode')}
                  placeholder="Auto-generated from warehouse, location, and sublocation"
                  readOnly
                />
                {form.formState.errors.locationcode && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.locationcode.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...form.register('location')} placeholder="Enter location" />
                {form.formState.errors.location && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.location.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sublocation">Sublocation (Optional)</Label>
                <Input
                  id="sublocation"
                  {...form.register('sublocation')}
                  placeholder="Enter sublocation (optional)"
                />
                {form.formState.errors.sublocation && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.sublocation.message}
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
              <Button type="button" variant="outline" onClick={() => navigate('/locations')}>
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
                    {isEdit ? 'Update Location' : 'Create Location'}
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

export default LocationForm;
