import { useCallback, useEffect } from "react";
import { toast } from "sonner";

export function useNotifications() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notification");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  const subscribeToPush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "YOUR_PUBLIC_VAPID_KEY" // В будущем здесь должен быть ключ
      });
      console.log("Push subscription:", subscription);
      // Здесь нужно отправить подписку на сервер
      return subscription;
    } catch (error) {
      console.error("Failed to subscribe to push:", error);
      return null;
    }
  }, []);

  const notify = useCallback(async (title: string, options?: NotificationOptions & { internalOnly?: boolean }) => {
    // Always show internal toast
    toast(title, {
      description: options?.body,
    });

    if (options?.internalOnly) return;

    // Show browser notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          ...options,
          icon: "/favicon.png",
          badge: "/favicon.png",
        });
      } catch (e) {
        new Notification(title, options);
      }
    } else if ("Notification" in window && Notification.permission !== "denied") {
      const granted = await requestPermission();
      if (granted) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          ...options,
          icon: "/favicon.png",
          badge: "/favicon.png",
        });
      }
    }
  }, [requestPermission]);

  return { notify, requestPermission, subscribeToPush };
}
