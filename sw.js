// ============================================
// Service Worker متقدم - موسوعة الأعشاب الطبية
// الإصدار 5.0 - متوافق مع Firebase
// ============================================

// ========== إصدارات الكاش ==========
const CACHE_VERSION = 'v15';
const CACHE_NAME = `herbal-pwa-${CACHE_VERSION}`;
const STATIC_CACHE = `herbal-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `herbal-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `herbal-images-${CACHE_VERSION}`;
const API_CACHE = `herbal-api-${CACHE_VERSION}`;

// فترة فحص التحديثات (30 دقيقة)
const VERSION_CHECK_INTERVAL = 30 * 60 * 1000;

// ========== الملفات الأساسية المعتمدة (متوافقة مع هيكل المشروع) ==========
const STATIC_ASSETS = [
  // الصفحات الرئيسية
  '/',
  './',
  'index.html',
  'manifest.json',
  
  // CSS
  'css/style.css',
  
  // JavaScript الأساسي
  'js/firebase-config.js',
  'js/app.js',
  'js/pwa.js',
  
  // المكتبات الخارجية
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js'
];

// ========== صفحة عدم الاتصال المحسنة ==========
const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>غير متصل - موسوعة الأعشاب الطبية</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Cairo',sans-serif;background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
        .offline-container{max-width:400px;padding:30px}
        .offline-icon{font-size:80px;margin-bottom:20px;animation:float 2s ease-in-out infinite}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        h1{font-size:24px;margin-bottom:10px}
        p{font-size:14px;opacity:0.9;margin-bottom:30px;line-height:1.6}
        .btn-retry{background:#ffd700;color:#1b5e20;border:none;padding:12px 28px;border-radius:50px;font-size:16px;font-weight:bold;cursor:pointer;margin-top:10px;display:inline-flex;align-items:center;gap:8px}
        .btn-retry:hover{transform:translateY(-2px);box-shadow:0 4px 15px rgba(0,0,0,0.2)}
        .features{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:30px}
        .feature{background:rgba(255,255,255,0.1);padding:8px 15px;border-radius:50px;font-size:12px}
        .version{margin-top:30px;font-size:11px;opacity:0.5}
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">🌿</div>
        <h1>⚠️ غير متصل بالإنترنت</h1>
        <p>يبدو أنك غير متصل بالإنترنت.<br>البيانات المتاحة حالياً هي آخر نسخة محفوظة.</p>
        <button class="btn-retry" onclick="location.reload()"><i class="fas fa-sync-alt"></i> إعادة المحاولة</button>
        <div class="features">
            <span class="feature">📚 بيانات محفوظة</span>
            <span class="feature">🔍 بحث محلي</span>
            <span class="feature">⭐ إشارات مرجعية</span>
            <span class="feature">📝 ملاحظات</span>
        </div>
        <div class="version">موسوعة الأعشاب الطبية - إصدار PWA 5.0</div>
    </div>
</body>
</html>`;

// ========== تثبيت Service Worker ==========
self.addEventListener('install', event => {
  console.log(`[SW] Installing version ${CACHE_VERSION}...`);
  
  event.waitUntil(
    (async () => {
      try {
        // محاولة تخزين الملفات الأساسية
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(STATIC_ASSETS);
        console.log('[SW] ✅ Static assets cached successfully');
      } catch (error) {
        console.error('[SW] ❌ Cache failed:', error);
        // تخزين الملفات بشكل فردي في حالة الفشل
        for (const asset of STATIC_ASSETS) {
          try {
            const cache = await caches.open(STATIC_CACHE);
            const response = await fetch(asset);
            if (response.ok) await cache.put(asset, response);
          } catch (e) {
            console.warn(`[SW] Failed to cache ${asset}:`, e);
          }
        }
      }
      
      // تخزين صفحة عدم الاتصال مسبقاً
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/offline', new Response(OFFLINE_PAGE, {
        headers: { 'Content-Type': 'text/html' }
      }));
      await cache.put('offline', new Response(OFFLINE_PAGE, {
        headers: { 'Content-Type': 'text/html' }
      }));
      
      await self.skipWaiting();
    })()
  );
});

// ========== تفعيل Service Worker ==========
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    (async () => {
      // حذف الكاشات القديمة
      const keys = await caches.keys();
      const oldCaches = keys.filter(key => 
        key !== CACHE_NAME && 
        key !== STATIC_CACHE && 
        key !== DYNAMIC_CACHE && 
        key !== IMAGE_CACHE && 
        key !== API_CACHE
      );
      
      await Promise.all(oldCaches.map(key => {
        console.log('[SW] Deleting old cache:', key);
        return caches.delete(key);
      }));
      
      // أخذ التحكم في جميع العملاء
      await self.clients.claim();
      console.log('[SW] ✅ Activated and controlling all clients');
      
      // إرسال إشعار بالتحديث للتطبيقات المفتوحة
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: CACHE_VERSION
        });
      });
    })()
  );
});

// ========== معالجة طلبات Firebase بشكل خاص ==========
function isFirebaseRequest(url) {
  return url.hostname.includes('firebase') || 
         url.hostname.includes('googleapis.com/firestore') ||
         url.href.includes('firestore.googleapis.com');
}

// ========== استراتيجيات التخزين المؤقت المحسنة ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const request = event.request;
  
  // طلبات Firebase - Network First (الأولوية للشبكة)
  if (isFirebaseRequest(url)) {
    event.respondWith(
      fetch(request, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      }).then(response => {
        // لا نقوم بتخزين بيانات Firebase في الكاش لأسباب أمنية
        return response;
      }).catch(error => {
        console.warn('[SW] Firebase request failed:', error);
        // إرجاع استجابة خطأ مناسبة
        return new Response(JSON.stringify({ 
          error: 'offline', 
          message: 'غير متصل بالإنترنت، يرجى التحقق من الاتصال' 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // الملفات الثابتة - Cache First (من الكاش أولاً)
  if (STATIC_ASSETS.some(asset => url.href.includes(asset) || url.pathname.endsWith(asset)) || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname === '/' ||
      url.pathname === '/index.html') {
    
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached && cached.status === 200) {
          return cached;
        }
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          return caches.match('/offline') || caches.match('offline') || new Response(OFFLINE_PAGE, {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
    );
    return;
  }
  
  // الصور - Stale-While-Revalidate
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(response => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
              // تنظيف الكاش (الحد الأقصى 200 صورة)
              cache.keys().then(keys => {
                if (keys.length > 200) {
                  const toDelete = keys.slice(0, keys.length - 200);
                  toDelete.forEach(key => cache.delete(key));
                }
              });
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }
  
  // باقي الطلبات - Network First مع تنظيم الكاش
  event.respondWith(
    fetch(request).then(response => {
      // تخزين النسخة فقط للطلبات الناجحة من نوع GET
      if (response && response.status === 200 && request.method === 'GET') {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(request, clone);
          // تنظيف الكاش الديناميكي (الحد الأقصى 100 عنصر)
          cache.keys().then(keys => {
            if (keys.length > 100) {
              const toDelete = keys.slice(0, keys.length - 100);
              toDelete.forEach(key => cache.delete(key));
            }
          });
        });
      }
      return response;
    }).catch(() => {
      return caches.match(request).then(cached => {
        if (cached) return cached;
        // إذا كان الطلب لصفحة HTML، إرجاع صفحة عدم الاتصال
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/offline') || caches.match('offline') || new Response(OFFLINE_PAGE, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        return new Response('غير متصل بالإنترنت', { status: 503 });
      });
    })
  );
});

// ========== معالجة الرسائل من التطبيق ==========
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'CHECK_FOR_UPDATES':
      console.log('[SW] Manual update check requested');
      event.waitUntil(checkForUpdates());
      break;
      
    case 'SKIP_WAITING':
      console.log('[SW] Skip waiting requested');
      self.skipWaiting();
      event.waitUntil(
        self.clients.claim().then(() => {
          self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => client.navigate(client.url));
          });
        })
      );
      break;
      
    case 'CLEAR_CACHE':
      console.log('[SW] Clear cache requested');
      event.waitUntil(
        (async () => {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
          console.log('[SW] 🗑️ All caches cleared');
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true, message: 'تم مسح الكاش بنجاح' });
          }
        })()
      );
      break;
      
    case 'GET_CACHE_INFO':
      event.waitUntil(
        (async () => {
          const keys = await caches.keys();
          let totalItems = 0;
          let totalSize = 0;
          for (const key of keys) {
            const cache = await caches.open(key);
            const requests = await cache.keys();
            totalItems += requests.length;
          }
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ 
              caches: keys.length, 
              items: totalItems,
              version: CACHE_VERSION 
            });
          }
        })()
      );
      break;
      
    case 'FORCE_SYNC':
      console.log('[SW] Force sync requested');
      if (self.registration.sync) {
        self.registration.sync.register('sync-herbs');
      }
      break;
  }
});

// ========== التحقق من وجود تحديثات ==========
async function checkForUpdates() {
  console.log('[SW] 🔍 Checking for updates...');
  
  try {
    // التحقق من وجود تحديث في Service Worker نفسه
    const registration = await self.registration;
    await registration.update();
    
    // إرسال إشعار بالتحديث للتطبيق
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_CHECK_COMPLETE',
        version: CACHE_VERSION,
        timestamp: Date.now()
      });
    });
    
    console.log('[SW] ✅ Update check completed');
  } catch (error) {
    console.error('[SW] ❌ Update check failed:', error);
  }
}

// ========== مزامنة الخلفية ==========
self.addEventListener('sync', event => {
  console.log('[SW] 📡 Background sync:', event.tag);
  
  if (event.tag === 'sync-herbs') {
    event.waitUntil(
      (async () => {
        try {
          // إعلام التطبيق بمحاولة المزامنة
          const clients = await self.clients.matchAll({ type: 'window' });
          clients.forEach(client => {
            client.postMessage({ type: 'SYNC_STARTED' });
          });
          
          // يمكن إضافة منطق المزامنة هنا إذا لزم الأمر
          console.log('[SW] ✅ Background sync completed');
          
          clients.forEach(client => {
            client.postMessage({ type: 'SYNC_COMPLETED' });
          });
        } catch (err) {
          console.error('[SW] ❌ Sync failed:', err);
        }
      })()
    );
  }
});

// ========== الإشعارات ==========
self.addEventListener('push', event => {
  let data = {
    title: '🌿 موسوعة الأعشاب الطبية',
    body: '📚 تحديث جديد في الموسوعة!',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag: 'herbal-update',
    requireInteraction: false,
    data: { url: './' }
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
      requireInteraction: data.requireInteraction,
      data: data.data,
      actions: [
        { action: 'open', title: '📖 فتح التطبيق' },
        { action: 'dismiss', title: '❌ إغلاق' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  
  if (action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsList => {
        if (clientsList.length > 0) {
          return clientsList[0].focus();
        }
        return clients.openWindow(notificationData.url || './');
      })
    );
  }
});

// ========== التحقق الدوري من التحديثات ==========
setInterval(checkForUpdates, VERSION_CHECK_INTERVAL);

// التحقق فور التشغيل
checkForUpdates();

// تنظيف الكاش كل 24 ساعة
setInterval(async () => {
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      const cache = await caches.open(key);
      const requests = await cache.keys();
      if (requests.length > 200) {
        const toDelete = requests.slice(0, requests.length - 200);
        await Promise.all(toDelete.map(req => cache.delete(req)));
        console.log(`[SW] Cleaned ${toDelete.length} old items from ${key}`);
      }
    }
  } catch(e) {
    console.warn('[SW] Cache cleanup error:', e);
  }
}, 24 * 60 * 60 * 1000);

console.log(`[SW] ✅ Service Worker ${CACHE_VERSION} loaded successfully`);
