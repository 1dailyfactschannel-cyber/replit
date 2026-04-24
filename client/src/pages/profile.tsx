import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Mail, Phone, Send, Briefcase, User, Save, FileText, Bell, ExternalLink, CheckCircle2, XCircle, Clock, Building2, Loader2, Coins, TrendingUp, ShoppingBag, Award, Lock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

export default function Profile() {
  const { toast } = useToast();
  const [location] = useLocation();
  
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/users/me/points-history"],
    enabled: !!user,
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery<any[]>({
    queryKey: ["/api/shop/purchases"],
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  const ITEMS_PER_PAGE = 15;
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);

  const paginate = (items: any[] | undefined | null, page: number) => {
    const safeItems = items || [];
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      data: safeItems.slice(start, end),
      totalPages: Math.max(1, Math.ceil(safeItems.length / ITEMS_PER_PAGE)),
      total: safeItems.length,
    };
  };

  const PaginationControls = ({
    page,
    totalPages,
    total,
    onChange,
  }: {
    page: number;
    totalPages: number;
    total: number;
    onChange: (p: number) => void;
  }) => (
    <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
      <span className="text-xs text-muted-foreground">
        Всего: {total} | Страница {page} из {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="h-8 px-3"
        >
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-8 px-3"
        >
          Вперёд
        </Button>
      </div>
    </div>
  );

  const { data: departments = [] } = useQuery<{id: string; name: string; color: string}[]>({
    queryKey: ["/api/departments"],
  });

  // Parse tab from URL
  const getInitialTab = () => {
    const match = location.match(/\?tab=([^&]+)/);
    return match ? match[1] : "profile";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    position: "",
    department: "",
    telegram: "",
    email: "",
    phone: "",
    avatar: "",
    notes: "",
    telegramConnected: false
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [pwdCountdown, setPwdCountdown] = useState(0);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        position: user.position || "",
        department: user.department || "",
        telegram: user.telegram || "",
        email: user.email || "",
        phone: user.phone || "",
        avatar: user.avatar || "",
        notes: user.notes || "",
        telegramConnected: user.telegramConnected || false
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      console.log("Sending profile update:", updatedData);
      const res = await apiRequest("PATCH", "/api/user", updatedData);
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Ошибка при сохранении");
        }
        return data;
      } else {
        const text = await res.text();
        console.error("Non-JSON response received:", text);
        throw new Error("Сервер вернул некорректный ответ");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({
        title: "Профиль обновлен",
        description: "Ваши данные успешно сохранены в базе данных.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    // Исключаем email из данных для обновления, так как он фиксирован
    const { email, ...updateData } = profile;
    updateProfileMutation.mutate(updateData);
  };

  const handleConnectTelegram = () => {
    if (!user?.id) return;
    // Deep link with user ID for webhook to bind telegramId
    window.open(`https://t.me/TeamSyncNotifyBot?start=connect_${user.id}`, '_blank');
    toast({
      title: "Откройте бот",
      description: "Нажмите «Start» в Telegram, чтобы завершить подключение.",
    });
  };

  const handleDisconnectTelegram = async () => {
    if (!user?.id) return;
    try {
      await apiRequest("PATCH", "/api/user", { telegramId: null, telegramConnected: false });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setProfile(prev => ({ ...prev, telegramConnected: false }));
      toast({
        title: "Telegram отключён",
        description: "Вы больше не будете получать уведомления в Telegram.",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отключить Telegram.",
        variant: "destructive",
      });
    }
  };

  // Password change countdown
  useEffect(() => {
    if (pwdCountdown > 0) {
      const timer = setTimeout(() => setPwdCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [pwdCountdown]);

  const requestUserCodeMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Пароли не совпадают");
      }
      if (newPassword.length < 6) {
        throw new Error("Пароль должен быть не менее 6 символов");
      }
      const res = await apiRequest("POST", "/api/user/request-password-change", {
        currentPassword,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Код отправлен",
        description: data.message || "Проверьте вашу почту",
      });
      setCodeSent(true);
      setPwdCountdown(60);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить код.",
        variant: "destructive",
      });
    }
  });

  const confirmUserChangeMutation = useMutation({
    mutationFn: async () => {
      if (!confirmationCode || confirmationCode.length !== 6) {
        throw new Error("Введите 6-значный код");
      }
      const res = await apiRequest("POST", "/api/user/confirm-password-change", {
        code: confirmationCode,
        newPassword,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Пароль изменен",
        description: data.message || "Пароль успешно обновлен.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setConfirmationCode("");
      setShowPasswordForm(false);
      setCodeSent(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось подтвердить смену пароля.",
        variant: "destructive",
      });
    }
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Ошибка",
          description: "Файл слишком большой. Максимальный размер 5МБ.",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Ошибка при загрузке файла");
        }

        const data = await res.json();
        const fileUrl = data.url;

        setProfile(prev => ({ ...prev, avatar: fileUrl }));
        // Сразу сохраняем путь к аватару в профиле пользователя
        updateProfileMutation.mutate({ avatar: fileUrl });
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить аватар: " + error.message,
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'spent':
        return <ShoppingBag className="w-4 h-4 text-rose-500" />;
      case 'reverted':
        return <Coins className="w-4 h-4 text-amber-500" />;
      default:
        return <Coins className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
        return 'text-emerald-600';
      case 'spent':
        return 'text-rose-600';
      case 'reverted':
        return 'text-amber-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTransactionPrefix = (type: string) => {
    switch (type) {
      case 'earned':
        return '+';
      case 'spent':
        return '-';
      case 'reverted':
        return '-';
      default:
        return '';
    }
  };

  const calculateLevelProgress = () => {
    const total = user?.totalPointsEarned || 0;
    const currentLevel = Math.floor(total / 1000);
    const pointsInCurrentLevel = total % 1000;
    const progress = (pointsInCurrentLevel / 1000) * 100;
    return { currentLevel, pointsInCurrentLevel, progress };
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Профиль</h1>
          <p className="text-muted-foreground mt-1">Управляйте вашей личной информацией и контактами.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="balance" className="gap-2">
              <Coins className="w-4 h-4" />
              Баланс
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              История покупок
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Avatar Section */}
              <Card className="md:col-span-4 border-border/50 shadow-sm overflow-hidden h-fit">
                <CardContent className="pt-8 pb-8 flex flex-col items-center">
                  <div 
                    className="relative group cursor-pointer mb-6"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                      <AvatarImage src={profile.avatar} className="object-cover" />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                        {profile.firstName[0]}{profile.lastName[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white w-8 h-8" />
                    </div>
                    <input 
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <h2 className="text-xl font-bold text-center mb-1">{profile.firstName} {profile.lastName}</h2>
                  <p className="text-sm text-muted-foreground text-center mb-1">{profile.position}</p>
                  <p className="text-xs text-muted-foreground/70 text-center mb-6">{profile.department}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full gap-2 border-border/60"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {!updateProfileMutation.isPending && <Camera className="w-4 h-4" />}
                    Изменить фото
                  </Button>
                </CardContent>
              </Card>

              {/* Details Section */}
              <Card className="md:col-span-8 border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle>Личная информация</CardTitle>
                  <CardDescription>Обновите свои контактные данные здесь.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Имя
                      </Label>
                      <Input 
                        id="firstName" 
                        value={profile.firstName || ""} 
                        onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                        className="bg-secondary/30 border-border/50 focus:bg-background transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Фамилия
                      </Label>
                      <Input 
                        id="lastName" 
                        value={profile.lastName || ""} 
                        onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                        className="bg-secondary/30 border-border/50 focus:bg-background transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5" /> Должность
                    </Label>
                    <Input 
                      id="position" 
                      value={profile.position || ""} 
                      onChange={(e) => setProfile({...profile, position: e.target.value})}
                      className="bg-secondary/30 border-border/50 focus:bg-background transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" /> Отдел
                    </Label>
                    <Select 
                      value={profile.department || "__empty__"} 
                      onValueChange={(value) => setProfile({...profile, department: value === "__empty__" ? "" : value})}
                    >
                      <SelectTrigger className="bg-secondary/30 border-border/50 focus:bg-background transition-all">
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

                  <Separator />

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="telegram" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Send className="w-3.5 h-3.5 text-sky-500" /> Telegram
                        </Label>
                        <Input 
                          id="telegram" 
                          value={profile.telegram || ""} 
                          onChange={(e) => setProfile({...profile, telegram: e.target.value})}
                          className="bg-secondary/30 border-border/50 focus:bg-background transition-all"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        {profile.telegramConnected ? (
                          <>
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-md border border-emerald-200 dark:border-emerald-500/20 flex-1 h-10">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span className="text-sm font-medium truncate">Уведомления подключены</span>
                            </div>
                            <Button
                              onClick={handleDisconnectTelegram}
                              variant="outline"
                              size="sm"
                              className="h-10 text-destructive border-destructive/30 hover:bg-destructive/5"
                            >
                              Отключить
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={handleConnectTelegram}
                            variant="outline"
                            className="w-full gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5 h-10"
                          >
                            <Bell className="w-4 h-4 text-primary" />
                            Подключить уведомления
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </Button>
                        )}
                      </div>
                    </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" /> Телефон
                        </Label>
                        <Input 
                          id="phone" 
                          value={profile.phone || ""} 
                          onChange={(e) => setProfile({...profile, phone: e.target.value})}
                          className="bg-secondary/30 border-border/50 focus:bg-background transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-primary" /> Почта
                      </Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={profile.email || ""} 
                        readOnly
                        className="bg-secondary/10 border-border/30 text-muted-foreground cursor-not-allowed transition-all"
                      />
                      <p className="text-[10px] text-muted-foreground/50 ml-1">Email зафиксирован и не может быть изменен</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-500" /> Заметки
                      </Label>
                      <Textarea 
                        id="notes" 
                        value={profile.notes || ""} 
                        onChange={(e) => setProfile({...profile, notes: e.target.value})}
                        placeholder="Добавьте краткую информацию о себе..."
                        className="bg-secondary/30 border-border/50 focus:bg-background transition-all min-h-[100px]"
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-secondary/5 border-t border-border/50 px-6 py-4 flex justify-end">
                  <Button 
                    onClick={handleSave} 
                    disabled={updateProfileMutation.isPending}
                    className="gap-2 shadow-lg shadow-primary/20"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Сохранить изменения
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Password Change Section */}
            <Card className="border-border/50 shadow-sm max-w-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Смена пароля</CardTitle>
                    <CardDescription className="text-xs">
                      Измените пароль для входа в аккаунт
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showPasswordForm ? (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Пароль скрыт для безопасности</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordForm(true)}
                    >
                      Изменить пароль
                    </Button>
                  </div>
                ) : !codeSent ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="profile-current-password" className="text-xs font-medium">Текущий пароль</Label>
                      <Input
                        id="profile-current-password"
                        type="password"
                        placeholder="Введите текущий пароль"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-new-password" className="text-xs font-medium">Новый пароль</Label>
                      <Input
                        id="profile-new-password"
                        type="password"
                        placeholder="Введите новый пароль"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-confirm-password" className="text-xs font-medium">Подтвердите пароль</Label>
                      <Input
                        id="profile-confirm-password"
                        type="password"
                        placeholder="Повторите пароль"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-background text-foreground"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                          setConfirmationCode("");
                          setCodeSent(false);
                        }}
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                      <Button
                        onClick={() => requestUserCodeMutation.mutate()}
                        disabled={requestUserCodeMutation.isPending || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                        className="flex-1"
                      >
                        {requestUserCodeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        <Mail className="w-4 h-4 mr-2" />
                        Получить код
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                      <Label htmlFor="profile-confirmation-code" className="text-xs font-medium">Код подтверждения</Label>
                      <Input
                        id="profile-confirmation-code"
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
                        onClick={() => confirmUserChangeMutation.mutate()}
                        disabled={confirmUserChangeMutation.isPending || confirmationCode.length !== 6}
                        className="flex-1"
                      >
                        {confirmUserChangeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Изменить пароль
                      </Button>
                    </div>
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => requestUserCodeMutation.mutate()}
                        disabled={pwdCountdown > 0 || requestUserCodeMutation.isPending}
                        className="text-xs text-muted-foreground"
                      >
                        {pwdCountdown > 0 ? `Отправить повторно через ${pwdCountdown}с` : "Отправить код повторно"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balance" className="space-y-6">
            {/* Balance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-border/50 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Текущий баланс</p>
                      <p className="text-3xl font-bold text-amber-600 mt-1">
                        {user?.pointsBalance || 0}
                        <Coins className="w-6 h-6 inline-block ml-2" />
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Всего заработано</p>
                      <p className="text-3xl font-bold text-emerald-600 mt-1">
                        {user?.totalPointsEarned || 0}
                        <TrendingUp className="w-6 h-6 inline-block ml-2" />
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Потрачено в магазине</p>
                      <p className="text-3xl font-bold text-rose-600 mt-1">
                        {user?.totalPointsSpent || 0}
                        <ShoppingBag className="w-6 h-6 inline-block ml-2" />
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-rose-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Level Progress */}
            <Card className="border-border/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-lg font-bold">Уровень {calculateLevelProgress().currentLevel}</p>
                        <p className="text-sm text-muted-foreground">
                          {calculateLevelProgress().pointsInCurrentLevel} / 1000 очков до следующего уровня
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-amber-600">
                        {calculateLevelProgress().currentLevel}
                      </p>
                    </div>
                    <Progress value={calculateLevelProgress().progress} className="h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  История транзакций
                </CardTitle>
                <CardDescription>
                  История начисления и списания баллов
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {paginate(transactions, transactionsPage).data.map((transaction: any) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.createdAt).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'long',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <span className={`font-bold ${getTransactionColor(transaction.type)}`}>
                            {getTransactionPrefix(transaction.type)}{transaction.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                    <PaginationControls
                      page={transactionsPage}
                      totalPages={paginate(transactions, transactionsPage).totalPages}
                      total={paginate(transactions, transactionsPage).total}
                      onChange={setTransactionsPage}
                    />
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>История транзакций пуста</p>
                    <p className="text-sm">Выполняйте задачи, чтобы получать баллы!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  История покупок
                </CardTitle>
                <CardDescription>
                  Список всех ваших заявок на покупку и их статусы
                </CardDescription>
              </CardHeader>
              <CardContent>
                {purchasesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : purchases && purchases.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {paginate(purchases, purchasesPage).data.map((purchase: any) => (
                        <div
                          key={purchase.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                            {purchase.item?.image ? (
                              <img src={purchase.item.image} alt={purchase.item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-5 h-5 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {purchase.item?.name || "Неизвестный товар"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{purchase.quantity} шт.</span>
                              <span>·</span>
                              <span className="font-medium text-amber-600">{purchase.totalCost} баллов</span>
                              <span>·</span>
                              <span>
                                {new Date(purchase.purchasedAt).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'long',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {purchase.status === 'approved' ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Одобрено
                              </div>
                            ) : purchase.status === 'rejected' ? (
                              <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-full text-xs font-medium border border-rose-200 dark:border-rose-500/20">
                                <XCircle className="w-3.5 h-3.5" />
                                Отклонено
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-500/20">
                                <Clock className="w-3.5 h-3.5" />
                                На рассмотрении
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <PaginationControls
                      page={purchasesPage}
                      totalPages={paginate(purchases, purchasesPage).totalPages}
                      total={paginate(purchases, purchasesPage).total}
                      onChange={setPurchasesPage}
                    />
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>История покупок пуста</p>
                    <p className="text-sm">Перейдите в магазин, чтобы приобрести товары за баллы!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
