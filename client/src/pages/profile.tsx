import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Camera, Mail, Phone, Send, Briefcase, User, Save, FileText, Bell, ExternalLink, CheckCircle2, Building2, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Profile() {
  const { toast } = useToast();
  
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/user"],
  });

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
    // В реальном приложении здесь была бы ссылка на ваш бот с уникальным токеном
    // Например: window.open(`https://t.me/TeamSyncNotifyBot?start=user_123`, '_blank');
    
    window.open('https://t.me/TeamSyncNotifyBot', '_blank');
    
    // Симуляция успешного подключения через 3 секунды (после того как пользователь якобы нажал Start)
    setTimeout(() => {
      setProfile(prev => ({ ...prev, telegramConnected: true }));
      toast({
        title: "Уведомления подключены",
        description: "Вы успешно подключили Telegram-бота для получения уведомлений.",
      });
    }, 3000);
  };

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Профиль</h1>
          <p className="text-muted-foreground mt-1">Управляйте вашей личной информацией и контактами.</p>
        </div>

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
                <Input 
                  id="department" 
                  value={profile.department || ""} 
                  onChange={(e) => setProfile({...profile, department: e.target.value})}
                  className="bg-secondary/30 border-border/50 focus:bg-background transition-all"
                />
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
                  <div className="flex items-end">
                    {profile.telegramConnected ? (
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-md border border-emerald-200 dark:border-emerald-500/20 w-full h-10">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Уведомления подключены</span>
                      </div>
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
      </div>
    </Layout>
  );
}
