import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { AVAILABLE_PAGES } from '@/constants/pages'; // Import from constants
import type {
  RoleResponseDto,
  UpdateRoleRequestDto,
  UpdatePageAccessRequestDto,
} from '@/types/api-types';

const fetchRole = async (id: number): Promise<RoleResponseDto> => {
  const response = await roleApi.getRole(id);
  return apiUtils.extractData(response);
};

const updateRole = async ({
  id,
  data,
}: {
  id: number;
  data: UpdateRoleRequestDto;
}): Promise<RoleResponseDto> => {
  // Add detailed logging of the request
  console.log('API Request - updateRole:', { id, data });
  console.log('API Request - updateRole data structure:', JSON.stringify(data, null, 2));

  try {
    const response = await roleApi.updateRole(id, data);
    console.log('API Response - updateRole:', response);
    console.log('API Response - updateRole data:', response.data);
    return apiUtils.extractData(response);
  } catch (error) {
    console.error('API Error - updateRole:', error);
    console.error('API Error - updateRole details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      response: 'response' in error ? (error as any).response?.data : undefined,
      status: 'response' in error ? (error as any).response?.status : undefined,
    });
    throw error;
  }
};

interface PagePermission {
  pageName: string;
  isView: boolean;
  isAdd: boolean;
  isEdit: boolean;
  isDelete: boolean;
}

