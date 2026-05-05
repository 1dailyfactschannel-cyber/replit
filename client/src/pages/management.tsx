import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
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
  Tags,
  Folder,
  Archive,
  RotateCcw,
  Layers,
  Coins,
  Calendar,
  Phone,
  Video,
  Copy,
  RefreshCw,
  Link,
  UserX,
  Webhook,
  AlertCircle,
  Clock,
  ListChecks,
  ToggleLeft,
  ToggleRight,
  MinusCircle,
  Store,
  Image as ImageIcon,
  Package,
  ShoppingBag,
  Newspaper
} from "lucide-react";
import { RolesManagement } from "@/components/settings/RolesManagement";
import { YandexCalendarConnect, YandexCalendarSettings } from "@/components/integrations/YandexCalendarConnect";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ManagementPage() {
  const { canManage, isAdmin, isLoading } = usePermission();
  const [activeSection, setActiveSection] = useState<string>("");

  const sections = [
    { id: "team", label: "Команда", icon: Users, description: "Участники и приглашения", permission: "management:team" },
    { id: "statuses", label: "Статусы", icon: Activity, description: "Управление статусами пользователей", permission: "management:statuses" },
    { id: "projects", label: "Проекты", icon: LayoutGrid, description: "Настройка проектов и приоритетов", permission: "management:projects" },
    { id: "archive", label: "Архив задач", icon: Archive, description: "Архивированные задачи", permission: "tasks:archive_view" },
    { id: "security", label: "Безопасность", icon: Shield, description: "Настройки безопасности аккаунта", permission: "management:security" },
    { id: "roles", label: "Роли", icon: Shield, description: "Права доступа и разрешения", permission: "management:roles" },
    { id: "calls", label: "Звонки", icon: Phone, description: "Управление звонками и командными залами", permission: "management:calls" },
    { id: "integrations", label: "Интеграции", icon: Puzzle, description: "Внешние сервисы и API", permission: "management:integrations" },
    { id: "balance", label: "Баланс", icon: Coins, description: "Настройка баллов за статусы задач", permission: "management:balance" },
    { id: "shop", label: "Магазин", icon: Store, description: "Управление товарами магазина", permission: "management:shop" },
  ].filter(section => isAdmin || canManage(section.id));

  // Set initial active section or redirect if no permissions
  useEffect(() => {
    if (!isLoading && sections.length > 0) {
      const currentSectionExists = sections.some(s => s.id === activeSection);
      if (!activeSection || !currentSectionExists) {
        setActiveSection(sections[0].id);
      }
    }
  }, [isLoading, sections, activeSection]);

  // Show access denied if user has no management permissions
  if (!isLoading && sections.length === 0) {
    return (
      <Layout>
        <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold">Доступ запрещен</h2>
            <p className="text-muted-foreground">У вас нет прав для доступа к разделу управления</p>
          </div>
        </div>
      </Layout>
    );
  }

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
                  <Button size="sm" variant="secondary" className="h-9 gap-2 text-xs border-border/50">
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
              ) : activeSection === "security" ? (
                <SecurityManagement />
              ) : activeSection === "archive" ? (
                <ArchiveManagement />
              ) : activeSection === "team" ? (
                <TeamManagement />
              ) : activeSection === "statuses" ? (
                <StatusesManagement />
              ) : activeSection === "projects" ? (
                <ProjectsManagement />
              ) : activeSection === "calls" ? (
                <CallsManagement />
              ) : activeSection === "balance" ? (
                <BalanceManagement />
              ) : activeSection === "shop" ? (
                <ShopManagement />
              ) : sections.length > 0 ? (
                <DefaultSection section={sections.find(s => s.id === activeSection) || sections[0]} />
              ) : (
                <div>Нет доступных разделов</div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </Layout>
  );
}

