"use client"

import { BellRing, Clock, CheckSquare, MessageSquare, Calendar, Phone, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import type { Notification } from "@shared/schema"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { io, Socket } from "socket.io-client"
import { useLocation } from "wouter"
import { useNotifications } from "@/hooks/use-notifications"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const notificationTypeConfig = {
  task: { icon: CheckSquare, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  chat: { icon: MessageSquare, color: "text-green-500", bgColor: "bg-green-500/10" },
  calendar: { icon: Calendar, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  call: { icon: Phone, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  system: { icon: Settings, color: "text-gray-500", bgColor: "bg-gray-500/10" },
}

function getNotificationType(type: string) {
  if (type in notificationTypeConfig) {
    return type as keyof typeof notificationTypeConfig
  }
  return "system"
}

// Parse notification message (JSON or plain text)
interface ParsedNotificationData {
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  taskTitle?: string;
  boardName?: string;
  userName: string;
}

function parseNotificationMessage(message: string): ParsedNotificationData | null {
  try {
    const parsed = JSON.parse(message)
    return parsed as ParsedNotificationData
  } catch {
    return null
  }
}

// Format notification content for display
function formatNotificationContent(notification: Notification) {
  const data = parseNotificationMessage(notification.message)
  
  if (!data) {
    return {
      userName: null,
      action: null,
      detail: notification.message,
    }
  }

  const actionVerbs: Record<string, string> = {
    created: "создал(-а)",
    updated: "обновил(-а)",
    assigned: "назначил(-а)",
    changed: "изменил(-а)",
    comment_added: "прокомментировал(-а)",
    completed: "завершил(-а)",
  }

  const verb = actionVerbs[data.action] || data.action

  return {
    userName: data.userName,
    action: verb,
    fieldName: data.fieldName,
    oldValue: data.oldValue,
    newValue: data.newValue,
    taskTitle: data.taskTitle,
    boardName: data.boardName,
  }
}

export function NotificationAlertDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [, setLocation] = useLocation()
    const queryClient = useQueryClient()
    const { notify } = useNotifications()

    const { data: notifications = [] } = useQuery<Notification[]>({
        queryKey: ["/api/notifications"],
    })

    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("PATCH", `/api/notifications/${id}/read`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] })
        },
    })

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/notifications/read-all")
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] })
        },
    })

    useEffect(() => {
        const socket: Socket = io({
            transports: ["websocket"],
        })

        socket.on("connect", () => {
            console.log("Notification socket connected")
        })

        socket.on("new-notification", (notification: Notification) => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] })
            // Show browser notification
            const content = formatNotificationContent(notification)
            notify(notification.title, {
                body: content.userName 
                    ? `${content.userName} ${content.action || ''} ${content.fieldName || ''} ${content.taskTitle ? `в "${content.taskTitle}"` : ''}`
                    : notification.message,
                tag: notification.id,
                data: { url: notification.link || '/notifications' },
            })
        })

        return () => {
            socket.disconnect()
        }
    }, [queryClient, notify])

    const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0

    const formatTime = (date: Date | string | null) => {
        if (!date) return ""
        return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ru })
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsReadMutation.mutate(notification.id)
        }
        setIsDialogOpen(false)
        
        if (notification.link) {
            setLocation(notification.link)
            return
        }

        const type = getNotificationType(notification.type)
        switch (type) {
            case "task":
                setLocation("/tasks")
                break
            case "chat":
                setLocation("/chat")
                break
            case "calendar":
                setLocation("/calendar")
                break
            case "call":
                setLocation("/call")
                break
            default:
                break
        }
    }

    const handleShowAll = () => {
        setIsDialogOpen(false)
        setLocation("/notifications")
    }

    return (
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-secondary">
                    <BellRing className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BellRing className="h-5 w-5 text-primary" />
                            <AlertDialogTitle>Уведомления</AlertDialogTitle>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAllAsReadMutation.mutate()}
                                className="text-xs text-primary hover:text-primary/80"
                            >
                                Прочитать все
                            </Button>
                        )}
                    </div>
                    <AlertDialogDescription>
                        {unreadCount > 0 
                            ? `У вас ${unreadCount} ${unreadCount === 1 ? "непрочитанное уведомление" : unreadCount < 5 ? "непрочитанных уведомления" : "непрочитанных уведомлений"}`
                            : "Нет непрочитанных уведомлений"
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-3 space-y-2 max-h-[350px] overflow-y-auto">
                    {!notifications || notifications.length === 0 ? (
                        <p className="text-center py-4 text-muted-foreground">Нет уведомлений</p>
                    ) : (
                        notifications.slice(0, 5).map((notification) => {
                            const type = getNotificationType(notification.type)
                            const config = notificationTypeConfig[type]
                            const Icon = config.icon
                            const content = formatNotificationContent(notification)

                            return (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex items-start gap-2.5 p-2.5 rounded-md transition-all duration-200 cursor-pointer",
                                        notification.isRead 
                                            ? "bg-muted/30 hover:bg-muted/50" 
                                            : "bg-primary/10 hover:bg-primary/15",
                                    )}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div
                                        className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                            notification.isRead ? "bg-muted" : config.bgColor
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", notification.isRead ? "text-muted-foreground" : config.color)} />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className={cn(
                                            "text-xs truncate",
                                            notification.isRead ? "text-muted-foreground" : "text-foreground font-medium"
                                        )}>
                                            {content.userName && (
                                                <span className={notification.isRead ? "" : "font-medium"}>{content.userName}</span>
                                            )}
                                            {content.action && (
                                                <span className="text-muted-foreground"> {content.action}</span>
                                            )}
                                            {content.fieldName && (
                                                <span> {content.fieldName}</span>
                                            )}
                                            {content.newValue && !content.oldValue && (
                                                <span className="text-primary"> "{content.newValue}"</span>
                                            )}
                                            {content.taskTitle && (
                                                <span className="text-muted-foreground"> в "{content.taskTitle}"</span>
                                            )}
                                            {!content.userName && !content.action && notification.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {formatTime(notification.createdAt)}
                                        </p>
                                    </div>
                                    {!notification.isRead && (
                                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Закрыть</AlertDialogCancel>
                    <AlertDialogAction onClick={handleShowAll}>
                        Показать все уведомления
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}