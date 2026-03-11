import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserPermissions {
  rolePermissions: string[];
  hiddenObjects: { type: string; id: string }[];
}

export function usePermission() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch('/api/user', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    }
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery<UserPermissions>({
    queryKey: ["/api/users/me/permissions"],
    queryFn: async () => {
      const res = await fetch('/api/users/me/permissions', { credentials: 'include' });
      if (!res.ok) return { rolePermissions: [], hiddenObjects: [] };
      return res.json();
    },
    enabled: !!user
  });

  const hasPermission = (permission: string, objectId?: string): boolean => {
    if (!permissions) return false;
    
    // Check if user has the system permission
    if (!permissions.rolePermissions.includes(permission)) {
      return false;
    }
    
    // Check if object is hidden for user
    if (objectId) {
      const isHidden = permissions.hiddenObjects.some(
        h => h.id === objectId
      );
      if (isHidden) return false;
    }
    
    return true;
  };

  const canAccess = (page: string): boolean => {
    return hasPermission(`${page}:view`);
  };

  const canCreate = (resource: string): boolean => {
    return hasPermission(`${resource}:create`);
  };

  const canEdit = (resource: string, objectId?: string): boolean => {
    return hasPermission(`${resource}:edit`, objectId);
  };

  const canDelete = (resource: string, objectId?: string): boolean => {
    return hasPermission(`${resource}:delete`, objectId);
  };

  const canManage = (section: string): boolean => {
    return hasPermission(`management:${section}`) || hasPermission('management:view');
  };

  return {
    hasPermission,
    canAccess,
    canCreate,
    canEdit,
    canDelete,
    canManage,
    permissions: permissions?.rolePermissions || [],
    hiddenObjects: permissions?.hiddenObjects || [],
    isLoading: permissionsLoading,
    isAuthenticated: !!user
  };
}

export function useHiddenObjects() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch('/api/user', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    }
  });

  const { data: hiddenObjects = [], isLoading } = useQuery<{ objectId: string; objectType: string }[]>({
    queryKey: ["/api/users", user?.id, "hidden"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/hidden`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id
  });

  const hideMutation = useMutation({
    mutationFn: async ({ userId, objectType, objectId }: { userId: string; objectType: string; objectId: string }) => {
      const res = await apiRequest('POST', '/api/hidden', { userId, objectType, objectId });
      return res.json();
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "hidden"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users/me/permissions"] });
      }
    }
  });

  const unhideMutation = useMutation({
    mutationFn: async ({ userId, objectType, objectId }: { userId: string; objectType: string; objectId: string }) => {
      await apiRequest('DELETE', '/api/hidden', { userId, objectType, objectId });
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "hidden"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users/me/permissions"] });
      }
    }
  });

  const isHidden = (objectId: string): boolean => {
    return hiddenObjects.some(h => h.objectId === objectId);
  };

  const hide = (objectType: string, objectId: string) => {
    if (user?.id) {
      hideMutation.mutate({ userId: user.id, objectType, objectId });
    }
  };

  const unhide = (objectType: string, objectId: string) => {
    if (user?.id) {
      unhideMutation.mutate({ userId: user.id, objectType, objectId });
    }
  };

  return {
    hiddenObjects,
    isLoading,
    isHidden,
    hide,
    unhide,
    hideMutation,
    unhideMutation
  };
}
