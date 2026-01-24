import { useState } from "react";
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
  MoreVertical
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

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: "base" | "admin" | "social";
}

const permissions: Permission[] = [
  { id: "dashboard", name: "Главная", description: "Доступ к дашборду и аналитике", icon: LayoutDashboard, category: "base" },
  { id: "projects", name: "Проекты", description: "Управление досками и проектами", icon: Kanban, category: "base" },
  { id: "tasks", name: "Задачи", description: "Создание и редактирование задач", icon: CheckSquare, category: "base" },
  { id: "calendar", name: "Календарь", description: "Доступ к календарю событий", icon: Calendar, category: "base" },
  { id: "chat", name: "Чат", description: "Общение в командных чатах", icon: MessageSquare, category: "social" },
  { id: "team", name: "Сотрудники", description: "Просмотр и управление командой", icon: Users, category: "admin" },
  { id: "shop", name: "Магазин", description: "Доступ к покупке мерча", icon: ShoppingBag, category: "social" },
  { id: "admin", name: "Администрирование", description: "Доступ к системным настройкам", icon: Settings, category: "admin" },
];

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  isSystem?: boolean;
  memberCount: number;
}

const initialRoles: Role[] = [
  { 
    id: "1", 
    name: "Администратор", 
    description: "Полный доступ ко всем функциям системы",
    color: "bg-rose-500", 
    permissions: permissions.map(p => p.id),
    isSystem: true,
    memberCount: 2
  },
  { 
    id: "2", 
    name: "Менеджер", 
    description: "Управление проектами и командой",
    color: "bg-blue-500", 
    permissions: ["dashboard", "projects", "tasks", "calendar", "chat", "team", "shop"],
    isSystem: true,
    memberCount: 5
  },
  { 
    id: "3", 
    name: "Сотрудник", 
    description: "Базовый доступ к рабочим инструментам",
    color: "bg-emerald-500", 
    permissions: ["dashboard", "projects", "tasks", "calendar", "chat", "shop"],
    isSystem: true,
    memberCount: 24
  },
  { 
    id: "4", 
    name: "Гость", 
    description: "Только просмотр и общение",
    color: "bg-slate-500", 
    permissions: ["dashboard", "chat"],
    isSystem: true,
    memberCount: 3
  },
];

export function RolesManagement() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(initialRoles[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const togglePermission = (roleId: string, permissionId: string) => {
    if (selectedRole.isSystem && selectedRole.id === "1") return; // Admin lock
    
    setRoles(prevRoles => prevRoles.map(role => {
      if (role.id === roleId) {
        const hasPermission = role.permissions.includes(permissionId);
        return {
          ...role,
          permissions: hasPermission 
            ? role.permissions.filter(p => p !== permissionId)
            : [...role.permissions, permissionId]
        };
      }
      return role;
    }));
  };

  const handleCreateRole = () => {
    if (!newRoleName) return;
    
    const newRole: Role = {
      id: Math.random().toString(36).substr(2, 9),
      name: newRoleName,
      description: newRoleDesc,
      color: "bg-primary",
      permissions: ["dashboard"],
      memberCount: 0
    };
    
    setRoles([...roles, newRole]);
    setNewRoleName("");
    setNewRoleDesc("");
    setIsCreateDialogOpen(false);
    setSelectedRoleId(newRole.id);
    
    toast({
      title: "Роль создана",
      description: `Роль "${newRoleName}" успешно добавлена.`
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
    
    setRoles(roles.filter(r => r.id !== id));
    if (selectedRoleId === id) {
      setSelectedRoleId(roles[0].id);
    }
    
    toast({
      title: "Роль удалена",
      description: "Роль была успешно удалена из системы."
    });
  };

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Roles List */}
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
                    <Button onClick={handleCreateRole}>Создать роль</Button>
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
                    selectedRoleId === role.id 
                      ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" 
                      : "bg-card/50 border-border/50 hover:border-primary/30 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", role.color)} />
                      <span className="font-bold text-sm tracking-tight">{role.name}</span>
                    </div>
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-muted/50 text-muted-foreground border-none h-4 px-1.5">
                        Система
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mb-3 font-medium">
                    {role.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                      {role.memberCount} участников
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

        {/* Permissions Matrix */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm flex flex-col overflow-hidden border-none ring-1 ring-border/50">
            <CardHeader className="flex flex-row items-start justify-between bg-muted/20 border-b border-border/50 py-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", selectedRole.color)} />
                  <CardTitle className="text-xl font-bold tracking-tight">
                    Права доступа: {selectedRole.name}
                  </CardTitle>
                </div>
                <CardDescription className="text-sm font-medium">
                  {selectedRole.description}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold border-border/50 bg-background/50">
                  <Copy className="w-3.5 h-3.5" /> Копировать
                </Button>
                <Button 
                  size="sm" 
                  className="h-9 gap-2 text-xs font-bold shadow-lg shadow-primary/20"
                  disabled={selectedRole.isSystem && selectedRole.id === "1"}
                  onClick={() => {
                    toast({
                      title: "Изменения сохранены",
                      description: `Настройки для роли "${selectedRole.name}" обновлены.`
                    });
                  }}
                >
                  <Save className="w-3.5 h-3.5" /> Сохранить
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {["base", "social", "admin"].map((category) => (
                  <div key={category} className="space-y-0">
                    <div className="bg-muted/10 px-6 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        {category === "base" ? "Базовые функции" : category === "social" ? "Коммуникации" : "Администрирование"}
                      </span>
                    </div>
                    {permissions
                      .filter(p => p.category === category)
                      .map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center shadow-sm">
                              <permission.icon className="w-5 h-5 text-primary/70" />
                            </div>
                            <div className="space-y-0.5">
                              <h5 className="text-sm font-bold tracking-tight">{permission.name}</h5>
                              <p className="text-xs text-muted-foreground font-medium">{permission.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {selectedRole.permissions.includes(permission.id) ? "Разрешено" : "Запрещено"}
                              </span>
                              <Switch 
                                checked={selectedRole.permissions.includes(permission.id)}
                                onCheckedChange={() => togglePermission(selectedRole.id, permission.id)}
                                disabled={selectedRole.isSystem && selectedRole.id === "1"}
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
              {selectedRole.isSystem && selectedRole.id === "1" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Системный доступ заблокирован</span>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}