function SecurityManagement() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [isPasswordSet, setIsPasswordSet] = useState<boolean | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { data: hasMasterPassword } = useQuery<any>({
    queryKey: ["/api/settings/master_password_set"],
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (hasMasterPassword !== undefined) {
      setIsPasswordSet(hasMasterPassword?.value === "true");
    }
  }, [hasMasterPassword]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const requestCodeMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Пароли не совпадают");
      }
      if (newPassword.length < 6) {
        throw new Error("Пароль должен быть не менее 6 символов");
      }
      const res = await apiRequest("POST", "/api/settings/request-password-change", {
        currentPassword: isPasswordSet ? currentPassword : null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Код отправлен",
        description: data.message || "Проверьте вашу почту",
      });
      setCodeSent(true);
      setCountdown(60);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить код.",
        variant: "destructive",
      });
    }
  });

  const confirmChangeMutation = useMutation({
    mutationFn: async () => {
      if (!confirmationCode || confirmationCode.length !== 6) {
        throw new Error("Введите 6-значный код");
      }
      const res = await apiRequest("POST", "/api/settings/confirm-password-change", {
        code: confirmationCode,
        newPassword,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Пароль изменен",
        description: data.message || "Мастер-пароль успешно обновлен.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setConfirmationCode("");
      setIsChanging(false);
      setCodeSent(false);
      setIsPasswordSet(true);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/master_password_set"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось подтвердить смену пароля.",
        variant: "destructive",
      });
    }
  });

  const handleRequestCode = () => {
    requestCodeMutation.mutate();
  };

  const handleConfirm = () => {
    confirmChangeMutation.mutate();
  };

  const handleCancel = () => {
    setIsChanging(false);
    setCodeSent(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setConfirmationCode("");
  };

  const canRequestCode =
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword &&
    newPassword.length >= 6 &&
    (!isPasswordSet || currentPassword.length > 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 max-w-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Мастер пароль</CardTitle>
              <CardDescription className="text-xs">
                {isPasswordSet
                  ? "Защитите свои данные дополнительным паролем"
                  : "Установите мастер-пароль для защиты данных"
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPasswordSet === null ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : isChanging || !isPasswordSet ? (
            <div className="space-y-3">
              {!codeSent ? (
                <>
                  {isPasswordSet && (
                    <div className="space-y-2">
                      <Label htmlFor="current-password" className="text-xs font-medium">Текущий пароль</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="Введите текущий пароль"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-background text-foreground"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-xs font-medium">Новый пароль</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Введите новый пароль"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-xs font-medium">Подтвердите пароль</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Повторите пароль"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-background text-foreground"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    {isPasswordSet && (
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                    )}
                    <Button
                      onClick={handleRequestCode}
                      disabled={requestCodeMutation.isPending || !canRequestCode}
                      className="flex-1"
                    >
                      {requestCodeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      <Mail className="w-4 h-4 mr-2" />
                      Получить код
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Код подтверждения отправлен</p>
                      <p className="text-xs text-muted-foreground">
                        На вашу почту отправлен 6-значный код. Введите его ниже, чтобы подтвердить смену пароля.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmation-code" className="text-xs font-medium">Код подтверждения</Label>
                    <Input
                      id="confirmation-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, ""))}
                      className="bg-background text-foreground text-center tracking-[0.5em] font-mono text-lg"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCodeSent(false);
                        setConfirmationCode("");
                      }}
                      className="flex-1"
                    >
                      Назад
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      disabled={confirmChangeMutation.isPending || confirmationCode.length !== 6}
                      className="flex-1"
                    >
                      {confirmChangeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Изменить пароль
                    </Button>
                  </div>
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRequestCode}
                      disabled={countdown > 0 || requestCodeMutation.isPending}
                      className="text-xs text-muted-foreground"
                    >
                      {countdown > 0 ? `Отправить повторно через ${countdown}с` : "Отправить код повторно"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Мастер-пароль установлен</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChanging(true)}
              >
                Изменить
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsManagement() {
  const [showTelegram, setShowTelegram] = useState(false);
  const [showYandexCalendar, setShowYandexCalendar] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
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
      id: "email", 
      name: "Email SMTP", 
      desc: "Email-уведомления о регистрации и смене пароля", 
      icon: Mail, 
      color: "bg-[#EA4335]", 
      connected: false,
      category: "notifications"
    },
    { 
      id: "yandex-calendar", 
      name: "Яндекс Календарь", 
      desc: "Синхронизация событий и встреч", 
      icon: Calendar, 
      color: "bg-[#FC3F1D]", 
      connected: false,
      category: "calendar"
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
    { id: "notifications", label: "Уведомления" },
    { id: "dev", label: "Разработка" },
    { id: "management", label: "Управление" },
    { id: "calendar", label: "Календари" },
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

  if (showYandexCalendar) {
    return (
      <YandexCalendarSettings onBack={() => setShowYandexCalendar(false)} />
    );
  }

  if (showEmail) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
        <Button variant="ghost" size="sm" onClick={() => setShowEmail(false)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Назад к интеграциям
        </Button>
        <EmailSettings />
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
          item.id === "yandex-calendar" ? (
            <YandexCalendarConnect key={item.id} onShowDetails={() => setShowYandexCalendar(true)} />
          ) : (
          <Card key={item.id} hoverable className="border-border/50 shadow-sm group relative overflow-hidden flex flex-col">
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
                  onClick={() => {
                    if (item.id === "telegram") setShowTelegram(true);
                    if (item.id === "email") setShowEmail(true);
                  }}
                >
                  {item.connected ? "Настроить" : "Подключить"}
                </Button>
              </div>
            </CardFooter>
          </Card>
          )
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

function EmailSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from: "",
    fromName: "TeamSync",
  });
  const [testEmail, setTestEmail] = useState("");

  const { data: savedConfig, isLoading } = useQuery<any>({
    queryKey: ["/api/email-config"],
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig((prev) => ({
        ...prev,
        ...savedConfig,
        password: savedConfig.password || "",
      }));
    }
  }, [savedConfig]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof config) => {
      const res = await apiRequest("POST", "/api/email-config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
      toast({ title: "Сохранено", description: "Настройки SMTP обновлены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось сохранить настройки", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/email-config/test", { email });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Успех", description: "Тестовое письмо отправлено" });
      } else {
        toast({ title: "Ошибка отправки", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось отправить тестовое письмо", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#EA4335]" />
            Настройка SMTP
          </CardTitle>
          <CardDescription className="text-xs">
            Настройте сервер исходящей почты для отправки уведомлений пользователям
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">SMTP Сервер (Host)</Label>
              <Input
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="smtp.yandex.ru"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Порт</Label>
              <Input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
                placeholder="587"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Логин / Email</Label>
              <Input
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                placeholder="noreply@example.com"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Пароль / App Token</Label>
              <Input
                type="password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                placeholder={savedConfig?.password ? "••••••••" : "Введите пароль"}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Адрес отправителя (From)</Label>
              <Input
                value={config.from}
                onChange={(e) => setConfig({ ...config, from: e.target.value })}
                placeholder="noreply@example.com"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Имя отправителя</Label>
              <Input
                value={config.fromName}
                onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                placeholder="TeamSync"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="secure"
              checked={config.secure}
              onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
              className="rounded border-border/50"
            />
            <Label htmlFor="secure" className="text-xs cursor-pointer">
              Использовать SSL/TLS (порт 465)
            </Label>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-4 border border-amber-200 dark:border-amber-500/20 space-y-2">
            <h5 className="text-xs font-bold flex items-center gap-2 uppercase tracking-tight text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-3 h-3" /> Примеры настроек
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-amber-700/80 dark:text-amber-400/80">
              <div>
                <strong>Yandex:</strong> smtp.yandex.ru, 465, SSL
              </div>
              <div>
                <strong>Google:</strong> smtp.gmail.com, 587, без SSL (используйте App Password)
              </div>
              <div>
                <strong>Mail.ru:</strong> smtp.mail.ru, 465, SSL
              </div>
              <div>
                <strong>Beget:</strong> smtp.beget.com, 465, SSL
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 border-t border-border/50 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Email для теста"
              className="h-9 text-xs w-full sm:w-56"
            />
            <Button
              onClick={() => testMutation.mutate(testEmail)}
              disabled={testMutation.isPending || !testEmail}
              variant="outline"
              className="h-9 gap-2 shrink-0"
            >
              {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Тест
            </Button>
          </div>
          <Button
            onClick={() => saveMutation.mutate(config)}
            disabled={saveMutation.isPending}
            className="h-9 gap-2 shadow-lg shadow-primary/20"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить настройки
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function ArchiveManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks/archived"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tasks/archived");
      return res.json();
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { archived: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/archived"] });
      toast({ title: "Задача восстановлена", description: "Задача успешно восстановлена из архива" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось восстановить задачу", variant: "destructive" });
    }
  });

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Archive className="w-3.5 h-3.5" />
            Архив задач
          </h4>
          <p className="text-[11px] text-muted-foreground">Задачи, которые были архивированы</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="border-border/50 shadow-sm bg-card/50">
          <CardContent className="p-8 text-center">
            <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Архив пуст</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Здесь будут отображаться архивированные задачи</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
          <div className="divide-y divide-border/50">
            {tasks.map((task: any) => (
              <div key={task.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold">{task.title}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.project?.name || "Проект"}</span>
                    <span>•</span>
                    <span>{task.board?.name || "Доска"}</span>
                    {task.dueDate && (
                      <>
                        <span>•</span>
                        <span>{formatDate(task.dueDate)}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => restoreMutation.mutate(task.id)}
                >
                  <RotateCcw className="w-3 h-3" />
                  Восстановить
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

function TeamManagement() {
  const { toast } = useToast();

  // Department state
  const [departments, setDepartments] = useState<{id: string; name: string; description: string | null; color: string}[]>([]);
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<{id: string; name: string; description: string | null; color: string} | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDescription, setDeptDescription] = useState("");
  const [deptColor, setDeptColor] = useState("#3b82f6");
  
  const deptColors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

  const { data: fetchedDepartments, refetch: refetchDepartments } = useQuery<{id: string; name: string; description: string | null; color: string}[]>({
    queryKey: ["/api/departments"],
  });

  useEffect(() => {
    if (fetchedDepartments) {
      setDepartments(fetchedDepartments);
    }
  }, [fetchedDepartments]);

  const createDeptMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; color: string }) => {
      const res = await apiRequest("POST", "/api/departments", data);
      return res.json();
    },
    onSuccess: () => {
      refetchDepartments();
      toast({ title: "Отдел создан", description: "Отдел успешно создан" });
      resetDeptForm();
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error?.message || "Не удалось создать отдел", variant: "destructive" });
    }
  });

  const updateDeptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description: string; color: string } }) => {
      const res = await apiRequest("PUT", `/api/departments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchDepartments();
      toast({ title: "Отдел обновлён", description: "Отдел успешно обновлён" });
      resetDeptForm();
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error?.message || "Не удалось обновить отдел", variant: "destructive" });
    }
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/departments/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchDepartments();
      toast({ title: "Отдел удалён", description: "Отдел успешно удалён" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error?.message || "Не удалось удалить отдел", variant: "destructive" });
    }
  });

  const resetDeptForm = () => {
    setDeptName("");
    setDeptDescription("");
    setDeptColor("#3b82f6");
    setEditingDept(null);
    setIsDeptDialogOpen(false);
  };

  const handleEditDepartment = (dept: { id: string; name: string; description: string | null; color: string }) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptDescription(dept.description || "");
    setDeptColor(dept.color);
    setIsDeptDialogOpen(true);
  };

  const handleDeleteDepartment = (id: string, name: string) => {
    if (confirm(`Вы уверены, что хотите удалить отдел "${name}"?`)) {
      deleteDeptMutation.mutate(id);
    }
  };

  const handleSaveDepartment = () => {
    if (editingDept) {
      updateDeptMutation.mutate({ id: editingDept.id, data: { name: deptName, description: deptDescription, color: deptColor } });
    } else {
      createDeptMutation.mutate({ name: deptName, description: deptDescription, color: deptColor });
    }
  };

  // Invitations state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  const { data: invitations = [], isLoading: invitationsLoading, refetch: refetchInvitations } = useQuery<any[]>({
    queryKey: ["/api/team/invitations"],
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (data: { email: string; role?: string }) => {
      const res = await apiRequest("POST", "/api/team/invitations", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Не удалось отправить приглашение");
      }
      return res.json();
    },
    onSuccess: (data) => {
      refetchInvitations();
      setInviteEmail("");
      setInviteRole("");
      if (data.emailSent) {
        toast({ title: "Приглашение отправлено", description: "Письмо с приглашением отправлено на указанный email" });
      } else {
        toast({
          title: "Приглашение создано",
          description: "SMTP не настроен — письмо не отправлено. Перейдите в раздел «Управление → Email SMTP» для настройки почты.",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error?.message || "Не удалось отправить приглашение", variant: "destructive" });
    }
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/team/invitations/${id}`, {});
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Не удалось удалить приглашение");
      }
    },
    onSuccess: () => {
      refetchInvitations();
      toast({ title: "Приглашение удалено", description: "Приглашение успешно отменено" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error?.message || "Не удалось удалить приглашение", variant: "destructive" });
    }
  });

  const handleSendInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast({ title: "Ошибка", description: "Введите корректный email адрес", variant: "destructive" });
      return;
    }
    sendInviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole || undefined });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl">
      <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
              <Mail className="w-3.5 h-3.5" />
              Приглашения
            </h4>
            <Card className="border-border/50 shadow-sm bg-card/50">
              <CardContent className="p-0">
                {invitationsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {(invitations || []).map((invite: any) => {
                      const expired = invite.status === "pending" && isExpired(invite.expiresAt);
                      const status = invite.status === "accepted" ? "accepted" : expired ? "expired" : invite.status;
                      return (
                        <div key={invite.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold truncate max-w-[200px]">{invite.email}</p>
                              {invite.role && (
                                <p className="text-[11px] text-muted-foreground font-medium">{invite.role}</p>
                              )}
                              {invite.inviter && (
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <Avatar className="w-4 h-4">
                                    <AvatarImage src={invite.inviter.avatar || undefined} />
                                    <AvatarFallback className="text-[8px] bg-primary/10">
                                      {(invite.inviter.firstName?.[0] || invite.inviter.username?.[0] || "?").toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] text-muted-foreground">
                                    Пригласил: {invite.inviter.firstName || invite.inviter.username || invite.inviter.email}
                                  </span>
                                </div>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] uppercase font-bold px-1.5 h-4 border-none shrink-0",
                                status === "pending" && "bg-amber-500/10 text-amber-600",
                                status === "accepted" && "bg-emerald-500/10 text-emerald-600",
                                status === "expired" && "bg-rose-500/10 text-rose-600"
                              )}
                            >
                              {status === "pending" ? "Ожидает" : status === "accepted" ? "Принят" : "Истек"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {invite.createdAt ? `Отправлено: ${formatDate(invite.createdAt)}` : "—"}
                            </span>
                            <div className="flex items-center gap-1">
                              {status === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                                  onClick={() => {
                                    if (confirm("Отменить приглашение?")) {
                                      deleteInviteMutation.mutate(invite.id);
                                    }
                                  }}
                                  disabled={deleteInviteMutation.isPending}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!invitationsLoading && (invitations || []).length === 0 && (
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
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                className="h-8 text-xs bg-background/50 border-primary/20 focus:border-primary/40 transition-all"
              />
              <Input
                placeholder="Роль (необязательно)..."
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                className="h-8 text-xs bg-background/50 border-primary/20 focus:border-primary/40 transition-all"
              />
              <Button
                size="sm"
                className="w-full h-8 text-xs font-bold gap-2 shadow-sm"
                onClick={handleSendInvite}
                disabled={sendInviteMutation.isPending}
              >
                {sendInviteMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                Отправить инвайт
              </Button>
            </CardContent>
          </Card>

          {/* Departments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Отделы
              </h4>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsDeptDialogOpen(true)}>
                <Plus className="w-3 h-3" />
                Добавить
              </Button>
            </div>
            
            <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {departments.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <Users className="w-8 h-8 text-muted-foreground opacity-20 mx-auto" />
                      <p className="text-[11px] text-muted-foreground">Нет отделов. Создайте первый отдел.</p>
                    </div>
                  ) : (
                    departments.map((dept) => (
                      <div key={dept.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: dept.color }}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{dept.name}</span>
                            {dept.description && (
                              <span className="text-[11px] text-muted-foreground">{dept.description}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditDepartment(dept)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                            onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Department Dialog */}
      <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? "Редактировать отдел" : "Новый отдел"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Например: Разработка"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
                placeholder="Краткое описание отдела"
              />
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2 flex-wrap">
                {deptColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      deptColor === c && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setDeptColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeptDialogOpen(false); resetDeptForm(); }}>
              Отмена
            </Button>
            <Button
              onClick={handleSaveDepartment}
              disabled={!deptName || createDeptMutation.isPending || updateDeptMutation.isPending}
            >
              {createDeptMutation.isPending || updateDeptMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingDept ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewsManagement />
    </div>
  );
}

function NewsManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: newsList = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/news"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const res = await apiRequest("POST", "/api/news", data);
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Новость создана", description: "Черновик новости сохранён" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error?.message || "Не удалось создать новость", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/news/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Новость обновлена", description: "Изменения сохранены" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error?.message || "Не удалось обновить новость", variant: "destructive" });
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/news/${id}/publish`, {});
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Опубликовано", description: "Новость отправлена всем пользователям" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error?.message || "Не удалось опубликовать", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/news/${id}`, {});
      if (!res.ok) throw new Error("Failed to delete news");
      return { success: true };
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Новость удалена", description: "Новость успешно удалена" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error?.message || "Не удалось удалить новость", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEditingNews(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: any) => {
    setEditingNews(item);
    setTitle(item.title);
    setContent(item.content);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingNews) {
      updateMutation.mutate({ id: editingNews.id, data: { title, content } });
    } else {
      createMutation.mutate({ title, content });
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Вы уверены, что хотите удалить новость "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Newspaper className="w-3.5 h-3.5" />
          Управление новостями
        </h4>
        <Button size="sm" className="h-8 gap-2 text-xs" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Создать
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm bg-card/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : newsList.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Newspaper className="w-8 h-8 text-muted-foreground opacity-20 mx-auto" />
              <p className="text-[11px] text-muted-foreground">Нет новостей. Создайте первую новость.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {newsList.map((item: any) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.isPublished ? (
                          <Badge variant="outline" className="text-[10px] h-5 border-green-200 text-green-600 bg-green-50">Опубликовано</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-5 border-amber-200 text-amber-600 bg-amber-50">Черновик</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{item.content}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        <span>{item.authorName || "Неизвестный автор"}</span>
                        <span>·</span>
                        <span>{formatDate(item.publishedAt || item.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!item.isPublished && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-green-600"
                          onClick={() => publishMutation.mutate(item.id)}
                          disabled={publishMutation.isPending}
                          title="Опубликовать"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(item)}
                        title="Редактировать"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        onClick={() => handleDelete(item.id, item.title)}
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNews ? "Редактировать новость" : "Новая новость"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Заголовок новости"
              />
            </div>
            <div className="space-y-2">
              <Label>Содержание</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Текст новости..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || !content.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingNews ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  const webhookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/telegram-webhook");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Webhook установлен",
        description: data.message || "Telegram webhook успешно настроен.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось установить webhook. Проверьте токен и APP_URL.",
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

            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-4 border border-amber-200 dark:border-amber-500/20 space-y-2">
              <h5 className="text-xs font-bold flex items-center gap-2 uppercase tracking-tight text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" /> Важно: APP_URL
              </h5>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                Для работы webhook убедитесь, что в переменных окружения сервера задан <code className="bg-amber-100 dark:bg-amber-500/20 px-1 py-0.5 rounded font-mono text-[10px]">APP_URL</code> — публичный адрес вашего приложения (например, <code className="bg-amber-100 dark:bg-amber-500/20 px-1 py-0.5 rounded font-mono text-[10px]">https://portal.m4bank.ru</code>). Webhook устанавливается автоматически при старте сервера. Если адрес изменился — нажмите кнопку ниже.
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
                  "Убедитесь, что задана переменная APP_URL в окружении сервера",
                  "Нажмите «Установить webhook» или перезапустите сервер"
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
        <CardFooter className="bg-muted/20 border-t border-border/50 px-6 py-4 flex justify-end gap-2">
          <Button
            onClick={() => webhookMutation.mutate()}
            disabled={webhookMutation.isPending || !token}
            variant="outline"
            className="gap-2"
          >
            {webhookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
            Установить webhook
          </Button>
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

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  isDefault: boolean;
  sortOrder: number;
}

function StatusesManagement() {
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CustomStatus | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [isDefault, setIsDefault] = useState(false);

  const { data: fetchedStatuses, isLoading, refetch } = useQuery<CustomStatus[]>({
    queryKey: ["/api/custom-statuses"],
  });

  useEffect(() => {
    if (fetchedStatuses) {
      setStatuses(fetchedStatuses);
    }
  }, [fetchedStatuses]);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; isDefault: boolean }) => {
      const res = await apiRequest("POST", "/api/custom-statuses", data);
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomStatus> }) => {
      const res = await apiRequest("PUT", `/api/custom-statuses/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/custom-statuses/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/custom-statuses/${id}/set-default`, {});
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const resetForm = () => {
    setName("");
    setColor("#22c55e");
    setIsDefault(false);
    setEditingStatus(null);
  };

  const handleOpenDialog = (status?: CustomStatus) => {
    if (status) {
      setEditingStatus(status);
      setName(status.name);
      setColor(status.color);
      setIsDefault(status.isDefault);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingStatus) {
      updateMutation.mutate({ id: editingStatus.id, data: { name, color, isDefault } });
    } else {
      createMutation.mutate({ name, color, isDefault });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот статус?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  const colors = [
    "#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", 
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Статусы пользователей</h2>
          <p className="text-muted-foreground mt-1">Создавайте и управляйте статусами для сотрудников</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Добавить статус
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : statuses.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <Activity className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Нет статусов. Создайте первый статус.</p>
            </CardContent>
          </Card>
        ) : (
          statuses.map((status) => (
            <Card key={status.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <div>
                    <p className="font-medium">{status.name}</p>
                    {status.isDefault && (
                      <span className="text-xs text-muted-foreground">По умолчанию</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!status.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(status.id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      По умолчанию
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(status)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(status.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Редактировать статус" : "Новый статус"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Занят"
              />
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      color === c && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="isDefault">Статус по умолчанию</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingStatus ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectsManagement() {
  const { toast } = useToast();
  const { hasPermission, isAdmin } = usePermission();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [newProjectWorkspaceId, setNewProjectWorkspaceId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: "", color: "bg-blue-500", priority: "Средний" });
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteMasterPassword, setDeleteMasterPassword] = useState("");
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [isEditWorkspaceOpen, setIsEditWorkspaceOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: "", color: "#3b82f6" });
  const [selectedWorkspaceForMembers, setSelectedWorkspaceForMembers] = useState<any>(null);
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<string>("");
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("");

  const priorityDisplayMap: Record<string, string> = {
    "low": "Низкий",
    "medium": "Средний",
    "high": "Высокий",
    "critical": "Критический"
  };

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<any[]>({
    queryKey: ["/api/projects", selectedWorkspaceId],
    queryFn: async () => {
      const url = selectedWorkspaceId 
        ? `/api/projects?workspaceId=${selectedWorkspaceId}` 
        : "/api/projects";
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const { data: workspacesRaw } = useQuery<any[]>({
    queryKey: ["/api/workspaces", isAdmin || hasPermission("management:workspace_members") ? "all" : "filtered"],
    queryFn: async () => {
      const useAdminEndpoint = isAdmin || hasPermission("management:workspace_members");
      const res = await apiRequest("GET", useAdminEndpoint ? "/api/workspaces/all" : "/api/workspaces");
      return res.json();
    },
  });
  const workspaces = workspacesRaw ?? [];

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: workspaceMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/workspaces", selectedWorkspaceForMembers?.id, "members"],
    queryFn: async () => {
      if (!selectedWorkspaceForMembers?.id) return [];
      const res = await apiRequest("GET", `/api/workspaces/${selectedWorkspaceForMembers.id}/members`);
      return res.json();
    },
    enabled: !!selectedWorkspaceForMembers?.id,
  });

  const addWorkspaceMemberMutation = useMutation({
    mutationFn: async ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role?: string }) => {
      const res = await apiRequest("POST", `/api/workspaces/${workspaceId}/members`, { userId, role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", selectedWorkspaceForMembers?.id, "members"] });
      setSelectedMemberUserId("");
      toast({ title: "Участник добавлен", description: "Пользователь успешно добавлен в пространство." });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось добавить участника", variant: "destructive" });
    },
  });

  const removeWorkspaceMemberMutation = useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      await apiRequest("DELETE", `/api/workspaces/${workspaceId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", selectedWorkspaceForMembers?.id, "members"] });
      toast({ title: "Участник удален", description: "Пользователь удален из пространства." });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить участника", variant: "destructive" });
    },
  });

  const canManageWorkspaceMembers = (workspace: any) => {
    if (isAdmin) return true;
    if (workspace.ownerId === currentUser?.id) return true;
    return hasPermission("management:workspace_members");
  };

  useEffect(() => {
    if (!selectedWorkspaceForMembers) {
      setMemberSearchQuery("");
      setSelectedMemberUserId("");
    }
  }, [selectedWorkspaceForMembers]);

  const createProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const res = await apiRequest("POST", "/api/projects", project);
      return res.json();
    },
    onMutate: async (newProjectData) => {
      // Отменяем перезапросы текущих проектов
      await queryClient.cancelQueries({ queryKey: ["/api/projects", selectedWorkspaceId] });
      
      // Сохраняем текущие проекты для отката в случае ошибки
      const previousProjects = queryClient.getQueryData(["/api/projects", selectedWorkspaceId]);
      
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
        workspaceId: newProjectData.workspaceId,
      };
      
      // Оптимистично добавляем проект в список
      queryClient.setQueryData(["/api/projects", selectedWorkspaceId], (old: any[] = []) => [...old, tempProject]);
      
      return { previousProjects };
    },
    onSuccess: (data, variables, context) => {
      // Заменяем временный проект на реальный от сервера
      queryClient.setQueryData(["/api/projects", selectedWorkspaceId], (old: any[] = []) => {
        return old.map((p) => (p.id?.startsWith("temp-") ? data : p));
      });
      
      setIsCreateProjectOpen(false);
      setNewProject({ name: "", color: "bg-blue-500", priority: "Средний" });
      setNewProjectWorkspaceId(null);
      toast({
        title: "Проект создан",
        description: "Новый проект успешно добавлен в систему.",
      });
    },
    onError: (error: any, variables, context) => {
      // Возвращаем предыдущие проекты в случае ошибки
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects", selectedWorkspaceId], context.previousProjects);
      }
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать проект.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Всегда обновляем данные с сервера
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedWorkspaceId] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async ({ id, masterPassword }: { id: string; masterPassword: string }) => {
      await apiRequest("DELETE", `/api/projects/${id}`, { masterPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedWorkspaceId] });
      setProjectToDelete(null);
      setDeleteMasterPassword("");
      toast({
        title: "Проект удален",
        description: "Проект был успешно удален.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить проект. Проверьте мастер-пароль.",
        variant: "destructive",
      });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/projects", selectedWorkspaceId] });
      
      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData(["/api/projects", selectedWorkspaceId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/projects", selectedWorkspaceId], (old: any[] = []) => {
        const updated = old.map((project) => 
          project.id === id 
            ? { ...project, ...data, updatedAt: new Date().toISOString() }
            : project
        );
        return updated;
      });
      
      // Return a context object with the snapshotted value
      return { previousProjects };
    },
    onError: (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects", selectedWorkspaceId], context.previousProjects);
      }
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить проект.",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      // Update with the actual server data
      queryClient.setQueryData(["/api/projects", selectedWorkspaceId], (old: any[] = []) => {
        const updated = old.map((project) => 
          project.id === variables.id 
            ? { ...project, ...data }
            : project
        );
        return updated;
      });
      setIsEditProjectOpen(false);
      setEditingProject(null);
      toast({
        title: "Проект обновлен",
        description: "Изменения успешно сохранены.",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedWorkspaceId] });
    }
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/workspaces/${id}`, data);
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/workspaces"] });
      
      const previousWorkspaces = queryClient.getQueryData(["/api/workspaces"]);
      
      queryClient.setQueryData(["/api/workspaces"], (old: any[] = []) => {
        return old.map((workspace) => 
          workspace.id === id 
            ? { ...workspace, ...data, updatedAt: new Date().toISOString() }
            : workspace
        );
      });
      
      return { previousWorkspaces };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(["/api/workspaces"], context.previousWorkspaces);
      }
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить пространство.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      setIsEditWorkspaceOpen(false);
      setEditingWorkspace(null);
      toast({
        title: "Пространство обновлено",
        description: "Изменения успешно сохранены.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
    }
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (workspace: any) => {
      const res = await apiRequest("POST", "/api/workspaces", workspace);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setIsCreateWorkspaceOpen(false);
      setNewWorkspace({ name: "", color: "#3b82f6" });
      toast({
        title: "Пространство создано",
        description: "Новое пространство успешно добавлено.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать пространство.",
        variant: "destructive",
      });
    }
  });

  const handleDeleteProject = () => {
    if (!projectToDelete) return;
    deleteProjectMutation.mutate({ 
      id: projectToDelete.id, 
      masterPassword: deleteMasterPassword 
    });
  };

  const handleUpdateProject = () => {
    if (!editingProject || !editingProject.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Название проекта не может быть пустым.",
        variant: "destructive",
      });
      return;
    }

    const priorityMap: Record<string, string> = {
      "Низкий": "low",
      "Средний": "medium",
      "Высокий": "high",
      "Критический": "critical"
    };

    const updateData = {
      id: editingProject.id,
      data: {
        name: editingProject.name,
        priority: priorityMap[editingProject.priority] || editingProject.priority,
        workspaceId: editingProject.workspaceId
      }
    };
    updateProjectMutation.mutate(updateData);
  };

  const openEditDialog = (project: any) => {
    const priorityReverseMap: Record<string, string> = {
      "low": "Низкий",
      "medium": "Средний",
      "high": "Высокий",
      "critical": "Критический"
    };

    setEditingProject({
      ...project,
      priority: priorityReverseMap[project.priority] || project.priority || "Средний"
    });
    setIsEditProjectOpen(true);
  };

  const handleUpdateWorkspace = () => {
    if (!editingWorkspace || !editingWorkspace.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Название пространства не может быть пустым.",
        variant: "destructive",
      });
      return;
    }

    updateWorkspaceMutation.mutate({
      id: editingWorkspace.id,
      data: {
        name: editingWorkspace.name,
        color: editingWorkspace.color
      }
    });
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspace.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Название пространства не может быть пустым.",
        variant: "destructive",
      });
      return;
    }

    createWorkspaceMutation.mutate(newWorkspace);
  };

  const openEditWorkspaceDialog = (workspace: any) => {
    setEditingWorkspace({ ...workspace });
    setIsEditWorkspaceOpen(true);
  };

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
      priority: priorityMap[newProject.priority] || "medium",
      workspaceId: newProjectWorkspaceId
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

      {/* Workspaces Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" />
              Пространства
            </h4>
            <p className="text-[11px] text-muted-foreground">Создание проектов в пространствах</p>
          </div>
          <Button 
            size="sm" 
            className="h-7 gap-1.5 text-[10px] font-bold"
            onClick={() => setIsCreateWorkspaceOpen(true)}
          >
            <Plus className="w-3 h-3" />
            Создать
          </Button>
        </div>
        
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
          <CardContent className="p-4">
            <div className="space-y-3">
              {workspaces.length === 0 ? (
                <div className="empty-state py-8">
                  <Folder className="empty-state-icon" />
                  <h4 className="empty-state-title">Пространств пока нет</h4>
                  <p className="empty-state-desc">Создайте первое пространство, чтобы начать организовывать проекты</p>
                  <Button size="sm" onClick={() => setIsCreateWorkspaceOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Создать пространство
                  </Button>
                </div>
              ) : (
                workspaces.map((workspace: any) => {
                  const projectCount = projects.filter((p: any) => p.workspaceId === workspace.id).length;
                  return (
                    <div 
                      key={workspace.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: workspace.color || '#3b82f6' }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{workspace.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {projectCount} {projectCount === 1 ? 'проект' : projectCount >= 2 && projectCount <= 4 ? 'проекта' : 'проектов'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {canManageWorkspaceMembers(workspace) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedWorkspaceForMembers(workspace)}
                            title="Участники"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditWorkspaceDialog(workspace)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedWorkspaceId(workspace.id);
                            setIsCreateProjectOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Проект
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Projects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <LayoutGrid className="w-3.5 h-3.5" />
              Список проектов ({projects.length})
            </h4>
            {/* Workspace filter */}
            <Select value={selectedWorkspaceId || "all"} onValueChange={(val) => setSelectedWorkspaceId(val === "all" ? null : val)}>
              <SelectTrigger className="h-8 w-48 text-xs bg-background border-input text-foreground">
                <SelectValue placeholder="Все пространства" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пространства</SelectItem>
                {workspaces.map((workspace: any) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: workspace.color || '#3b82f6' }} />
                      {workspace.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-2 text-[10px] font-bold uppercase tracking-wider">
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
                    className="bg-background text-foreground"
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Пространство</Label>
                  <Select 
                    value={newProjectWorkspaceId || "none"} 
                    onValueChange={(val) => setNewProjectWorkspaceId(val === "none" ? null : val)}
                  >
                    <SelectTrigger className="bg-background text-foreground">
                      <SelectValue placeholder="Без пространства" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без пространства</SelectItem>
                      {workspaces.map((workspace: any) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: workspace.color || '#3b82f6' }} />
                            {workspace.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Приоритет проекта</Label>
                  <Select 
                    value={newProject.priority} 
                    onValueChange={(val) => setNewProject({ ...newProject, priority: val })}
                  >
                    <SelectTrigger className="bg-background text-foreground">
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
                <Button onClick={() => handleCreateProject()} disabled={createProjectMutation.isPending || !newProject.name}>
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
              <div className="empty-state py-8">
                <LayoutGrid className="empty-state-icon" />
                <h4 className="empty-state-title">Проектов пока нет</h4>
                <p className="empty-state-desc">Создайте первый проект и начните работу с командой</p>
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                      <LayoutGrid className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">{project.name}</span>
                        {project.workspaceId && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                            <Folder className="w-3 h-3 mr-1" />
                            {workspaces.find((w: any) => w.id === project.workspaceId)?.name || 'Пространство'}
                          </Badge>
                        )}
                      </div>
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border/50"
                          onClick={() => openEditDialog(project)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100"
                          onClick={() => setProjectToDelete({ id: project.id, name: project.name })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-rose-500 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Удаление проекта
              </DialogTitle>
              <DialogDescription className="text-foreground">
                Вы собираетесь удалить проект <strong>"{projectToDelete?.name}"</strong>. 
                Все связанные доски и задачи также будут удалены. Это действие необратимо.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-600 font-medium">
                  Внимание! В выбранном проекте все задачи будут удалены навсегда!
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-master-password" className="text-xs font-medium">Мастер пароль</Label>
                <Input 
                  id="delete-master-password" 
                  type="password"
                  placeholder="Введите мастер пароль" 
                  value={deleteMasterPassword}
                  onChange={(e) => setDeleteMasterPassword(e.target.value)}
                  className="bg-background text-foreground"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteMasterPassword) {
                      handleDeleteProject();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setProjectToDelete(null);
                setDeleteMasterPassword("");
              }}>
                Отмена
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteProject}
                disabled={deleteProjectMutation.isPending || !deleteMasterPassword}
              >
                {deleteProjectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Удалить проект
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Редактирование проекта
              </DialogTitle>
              <DialogDescription>
                Внесите изменения в проект "{editingProject?.name}".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-project-name">Название проекта</Label>
                <Input 
                  id="edit-project-name" 
                  placeholder="Введите название проекта" 
                  value={editingProject?.name || ""}
                  className="bg-background text-foreground"
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Пространство</Label>
                <Select 
                  value={editingProject?.workspaceId || "none"} 
                  onValueChange={(val) => setEditingProject({ ...editingProject, workspaceId: val === "none" ? null : val })}
                >
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder="Без пространства" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без пространства</SelectItem>
                    {workspaces.map((workspace: any) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: workspace.color || '#3b82f6' }} />
                          {workspace.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Приоритет проекта</Label>
                <Select 
                  value={editingProject?.priority || "Средний"} 
                  onValueChange={(val) => setEditingProject({ ...editingProject, priority: val })}
                >
                  <SelectTrigger className="bg-background text-foreground">
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
              <Button variant="outline" onClick={() => {
                setIsEditProjectOpen(false);
                setEditingProject(null);
              }}>
                Отмена
              </Button>
              <Button 
                onClick={handleUpdateProject}
                disabled={updateProjectMutation.isPending || !editingProject?.name?.trim()}
              >
                {updateProjectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Сохранить изменения
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Workspace Dialog */}
        <Dialog open={isEditWorkspaceOpen} onOpenChange={setIsEditWorkspaceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Редактирование пространства
              </DialogTitle>
              <DialogDescription>
                Внесите изменения в пространство "{editingWorkspace?.name}".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-workspace-name">Название пространства</Label>
                <Input 
                  id="edit-workspace-name" 
                  placeholder="Введите название пространства" 
                  value={editingWorkspace?.name || ""}
                  className="bg-background text-foreground"
                  onChange={(e) => setEditingWorkspace({ ...editingWorkspace, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Цвет пространства</Label>
                <div className="flex gap-2 flex-wrap">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditingWorkspace({ ...editingWorkspace, color })}
                      className={`w-8 h-8 rounded-full transition-all ${editingWorkspace?.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditWorkspaceOpen(false);
                setEditingWorkspace(null);
              }}>
                Отмена
              </Button>
              <Button 
                onClick={handleUpdateWorkspace}
                disabled={updateWorkspaceMutation.isPending || !editingWorkspace?.name?.trim()}
              >
                {updateWorkspaceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Сохранить изменения
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Workspace Dialog */}
        <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Создать пространство
              </DialogTitle>
              <DialogDescription>
                Создайте новое пространство для организации проектов.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-workspace-name">Название пространства</Label>
                <Input 
                  id="new-workspace-name" 
                  placeholder="Введите название пространства" 
                  value={newWorkspace.name}
                  className="bg-background text-foreground"
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Цвет пространства</Label>
                <div className="flex gap-2 flex-wrap">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewWorkspace({ ...newWorkspace, color })}
                      className={`w-8 h-8 rounded-full transition-all ${newWorkspace.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateWorkspaceOpen(false);
                setNewWorkspace({ name: "", color: "#3b82f6" });
              }}>
                Отмена
              </Button>
              <Button 
                onClick={handleCreateWorkspace}
                disabled={createWorkspaceMutation.isPending || !newWorkspace.name.trim()}
              >
                {createWorkspaceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Создать пространство
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Workspace Members Dialog */}
      <Dialog open={!!selectedWorkspaceForMembers} onOpenChange={(open) => !open && setSelectedWorkspaceForMembers(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Участники пространства "{selectedWorkspaceForMembers?.name}"</DialogTitle>
            <DialogDescription>Управление доступом пользователей к пространству</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add member */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Поиск пользователя..."
                  className="h-9 pl-9 bg-secondary/50 border-none text-xs"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedMemberUserId} onValueChange={setSelectedMemberUserId}>
                  <SelectTrigger className="flex-1 bg-background text-foreground">
                    <SelectValue placeholder="Выберите пользователя..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u: any) => u.id !== selectedWorkspaceForMembers?.ownerId)
                      .filter((u: any) => {
                        const query = memberSearchQuery.toLowerCase();
                        const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
                        const email = (u.email || "").toLowerCase();
                        return name.includes(query) || email.includes(query);
                      })
                      .map((user: any) => {
                        const isAlreadyMember = workspaceMembers.some((m: any) => m.userId === user.id);
                        return (
                          <SelectItem key={user.id} value={user.id} disabled={isAlreadyMember}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={user.avatar || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {user.firstName?.[0] || user.email?.[0]}
                                  {user.lastName?.[0] || ""}
                                </AvatarFallback>
                              </Avatar>
                              <span className={isAlreadyMember ? "text-muted-foreground" : ""}>
                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                                {isAlreadyMember && (
                                  <span className="ml-1 text-[10px] text-muted-foreground">(уже добавлен)</span>
                                )}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!selectedMemberUserId || workspaceMembers.some((m: any) => m.userId === selectedMemberUserId) || addWorkspaceMemberMutation.isPending}
                  onClick={() => {
                    if (selectedWorkspaceForMembers && selectedMemberUserId) {
                      addWorkspaceMemberMutation.mutate({
                        workspaceId: selectedWorkspaceForMembers.id,
                        userId: selectedMemberUserId,
                      });
                    }
                  }}
                >
                  {addWorkspaceMemberMutation.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  Добавить
                </Button>
              </div>
            </div>

            {/* Members list */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {/* Owner */}
              {selectedWorkspaceForMembers?.ownerId && (
                <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={users.find((u: any) => u.id === selectedWorkspaceForMembers.ownerId)?.avatar ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {users.find((u: any) => u.id === selectedWorkspaceForMembers.ownerId)?.firstName?.[0] || users.find((u: any) => u.id === selectedWorkspaceForMembers.ownerId)?.email?.[0]}
                        {users.find((u: any) => u.id === selectedWorkspaceForMembers.ownerId)?.lastName?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {(() => {
                          const owner = users.find((u: any) => u.id === selectedWorkspaceForMembers.ownerId);
                          return owner?.firstName && owner?.lastName ? `${owner.firstName} ${owner.lastName}` : owner?.email;
                        })()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Владелец</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Members */}
              {workspaceMembers.map((member: any) => (
                <div key={member.userId} className="flex items-center justify-between p-2 rounded-md border border-border/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={member.user?.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.user?.firstName?.[0] || member.user?.email?.[0]}
                        {member.user?.lastName?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {member.user?.firstName && member.user?.lastName ? `${member.user.firstName} ${member.user.lastName}` : member.user?.email}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">{member.role}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (selectedWorkspaceForMembers) {
                        removeWorkspaceMemberMutation.mutate({
                          workspaceId: selectedWorkspaceForMembers.id,
                          userId: member.userId,
                        });
                      }
                    }}
                    disabled={removeWorkspaceMemberMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {workspaceMembers.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Кроме владельца, участников пока нет
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWorkspaceForMembers(null)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrioritiesManagement />

      <LabelsManagement />

      <TaskTypesManagement />
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
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Tags className="w-3.5 h-3.5" />
            Метки задач
          </h4>
          <p className="text-[11px] text-foreground">Управление метками для категоризации задач</p>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-foreground transition-transform", isCollapsed && "rotate-90")} />
      </div>

      {!isCollapsed && (
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="h-8 px-3 rounded-sm border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex items-center gap-2 transition-all group"
                    onClick={() => openLabelDialog()}
                  >
                    <Plus className="w-3.5 h-3.5 text-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">Добавить метку</span>
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

              {labels.map((label) => {
                const getColors = (color: string) => {
                  if (color.includes('red') || color.includes('rose')) return { bg: '#fef2f2', text: '#dc2626' };
                  if (color.includes('blue')) return { bg: '#dbeafe', text: '#2563eb' };
                  if (color.includes('green') || color.includes('emerald')) return { bg: '#dcfce7', text: '#16a34a' };
                  if (color.includes('yellow') || color.includes('amber')) return { bg: '#fef9c3', text: '#ca8a04' };
                  if (color.includes('purple') || color.includes('indigo')) return { bg: '#f3e8ff', text: '#9333ea' };
                  if (color.includes('pink')) return { bg: '#fce7f3', text: '#db2777' };
                  if (color.includes('orange')) return { bg: '#ffedd5', text: '#ea580c' };
                  if (color.includes('gray') || color.includes('slate')) return { bg: '#f1f5f9', text: '#475569' };
                  return { bg: '#f1f5f9', text: '#475569' };
                };
                const colors = getColors(label.color);
                return (
                <div
                  key={label.id}
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                  className="h-8 px-3 rounded-sm flex items-center gap-2 transition-all cursor-pointer hover:ring-2 ring-offset-2 ring-offset-background ring-primary/20"
                  onClick={() => openLabelDialog(label)}
                >
                  <span className="text-xs font-medium">{label.name}</span>
                </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </section>
  )
}

function TaskTypesManagement() {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: taskTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/task-types"],
  });

  const createTaskTypeMutation = useMutation({
    mutationFn: async (taskType: any) => {
      const res = await apiRequest("POST", "/api/task-types", taskType);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-types"] });
      setNewTaskType({ name: "", color: "bg-blue-500" });
      setIsTaskTypeDialogOpen(false);
      toast({ title: "Тип задачи создан" });
    },
    onError: (error: any) => {
      if (error.message?.includes("DUPLICATE")) {
        toast({ title: "Тип задачи с таким названием уже существует", variant: "destructive" });
      }
    },
  });

  const updateTaskTypeMutation = useMutation({
    mutationFn: async (taskType: any) => {
      const res = await apiRequest("PUT", `/api/task-types/${taskType.id}`, taskType);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-types"] });
      setEditingTaskType(null);
      setIsTaskTypeDialogOpen(false);
      toast({ title: "Тип задачи обновлён" });
    },
    onError: (error: any) => {
      if (error.message?.includes("DUPLICATE")) {
        toast({ title: "Тип задачи с таким названием уже существует", variant: "destructive" });
      }
    },
  });

  const deleteTaskTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/task-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-types"] });
      if (editingTaskType) {
        setIsTaskTypeDialogOpen(false);
        setEditingTaskType(null);
      }
      toast({ title: "Тип задачи удалён" });
    },
  });

  const [newTaskType, setNewTaskType] = useState({ name: "", color: "bg-blue-500" });
  const [editingTaskType, setEditingTaskType] = useState<any>(null);
  const [isTaskTypeDialogOpen, setIsTaskTypeDialogOpen] = useState(false);

  const handleAddTaskType = () => {
    if (!newTaskType.name) return;
    createTaskTypeMutation.mutate(newTaskType);
  };

  const handleUpdateTaskType = () => {
    if (!editingTaskType) return;
    updateTaskTypeMutation.mutate(editingTaskType);
  };

  const handleDeleteTaskType = (id: string) => {
    deleteTaskTypeMutation.mutate(id);
  };

  const openTaskTypeDialog = (taskType?: any) => {
    if (taskType) {
      setEditingTaskType(taskType);
    } else {
      setNewTaskType({ name: "", color: "bg-blue-500" });
      setEditingTaskType(null);
    }
    setIsTaskTypeDialogOpen(true);
  };

  const colors = [
    "bg-rose-600", "bg-rose-400", "bg-amber-500", "bg-emerald-500", 
    "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-slate-500"
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            Типы задач
          </h4>
          <p className="text-[11px] text-foreground">Управление типами задач (Ошибка, Доработка, Эпик)</p>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-foreground transition-transform", isCollapsed && "rotate-90")} />
      </div>

      {!isCollapsed && (
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              <Dialog open={isTaskTypeDialogOpen} onOpenChange={setIsTaskTypeDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="h-8 px-3 rounded-sm border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex items-center gap-2 transition-all group"
                    onClick={() => openTaskTypeDialog()}
                  >
                    <Plus className="w-3.5 h-3.5 text-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">Добавить тип</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingTaskType ? "Редактировать тип" : "Новый тип задачи"}</DialogTitle>
                    <DialogDescription>
                      {editingTaskType ? "Измените название или цвет типа" : "Создайте новый тип задачи"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="taskTypeName">Название</Label>
                      <Input
                        id="taskTypeName"
                        value={editingTaskType ? editingTaskType.name : newTaskType.name}
                        onChange={(e) => editingTaskType 
                          ? setEditingTaskType({ ...editingTaskType, name: e.target.value })
                          : setNewTaskType({ ...newTaskType, name: e.target.value })
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
                            onClick={() => editingTaskType 
                              ? setEditingTaskType({ ...editingTaskType, color })
                              : setNewTaskType({ ...newTaskType, color })
                            }
                            className={cn(
                              "w-6 h-6 rounded-full transition-all ring-offset-2 ring-offset-background relative",
                              color,
                              (editingTaskType ? editingTaskType.color === color : newTaskType.color === color)
                                ? "ring-2 ring-primary scale-110" 
                                : "hover:scale-110 opacity-70 hover:opacity-100"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    {editingTaskType && (
                       <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        className="mr-auto"
                        onClick={() => {
                          handleDeleteTaskType(editingTaskType.id);
                          setIsTaskTypeDialogOpen(false);
                        }}
                      >
                        Удалить
                      </Button>
                    )}
                    <Button onClick={editingTaskType ? handleUpdateTaskType : handleAddTaskType}>
                      {editingTaskType ? "Сохранить" : "Создать"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {taskTypes.map((taskType) => {
                const getColors = (color: string) => {
                  if (color.includes('red') || color.includes('rose')) return { bg: '#fef2f2', text: '#dc2626' };
                  if (color.includes('blue')) return { bg: '#dbeafe', text: '#2563eb' };
                  if (color.includes('green') || color.includes('emerald')) return { bg: '#dcfce7', text: '#16a34a' };
                  if (color.includes('yellow') || color.includes('amber')) return { bg: '#fef9c3', text: '#ca8a04' };
                  if (color.includes('purple') || color.includes('indigo')) return { bg: '#f3e8ff', text: '#9333ea' };
                  if (color.includes('pink')) return { bg: '#fce7f3', text: '#db2777' };
                  if (color.includes('orange')) return { bg: '#ffedd5', text: '#ea580c' };
                  if (color.includes('gray') || color.includes('slate')) return { bg: '#f1f5f9', text: '#475569' };
                  return { bg: '#f1f5f9', text: '#475569' };
                };
                const colors = getColors(taskType.color);
                return (
                <div
                  key={taskType.id}
                  style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.text }}
                  className="h-8 px-3 rounded-sm flex items-center gap-2 transition-all cursor-pointer hover:ring-2 ring-offset-2 ring-offset-background ring-primary/20 border"
                  onClick={() => openTaskTypeDialog(taskType)}
                >
                  <span className="text-xs font-medium">{taskType.name}</span>
                </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </section>
  )
}


function BalanceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [statusName, setStatusName] = useState("");
  const [pointsAmount, setPointsAmount] = useState("1");
  const [maxTimeInStatus, setMaxTimeInStatus] = useState("0");

  const { data: settings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/points-settings"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/points-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/points-settings"] });
      toast({ title: "Настройка добавлена", description: "Баллы за статус успешно настроены" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/points-settings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/points-settings"] });
      toast({ title: "Настройка обновлена", description: "Изения сохранены" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/points-settings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/points-settings"] });
      toast({ title: "Настройка удалена", description: "Баллы за статус удалены" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setStatusName("");
    setPointsAmount("1");
    setMaxTimeInStatus("0");
    setEditingSetting(null);
  };

  const openDialog = (setting?: any) => {
    if (setting) {
      setEditingSetting(setting);
      setStatusName(setting.statusName);
      setPointsAmount(setting.pointsAmount.toString());
      setMaxTimeInStatus((setting.maxTimeInStatus || 0).toString());
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const data = {
      statusName,
      pointsAmount: parseInt(pointsAmount) || 1,
      maxTimeInStatus: parseInt(maxTimeInStatus) || 0,
      isActive: true,
    };

    if (editingSetting) {
      updateMutation.mutate({ id: editingSetting.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="w-4 h-4 text-amber-500" />
            Настройка баллов за статусы задач
          </CardTitle>
          <CardDescription className="text-xs">
            Настройте количество баллов и максимальное время в статусе для получения баллов
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">
              <p>Баллы начисляются автоматически при смене статуса задачи.</p>
              <p>1 балл = 1 рубль в магазине.</p>
            </div>
            <Button onClick={() => openDialog()} size="sm" className="gap-1 h-8">
              <Plus className="w-3.5 h-3.5" />
              Добавить
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : settings && settings.length > 0 ? (
            <div className="space-y-2">
              {settings.map((setting: any) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between p-2.5 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Coins className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{setting.statusName}</p>
                      <p className="text-xs text-muted-foreground">
                        {setting.isActive ? "Активно" : "Неактивно"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">{setting.pointsAmount}</p>
                      <p className="text-[10px] text-muted-foreground">баллов</p>
                    </div>
                    {setting.maxTimeInStatus > 0 && (
                      <div className="text-right px-2 border-l border-border">
                        <p className="text-xs font-medium text-rose-600">{setting.maxTimeInStatus} мин</p>
                        <p className="text-[10px] text-muted-foreground">макс. время</p>
                      </div>
                    )}
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openDialog(setting)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(setting.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Coins className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Настройки не найдены</p>
              <p className="text-xs">Добавьте первый статус для начисления баллов</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? "Редактировать настройку" : "Добавить настройку"}
            </DialogTitle>
            <DialogDescription>
              Настройте количество баллов за переход в указанный статус
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="statusName">Название статуса</Label>
              <Input
                id="statusName"
                value={statusName}
                onChange={(e) => setStatusName(e.target.value)}
                placeholder="Например: В работе"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pointsAmount">Количество баллов</Label>
              <Input
                id="pointsAmount"
                type="number"
                min="0"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTimeInStatus">Максимальное время в статусе (минут)</Label>
              <Input
                id="maxTimeInStatus"
                type="number"
                min="0"
                value={maxTimeInStatus}
                onChange={(e) => setMaxTimeInStatus(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Укажите максимальное время в минутах, которое задача может провести в этом статусе для получения баллов. Если время превышено, баллы не начислятся. 0 = без ограничений.
              </p>
            </div>
          </div>
          <DialogFooter>
            {editingSetting && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  deleteMutation.mutate(editingSetting.id);
                  setIsDialogOpen(false);
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Удалить
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!statusName || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingSetting ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccrualRulesSection />
    </div>
  );
}

// Accrual Rules Section
function AccrualRulesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState("arrival_on_time");
  const [rulePoints, setRulePoints] = useState("1");
  const [ruleDescription, setRuleDescription] = useState("");

  const { data: rules, isLoading } = useQuery<any[]>({
    queryKey: ["/api/accrual-rules"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/accrual-rules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accrual-rules"] });
      toast({ title: "Правило добавлено", description: "Правило начисления успешно создано" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/accrual-rules/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accrual-rules"] });
      toast({ title: "Правило обновлено", description: "Изменения сохранены" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/accrual-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accrual-rules"] });
      toast({ title: "Правило удалено", description: "Правило начисления удалено" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/accrual-rules/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accrual-rules"] });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setRuleName("");
    setRuleType("arrival_on_time");
    setRulePoints("1");
    setRuleDescription("");
    setEditingRule(null);
  };

  const openDialog = (rule?: any) => {
    if (rule) {
      setEditingRule(rule);
      setRuleName(rule.name);
      setRuleType(rule.type);
      setRulePoints(rule.pointsAmount.toString());
      setRuleDescription(rule.description || "");
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const data = {
      name: ruleName,
      type: ruleType,
      pointsAmount: parseInt(rulePoints) || 0,
      description: ruleDescription,
      isActive: true,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const ruleTypeOptions = [
    { value: "arrival_on_time", label: "Приход вовремя", description: "Начисляет баллы если пользователь поставил статус 'В сети' раньше времени начала рабочего дня. Списывает если позже." },
  ];

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="w-4 h-4 text-emerald-500" />
            Правила начисления
          </CardTitle>
          <CardDescription className="text-xs">
            Настройте автоматические правила начисления и списания баллов
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">
              <p>Правила проверяются автоматически при действиях пользователей.</p>
              <p>Отрицательное значение баллов означает штраф (списание).</p>
            </div>
            <Button onClick={() => openDialog()} size="sm" className="gap-1 h-8">
              <Plus className="w-3.5 h-3.5" />
              Добавить
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : rules && rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map((rule: any) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-md border transition-colors",
                    rule.isActive
                      ? "bg-secondary/30 hover:bg-secondary/50 border-transparent"
                      : "bg-muted/30 hover:bg-muted/50 border-dashed opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      rule.pointsAmount >= 0
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-rose-100 dark:bg-rose-900/30"
                    )}>
                      {rule.pointsAmount >= 0 ? (
                        <Coins className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <MinusCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.type === "arrival_on_time" && "Приход вовремя"}
                        {rule.description && ` · ${rule.description}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {rule.isActive ? (
                          <span className="text-emerald-600">Активно</span>
                        ) : (
                          <span className="text-muted-foreground">Отключено</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        rule.pointsAmount >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {rule.pointsAmount > 0 ? `+${rule.pointsAmount}` : rule.pointsAmount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">баллов</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                        title={rule.isActive ? "Отключить" : "Включить"}
                      >
                        {rule.isActive ? (
                          <ToggleRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openDialog(rule)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(rule.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Правила не найдены</p>
              <p className="text-xs">Добавьте первое правило начисления баллов</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Редактировать правило" : "Добавить правило"}
            </DialogTitle>
            <DialogDescription>
              Настройте автоматическое начисление или списание баллов
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ruleName">Название правила</Label>
              <Input
                id="ruleName"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Например: Приход вовремя"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ruleType">Тип правила</Label>
              <select
                id="ruleType"
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {ruleTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {ruleTypeOptions.find((o) => o.value === ruleType)?.description}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rulePoints">Количество баллов</Label>
              <Input
                id="rulePoints"
                type="number"
                value={rulePoints}
                onChange={(e) => setRulePoints(e.target.value)}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                Положительное число — начисление. Отрицательное — штраф (списание).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ruleDescription">Описание (необязательно)</Label>
              <Input
                id="ruleDescription"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="Дополнительное пояснение к правилу"
              />
            </div>
          </div>
          <DialogFooter>
            {editingRule && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  deleteMutation.mutate(editingRule.id);
                  setIsDialogOpen(false);
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Удалить
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!ruleName || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingRule ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Team Rooms Types
interface TeamRoom {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  inviteCode: string;
  accessType: "open" | "closed";
  color: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function CallsManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<TeamRoom | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [accessType, setAccessType] = useState<"open" | "closed">("open");
  const [color, setColor] = useState("#3b82f6");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const colors = [
    { value: "#3b82f6", label: "Синий" },
    { value: "#10b981", label: "Зеленый" },
    { value: "#f59e0b", label: "Оранжевый" },
    { value: "#ef4444", label: "Красный" },
    { value: "#8b5cf6", label: "Фиолетовый" },
    { value: "#ec4899", label: "Розовый" },
    { value: "#06b6d4", label: "Бирюзовый" },
    { value: "#6366f1", label: "Индиго" },
  ];

  // Admin management state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Fetch admins when editing room
  const { data: roomAdmins = [] } = useQuery<any[]>({
    queryKey: ["/api/team-rooms", editingRoom?.id, "admins"],
    enabled: !!editingRoom,
  });

  // Use roomAdmins directly instead of copying to state
  const admins = roomAdmins;

  const addAdminMutation = useMutation({
    mutationFn: async ({ roomId, userId }: { roomId: string; userId: string }) => {
      const res = await apiRequest("POST", `/api/team-rooms/${roomId}/admins`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-rooms", editingRoom?.id, "admins"] });
      toast({
        title: "Успешно",
        description: "Администратор добавлен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить администратора",
        variant: "destructive",
      });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async ({ roomId, userId }: { roomId: string; userId: string }) => {
      await apiRequest("DELETE", `/api/team-rooms/${roomId}/admins/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-rooms", editingRoom?.id, "admins"] });
      toast({
        title: "Успешно",
        description: "Администратор удален",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить администратора",
        variant: "destructive",
      });
    },
  });

  // Simple search without complex dependencies to prevent infinite loops
  const handleSearchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const users = await res.json();
        setSearchResults(users);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const { data: rooms = [], isLoading, error: roomsError } = useQuery<TeamRoom[]>({
    queryKey: ["/api/team-rooms"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<TeamRoom>) => {
      const res = await apiRequest("POST", "/api/team-rooms", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-rooms"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Успешно",
        description: "Командный зал создан",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать зал",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TeamRoom> }) => {
      const res = await apiRequest("PATCH", `/api/team-rooms/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-rooms"] });
      setIsDialogOpen(false);
      setEditingRoom(null);
      resetForm();
      toast({
        title: "Успешно",
        description: "Командный зал обновлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить зал",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/team-rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-rooms"] });
      toast({
        title: "Успешно",
        description: "Командный зал удален",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить зал",
        variant: "destructive",
      });
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/team-rooms/${id}/regenerate-code`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-rooms"] });
      toast({
        title: "Успешно",
        description: "Ссылка обновлена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить ссылку",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setSlug("");
    setAccessType("open");
    setColor("#3b82f6");
    setEditingRoom(null);
  };

  const openDialog = (room?: TeamRoom) => {
    if (room) {
      setEditingRoom(room);
      setName(room.name);
      setDescription(room.description || "");
      setSlug(room.slug);
      setAccessType(room.accessType);
      setColor(room.color);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const data = {
      name,
      description: description || undefined,
      slug: editingRoom ? undefined : slug,
      accessType,
      color,
    };

    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingRoom) {
      setSlug(generateSlug(value));
    }
  };

  const copyToClipboard = (room: TeamRoom) => {
    const link = `https://m4portal.ru/room/${room.slug}-${room.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Скопировано",
      description: "Ссылка скопирована в буфер обмена",
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Командные залы
          </CardTitle>
          <CardDescription>
            Управление виртуальными комнатами для видеовстреч
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-muted-foreground">
              <p>Создавайте постоянные комнаты для отделов и команд.</p>
              <p>Каждый зал имеет уникальную ссылку для приглашения.</p>
            </div>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Создать зал
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : roomsError ? (
            <div className="text-center py-8 text-destructive">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Ошибка загрузки залов</p>
              <p className="text-sm text-muted-foreground">Попробуйте обновить страницу</p>
            </div>
          ) : rooms && rooms.length > 0 ? (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: room.color }}
                    >
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{room.name}</p>
                        <Badge variant={room.accessType === "open" ? "default" : "secondary"}>
                          {room.accessType === "open" ? "Открытый" : "Закрытый"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {room.description || "Нет описания"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Link className="w-4 h-4" />
                      <span className="font-mono text-xs">
                        {room.slug}-{room.inviteCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(room)}
                        title="Копировать ссылку"
                      >
                        {copiedId === room.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => regenerateCodeMutation.mutate(room.id)}
                        disabled={regenerateCodeMutation.isPending}
                        title="Обновить ссылку"
                      >
                        {regenerateCodeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDialog(room)}
                        title="Редактировать"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(room.id)}
                        disabled={deleteMutation.isPending}
                        title="Удалить"
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Залы не найдены</p>
              <p className="text-sm">Создайте первый командный зал</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Редактировать зал" : "Создать зал"}
            </DialogTitle>
            <DialogDescription>
              {editingRoom
                ? "Измените параметры командного зала"
                : "Создайте новый виртуальный зал для встреч"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название зала</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Например: Маркетинг"
              />
            </div>
            {!editingRoom && (
              <div className="space-y-2">
                <Label htmlFor="slug">Идентификатор (slug)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="marketing-team"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Используется в ссылке для приглашения. Только латинские буквы, цифры и дефисы.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="О чем будут встречи в этом зале?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessType">Тип доступа</Label>
              <Select value={accessType} onValueChange={(v: "open" | "closed") => setAccessType(v)}>
                <SelectTrigger id="accessType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Открытый (любой может присоединиться)</SelectItem>
                  <SelectItem value="closed">Закрытый (только по приглашению)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Цвет зала</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c.value ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Admin Management - Only for creator */}
            {editingRoom && currentUser?.id === editingRoom.createdBy && (
              <div className="space-y-3 border-t pt-4 mt-4">
                <Label className="text-base font-semibold">Администраторы</Label>
                <p className="text-xs text-muted-foreground">
                  Администраторы могут исключать участников из звонков
                </p>
                
                {/* Current Admins */}
                <div className="space-y-2">
                  {admins.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={admin.user?.avatar || undefined} />
                          <AvatarFallback>
                            {admin.user?.firstName?.[0]}{admin.user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {admin.user?.firstName} {admin.user?.lastName}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAdminMutation.mutate({ 
                          roomId: editingRoom.id, 
                          userId: admin.userId 
                        })}
                        disabled={removeAdminMutation.isPending}
                      >
                        <UserX className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Admin */}
                <div className="space-y-2">
                  <Label className="text-sm">Добавить администратора</Label>
                  <div className="relative">
                    <Input
                      placeholder="Поиск пользователя..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleSearchUsers(e.target.value);
                      }}
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                        {searchResults
                          .filter((user: any) => 
                            user.id !== currentUser?.id && 
                            !admins.some((a: any) => a.userId === user.id)
                          )
                          .map((user) => (
                            <button
                              key={user.id}
                              className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                              onClick={() => {
                                addAdminMutation.mutate({ 
                                  roomId: editingRoom.id, 
                                  userId: user.id 
                                });
                                setSearchQuery("");
                                setSearchResults([]);
                              }}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar || undefined} />
                                <AvatarFallback>
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {user.firstName} {user.lastName}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {editingRoom && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  deleteMutation.mutate(editingRoom.id);
                  setIsDialogOpen(false);
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Удалить
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name || (!editingRoom && !slug) || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingRoom ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  image: string | null;
  category: string | null;
  stock: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
}

interface ShopPurchase {
  id: string;
  userId: string;
  itemId: string;
  quantity: number | null;
  totalCost: number;
  status: string;
  purchasedAt: Date | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string;
    avatar: string | null;
  };
  item?: {
    id: string;
    name: string;
    image: string | null;
    cost: number;
  };
}

function ShopManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("items");

  // Items state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ShopItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cost: "",
    stock: "",
    category: "",
    image: "",
    isActive: true,
  });

  const { data: items, isLoading: itemsLoading } = useQuery<ShopItem[]>({
    queryKey: ["/api/shop/items/all"],
    staleTime: 1000 * 60,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/shop/items", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Товар создан", description: "Новый товар успешно добавлен в магазин." });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/items/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/items"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось создать товар", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/shop/items/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Товар обновлен", description: "Изменения успешно сохранены." });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/items/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/items"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось обновить товар", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/shop/items/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Товар удален", description: "Товар успешно удален из магазина." });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/items/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/items"] });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить товар", variant: "destructive" });
    },
  });

  // Purchases state
  const { data: purchases, isLoading: purchasesLoading } = useQuery<ShopPurchase[]>({
    queryKey: ["/api/shop/purchases/all"],
    staleTime: 1000 * 30,
    enabled: activeTab === "orders",
  });

  const updatePurchaseMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/shop/purchases/${id}/status`, { status });
      return res.json();
    },
    onSuccess: (_, vars) => {
      const statusText = vars.status === "approved" ? "одобрена" : vars.status === "rejected" ? "отклонена" : "обновлена";
      toast({ title: `Заявка ${statusText}`, description: `Статус заявки изменен на "${statusText}".` });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/purchases/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/purchases"] });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось обновить статус", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      cost: "",
      stock: "",
      category: "",
      image: "",
      isActive: true,
    });
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: ShopItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      cost: String(item.cost),
      stock: String(item.stock || 0),
      category: item.category || "",
      image: item.image || "",
      isActive: item.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.cost.trim()) {
      toast({ title: "Ошибка", description: "Название и цена обязательны для заполнения", variant: "destructive" });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      cost: parseInt(formData.cost, 10),
      stock: parseInt(formData.stock, 10) || 0,
      category: formData.category.trim() || null,
      image: formData.image.trim() || null,
      isActive: formData.isActive,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadForm,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setFormData(prev => ({ ...prev, image: data.url }));
      toast({ title: "Изображение загружено", description: "Картинка товара успешно загружена." });
    } catch (error: any) {
      toast({ title: "Ошибка загрузки", description: error.message || "Не удалось загрузить изображение", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const categories: string[] = Array.from(new Set(items?.map(i => i.category).filter((c): c is string => !!c) || []));

  const pendingCount = purchases?.filter(p => p.status === "pending").length || 0;

  const formatUserName = (user?: ShopPurchase["user"]) => {
    if (!user) return "Неизвестный";
    return user.firstName || user.username;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="items" className="gap-2">
            <Package className="w-4 h-4" />
            Товары
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            Заявки
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">{pendingCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Товары магазина</h3>
              <p className="text-sm text-muted-foreground">
                {items?.length || 0} {items?.length === 1 ? "товар" : items && items.length < 5 ? "товара" : "товаров"} в каталоге
              </p>
            </div>
            <Button onClick={openCreateDialog} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Добавить товар
            </Button>
          </div>

          {itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !items || items.length === 0 ? (
            <Card className="border-border/50 shadow-sm border-dashed">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <Store className="w-8 h-8 text-muted-foreground opacity-40" />
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground">Магазин пуст</h4>
                  <p className="text-sm text-muted-foreground mt-1">Добавьте первый товар, чтобы начать продажи</p>
                </div>
                <Button variant="outline" onClick={openCreateDialog} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Добавить товар
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className={cn(
                  "border-border/50 shadow-sm overflow-hidden group transition-all hover:shadow-md",
                  !item.isActive && "opacity-60"
                )}>
                  <div className="aspect-[4/3] bg-muted/30 relative overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {!item.isActive && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Badge variant="secondary" className="text-xs">Неактивен</Badge>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/90 backdrop-blur-sm">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(item)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                        {item.category && (
                          <Badge variant="outline" className="text-[10px] mt-1 font-normal">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-primary font-bold text-sm shrink-0">
                        <Coins className="w-3.5 h-3.5" />
                        {item.cost}
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Остаток: {item.stock ?? 0}
                      </span>
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        (item.stock ?? 0) > 10 ? "bg-emerald-500" : (item.stock ?? 0) > 0 ? "bg-amber-500" : "bg-red-500"
                      )} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Заявки на покупку</h3>
              <p className="text-sm text-muted-foreground">
                {purchases?.length || 0} заявок, {pendingCount} на рассмотрении
              </p>
            </div>
          </div>

          {purchasesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !purchases || purchases.length === 0 ? (
            <Card className="border-border/50 shadow-sm border-dashed">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground opacity-40" />
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground">Нет заявок</h4>
                  <p className="text-sm text-muted-foreground mt-1">Здесь появятся заявки от сотрудников</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <Card key={purchase.id} className={cn(
                  "border-border/50 shadow-sm overflow-hidden",
                  purchase.status === "pending" && "border-amber-500/30"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-muted/30 overflow-hidden shrink-0">
                        {purchase.item?.image ? (
                          <img src={purchase.item.image} alt={purchase.item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{purchase.item?.name || "Товар"}</h4>
                          <Badge
                            variant={purchase.status === "pending" ? "outline" : purchase.status === "approved" ? "default" : "secondary"}
                            className={cn(
                              "text-[10px] h-4 px-1.5",
                              purchase.status === "pending" && "border-amber-500 text-amber-600",
                              purchase.status === "approved" && "bg-emerald-500 text-white",
                              purchase.status === "rejected" && "bg-red-500 text-white"
                            )}
                          >
                            {purchase.status === "pending" ? "На рассмотрении" : purchase.status === "approved" ? "Одобрена" : "Отклонена"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={purchase.user?.avatar || undefined} />
                              <AvatarFallback className="text-[8px]">{(formatUserName(purchase.user) || "?")[0]}</AvatarFallback>
                            </Avatar>
                            {formatUserName(purchase.user)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-amber-500" />
                            {purchase.totalCost} баллов
                          </span>
                          <span>× {purchase.quantity || 1} шт.</span>
                        </div>
                      </div>
                      {purchase.status === "pending" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => updatePurchaseMutation.mutate({ id: purchase.id, status: "rejected" })}
                            disabled={updatePurchaseMutation.isPending}
                          >
                            <X className="w-3 h-3" />
                            Отклонить
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1 bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => updatePurchaseMutation.mutate({ id: purchase.id, status: "approved" })}
                            disabled={updatePurchaseMutation.isPending}
                          >
                            <Check className="w-3 h-3" />
                            Одобрить
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Редактировать товар" : "Добавить товар"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Измените информацию о товаре" : "Заполните данные нового товара для магазина"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="item-name">Название <span className="text-red-500">*</span></Label>
              <Input
                id="item-name"
                placeholder="Например, Худи TeamSync"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-description">Описание</Label>
              <Textarea
                id="item-description"
                placeholder="Описание товара..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-cost">Цена (баллы) <span className="text-red-500">*</span></Label>
                <Input
                  id="item-cost"
                  type="number"
                  min={0}
                  placeholder="1000"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-stock">Лимит (шт.)</Label>
                <Input
                  id="item-stock"
                  type="number"
                  min={0}
                  placeholder="10"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-category">Категория</Label>
              <div className="flex gap-2">
                <Input
                  id="item-category"
                  list="categories"
                  placeholder="Например, Мерч"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="flex-1"
                />
                <datalist id="categories">
                  {categories.filter((c): c is string => !!c).map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-image">Изображение</Label>
              <div className="flex gap-3 items-start">
                {formData.image ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center text-xs hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground shrink-0">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">Нет фото</span>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    id="item-image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Или введите URL вручную:</p>
                  <Input
                    placeholder="https://..."
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="item-active" className="text-sm font-medium">Активен</Label>
                <p className="text-xs text-muted-foreground">Товар будет виден в магазине</p>
              </div>
              <Switch
                id="item-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || !formData.name.trim() || !formData.cost.trim()}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingItem ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить товар?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить товар <strong>"{itemToDelete?.name}"</strong>? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DefaultSection({ section: sectionData }: { section: { label: string, icon: any, description: string } }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-border/50 shadow-sm border-dashed">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border/50">
            <sectionData.icon className="w-10 h-10 opacity-20" />
          </div>
          <div className="max-w-xs space-y-2">
            <h4 className="font-bold text-lg">Раздел в разработке</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Мы работаем над тем, чтобы добавить настройки для раздела <strong>{sectionData.label}</strong>. Совсем скоро здесь появятся новые возможности.
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
