import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

export function useYandexCalendar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket
    const socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Yandex Calendar socket connected");
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
