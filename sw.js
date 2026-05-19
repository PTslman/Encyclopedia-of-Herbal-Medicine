// ============================================
// Service Worker متقدم - موسوعة الأعشاب الطبية
// يدعم التخزين المؤقت والعمل دون اتصال
// ============================================

const CACHE_NAME = 'herbal-pwa-v5';
const STATIC_CACHE = 'herbal-static-v5';
const DYNAMIC_CACHE = 'herbal-dynamic-v5';
const IMAGE_CACHE = 'herbal-images-v5';

// الملفات الثابتة التي يتم تخزينها عند التثبيت
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

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.error('[SW] Failed to cache static assets:', err);
    })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE && key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Taking control of clients');
      return self.clients.claim();
    })
  );
});

// استراتيجيات التخزين المؤقت
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // تجاهل طلبات Firebase (المزامنة المباشرة)
  if (url.href.includes('firebaseio.com') || 
      url.href.includes('googleapis.com/firestore') ||
      url.href.includes('firebaseapp.com')) {
    return;
  }
  
  // استراتيجية Cache First للملفات الثابتة
  if (STATIC_ASSETS.some(asset => url.href.includes(asset)) || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname === '/' ||
      url.pathname === '/index.html') {
    
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          return caches.match('/index.html');
        });
      })
    );
    return;
  }
  
  // استراتيجية Stale-While-Revalidate للصور
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)/i) || url.pathname.includes('/icons/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // استراتيجية Network First للمحتوى الديناميكي
  event.respondWith(
    fetch(event.request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(event.request, responseClone);
          // تنظيف الكاش القديم (حد أقصى 50 عنصر)
          cache.keys().then(keys => {
            if (keys.length > 50) {
              const toDelete = keys.slice(0, keys.length - 50);
              toDelete.forEach(key => cache.delete(key));
            }
          });
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});

// استقبال رسائل من التطبيق
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => {
        return Promise.all(
          keys.map(key => {
            if (key !== STATIC_CACHE) {
              return caches.delete(key);
            }
          })
        );
      })
    );
  }
});

// مزامنة الخلفية (Background Sync)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-herbs') {
    event.waitUntil(
      fetch('/api/sync', { method: 'POST' }).catch(err => console.error('Sync failed:', err))
    );
  }
});

// الإشعارات
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: '🌿 موسوعة الأعشاب الطبية',
    body: 'تحديث جديد في الموسوعة!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };
  
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      data: data.data,
      actions: [
        { action: 'open', title: 'فتح التطبيق' },
        { action: 'close', title: 'إغلاق' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click:', event.action);
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
