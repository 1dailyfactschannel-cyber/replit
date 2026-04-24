import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  AlertCircle,
  Info,
  ChevronRight,
  X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface YandexCalendarConnectProps {
  onShowDetails?: () => void;
}

export function YandexCalendarConnect({ onShowDetails }: YandexCalendarConnectProps) {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Проверяем статус конфигурации при загрузке
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch("/api/integrations/yandex-calendar/config-status");
        const data = await res.json();
        if (!data.configured) {
          setConfigError(data.message);
        }
      } catch (err) {
        console.error("Failed to check config:", err);
      }
    };
    checkConfig();
  }, []);

  const { data: status, isLoading, error } = useQuery({
    queryKey: ["yandex-calendar-status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/yandex-calendar/status");
      if (res.status === 401) {
        throw new Error("Требуется авторизация. Пожалуйста, войдите в систему.");
      }
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/yandex-calendar/auth");
      if (res.status === 401) {
        throw new Error("Требуется авторизация. Пожалуйста, войдите в систему.");
      }
      if (res.status === 503) {
        const errorData = await res.json().catch(() => ({ message: "Сервис временно недоступен" }));
        throw new Error(errorData.message);
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to get auth URL");
      }
      return (await res.json()).authUrl;
    },
    onSuccess: (authUrl) => {
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(authUrl, "yandex-oauth", 
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );

      if (!popup) {
        alert("Не удалось открыть окно авторизации");
        return;
      }

      setIsConnecting(true);
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          queryClient.invalidateQueries({ queryKey: ["yandex-calendar-status"] });
        }
      }, 500);
    },
    onError: (error: any) => {
      alert(error.message || "Ошибка подключения");
      setIsConnecting(false);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/integrations/yandex-calendar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yandex-calendar-status"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/yandex-calendar/sync");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yandex-calendar-status"] });
    },
  });

  const handleConnect = () => {
    if (configError) {
      alert(configError + "\n\nОбратитесь к администратору системы.");
      return;
    }
    if (onShowDetails) {
      onShowDetails();
    } else {
      connectMutation.mutate();
    }
  };

  const isConnected = status?.connected;
  const isError = !!error || !!configError;
  const isNotConfigured = !!configError || error?.message?.includes("не настроена администратором");

  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col">
      {/* Status indicator line */}
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full transition-colors",
        isConnected ? "bg-emerald-500" : "bg-transparent"
      )} />
      
      <CardContent className="p-6 flex-1">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="p-3 rounded-2xl bg-[#FC3F1D] text-white shadow-lg transition-transform group-hover:scale-110 duration-300">
            {isError ? <AlertCircle className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm tracking-tight">Яндекс Календарь</h4>
              {isConnected && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-bold uppercase tracking-tighter h-4 px-1.5">
                  Активно
                </Badge>
              )}
              {isNotConfigured && (
                <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] font-bold uppercase tracking-tighter h-4 px-1.5">
                  Не настроено
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isConnected 
                ? (status.calendarName || "Синхронизация активна")
                : isNotConfigured
                  ? "Интеграция не настроена администратором системы"
                  : "Синхронизация событий и встреч с Яндекс Календарем"
              }
            </p>
            {status?.lastSync && (
              <p className="text-[10px] text-muted-foreground/70">
                Последняя синхронизация: {new Date(status.lastSync).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-muted/30 p-4 flex items-center justify-between border-t border-border/50">
        <div className="flex items-center gap-1.5">
          {!isConnected && !isLoading && (
            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              {isNotConfigured ? "Не настроено" : isError ? "Ошибка" : "Не подключено"}
            </span>
          )}
          {isLoading && (
            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              Загрузка...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onShowDetails?.()}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs font-bold px-4 border-border/50"
                onClick={() => onShowDetails?.()}
              >
                Настроить
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleConnect}
              >
                <Info className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="default"
                size="sm" 
                className="h-8 text-xs font-bold px-4 shadow-lg shadow-primary/20"
                onClick={handleConnect}
                disabled={isConnecting || connectMutation.isPending}
              >
                {isConnecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Подключить
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Detailed settings page component
export function YandexCalendarSettings({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  
  const { data: status, isLoading } = useQuery({
    queryKey: ["yandex-calendar-status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/yandex-calendar/status");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/yandex-calendar/auth");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).authUrl;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/integrations/yandex-calendar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yandex-calendar-status"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/yandex-calendar/sync");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yandex-calendar-status"] });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Назад к интеграциям
        </Button>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FC3F1D] flex items-center justify-center shadow-lg shadow-[#FC3F1D]/20">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Яндекс Календарь</CardTitle>
              <CardDescription>
                Синхронизация событий и встреч
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className={cn(
              "w-3 h-3 rounded-full",
              status?.connected ? "bg-emerald-500" : "bg-gray-400"
            )} />
            <div className="flex-1">
              <p className="font-medium">
                {status?.connected ? "Подключено" : "Не подключено"}
              </p>
              {status?.calendarName && (
                <p className="text-sm text-muted-foreground">
                  {status.calendarName}
                </p>
              )}
            </div>
            {status?.connected && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h3 className="font-semibold">Описание</h3>
            <p className="text-sm text-muted-foreground">
              Интеграция позволяет синхронизировать события из вашего Яндекс Календаря с календарем portal.
              После подключения все события будут автоматически отображаться в вашем календаре.
            </p>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Возможности:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Автоматическая синхронизация каждые 10 минут</li>
                <li>Поддержка повторяющихся событий</li>
                <li>Push-уведомления о предстоящих встречах</li>
                <li>Сохранение цветов событий из Яндекса</li>
              </ul>
            </div>
          </div>

          {/* Last Sync */}
          {status?.lastSync && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Последняя синхронизация</span>
              <span className="text-sm font-medium">
                {new Date(status.lastSync).toLocaleString('ru-RU')}
              </span>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
          {status?.connected ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Отключить
              </Button>
              <Button 
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", syncMutation.isPending && "animate-spin")} />
                Синхронизировать
              </Button>
            </>
          ) : (
            <Button 
              className="w-full"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Подключить Яндекс Календарь
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
