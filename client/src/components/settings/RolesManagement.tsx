import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Plus,
  Save,
  LayoutDashboard,
  Kanban,
  CheckSquare,
  Calendar,
  MessageSquare,
  Users,
  ShoppingBag,
  Settings,
  Trash2,
  AlertCircle,
  Copy,
  Search,
  MoreVertical,
  Loader2,
  Activity,
  Puzzle,
  Crown,
  KeyRound,
  Mail
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const categoryIcons: Record<string, any> = {
  pages: LayoutDashboard,
  management: Settings,
  projects: Kanban,
  tasks: CheckSquare,
  team: Users,
  chat: MessageSquare,
  calendar: Calendar,
  reports: LayoutDashboard,
  shop: ShoppingBag,
  boards: Kanban,
  roles: Shield,
  departments: Users,
  statuses: Activity,
  integrations: Puzzle,
};

const categoryLabels: Record<string, string> = {
  pages: "Страницы",
  management: "Управление",
  projects: "Проекты",
  tasks: "Задачи",
  team: "Команда",
  chat: "Общение",
  calendar: "Календарь",
  reports: "Отчёты",
  shop: "Магазин",
  boards: "Доски",
  roles: "Роли",
  departments: "Отделы",
  statuses: "Статусы",
  integrations: "Интеграции",
};

interface Role {
  id: string;
  name: string;
  description: string | null;
  color: string;
  permissions: string[];
  isSystem: boolean;
  memberCount?: number;
}

interface Permission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
}

