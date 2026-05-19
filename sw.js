// sw.js - Service Worker متقدم لموسوعة الأعشاب الطبية
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `herbal-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `herbal-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `herbal-images-${CACHE_VERSION}`;
const MAX_DYNAMIC_ITEMS = 100;
const MAX_IMAGE_ITEMS = 200;

// الملفات الثابتة التي يتم تخزينها عند التثبيت
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/firebase-config.js',
  '/js/pwa.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap',
  'https://fonts.gstatic.com/s/cairo/v28/SLXGc1nY6HkangI.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-brands-400.woff2',
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
      // نضيف الملفات واحدا تلو الآخر لتجنب فشل كامل
      STATIC_ASSETS.forEach(asset => {
        caches.open(STATIC_CACHE).then(cache => {
          fetch(asset).then(response => {
            if (response.ok) cache.put(asset, response);
          }).catch(() => {});
        });
      });
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
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE) {
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

// التحقق من نوع الطلب
function isImageRequest(url) {
  return url.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)/i) || 
         url.includes('image') ||
         url.includes('data:image');
}

function isFirebaseRequest(url) {
  return url.includes('firebaseio.com') || 
         url.includes('googleapis.com') ||
         url.includes('firebaseapp.com');
}

function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.includes(asset)) ||
         url.match(/\.(js|css|woff2|woff|ttf)$/i);
}

// استراتيجيات التخزين المؤقت
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // تجاهل طلبات blob: و data: و chrome-extension
  if (event.request.url.startsWith('blob:') || 
      event.request.url.startsWith('data:') ||
      event.request.url.startsWith('chrome-extension:')) {
    return;
  }
  
  // تجاهل طلبات Firebase (لا نريد تخزينها، المزامنة المباشرة أفضل)
  if (isFirebaseRequest(event.request.url)) {
    return;
  }
  
  // ========== استراتيجية Cache First للملفات الثابتة ==========
  if (isStaticAsset(event.request.url)) {
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
          return new Response('⚠️ غير متصل بالإنترنت', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        });
      })
    );
    return;
  }
  
  // ========== استراتيجية Stale-While-Revalidate للصور ==========
  if (isImageRequest(event.request.url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
              // التحكم في حجم كاش الصور
              cache.keys().then(keys => {
                if (keys.length > MAX_IMAGE_ITEMS) {
                  const toDelete = keys.slice(0, keys.length - MAX_IMAGE_ITEMS);
                  toDelete.forEach(key => cache.delete(key));
                }
              });
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // ========== استراتيجية Network First للمحتوى الديناميكي ==========
  event.respondWith(
    fetch(event.request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(event.request, responseClone);
          // التحكم في حجم الكاش الديناميكي
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
        // إرجاع استجابة افتراضية
        return new Response(JSON.stringify({ error: 'offline', message: 'غير متصل بالإنترنت' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
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
      }).then(() => {
        if (event.source) event.source.postMessage({ type: 'CACHE_CLEARED' });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      caches.keys().then(async keys => {
        let totalSize = 0;
        for (const key of keys) {
          const cache = await caches.open(key);
          const requests = await cache.keys();
          totalSize += requests.length;
        }
        if (event.source) event.source.postMessage({ type: 'CACHE_SIZE', size: totalSize });
      })
    );
  }
});

// مزامنة الخلفية (Background Sync)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-herbs') {
    event.waitUntil(
      // محاولة مزامنة البيانات المعلقة
      syncOfflineData()
    );
  }
});

async function syncOfflineData() {
  try {
    // الحصول على جميع العملاء (tabs)
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({ type: 'SYNC_TRIGGERED', timestamp: Date.now() });
    }
    console.log('[SW] Sync completed');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// الإشعارات
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: '🌿 موسوعة الأعشاب',
    body: 'تحديث جديد في الموسوعة',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'استكشاف' },
      { action: 'close', title: 'إغلاق' }
    ]
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
      actions: data.actions,
      tag: 'herbal-notification',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click:', event.action);
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // just close
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          clients.openWindow('/');
        }
      })
    );
  }
});

// التعامل مع الأخطاء العامة
self.addEventListener('error', event => {
  console.error('[SW] Global error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled rejection:', event.reason);
});
