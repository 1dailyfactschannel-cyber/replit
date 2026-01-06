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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  Settings
} from "lucide-react";

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: any;
}

const permissions: Permission[] = [
  { id: "dashboard", name: "Главная", description: "Доступ к дашборду и аналитике", icon: LayoutDashboard },
  { id: "projects", name: "Проекты", description: "Управление досками и проектами", icon: Kanban },
  { id: "tasks", name: "Задачи", description: "Создание и редактирование задач", icon: CheckSquare },
  { id: "calendar", name: "Календарь", description: "Доступ к календарю событий", icon: Calendar },
  { id: "chat", name: "Чат", description: "Общение в командных чатах", icon: MessageSquare },
  { id: "team", name: "Сотрудники", description: "Просмотр и управление командой", icon: Users },
  { id: "shop", name: "Магазин", description: "Доступ к покупке мерча", icon: ShoppingBag },
  { id: "admin", name: "Администрирование", description: "Доступ к системным настройкам", icon: Settings },
];

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[];
}

const initialRoles: Role[] = [
  { id: "1", name: "Администратор", color: "bg-rose-500", permissions: permissions.map(p => p.id) },
  { id: "2", name: "Менеджер", color: "bg-blue-500", permissions: ["dashboard", "projects", "tasks", "calendar", "chat", "team", "shop"] },
  { id: "3", name: "Сотрудник", color: "bg-emerald-500", permissions: ["dashboard", "projects", "tasks", "calendar", "chat", "shop"] },
  { id: "4", name: "Гость", color: "bg-slate-500", permissions: ["dashboard", "chat"] },
];

export function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(initialRoles[0].id);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const togglePermission = (roleId: string, permissionId: string) => {
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Роли и доступ</h2>
          <p className="text-muted-foreground mt-1">Управление правами доступа и системными ролями.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Создать роль
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Roles List */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Системные роли</CardTitle>
              <CardDescription>Выберите роль для настройки прав</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="space-y-1">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
                      selectedRoleId === role.id 
                        ? "bg-primary/10 border-l-4 border-l-primary" 
                        : "hover:bg-secondary/50 border-l-4 border-l-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", role.color)} />
                      <span className="font-medium text-sm">{role.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {role.permissions.length} прав
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Настройка прав: {selectedRole.name}
                </CardTitle>
                <CardDescription>Определите, к каким разделам имеет доступ эта роль</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Save className="w-4 h-4" /> Сохранить
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="w-[300px]">Раздел системы</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Доступ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((permission) => (
                    <TableRow key={permission.id} className="hover:bg-secondary/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                            <permission.icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="font-semibold text-sm">{permission.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {permission.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch 
                          checked={selectedRole.permissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(selectedRole.id, permission.id)}
                          disabled={selectedRole.id === "1"} // Admin lock
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
