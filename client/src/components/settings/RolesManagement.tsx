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
  Puzzle
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

  const roles = apiRoles;
  const permissions = apiPermissions;

  const selectedRole = useMemo(() => {
    if (!selectedRoleId && roles.length > 0) {
      return roles[0];
    }
    return roles.find(r => r.id === selectedRoleId) || roles[0] || null;
  }, [selectedRoleId, roles]);

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
    toast({
      title: "Изменения сохранены",
      description: `Настройки для роли "${selectedRole.name}" обновлены.`,
    });
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
                <div className="space-y-1">
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
                    {selectedRole.description || ""}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold border-border/50 bg-background/50">
                    <Copy className="w-3.5 h-3.5" /> Копировать
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 gap-2 text-xs font-bold shadow-lg shadow-primary/20"
                    disabled={updateRoleMutation.isPending}
                    onClick={handleSave}
                  >
                    {updateRoleMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Сохранить
                  </Button>
                </div>
              </CardHeader>
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
    </div>
  );
}