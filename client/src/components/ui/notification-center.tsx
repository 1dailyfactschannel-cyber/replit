import { useState, useEffect } from "react";
import { Bell, MessageSquare, Calendar, Phone, Check, Trash2, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export interface AppNotification {
  id: string;
  type: "chat" | "task" | "calendar" | "call" | "system";
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationCenterProps {
  notifications?: AppNotification[];
  onNotificationClick?: (notification: AppNotification) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
}

export function NotificationCenter({
  notifications = [],
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<AppNotification[]>(notifications);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const unreadCount = localNotifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
      setLocalNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      onMarkAsRead?.(id);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest("POST", "/api/notifications/read-all");
      setLocalNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      onMarkAllAsRead?.();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest("DELETE", `/api/notifications/${id}`);
      setLocalNotifications(prev => prev.filter(n => n.id !== id));
      onDelete?.(id);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "chat":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "task":
        return <Check className="w-4 h-4 text-green-500" />;
      case "calendar":
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case "call":
        return <Phone className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Только что";
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString("ru-RU");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Уведомления</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-auto p-1"
              onClick={handleMarkAllAsRead}
            >
              Прочитать все
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {localNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Нет уведомлений</p>
            </div>
          ) : (
            <div className="divide-y">
              {localNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-secondary/50 cursor-pointer transition-colors relative group",
                    !notification.isRead && "bg-blue-500/5"
                  )}
                  onClick={() => {
                    onNotificationClick?.(notification);
                    if (!notification.isRead) {
                      handleMarkAsRead(notification.id, {} as React.MouseEvent);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        !notification.isRead && "font-semibold"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                      onClick={(e) => handleDelete(notification.id, e)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {!notification.isRead && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
