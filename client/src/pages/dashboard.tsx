import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MoreHorizontal, 
  ArrowUpRight, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Loader2, 
  AlertCircle,
  Briefcase,
  TrendingUp,
  Users,
  FolderOpen,
  RefreshCw,
  CheckSquare,
  PlayCircle,
  CircleDashed
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, isToday, isPast, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface DashboardData {
  stats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    plannedTasks: number;
    velocity: number;
  };
  todayTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    projectName: string;
  }>;
  performanceData: Array<{
    name: string;
    tasks: number;
  }>;
  teamWorkload: Array<{
    id: string;
    name: string;
    role: string;
    progress: number;
    avatar: string;
  }>;
  recentProjects: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: string;
  }>;
}

export default function Dashboard() {
  const { toast } = useToast();
  
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-semibold">Ошибка загрузки данных</h2>
          <p className="text-muted-foreground">Не удалось загрузить данные dashboard</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </div>
      </Layout>
    );
  }

  const stats = data?.stats || { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, plannedTasks: 0, velocity: 0 };
  const todayTasks = data?.todayTasks || [];
  const performanceData = data?.performanceData || [];
  const teamWorkload = data?.teamWorkload || [];
  const recentProjects = data?.recentProjects || [];

  const getTaskStatusIcon = (status: string) => {
    if (status === 'Готово' || status === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === 'В работе' || status === 'in_progress') return <PlayCircle className="w-4 h-4 text-blue-500" />;
    return <CircleDashed className="w-4 h-4 text-muted-foreground" />;
  };

  const getTaskStatusColor = (status: string) => {
    if (status === 'Готово' || status === 'done') return 'bg-emerald-500';
    if (status === 'В работе' || status === 'in_progress') return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      'high': 'bg-rose-100 text-rose-700 border-rose-200',
      'medium': 'bg-amber-100 text-amber-700 border-amber-200',
      'low': 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return variants[priority] || variants['medium'];
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Обзор</h1>
            <p className="text-muted-foreground mt-1">Добро пожаловать! Вот что происходит сегодня.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="hidden sm:flex"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Обновить
            </Button>

          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" />
                      Всего задач
                    </p>
                  </div>
                  <div className="text-3xl font-bold">{stats.totalTasks}</div>
                </CardContent>
              </Card>
              
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Завершено
                    </p>
                    <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                    </span>
                  </div>
                  <div className="text-3xl font-bold">{stats.completedTasks}</div>
                </CardContent>
              </Card>
              
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-blue-500" />
                      В процессе
                    </p>
                  </div>
                  <div className="text-3xl font-bold">{stats.inProgressTasks}</div>
                </CardContent>
              </Card>
              
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Эффективность
                    </p>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      stats.velocity >= 70 ? "text-emerald-500 bg-emerald-500/10" :
                      stats.velocity >= 40 ? "text-amber-500 bg-amber-500/10" :
                      "text-rose-500 bg-rose-500/10"
                    )}>
                      {stats.velocity}%
                    </span>
                  </div>
                  <div className="text-3xl font-bold">{stats.velocity}%</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          {/* Main Chart */}
          <Card className="col-span-1 lg:col-span-4 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Завершение задач
              </CardTitle>
              <CardDescription>Завершенные задачи за последние 7 дней</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              {isLoading ? (
                <div className="h-[180px] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : performanceData.length === 0 ? (
                <div className="h-[180px] empty-state">
                  <CheckCircle2 className="empty-state-icon" />
                  <h4 className="empty-state-title">Нет данных</h4>
                  <p className="empty-state-desc">Завершенные задачи будут отображаться здесь</p>
                </div>
              ) : (
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: "hsl(var(--muted-foreground))"}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: "hsl(var(--muted-foreground))"}} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Area type="monotone" dataKey="tasks" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card className="col-span-1 lg:col-span-3 border-border/50 shadow-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Фокус на сегодня
              </CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="h-8">
                  Все задачи
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <CheckSquare className="w-12 h-12 mb-2 opacity-30" />
                  <p>На сегодня задач нет</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayTasks.map((task, i) => (
                    <div key={task.id} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-3 h-3 rounded-full border-2 transition-colors",
                          task.status === 'Готово' || task.status === 'done' 
                            ? "bg-emerald-500 border-emerald-500" 
                            : task.status === 'В работе' || task.status === 'in_progress'
                            ? "bg-transparent border-blue-500"
                            : "bg-transparent border-muted-foreground"
                        )} />
                        {i !== todayTasks.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <Link href={`/tasks?taskId=${task.id}`}>
                          <div className="flex items-center justify-between mb-1 cursor-pointer hover:opacity-80">
                            <h4 className={cn(
                              "font-medium text-sm",
                              (task.status === 'Готово' || task.status === 'done') && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </h4>
                            {task.dueDate && isPast(parseISO(task.dueDate)) && task.status !== 'Готово' && (
                              <span className="text-xs text-rose-500 font-medium">Просрочено</span>
                            )}
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                            {task.projectName}
                          </Badge>
                          {task.priority && (
                            <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", getPriorityBadge(task.priority))}>
                              {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Team Workload */}
          <Card className="border-border/50 shadow-sm md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Загруженность команды
              </CardTitle>
              <CardDescription>Прогресс выполнения задач по сотрудникам</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-5">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : teamWorkload.length === 0 ? (
                <div className="empty-state py-8">
                  <Users className="empty-state-icon" />
                  <h4 className="empty-state-title">Нет данных о команде</h4>
                  <p className="empty-state-desc">Добавьте сотрудников, чтобы видеть их загрузку</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {teamWorkload.map((member) => (
                    <Link key={member.id} href="/team">
                      <div className="flex items-center gap-4 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {member.avatar || member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">{member.name}</p>
                            <span className={cn(
                              "text-xs font-medium",
                              member.progress >= 70 ? "text-emerald-500" :
                              member.progress >= 40 ? "text-amber-500" :
                              "text-rose-500"
                            )}>
                              {member.progress}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                          <Progress value={member.progress} className="h-2" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                Проекты
              </CardTitle>
              <CardDescription>Последние созданные проекты</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mb-2 opacity-30" />
                  <p>Нет проектов</p>
                  <Link href="/projects">
                    <Button variant="link" size="sm" className="mt-2">
                      Перейти к проектам
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <Link key={project.id} href={`/projects?projectId=${project.id}`}>
                      <div className="p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(project.createdAt), 'dd MMM yyyy', { locale: ru })}
                            </p>
                          </div>
                          <Badge 
                            variant={project.status === 'active' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {project.status === 'active' ? 'Активен' : 'Архив'}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
