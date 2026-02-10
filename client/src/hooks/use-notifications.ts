import { useCallback } from "react";
import { toast } from "sonner";

export function useNotifications() {
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

  const notify = useCallback(async (title: string, options?: NotificationOptions & { internalOnly?: boolean }) => {
    // Always show internal toast
    toast(title, {
      description: options?.body,
    });

    if (options?.internalOnly) return;

    // Show browser notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, options);
    } else if ("Notification" in window && Notification.permission !== "denied") {
      const granted = await requestPermission();
      if (granted) {
        new Notification(title, options);
      }
    }
  }, [requestPermission]);

  return { notify, requestPermission };
}
