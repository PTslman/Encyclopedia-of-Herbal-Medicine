// sw.js - Service Worker متقدم لموسوعة الأعشاب الطبية
const CACHE_NAME = 'herbal-pwa-v5';
const STATIC_CACHE = 'herbal-static-v5';
const DYNAMIC_CACHE = 'herbal-dynamic-v5';
const IMAGE_CACHE = 'herbal-images-v5';

// الملفات الأساسية التي يتم تخزينها عند التثبيت
const STATIC_ASSETS = [
  '/Encyclopedia-of-Herbal-Medicine/offline.html',
  '/Encyclopedia-of-Herbal-Medicine/',
  '/Encyclopedia-of-Herbal-Medicine/index.html',
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

// صفحة الخطأ عند عدم الاتصال
const OFFLINE_PAGE = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>غير متصل - موسوعة الأعشاب</title>
    <style>
        body {
            font-family: 'Cairo', sans-serif;
            background: linear-gradient(135deg, #1b5e20, #2e7d32);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }
        .offline-container {
            padding: 20px;
        }
        .offline-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        button {
            background: #ffd700;
            color: #1b5e20;
            border: none;
            padding: 12px 24px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: bold;
            margin-top: 20px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">🌿</div>
        <h1>غير متصل بالإنترنت</h1>
        <p>يرجى التحقق من اتصالك بالإنترنت</p>
        <button onclick="location.reload()">إعادة المحاولة</button>
    </div>
</body>
</html>
`;

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => console.error('[SW] Cache failed:', err))
  );
});

// تفعيل Service Worker
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
      console.log('[SW] Taking control');
      return self.clients.claim();
    })
  );
});

// استراتيجيات التخزين المؤقت
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // تجاهل طلبات Firebase
  if (url.href.includes('firebaseio.com') || 
      url.href.includes('googleapis.com/firestore')) {
    return;
  }
  
  // استراتيجية Cache First للملفات الثابتة
  if (STATIC_ASSETS.some(asset => url.href.includes(asset)) || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css')) {
    
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, responseClone));
          return response;
        }).catch(() => {
          return new Response(OFFLINE_PAGE, {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
    );
    return;
  }
  
  // استراتيجية Stale-While-Revalidate للصور
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }
  
  // استراتيجية Network First للباقي
  event.respondWith(
    fetch(event.request).then(response => {
      const responseClone = response.clone();
      caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, responseClone));
      return response;
    }).catch(() => {
      return caches.match(event.request).then(cached => {
        return cached || new Response(OFFLINE_PAGE, {
          headers: { 'Content-Type':'text/html' }
        });
      });
    })
  );
});

// إشعارات
self.addEventListener('push', event => {
  let data = {
    title: '🌿 موسوعة الأعشاب الطبية',
    body: 'تحديث جديد في الموسوعة!',
    icon: '/Encyclopedia-of-Herbal-Medicine/icons/icon-192.png',
    badge: '/Encyclopedia-of-Herbal-Medicine/icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag: 'herbal-notification'
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
      badge: data.badge,
      vibrate: data.vibrate,
      tag: data.tag,
      renotify: true,
      actions: [
        { action: 'open', title: 'فتح التطبيق' },
        { action: 'close', title: 'إغلاق' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/Encyclopedia-of-Herbal-Medicine/')
    );
  }
});