const RolePermissions = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  if (!id) {
    navigate('/roles');
    return null;
  }

  const roleId = parseInt(id);

  const { data: role, isLoading: isRoleLoading } = useQuery<RoleResponseDto>({
    queryKey: ['role', id],
    queryFn: () => fetchRole(roleId),
    enabled: !!id,
  });

  const {
    mutate: updateRoleMutation,
    isPending: isUpdating,
    isError,
    error,
  } = useMutation({
    mutationFn: updateRole,
    onSuccess: (data) => {
      console.log('Mutation successful:', data);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', id] });
      toast.success('Success', 'Role permissions updated successfully');
      navigate('/roles');
    },
    onError: (error) => {
      console.error('Error updating role permissions:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        response: 'response' in error ? (error as any).response?.data : undefined,
        status: 'response' in error ? (error as any).response?.status : undefined,
      });
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
    },
  });

  const [permissions, setPermissions] = useState<PagePermission[]>([]);

  useEffect(() => {
    if (role) {
      // Log the role data for debugging
      console.log('Role data received:', role);
      console.log('Role page accesses:', role.pageAccesses);

      // Log available pages vs role pages
      console.log('Available pages:', AVAILABLE_PAGES);
      if (role.pageAccesses) {
        const rolePageNames = role.pageAccesses.map((p) => p.pageName);
        console.log('Role page names:', rolePageNames);

        // Check for any pages in role that aren't in available pages
        const extraPages = rolePageNames.filter(
          (pageName) => !AVAILABLE_PAGES.includes(pageName as any)
        );
        if (extraPages.length > 0) {
          console.log('Extra pages found in role:', extraPages);
        }

        // Check for case sensitivity issues
        const caseInsensitiveMatches = rolePageNames.filter((rolePage) =>
          AVAILABLE_PAGES.some(
            (availablePage) =>
              availablePage.toLowerCase() === rolePage.toLowerCase() && availablePage !== rolePage
          )
        );
        if (caseInsensitiveMatches.length > 0) {
          console.log('Case sensitivity issues found:', caseInsensitiveMatches);
        }
      }

      // Initialize permissions from role data
      const rolePermissions = AVAILABLE_PAGES.map((pageName) => {
        const existingPermission = role.pageAccesses?.find((p) => p.pageName === pageName);

        // Specific logging for Add permission during initialization
        console.log(`Initializing ${pageName}: existing isAdd = ${existingPermission?.isAdd}`);

        const permission = {
          pageName,
          isView: existingPermission?.isView || false,
          isAdd: existingPermission?.isAdd !== undefined ? existingPermission.isAdd : false,
          isEdit: existingPermission?.isEdit || false,
          isDelete: existingPermission?.isDelete || false,
        };

        // Specific logging for Add permission after initialization
        console.log(`Initialized ${pageName}: isAdd = ${permission.isAdd}`);

        return permission;
      });
      setPermissions(rolePermissions);

      // Log the initialized permissions
      console.log('Initialized permissions:', rolePermissions);

      // Specific logging for Add permissions after initialization
      console.log('Initialized ADD permissions:');
      rolePermissions.forEach((permission) => {
        console.log(`  ${permission.pageName}: isAdd = ${permission.isAdd}`);
      });
    }
  }, [role]);

  const handlePermissionChange = (
    pageName: string,
    permissionType: keyof PagePermission,
    checked: boolean
  ) => {
    setPermissions((prev) =>
      prev.map((permission) =>
        permission.pageName === pageName ? { ...permission, [permissionType]: checked } : permission
      )
    );

    // Add specific debugging for Add permission
    if (permissionType === 'isAdd') {
      console.log(`ADD Permission changed: ${pageName}.${permissionType} = ${checked}`);
    }

    // Add debugging
    console.log(`Permission changed: ${pageName}.${permissionType} = ${checked}`);
  };

  const handleSelectAll = (pageName: string, checked: boolean) => {
    setPermissions((prev) =>
      prev.map((permission) =>
        permission.pageName === pageName
          ? {
              ...permission,
              isView: checked,
              isAdd: checked,
              isEdit: checked,
              isDelete: checked,
            }
          : permission
      )
    );

    // Add specific debugging for Add permission
    console.log(
      `SELECT ALL changed: ${pageName} = ${checked} (Add permission included: ${checked})`
    );

    // Add debugging
    console.log(`Select all changed: ${pageName} = ${checked}`);
  };

  const onSubmit = () => {
    if (!role) return;

    // Prepare page accesses to send
    const pageAccessesToSend: UpdatePageAccessRequestDto[] = [];

    permissions.forEach((permission) => {
      // Check if any permission is enabled

      // Check if this page had existing permissions in the role

      // Always send page accesses, whether they have permissions or not
      // This ensures that if permissions are removed, they are properly updated in the backend
      const pageAccess: UpdatePageAccessRequestDto = {
        roleId: role.id,
        pageName: permission.pageName,
        isView: permission.isView,
        isAdd: permission.isAdd,
        isEdit: permission.isEdit,
        isDelete: permission.isDelete,
      };

      pageAccessesToSend.push(pageAccess);
    });

    // Remove any duplicate page accesses (just in case)
    const uniquePageAccesses = pageAccessesToSend.filter(
      (pageAccess, index, self) =>
        index === self.findIndex((p) => p.pageName === pageAccess.pageName)
    );

    const updateData: UpdateRoleRequestDto = {
      name: role.roleName,
      description: role.description,
      isActive: role.isActive,
      pageAccesses: uniquePageAccesses.length > 0 ? uniquePageAccesses : undefined,
    };

    // Validate the data structure before sending
    console.log('Validating update data structure:');
    console.log('- Role name:', updateData.name);
    console.log('- Role description:', updateData.description);
    console.log('- Role isActive:', updateData.isActive);
    console.log('- Page accesses count:', updateData.pageAccesses?.length || 0);

    if (updateData.pageAccesses) {
      console.log('Page accesses being sent with ADD permissions:');
      updateData.pageAccesses.forEach((pageAccess, index) => {
        console.log(`  ${index + 1}. ${pageAccess.pageName}: isAdd = ${pageAccess.isAdd}`);
        console.log(`  Page access ${index + 1}:`, {
          roleId: pageAccess.roleId,
          pageName: pageAccess.pageName,
          isView: pageAccess.isView,
          isAdd: pageAccess.isAdd,
          isEdit: pageAccess.isEdit,
          isDelete: pageAccess.isDelete,
        });
      });
    }

    // Add debugging for the actual data being sent
    console.log('FINAL DATA BEING SENT TO API:', JSON.stringify(updateData, null, 2));

    // Add debugging
    console.log('Updating role with data:', updateData);
    console.log('Page accesses being sent (after deduplication):', uniquePageAccesses);

    updateRoleMutation({ id: roleId, data: updateData });
  };

  // Add this function to get error messages
  const getErrorMessage = () => {
    if (isError) {
      return apiUtils.handleError(error);
    }
    return null;
  };

  if (isRoleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500">Role not found</p>
          <Button onClick={() => navigate('/roles')} className="mt-4">
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/roles')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roles
        </Button>
        <h1 className="text-3xl font-bold">Manage Permissions for {role?.roleName}</h1>
        <p className="text-muted-foreground">Configure page access permissions for this role</p>
      </div>

      {/* Add error display */}
      {getErrorMessage() && (
        <div className="mb-4 p-4 bg-destructive/20 text-destructive rounded-md">
          Error: {getErrorMessage()}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Role Permissions
          </CardTitle>
          <CardDescription>Set permissions for each page in the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Page</th>
                  <th className="text-center py-3 px-4">
                    <div className="flex items-center justify-center">
                      <span>Select All</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-4">View</th>
                  <th className="text-center py-3 px-4">Add</th>
                  <th className="text-center py-3 px-4">Edit</th>
                  <th className="text-center py-3 px-4">Delete</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.pageName} className="border-b">
                    <td className="py-3 px-4 font-medium">{permission.pageName}</td>
                    <td className="py-3 px-4 text-center">
                      <Checkbox
                        checked={
                          permission.isView &&
                          permission.isAdd &&
                          permission.isEdit &&
                          permission.isDelete
                        }
                        onCheckedChange={(checked) =>
                          handleSelectAll(permission.pageName, !!checked)
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Checkbox
                        checked={permission.isView}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(permission.pageName, 'isView', !!checked)
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Checkbox
                        checked={permission.isAdd}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(permission.pageName, 'isAdd', !!checked)
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Checkbox
                        checked={permission.isEdit}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(permission.pageName, 'isEdit', !!checked)
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Checkbox
                        checked={permission.isDelete}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(permission.pageName, 'isDelete', !!checked)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="outline" onClick={() => navigate('/roles')}>
              Cancel
            </Button>
            <Button type="button" onClick={onSubmit} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Permissions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePermissions;
