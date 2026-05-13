const CACHE = 'habits-tracker-v3';
const ASSETS = ['./index.html', './manifest.json', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

const scheduledTimers = new Map();

self.addEventListener('message', e => {
  if (e.data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (e.data.type !== 'SCHEDULE_REMINDERS') return;

  scheduledTimers.forEach(t => clearTimeout(t));
  scheduledTimers.clear();

  e.data.reminders.forEach(r => {
    const [hh, mm] = r.time.split(':').map(Number);
    const now = new Date();
    const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
    const delay = fire - now;

    if (delay > 0) {
      const t = setTimeout(() => {
        self.registration.showNotification(`⏰ ${r.emoji} ${r.name}`, {
          body: "Don't forget to log your habit today!",
          icon: './apple-touch-icon.png',
          badge: './apple-touch-icon.png',
          tag: r.id,
          renotify: true
        });
      }, delay);
      scheduledTimers.set(r.id, t);
    } else if (delay > -3600000) {
      self.registration.showNotification(`${r.emoji} ${r.name}`, {
        body: 'Your reminder just passed — you can still log it!',
        icon: './apple-touch-icon.png',
        badge: './apple-touch-icon.png',
        tag: r.id + '-late'
      });
    }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./index.html'));
});
