import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, roleApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save, User as UserIcon, Mail, Phone, Shield } from 'lucide-react';
import type {
  CreateUserRequestDto,
  UpdateUserRequestDto,
  AdminUserResponseDto,
  RoleResponseDto,
} from '@/types/api-types';

const formSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  phoneNumber: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
  isActive: z.boolean().optional(),
  roleName: z.string().min(1, 'Role is required'),
});

type FormData = z.infer<typeof formSchema>;

const fetchUser = async (id: number): Promise<AdminUserResponseDto> => {
  const response = await userApi.getUser(id);
  return apiUtils.extractData(response);
};

const fetchRoles = async (): Promise<RoleResponseDto[]> => {
  const response = await roleApi.getAllRoles();
  return apiUtils.extractData(response);
};

const createUser = async (data: CreateUserRequestDto): Promise<AdminUserResponseDto> => {
  const response = await userApi.createUser(data);
  return apiUtils.extractData(response);
};

const updateUser = async ({
  id,
  data,
}: {
  id: number;
  data: UpdateUserRequestDto;
}): Promise<AdminUserResponseDto> => {
  const response = await userApi.updateUser(id, data);
  return apiUtils.extractData(response);
};

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const { data: user, isLoading: isUserLoading } = useQuery<AdminUserResponseDto>({
    queryKey: ['user', id],
    queryFn: () => fetchUser(parseInt(id!)),
    enabled: isEditMode,
  });

  const { data: roles = [], isLoading: areRolesLoading } = useQuery<RoleResponseDto[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  const {
    mutate: createUserMutation,
    isPending: isCreating,
    isError: isCreateError,
    error: createError,
  } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Success', 'User created successfully');
      navigate('/users');
    },
    onError: (error) => {
      console.error('Create user error:', error);
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const {
    mutate: updateUserMutation,
    isPending: isUpdating,
    isError: isUpdateError,
    error: updateError,
  } = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      toast.success('Success', 'User updated successfully');
      navigate('/users');
    },
    onError: (error) => {
      console.error('Update user error:', error);
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: undefined,
      phoneNumber: '',
      isActive: true,
      roleName: '',
    },
  });

  useEffect(() => {
    if (user && isEditMode) {
      form.setValue('firstName', user.firstName);
      form.setValue('lastName', user.lastName);
      form.setValue('email', user.email);
      form.setValue('phoneNumber', user.phoneNumber || '');
      form.setValue('roleName', user.roleName);
      form.setValue('isActive', user.isActive);
    }
  }, [user, isEditMode]);

  // Add useEffect to set default values for create mode
  useEffect(() => {
    if (!isEditMode) {
      form.setValue('isActive', true);
    }
  }, [isEditMode]);

  const onSubmit = (data: FormData) => {
    console.log('Form data submitted:', data);
    if (isEditMode) {
      // Create clean update data object without password
      const updateData: UpdateUserRequestDto = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        roleName: data.roleName,
        isActive: data.isActive,
      };
      console.log('Update data being sent:', updateData);
      updateUserMutation({ id: parseInt(id!), data: updateData });
    } else {
      // Validate password is provided for creation
      if (!data.password) {
        form.setError('password', { message: 'Password is required for new users' });
        return;
      }
      console.log('Create data being sent:', data);
      createUserMutation(data as CreateUserRequestDto);
    }
  };

  if (isUserLoading || areRolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Update the getErrorMessage function to handle both create and update errors
  const getErrorMessage = () => {
    if (isCreateError) {
      return apiUtils.handleError(createError);
    }
    if (isUpdateError) {
      return apiUtils.handleError(updateError);
    }
    return null;
  };

  const errorMessage = getErrorMessage();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/users')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
        <h1 className="text-3xl font-bold">{isEditMode ? 'Edit User' : 'Create New User'}</h1>
        <p className="text-muted-foreground">
          {isEditMode ? 'Update user information and role' : 'Add a new user to the system'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 bg-destructive/20 text-destructive rounded-md">
          Error: {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            User Information
          </CardTitle>
          <CardDescription>
            {isEditMode ? 'Modify the user details below' : 'Enter the details for the new user'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register('firstName')}
                  placeholder="Enter first name"
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...form.register('lastName')} placeholder="Enter last name" />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="Enter email address"
                  className="pl-10"
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            {!isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register('password')}
                  placeholder="Enter password"
                />
                {!isEditMode && form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phoneNumber"
                  {...form.register('phoneNumber')}
                  placeholder="Enter phone number"
                  className="pl-10"
                />
              </div>
              {form.formState.errors.phoneNumber && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.phoneNumber.message}
                </p>
              )}
            </div>

            {isEditMode && (
              <div className="flex items-center space-x-2">
                <Controller
                  name="isActive"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox
                      id="isActive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isActive">User is active</Label>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Role
              </Label>
              <Controller
                name="roleName"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.roleName}>
                          {role.roleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.roleName && (
                <p className="text-sm text-destructive">{form.formState.errors.roleName.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => navigate('/users')}>
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
                    {isEditMode ? 'Update User' : 'Create User'}
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

export default UserForm;
