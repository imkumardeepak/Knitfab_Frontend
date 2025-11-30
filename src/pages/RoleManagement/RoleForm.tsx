import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import type {
  CreateRoleRequestDto,
  UpdateRoleRequestDto,
  RoleResponseDto,
} from '@/types/api-types';

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  isActive: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

const fetchRole = async (id: number): Promise<RoleResponseDto> => {
  const response = await roleApi.getRole(id);
  return apiUtils.extractData(response);
};

const createRole = async (data: CreateRoleRequestDto): Promise<RoleResponseDto> => {
  const response = await roleApi.createRole(data);
  return apiUtils.extractData(response);
};

const updateRole = async ({
  id,
  data,
}: {
  id: number;
  data: UpdateRoleRequestDto;
}): Promise<RoleResponseDto> => {
  const response = await roleApi.updateRole(id, data);
  return apiUtils.extractData(response);
};

const RoleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const { data: role, isLoading: isRoleLoading } = useQuery<RoleResponseDto>({
    queryKey: ['role', id],
    queryFn: () => fetchRole(parseInt(id!)),
    enabled: isEditMode,
  });

  const { mutate: createRoleMutation, isPending: isCreating } = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Success', 'Role created successfully');
      navigate('/roles');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const { mutate: updateRoleMutation, isPending: isUpdating } = useMutation({
    mutationFn: updateRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', id] });
      toast.success('Success', 'Role updated successfully');
      navigate('/roles');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (role && isEditMode) {
      form.setValue('name', role.roleName);
      form.setValue('description', role.description || '');
      form.setValue('isActive', role.isActive);
    }
  }, [role, isEditMode, form]);

  const onSubmit = (data: FormData) => {
    if (isEditMode) {
      updateRoleMutation({ id: parseInt(id!), data: data as UpdateRoleRequestDto });
    } else {
      createRoleMutation(data as CreateRoleRequestDto);
    }
  };

  if (isRoleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/roles')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roles
        </Button>
        <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Role' : 'Create New Role'}</h1>
        <p className="text-muted-foreground">
          {isEditMode ? 'Update role information and settings' : 'Add a new role to the system'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Role Information
          </CardTitle>
          <CardDescription>
            {isEditMode ? 'Modify the role details below' : 'Enter the details for the new role'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Enter role name (e.g., Admin, Manager, User)"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Enter role description and responsibilities"
                rows={4}
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
              <Label htmlFor="isActive">Active Role</Label>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" onClick={() => navigate('/roles')}>
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
                    {isEditMode ? 'Update Role' : 'Create Role'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isEditMode && role && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Created:</span>
                <span className="ml-2 text-muted-foreground">
                  {new Date(role.createdAt).toLocaleDateString()}
                </span>
              </div>
              {role.updatedAt && (
                <div>
                  <span className="font-medium">Last Updated:</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(role.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium">Permissions:</span>
                <span className="ml-2 text-muted-foreground">
                  {role.pageAccesses?.length || 0} page access rules
                </span>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <span className={`ml-2 ${role.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {role.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RoleForm;
