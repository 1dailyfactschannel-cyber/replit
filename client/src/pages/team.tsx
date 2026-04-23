import { Layout } from "@/components/layout/Layout";
import { useState, useEffect, useMemo, useDeferredValue, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Trash2,
  Monitor,
  Loader2,
  Send as SendIcon,
  ChevronDown,
  Key,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  position: string | null;
  avatar: string | null;
  department: string | null;
  isActive: boolean;
  isOnline: boolean;
  lastSeen: string | null;
  telegram: string | null;
  telegramConnected: boolean;
  pointsBalance: number;
  phone: string | null;
  notes: string | null;
  status?: string;
  statusColor?: string | null;
  statusComment?: string;
  isRemote?: boolean;
  workStartTime?: string | null;
  workEndTime?: string | null;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isSystem: boolean;
}

const mockDepartments: Department[] = [
  { id: "1", name: "Разработка", color: "bg-blue-500" },
  { id: "2", name: "Дизайн", color: "bg-purple-500" },
  { id: "3", name: "Маркетинг", color: "bg-emerald-500" },
  { id: "4", name: "HR", color: "bg-amber-500" },
];

const mockEmployees: Employee[] = [
  { id: "2", firstName: "Александр", lastName: "Петров", email: "a.petrov@teamsync.ru", position: "Senior Frontend Developer", isActive: true, isOnline: true, lastSeen: new Date().toISOString(), telegram: "alex_petrov", telegramConnected: true, pointsBalance: 850, avatar: null, department: "1", status: "online", phone: null, notes: null },
  { id: "3", firstName: "Елена", lastName: "Сидорова", email: "e.sidorova@teamsync.ru", position: "UI/UX Designer", isActive: true, isOnline: false, lastSeen: new Date(Date.now() - 3600000).toISOString(), telegram: null, telegramConnected: false, pointsBalance: 2100, avatar: null, department: "2", status: "offline", phone: null, notes: null },
  { id: "4", firstName: "Максим", lastName: "Иванов", email: "m.ivanov@teamsync.ru", position: "Backend Lead", isActive: false, isOnline: false, lastSeen: new Date(Date.now() - 86400000).toISOString(), telegram: "max_ivanov", telegramConnected: true, pointsBalance: 450, avatar: null, department: "1", status: "offline", phone: null, notes: null },
  { id: "5", firstName: "Дарья", lastName: "Козлова", email: "d.kozlova@teamsync.ru", position: "Marketing Specialist", isActive: true, isOnline: true, lastSeen: new Date().toISOString(), telegram: "darya_k", telegramConnected: true, pointsBalance: 1100, avatar: null, department: "3", status: "busy", phone: null, notes: null },
];

