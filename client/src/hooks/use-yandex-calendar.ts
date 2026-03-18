import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

function getCurrentUserId(): string | null {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.id?.toString() || null;
    }
  } catch {}
  return null;
}

export function useYandexCalendar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    
    const socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      query: userId ? { userId } : undefined,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Yandex Calendar socket connected", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
    });

    socket.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    // Listen for sync updates
    socket.on("calendar:yandex:sync", (data) => {
      toast({
        title: "Календарь синхронизирован",
        description: `${data.added} новых, ${data.updated} обновлено`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/yandex-events"] });
    });

    // Listen for event changes
    socket.on("calendar:yandex:event", (data) => {
      const messages: Record<string, string> = {
        new_event: `Новое событие: ${data.event.title}`,
        event_changed: `Событие обновлено: ${data.event.title}`,
        event_deleted: `Событие удалено: ${data.event.title}`,
      };

      toast({
        title: messages[data.type] || data.event.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/yandex-events"] });
    });

    // Listen for reminders
    socket.on("calendar:reminder", (data) => {
      // Show push notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(data.title, {
          body: data.body,
          icon: data.icon,
          tag: data.tag,
          requireInteraction: data.requireInteraction,
          data: data.data,
        });
      } else {
        // Fallback to toast
        toast({
          title: data.body,
          duration: 10000, // 10 seconds
        });
      }
    });

    // Listen for sound notifications
    socket.on("notification:sound", ({ type }) => {
      const audio = new Audio(`/sounds/${type}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    });

    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      socket.off("calendar:yandex:sync");
      socket.off("calendar:yandex:event");
      socket.off("calendar:reminder");
      socket.off("notification:sound");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, toast]);

  return socketRef.current;
}
