import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/use-notifications";
import {
  Bell,
  BellRing,
  CheckSquare,
  MessageSquare,
  Calendar,
  Phone,
  Settings,
  Search,
  Check,
  Trash2,
  Filter,
  CheckCheck,
  X,
  Clock,
  ArrowRight,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const notificationTypeConfig = {
  task: {
    icon: CheckSquare,
    label: "Задачи",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-200",
  },
  chat: {
    icon: MessageSquare,
    label: "Чат",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-200",
  },
  calendar: {
    icon: Calendar,
    label: "Календарь",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-200",
  },
  call: {
    icon: Phone,
    label: "Звонки",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-200",
  },
  system: {
    icon: Settings,
    label: "Система",
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-200",
  },
};

type NotificationType = keyof typeof notificationTypeConfig;

function getNotificationType(type: string): NotificationType {
  if (type in notificationTypeConfig) {
    return type as NotificationType;
  }
  return "system";
}

function groupNotificationsByDate(notifications: Notification[]) {
  const groups: { [key: string]: Notification[] } = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  notifications.forEach((notification) => {
    const date = notification.createdAt ? parseISO(notification.createdAt.toString()) : new Date();

    if (isToday(date)) {
      groups.today.push(notification);
    } else if (isYesterday(date)) {
      groups.yesterday.push(notification);
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      groups.thisWeek.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  });

  return groups;
}

// Parse notification message (JSON or plain text)
interface ParsedNotificationData {
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  taskTitle?: string;
  boardName?: string;
  chatName?: string;
  eventName?: string;
  commentPreview?: string;
  userName: string;
}

function parseNotificationMessage(message: string): ParsedNotificationData | null {
  try {
    const parsed = JSON.parse(message);
    return parsed as ParsedNotificationData;
  } catch {
    return null;
  }
}

// Format notification content for display
function formatNotificationContent(notification: Notification) {
  const data = parseNotificationMessage(notification.message);

  if (!data) {
    return {
      userName: null,
      action: null,
      fieldName: null,
      detail: notification.message,
    };
  }

  const actionVerbs: Record<string, string> = {
    created: "создал(-а)",
    updated: "обновил(-а)",
    assigned: "назначил(-а)",
    changed: "изменил(-а)",
    comment_added: "прокомментировал(-а)",
    completed: "завершил(-а)",
    mentioned: "упомянул(-а)",
    status_changed: "изменил(-а) статус",
    due_soon: "истекает срок",
    invited: "пригласил(-а)",
  };

  const verb = actionVerbs[data.action] || data.action;

  return {
    userName: data.userName,
    action: verb,
    fieldName: data.fieldName,
    oldValue: data.oldValue,
    newValue: data.newValue,
    taskTitle: data.taskTitle,
    boardName: data.boardName,
    commentPreview: data.commentPreview,
  };
}

function CompactNotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notification: Notification) => void;
}) {
  const type = getNotificationType(notification.type);
  const config = notificationTypeConfig[type];
  const Icon = config.icon;

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? parseISO(date) : new Date(date);
    return formatDistanceToNow(d, { addSuffix: true, locale: ru });
  };

  const content = formatNotificationContent(notification);
  const isClickable = notification.link || type === "task" || type === "chat" || type === "calendar" || type === "call";

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    onNavigate(notification);
  };

  // Build compact text line
  const buildCompactText = () => {
    const parts: string[] = [];
    if (content.userName) parts.push(content.userName);
    if (content.action) parts.push(content.action);
    if (content.fieldName) parts.push(content.fieldName);
    if (content.newValue && !content.oldValue) parts.push(`"${content.newValue}"`);
    if (content.taskTitle) parts.push(`в "${content.taskTitle}"`);
    if (content.commentPreview) parts.push(`: "${content.commentPreview.substring(0, 50)}${content.commentPreview.length > 50 ? '...' : ''}"`);
    return parts.join(" ");
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer",
        notification.isRead
          ? "bg-background hover:bg-accent/40"
          : "bg-primary/[0.04] hover:bg-primary/[0.08]"
      )}
      onClick={handleClick}
    >
      {/* Unread dot */}
      <div className="w-1.5 h-1.5 shrink-0">
        {!notification.isRead && (
          <span className="block w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </div>

      {/* Icon */}
      <div
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
          config.bgColor
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <p className={cn(
          "text-sm truncate flex-1",
          notification.isRead ? "text-muted-foreground" : "text-foreground font-medium"
        )}>
          {content.userName || content.action ? buildCompactText() : notification.message}
        </p>
        <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
          {formatTime(notification.createdAt)}
        </span>
      </div>

      {/* Actions - visible on hover */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            title="Отметить как прочитанное"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        {isClickable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(notification);
            }}
            title="Перейти"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="Удалить"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();
  const { notify } = useNotifications();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["/api/notifications", "paginated"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/notifications?page=${pageParam}&limit=20`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json() as Promise<{ notifications: Notification[]; pagination: { page: number; total: number; totalPages: number } }>;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.pagination?.page < lastPage?.pagination?.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const notifications = data?.pages?.flatMap((page) => page?.notifications || []) || [];

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast.success("Все уведомления отмечены как прочитанные");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast.success("Уведомление удалено");
    },
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const readNotifications = notifications.filter((n: Notification) => n.isRead);
      await Promise.all(readNotifications.map((n: Notification) => apiRequest("DELETE", `/api/notifications/${n.id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast.success("Прочитанные уведомления удалены");
    },
  });

  useEffect(() => {
    const socket: Socket = io({
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Notifications page socket connected");
    });

    socket.on("new-notification", (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      // Show browser notification if page is not visible
      if (document.hidden) {
        const content = formatNotificationContent(notification);
        notify(notification.title, {
          body: content.userName
            ? `${content.userName} ${content.action || ''} ${content.fieldName || ''} ${content.taskTitle ? `в "${content.taskTitle}"` : ''}`
            : notification.message,
          tag: notification.id,
          data: { url: notification.link || '/notifications' },
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, notify]);

  const filteredNotifications = notifications.filter((n: Notification) => {
    const matchesSearch =
      search === "" ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || n.type === typeFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "unread" && !n.isRead) ||
      (statusFilter === "read" && n.isRead);

    return matchesSearch && matchesType && matchesStatus;
  });

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  const handleNavigate = (notification: Notification) => {
    const type = getNotificationType(notification.type);

    if (notification.link) {
      setLocation(notification.link);
      return;
    }

    switch (type) {
      case "task":
        setLocation("/tasks");
        break;
      case "chat":
        setLocation("/chat");
        break;
      case "calendar":
        setLocation("/calendar");
        break;
      case "call":
        setLocation("/call");
        break;
      default:
        break;
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const dateGroupLabels: { [key: string]: string } = {
    today: "Сегодня",
    yesterday: "Вчера",
    thisWeek: "На этой неделе",
    earlier: "Ранее",
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-4 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <BellRing className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Уведомления</h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} непрочитанных
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                Прочитать все
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className={cn("h-8 w-8", showSettings && "bg-accent")}
              onClick={() => setShowSettings(!showSettings)}
              title="Настройки уведомлений"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  Фильтры
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setStatusFilter("all")}
                  className={cn(statusFilter === "all" && "bg-accent")}
                >
                  Все уведомления
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("unread")}
                  className={cn(statusFilter === "unread" && "bg-accent")}
                >
                  Непрочитанные
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("read")}
                  className={cn(statusFilter === "read" && "bg-accent")}
                >
                  Прочитанные
                </DropdownMenuItem>
                {notifications.some((n: Notification) => n.isRead) && (
                  <>
                    <div className="border-t my-1" />
                    <DropdownMenuItem
                      onClick={() => deleteAllReadMutation.mutate()}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить прочитанные
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-4 p-3 rounded-lg border bg-muted/30 space-y-3">
            <h3 className="text-sm font-medium">Настройки уведомлений</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(notificationTypeConfig).map(([key, config]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-md bg-background">
                  <div className="flex items-center gap-2">
                    <config.icon className={cn("w-4 h-4", config.color)} />
                    <Label htmlFor={`notif-${key}`} className="text-sm cursor-pointer">{config.label}</Label>
                  </div>
                  <Switch id={`notif-${key}`} defaultChecked />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-background">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <Label htmlFor="notif-browser" className="text-sm cursor-pointer">Браузерные уведомления</Label>
              </div>
              <Switch id="notif-browser" />
            </div>
          </div>
        )}

        {/* Search and Type Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск уведомлений..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationType | "all")}>
            <TabsList className="h-9 border border-border/50">
              <TabsTrigger value="all" className="text-xs">Все</TabsTrigger>
              {Object.entries(notificationTypeConfig).map(([key, config]) => (
                <TabsTrigger key={key} value={key} className="text-xs px-2.5">
                  <config.icon className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-base font-medium">Нет уведомлений</p>
            <p className="text-sm">Уведомления будут отображаться здесь</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-240px)]">
            <div className="space-y-1">
              {Object.entries(groupedNotifications).map(([group, items]) => {
                if (items.length === 0) return null;

                return (
                  <div key={group} className="mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                      {dateGroupLabels[group]} ({items.length})
                    </h3>
                    <div className="space-y-0.5">
                      {items.map((notification) => (
                        <CompactNotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                          onDelete={handleDelete}
                          onNavigate={handleNavigate}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Load More */}
            {hasNextPage && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="h-8 text-xs"
                >
                  {isFetchingNextPage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  ) : null}
                  Загрузить ещё
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </Layout>
  );
}
