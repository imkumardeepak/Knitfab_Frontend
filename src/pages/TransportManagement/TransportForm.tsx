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
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transportApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save } from 'lucide-react';
import type {
  TransportResponseDto,
  CreateTransportRequestDto,
  UpdateTransportRequestDto,
} from '@/types/api-types';

const transportSchema = z.object({
  transportName: z
    .string()
    .min(1, 'Transport name is required')
    .max(200, 'Transport name must be less than 200 characters'),
  contactPerson: z.string().max(100, 'Contact person must be less than 100 characters').optional().nullable(),
  address: z.string().max(500, 'Address must be less than 500 characters').optional().nullable(),
  vehicleNumber: z.string().max(50, 'Vehicle number must be less than 50 characters').optional().nullable(),
  driverName: z.string().max(100, 'Driver name must be less than 100 characters').optional().nullable(),
  driverNumber: z.string().max(20, 'Driver number must be less than 20 characters').optional().nullable(),
  licenseNumber: z.string().max(50, 'License number must be less than 50 characters').optional().nullable(),
  maximumCapacityKgs: z
    .number()
    .min(0.01, 'Maximum capacity must be greater than 0')
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
});

type TransportFormData = z.infer<typeof transportSchema>;

const fetchTransport = async (id: number): Promise<TransportResponseDto> => {
  const response = await transportApi.getTransport(id);
  return apiUtils.extractData(response);
};

const createTransport = async (
  data: CreateTransportRequestDto
): Promise<TransportResponseDto> => {
  const response = await transportApi.createTransport(data);
  return apiUtils.extractData(response);
};

const updateTransport = async (
  id: number,
  data: UpdateTransportRequestDto
): Promise<TransportResponseDto> => {
  const response = await transportApi.updateTransport(id, data);
  return apiUtils.extractData(response);
};

const TransportForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: transport } = useQuery<TransportResponseDto>({
    queryKey: ['transport', id],
    queryFn: () => fetchTransport(parseInt(id!)),
    enabled: isEdit,
  });

  const { mutate: createMutation, isPending: isCreating } = useMutation({
    mutationFn: createTransport,
    onSuccess: () => {
      toast.success('Success', 'Transport created successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['transports'] });
      navigate('/transports');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTransportRequestDto }) =>
      updateTransport(id, data),
    onSuccess: () => {
      toast.success('Success', 'Transport updated successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['transports'] });
      queryClient.invalidateQueries({ queryKey: ['transport', id] });
      navigate('/transports');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<TransportFormData>({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      transportName: '',
      contactPerson: undefined,
      address: undefined,
      vehicleNumber: undefined,
      driverName: undefined,
      driverNumber: undefined,
      licenseNumber: undefined,
      maximumCapacityKgs: undefined,
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit && transport) {
      form.setValue('transportName', transport.transportName);
      form.setValue('contactPerson', transport.contactPerson || undefined);
      form.setValue('address', transport.address || undefined);
      form.setValue('vehicleNumber', transport.vehicleNumber || undefined);
      form.setValue('driverName', transport.driverName || undefined);
      form.setValue('driverNumber', transport.driverNumber || undefined);
      form.setValue('licenseNumber', transport.licenseNumber || undefined);
      form.setValue('maximumCapacityKgs', transport.maximumCapacityKgs || undefined);
      form.setValue('isActive', transport.isActive);
    }
  }, [transport, form, isEdit]);

  const onSubmit = (data: TransportFormData) => {
    if (isEdit) {
      updateMutation({
        id: parseInt(id!),
        data: {
          ...data,
          contactPerson: data.contactPerson || undefined,
          address: data.address || undefined,
          vehicleNumber: data.vehicleNumber || undefined,
          driverName: data.driverName || undefined,
          driverNumber: data.driverNumber || undefined,
          licenseNumber: data.licenseNumber || undefined,
          maximumCapacityKgs: data.maximumCapacityKgs || undefined,
          isActive: data.isActive ?? true,
        },
      });
    } else {
      createMutation({
        transportName: data.transportName,
        contactPerson: data.contactPerson || undefined,
        address: data.address || undefined,
        vehicleNumber: data.vehicleNumber || undefined,
        driverName: data.driverName || undefined,
        driverNumber: data.driverNumber || undefined,
        licenseNumber: data.licenseNumber || undefined,
        maximumCapacityKgs: data.maximumCapacityKgs || undefined,
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/transports')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Transports
        </Button>
        <h1 className="text-3xl font-bold">
          {isEdit ? 'Edit Transport' : 'Create Transport'}
        </h1>
        <p className="text-muted-foreground">
          {isEdit
            ? 'Update the transport details'
            : 'Add a new transport company'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transport Details</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Modify the transport information below'
              : 'Enter the details for the new transport company'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="transportName">Transport Name *</Label>
              <Input
                id="transportName"
                {...form.register('transportName')}
                placeholder="Enter transport name"
              />
              {form.formState.errors.transportName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.transportName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                {...form.register('contactPerson')}
                placeholder="Enter contact person name"
              />
              {form.formState.errors.contactPerson && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.contactPerson.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                {...form.register('address')}
                placeholder="Enter address"
                rows={3}
              />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  {...form.register('vehicleNumber')}
                  placeholder="Enter vehicle number"
                />
                {form.formState.errors.vehicleNumber && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.vehicleNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  {...form.register('driverName')}
                  placeholder="Enter driver name"
                />
                {form.formState.errors.driverName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.driverName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverNumber">Driver Number</Label>
                <Input
                  id="driverNumber"
                  {...form.register('driverNumber')}
                  placeholder="Enter driver number"
                  maxLength={10}
                  onKeyPress={(e) => {
                    // Only allow digits
                    if (!/^\d$/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                      e.preventDefault();
                    }
                  }}
                />
                {form.formState.errors.driverNumber && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.driverNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  {...form.register('licenseNumber')}
                  placeholder="Enter license number"
                />
                {form.formState.errors.licenseNumber && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.licenseNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximumCapacityKgs">Maximum Capacity (Kgs)</Label>
              <Input
                id="maximumCapacityKgs"
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('maximumCapacityKgs', { valueAsNumber: true })}
                placeholder="Enter maximum capacity in kilograms"
              />
              {form.formState.errors.maximumCapacityKgs && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.maximumCapacityKgs.message}
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
                onClick={() => navigate('/transports')}
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
                    {isEdit ? 'Update Transport' : 'Create Transport'}
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

export default TransportForm;