import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, ArrowUpRight, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const performanceData = [
  { name: "Пн", tasks: 12 },
  { name: "Вт", tasks: 18 },
  { name: "Ср", tasks: 15 },
  { name: "Чт", tasks: 25 },
  { name: "Пт", tasks: 22 },
  { name: "Сб", tasks: 10 },
  { name: "Вс", tasks: 5 },
];

export default function Dashboard() {
  const { user } = useUser();
  const userName = user ? `${user.firstName} ${user.lastName}` : "Пользователь";
  
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Обзор</h1>
            <p className="text-muted-foreground mt-1">Доброе утро, {user?.firstName || "Пользователь"}! Вот что происходит сегодня.</p>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="hidden sm:flex">Экспортировать отчёт</Button>
             <Button className="shadow-lg shadow-primary/20">Создать задачу</Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Всего задач", value: "24", change: "+12%", trend: "up" },
            { label: "Завершено", value: "18", change: "+8%", trend: "up" },
            { label: "В процессе", value: "4", change: "-2%", trend: "down" },
            { label: "Скорость команды", value: "92%", change: "+5%", trend: "up" },
          ].map((stat, i) => (
            <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  {stat.trend === "up" ? (
                    <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> {stat.change}
                    </span>
                  ) : (
                    <span className="text-xs text-rose-500 font-medium bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                       {stat.change}
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          {/* Main Chart */}
          <Card className="col-span-1 lg:col-span-4 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Завершение задач</CardTitle>
              <CardDescription>Еженедельный обзор производительности</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
               <div className="h-[300px] w-full">
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
            </CardContent>
          </Card>

          {/* Recent Tasks / Timeline */}
          <Card className="col-span-1 lg:col-span-3 border-border/50 shadow-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Фокус на сегодня</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-6">
                {[
                  { title: "Ревью дизайн-системы", time: "10:00", status: "done", team: "Дизайн" },
                  { title: "Встреча с клиентом - План Q3", time: "11:30", status: "current", team: "Продукт" },
                  { title: "Обновить документацию", time: "14:00", status: "todo", team: "Разработка" },
                  { title: "Синхронизация команды", time: "16:00", status: "todo", team: "Все" },
                ].map((task, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                       <div className={cn(
                         "w-3 h-3 rounded-full border-2",
                         task.status === "done" ? "bg-primary border-primary" :
                         task.status === "current" ? "bg-transparent border-primary animate-pulse" :
                         "bg-transparent border-muted-foreground"
                       )} />
                       {i !== 3 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                       <div className="flex items-center justify-between mb-1">
                         <h4 className={cn("font-medium text-sm", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</h4>
                         <span className="text-xs text-muted-foreground font-mono">{task.time}</span>
                       </div>
                       <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
                         {task.team}
                       </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Activity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/50 shadow-sm md:col-span-2">
            <CardHeader>
              <CardTitle>Загруженность команды</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {[
                  { name: "Алексей Чэнь", role: "Frontend-разработчик", progress: 75, avatar: "АЧ" },
                  { name: "Сара Миллер", role: "Дизайнер", progress: 45, avatar: "СМ" },
                  { name: "Майк Росс", role: "Backend-разработчик", progress: 90, avatar: "МР" },
                ].map((member, i) => (
                   <div key={i} className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium">{member.name}</p>
                          <span className="text-xs text-muted-foreground">{member.progress}%</span>
                        </div>
                        <Progress value={member.progress} className="h-2" />
                      </div>
                   </div>
                ))}
              </div>
            </CardContent>
          </Card>

           <Card className="border-border/50 shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-primary-foreground">Pro План</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Ваша команда растёт быстро! Обновитесь, чтобы разблокировать неограниченные проекты.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <Button variant="secondary" className="w-full font-semibold text-primary">Обновить сейчас</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
