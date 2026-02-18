import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Shield, 
  Puzzle, 
  ChevronRight,
  Send,
  Save,
  Loader2,
  Globe,
  Lock,
  Eye,
  Settings as SettingsIcon,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Search,
  Filter,
  MoreVertical,
  Mail,
  UserPlus,
  Github,
  Slack,
  MessageCircle,
  Hash,
  Activity,
  Zap,
  ExternalLink,
  Code,
  LayoutGrid,
  Flag,
  Check,
  X,
  Palette,
  Tags
} from "lucide-react";
import { RolesManagement } from "@/components/settings/RolesManagement";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ManagementPage() {
  const [activeSection, setActiveSection] = useState("team");

  const sections = [
    { id: "team", label: "Команда", icon: Users, description: "Участники и приглашения" },
    { id: "projects", label: "Проекты", icon: LayoutGrid, description: "Настройка проектов и приоритетов" },
    { id: "roles", label: "Роли", icon: Shield, description: "Права доступа и разрешения" },
    { id: "integrations", label: "Интеграции", icon: Puzzle, description: "Внешние сервисы и API" },
  ];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Управление
            </h2>
          </div>
          
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className={cn(
                      "w-4 h-4",
                      activeSection === section.id ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    {section.label}
                  </div>
                  {activeSection === section.id && <ChevronRight className="w-3 h-3 opacity-50" />}
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/50 bg-muted/10">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-background/50 border border-border/50">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Администрирование</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          <header className="p-6 border-b border-border/50 shrink-0 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold tracking-tight">
                  {sections.find(s => s.id === activeSection)?.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {sections.find(s => s.id === activeSection)?.description}
                </p>
              </div>
              {activeSection === "team" && (
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Поиск сотрудников..." 
                      className="pl-9 h-9 bg-muted/20 border-border/50 text-xs"
                    />
                  </div>
                  <Button size="sm" variant="outline" className="h-9 gap-2 text-xs border-border/50">
                    <Filter className="w-3.5 h-3.5" />
                    Фильтры
                  </Button>
                  <Button size="sm" className="h-9 gap-2 text-xs shadow-lg shadow-primary/20">
                    <UserPlus className="w-3.5 h-3.5" />
                    Приглашить
                  </Button>
                </div>
              )}
            </div>
          </header>

          <ScrollArea className="flex-1">
            <div className="p-8 max-w-6xl mx-auto">
              {activeSection === "integrations" ? (
                <IntegrationsManagement />
              ) : activeSection === "roles" ? (
                <RolesManagement />
              ) : activeSection === "team" ? (
                <TeamManagement />
              ) : activeSection === "projects" ? (
                <ProjectsManagement />
              ) : (
                <DefaultSection section={sections.find(s => s.id === activeSection)!} />
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </Layout>
  );
}

function IntegrationsManagement() {
  const [showTelegram, setShowTelegram] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const integrations = [
    { 
      id: "telegram", 
      name: "Telegram", 
      desc: "Уведомления в мессенджер через бота", 
      icon: Send, 
      color: "bg-[#0088cc]", 
      connected: true,
      category: "messengers"
    },
    { 
      id: "slack", 
      name: "Slack", 
      desc: "Командная работа и оповещения", 
      icon: Slack, 
      color: "bg-[#4A154B]", 
      connected: false,
      category: "messengers"
    },
    { 
      id: "github", 
      name: "GitHub", 
      desc: "Синхронизация репозиториев", 
      icon: Github, 
      color: "bg-[#24292e]", 
      connected: false,
      category: "dev"
    },
    { 
      id: "jira", 
      name: "Jira", 
      desc: "Управление задачами и спринтами", 
      icon: Activity, 
      color: "bg-[#0052CC]", 
      connected: false,
      category: "management"
    },
    { 
      id: "notion", 
      name: "Notion", 
      desc: "База знаний и документация", 
      icon: Code, 
      color: "bg-black", 
      connected: false,
      category: "management"
    },
    { 
      id: "zapier", 
      name: "Zapier", 
      desc: "Автоматизация рабочих процессов", 
      icon: Zap, 
      color: "bg-[#FF4A00]", 
      connected: false,
      category: "automation"
    },
  ];

  const categories = [
    { id: "all", label: "Все" },
    { id: "messengers", label: "Мессенджеры" },
    { id: "dev", label: "Разработка" },
    { id: "management", label: "Управление" },
    { id: "automation", label: "Автоматизация" },
  ];

  const filteredIntegrations = activeTab === "all" 
    ? integrations 
    : integrations.filter(i => i.category === activeTab);

  if (showTelegram) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
        <Button variant="ghost" size="sm" onClick={() => setShowTelegram(false)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Назад к интеграциям
        </Button>
        <TelegramSettings />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-wrap items-center gap-2 pb-2">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeTab === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              "h-8 text-[11px] font-bold uppercase tracking-wider rounded-full px-4",
              activeTab === cat.id ? "shadow-lg shadow-primary/20" : "border-border/50 text-muted-foreground"
            )}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((item) => (
          <Card key={item.id} className="border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col">
            <div className={cn("absolute top-0 left-0 w-1 h-full", item.connected ? "bg-emerald-500" : "bg-transparent")} />
            <CardContent className="p-6 flex-1">
              <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110 duration-300", item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm tracking-tight">{item.name}</h4>
                    {item.connected && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-bold uppercase tracking-tighter h-4 px-1.5">
                        Активно
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 p-4 flex items-center justify-between border-t border-border/50">
              <div className="flex items-center gap-1.5">
                {!item.connected && (
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Не подключено</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  variant={item.connected ? "outline" : "default"} 
                  size="sm" 
                  className={cn(
                    "h-8 text-xs font-bold px-4",
                    item.connected ? "border-border/50" : "shadow-lg shadow-primary/20"
                  )}
                  onClick={() => item.id === "telegram" && setShowTelegram(true)}
                >
                  {item.connected ? "Настроить" : "Подключить"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-2 border-border/50 bg-transparent shadow-none hover:border-primary/30 transition-colors cursor-pointer group">
        <CardContent className="p-10 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Нужна другая интеграция?</h4>
            <p className="text-xs text-muted-foreground">Напишите нам, и мы добавим нужный вам сервис в ближайшее время</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs font-bold border-border/50">
            Запросить сервис
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamManagement() {
  const { toast } = useToast();
  
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const members = users.map(user => ({
    id: user.id,
    name: (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : user.username,
    role: user.position || "Сотрудник",
    email: user.email,
    department: user.department || "Без отдела",
    status: user.isOnline ? "online" : "offline",
    lastActive: user.lastSeen ? new Date(user.lastSeen).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : "Недавно",
    avatar: user.avatar || ""
  }));

  const invites = [
    { id: 1, email: "hr@teamsync.com", role: "HR-менеджер", sentAt: "24.01.2026", status: "pending" },
    { id: 2, email: "dev-lead@teamsync.com", role: "Админ", sentAt: "23.01.2026", status: "expired" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Все участники ({members.length})
            </h4>
          </div>
          
          <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
            <div className="divide-y divide-border/50">
              {members.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-10 h-10 border border-border/50 shadow-sm ring-2 ring-background">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                          {member.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background shadow-sm",
                        member.status === "online" ? "bg-emerald-500" : "bg-slate-300"
                      )} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">{member.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold uppercase tracking-tighter bg-primary/10 text-primary border-none">
                          {member.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <Mail className="w-3 h-3 opacity-50" />
                          {member.email}
                        </span>
                        <span className="text-[11px] text-muted-foreground">•</span>
                        <span className="text-[11px] text-muted-foreground font-medium">{member.department}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end text-right mr-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Активность</span>
                      <span className="text-[11px] font-medium">{member.lastActive}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background shadow-sm border border-transparent hover:border-border/50">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background shadow-sm border border-transparent hover:border-border/50">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="text-xs font-medium gap-2">
                            <Shield className="w-3.5 h-3.5" /> Изменить роль
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs font-medium gap-2">
                            <Mail className="w-3.5 h-3.5" /> Написать письмо
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs font-medium gap-2 text-rose-500 focus:text-rose-500 focus:bg-rose-50">
                            <Trash2 className="w-3.5 h-3.5" /> Удалить из команды
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
              <Mail className="w-3.5 h-3.5" />
              Приглашения
            </h4>
            <Card className="border-border/50 shadow-sm bg-card/50">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {invites.map((invite) => (
                    <div key={invite.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold truncate max-w-[150px]">{invite.email}</p>
                          <p className="text-[11px] text-muted-foreground font-medium">{invite.role}</p>
                        </div>
                        <Badge 
                          variant={invite.status === "pending" ? "outline" : "secondary"} 
                          className={cn(
                            "text-[9px] uppercase font-bold px-1.5 h-4 border-none",
                            invite.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"
                          )}
                        >
                          {invite.status === "pending" ? "Ожидает" : "Истек"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground">Отправлено: {invite.sentAt}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                            <Send className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-rose-500">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {invites.length === 0 && (
                  <div className="p-8 text-center space-y-2">
                    <Mail className="w-8 h-8 text-muted-foreground opacity-20 mx-auto" />
                    <p className="text-[11px] text-muted-foreground">Нет активных приглашений</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-primary/5 border-primary/20 shadow-none relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <UserPlus className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-bold">Быстрое добавление</CardTitle>
              <CardDescription className="text-[11px]">Отправьте приглашение по email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              <Input 
                placeholder="Email адрес..." 
                className="h-8 text-xs bg-background/50 border-primary/20 focus:border-primary/40 transition-all"
              />
              <Button size="sm" className="w-full h-8 text-xs font-bold gap-2 shadow-sm">
                <Send className="w-3 h-3" />
                Отправить инвайт
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TelegramSettings() {
  const { toast } = useToast();
  const [token, setToken] = useState("");

  const { data: setting } = useQuery<any>({
    queryKey: ["/api/settings/tg_bot_token"],
  });

  useEffect(() => {
    if (setting?.value) {
      setToken(setting.value);
    }
  }, [setting]);

  const mutation = useMutation({
    mutationFn: async (newToken: string) => {
      await apiRequest("POST", "/api/settings", { key: "tg_bot_token", value: newToken });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/tg_bot_token"] });
      toast({
        title: "Интеграция обновлена",
        description: "Настройки Telegram бота успешно сохранены.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки интеграции.",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500 text-white shadow-md shadow-sky-500/20">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base">Telegram уведомления</CardTitle>
              <CardDescription className="text-xs">Бот для системных оповещений</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot-token" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Lock className="w-3 h-3" /> API Токен бота
              </Label>
              <div className="relative group">
                <Input
                  id="bot-token"
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="pr-10 bg-muted/30 border-border/50 focus:bg-background transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 transition-opacity">
                   <Eye className="w-4 h-4 cursor-pointer" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
                <Globe className="w-3 h-3" />
                Получите токен у <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">@BotFather</a>
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 border border-border/50 space-y-3">
              <h5 className="text-xs font-bold flex items-center gap-2 uppercase tracking-tight">
                <SettingsIcon className="w-3 h-3 text-primary" /> Инструкция по настройке
              </h5>
              <ul className="space-y-2">
                {[
                  "Создайте нового бота через @BotFather в Telegram",
                  "Скопируйте полученный HTTP API Token",
                  "Вставьте токен в поле выше и нажмите сохранить",
                  "Теперь система сможет отправлять уведомления"
                ].map((step, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-background border border-border/50 text-[10px] font-bold shrink-0">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 border-t border-border/50 px-6 py-4 flex justify-end">
          <Button 
            onClick={() => mutation.mutate(token)} 
            disabled={mutation.isPending}
            className="gap-2 shadow-lg shadow-primary/20"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить изменения
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function ProjectsManagement() {
  const { toast } = useToast();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", color: "bg-blue-500", priority: "Средний" });

  const priorityDisplayMap: Record<string, string> = {
    "low": "Низкий",
    "medium": "Средний",
    "high": "Высокий",
    "critical": "Критический"
  };

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const res = await apiRequest("POST", "/api/projects", project);
      return res.json();
    },
    onMutate: async (newProjectData) => {
      // Отменяем перезапросы текущих проектов
      await queryClient.cancelQueries({ queryKey: ["/api/projects"] });
      
      // Сохраняем текущие проекты для отката в случае ошибки
      const previousProjects = queryClient.getQueryData(["/api/projects"]);
      
      // Создаем временный проект для оптимистичного обновления
      const tempProject = {
        id: `temp-${Date.now()}`,
        name: newProjectData.name,
        color: newProjectData.color || "#3b82f6",
        priority: newProjectData.priority,
        status: "active",
        boardCount: 0,
        taskCount: 0,
        progress: 100,
        createdAt: new Date().toISOString(),
        ownerId: "current-user",
      };
      
      // Оптимистично добавляем проект в список
      queryClient.setQueryData(["/api/projects"], (old: any[] = []) => [...old, tempProject]);
      
      return { previousProjects };
    },
    onSuccess: (data, variables, context) => {
      // Заменяем временный проект на реальный от сервера
      queryClient.setQueryData(["/api/projects"], (old: any[] = []) => {
        return old.map((p) => (p.id?.startsWith("temp-") ? data : p));
      });
      
      setIsCreateProjectOpen(false);
      setNewProject({ name: "", color: "bg-blue-500", priority: "Средний" });
      toast({
        title: "Проект создан",
        description: "Новый проект успешно добавлен в систему.",
      });
    },
    onError: (error: any, variables, context) => {
      // Возвращаем предыдущие проекты в случае ошибки
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects"], context.previousProjects);
      }
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать проект.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Всегда обновляем данные с сервера
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Проект удален",
        description: "Проект был успешно удален.",
      });
    }
  });

  const handleCreateProject = () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Название проекта не может быть пустым.",
        variant: "destructive",
      });
      return;
    }
    
    // Преобразуем приоритет в английский формат для базы данных, если нужно
    const priorityMap: Record<string, string> = {
      "Низкий": "low",
      "Средний": "medium",
      "Высокий": "high",
      "Критический": "critical"
    };

    const projectToCreate = {
      ...newProject,
      priority: priorityMap[newProject.priority] || "medium"
    };

    console.log("Creating project with data:", projectToCreate);
    createProjectMutation.mutate(projectToCreate);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-primary">
            <LayoutGrid className="w-24 h-24" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight">{projects.length}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Проектов</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/10 shadow-sm overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500">
            <Users className="w-24 h-24" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight">{users.length}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Активных участников</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/10 shadow-sm overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-amber-500">
            <Flag className="w-24 h-24" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600">
                <Flag className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight">{projects.length}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Уровней приоритета</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5" />
            Список проектов ({projects.length})
          </h4>
          <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-2 text-[10px] font-bold uppercase tracking-wider border-border/50">
                <Plus className="w-3 h-3" /> Создать проект
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создать новый проект</DialogTitle>
                <DialogDescription>Введите название и выберите приоритет для нового проекта.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Название проекта</Label>
                  <Input 
                    id="project-name" 
                    placeholder="Введите название проекта" 
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Приоритет проекта</Label>
                  <Select 
                    value={newProject.priority} 
                    onValueChange={(val) => setNewProject({ ...newProject, priority: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Низкий">Низкий</SelectItem>
                      <SelectItem value="Средний">Средний</SelectItem>
                      <SelectItem value="Высокий">Высокий</SelectItem>
                      <SelectItem value="Критический">Критический</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)}>Отмена</Button>
                <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending || !newProject.name}>
                  {createProjectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Создать проект
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
          <div className="divide-y divide-border/50">
            {isLoadingProjects ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground italic">
                Проектов пока нет. Создайте первый проект!
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                      <LayoutGrid className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">{project.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-[11px] text-muted-foreground font-medium">0 участников</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground/40">•</span>
                        <div className="flex items-center gap-1.5">
                          <LayoutGrid className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-[11px] text-muted-foreground font-medium">{project.boardCount || 0} досок</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground/40">•</span>
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-[11px] text-muted-foreground font-medium">{project.taskCount || 0} задач</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="hidden md:flex flex-col w-32 gap-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        <span>Прогресс</span>
                        <span>{project.progress ?? 100}%</span>
                      </div>
                      <Progress value={project.progress ?? 100} className="h-1.5 bg-muted" />
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-bold uppercase px-3 h-6 border-none shadow-sm",
                        project.priority === "high" || project.priority === "critical" ? "bg-rose-500/10 text-rose-600" :
                        project.priority === "medium" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                      )}>
                        {priorityDisplayMap[project.priority] || project.priority || "Средний"}
                      </Badge>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border/50">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100"
                          onClick={() => deleteProjectMutation.mutate(project.id)}
                          disabled={deleteProjectMutation.isPending}
                        >
                          {deleteProjectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <PrioritiesManagement />

      <LabelsManagement />
    </div>
  );
}

function PrioritiesManagement() {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: priorities = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/priorities"],
  });

  const createPriorityMutation = useMutation({
    mutationFn: async (priority: any) => {
      const res = await apiRequest("POST", "/api/priorities", priority);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/priorities"] });
      setNewPriority({ name: "", color: "bg-blue-500", level: 1 });
      toast({ title: "Приоритет создан" });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (priority: any) => {
      const res = await apiRequest("PUT", `/api/priorities/${priority.id}`, priority);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/priorities"] });
      setEditingPriority(null);
      toast({ title: "Приоритет обновлен" });
    },
  });

  const deletePriorityMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/priorities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/priorities"] });
      toast({ title: "Приоритет удален" });
    },
  });

  const [editingPriority, setEditingPriority] = useState<any>(null);
  const [newPriority, setNewPriority] = useState({ name: "", color: "bg-blue-500", level: 1 });

  const handleAddPriority = () => {
    if (!newPriority.name) return;
    createPriorityMutation.mutate(newPriority);
  };

  const handleDeletePriority = (id: string) => {
    deletePriorityMutation.mutate(id);
  };

  const handleUpdatePriority = () => {
    if (!editingPriority) return;
    updatePriorityMutation.mutate(editingPriority);
  };

  const colors = [
    "bg-rose-600", "bg-rose-400", "bg-amber-500", "bg-emerald-500", 
    "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-slate-500"
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-1 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Flag className="w-3.5 h-3.5" />
            Приоритеты задач
          </h4>
          <p className="text-[11px] text-muted-foreground">Настройка глобальных уровней важности для всех задач</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
            onClick={() => {
              // Раскрываем секцию если свернута
              if (isCollapsed) {
                setIsCollapsed(false);
              }
              // Сбрасываем режим редактирования
              setEditingPriority(null);
              // Сбрасываем форму нового приоритета
              setNewPriority({ name: "", color: "bg-blue-500", level: 1 });
              // Фокусируемся на поле ввода названия
              setTimeout(() => {
                const nameInput = document.querySelector('input[placeholder="Напр: Срочно"]') as HTMLInputElement;
                if (nameInput) nameInput.focus();
              }, 100);
            }}
            title="Добавить приоритет"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <ChevronRight 
            className={cn("w-4 h-4 text-muted-foreground transition-transform cursor-pointer", isCollapsed && "rotate-90")} 
            onClick={() => setIsCollapsed(!isCollapsed)}
          />
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Priorities List */}
          <Card className="lg:col-span-2 border-border/50 shadow-sm overflow-hidden bg-card/50">
            <div className="divide-y divide-border/50">
              {isLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : priorities.map((priority) => (
                <div key={priority.id} className="p-3 flex items-center justify-between group hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full shadow-lg ring-2 ring-background", priority.color)} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold tracking-tight">{priority.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Уровень {priority.level}</span>
                        <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                          <div 
                            className={cn("h-full transition-all", priority.color)} 
                            style={{ width: `${(priority.level / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border/50"
                      onClick={() => setEditingPriority({ ...priority })}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100"
                      onClick={() => handleDeletePriority(priority.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Add/Edit Form */}
          <Card className="border-border/50 shadow-xl bg-card relative overflow-hidden flex flex-col h-fit sticky top-8">
            <div className={cn("absolute top-0 left-0 w-full h-1", editingPriority ? editingPriority.color : newPriority.color)} />
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {editingPriority ? (
                  <>
                    <div className={cn("p-1.5 rounded-md bg-primary/10 text-primary")}>
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                    Редактирование
                  </>
                ) : (
                  <>
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    Новый приоритет
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Название</Label>
                <Input 
                  placeholder="Напр: Срочно" 
                  className="h-8 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all"
                  value={editingPriority ? editingPriority.name : newPriority.name}
                  onChange={(e) => editingPriority 
                    ? setEditingPriority({ ...editingPriority, name: e.target.value })
                    : setNewPriority({ ...newPriority, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Уровень важности</Label>
                  <span className="text-xs font-bold text-primary">{editingPriority ? editingPriority.level : newPriority.level}</span>
                </div>
                <Input 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="1"
                  className="h-4 cursor-pointer accent-primary"
                  value={editingPriority ? editingPriority.level : newPriority.level}
                  onChange={(e) => editingPriority 
                    ? setEditingPriority({ ...editingPriority, level: Number(e.target.value) })
                    : setNewPriority({ ...newPriority, level: Number(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Цвет метки</Label>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => editingPriority 
                        ? setEditingPriority({ ...editingPriority, color })
                        : setNewPriority({ ...newPriority, color })
                      }
                      className={cn(
                        "h-6 rounded-md transition-all ring-offset-1 ring-offset-background relative overflow-hidden group/color",
                        color,
                        (editingPriority ? editingPriority.color === color : newPriority.color === color)
                          ? "ring-2 ring-primary scale-105 shadow-sm" 
                          : "hover:scale-105 opacity-70 hover:opacity-100"
                      )}
                    >
                      {(editingPriority ? editingPriority.color === color : newPriority.color === color) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-4 px-4 flex gap-2">
              {editingPriority ? (
                <>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs font-bold border-border/50" onClick={() => setEditingPriority(null)}>
                    Отмена
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs font-bold gap-2 shadow-sm" onClick={handleUpdatePriority}>
                    <Check className="w-3 h-3" /> Сохранить
                  </Button>
                </>
              ) : (
                <Button size="sm" className="w-full h-9 text-xs font-bold gap-2 shadow-sm" onClick={handleAddPriority} disabled={!newPriority.name}>
                  <Plus className="w-3.5 h-3.5" /> Добавить
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}
    </section>
  )
}

function LabelsManagement() {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: labels = [] } = useQuery<any[]>({
    queryKey: ["/api/labels"],
  });

  const createLabelMutation = useMutation({
    mutationFn: async (label: any) => {
      const res = await apiRequest("POST", "/api/labels", label);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      setNewLabel({ name: "", color: "bg-blue-500" });
      setIsLabelDialogOpen(false);
      toast({ title: "Метка создана" });
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: async (label: any) => {
      const res = await apiRequest("PATCH", `/api/labels/${label.id}`, label);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      setEditingLabel(null);
      setIsLabelDialogOpen(false);
      toast({ title: "Метка обновлена" });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/labels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      if (editingLabel) {
        setIsLabelDialogOpen(false);
        setEditingLabel(null);
      }
      toast({ title: "Метка удалена" });
    },
  });

  const [newLabel, setNewLabel] = useState({ name: "", color: "bg-blue-500" });
  const [editingLabel, setEditingLabel] = useState<any>(null);
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);

  const handleAddLabel = () => {
    if (!newLabel.name) return;
    createLabelMutation.mutate(newLabel);
  };

  const handleUpdateLabel = () => {
    if (!editingLabel) return;
    updateLabelMutation.mutate(editingLabel);
  };

  const handleDeleteLabel = (id: string) => {
    deleteLabelMutation.mutate(id);
  };

  const openLabelDialog = (label?: any) => {
    if (label) {
      setEditingLabel(label);
    } else {
      setNewLabel({ name: "", color: "bg-blue-500" });
      setEditingLabel(null);
    }
    setIsLabelDialogOpen(true);
  };

  const colors = [
    "bg-rose-600", "bg-rose-400", "bg-amber-500", "bg-emerald-500", 
    "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-slate-500"
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Tags className="w-3.5 h-3.5" />
            Метки задач
          </h4>
          <p className="text-[11px] text-muted-foreground">Управление метками для категоризации задач</p>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isCollapsed && "rotate-90")} />
      </div>

      {!isCollapsed && (
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
                <DialogTrigger asChild>
                  <button 
                    className="h-8 px-3 rounded-full border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex items-center gap-2 transition-all group"
                    onClick={() => openLabelDialog()}
                  >
                    <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Добавить метку</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingLabel ? "Редактировать метку" : "Новая метка"}</DialogTitle>
                    <DialogDescription>
                      {editingLabel ? "Измените название или цвет метки" : "Создайте новую метку для задач"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Название</Label>
                      <Input
                        id="name"
                        value={editingLabel ? editingLabel.name : newLabel.name}
                        onChange={(e) => editingLabel 
                          ? setEditingLabel({ ...editingLabel, name: e.target.value })
                          : setNewLabel({ ...newLabel, name: e.target.value })
                        }
                        placeholder="Например: Ошибка"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Цвет</Label>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((color) => (
                          <button
                            key={color}
                            onClick={() => editingLabel 
                              ? setEditingLabel({ ...editingLabel, color })
                              : setNewLabel({ ...newLabel, color })
                            }
                            className={cn(
                              "w-6 h-6 rounded-full transition-all ring-offset-2 ring-offset-background relative",
                              color,
                              (editingLabel ? editingLabel.color === color : newLabel.color === color)
                                ? "ring-2 ring-primary scale-110" 
                                : "hover:scale-110 opacity-70 hover:opacity-100"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    {editingLabel && (
                       <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        className="mr-auto"
                        onClick={() => {
                          handleDeleteLabel(editingLabel.id);
                          setIsLabelDialogOpen(false);
                        }}
                      >
                        Удалить
                      </Button>
                    )}
                    <Button onClick={editingLabel ? handleUpdateLabel : handleAddLabel}>
                      {editingLabel ? "Сохранить" : "Создать"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {labels.map((label) => (
                <div
                  key={label.id}
                  className={cn(
                    "h-8 px-3 rounded-full flex items-center gap-2 transition-all cursor-pointer hover:ring-2 ring-offset-2 ring-offset-background ring-primary/20",
                    label.color.replace('bg-', 'bg-').replace('500', '500/10'),
                    label.color.replace('bg-', 'text-').replace('500', '600')
                  )}
                  onClick={() => openLabelDialog(label)}
                >
                  <div className={cn("w-2 h-2 rounded-full", label.color)} />
                  <span className="text-xs font-medium">{label.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </section>
  )
}


function DefaultSection({ section }: { section: { label: string, icon: any, description: string } }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-border/50 shadow-sm border-dashed">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border/50">
            <section.icon className="w-10 h-10 opacity-20" />
          </div>
          <div className="max-w-xs space-y-2">
            <h4 className="font-bold text-lg">Раздел в разработке</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Мы работаем над тем, чтобы добавить настройки для раздела <strong>{section.label}</strong>. Совсем скоро здесь появятся новые возможности.
            </p>
          </div>
          <Button variant="outline" className="border-border/60">
            Узнать больше
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
