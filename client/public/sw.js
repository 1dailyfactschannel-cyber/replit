const CACHE_NAME = 'm4portal-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = {
    title: 'Новое уведомление',
    body: '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'default',
    data: {
      url: '/'
    },
    actions: []
  };

  if (event.data) {
    try {
      const eventData = event.data.json();
      data = {
        ...data,
        ...eventData,
        data: {
          ...data.data,
          ...(eventData.data || {})
        }
      };
    } catch (e) {
      data.body = event.data.text() || '';
    }
  }

  // Define actions based on notification type
  const type = data.data?.type || 'default';
  switch (type) {
    case 'chat':
      data.actions = [
        { action: 'reply', title: 'Ответить' },
        { action: 'markRead', title: 'Прочитано' }
      ];
      break;
    case 'task':
      data.actions = [
        { action: 'open', title: 'Открыть' },
        { action: 'complete', title: 'Выполнено' }
      ];
      break;
    case 'call':
      data.actions = [
        { action: 'answer', title: 'Принять' },
        { action: 'decline', title: 'Отклонить' }
      ];
      break;
    default:
      data.actions = [
        { action: 'open', title: 'Открыть' }
      ];
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    actions: data.actions,
    vibrate: [100, 50, 100],
    requireInteraction: data.data?.requireInteraction || false,
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  // Handle different actions
  if (action === 'reply' && data.chatId) {
    // Open chat with reply
    event.waitUntil(
      clients.openWindow(`/chat?message=${data.messageId}`)
    );
    return;
  }

  if (action === 'answer' || action === 'decline') {
    // Handle call actions via postMessage to client
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'call-action',
            action: action,
            callId: data.callId
          });
        });
      })
    );
    return;
  }

  if (action === 'markRead') {
    // Mark as read via API
    fetch(`/api/notifications/${data.notificationId}/read`, {
      method: 'PATCH',
      credentials: 'include'
    });
  }

  // Default: open the link
  const urlToOpen = data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // Focus if already open
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Get cached messages and send them
  const cache = await caches.open('pending-messages');
  const requests = await cache.keys();
  
  for (const request of requests) {
    const response = await fetch(request);
    if (response.ok) {
      await cache.delete(request);
    }
  }
}

// Message handler - receive messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
