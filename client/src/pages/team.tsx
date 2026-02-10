import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MoreVertical, 
  UserMinus, 
  UserCheck, 
  ShieldAlert, 
  History, 
  Coins, 
  UserCog,
  Search,
  Filter,
  Calendar as CalendarIcon,
  Users,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface Employee {
  id: string;
  name: string;
  position: string;
  email: string;
  status: 'active' | 'blocked' | 'on_leave';
  points: number;
  avatar?: string;
  departmentId?: string;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

const mockDepartments: Department[] = [
  { id: "1", name: "Разработка", color: "bg-blue-500" },
  { id: "2", name: "Дизайн", color: "bg-purple-500" },
  { id: "3", name: "Маркетинг", color: "bg-emerald-500" },
  { id: "4", name: "HR", color: "bg-amber-500" },
];

const mockEmployees: Employee[] = [
  { id: "1", name: "Юлия Дарицкая", position: "Product Manager", email: "j.daritskaya@teamsync.ru", status: "active", points: 1250, avatar: "https://github.com/shadcn.png", departmentId: "1" },
  { id: "2", name: "Александр Петров", position: "Senior Frontend Developer", email: "a.petrov@teamsync.ru", status: "active", points: 850, departmentId: "1" },
  { id: "3", name: "Елена Сидорова", position: "UI/UX Designer", email: "e.sidorova@teamsync.ru", status: "on_leave", points: 2100, departmentId: "2" },
  { id: "4", name: "Максим Иванов", position: "Backend Lead", email: "m.ivanov@teamsync.ru", status: "blocked", points: 450, departmentId: "1" },
  { id: "5", name: "Дарья Козлова", position: "Marketing Specialist", email: "d.kozlova@teamsync.ru", status: "active", points: 1100, departmentId: "3" },
];

export default function EmployeesPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') || 'list';
  
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [departments, setDepartments] = useState<Department[]>(mockDepartments);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab') || 'list';
    setActiveTab(tab);
  }, [window.location.search]);

  const handleCreateDepartment = () => {
    if (!newDeptName.trim()) return;
    const colors = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500"];
    const newDept: Department = {
      id: Date.now().toString(),
      name: newDeptName,
      color: colors[departments.length % colors.length]
    };
    setDepartments(prev => [...prev, newDept]);
    setNewDeptName("");
    setIsCreateDeptOpen(false);
  };

  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Активен</Badge>;
      case 'blocked': return <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20">Заблокирован</Badge>;
      case 'on_leave': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">В отпуске</Badge>;
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Команда</h1>
            <p className="text-muted-foreground mt-1">Управление командой и аудит активности.</p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="list">Список</TabsTrigger>
              <TabsTrigger value="departments">Отделы</TabsTrigger>
              <TabsTrigger value="analytics">Аналитика</TabsTrigger>
              <TabsTrigger value="roles">Роли</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === "list" ? (
          <>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Поиск сотрудника..." className="pl-9 bg-secondary/30 border-border/50" />
              </div>
              <Button variant="outline" className="gap-2 border-border/50">
                <Filter className="w-4 h-4" />
                Фильтры
              </Button>
              <Button className="gap-2">
                <UserCog className="w-4 h-4" />
                Добавить сотрудника
              </Button>
            </div>

            <div className="border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="w-[300px]">Сотрудник</TableHead>
                    <TableHead>Отдел</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Баллы</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow 
                      key={employee.id} 
                      className="cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={employee.avatar} />
                            <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{employee.name}</span>
                            <span className="text-xs text-muted-foreground">{employee.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.departmentId ? (
                          <Badge variant="outline" className={cn("text-[10px] font-bold", departments.find(d => d.id === employee.departmentId)?.color.replace('bg-', 'text-'))}>
                            {departments.find(d => d.id === employee.departmentId)?.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{employee.position}</TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Coins className="w-4 h-4 text-amber-500" />
                          {employee.points}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2">
                              <UserCog className="w-4 h-4" /> Редактировать
                            </DropdownMenuItem>
                            {employee.status === 'blocked' ? (
                              <DropdownMenuItem className="gap-2 text-emerald-500">
                                <UserCheck className="w-4 h-4" /> Разблокировать
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="gap-2 text-rose-500">
                                <UserMinus className="w-4 h-4" /> Заблокировать
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : activeTab === "departments" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Поиск отделов..." className="pl-9 bg-secondary/30 border-border/50" />
              </div>
              <Dialog open={isCreateDeptOpen} onOpenChange={setIsCreateDeptOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Создать отдел
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Создать новый отдел</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name">Название отдела</Label>
                      <Input 
                        id="dept-name" 
                        placeholder="Напр: Разработка" 
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateDepartment()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDeptOpen(false)}>Отмена</Button>
                    <Button onClick={handleCreateDepartment} disabled={!newDeptName.trim()}>Создать</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept) => (
                <div key={dept.id} className="group p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("p-3 rounded-xl bg-opacity-10", dept.color.replace('bg-', 'bg-opacity-10 text-'))}>
                      <Users className="w-6 h-6" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Pencil className="w-3 h-3" /> Переименовать
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-rose-500">
                          <Trash2 className="w-3 h-3" /> Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{dept.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {employees.filter(e => e.departmentId === dept.id).length} сотрудников
                  </p>
                  <div className="flex -space-x-2 overflow-hidden">
                    {employees.filter(e => e.departmentId === dept.id).slice(0, 5).map((e) => (
                      <Avatar key={e.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-background">
                        <AvatarImage src={e.avatar} />
                        <AvatarFallback>{e.name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                    {employees.filter(e => e.departmentId === dept.id).length > 5 && (
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-[10px] font-bold ring-2 ring-background">
                        +{employees.filter(e => e.departmentId === dept.id).length - 5}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "analytics" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Поиск по дате или сотруднику..." className="pl-9 bg-secondary/30 border-border/50" />
              </div>
              <Button variant="outline" className="gap-2 border-border/50">
                <CalendarIcon className="w-4 h-4" />
                Январь 2026
              </Button>
            </div>

            <div className="border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="w-[250px]">Сотрудник</TableHead>
                    <TableHead>Время прихода</TableHead>
                    <TableHead>Начало рабочего дня</TableHead>
                    <TableHead>Окончание раб. дня</TableHead>
                    <TableHead>Время ухода</TableHead>
                    <TableHead className="text-right">Итого отработано</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "Юлия Дарицкая", in: "08:45", start: "09:02", end: "18:05", out: "18:15", total: "9ч 03м" },
                    { name: "Александр Петров", in: "09:15", start: "09:20", end: "18:30", out: "18:40", total: "9ч 10м" },
                    { name: "Елена Сидорова", in: "08:55", start: "09:00", end: "17:55", out: "18:02", total: "8ч 55м" },
                    { name: "Дарья Козлова", in: "09:30", start: "09:35", end: "19:00", out: "19:10", total: "9ч 25м" },
                  ].map((row, i) => (
                    <TableRow key={i} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback>{row.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-emerald-500">{row.in}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.start}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.end}</TableCell>
                      <TableCell className="text-sm font-medium text-rose-500">{row.out}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl border-border/50">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
            <p>Этот раздел находится в разработке</p>
          </div>
        )}

        {/* Employee Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden border-border/50">
            <DialogHeader className="p-6 bg-secondary/10 border-b border-border/50">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                  <AvatarImage src={selectedEmployee?.avatar} />
                  <AvatarFallback>{selectedEmployee?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl">{selectedEmployee?.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{selectedEmployee?.position}</p>
                </div>
              </div>
            </DialogHeader>
            <Tabs defaultValue="edit" className="w-full">
              <div className="px-6 bg-secondary/5 border-b border-border/50">
                <TabsList className="bg-transparent h-12 w-full justify-start gap-6 rounded-none p-0">
                  <TabsTrigger value="edit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12">Данные</TabsTrigger>
                  <TabsTrigger value="audit_status" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12">Аудит статусов</TabsTrigger>
                  <TabsTrigger value="audit_points" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12">Аудит баллов</TabsTrigger>
                </TabsList>
              </div>
              <div className="p-6">
                <TabsContent value="edit" className="mt-0 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Имя Фамилия</Label>
                      <Input defaultValue={selectedEmployee?.name} className="bg-secondary/30" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Должность</Label>
                      <Input defaultValue={selectedEmployee?.position} className="bg-secondary/30" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Текущий статус</Label>
                      <Badge className="w-fit block" variant={selectedEmployee?.status === 'blocked' ? 'destructive' : 'default'}>
                        {selectedEmployee?.status === 'active' ? 'Активен' : selectedEmployee?.status === 'blocked' ? 'Заблокирован' : 'В отпуске'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Баллы</Label>
                      <div className="flex gap-2">
                        <Input type="number" defaultValue={selectedEmployee?.points} className="bg-secondary/30" />
                        <Button variant="outline" size="icon" className="shrink-0"><Coins className="w-4 h-4 text-amber-500" /></Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                    <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Отмена</Button>
                    <Button>Сохранить изменения</Button>
                  </div>
                </TabsContent>

                <TabsContent value="audit_status" className="mt-0 space-y-4">
                  <div className="space-y-4">
                    {[
                      { date: "03.01.2026 14:20", old: "В отпуске", new: "Активен", actor: "HR-отдел" },
                      { date: "20.12.2025 09:00", old: "Активен", new: "В отпуске", actor: "Система" },
                      { date: "15.11.2025 11:30", old: "Заблокирован", new: "Активен", actor: "Администратор" }
                    ].map((entry, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-secondary/20 border border-border/30">
                        <div className="mt-1"><History className="w-4 h-4 text-muted-foreground" /></div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{entry.date}</span>
                            <span className="text-xs text-muted-foreground">{entry.actor}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Статус изменен с <span className="text-foreground font-medium">"{entry.old}"</span> на <span className="text-foreground font-medium">"{entry.new}"</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="audit_points" className="mt-0 space-y-4">
                  <div className="space-y-4">
                    {[
                      { date: "02.01.2026 18:45", change: "+150", reason: "Завершение проекта 'Phoenix'", actor: "PM" },
                      { date: "28.12.2025 12:00", change: "+50", reason: "Помощь коллеге", actor: "Юлия Дарицкая" },
                      { date: "15.12.2025 10:00", change: "-200", reason: "Покупка мерча в магазине", actor: "Магазин" }
                    ].map((entry, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-secondary/20 border border-border/30">
                        <div className="mt-1"><Coins className="w-4 h-4 text-amber-500" /></div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{entry.date}</span>
                            <span className={cn("text-sm font-bold", entry.change.startsWith('+') ? "text-emerald-500" : "text-rose-500")}>
                              {entry.change}
                            </span>
                          </div>
                          <p className="text-xs font-medium">{entry.reason}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Изменил: {entry.actor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
