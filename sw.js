// Service Worker متقدم - موسوعة الأعشاب الطبية
const CACHE_NAME = 'herbal-pwa-v6';
const STATIC_CACHE = 'herbal-static-v6';
const DYNAMIC_CACHE = 'herbal-dynamic-v6';
const IMAGE_CACHE = 'herbal-images-v6';

const STATIC_ASSETS = [
  '/Encyclopedia-of-Herbal-Medicine/',
  '/Encyclopedia-of-Herbal-Medicine/index.html',
  '/Encyclopedia-of-Herbal-Medicine/offline.html',
  '/Encyclopedia-of-Herbal-Medicine/help.html',
  '/Encyclopedia-of-Herbal-Medicine/privacy.html',
  '/Encyclopedia-of-Herbal-Medicine/manifest.json',
  '/Encyclopedia-of-Herbal-Medicine/css/style.css',
  '/Encyclopedia-of-Herbal-Medicine/js/firebase-config.js',
  '/Encyclopedia-of-Herbal-Medicine/js/app.js',
  '/Encyclopedia-of-Herbal-Medicine/js/pwa.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js'
];

const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>غير متصل - موسوعة الأعشاب</title><style>body{font-family:'Cairo',sans-serif;background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}.offline-container{padding:20px}.offline-icon{font-size:80px;margin-bottom:20px}button{background:#ffd700;color:#1b5e20;border:none;padding:12px 24px;border-radius:50px;font-size:16px;font-weight:bold;margin-top:20px;cursor:pointer}</style></head><body><div class="offline-container"><div class="offline-icon">🌿</div><h1>غير متصل بالإنترنت</h1><p>يرجى التحقق من اتصالك بالإنترنت</p><button onclick="location.reload()">إعادة المحاولة</button></div></body></html>`;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => {
    if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE) return caches.delete(key);
  }))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.href.includes('firebaseio.com') || url.href.includes('googleapis.com')) return;
  
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html' } }));
    })
  );
});

self.addEventListener('push', event => {
  let data = { title: '🌿 موسوعة الأعشاب الطبية', body: 'تحديث جديد في الموسوعة!', icon: '/Encyclopedia-of-Herbal-Medicine/icons/icon-192.png', badge: '/Encyclopedia-of-Herbal-Medicine/icons/icon-72.png', vibrate: [200,100,200] };
  if (event.data) try { data = { ...data, ...event.data.json() }; } catch(e) {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: data.icon, badge: data.badge, vibrate: data.vibrate, actions: [{ action: 'open', title: 'فتح التطبيق' }] }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open') event.waitUntil(clients.openWindow('/Encyclopedia-of-Herbal-Medicine/'));
});
