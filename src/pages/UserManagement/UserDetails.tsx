import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { ArrowLeft, Edit, Mail, Phone, Calendar, Clock, Shield, User, Trash2 } from 'lucide-react';
import type { AdminUserResponseDto } from '@/types/api-types';

const fetchUser = async (id: number): Promise<AdminUserResponseDto> => {
  const response = await userApi.getUser(id);
  return apiUtils.extractData(response);
};

const deleteUser = async (id: number): Promise<void> => {
  await userApi.deleteUser(id);
};

const UserDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AdminUserResponseDto>({
    queryKey: ['user', id],
    queryFn: () => fetchUser(parseInt(id!)),
    enabled: !!id,
  });

  const { mutate: deleteUserMutation, isPending: isDeleting } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Success', 'User deleted successfully');
      navigate('/users');
    },
    onError: (error) => {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const [deleteDialog, setDeleteDialog] = useState(false);

  const handleDeleteUser = () => {
    setDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (user) {
      deleteUserMutation(user.id);
    }
    setDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested user could not be found.</p>
          <Button onClick={() => navigate('/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/users')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{`${user.firstName} ${user.lastName}`}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => navigate(`/users/${user.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{`${user.firstName} ${user.lastName}`}</h3>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </div>
                <p className="text-sm">{user.email}</p>
              </div>

              {user.phoneNumber && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone
                  </div>
                  <p className="text-sm">{user.phoneNumber}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium">
                  <Calendar className="h-4 w-4 mr-2" />
                  Created
                </div>
                <p className="text-sm">{formatDate(user.createdAt)}</p>
              </div>

              {user.lastLoginAt && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium">
                    <Clock className="h-4 w-4 mr-2" />
                    Last Login
                  </div>
                  <p className="text-sm">{formatRelativeTime(user.lastLoginAt)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="outline">{user.roleName}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmationDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        itemName={user ? `${user.firstName} ${user.lastName}` : ''}
        itemType="User"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default UserDetails;
