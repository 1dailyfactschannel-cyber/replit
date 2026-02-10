import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { 
  Settings, 
  Bell, 
  ChevronRight,
  Lock,
  Eye,
  Key,
  Save,
  Loader2,
  Shield
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("security");

  const sections = [
    { id: "security", label: "Безопасность", icon: Lock, description: "Пароль и защита аккаунта" },
    { id: "notifications", label: "Уведомления", icon: Bell, description: "Системные оповещения" },
  ];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Настройки
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
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Система активна</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          <header className="p-6 border-b border-border/50 shrink-0 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold tracking-tight">
                {sections.find(s => s.id === activeSection)?.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {sections.find(s => s.id === activeSection)?.description}
              </p>
            </div>
          </header>

          <ScrollArea className="flex-1">
            <div className="p-8 max-w-3xl mx-auto">
              {activeSection === "security" ? (
                <SecuritySettings />
              ) : activeSection === "notifications" ? (
                <NotificationSettings />
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

function NotificationSettings() {
  const settings = [
    { id: "email-tasks", label: "Email уведомления", desc: "Получать отчеты о новых задачах на почту", defaultChecked: true },
    { id: "push-messages", label: "Push уведомления", desc: "Всплывающие окна о новых сообщениях в чате", defaultChecked: true },
    { id: "mentions", label: "Упоминания", desc: "Уведомлять, когда вас отмечают в комментариях", defaultChecked: true },
    { id: "deadlines", label: "Дедлайны", desc: "Напоминания о приближающихся сроках задач", defaultChecked: false },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 py-4 px-6">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Системные уведомления</CardTitle>
          <CardDescription className="text-xs">Выберите, о каких событиях вы хотите знать</CardDescription>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border/50">
          {settings.map((s) => (
            <div key={s.id} className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors">
              <div className="space-y-0.5">
                <Label htmlFor={s.id} className="text-sm font-bold cursor-pointer">{s.label}</Label>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <Switch id={s.id} defaultChecked={s.defaultChecked} />
            </div>
          ))}
        </CardContent>
        <CardFooter className="bg-muted/10 border-t border-border/40 px-6 py-4 flex justify-end">
          <Button size="sm" className="gap-2">
            <Save className="w-4 h-4" />
            Сохранить настройки
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function SecuritySettings() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
    
    // Копирование в буфер обмена
    navigator.clipboard.writeText(password).then(() => {
      toast({
        title: "Пароль сгенерирован и скопирован",
        description: "Новый пароль заполнен и сохранен в буфер обмена.",
      });
    }).catch(() => {
      toast({
        title: "Пароль сгенерирован",
        description: "Новый пароль был автоматически заполнен.",
      });
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Пароли не совпадают");
      }
      await apiRequest("POST", "/api/user/change-password", { currentPassword, newPassword });
    },
    onSuccess: () => {
      toast({
        title: "Пароль изменен",
        description: "Ваш пароль был успешно обновлен.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить пароль.",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 py-3 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-amber-500 text-white shadow-sm">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Смена пароля</CardTitle>
                <CardDescription className="text-[10px]">Защита вашего аккаунта</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-passwords" 
                checked={showPasswords}
                onCheckedChange={(checked) => setShowPasswords(!!checked)}
                className="h-3.5 w-3.5"
              />
              <label
                htmlFor="show-passwords"
                className="text-[11px] font-medium leading-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                Показать пароли
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Текущий</Label>
              <Input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-8 text-sm bg-muted/20 border-border/50 focus:bg-background transition-all"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Новый</Label>
              <Input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-8 text-sm bg-muted/20 border-border/50 focus:bg-background transition-all"
                placeholder="Новый пароль"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Повтор</Label>
              <Input
                id="confirm-password"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-8 text-sm bg-muted/20 border-border/50 focus:bg-background transition-all"
                placeholder="Повторите пароль"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 border-t border-border/40 px-6 py-4 flex justify-end gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateRandomPassword}
            className="gap-2 h-8 text-[11px] font-bold border-border/60 hover:bg-background"
          >
            <Key className="w-3 h-3" />
            Сгенерировать
          </Button>
          <Button 
            size="sm" 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending}
            className="gap-2 h-8 text-[11px] font-bold shadow-sm"
          >
            {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Сохранить изменения
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
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
