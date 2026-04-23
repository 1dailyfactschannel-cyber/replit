import { useQuery, useQueryClient } from "@tanstack/react-query";

interface UserPermissions {
  permissions: string[];
  roles: { id: string; name: string; color: string; isSystem: boolean }[];
}

export function usePermission() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch('/api/user', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return null;
      return res.json();
    }
  });

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery<UserPermissions>({
    queryKey: ["/api/users/me/permissions"],
    queryFn: async () => {
      const res = await fetch('/api/users/me/permissions', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch permissions: ${res.status}`);
      return res.json();
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
  });

  const userRoles = permissionsData?.roles || [];
  const isAdmin = userRoles.some(r => r.name === "Администратор") || (user as any)?.role === 'admin';

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Admin always has all permissions (check even before permissionsData loads)
    if (isAdmin) return true;
    if (!permissionsData) return false;
    return permissionsData.permissions.includes(permission);
  };

  const canAccess = (page: string): boolean => {
    return hasPermission(`${page}:view`);
  };

  const canCreate = (resource: string): boolean => {
    return hasPermission(`${resource}:create`);
  };

  const canEdit = (resource: string): boolean => {
    return hasPermission(`${resource}:edit`);
  };

  const canDelete = (resource: string): boolean => {
    return hasPermission(`${resource}:delete`);
  };

  const canManage = (section: string): boolean => {
    return hasPermission(`management:${section}`);
  };

  return {
    hasPermission,
    canAccess,
    canCreate,
    canEdit,
    canDelete,
    canManage,
    permissions: permissionsData?.permissions || [],
    roles: userRoles,
    isAdmin,
    isLoading: permissionsLoading || userLoading,
    isAuthenticated: !!user
  };
}
