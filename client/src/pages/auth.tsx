import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Github, Loader2, MailOpen } from "lucide-react";
import DarkVeil from "@/components/DarkVeil";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Invitation handling
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      setCheckingInvite(true);
      apiRequest("GET", `/api/team/invitations/${token}/verify`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.valid && data.invitation) {
              setInviteData(data.invitation);
              setRegEmail(data.invitation.email);
            }
          }
        })
        .catch(() => {})
        .finally(() => setCheckingInvite(false));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/login", { email: loginEmail, password: loginPassword });
      if (res.ok) {
        const user = await res.json();
        queryClient.setQueryData(["/api/user"], user);
        queryClient.invalidateQueries({ queryKey: ["/api/users/me/permissions"] });
        toast({ title: "Успешный вход", description: `Добро пожаловать, ${user.firstName || user.username}!` });
        setLocation("/");
      } else {
        const error = await res.json();
        toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Ошибка", description: "Не удалось войти в систему", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload: any = { email: regEmail, password: regPassword };
      if (inviteToken) {
        payload.inviteToken = inviteToken;
      }
      const res = await apiRequest("POST", "/api/register", payload);
      if (res.ok) {
        const user = await res.json();
        queryClient.setQueryData(["/api/user"], user);
        toast({ title: "Аккаунт создан", description: "Добро пожаловать в portal!" });
        setLocation("/");
      } else {
        const error = await res.json();
        toast({ title: "Ошибка регистрации", description: error.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Ошибка", description: "Не удалось создать аккаунт", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 overflow-hidden relative p-4">
      <div className="fixed inset-0 z-0">
        <DarkVeil 
          hueShift={0} 
          noiseIntensity={0} 
          scanlineIntensity={0} 
          speed={1.1} 
          scanlineFrequency={0} 
          warpAmount={0} 
          resolutionScale={1} 
        /> 
      </div>

      <div className="relative z-10 w-full max-w-[1100px] flex flex-col md:flex-row gap-8 items-center justify-center animate-in fade-in zoom-in duration-700">
        {/* Brand Content (Overlay) */}
        <div className="hidden lg:flex flex-col justify-center flex-1 space-y-6 text-white p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary font-bold text-3xl shadow-2xl">
              m4
            </div>
            <span className="font-sans font-bold text-3xl tracking-tight">portal</span>
          </div>
          <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight">
            Управляйте проектами <br />
            <span className="text-primary-foreground/60">с умом и легкостью.</span>
          </h1>
          <p className="text-xl text-white/70 max-w-md font-medium leading-relaxed">
            Объедините вашу команду в одном цифровом пространстве. Задачи, чаты и календарь под полным контролем.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="w-full max-w-md border-white/10 shadow-2xl relative z-10 backdrop-blur-2xl bg-black/40 text-white overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          <CardHeader className="space-y-2 pt-8 text-center">
            {!isForgotPassword && (
              <div className="lg:hidden flex justify-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary font-bold text-xl">T</div>
              </div>
            )}
            <CardTitle className="text-3xl font-bold tracking-tight">
              {isForgotPassword ? "Восстановление" : "Добро пожаловать"}
            </CardTitle>
            <CardDescription className="text-white/50 text-base">
              {isForgotPassword 
                ? "Введите email для сброса пароля" 
                : "Введите свои данные для входа"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-8">
            {isForgotPassword ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-white/70 ml-1">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                    <Input id="reset-email" placeholder="name@example.com" className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:ring-primary/50" type="email" />
                  </div>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/5 p-1 rounded-xl border border-white/10">
                  <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-black transition-all">Вход</TabsTrigger>
                  <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-black transition-all">Регистрация</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-5">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/70 ml-1">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <Input 
                          id="email" 
                          placeholder="admin@teamsync.ru" 
                          className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:ring-primary/50" 
                          type="email" 
                          required 
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <Label htmlFor="password" className="text-white/70">Пароль</Label>
                        <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs font-medium text-primary-foreground/60 hover:text-white transition-colors">
                          Забыли пароль?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          className="pl-12 pr-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:ring-primary/50" 
                          required 
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      className="w-full h-12 font-bold text-base bg-white text-black hover:bg-white/90 rounded-xl transition-all shadow-xl shadow-white/5" 
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Войти"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-5">
                  {checkingInvite && (
                    <div className="flex items-center justify-center gap-2 text-white/60 text-sm py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Проверка приглашения...
                    </div>
                  )}
                  {inviteData && (
                    <div className="bg-primary/20 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
                      <MailOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">Приглашение в команду</p>
                        <p className="text-xs text-white/60">
                          Вы были приглашены присоединиться к portal.
                          {inviteData.role && (
                            <span> Роль: <span className="text-white/80 font-medium">{inviteData.role}</span>.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-white/70 ml-1">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <Input 
                          id="reg-email" 
                          placeholder="name@example.com" 
                          className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:ring-primary/50" 
                          type="email" 
                          required 
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-white/70 ml-1">Пароль</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <Input 
                          id="reg-password" 
                          type={showPassword ? "text" : "password"} 
                          className="pl-12 pr-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:ring-primary/50" 
                          required 
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      className="w-full h-12 font-bold text-base bg-white text-black hover:bg-white/90 rounded-xl transition-all shadow-xl shadow-white/5" 
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Создать аккаунт"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-6 pb-10 px-8">
            {isForgotPassword ? (
              <div className="w-full space-y-3">
                <Button className="w-full h-12 bg-white text-black hover:bg-white/90 rounded-xl" onClick={() => setIsForgotPassword(false)}>
                  Отправить инструкции
                </Button>
                <Button variant="ghost" className="w-full text-white/50 hover:text-white hover:bg-white/5" onClick={() => setIsForgotPassword(false)}>
                  Вернуться к входу
                </Button>
              </div>
            ) : (
              <>
                <p className="text-center text-xs text-white/30 leading-relaxed px-4 mt-4">
                  Нажимая "Продолжить", вы соглашаетесь с{" "}
                  <a href="#" className="underline hover:text-white transition-colors">Условиями</a> и{" "}
                  <a href="#" className="underline hover:text-white transition-colors">Политикой</a>.
                </p>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
