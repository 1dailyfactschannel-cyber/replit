"use client"

import { BellRing, X, Clock, Check } from "lucide-react"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { Notification } from "@shared/schema"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

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

export function NotificationAlertDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [showAllNotifications, setShowAllNotifications] = useState(false)

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

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/notifications/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] })
        },
    })

    const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0

    const getInitials = (title: string) => {
        return title
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
    }

    const formatTime = (date: Date | string | null) => {
        if (!date) return ""
        return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ru })
    }

    return (
        <>
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-secondary">
                        <BellRing className="h-5 w-5 text-muted-foreground" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
                        )}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-indigo-200 dark:border-indigo-900 border-2 max-w-md bg-white dark:bg-gray-900">
                    <AlertDialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BellRing className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                                <AlertDialogTitle className="dark:text-white text-foreground">Уведомления</AlertDialogTitle>
                            </div>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAllAsReadMutation.mutate()}
                                    className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-black/50"
                                >
                                    Прочитать все
                                </Button>
                            )}
                        </div>
                        <AlertDialogDescription className="dark:text-gray-400">
                            У вас {unreadCount} {unreadCount === 1 ? "непрочитанное сообщение" : "непрочитанных сообщений"}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="my-3 space-y-2 max-h-[300px] overflow-y-auto">
                        {!notifications || notifications.length === 0 ? (
                            <p className="text-center py-4 text-muted-foreground">Нет уведомлений</p>
                        ) : (
                            notifications.slice(0, 3).map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-md transition-all duration-200 cursor-pointer",
                                        notification.isRead ? "bg-gray-100 dark:bg-gray-800" : "bg-indigo-50 dark:bg-indigo-900/40 shadow-sm",
                                    )}
                                    onClick={() => !notification.isRead && markAsReadMutation.mutate(notification.id)}
                                >
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0",
                                            notification.isRead
                                                ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                                : "bg-indigo-200 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300",
                                        )}
                                    >
                                        {getInitials(notification.title)}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p
                                            className={cn(
                                                "text-sm font-medium",
                                                notification.isRead ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white",
                                            )}
                                        >
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notification.message}</p>
                                        <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {formatTime(notification.createdAt)}
                                        </div>
                                    </div>
                                    {!notification.isRead && (
                                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0"></span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
                        >
                            Закрыть
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-indigo-500 hover:bg-indigo-600 dark:text-white dark:bg-indigo-700 dark:hover:bg-indigo-800"
                            onClick={() => {
                                setShowAllNotifications(true)
                                document.body.classList.add("overflow-hidden")
                            }}
                        >
                            Показать все
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div
                className={cn(
                    "fixed inset-0 bg-black/60 dark:bg-black/80 z-[60] transition-opacity duration-300",
                    showAllNotifications ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
                onClick={() => {
                    setShowAllNotifications(false)
                    document.body.classList.remove("overflow-hidden")
                }}
            />
            <div
                className={cn(
                    "fixed top-0 right-0 h-full shadow-2xl transition-transform duration-300 ease-in-out transform w-full max-w-md z-[70]",
                    "bg-white dark:bg-[#0f172a] border-l border-gray-200 dark:border-gray-800",
                    showAllNotifications ? "translate-x-0" : "translate-x-full",
                )}
            >
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BellRing className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                                <h2 className="text-lg font-semibold dark:text-white text-foreground">Все уведомления</h2>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setShowAllNotifications(false)
                                    document.body.classList.remove("overflow-hidden")
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                                <span className="sr-only">Закрыть</span>
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-800">
                            {!notifications || notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                    <BellRing className="h-12 w-12 mb-2 text-gray-300 dark:text-gray-700" />
                                    <p>Нет уведомлений</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "flex items-start gap-3 p-4 rounded-lg transition-all duration-200 cursor-pointer text-left relative group",
                                            notification.isRead
                                                ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                                : "bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 shadow-sm",
                                        )}
                                        onClick={() => !notification.isRead && markAsReadMutation.mutate(notification.id)}
                                    >
                                        <div
                                            className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0",
                                                notification.isRead
                                                    ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                                    : "bg-indigo-200 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300",
                                            )}
                                        >
                                            {getInitials(notification.title)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p
                                                    className={cn(
                                                        "text-sm font-medium",
                                                        notification.isRead ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white",
                                                    )}
                                                >
                                                    {notification.title}
                                                </p>
                                                <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {formatTime(notification.createdAt)}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>

                                            {notification.isRead && (
                                                <div className="flex items-center mt-2 text-xs text-indigo-500 dark:text-indigo-400">
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Прочитано
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                deleteMutation.mutate(notification.id)
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                        {!notification.isRead && (
                                            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0 mt-2"></span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                            <Button
                                className="w-full bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                                onClick={() => {
                                    markAllAsReadMutation.mutate()
                                    setShowAllNotifications(false)
                                    document.body.classList.remove("overflow-hidden")
                                }}
                                disabled={unreadCount === 0}
                            >
                                Прочитать все
                            </Button>
                        </div>
                    </div>
                </div>
        </>
    )
}
