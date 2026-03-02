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
  Minus
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  const { data: workspaces = [] } = useQuery({
    queryKey: ["/api/workspaces"],
    staleTime: 1000 * 60 * 5,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    staleTime: 1000 * 60 * 5,
  });

  // Fetch boards
  const { data: boards = [] } = useQuery({
    queryKey: ["/api/boards"],
    staleTime: 1000 * 60 * 5,
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 1000 * 60 * 5,
  });

  // Fetch overview report
  const { data: overviewData, isLoading: isLoadingOverview } = useQuery({
    queryKey: [`/api/reports/overview?${queryParams}`],
    enabled: activeReport === "overview",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch workspaces report
  const { data: workspacesReport, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: [`/api/reports/workspaces?${queryParams}`],
    enabled: activeReport === "workspaces",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch projects report
  const { data: projectsReport, isLoading: isLoadingProjects } = useQuery({
    queryKey: [`/api/reports/projects?${queryParams}`],
    enabled: activeReport === "projects",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch boards report
  const { data: boardsReport, isLoading: isLoadingBoards } = useQuery({
    queryKey: [`/api/reports/boards?${queryParams}`],
    enabled: activeReport === "boards",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch tasks time tracking
  const { data: tasksTimeData, isLoading: isLoadingTasksTime } = useQuery({
    queryKey: [`/api/reports/tasks/time-tracking?${queryParams}`],
    enabled: activeReport === "tasks",
    staleTime: 1000 * 60 * 2,
  });

  // Fetch users report
  const { data: usersReport, isLoading: isLoadingUsers } = useQuery({
    queryKey: [`/api/reports/users?${queryParams}`],
    enabled: activeReport === "users",
    staleTime: 1000 * 60 * 2,
  });

  const reports = [
    { id: "overview", label: "Обзор", icon: BarChart2, description: "Общая статистика" },
    { id: "workspaces", label: "По пространствам", icon: Folder, description: "Статистика по пространствам" },
    { id: "projects", label: "По проектам", icon: LayoutGrid, description: "Статистика по проектам" },
    { id: "boards", label: "По доскам", icon: Calendar, description: "Статистика по доскам" },
    { id: "tasks", label: "По задачам", icon: CheckSquare, description: "Время в статусах" },
    { id: "users", label: "По сотрудникам", icon: Users, description: "Аналитика сотрудников" },
  ];

  const isLoading = isLoadingOverview || isLoadingWorkspaces || isLoadingProjects || isLoadingBoards || isLoadingTasksTime || isLoadingUsers;

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
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">Фильтры</span>
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
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Всего задач</CardDescription>
                          <CardTitle className="text-3xl">{formatNumber(overviewData.totalTasks || 0)}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>В работе</CardDescription>
                          <CardTitle className="text-3xl text-blue-500">{formatNumber(overviewData.inProgressTasks || 0)}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Выполнено</CardDescription>
                          <CardTitle className="text-3xl text-green-500">{formatNumber(overviewData.completedTasks || 0)}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Просрочено</CardDescription>
                          <CardTitle className="text-3xl text-red-500">{formatNumber(overviewData.overdueTasks || 0)}</CardTitle>
                        </CardHeader>
                      </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Задачи по статусам</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsPieChart>
                              <Pie
                                data={overviewData.tasksByStatus || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="status"
                              >
                                {(overviewData.tasksByStatus || []).map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Задачи по дням</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={overviewData.tasksByDay || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
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
                    <Card>
                      <CardHeader>
                        <CardTitle>По пространствам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4 font-medium">Пространство</th>
                                <th className="text-right py-3 px-4 font-medium">Проектов</th>
                                <th className="text-right py-3 px-4 font-medium">Задач</th>
                                <th className="text-right py-3 px-4 font-medium">Выполнено</th>
                                <th className="text-right py-3 px-4 font-medium">В работе</th>
                                <th className="text-right py-3 px-4 font-medium">Общее время</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(workspacesReport.workspaces || []).map((ws: any, idx: number) => (
                                <tr key={ws.id} className="border-b hover:bg-muted/50">
                                  <td className="py-3 px-4 font-medium">{ws.name}</td>
                                  <td className="text-right py-3 px-4">{ws.projectsCount}</td>
                                  <td className="text-right py-3 px-4">{ws.tasksCount}</td>
                                  <td className="text-right py-3 px-4 text-green-500">{ws.completedCount}</td>
                                  <td className="text-right py-3 px-4 text-blue-500">{ws.inProgressCount}</td>
                                  <td className="text-right py-3 px-4">{formatDuration(ws.totalTime || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Распределение задач по пространствам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={workspacesReport.workspaces || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="tasksCount" fill="#3b82f6" name="Всего задач" />
                            <Bar dataKey="completedCount" fill="#10b981" name="Выполнено" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Projects Report */}
                {activeReport === "projects" && projectsReport && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>По проектам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4 font-medium">Проект</th>
                                <th className="text-left py-3 px-4 font-medium">Пространство</th>
                                <th className="text-right py-3 px-4 font-medium">Задач</th>
                                <th className="text-right py-3 px-4 font-medium">Выполнено</th>
                                <th className="text-right py-3 px-4 font-medium">В работе</th>
                                <th className="text-right py-3 px-4 font-medium">Общее время</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(projectsReport.projects || []).map((p: any) => (
                                <tr key={p.id} className="border-b hover:bg-muted/50">
                                  <td className="py-3 px-4 font-medium">{p.name}</td>
                                  <td className="py-3 px-4 text-muted-foreground">{p.workspaceName}</td>
                                  <td className="text-right py-3 px-4">{p.tasksCount}</td>
                                  <td className="text-right py-3 px-4 text-green-500">{p.completedCount}</td>
                                  <td className="text-right py-3 px-4 text-blue-500">{p.inProgressCount}</td>
                                  <td className="text-right py-3 px-4">{formatDuration(p.totalTime || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Сравнение проектов</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={projectsReport.projects || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip />
                            <Bar dataKey="completedCount" fill="#10b981" name="Выполнено" />
                            <Bar dataKey="inProgressCount" fill="#3b82f6" name="В работе" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Boards Report */}
                {activeReport === "boards" && boardsReport && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>По доскам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4 font-medium">Доска</th>
                                <th className="text-left py-3 px-4 font-medium">Проект</th>
                                <th className="text-right py-3 px-4 font-medium">Задач</th>
                                <th className="text-right py-3 px-4 font-medium">Выполнено</th>
                                <th className="text-right py-3 px-4 font-medium">Ср. время</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(boardsReport.boards || []).map((b: any) => (
                                <tr key={b.id} className="border-b hover:bg-muted/50">
                                  <td className="py-3 px-4 font-medium">{b.name}</td>
                                  <td className="py-3 px-4 text-muted-foreground">{b.projectName}</td>
                                  <td className="text-right py-3 px-4">{b.tasksCount}</td>
                                  <td className="text-right py-3 px-4 text-green-500">{b.completedCount}</td>
                                  <td className="text-right py-3 px-4">{formatDuration(b.avgTime || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Tasks Time Tracking Report */}
                {activeReport === "tasks" && tasksTimeData && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Время в статусах</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4 font-medium">Задача</th>
                                <th className="text-left py-3 px-4 font-medium">Статус</th>
                                <th className="text-right py-3 px-4 font-medium">Время в статусе</th>
                                <th className="text-right py-3 px-4 font-medium">Общее время</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(tasksTimeData.tasks || []).map((t: any) => (
                                <tr key={t.id} className="border-b hover:bg-muted/50">
                                  <td className="py-3 px-4">
                                    <div className="font-medium">{t.title}</div>
                                    <div className="text-xs text-muted-foreground">{t.number}</div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline">{t.status}</Badge>
                                  </td>
                                  <td className="text-right py-3 px-4">{formatDuration(t.timeInStatus || 0)}</td>
                                  <td className="text-right py-3 px-4 font-medium">{formatDuration(t.totalTime || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Время по статусам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={tasksTimeData.timeByStatus || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="status" type="category" width={100} />
                            <Tooltip formatter={(value: number) => formatDuration(value)} />
                            <Bar dataKey="totalSeconds" fill="#3b82f6" name="Время" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Users Report */}
                {activeReport === "users" && usersReport && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Аналитика сотрудников</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4 font-medium">Сотрудник</th>
                                <th className="text-right py-3 px-4 font-medium">Выполнено</th>
                                <th className="text-right py-3 px-4 font-medium">В работе</th>
                                <th className="text-right py-3 px-4 font-medium">Ср. время</th>
                                <th className="text-right py-3 px-4 font-medium">Комментариев</th>
                                <th className="text-right py-3 px-4 font-medium">Общее время</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(usersReport.users || []).map((u: any) => (
                                <tr key={u.id} className="border-b hover:bg-muted/50">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="w-8 h-8">
                                        <AvatarImage src={u.avatar || undefined} />
                                        <AvatarFallback>{u.name?.charAt(0) || 'U'}</AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium">{u.name}</span>
                                    </div>
                                  </td>
                                  <td className="text-right py-3 px-4 text-green-500">{u.completedCount}</td>
                                  <td className="text-right py-3 px-4 text-blue-500">{u.inProgressCount}</td>
                                  <td className="text-right py-3 px-4">{formatDuration(u.avgTime || 0)}</td>
                                  <td className="text-right py-3 px-4">{u.commentsCount}</td>
                                  <td className="text-right py-3 px-4 font-medium">{formatDuration(u.totalTime || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Продуктивность сотрудников</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={usersReport.users || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="completedCount" fill="#10b981" name="Выполнено" />
                            <Bar dataKey="inProgressCount" fill="#3b82f6" name="В работе" />
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
