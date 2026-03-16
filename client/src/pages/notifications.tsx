import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
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
  ChevronRight,
  Filter,
  CheckCheck,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const now = new Date();

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
    // Fallback for old format (plain text)
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

function NotificationItem({
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

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    onNavigate(notification);
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2.5 px-3 py-2.5 rounded-md transition-all duration-200",
        notification.isRead
          ? "bg-background hover:bg-accent/50"
          : "bg-primary/5 hover:bg-primary/10"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          notification.isRead ? config.bgColor : "bg-primary/20"
        )}
      >
        <Icon className={cn("w-4 h-4", notification.isRead ? config.color : "text-primary")} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] text-muted-foreground font-medium shrink-0">
            {formatTime(notification.createdAt)}
          </span>
          {content.userName && (
            <span className={cn(
              "font-medium text-sm",
              notification.isRead ? "text-muted-foreground" : "text-foreground"
            )}>
              {content.userName}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
          {content.action && (
            <span className="text-muted-foreground">{content.action}</span>
          )}
          {content.fieldName && (
            <span className={cn(
              "font-medium",
              notification.isRead ? "text-muted-foreground" : "text-foreground"
            )}>
              {content.fieldName}
            </span>
          )}
          {content.oldValue && content.newValue && (
            <span className="text-muted-foreground">
              с <span className="line-through text-muted-foreground/60">"{content.oldValue}"</span> на <span className="font-medium text-primary">"{content.newValue}"</span>
            </span>
          )}
          {content.newValue && !content.oldValue && !content.fieldName?.includes("Комментарий") && (
            <span className="text-muted-foreground">
              <span className="font-medium text-primary">"{content.newValue}"</span>
            </span>
          )}
        </div>

        {content.taskTitle && (
          <p className={cn(
            "text-xs mt-1",
            notification.isRead ? "text-muted-foreground" : "text-foreground/70"
          )}>
            в задаче{" "}
            <span
              className={cn(
                "cursor-pointer",
                isClickable && "hover:text-primary hover:underline"
              )}
              onClick={isClickable ? handleTitleClick : undefined}
            >
              "{content.taskTitle}"
            </span>
            {content.boardName && ` (${content.boardName})`}
          </p>
        )}

        {content.commentPreview && (
          <p className={cn(
            "text-xs mt-1 italic",
            notification.isRead ? "text-muted-foreground" : "text-foreground/70"
          )}>
            "{content.commentPreview}"
          </p>
        )}

        {!content.userName && !content.action && (
          <p className={cn(
            "text-xs",
            notification.isRead ? "text-muted-foreground" : "text-foreground/70"
          )}>
            {notification.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
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
            <ChevronRight className="h-3.5 w-3.5" />
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

      {!notification.isRead && (
        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

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
      const readNotifications = notifications.filter((n) => n.isRead);
      await Promise.all(readNotifications.map((n) => apiRequest("DELETE", `/api/notifications/${n.id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast.success("Прочитанные уведомления удалены");
    },
  });

  useEffect(() => {
    const socket: Socket = io({
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Notifications page socket connected");
    });

    socket.on("new-notification", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const filteredNotifications = notifications.filter((n) => {
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BellRing className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Уведомления</h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} непрочитанных
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Отметить все прочитанными
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
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
                {notifications.some((n) => n.isRead) && (
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

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск уведомлений..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationType | "all")}>
            <TabsList>
              <TabsTrigger value="all">Все</TabsTrigger>
              {Object.entries(notificationTypeConfig).map(([key, config]) => (
                <TabsTrigger key={key} value={key}>
                  <config.icon className="h-4 w-4 mr-1" />
                  {config.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Нет уведомлений</p>
            <p className="text-sm">Уведомления будут отображаться здесь</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-6">
              {Object.entries(groupedNotifications).map(([group, items]) => {
                if (items.length === 0) return null;

                return (
                  <div key={group}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      {dateGroupLabels[group]} ({items.length})
                    </h3>
                    <div className="space-y-2">
                      {items.map((notification) => (
                        <NotificationItem
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
          </ScrollArea>
        )}
      </div>
    </Layout>
  );
}