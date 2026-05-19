// ============================================
// Service Worker - موسوعة الأعشاب الطبية
// دعم Android PWA كامل
// ============================================

const CACHE_NAME = 'herbal-android-v1';
const STATIC_CACHE = 'herbal-static-v1';
const DYNAMIC_CACHE = 'herbal-dynamic-v1';

// الملفات الثابتة
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/firebase-config.js',
  '/js/app.js',
  '/js/pwa.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js'
];

// تثبيت
self.addEventListener('install', event => {
  console.log('[SW] Installing for Android...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => console.error('Cache failed:', err))
  );
});

// تفعيل
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// جلب الطلبات
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // تجاهل Firebase
  if (url.href.includes('firebaseio.com') || url.href.includes('googleapis.com')) {
    return;
  }
  
  // استراتيجية Cache First للملفات الثابتة
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => {
      return caches.match('/index.html');
    })
  );
});

// مزامنة الخلفية
self.addEventListener('sync', event => {
  if (event.tag === 'sync-herbs') {
    event.waitUntil(
      fetch('/api/sync').catch(err => console.error('Sync failed:', err))
    );
  }
});

// إشعارات
self.addEventListener('push', event => {
  let data = {
    title: '🌿 موسوعة الأعشاب الطبية',
    body: 'تحديث جديد في الموسوعة!',
    icon: '/icons/icon-192.png'
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch(e) {}
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'فتح' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open') {
    event.waitUntil(clients.openWindow('/'));
  }
});
