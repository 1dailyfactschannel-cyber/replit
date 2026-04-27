import React, { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { 
  BarChart2,
  PieChart,
  TrendingUp,
  Users,
  Folder,
  LayoutGrid,
  CheckSquare,
  Clock,
  Calendar,
  Filter,
  ChevronRight,
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  Target,
  Timer,
  Activity,
  Percent,
  Award,
  AlertTriangle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Custom chart tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
        {label && <p className="text-sm font-semibold text-foreground mb-2">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Stat card component
function StatCard({ title, value, icon: Icon, color, subtitle, trend }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    red: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    slate: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  };
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <div className="flex items-center gap-1.5 text-xs">
                {trend === "up" && <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />}
                {trend === "down" && <ArrowDown className="w-3.5 h-3.5 text-rose-500" />}
                {trend === "neutral" && <Minus className="w-3.5 h-3.5 text-slate-400" />}
                <span className={cn(
                  trend === "up" && "text-emerald-600",
                  trend === "down" && "text-rose-600",
                  trend === "neutral" && "text-slate-500"
                )}>
                  {subtitle}
                </span>
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl border", colorClasses[color] || colorClasses.slate)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("overview");
  
  // Filter states
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedBoard, setSelectedBoard] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedWorkspace !== "all") params.set("workspaceId", selectedWorkspace);
    if (selectedProject !== "all") params.set("projectId", selectedProject);
    if (selectedBoard !== "all") params.set("boardId", selectedBoard);
    if (selectedUser !== "all") params.set("userId", selectedUser);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params.toString();
  }, [selectedWorkspace, selectedProject, selectedBoard, selectedUser, dateFrom, dateTo]);

  // Fetch workspaces
  const { data: workspaces = [] } = useQuery<any[]>({
    queryKey: ["/api/workspaces"],
    staleTime: 1000 * 60 * 5,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    staleTime: 1000 * 60 * 5,
  });

  // Fetch boards
  const { data: boards = [] } = useQuery<any[]>({
    queryKey: ["/api/boards"],
    staleTime: 1000 * 60 * 5,
  });

  // Fetch users
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    staleTime: 1000 * 60 * 5,
  });

  // Fetch overview report
  const { data: overviewData, isLoading: isLoadingOverview } = useQuery<any>({
    queryKey: [`/api/reports/overview?${queryParams}`],
    enabled: activeReport === "overview",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch workspaces report
  const { data: workspacesReport, isLoading: isLoadingWorkspaces } = useQuery<any>({
    queryKey: [`/api/reports/workspaces?${queryParams}`],
    enabled: activeReport === "workspaces",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch projects report
  const { data: projectsReport, isLoading: isLoadingProjects } = useQuery<any>({
    queryKey: [`/api/reports/projects?${queryParams}`],
    enabled: activeReport === "projects",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch boards report
  const { data: boardsReport, isLoading: isLoadingBoards } = useQuery<any>({
    queryKey: [`/api/reports/boards?${queryParams}`],
    enabled: activeReport === "boards",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch tasks time tracking
  const { data: tasksTimeData, isLoading: isLoadingTasksTime } = useQuery<any>({
    queryKey: [`/api/reports/tasks/time-tracking?${queryParams}`],
    enabled: activeReport === "tasks",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch users report
  const { data: usersReport, isLoading: isLoadingUsers } = useQuery<any>({
    queryKey: [`/api/reports/users?${queryParams}`],
    enabled: activeReport === "users",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch workload report
  const { data: workloadReport, isLoading: isLoadingWorkload } = useQuery<any>({
    queryKey: [`/api/reports/workload?${queryParams}`],
    enabled: activeReport === "workload",
    staleTime: 1000 * 60 * 2,
  });

  const reports = [
    { id: "overview", label: "Обзор", icon: BarChart2, description: "Общая статистика" },
    { id: "workspaces", label: "По пространствам", icon: Folder, description: "Статистика по пространствам" },
    { id: "projects", label: "По проектам", icon: LayoutGrid, description: "Статистика по проектам" },
    { id: "boards", label: "По доскам", icon: Calendar, description: "Статистика по доскам" },
    { id: "tasks", label: "По задачам", icon: CheckSquare, description: "Время в статусах" },
    { id: "users", label: "По сотрудникам", icon: Users, description: "Аналитика сотрудников" },
    { id: "workload", label: "Нагрузка", icon: Activity, description: "Загруженность команды" },
  ];

  const isLoading = isLoadingOverview || isLoadingWorkspaces || isLoadingProjects || isLoadingBoards || isLoadingTasksTime || isLoadingUsers || isLoadingWorkload;

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Отчеты
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Аналитика и статистика</p>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-1">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                    activeReport === report.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <report.icon className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{report.label}</div>
                    <div className={cn(
                      "text-xs truncate",
                      activeReport === report.id ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {report.description}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 shrink-0 transition-transform",
                    activeReport === report.id && "rotate-90"
                  )} />
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Filters */}
            <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-foreground" />
                  <span className="text-sm font-medium text-foreground">Фильтры</span>
                </div>
                <Button variant="outline" size="sm" className="gap-2 h-8">
                  <Download className="w-3.5 h-3.5" />
                  Экспорт
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder="Пространство" />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground">
                    <SelectItem value="all">Все пространства</SelectItem>
                    {workspaces.map((ws: any) => (
                      <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder="Проект" />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground">
                    <SelectItem value="all">Все проекты</SelectItem>
                    {projects.filter((p: any) => selectedWorkspace === "all" || p.workspaceId === selectedWorkspace).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder="Доска" />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground">
                    <SelectItem value="all">Все доски</SelectItem>
                    {boards.filter((b: any) => 
                      (selectedProject === "all" || b.projectId === selectedProject) &&
                      (selectedWorkspace === "all" || projects.find((p: any) => p.id === b.projectId)?.workspaceId === selectedWorkspace)
                    ).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder="Сотрудник" />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground">
                    <SelectItem value="all">Все сотрудники</SelectItem>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName ? `${u.firstName} ${u.lastName || ''}` : u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Дата от"
                  className="h-10 bg-background text-foreground"
                />

                <Input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Дата до"
                  className="h-10 bg-background text-foreground"
                />
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Overview Report */}
                {activeReport === "overview" && overviewData && (
                  <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        title="Всего задач"
                        value={formatNumber(overviewData.totalTasks || 0)}
                        icon={CheckSquare}
                        color="blue"
                        subtitle="+12% за неделю"
                        trend="up"
                      />
                      <StatCard
                        title="В работе"
                        value={formatNumber(overviewData.inProgressTasks || 0)}
                        icon={Activity}
                        color="amber"
                        subtitle="5% от общего числа"
                        trend="neutral"
                      />
                      <StatCard
                        title="Выполнено"
                        value={formatNumber(overviewData.completedTasks || 0)}
                        icon={Target}
                        color="green"
                        subtitle="+8% за неделю"
                        trend="up"
                      />
                      <StatCard
                        title="Просрочено"
                        value={formatNumber(overviewData.overdueTasks || 0)}
                        icon={Clock}
                        color="red"
                        subtitle="-3% за неделю"
                        trend="down"
                      />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-primary" />
                            Задачи по статусам
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={320}>
                            <RechartsPieChart>
                              <Pie
                                data={overviewData.tasksByStatus || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={4}
                                dataKey="count"
                                nameKey="status"
                                strokeWidth={2}
                                stroke="hsl(var(--background))"
                              >
                                {(overviewData.tasksByStatus || []).map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                              <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                iconType="circle"
                                iconSize={8}
                                formatter={(value: string) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Задачи по дням
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={overviewData.tasksByDay || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis 
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Area 
                                type="monotone" 
                                dataKey="count" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fill="url(#colorCount)" 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Workspaces Report */}
                {activeReport === "workspaces" && workspacesReport && (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        title="Всего пространств"
                        value={workspacesReport.workspaces?.length || 0}
                        icon={Folder}
                        color="blue"
                      />
                      <StatCard
                        title="Всего задач"
                        value={formatNumber(workspacesReport.workspaces?.reduce((sum: number, w: any) => sum + (w.tasksCount || 0), 0) || 0)}
                        icon={CheckSquare}
                        color="purple"
                      />
                      <StatCard
                        title="Выполнено"
                        value={formatNumber(workspacesReport.workspaces?.reduce((sum: number, w: any) => sum + (w.completedCount || 0), 0) || 0)}
                        icon={Target}
                        color="green"
                      />
                      <StatCard
                        title="Общее время"
                        value={formatDuration(workspacesReport.workspaces?.reduce((sum: number, w: any) => sum + (w.totalTime || 0), 0) || 0)}
                        icon={Timer}
                        color="amber"
                      />
                    </div>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Folder className="w-4 h-4 text-primary" />
                          По пространствам
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[200px]">Пространство</TableHead>
                              <TableHead className="text-right">Проектов</TableHead>
                              <TableHead className="text-right">Задач</TableHead>
                              <TableHead className="text-right">Выполнено</TableHead>
                              <TableHead className="text-right">В работе</TableHead>
                              <TableHead className="text-right">Выполнение</TableHead>
                              <TableHead className="text-right">Общее время</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(workspacesReport.workspaces || []).map((ws: any) => {
                              const completionRate = ws.tasksCount > 0 ? Math.round((ws.completedCount / ws.tasksCount) * 100) : 0;
                              return (
                                <TableRow key={ws.id} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">{ws.name}</TableCell>
                                  <TableCell className="text-right">{ws.projectsCount}</TableCell>
                                  <TableCell className="text-right">{ws.tasksCount}</TableCell>
                                  <TableCell className="text-right text-emerald-600">{ws.completedCount}</TableCell>
                                  <TableCell className="text-right text-blue-600">{ws.inProgressCount}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="text-xs font-medium w-8 text-right">{completionRate}%</span>
                                      <Progress value={completionRate} className="w-16 h-1.5" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">{formatDuration(ws.totalTime || 0)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-primary" />
                          Распределение задач по пространствам
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={workspacesReport.workspaces || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                              iconType="circle"
                              iconSize={8}
                              formatter={(value: string) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
                            />
                            <Bar dataKey="tasksCount" fill="#3b82f6" name="Всего задач" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="completedCount" fill="#10b981" name="Выполнено" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Projects Report */}
                {activeReport === "projects" && projectsReport && (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        title="Всего проектов"
                        value={projectsReport.projects?.length || 0}
                        icon={LayoutGrid}
                        color="blue"
                      />
                      <StatCard
                        title="Всего задач"
                        value={formatNumber(projectsReport.projects?.reduce((sum: number, p: any) => sum + (p.tasksCount || 0), 0) || 0)}
                        icon={CheckSquare}
                        color="purple"
                      />
                      <StatCard
                        title="Выполнено"
                        value={formatNumber(projectsReport.projects?.reduce((sum: number, p: any) => sum + (p.completedCount || 0), 0) || 0)}
                        icon={Target}
                        color="green"
                      />
                      <StatCard
                        title="Общее время"
                        value={formatDuration(projectsReport.projects?.reduce((sum: number, p: any) => sum + (p.totalTime || 0), 0) || 0)}
                        icon={Timer}
                        color="amber"
                      />
                    </div>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4 text-primary" />
                          По проектам
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Проект</TableHead>
                              <TableHead>Пространство</TableHead>
                              <TableHead className="text-right">Задач</TableHead>
                              <TableHead className="text-right">Выполнено</TableHead>
                              <TableHead className="text-right">В работе</TableHead>
                              <TableHead className="text-right">Выполнение</TableHead>
                              <TableHead className="text-right">Общее время</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(projectsReport.projects || []).map((p: any) => {
                              const completionRate = p.tasksCount > 0 ? Math.round((p.completedCount / p.tasksCount) * 100) : 0;
                              return (
                                <TableRow key={p.id} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">{p.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{p.workspaceName}</TableCell>
                                  <TableCell className="text-right">{p.tasksCount}</TableCell>
                                  <TableCell className="text-right text-emerald-600">{p.completedCount}</TableCell>
                                  <TableCell className="text-right text-blue-600">{p.inProgressCount}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="text-xs font-medium w-8 text-right">{completionRate}%</span>
                                      <Progress value={completionRate} className="w-16 h-1.5" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">{formatDuration(p.totalTime || 0)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-primary" />
                          Сравнение проектов
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={projectsReport.projects || []} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis 
                              type="number" 
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={120}
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                              iconType="circle"
                              iconSize={8}
                              formatter={(value: string) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
                            />
                            <Bar dataKey="completedCount" fill="#10b981" name="Выполнено" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="inProgressCount" fill="#3b82f6" name="В работе" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Boards Report */}
                {activeReport === "boards" && boardsReport && (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        title="Всего досок"
                        value={boardsReport.boards?.length || 0}
                        icon={Calendar}
                        color="blue"
                      />
                      <StatCard
                        title="Всего задач"
                        value={formatNumber(boardsReport.boards?.reduce((sum: number, b: any) => sum + (b.tasksCount || 0), 0) || 0)}
                        icon={CheckSquare}
                        color="purple"
                      />
                      <StatCard
                        title="Выполнено"
                        value={formatNumber(boardsReport.boards?.reduce((sum: number, b: any) => sum + (b.completedCount || 0), 0) || 0)}
                        icon={Target}
                        color="green"
                      />
                      <StatCard
                        title="Среднее время"
                        value={formatDuration(
                          boardsReport.boards?.length > 0
                            ? boardsReport.boards.reduce((sum: number, b: any) => sum + (b.avgTime || 0), 0) / boardsReport.boards.length
                            : 0
                        )}
                        icon={Timer}
                        color="amber"
                      />
                    </div>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          По доскам
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Доска</TableHead>
                              <TableHead>Проект</TableHead>
                              <TableHead className="text-right">Задач</TableHead>
                              <TableHead className="text-right">Выполнено</TableHead>
                              <TableHead className="text-right">Выполнение</TableHead>
                              <TableHead className="text-right">Ср. время</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(boardsReport.boards || []).map((b: any) => {
                              const completionRate = b.tasksCount > 0 ? Math.round((b.completedCount / b.tasksCount) * 100) : 0;
                              return (
                                <TableRow key={b.id} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">{b.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{b.projectName}</TableCell>
                                  <TableCell className="text-right">{b.tasksCount}</TableCell>
                                  <TableCell className="text-right text-emerald-600">{b.completedCount}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="text-xs font-medium w-8 text-right">{completionRate}%</span>
                                      <Progress value={completionRate} className="w-16 h-1.5" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">{formatDuration(b.avgTime || 0)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Tasks Time Tracking Report */}
                {activeReport === "tasks" && tasksTimeData && (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        title="Всего статусов"
                        value={tasksTimeData.statusReport?.length || 0}
                        icon={CheckSquare}
                        color="blue"
                      />
                      <StatCard
                        title="Всего задач"
                        value={formatNumber(tasksTimeData.statusReport?.reduce((sum: number, s: any) => sum + (s.taskCount || 0), 0) || 0)}
                        icon={Target}
                        color="purple"
                      />
                      <StatCard
                        title="Общее время"
                        value={formatDuration(tasksTimeData.statusReport?.reduce((sum: number, s: any) => sum + (s.totalSeconds || 0), 0) || 0)}
                        icon={Timer}
                        color="amber"
                      />
                      <StatCard
                        title="Среднее время"
                        value={formatDuration(
                          tasksTimeData.statusReport?.length > 0
                            ? tasksTimeData.statusReport.reduce((sum: number, s: any) => sum + (s.totalSeconds || 0), 0) / tasksTimeData.statusReport.length
                            : 0
                        )}
                        icon={Clock}
                        color="slate"
                      />
                    </div>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          Время в статусах
                        </CardTitle>
                        <CardDescription>Статистика по статусам задач за выбранный период</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Статус</TableHead>
                              <TableHead className="text-right">Количество задач</TableHead>
                              <TableHead className="text-right">Доля задач</TableHead>
                              <TableHead className="text-right">Общее время</TableHead>
                              <TableHead className="text-right">Доля времени</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const totalTasks = tasksTimeData.statusReport?.reduce((sum: number, s: any) => sum + (s.taskCount || 0), 0) || 0;
                              const totalTime = tasksTimeData.statusReport?.reduce((sum: number, s: any) => sum + (s.totalSeconds || 0), 0) || 0;
                              return (tasksTimeData.statusReport || []).map((s: any, idx: number) => {
                                const taskShare = totalTasks > 0 ? Math.round((s.taskCount / totalTasks) * 100) : 0;
                                const timeShare = totalTime > 0 ? Math.round((s.totalSeconds / totalTime) * 100) : 0;
                                return (
                                  <TableRow key={idx} className="hover:bg-muted/50">
                                    <TableCell>
                                      <Badge variant="outline" className="font-medium">{s.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{s.taskCount}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <span className="text-xs w-8 text-right">{taskShare}%</span>
                                        <Progress value={taskShare} className="w-16 h-1.5" />
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">{formatDuration(s.totalSeconds || 0)}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <span className="text-xs w-8 text-right">{timeShare}%</span>
                                        <Progress value={timeShare} className="w-16 h-1.5" />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              });
                            })()}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-primary" />
                            Распределение задач по статусам
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={320}>
                            <RechartsPieChart>
                              <Pie
                                data={tasksTimeData.statusReport || []}
                                dataKey="taskCount"
                                nameKey="status"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={4}
                                strokeWidth={2}
                                stroke="hsl(var(--background))"
                                label={({ status, percent }: any) => `${status}: ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                              >
                                {(tasksTimeData.statusReport || []).map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                              <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                iconType="circle"
                                iconSize={8}
                                formatter={(value: string) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-primary" />
                            Распределение времени по статусам
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={tasksTimeData.statusReport || []} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                              <XAxis 
                                type="number" 
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v: number) => formatDuration(v)}
                              />
                              <YAxis 
                                dataKey="status" 
                                type="category" 
                                width={100}
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip 
                                content={<CustomTooltip />} 
                                formatter={(value: number) => formatDuration(value)}
                              />
                              <Bar dataKey="totalSeconds" fill="#3b82f6" name="Время" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Users Report */}
                {activeReport === "users" && usersReport && (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        title="Всего сотрудников"
                        value={usersReport.users?.length || 0}
                        icon={Users}
                        color="blue"
                      />
                      <StatCard
                        title="Всего выполнено"
                        value={formatNumber(usersReport.users?.reduce((sum: number, u: any) => sum + (u.completedCount || 0), 0) || 0)}
                        icon={Target}
                        color="green"
                      />
                      <StatCard
                        title="Всего комментариев"
                        value={formatNumber(usersReport.users?.reduce((sum: number, u: any) => sum + (u.commentsCount || 0), 0) || 0)}
                        icon={Activity}
                        color="purple"
                      />
                      <StatCard
                        title="Общее время"
                        value={formatDuration(usersReport.users?.reduce((sum: number, u: any) => sum + (u.totalTime || 0), 0) || 0)}
                        icon={Timer}
                        color="amber"
                      />
                    </div>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          Аналитика сотрудников
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Сотрудник</TableHead>
                              <TableHead className="text-right">Выполнено</TableHead>
                              <TableHead className="text-right">В работе</TableHead>
                              <TableHead className="text-right">Продуктивность</TableHead>
                              <TableHead className="text-right">Комментариев</TableHead>
                              <TableHead className="text-right">Ср. время</TableHead>
                              <TableHead className="text-right">Общее время</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(usersReport.users || []).map((u: any) => {
                              const totalTasks = (u.completedCount || 0) + (u.inProgressCount || 0);
                              const productivity = totalTasks > 0 ? Math.round(((u.completedCount || 0) / totalTasks) * 100) : 0;
                              return (
                                <TableRow key={u.id} className="hover:bg-muted/50">
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="w-8 h-8">
                                        <AvatarImage src={u.avatar || undefined} />
                                        <AvatarFallback>{u.name?.charAt(0) || 'U'}</AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium">{u.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-emerald-600">{u.completedCount}</TableCell>
                                  <TableCell className="text-right text-blue-600">{u.inProgressCount}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="text-xs font-medium w-8 text-right">{productivity}%</span>
                                      <Progress value={productivity} className="w-16 h-1.5" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{u.commentsCount}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{formatDuration(u.avgTime || 0)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatDuration(u.totalTime || 0)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-primary" />
                          Продуктивность сотрудников
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={usersReport.users || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                              iconType="circle"
                              iconSize={8}
                              formatter={(value: string) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
                            />
                            <Bar dataKey="completedCount" fill="#10b981" name="Выполнено" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="inProgressCount" fill="#3b82f6" name="В работе" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Workload Report */}
                {activeReport === "workload" && workloadReport && (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    {(() => {
                      const users = workloadReport.users || [];
                      const totalOverdue = users.reduce((sum: number, u: any) => sum + (u.overdueCount || 0), 0);
                      const overloaded = users.filter((u: any) => u.riskLevel === "high").length;
                      const free = users.filter((u: any) => u.totalTasks === 0).length;
                      const avgLoad = users.length > 0 ? Math.round(users.reduce((sum: number, u: any) => sum + (u.activeTasks || 0), 0) / users.length) : 0;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <StatCard
                            title="Средняя загрузка"
                            value={`${avgLoad} задач`}
                            icon={Activity}
                            color="blue"
                          />
                          <StatCard
                            title="Перегружено"
                            value={overloaded}
                            icon={AlertTriangle}
                            color="red"
                          />
                          <StatCard
                            title="Свободно"
                            value={free}
                            icon={Users}
                            color="green"
                          />
                          <StatCard
                            title="Просрочено всего"
                            value={totalOverdue}
                            icon={Clock}
                            color="amber"
                          />
                        </div>
                      );
                    })()}

                    {/* Workload List */}
                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Activity className="w-4 h-4 text-primary" />
                          Загруженность команды
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(workloadReport.users || []).map((u: any) => {
                            const barColor = u.activeTasks > 8 ? "bg-red-500" : u.activeTasks > 5 ? "bg-amber-500" : "bg-emerald-500";
                            const textColor = u.activeTasks > 8 ? "text-red-600" : u.activeTasks > 5 ? "text-amber-600" : "text-emerald-600";
                            return (
                              <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={u.avatar || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium">{u.name}</p>
                                      <p className="text-xs text-muted-foreground">{u.position || 'Сотрудник'}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={cn("text-xs font-bold", textColor)}>
                                        {u.activeTasks} активных
                                      </span>
                                      {u.overdueCount > 0 && (
                                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                          {u.overdueCount} просрочено
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={cn("h-full rounded-full transition-all", barColor)}
                                        style={{ width: `${Math.min(100, u.utilization || 0)}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground w-8 text-right">{u.utilization}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {u.byStatus?.planned > 0 && (
                                      <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-slate-100 text-slate-600 border-slate-200">
                                        В планах: {u.byStatus.planned}
                                      </Badge>
                                    )}
                                    {u.byStatus?.inProgress > 0 && (
                                      <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-blue-50 text-blue-600 border-blue-200">
                                        В работе: {u.byStatus.inProgress}
                                      </Badge>
                                    )}
                                    {u.byStatus?.review > 0 && (
                                      <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-amber-50 text-amber-600 border-amber-200">
                                        На проверке: {u.byStatus.review}
                                      </Badge>
                                    )}
                                    {u.byStatus?.done > 0 && (
                                      <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-emerald-50 text-emerald-600 border-emerald-200">
                                        Готово: {u.byStatus.done}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stacked Bar Chart */}
                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-primary" />
                          Распределение задач по статусам
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={workloadReport.users || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              iconType="circle"
                              iconSize={8}
                              formatter={(value: string) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
                            />
                            <Bar dataKey="byStatus.planned" fill="#94a3b8" name="В планах" stackId="a" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="byStatus.inProgress" fill="#3b82f6" name="В работе" stackId="a" />
                            <Bar dataKey="byStatus.review" fill="#f59e0b" name="На проверке" stackId="a" />
                            <Bar dataKey="byStatus.done" fill="#10b981" name="Готово" stackId="a" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}
