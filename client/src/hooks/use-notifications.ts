import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationData {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
}

export function useNotifications() {
  const [pushSubscription, setPushSubscription] = useState<PushSubscriptionData | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ("Notification" in window && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
    }

    // Register service worker
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

  const requestPermission = useCallback(async (): Promise<boolean> => {
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

  const subscribeToPush = useCallback(async (): Promise<PushSubscriptionData | null> => {
    if (!isSupported) {
      console.warn("Push notifications are not supported");
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // This would be your VAPID public key
          // For now, we'll use a placeholder
          "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"
        ),
      });

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: (subscription as any).getKey("p256dh"),
          auth: (subscription as any).getKey("auth"),
        },
      };

      // Send subscription to server
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription: subscriptionData }),
        credentials: "include",
      });

      setPushSubscription(subscriptionData);
      console.log("Push subscription successful:", subscriptionData);
      return subscriptionData;
    } catch (error) {
      console.error("Failed to subscribe to push:", error);
      return null;
    }
  }, [isSupported]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!pushSubscription) return true;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        await fetch("/api/notifications/unsubscribe", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: pushSubscription.endpoint }),
          credentials: "include",
        });
      }

      setPushSubscription(null);
      return true;
    } catch (error) {
      console.error("Failed to unsubscribe from push:", error);
      return false;
    }
  }, [pushSubscription]);

  const notify = useCallback(async (
    title: string,
    options?: NotificationData & { internalOnly?: boolean }
  ): Promise<void> => {
    // Always show internal toast
    if (title) {
      toast(title, {
        description: options?.body,
      });
    }

    if (options?.internalOnly) return;

    // Show browser notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(title, {
          body: options?.body || "",
          icon: options?.icon || "/favicon.png",
          badge: options?.badge || "/favicon.png",
          tag: options?.tag || "default",
          data: options?.data || {},
          requireInteraction: options?.requireInteraction || false,
        });
      } catch (e) {
        // Fallback to regular notification
        new Notification(title, {
          body: options?.body || "",
          icon: options?.icon || "/favicon.png",
        });
      }
    } else if ("Notification" in window && Notification.permission !== "denied") {
      const granted = await requestPermission();
      if (granted) {
        notify(title, options);
      }
    }
  }, [requestPermission]);

  // Listen for messages from service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "call-action") {
        // Handle call actions from notification click
        console.log("Call action received:", event.data);
        // This would be handled by the main app
      }
    });
  }, []);

  return {
    notify,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    isSupported,
    pushSubscription,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
