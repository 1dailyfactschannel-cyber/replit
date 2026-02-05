import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

export default function Auth() {
  const [, setLocation] = useLocation();
  const { login } = useUser();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Ошибка входа");
      }

      const result = await response.json();
      console.log("Login successful:", result.user);
      
      // Сохраняем данные пользователя в контекст
      await login(result.user);
      
      toast({
        title: "Успешный вход",
        description: `Добро пожаловать, ${result.user.firstName}!`,
      });
      
      setLocation("/");
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Ошибка входа",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const email = formData.get("reg-email") as string;
    const password = formData.get("reg-password") as string;
    const firstName = formData.get("first-name") as string || "";
    const lastName = formData.get("last-name") as string || "";

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password, firstName, lastName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Ошибка регистрации");
      }

      // После успешной регистрации сразу выполняем вход
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (loginResponse.ok) {
        const result = await loginResponse.json();
        console.log("Registration and login successful:", result.user);
        
        // Сохраняем данные пользователя в контекст
        await login(result.user);
        
        toast({
          title: "Регистрация успешна",
          description: `Добро пожаловать, ${result.user.firstName}!`,
        });
        
        setLocation("/");
      } else {
        throw new Error("Ошибка автоматического входа после регистрации");
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Ошибка регистрации",
        description: err.message,
        variant: "destructive",
      });
    }
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
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" name="email" placeholder="name@example.com" className="pl-10 h-11" type="email" required />
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
                      name="password"
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
              <form onSubmit={handleRegister} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">Имя</Label>
                    <Input id="first-name" name="first-name" placeholder="Иван" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Фамилия</Label>
                    <Input id="last-name" name="last-name" placeholder="Иванов" className="h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Имя пользователя</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="username" name="username" placeholder="ivanov" className="pl-10 h-11" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-email" name="reg-email" placeholder="name@example.com" className="pl-10 h-11" type="email" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="reg-password" 
                      name="reg-password"
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