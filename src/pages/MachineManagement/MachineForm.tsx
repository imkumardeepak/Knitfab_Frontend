import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { machineApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save, Settings } from 'lucide-react';
import type {
  CreateMachineRequestDto,
  UpdateMachineRequestDto,
  MachineResponseDto,
} from '@/types/api-types';

const formSchema = z.object({
  machineName: z
    .string()
    .min(1, 'Machine name is required')
    .max(200, 'Machine name must be less than 200 characters'),
  dia: z.number().positive('Diameter must be greater than 0'),
  gg: z.number().positive('GG must be greater than 0'),
  needle: z.number().positive('Needle count must be greater than 0'),
  feeder: z.number().positive('Feeder count must be greater than 0'),
  rpm: z.number().positive('RPM must be greater than 0'),
  constat: z.number().min(0, 'Constant must be 0 or greater').optional(),
  // Removed efficiency field as requested
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  isActive: z.boolean().optional(),
  machineType: z.enum(['Single Jersey', 'Double Jersey']).optional(), // Added machine type field
});

type FormData = z.infer<typeof formSchema>;

const fetchMachine = async (id: number): Promise<MachineResponseDto> => {
  const response = await machineApi.getMachine(id);
  return apiUtils.extractData(response);
};

const createMachine = async (data: CreateMachineRequestDto): Promise<MachineResponseDto> => {
  const response = await machineApi.createMachine(data);
  return apiUtils.extractData(response);
};

const updateMachine = async ({
  id,
  data,
}: {
  id: number;
  data: UpdateMachineRequestDto;
}): Promise<MachineResponseDto> => {
  const response = await machineApi.updateMachine(id, data);
  return apiUtils.extractData(response);
};

const MachineForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id && !isNaN(Number(id));

  const { data: machine, isLoading: isMachineLoading } = useQuery<MachineResponseDto>({
    queryKey: ['machine', id],
    queryFn: () => fetchMachine(parseInt(id!)),
    enabled: isEditMode && id !== undefined && !isNaN(Number(id)),
  });

  const { mutate: createMachineMutation, isPending: isCreating } = useMutation({
    mutationFn: createMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Success', 'Machine created successfully');
      navigate('/machines');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const { mutate: updateMachineMutation, isPending: isUpdating } = useMutation({
    mutationFn: updateMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machine', id] });
      toast.success('Success', 'Machine updated successfully');
      navigate('/machines');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      machineName: '',
      dia: 0,
      gg: 0,
      needle: 0,
      feeder: 0,
      rpm: 0,
      constat: 0.00085,
      // Removed efficiency field as requested
      description: '',
      isActive: true,
      machineType: 'Single Jersey', // Default to Single Jersey
    },
  });

  // Watch dia, gg, and machineType values to calculate needles automatically
  const diaValue = form.watch('dia');
  const ggValue = form.watch('gg');
  const machineTypeValue = form.watch('machineType');

  // Calculate needles automatically when dia, gg, or machineType changes
  useEffect(() => {
    if (diaValue > 0 && ggValue > 0) {
      const baseNeedles = diaValue * ggValue * 3.142;
      // For Double Jersey, multiply by 2
      const calculatedNeedles = machineTypeValue === 'Double Jersey' 
        ? Math.round(baseNeedles * 2) 
        : Math.round(baseNeedles);
      // Only update if significantly different to avoid infinite loops
      const currentNeedles = form.getValues('needle');
      if (Math.abs(currentNeedles - calculatedNeedles) > 1) {
        form.setValue('needle', calculatedNeedles);
      }
    }
  }, [diaValue, ggValue, machineTypeValue, form]);

  useEffect(() => {
    if (machine && isEditMode) {
      form.setValue('machineName', machine.machineName);
      form.setValue('dia', machine.dia);
      form.setValue('gg', machine.gg);
      form.setValue('needle', machine.needle);
      form.setValue('feeder', machine.feeder);
      form.setValue('rpm', machine.rpm);
      form.setValue('constat', machine.constat);
      // Removed efficiency field as requested
      form.setValue('description', machine.description || '');
      form.setValue('isActive', machine.isActive);
      
      // Auto-detect machine type based on needle count if not explicitly set
      let detectedMachineType = machine.machineType || 'Single Jersey';
      if (!machine.machineType && machine.dia > 0 && machine.gg > 0) {
        const baseNeedles = machine.dia * machine.gg * 3.142;
        // If needle count is approximately double the base calculation, it's likely a Double Jersey
        if (Math.abs(machine.needle - (baseNeedles * 2)) < Math.abs(machine.needle - baseNeedles)) {
          detectedMachineType = 'Double Jersey';
        }
      }
      
      // Set machine type from the loaded machine data or auto-detected value
      form.setValue('machineType', detectedMachineType as 'Single Jersey' | 'Double Jersey');
      
      // Trigger needle recalculation after setting machine type
      setTimeout(() => {
        const baseNeedles = machine.dia * machine.gg * 3.142;
        const calculatedNeedles = (detectedMachineType === 'Double Jersey') 
          ? Math.round(baseNeedles * 2) 
          : Math.round(baseNeedles);
        form.setValue('needle', calculatedNeedles);
      }, 0);
    }
  }, [machine, isEditMode, form]);

  const onSubmit = (data: FormData) => {
    if (isEditMode && id) {
      updateMachineMutation({ id: parseInt(id), data: data as UpdateMachineRequestDto });
    } else {
      createMachineMutation(data as CreateMachineRequestDto);
    }
  };

  // Validate ID parameter after hooks are defined
  if (id && (isNaN(Number(id)) || Number(id) <= 0)) {
    console.error('Invalid machine ID:', id);
    navigate('/machines');
    return null;
  }

  if (isMachineLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/machines')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Machines
        </Button>
        <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Machine' : 'Create New Machine'}</h1>
        <p className="text-muted-foreground">
          {isEditMode
            ? 'Update machine information and specifications'
            : 'Add a new machine to the system'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Machine Information
          </CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Modify the machine details below'
              : 'Enter the details for the new machine'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="machineName">Machine Name</Label>
              <Input
                id="machineName"
                {...form.register('machineName')}
                placeholder="Enter machine name (e.g.,01,02,03...)"
              />
              {form.formState.errors.machineName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.machineName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="machineType">Machine Type</Label>
                <Select
                  value={form.watch('machineType')}
                  onValueChange={(value) => form.setValue('machineType', value as 'Single Jersey' | 'Double Jersey')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Jersey">
                      Single Jersey
                    </SelectItem>
                    <SelectItem value="Double Jersey">
                      Double Jersey
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.machineType && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.machineType.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {form.watch('machineType') === 'Double Jersey' 
                    ? 'Double Jersey machines have double the needle count' 
                    : 'Standard single jersey machine'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dia">Diameter (Inch)</Label>
                <Input
                  id="dia"
                  type="number"
                  step="0.01"
                  {...form.register('dia', { valueAsNumber: true })}
                  placeholder="Enter diameter"
                />
                {form.formState.errors.dia && (
                  <p className="text-sm text-destructive">{form.formState.errors.dia.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gg">GG (Gauge)</Label>
                <Input
                  id="gg"
                  type="number"
                  step="0.01"
                  {...form.register('gg', { valueAsNumber: true })}
                  placeholder="Enter gauge"
                />
                {form.formState.errors.gg && (
                  <p className="text-sm text-destructive">{form.formState.errors.gg.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="needle">Needles (Auto-calculated)</Label>
                <Input
                  id="needle"
                  type="number"
                  {...form.register('needle', { valueAsNumber: true })}
                  placeholder="Enter needle count"
                  readOnly
                />
                {form.formState.errors.needle && (
                  <p className="text-sm text-destructive">{form.formState.errors.needle.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Calculated as: Dia × GG × 3.142{machineTypeValue === 'Double Jersey' ? ' × 2' : ''} = {diaValue} × {ggValue} × 3.142{machineTypeValue === 'Double Jersey' ? ' × 2' : ''} ≈ {diaValue > 0 && ggValue > 0 ? (machineTypeValue === 'Double Jersey' ? Math.round(diaValue * ggValue * 3.142 * 2) : Math.round(diaValue * ggValue * 3.142)) : '0'}
                </p>
                {machineTypeValue === 'Double Jersey' && (
                  <p className="text-xs text-blue-500 font-medium">
                    Double Jersey detected - needle count doubled
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="feeder">Feeders</Label>
                <Input
                  id="feeder"
                  type="number"
                  {...form.register('feeder', { valueAsNumber: true })}
                  placeholder="Enter feeder count"
                />
                {form.formState.errors.feeder && (
                  <p className="text-sm text-destructive">{form.formState.errors.feeder.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rpm">RPM</Label>
                <Input
                  id="rpm"
                  type="number"
                  step="0.01"
                  {...form.register('rpm', { valueAsNumber: true })}
                  placeholder="Enter RPM"
                />
                {form.formState.errors.rpm && (
                  <p className="text-sm text-destructive">{form.formState.errors.rpm.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="constat">Constant (Optional)</Label>
                <Input
                  id="constat"
                  type="number"
                  step="0.00001"
                  {...form.register('constat', { valueAsNumber: true })}
                  placeholder="Enter constant value"
                  disabled
                />
                {form.formState.errors.constat && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.constat.message}
                  </p>
                )}
              </div>

              {/* Removed efficiency field as requested */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Enter machine description and specifications"
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={form.watch('isActive')}
                onCheckedChange={(checked) => form.setValue('isActive', checked)}
              />
              <Label htmlFor="isActive">Active Machine</Label>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" onClick={() => navigate('/machines')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? 'Update Machine' : 'Create Machine'}
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

export default MachineForm;