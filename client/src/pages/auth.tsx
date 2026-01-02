import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Github } from "lucide-react";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation("/");
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Восстановление пароля</CardTitle>
            <CardDescription>
              Введите ваш email, и мы отправим вам инструкции по сбросу пароля.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="reset-email" placeholder="name@example.com" className="pl-10" type="email" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" onClick={() => setIsForgotPassword(false)}>
              Отправить инструкции
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setIsForgotPassword(false)}>
              Вернуться к входу
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background overflow-hidden">
      {/* Brand Side */}
      <div className="hidden md:flex md:w-1/2 bg-primary p-12 flex-col justify-between text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-indigo-700" />
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 0 L100 100 M0 100 L100 0" stroke="currentColor" strokeWidth="0.5" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary font-bold text-2xl shadow-lg">
              T
            </div>
            <span className="font-sans font-bold text-2xl tracking-tight">TeamSync</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Управляйте проектами <br />с умом и легкостью.
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md font-medium">
            Объедините вашу команду в одном цифровом пространстве. Задачи, чаты и календарь под полным контролем.
          </p>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
          <p className="italic text-primary-foreground/90 mb-4">
            "TeamSync помог нам сократить время на планирование вдвое. Это лучший инструмент для нашей дизайн-студии."
          </p>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white/20">
              <AvatarFallback className="bg-white/20 text-white">ЮД</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-sm text-white">Юлия Дарицкая</p>
              <p className="text-xs text-primary-foreground/60 text-white/70">Product Lead, CreativeFlow</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Side */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Добро пожаловать</h2>
            <p className="text-muted-foreground mt-2">Введите свои данные для доступа к платформе.</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" placeholder="name@example.com" className="pl-10 h-11" type="email" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Пароль</Label>
                    <button 
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Забыли пароль?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      className="pl-10 pr-10 h-11" 
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button className="w-full h-11 font-semibold shadow-lg shadow-primary/20 mt-2" type="submit">
                  Войти
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Полное имя</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder="Иван Иванов" className="pl-10 h-11" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-email" placeholder="name@example.com" className="pl-10 h-11" type="email" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="reg-password" 
                      type={showPassword ? "text" : "password"} 
                      className="pl-10 pr-10 h-11" 
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button className="w-full h-11 font-semibold shadow-lg shadow-primary/20 mt-2" type="submit">
                  Создать аккаунт
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Или продолжить через</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button variant="outline" className="h-11 gap-2 border-border/60 hover:bg-secondary/50">
              <Github className="h-4 w-4" />
              GitHub
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground px-8 leading-relaxed">
            Нажимая "Продолжить", вы соглашаетесь с нашими{" "}
            <a href="#" className="underline hover:text-primary transition-colors">Условиями использования</a> и{" "}
            <a href="#" className="underline hover:text-primary transition-colors">Политикой конфиденциальности</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Avatar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-full overflow-hidden flex items-center justify-center bg-muted shrink-0", className)}>{children}</div>;
}

function AvatarFallback({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("w-full h-full flex items-center justify-center font-medium", className)}>{children}</div>;
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
