// sw.js - Service Worker متقدم مع إدارة ذكية للذاكرة المؤقتة
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `herbal-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `herbal-dynamic-${CACHE_VERSION}`;
const MAX_DYNAMIC_ITEMS = 100;
const MAX_CACHE_AGE_DAYS = 30;

// الملفات الثابتة التي يتم تخزينها عند التثبيت
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/database.js',
  '/js/ui.js',
  '/js/utils.js',
  '/js/performance.js',
  '/js/pwa.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap',
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

// تفعيل Service Worker وتنظيف الكاش القديم
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
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

// التحقق من انتهاء صلاحية الكاش
function isCacheExpired(cacheKey, maxAgeDays = MAX_CACHE_AGE_DAYS) {
  // يمكن إضافة منطق للتحقق من تاريخ الملف
  return false; // مؤقتاً
}

// استراتيجية الاستجابة للطلبات
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // تجاهل طلبات blob: و data:
  if (event.request.url.startsWith('blob:') || event.request.url.startsWith('data:')) {
    return;
  }
  
  // تجاهل طلبات Firebase Realtime (لا تريد تخزينها)
  if (url.hostname.includes('firebaseio.com')) {
    return;
  }
  
  // استراتيجية: Cache First ثم Network (للملفات الثابتة)
  if (STATIC_ASSETS.some(asset => url.pathname.includes(asset) || 
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp)$/i))) {
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
          // إرجاع صفحة الخطأ إذا كان الطلب لملف HTML
          if (url.pathname.endsWith('.html') || url.pathname === '/') {
            return caches.match('/index.html');
          }
          return new Response('⚠️ غير متصل بالإنترنت', { status: 503 });
        });
      })
    );
    return;
  }
  
  // استراتيجية: Network First ثم Cache (للمحتوى الديناميكي)
  event.respondWith(
    fetch(event.request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(event.request, responseClone);
          // التحكم في حجم الكاش
          cache.keys().then(keys => {
            if (keys.length > MAX_DYNAMIC_ITEMS) {
              const toDelete = keys.slice(0, keys.length - MAX_DYNAMIC_ITEMS);
              toDelete.forEach(key => cache.delete(key));
            }
          });
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // إرجاع استجابة افتراضية للصور
        if (event.request.headers.get('accept').includes('image')) {
          return new Response(null, { status: 404, statusText: 'Not Found' });
        }
        return new Response('⚠️ غير متصل بالإنترنت', { status: 503 });
      });
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
  if (event.tag === 'sync-herbs') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(
      // يمكن إضافة منطق لمزامنة البيانات المعلقة
      Promise.resolve()
    );
  }
});

// الإشعارات
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'تحديث جديد في موسوعة الأعشاب',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'استكشاف', icon: '/icons/icon-96x96.png' },
      { action: 'close', title: 'إغلاق', icon: '/icons/icon-72x72.png' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('🌿 موسوعة الأعشاب', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});