import { Layout } from "@/components/layout/Layout";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Camera, Mail, Phone, Send, Briefcase, User, Save, FileText, Bell, ExternalLink, CheckCircle2, Building2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

export default function Profile() {
  const { toast } = useToast();
  const { user, setUser, updateUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Проверка авторизации
  useEffect(() => {
    if (!user) {
      console.log('No user in context, redirecting to auth');
      // Здесь можно добавить редирект на страницу авторизации
    }
  }, [user]);
  
  const [profile, setProfile] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    username: user?.username || "",
    position: "",
    department: "",
    telegram: "",
    email: user?.email || "",
    phone: "",
    avatar: user?.avatar || "https://github.com/shadcn.png",
    notes: "",
    telegramConnected: false
  });

  // Обновляем состояние профиля при изменении данных пользователя
  useEffect(() => {
    console.log('User context updated:', user);
    if (user) {
      setProfile(prev => ({
        ...prev,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        email: user.email || "",
        avatar: user.avatar || prev.avatar
      }));
    }
  }, [user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите изображение",
        variant: "destructive"
      });
      return;
    }

    // Проверяем размер файла (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      console.log('Uploading avatar for user:', user?.id);
      
      const response = await fetch(`/api/users/${user?.id}/avatar`, {
        method: 'POST',
        body: formData,
      });

      console.log('Avatar upload response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка загрузки аватара');
      }

      const result = await response.json();
      console.log('Avatar upload result:', result);
      
      // Обновляем аватар в состоянии и контексте
      setProfile(prev => ({ ...prev, avatar: result.avatar }));
      if (user) {
        updateUser({ avatar: result.avatar });
      }

      toast({
        title: "Успешно",
        description: "Аватар успешно загружен"
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Очищаем input, чтобы можно было загрузить тот же файл снова
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      toast({
        title: "Ошибка",
        description: "Пользователь не авторизован",
        variant: "destructive"
      });
      return;
    }

    console.log('Saving profile for user:', user.id);
    console.log('Profile data to save:', {
      firstName: profile.firstName,
      lastName: profile.lastName,
      username: profile.username,
      email: profile.email,
      phone: profile.phone,
      position: profile.position,
      department: profile.department
    });

    // Специальная проверка для поля position
    console.log('Position field value:', profile.position);
    console.log('Position field type:', typeof profile.position);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          username: profile.username,
          email: profile.email,
          phone: profile.phone,
          position: profile.position,
          department: profile.department
        }),
      });

      console.log('Save response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save error response:', errorData);
        throw new Error(errorData.message || 'Ошибка сохранения профиля');
      }

      const updatedUser = await response.json();
      console.log('Server response:', updatedUser);
      console.log('Server response position:', updatedUser.position);
      
      // Проверка, есть ли position в ответе
      if (updatedUser.position === undefined) {
        console.warn('WARNING: Position field is missing from server response!');
      }
      
      // Обновляем контекст пользователя
      if (updatedUser) {
        const updateData = {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          username: updatedUser.username,
          email: updatedUser.email,
          phone: updatedUser.phone,
          position: updatedUser.position,
          department: updatedUser.department
        };
        
        console.log('Updating context with:', updateData);
        updateUser(updateData);
      }

      toast({
        title: "Успешно",
        description: "Профиль успешно сохранен"
      });
    } catch (error: any) {
      console.error('Profile save error:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const triggerFileInput = () => {
    console.log('Clicking avatar, user:', user);
    if (!user?.id) {
      toast({
        title: "Ошибка",
        description: "Пользователь не авторизован",
        variant: "destructive"
      });
      return;
    }
    fileInputRef.current?.click();
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
              <div className="relative group cursor-pointer mb-6" onClick={!isUploading ? triggerFileInput : undefined}>
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                  <AvatarImage 
                    src={profile.avatar || undefined} 
                    className="object-contain"
                  />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                    {profile.firstName && profile.lastName 
                      ? `${profile.firstName[0]}${profile.lastName[0]}` 
                      : "П"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  ) : (
                    <Camera className="text-white w-8 h-8" />
                  )}
                </div>
                {isUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </div>
              <h2 className="text-xl font-bold text-center mb-1">{profile.firstName} {profile.lastName}</h2>
              <p className="text-sm text-muted-foreground text-center mb-1">{profile.position}</p>
              <p className="text-xs text-muted-foreground/70 text-center mb-6">{profile.department}</p>
              <Button variant="outline" size="sm" className="w-full gap-2 border-border/60">
                <Camera className="w-4 h-4" />
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
                    value={profile.firstName} 
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
                    value={profile.lastName} 
                    onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                    className="bg-secondary/30 border-border/50 focus:bg-background transition-all"
                  />
                </div>
              </div>
                            
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Логин
                </Label>
                <Input 
                  id="username" 
                  value={profile.username} 
                  onChange={(e) => setProfile({...profile, username: e.target.value})}
                  className="bg-secondary/30 border-border/50 focus:bg-background transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" /> Должность
                </Label>
                <Input 
                  id="position" 
                  value={profile.position} 
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
                  value={profile.department} 
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
                      value={profile.telegram} 
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
                      value={profile.phone} 
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
                    value={profile.email} 
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    className="bg-secondary/30 border-border/50 focus:bg-background transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-500" /> Заметки
                  </Label>
                  <Textarea 
                    id="notes" 
                    value={profile.notes} 
                    onChange={(e) => setProfile({...profile, notes: e.target.value})}
                    placeholder="Добавьте краткую информацию о себе..."
                    className="bg-secondary/30 border-border/50 focus:bg-background transition-all min-h-[100px]"
                />
              </div>
            </CardContent>
            <CardFooter className="bg-secondary/5 border-t border-border/50 px-6 py-4 flex justify-end">
              <Button onClick={handleSaveProfile} className="gap-2 shadow-lg shadow-primary/20">
                <Save className="w-4 h-4" />
                Сохранить изменения
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