export default function EmployeesPage() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') || 'list';
  
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  
  const [filters, setFilters] = useState({
    status: "all",
    department: "all",
    position: "all"
  });
  
  const { data: apiEmployees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
  });

  const { data: customStatuses = [] } = useQuery<{id: string; name: string; color: string; isDefault: boolean}[]>({
    queryKey: ["/api/custom-statuses"],
  });

  const { data: apiDepartments = [] } = useQuery<{id: string; name: string; description: string | null; color: string}[]>({
    queryKey: ["/api/departments"],
  });

  const { data: apiRoles = [] } = useQuery<{id: string; name: string; description: string | null; color: string; permissions: string[]}[]>({
    queryKey: ["/api/roles"],
  });

  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [departments, setDepartments] = useState<Department[]>(mockDepartments);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);
  const [isCreateEmployeeOpen, setIsCreateEmployeeOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);

  // New employee form state
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    telegram: "",
    password: "",
    roleIds: [] as string[]
  });

  // Generate random password
  const generatePassword = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    
    let password = "";
    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    const allChars = lowercase + uppercase + digits + symbols;
    // Fill remaining characters
    for (let i = 4; i < 10; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setNewEmployee(prev => ({ ...prev, password }));
  };

  const [showPassword, setShowPassword] = useState(false);

  // Get unique positions for filter
  const uniquePositions = useMemo(() => {
    const positions = new Set(employees.map(e => e.position).filter(Boolean));
    return Array.from(positions) as string[];
  }, [employees]);

  // User roles - fetch when modal is open and employee is selected
  const { data: userRoles = [] } = useQuery<Role[]>({
    queryKey: ["/api/users", selectedEmployee?.id, "roles"],
    queryFn: async () => {
      if (!selectedEmployee?.id) return [];
      const res = await apiRequest("GET", `/api/users/${selectedEmployee.id}/roles`);
      return res.json();
    },
    enabled: !!selectedEmployee?.id,
  });

  // Status history - fetch when modal is open and employee is selected
  const userIdForHistory = selectedEmployee?.id;
  const { data: statusHistory = [] } = useQuery<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    comment: string | null;
    changedBy: string | null;
    createdAt: string;
    changedByUser: { firstName: string | null; lastName: string | null } | undefined;
  }[]>({
    queryKey: ["user-status-history", userIdForHistory || "none"],
    queryFn: async () => {
      if (!userIdForHistory) return [];
      const res = await apiRequest("GET", `/api/users/${userIdForHistory}/status-history`);
      return res.json();
    },
  });

  // Points history
  const { data: pointsHistory = [] } = useQuery<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    changedBy: string | null;
    createdAt: string;
    changedByUser: { firstName: string | null; lastName: string | null } | undefined;
    task: { id: string; title: string } | null;
  }[]>({
    queryKey: ["user-points-history", userIdForHistory || "none"],
    queryFn: async () => {
      if (!userIdForHistory) return [];
      const res = await apiRequest("GET", `/api/users/${userIdForHistory}/points-history`);
      return res.json();
    },
  });

  // Employee editing state
  const [editingEmployee, setEditingEmployee] = useState<{
    firstName: string;
    lastName: string;
    position: string;
    phone: string;
    department: string;
    telegram: string;
    notes: string;
    status: string;
    roleIds: string[];
  } | null>(null);

  // Points operation state
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsOperation, setPointsOperation] = useState<"add" | "subtract">("add");
  const [pointsComment, setPointsComment] = useState("");

  // Mutations
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      if (data.generatedPassword) {
        toast({ 
          title: "Успешно", 
          description: `Сотрудник добавлен. Пароль: ${data.generatedPassword}` 
        });
      } else {
        toast({ title: "Успешно", description: "Сотрудник добавлен" });
      }
      setIsCreateEmployeeOpen(false);
      setNewEmployee({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        position: "",
        department: "",
        telegram: "",
        password: "",
        roleIds: []
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось добавить сотрудника", 
        variant: "destructive" 
      });
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const userId = data.id || selectedEmployee?.id;
      // Update user data
      const { roleIds, ...userData } = data;
      const res = await apiRequest("PUT", `/api/users/${userId}`, userData);
      const user = await res.json();
      // Update roles if provided
      if (roleIds !== undefined) {
        await apiRequest("PUT", `/api/users/${userId}/roles`, { roleIds });
      }
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedEmployee?.id, "roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/permissions"] });
      toast({ title: "Успешно", description: "Данные сотрудника обновлены" });
      setIsDetailsOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось обновить статус", 
        variant: "destructive" 
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const res = await apiRequest("PUT", `/api/users/${selectedEmployee?.id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["user-status-history", selectedEmployee?.id] });
    },
  });

  const updatePointsMutation = useMutation({
    mutationFn: async ({ amount, operation, comment }: { amount: number; operation: string; comment: string }) => {
      const res = await apiRequest("POST", `/api/users/${selectedEmployee?.id}/points`, { amount, operation, comment });
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Points updated:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Update selected employee with new balance
      if (selectedEmployee && data?.newBalance !== undefined) {
        setSelectedEmployee({
          ...selectedEmployee,
          pointsBalance: data.newBalance
        });
      }
      
      setPointsAmount("");
      setPointsComment("");
    },
    onError: (error) => {
      console.error("Failed to update points:", error);
    },
  });

  // Initialize editing employee when modal opens
  const prevSelectedIdRef = useRef<string | null>(null);
  const rolesSyncedRef = useRef(false);
  useEffect(() => {
    if (selectedEmployee && selectedEmployee.id !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedEmployee.id;
      rolesSyncedRef.current = false;
      setEditingEmployee({
        firstName: selectedEmployee.firstName || "",
        lastName: selectedEmployee.lastName || "",
        position: selectedEmployee.position || "",
        phone: selectedEmployee.phone || "",
        department: selectedEmployee.department || "",
        telegram: selectedEmployee.telegram || "",
        notes: selectedEmployee.notes || "",
        status: selectedEmployee.status || "",
        roleIds: [],
      });
    }
  }, [selectedEmployee]);

  // Sync roleIds when userRoles loads (separate effect to avoid overwriting manual changes)
  useEffect(() => {
    if (selectedEmployee && editingEmployee && !rolesSyncedRef.current) {
      rolesSyncedRef.current = true;
      setEditingEmployee(prev => prev ? { ...prev, roleIds: userRoles.map(r => r.id) } : null);
    }
  }, [userRoles, selectedEmployee, editingEmployee]);

  // Sync API employees when loaded
  useEffect(() => {
    if (apiEmployees.length > 0) {
      setEmployees(apiEmployees);
    }
  }, [apiEmployees]);

  // Sync API departments when loaded
  useEffect(() => {
    if (apiDepartments.length > 0) {
      setDepartments(apiDepartments.map(d => ({
        id: d.id,
        name: d.name,
        color: d.color
      })));
    }
  }, [apiDepartments]);

  // Filter and sort employees
  const processedEmployees = useMemo(() => {
    // Only show active employees
    let filtered = employees.filter((emp) => emp && emp.isActive !== false);
    
    // Remove duplicates by id
    const uniqueUsers = Array.from(new Map(filtered.map(u => [u.id, u])).values());
    
    // Apply filters
    let result = uniqueUsers;
    
    // Status filter
    if (filters.status !== "all") {
      result = result.filter(emp => emp.status === filters.status);
    }
    
    // Department filter
    if (filters.department !== "all") {
      result = result.filter(emp => emp.department === filters.department);
    }
    
    // Position filter
    if (filters.position !== "all") {
      result = result.filter(emp => emp.position === filters.position);
    }
    
    // Search filter
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase();
      result = result.filter((emp) => {
        const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
        const position = (emp.position || "").toLowerCase();
        const email = (emp.email || "").toLowerCase();
        const telegram = (emp.telegram || "").toLowerCase();
        const status = (emp.status || "").toLowerCase();
        const comment = (emp.statusComment || "").toLowerCase();
        return fullName.includes(query) || position.includes(query) || email.includes(query) || telegram.includes(query) || status.includes(query) || comment.includes(query);
      });
    }
    
    // Sort: online -> busy -> offline, then by lastName
    const statusRank = (status?: string) => {
      if (status === "online") return 0;
      if (status === "busy") return 1;
      return 2;
    };
    
    return result.sort((a, b) => {
      const rankA = statusRank(a.status);
      const rankB = statusRank(b.status);
      if (rankA !== rankB) return rankA - rankB;
      return (a.lastName || "").localeCompare(b.lastName || "");
    });
  }, [employees, searchQuery, filters]);

  // Get blocked employees
  const blockedEmployees = useMemo(() => {
    const blocked = employees.filter((emp) => emp && emp.isActive === false);
    return Array.from(new Map(blocked.map(u => [u.id, u])).values());
  }, [employees]);

  // All active employees without search/filters (for analytics tab)
  const allActiveEmployees = useMemo(() => {
    const active = employees.filter((emp) => emp && emp.isActive !== false);
    return Array.from(new Map(active.map(u => [u.id, u])).values());
  }, [employees]);

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

  return (
    <Layout>
      <div className="p-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Команда</h1>
            <p className="text-foreground mt-1">Управление командой и аудит активности.</p>
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
                <Input 
                  placeholder="Поиск сотрудника..." 
                  className="pl-9 bg-secondary/30 border-border/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 !bg-background text-foreground">
                    <Filter className="w-4 h-4" />
                    Фильтры
                    {(filters.status !== "all" || filters.department !== "all" || filters.position !== "all") && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        {[
                          filters.status !== "all",
                          filters.department !== "all",
                          filters.position !== "all"
                        ].filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 max-h-[80vh] overflow-y-auto">
                  <DropdownMenuLabel>Фильтры</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Статус</label>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant={filters.status === "all" ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setFilters(f => ({ ...f, status: "all" }))}
                      >
                        Все
                      </Button>
                      {customStatuses.map((s) => (
                        <Button
                          key={s.id}
                          variant={filters.status === s.name ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setFilters(f => ({ ...f, status: s.name }))}
                        >
                          <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Отдел</label>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant={filters.department === "all" ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setFilters(f => ({ ...f, department: "all" }))}
                      >
                        Все
                      </Button>
                      {departments.map((d) => (
                        <Button
                          key={d.id}
                          variant={filters.department === d.name ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setFilters(f => ({ ...f, department: d.name }))}
                        >
                          <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: d.color }} />
                          {d.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Должность</label>
                    <Select 
                      value={filters.position} 
                      onValueChange={(value) => setFilters(f => ({ ...f, position: value }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Выберите должность" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все должности</SelectItem>
                        {uniquePositions.map((pos) => (
                          <SelectItem key={pos} value={pos!}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(filters.status !== "all" || filters.department !== "all" || filters.position !== "all") && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => setFilters({ status: "all", department: "all", position: "all" })}
                        >
                          Сбросить все фильтры
                        </Button>
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={isCreateEmployeeOpen} onOpenChange={(open) => {
                if (!open) {
                  setNewEmployee({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    position: "",
                    department: "",
                    telegram: "",
                    password: "",
                    roleIds: []
                  });
                  setShowPassword(false);
                }
                setIsCreateEmployeeOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserCog className="w-4 h-4" />
                    Добавить сотрудника
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Добавить сотрудника</DialogTitle>
                    <DialogDescription>Заполните данные нового сотрудника.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-firstName">Имя *</Label>
                      <Input 
                        id="new-firstName" 
                        placeholder="Иван"
                        value={newEmployee.firstName}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-lastName">Фамилия</Label>
                      <Input 
                        id="new-lastName" 
                        placeholder="Петров"
                        value={newEmployee.lastName}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="new-email">Email *</Label>
                      <Input 
                        id="new-email" 
                        type="email"
                        placeholder="ivan@example.com"
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-phone">Телефон</Label>
                      <Input 
                        id="new-phone" 
                        placeholder="+7 999 123-45-67"
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-position">Должность</Label>
                      <Input 
                        id="new-position" 
                        placeholder="Frontend Developer"
                        value={newEmployee.position}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-department">Отдел</Label>
                      <Select 
                        value={newEmployee.department || "__empty__"} 
                        onValueChange={(value) => setNewEmployee(prev => ({ ...prev, department: value === "__empty__" ? "" : value }))}
                      >
                        <SelectTrigger id="new-department">
                          <SelectValue placeholder="Выберите отдел" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Без отдела</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                                {dept.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-telegram">Telegram</Label>
                      <Input 
                        id="new-telegram" 
                        placeholder="@ivan_petrov"
                        value={newEmployee.telegram}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, telegram: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-role">Роль</Label>
                      <Select 
                        value={newEmployee.roleIds?.[0] || "__empty__"}
                        onValueChange={(value) => setNewEmployee(prev => ({ ...prev, roleIds: value === "__empty__" ? [] : [value] }))}
                      >
                        <SelectTrigger id="new-role">
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Без роли</SelectItem>
                          {apiRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color || "#6366f1" }} />
                                {role.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Пароль</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="new-password" 
                          type={showPassword ? "text" : "password"}
                          placeholder="Пароль"
                          value={newEmployee.password}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                          className="flex-1"
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          size="icon"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="icon"
                          onClick={generatePassword}
                          title="Сгенерировать пароль"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-role">Роль</Label>
                      <Select 
                        value={newEmployee.roleIds[0] || "__empty__"} 
                        onValueChange={(value) => setNewEmployee(prev => ({ 
                          ...prev, 
                          roleIds: value === "__empty__" ? [] : [value] 
                        }))}
                      >
                        <SelectTrigger id="new-role">
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Без роли</SelectItem>
                          {apiRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color || '#6b7280' }} />
                                {role.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateEmployeeOpen(false)}>Отмена</Button>
                    <Button 
                      onClick={() => createEmployeeMutation.mutate(newEmployee)} 
                      disabled={!newEmployee.firstName.trim() || !newEmployee.email.trim() || createEmployeeMutation.isPending}
                    >
                      {createEmployeeMutation.isPending ? "Создание..." : "Создать"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="w-[300px]">Сотрудник</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Комментарий</TableHead>
                    <TableHead>Баллы</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedEmployees.map((employee) => {
                    const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
                    return (
                    <TableRow 
                      key={employee.id} 
                      className="cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setIsDetailsOpen(true);
                      }}
                    >
                       <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={employee.avatar || undefined} />
                            <AvatarFallback>{fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">{fullName}</span>
                            <span className="text-xs text-foreground">{employee.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{employee.position}</TableCell>
                      <TableCell>
                        {customStatuses.length > 0 && employee.status ? (
                          <StatusBadge status={employee.status} color={customStatuses.find(s => s.name === employee.status)?.color} />
                        ) : customStatuses.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {employee.statusComment ? (
                          <span className="text-sm text-muted-foreground max-w-[150px] truncate block" title={employee.statusComment}>
                            {employee.statusComment}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Coins className="w-4 h-4 text-amber-500" />
                          {employee.pointsBalance}
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
                            {employee.isActive ? (
                              <DropdownMenuItem 
                                className="gap-2 text-rose-500 cursor-pointer"
                                onClick={() => {
                                  updateEmployeeMutation.mutate({ id: employee.id, isActive: false });
                                }}
                              >
                                <UserMinus className="w-4 h-4" /> Заблокировать
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="gap-2 text-emerald-500 cursor-pointer"
                                onClick={() => {
                                  updateEmployeeMutation.mutate({ id: employee.id, isActive: true });
                                }}
                              >
                                <UserCheck className="w-4 h-4" /> Разблокировать
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            </div>

            {/* Blocked Employees Section - after main list */}
            {blockedEmployees.length > 0 && (
              <div className="mt-4 border-t border-rose-200 dark:border-rose-800">
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors">
                        <ChevronDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
                          Заблокированные пользователи ({blockedEmployees.length})
                        </span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Table>
                        <TableBody>
                          {blockedEmployees.map((employee) => {
                            const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
                            return (
                              <TableRow 
                                key={employee.id} 
                                className="cursor-pointer bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border border-rose-200 dark:border-rose-800">
                                      <AvatarImage src={employee.avatar || undefined} />
                                      <AvatarFallback className="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300">
                                        {fullName.split(" ").map(n => n[0]).join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">{fullName}</span>
                                      <span className="text-xs text-rose-500 dark:text-rose-400">{employee.email}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-rose-600 dark:text-rose-400">{employee.position}</TableCell>
                                <TableCell>
                                  <span className="text-xs text-rose-500 dark:text-rose-400">Заблокирован</span>
                                </TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
                                    <Coins className="w-4 h-4 text-amber-500" />
                                    {employee.pointsBalance}
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
                                      <DropdownMenuItem 
                                        className="gap-2 text-emerald-500 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateEmployeeMutation.mutate({ id: employee.id, isActive: true });
                                        }}
                                      >
                                        <UserCheck className="w-4 h-4" /> Разблокировать
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
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
                    <DialogDescription>Укажите название нового отдела для управления командой.</DialogDescription>
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
                    {employees.filter(e => e.department === dept.name).length} сотрудников
                  </p>
                  <div className="flex -space-x-2 overflow-hidden">
                    {employees.filter(e => e.department === dept.name).slice(0, 5).map((e) => {
                      const empFullName = `${e.firstName || ""} ${e.lastName || ""}`.trim();
                      return (
                      <Avatar key={e.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-background">
                        <AvatarImage src={e.avatar || undefined} />
                        <AvatarFallback>{empFullName[0]}</AvatarFallback>
                      </Avatar>
                    )})}
                    {employees.filter(e => e.department === dept.name).length > 5 && (
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-[10px] font-bold ring-2 ring-background">
                        +{employees.filter(e => e.department === dept.name).length - 5}
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
                  {allActiveEmployees.map((employee) => {
                    const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
                    const displayName = fullName || employee.email || "Без имени";
                    const initials = fullName
                      ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      : (employee.email?.substring(0, 2).toUpperCase() || "??");
                    return (
                    <TableRow key={employee.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={employee.avatar || undefined} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">{displayName}</span>
                            {!fullName && employee.email && (
                              <span className="text-[10px] text-muted-foreground">{employee.email}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-emerald-500">—</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="time"
                            value={employee.workStartTime || ""}
                            onChange={async (e) => {
                              const newTime = e.target.value;
                              try {
                                await apiRequest("PUT", `/api/users/${employee.id}`, { workStartTime: newTime });
                                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                              } catch (err) {
                                toast({ title: "Ошибка", description: "Не удалось сохранить время", variant: "destructive" });
                              }
                            }}
                            className="h-7 w-28 text-xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="time"
                            value={employee.workEndTime || ""}
                            onChange={async (e) => {
                              const newTime = e.target.value;
                              try {
                                await apiRequest("PUT", `/api/users/${employee.id}`, { workEndTime: newTime });
                                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                              } catch (err) {
                                toast({ title: "Ошибка", description: "Не удалось сохранить время", variant: "destructive" });
                              }
                            }}
                            className="h-7 w-28 text-xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-rose-500">—</TableCell>
                      <TableCell className="text-right font-bold text-primary">—</TableCell>
                    </TableRow>
                    );
                  })}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarImage src={selectedEmployee?.avatar || undefined} />
                    <AvatarFallback>{selectedEmployee ? `${selectedEmployee.firstName?.[0] || ""}${selectedEmployee.lastName?.[0] || ""}` : ""}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">{selectedEmployee ? `${selectedEmployee.firstName || ""} ${selectedEmployee.lastName || ""}`.trim() : ""}</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">{selectedEmployee?.position}</DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Status Select */}
                  {customStatuses.length > 0 ? (
                    <Select 
                      value={editingEmployee?.status || ""} 
                      onValueChange={(value) => {
                        setEditingEmployee(prev => prev ? { ...prev, status: value } : null);
                        updateStatusMutation.mutate({ status: value });
                      }}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        {customStatuses.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                              {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">Статусы не созданы</span>
                  )}
                  {/* Points display */}
                  <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-amber-600">{selectedEmployee?.pointsBalance || 0}</span>
                  </div>
                </div>
              </div>
              {/* Points Operation Row */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30">
                <Input 
                  type="number" 
                  placeholder="Сумма" 
                  className="w-24 h-8"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                />
                <Select value={pointsOperation} onValueChange={(v) => setPointsOperation(v as "add" | "subtract")}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Начислить</SelectItem>
                    <SelectItem value="subtract">Списать</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  placeholder="Комментарий" 
                  className="flex-1 h-8"
                  value={pointsComment}
                  onChange={(e) => setPointsComment(e.target.value)}
                />
                <Button 
                  size="sm" 
                  className="h-8"
                  disabled={!pointsAmount}
                  onClick={() => {
                    const amount = parseInt(pointsAmount);
                    console.log("Click! amount:", amount, "selectedEmployee:", selectedEmployee?.id);
                    if (amount > 0 && selectedEmployee?.id) {
                      updatePointsMutation.mutate({ 
                        amount, 
                        operation: pointsOperation, 
                        comment: pointsComment 
                      });
                    } else {
                      console.log("Validation failed - no amount or no employee");
                    }
                  }}
                >
                  Ок
                </Button>
              </div>
            </DialogHeader>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="bg-transparent h-12 w-full justify-start gap-6 rounded-none p-0 px-6 border-b border-border/50">
                <TabsTrigger value="edit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12">Данные</TabsTrigger>
                <TabsTrigger value="audit_status" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12">Аудит статусов</TabsTrigger>
                <TabsTrigger value="audit_points" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12">Аудит баллов</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-0 p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Имя</Label>
                      <Input 
                        value={editingEmployee?.firstName || ""} 
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                        className="bg-secondary/30" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Фамилия</Label>
                      <Input 
                        value={editingEmployee?.lastName || ""} 
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                        className="bg-secondary/30" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                      <Input 
                        value={selectedEmployee?.email || ""} 
                        disabled 
                        className="bg-secondary/30 opacity-60" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Телефон</Label>
                      <Input 
                        value={editingEmployee?.phone || ""} 
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, phone: e.target.value } : null)}
                        className="bg-secondary/30" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Должность</Label>
                      <Input 
                        value={editingEmployee?.position || ""} 
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, position: e.target.value } : null)}
                        className="bg-secondary/30" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Отдел</Label>
                      <Select 
                        value={editingEmployee?.department || "__empty__"} 
                        onValueChange={(value) => setEditingEmployee(prev => prev ? { ...prev, department: value === "__empty__" ? "" : value } : null)}
                      >
                        <SelectTrigger className="bg-secondary/30">
                          <SelectValue placeholder="Выберите отдел" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Без отдела</SelectItem>
                          {apiDepartments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                                {dept.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telegram</Label>
                      <Input 
                        value={editingEmployee?.telegram || ""} 
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, telegram: e.target.value } : null)}
                        className="bg-secondary/30" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Роли</Label>
                      <Select 
                        value={editingEmployee?.roleIds?.[0] || "__empty__"}
                        onValueChange={(value) => {
                          const newRoleIds = value === "__empty__" ? [] : [value];
                          setEditingEmployee(prev => prev ? { ...prev, roleIds: newRoleIds } : null);
                        }}
                      >
                        <SelectTrigger className="bg-secondary/30">
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Без роли</SelectItem>
                          {apiRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color || "#6366f1" }} />
                                {role.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Статус</Label>
                      <div>
                        {editingEmployee?.status && customStatuses.find(s => s.name === editingEmployee.status) ? (
                          <StatusBadge 
                            status={editingEmployee.status} 
                            color={customStatuses.find(s => s.name === editingEmployee.status)?.color} 
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Не установлен</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Заметки</Label>
                      <Textarea 
                        value={editingEmployee?.notes || ""} 
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, notes: e.target.value } : null)}
                        className="bg-secondary/30 min-h-[100px]" 
                        placeholder="Заметки о сотруднике..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                    <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Отмена</Button>
                    <Button 
                      disabled={updateEmployeeMutation.isPending}
                      onClick={() => {
                        if (editingEmployee) {
                          updateEmployeeMutation.mutate(editingEmployee);
                        }
                      }}
                    >
                      Сохранить изменения
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="audit_status" className="mt-0">
                  {statusHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">История статусов пуста</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-secondary/20 sticky top-0">
                          <TableRow>
                            <TableHead className="w-[120px]">Статус</TableHead>
                            <TableHead>Комментарий</TableHead>
                            <TableHead className="w-[140px]">Кем выполнено</TableHead>
                            <TableHead className="w-[120px]">Дата и время</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statusHistory.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <StatusBadge 
                                  status={entry.newStatus} 
                                  color={customStatuses.find(s => s.name === entry.newStatus)?.color}
                                />
                              </TableCell>
                              <TableCell className="text-sm">
                                {entry.comment || '—'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {entry.changedByUser 
                                  ? `${entry.changedByUser.firstName || ''} ${entry.changedByUser.lastName || ''}`.trim() || 'Система'
                                  : 'Система'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {entry.createdAt ? new Date(entry.createdAt).toLocaleString('ru-RU', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit'
                              }) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
  );
}
