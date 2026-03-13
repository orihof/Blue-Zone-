self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Blue Zone', {
      body: data.body ?? 'Your protocol is ready',
      icon: '/icons/bz-icon-192.png',
      badge: '/icons/bz-badge-72.png',
      data: { url: data.url ?? '/app/results' },
    })
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