export function RolesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionSearchQuery, setPermissionSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [isEditing, setIsEditing] = useState(false);

  // Owner transfer state
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferStep, setTransferStep] = useState<1 | 2>(1);
  const [masterPassword, setMasterPassword] = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState("");

  const { data: apiRoles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/roles");
      return res.json();
    },
  });

  const { data: apiPermissions = [] } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/permissions");
      return res.json();
    },
  });

  const { data: currentUser } = useQuery<{ id: string; firstName: string | null; lastName: string | null; email: string }>({
    queryKey: ["/api/user"],
  });

  const { data: currentOwner } = useQuery<{ id: string; firstName: string | null; lastName: string | null; email: string; avatar: string | null } | null>({
    queryKey: ["/api/owner"],
  });

  const { data: allUsers = [] } = useQuery<{ id: string; firstName: string | null; lastName: string | null; email: string }[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
  });

  const isCurrentUserOwner = currentUser?.id === currentOwner?.id;

  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/roles", data);
      return res.json();
    },
    onSuccess: (newRole: Role) => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsCreateDialogOpen(false);
      setNewRoleName("");
      setNewRoleDesc("");
      setSelectedRoleId(newRole.id);
      toast({
        title: "Роль создана",
        description: `Роль "${newRole.name}" успешно добавлена.`,
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать роль.",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; permissions?: string[]; color?: string }) => {
      const res = await apiRequest("PUT", `/api/roles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Изменения сохранены",
        description: "Настройки роли обновлены.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения.",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/roles/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      if (selectedRoleId) {
        setSelectedRoleId(apiRoles.find(r => r.id !== selectedRoleId)?.id || null);
      }
      toast({
        title: "Роль удалена",
        description: "Роль была успешно удалена из системы.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить роль.",
        variant: "destructive",
      });
    },
  });

  const verifyOwnerTransferMutation = useMutation({
    mutationFn: async ({ masterPassword, newOwnerUserId }: { masterPassword: string; newOwnerUserId: string }) => {
      const res = await apiRequest("POST", "/api/owner/verify", { masterPassword, newOwnerUserId });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Ошибка верификации");
      }
      return res.json();
    },
    onSuccess: () => {
      setTransferStep(2);
      toast({
        title: "Код отправлен",
        description: "Введите код подтверждения из письма на вашей почте.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить код.",
        variant: "destructive",
      });
    },
  });

  const confirmOwnerTransferMutation = useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const res = await apiRequest("POST", "/api/owner/confirm", { code });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Ошибка подтверждения");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsTransferDialogOpen(false);
      setTransferStep(1);
      setMasterPassword("");
      setTransferCode("");
      setSelectedNewOwnerId("");
      toast({
        title: "Передача завершена",
        description: "Права владельца успешно переданы новому пользователю.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось подтвердить передачу.",
        variant: "destructive",
      });
    },
  });

  const roles = apiRoles;
  const permissions = apiPermissions;

  const selectedRole = useMemo(() => {
    if (!selectedRoleId && roles.length > 0) {
      return roles[0];
    }
    return roles.find(r => r.id === selectedRoleId) || roles[0] || null;
  }, [selectedRoleId, roles]);

  React.useEffect(() => {
    if (selectedRole) {
      setEditName(selectedRole.name);
      setEditDesc(selectedRole.description || "");
      setEditColor(selectedRole.color || "#6366f1");
      setIsEditing(false);
    }
  }, [selectedRole?.id]);

  const togglePermission = (permissionKey: string) => {
    if (!selectedRole) return;

    const hasPermission = selectedRole.permissions?.includes(permissionKey);
    const newPermissions = hasPermission
      ? selectedRole.permissions.filter(p => p !== permissionKey)
      : [...(selectedRole.permissions || []), permissionKey];

    updateRoleMutation.mutate({
      id: selectedRole.id,
      permissions: newPermissions,
    });
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    createRoleMutation.mutate({
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || "",
    });
  };

  const handleDeleteRole = (id: string) => {
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) {
      toast({
        title: "Ошибка",
        description: "Системные роли нельзя удалять.",
        variant: "destructive"
      });
      return;
    }
    deleteRoleMutation.mutate(id);
  };

  const handleSave = () => {
    if (!selectedRole) return;
    // Prevent renaming system roles, but allow editing permissions/description/color
    if (selectedRole.isSystem && editName.trim() !== selectedRole.name) {
      toast({
        title: "Ошибка",
        description: "Нельзя переименовывать системные роли.",
        variant: "destructive"
      });
      return;
    }
    updateRoleMutation.mutate({
      id: selectedRole.id,
      name: editName.trim(),
      description: editDesc.trim(),
      color: editColor,
    });
    setIsEditing(false);
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const permissionsByCategory = useMemo(() => {
    const query = permissionSearchQuery.toLowerCase().trim();
    const filtered = query
      ? permissions.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.key.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
        )
      : permissions;
    const grouped: Record<string, Permission[]> = {};
    filtered.forEach(p => {
      if (!grouped[p.category]) {
        grouped[p.category] = [];
      }
      grouped[p.category].push(p);
    });
    return grouped;
  }, [permissions, permissionSearchQuery]);

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Список ролей ({roles.length})
              </h4>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Создание новой роли</DialogTitle>
                    <DialogDescription>
                      Введите название и описание для новой роли доступа.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Название роли</Label>
                      <Input
                        placeholder="Например: Редактор контента"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Описание</Label>
                      <Input
                        placeholder="Краткое описание обязанностей..."
                        value={newRoleDesc}
                        onChange={(e) => setNewRoleDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Отмена</Button>
                    <Button onClick={handleCreateRole} disabled={!newRoleName.trim() || createRoleMutation.isPending}>
                      {createRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Создать роль
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск ролей..."
                className="pl-9 h-9 bg-muted/20 border-border/50 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {filteredRoles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={cn(
                    "group flex flex-col p-4 rounded-xl cursor-pointer transition-all border relative overflow-hidden",
                    (selectedRoleId === role.id || (!selectedRoleId && role === selectedRole))
                      ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                      : "bg-card/50 border-border/50 hover:border-primary/30 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ backgroundColor: role.color || "#6366f1" }}
                      />
                      <span className="font-bold text-sm tracking-tight">{role.name}</span>
                    </div>
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-muted/50 text-muted-foreground border-none h-4 px-1.5">
                        Система
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mb-3 font-medium">
                    {role.description || ""}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                      {role.memberCount !== undefined ? `${role.memberCount} участников` : ""}
                    </span>
                    {!role.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="bg-amber-500/5 border-amber-500/20 shadow-none">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-900">Важное замечание</p>
                <p className="text-[11px] text-amber-800 leading-relaxed opacity-80">
                  Изменение прав доступа вступит в силу для всех пользователей с данной ролью при их следующем входе в систему.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {selectedRole ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm flex flex-col overflow-hidden border-none ring-1 ring-border/50">
              <CardHeader className="flex flex-row items-start justify-between bg-muted/20 border-b border-border/50 py-6">
                <div className="space-y-2 flex-1">
                  {isEditing ? (
                    <>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                        />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={selectedRole.isSystem}
                          className="h-9 text-lg font-bold bg-background/50 border-border/50 disabled:opacity-60"
                          placeholder="Название роли"
                        />
                      </div>
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="h-8 text-sm bg-background/50 border-border/50"
                        placeholder="Описание роли"
                      />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedRole.color || "#6366f1" }}
                        />
                        <CardTitle className="text-xl font-bold tracking-tight">
                          Права доступа: {selectedRole.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-sm font-medium">
                        {selectedRole.description || "Нет описания"}
                      </CardDescription>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {isEditing ? (
                    <>
                      <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold" onClick={() => setIsEditing(false)}>
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 gap-2 text-xs font-bold shadow-lg shadow-primary/20"
                        disabled={updateRoleMutation.isPending || !editName.trim()}
                        onClick={handleSave}
                      >
                        {updateRoleMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Сохранить
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold border-border/50 bg-background/50" onClick={() => setIsEditing(true)}>
                        Редактировать
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold border-border/50 bg-background/50">
                        <Copy className="w-3.5 h-3.5" /> Копировать
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>

              {/* Owner role info and transfer */}
              {selectedRole.name === "Владелец" && (
                <div className="px-6 py-4 border-b border-border/50 bg-indigo-950/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-950/10 flex items-center justify-center border border-indigo-950/20">
                        <Crown className="w-5 h-5 text-indigo-950 dark:text-indigo-300" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Текущий владелец</p>
                        {currentOwner ? (
                          <p className="text-sm font-semibold">
                            {`${currentOwner.firstName || ""} ${currentOwner.lastName || ""}`.trim() || currentOwner.email}
                            <span className="text-xs text-muted-foreground font-normal ml-2">{currentOwner.email}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Не назначен</p>
                        )}
                      </div>
                    </div>
                    {isCurrentUserOwner && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 gap-2 text-xs font-bold border-indigo-950/30 bg-indigo-950/5 hover:bg-indigo-950/10"
                        onClick={() => {
                          setIsTransferDialogOpen(true);
                          setTransferStep(1);
                          setMasterPassword("");
                          setTransferCode("");
                          setSelectedNewOwnerId("");
                        }}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Передать владельца
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                <div className="px-6 py-3 border-b border-border/50 bg-muted/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Поиск параметров..."
                      className="pl-8 h-8 bg-background/50 border-border/50 text-xs"
                      value={permissionSearchQuery}
                      onChange={(e) => setPermissionSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="divide-y divide-border/50">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="space-y-0">
                      <div className="bg-muted/10 px-6 py-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {categoryLabels[category] || category}
                        </span>
                      </div>
                      {perms.map((permission) => (
                        <div key={permission.key} className="flex items-center justify-between px-6 py-2.5 hover:bg-muted/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-background border border-border/50 flex items-center justify-center shadow-sm">
                              {categoryIcons[category] ? (
                                React.createElement(categoryIcons[category], { className: "w-4 h-4 text-primary/70" })
                              ) : (
                                <Shield className="w-4 h-4 text-primary/70" />
                              )}
                            </div>
                            <div className="space-y-0">
                              <h5 className="text-xs font-bold tracking-tight">{permission.name}</h5>
                              <p className="text-[10px] text-muted-foreground font-medium">{permission.description || permission.key}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {selectedRole.permissions?.includes(permission.key) ? "Разрешено" : "Запрещено"}
                              </span>
                              <Switch
                                checked={selectedRole.permissions?.includes(permission.key) || false}
                                onCheckedChange={() => togglePermission(permission.key)}
                                className="data-[state=checked]:bg-emerald-500 shadow-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/20 border-t border-border/50 p-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4 h-4 opacity-50" />
                  <span className="text-xs font-medium">Безопасность системы</span>
                </div>
                {selectedRole.isSystem && selectedRole.name === "Администратор" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Системный доступ заблокирован</span>
                  </div>
                )}
              </CardFooter>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Выберите роль для редактирования
            </div>
          )}
        </div>
      </div>

      {/* Owner Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsTransferDialogOpen(false);
          setTransferStep(1);
          setMasterPassword("");
          setTransferCode("");
          setSelectedNewOwnerId("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-indigo-600" />
              Передача прав владельца
            </DialogTitle>
            <DialogDescription>
              {transferStep === 1
                ? "Выберите нового владельца и подтвердите мастер-паролем."
                : "Введите код подтверждения, отправленный на ваш email."}
            </DialogDescription>
          </DialogHeader>

          {transferStep === 1 ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Новый владелец</Label>
                <Select value={selectedNewOwnerId} onValueChange={setSelectedNewOwnerId}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Выберите пользователя..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers
                      .filter((u) => u.id !== currentUser?.id)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email} ({u.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Мастер-пароль</Label>
                <Input
                  type="password"
                  placeholder="Введите мастер-пароль..."
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="bg-background/50 border-border/50"
                />
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  После подтверждения вы потеряете статус владельца, но сохраните роль Администратора. Это действие нельзя отменить.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <Mail className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Код отправлен</p>
                  <p className="text-[11px] text-emerald-700">Проверьте почту {currentUser?.email} и введите 6-значный код.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Код подтверждения</Label>
                <Input
                  placeholder="000000"
                  maxLength={6}
                  value={transferCode}
                  onChange={(e) => setTransferCode(e.target.value.replace(/\D/g, ""))}
                  className="bg-background/50 border-border/50 text-center text-lg tracking-[0.5em] font-mono"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsTransferDialogOpen(false);
                setTransferStep(1);
                setMasterPassword("");
                setTransferCode("");
                setSelectedNewOwnerId("");
              }}
            >
              Отмена
            </Button>
            {transferStep === 1 ? (
              <Button
                disabled={!selectedNewOwnerId || !masterPassword || verifyOwnerTransferMutation.isPending}
                onClick={() => verifyOwnerTransferMutation.mutate({ masterPassword, newOwnerUserId: selectedNewOwnerId })}
                className="gap-2 shadow-lg shadow-primary/20"
              >
                {verifyOwnerTransferMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Отправить код
              </Button>
            ) : (
              <Button
                disabled={transferCode.length !== 6 || confirmOwnerTransferMutation.isPending}
                onClick={() => confirmOwnerTransferMutation.mutate({ code: transferCode })}
                className="gap-2 shadow-lg shadow-primary/20"
              >
                {confirmOwnerTransferMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Подтвердить передачу
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}