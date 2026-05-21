// ============================================
// Service Worker متقدم - موسوعة الأعشاب الطبية
// دمج الإصدارين مع تحسين التحديث التلقائي
// ============================================

// إصدارات الكاش
const CACHE_NAME = 'herbal-pwa-v12';
const STATIC_CACHE = 'herbal-static-v12';
const DYNAMIC_CACHE = 'herbal-dynamic-v12';
const IMAGE_CACHE = 'herbal-images-v12';

// فترة فحص التحديثات (30 دقيقة - وسط بين السرعة والحمل)
const VERSION_CHECK_INTERVAL = 30 * 60 * 1000;

// الملفات الأساسية
const STATIC_ASSETS = [
  '/Encyclopedia-of-Herbal-Medicine/',
  '/Encyclopedia-of-Herbal-Medicine/index.html',
  '/Encyclopedia-of-Herbal-Medicine/offline.html',
  '/Encyclopedia-of-Herbal-Medicine/help.html',
  '/Encyclopedia-of-Herbal-Medicine/privacy.html',
  '/Encyclopedia-of-Herbal-Medicine/manifest.json',
  '/Encyclopedia-of-Herbal-Medicine/version.json',
  '/Encyclopedia-of-Herbal-Medicine/css/style.css',
  '/Encyclopedia-of-Herbal-Medicine/js/firebase-config.js',
  '/Encyclopedia-of-Herbal-Medicine/js/app.js',
  '/Encyclopedia-of-Herbal-Medicine/js/pwa.js',
  '/Encyclopedia-of-Herbal-Medicine/js/update-handler.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js'
];

// صفحة عدم الاتصال المضمنة
const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>غير متصل - موسوعة الأعشاب</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Cairo',sans-serif;background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}
        .offline-container{padding:20px}
        .offline-icon{font-size:80px;margin-bottom:20px}
        button{background:#ffd700;color:#1b5e20;border:none;padding:12px 24px;border-radius:50px;font-size:16px;font-weight:bold;margin-top:20px;cursor:pointer}
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
</html>`;

// ========== تثبيت Service Worker ==========
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.error('[SW] Cache failed:', err);
      // محاولة تخزين الملفات بشكل فردي
      return Promise.all(
        STATIC_ASSETS.map(asset => 
          caches.open(STATIC_CACHE).then(cache => 
            fetch(asset).then(res => res.ok && cache.put(asset, res)).catch(() => {})
          )
        )
      );
    })
  );
});

// ========== تفعيل Service Worker ==========
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

// ========== التحقق من وجود تحديثات ==========
async function checkForUpdates() {
  console.log('[SW] Checking for updates...');
  
  try {
    const response = await fetch('/Encyclopedia-of-Herbal-Medicine/version.json?t=' + Date.now());
    if (!response.ok) throw new Error('Failed to fetch version.json');
    
    const newVersion = await response.json();
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/Encyclopedia-of-Herbal-Medicine/version.json');
    
    if (cachedResponse) {
      const oldVersion = await cachedResponse.json();
      
      if (oldVersion.hash !== newVersion.hash) {
        console.log('[SW] ✅ تحديث جديد متاح!', { old: oldVersion.version, new: newVersion.version });
        
        // تحديث الكاش تلقائياً
        await updateCache(newVersion.files);
        
        // إرسال إشعار لجميع التطبيقات المفتوحة
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version: newVersion.version,
            message: 'تحديث جديد متاح! اضغط لتحديث التطبيق.'
          });
        });
        
        console.log('[SW] Update notification sent to', clients.length, 'clients');
      }
    }
  } catch (error) {
    console.error('[SW] فشل التحقق من التحديثات:', error);
  }
}

// ========== تحديث الكاش ==========
async function updateCache(files) {
  console.log('[SW] Updating cache for', files.length, 'files');
  const cache = await caches.open(STATIC_CACHE);
  
  for (const file of files) {
    try {
      const url = '/Encyclopedia-of-Herbal-Medicine/' + file;
      const response = await fetch(url + '?t=' + Date.now());
      
      if (response.ok) {
        await cache.put(url, response);
        console.log('[SW] ✅ Updated:', file);
      }
    } catch (error) {
      console.error('[SW] ❌ فشل تحديث:', file, error);
    }
  }
}

// التحقق الدوري من التحديثات
setInterval(checkForUpdates, VERSION_CHECK_INTERVAL);

// التحقق عند استلام رسالة
self.addEventListener('message', event => {
  const { type } = event.data || {};
  
  if (type === 'CHECK_FOR_UPDATES') {
    checkForUpdates();
  } else if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'CLEAR_CACHE') {
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

// ========== استراتيجيات التخزين المؤقت ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // تجاهل Firebase
  if (url.href.includes('firebaseio.com') || 
      url.href.includes('googleapis.com/firestore') ||
      url.href.includes('firebaseapp.com')) {
    return;
  }
  
  // ملف version.json - دائماً من الشبكة
  if (url.pathname.includes('version.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // الملفات الثابتة - من الكاش أولاً
  if (STATIC_ASSETS.some(asset => url.href.includes(asset)) || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname === '/' ||
      url.pathname.includes('index.html')) {
    
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => {
          return caches.match('/Encyclopedia-of-Herbal-Medicine/offline.html');
        });
      })
    );
    return;
  }
  
  // الصور - Stale-While-Revalidate
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)/i)) {
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
  
  // باقي الطلبات - Network First
  event.respondWith(
    fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(event.request, clone);
        // تنظيف الكاش الديناميكي (الحد الأقصى 50 عنصر)
        cache.keys().then(keys => {
          if (keys.length > 50) {
            const toDelete = keys.slice(0, keys.length - 50);
            toDelete.forEach(key => cache.delete(key));
          }
        });
      });
      return response;
    }).catch(() => {
      return caches.match(event.request).then(cached => {
        return cached || new Response(OFFLINE_PAGE, {
          headers: { 'Content-Type': 'text/html' }
        });
      });
    })
  );
});

// ========== مزامنة الخلفية ==========
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-herbs') {
    event.waitUntil(
      fetch('/Encyclopedia-of-Herbal-Medicine/api/sync', { method: 'POST' })
        .catch(err => console.error('[SW] Sync failed:', err))
    );
  } else if (event.tag === 'update-check') {
    event.waitUntil(checkForUpdates());
  }
});

// ========== الإشعارات ==========
self.addEventListener('push', event => {
  let data = {
    title: '🌿 موسوعة الأعشاب الطبية',
    body: 'تحديث جديد في الموسوعة!',
    icon: '/Encyclopedia-of-Herbal-Medicine/icons/icon-192.png',
    badge: '/Encyclopedia-of-Herbal-Medicine/icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag: 'herbal-update'
  };
  
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch(e) {
      data.body = event.data.text();
    }
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
        { action: 'update', title: 'تحديث الآن' },
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
  } else if (event.action === 'update') {
    event.waitUntil(
      clients.openWindow('/Encyclopedia-of-Herbal-Medicine/')
    );
    setTimeout(() => {
      clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SKIP_WAITING' }));
      });
    }, 1000);
  }
});

// التحقق من التحديثات عند التفعيل
checkForUpdates();

console.log('[SW] Service Worker loaded successfully');
