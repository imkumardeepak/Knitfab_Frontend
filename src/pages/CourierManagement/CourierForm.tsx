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
import { courierApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save } from 'lucide-react';
import type {
  CourierResponseDto,
  CreateCourierRequestDto,
  UpdateCourierRequestDto,
} from '@/types/api-types';

const courierSchema = z.object({
  courierName: z
    .string()
    .min(1, 'Courier name is required')
    .max(200, 'Courier name must be less than 200 characters'),
  contactPerson: z.string().max(100, 'Contact person must be less than 100 characters').optional().nullable(),
  phone: z.string().max(15, 'Phone must be less than 15 characters').optional().nullable(),
  email: z.string().email('Invalid email format').max(100, 'Email must be less than 100 characters').optional().nullable(),
  address: z.string().max(500, 'Address must be less than 500 characters').optional().nullable(),
  gstNo: z.string().max(20, 'GST number must be less than 20 characters').optional().nullable(),
  trackingUrl: z.string().max(50, 'Tracking URL must be less than 50 characters').optional().nullable(),
  isActive: z.boolean().optional(),
});

type CourierFormData = z.infer<typeof courierSchema>;

const fetchCourier = async (id: number): Promise<CourierResponseDto> => {
  const response = await courierApi.getCourier(id);
  return apiUtils.extractData(response);
};

const createCourier = async (
  data: CreateCourierRequestDto
): Promise<CourierResponseDto> => {
  const response = await courierApi.createCourier(data);
  return apiUtils.extractData(response);
};

const updateCourier = async (
  id: number,
  data: UpdateCourierRequestDto
): Promise<CourierResponseDto> => {
  const response = await courierApi.updateCourier(id, data);
  return apiUtils.extractData(response);
};

const CourierForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: courier } = useQuery<CourierResponseDto>({
    queryKey: ['courier', id],
    queryFn: () => fetchCourier(parseInt(id!)),
    enabled: isEdit,
  });

  const { mutate: createMutation, isPending: isCreating } = useMutation({
    mutationFn: createCourier,
    onSuccess: () => {
      toast.success('Success', 'Courier created successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      navigate('/couriers');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCourierRequestDto }) =>
      updateCourier(id, data),
    onSuccess: () => {
      toast.success('Success', 'Courier updated successfully');
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      queryClient.invalidateQueries({ queryKey: ['courier', id] });
      navigate('/couriers');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<CourierFormData>({
    resolver: zodResolver(courierSchema),
    defaultValues: {
      courierName: '',
      contactPerson: undefined,
      phone: undefined,
      email: undefined,
      address: undefined,
      gstNo: undefined,
      trackingUrl: undefined,
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit && courier) {
      form.setValue('courierName', courier.courierName);
      form.setValue('contactPerson', courier.contactPerson || undefined);
      form.setValue('phone', courier.phone || undefined);
      form.setValue('email', courier.email || undefined);
      form.setValue('address', courier.address || undefined);
      form.setValue('gstNo', courier.gstNo || undefined);
      form.setValue('trackingUrl', courier.trackingUrl || undefined);
      form.setValue('isActive', courier.isActive);
    }
  }, [courier, form, isEdit]);

  const onSubmit = (data: CourierFormData) => {
    if (isEdit) {
      updateMutation({
        id: parseInt(id!),
        data: {
          ...data,
          contactPerson: data.contactPerson || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          gstNo: data.gstNo || undefined,
          trackingUrl: data.trackingUrl || undefined,
          isActive: data.isActive ?? true,
        },
      });
    } else {
      createMutation({
        courierName: data.courierName,
        contactPerson: data.contactPerson || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        gstNo: data.gstNo || undefined,
        trackingUrl: data.trackingUrl || undefined,
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/couriers')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Couriers
        </Button>
        <h1 className="text-3xl font-bold">
          {isEdit ? 'Edit Courier' : 'Create Courier'}
        </h1>
        <p className="text-muted-foreground">
          {isEdit
            ? 'Update the courier details'
            : 'Add a new courier company'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Courier Details</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Modify the courier information below'
              : 'Enter the details for the new courier company'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="courierName">Courier Name *</Label>
              <Input
                id="courierName"
                {...form.register('courierName')}
                placeholder="Enter courier name"
              />
              {form.formState.errors.courierName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.courierName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="Enter phone number"
                  maxLength={10}
                  onKeyPress={(e) => {
                    // Only allow digits
                    if (!/^\d$/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                      e.preventDefault();
                    }
                  }}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="Enter email address"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
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
                <Label htmlFor="gstNo">GST Number</Label>
                <Input
                  id="gstNo"
                  {...form.register('gstNo')}
                  placeholder="Enter GST number"
                />
                {form.formState.errors.gstNo && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.gstNo.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="trackingUrl">Tracking URL</Label>
                <Input
                  id="trackingUrl"
                  {...form.register('trackingUrl')}
                  placeholder="Enter tracking URL"
                />
                {form.formState.errors.trackingUrl && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.trackingUrl.message}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/couriers')}
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
                    {isEdit ? 'Update Courier' : 'Create Courier'}
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

export default CourierForm;