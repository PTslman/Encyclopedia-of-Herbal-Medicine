// ============================================
// Service Worker متقدم - موسوعة الأعشاب الطبية
// الإصدار 5.0 - دعم كامل للميزات المتقدمة
// ============================================

// ========== إصدارات الكاش ==========
const CACHE_VERSION = 'v15';
const CACHE_NAME = `herbal-pwa-${CACHE_VERSION}`;
const STATIC_CACHE = `herbal-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `herbal-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `herbal-images-${CACHE_VERSION}`;
const API_CACHE = `herbal-api-${CACHE_VERSION}`;

// فترة فحص التحديثات (15 دقيقة لتحسين الاستجابة)
const VERSION_CHECK_INTERVAL = 15 * 60 * 1000;

// ========== الملفات الأساسية المعتمدة ==========
const STATIC_ASSETS = [
  // الصفحات الرئيسية
  '/Encyclopedia-of-Herbal-Medicine/',
  '/Encyclopedia-of-Herbal-Medicine/index.html',
  '/Encyclopedia-of-Herbal-Medicine/offline.html',
  '/Encyclopedia-of-Herbal-Medicine/help.html',
  '/Encyclopedia-of-Herbal-Medicine/privacy.html',
  '/Encyclopedia-of-Herbal-Medicine/404.html',
  
  // ملفات التطبيق
  '/Encyclopedia-of-Herbal-Medicine/manifest.json',
  '/Encyclopedia-of-Herbal-Medicine/version.json',
  
  // CSS
  '/Encyclopedia-of-Herbal-Medicine/css/style.css',
  
  // JavaScript الأساسي
  '/Encyclopedia-of-Herbal-Medicine/js/supabase.js',
  '/Encyclopedia-of-Herbal-Medicine/js/local-db.js',
  '/Encyclopedia-of-Herbal-Medicine/js/sync-manager.js',
  '/Encyclopedia-of-Herbal-Medicine/js/app.js',
  '/Encyclopedia-of-Herbal-Medicine/js/pwa.js',
  '/Encyclopedia-of-Herbal-Medicine/js/update-handler.js',
  '/Encyclopedia-of-Herbal-Medicine/js/extra-features.js',
  
  // المكتبات الخارجية
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
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
        await Promise.allSettled(
          STATIC_ASSETS.map(async asset => {
            try {
              const cache = await caches.open(STATIC_CACHE);
              const response = await fetch(asset);
              if (response.ok) await cache.put(asset, response);
            } catch (e) {}
          })
        );
      }
      
      // تخزين صفحة عدم الاتصال مسبقاً
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/offline', new Response(OFFLINE_PAGE, {
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
      
      // التحقق من التحديثات فور التفعيل
      await checkForUpdates();
      
      // أخذ التحكم في جميع العملاء
      await self.clients.claim();
      console.log('[SW] ✅ Activated and controlling all clients');
    })()
  );
});

// ========== التحقق من وجود تحديثات متقدم ==========
async function checkForUpdates() {
  console.log('[SW] 🔍 Checking for updates...', new Date().toLocaleTimeString());
  
  try {
    const cache = await caches.open(STATIC_CACHE);
    const response = await fetch('/Encyclopedia-of-Herbal-Medicine/version.json?t=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) throw new Error('Failed to fetch version.json');
    
    const newVersion = await response.json();
    const cachedResponse = await cache.match('/Encyclopedia-of-Herbal-Medicine/version.json');
    
    if (cachedResponse) {
      const oldVersion = await cachedResponse.json();
      
      if (oldVersion.version !== newVersion.version) {
        console.log('[SW] 🎉 تحديث جديد متاح!', { 
          old: oldVersion.version, 
          new: newVersion.version,
          files: newVersion.files?.length || 0
        });
        
        // تحديث الكاش تلقائياً
        if (newVersion.files && newVersion.files.length) {
          await updateCache(newVersion.files);
        }
        
        // إرسال إشعار لجميع التطبيقات المفتوحة
        const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version: newVersion.version,
            oldVersion: oldVersion.version,
            message: `✨ تحديث جديد (${newVersion.version}) متاح! اضغط لتحديث التطبيق.`
          });
        });
        
        console.log('[SW] 📢 Update notification sent to', clients.length, 'clients');
        
        // عرض إشعار للمستخدم
        self.registration.showNotification('🌿 تحديث جديد لموسوعة الأعشاب', {
          body: `الإصدار ${newVersion.version} متاح الآن مع ميزات جديدة!`,
          icon: '/Encyclopedia-of-Herbal-Medicine/icons/icon-192.png',
          badge: '/Encyclopedia-of-Herbal-Medicine/icons/icon-72.png',
          vibrate: [200, 100, 200],
          tag: 'herbal-update',
          requireInteraction: true,
          actions: [
            { action: 'update', title: 'تحديث الآن' },
            { action: 'later', title: 'لاحقاً' }
          ]
        });
      } else {
        console.log('[SW] ✅ No updates available');
      }
    }
  } catch (error) {
    console.error('[SW] ❌ فشل التحقق من التحديثات:', error);
  }
}

// ========== تحديث الكاش الذكي ==========
async function updateCache(files) {
  console.log('[SW] 🔄 Updating cache for', files.length, 'files');
  const cache = await caches.open(STATIC_CACHE);
  let successCount = 0;
  
  for (const file of files) {
    try {
      const url = file.startsWith('http') ? file : `/Encyclopedia-of-Herbal-Medicine/${file}`;
      const response = await fetch(url + '?t=' + Date.now());
      
      if (response.ok) {
        await cache.put(url, response.clone());
        successCount++;
        console.log('[SW] ✅ Updated:', file);
      }
    } catch (error) {
      console.error('[SW] ❌ فشل تحديث:', file, error);
    }
  }
  
  console.log(`[SW] 📦 Cache updated: ${successCount}/${files.length} files`);
  return successCount;
}

// التحقق الدوري من التحديثات
setInterval(checkForUpdates, VERSION_CHECK_INTERVAL);

// ========== معالجة الرسائل ==========
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'CHECK_FOR_UPDATES':
      checkForUpdates();
      break;
      
    case 'SKIP_WAITING':
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
      event.waitUntil(
        (async () => {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
          console.log('[SW] 🗑️ All caches cleared');
          event.ports[0]?.postMessage({ success: true });
        })()
      );
      break;
      
    case 'GET_CACHE_SIZE':
      event.waitUntil(
        (async () => {
          const keys = await caches.keys();
          let totalSize = 0;
          for (const key of keys) {
            const cache = await caches.open(key);
            const requests = await cache.keys();
            totalSize += requests.length;
          }
          event.ports[0]?.postMessage({ size: totalSize, caches: keys.length });
        })()
      );
      break;
  }
});

// ========== استراتيجيات التخزين المؤقت المحسنة ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // تجاهل طلبات Supabase API للتحديث المباشر
  if (url.href.includes('supabase.co')) {
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
  
  // الملفات الثابتة - من الكاش أولاً (Cache First)
  if (STATIC_ASSETS.some(asset => url.href.includes(asset)) || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname === '/' ||
      url.pathname.includes('index.html')) {
    
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached && cached.status === 200) {
          return cached;
        }
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          return caches.match('/offline') || new Response(OFFLINE_PAGE, {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
    );
    return;
  }
  
  // الصور - Stale-While-Revalidate مع ضغط ذكي
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
  
  // طلبات API والبيانات - Network First
  if (url.pathname.includes('/api/') || url.pathname.includes('/supabase')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(API_CACHE).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'offline', message: 'غير متصل بالإنترنت' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }
  
  // باقي الطلبات - Network First مع تنظيم الكاش
  event.respondWith(
    fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(event.request, clone);
        // تنظيف الكاش الديناميكي (الحد الأقصى 100 عنصر)
        cache.keys().then(keys => {
          if (keys.length > 100) {
            const toDelete = keys.slice(0, keys.length - 100);
            toDelete.forEach(key => cache.delete(key));
          }
        });
      });
      return response;
    }).catch(() => {
      return caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/offline') || new Response(OFFLINE_PAGE, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        return new Response('غير متصل بالإنترنت', { status: 503 });
      });
    })
  );
});

// ========== مزامنة الخلفية المتقدمة ==========
self.addEventListener('sync', event => {
  console.log('[SW] 📡 Background sync:', event.tag);
  
  const syncHandlers = {
    'sync-herbs': async () => {
      try {
        const response = await fetch('/Encyclopedia-of-Herbal-Medicine/api/sync', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          console.log('[SW] ✅ Herbs synced successfully');
          return true;
        }
      } catch (err) {
        console.error('[SW] ❌ Sync failed:', err);
      }
      return false;
    },
    
    'update-check': async () => {
      await checkForUpdates();
      return true;
    },
    
    'cache-cleanup': async () => {
      const keys = await caches.keys();
      for (const key of keys) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        if (requests.length > 200) {
          const toDelete = requests.slice(0, requests.length - 200);
          await Promise.all(toDelete.map(req => cache.delete(req)));
          console.log(`[SW] Cleaned ${toDelete.length} items from ${key}`);
        }
      }
      return true;
    }
  };
  
  if (syncHandlers[event.tag]) {
    event.waitUntil(syncHandlers[event.tag]());
  }
});

// ========== الإشعارات المتقدمة ==========
self.addEventListener('push', event => {
  let data = {
    title: '🌿 موسوعة الأعشاب الطبية',
    body: '📚 تحديث جديد في الموسوعة!',
    icon: '/Encyclopedia-of-Herbal-Medicine/icons/icon-192.png',
    badge: '/Encyclopedia-of-Herbal-Medicine/icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag: 'herbal-update',
    requireInteraction: false,
    data: { url: '/Encyclopedia-of-Herbal-Medicine/' }
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
        { action: 'open', title: '📖 فتح التطبيق', icon: data.icon },
        { action: 'update', title: '🔄 تحديث الآن', icon: data.icon },
        { action: 'dismiss', title: '❌ إغلاق', icon: data.icon }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  
  if (action === 'open' || action === 'update') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsList => {
        if (clientsList.length > 0) {
          return clientsList[0].focus();
        }
        return clients.openWindow(notificationData.url || '/Encyclopedia-of-Herbal-Medicine/');
      }).then(() => {
        if (action === 'update') {
          setTimeout(() => {
            clients.matchAll({ type: 'window' }).then(clients => {
              clients.forEach(client => client.postMessage({ type: 'SKIP_WAITING' }));
            });
          }, 500);
        }
      })
    );
  }
});

// ========== تنزيل الملفات الكبيرة (PWA Install) ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // دعم تنزيل الملفات الكبيرة للتثبيت
  if (url.pathname.includes('/downloads/') || url.pathname.includes('/icons/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});

// ========== التحقق من التحديثات عند التشغيل ==========
checkForUpdates();

// تنظيف الكاش كل 24 ساعة
setInterval(async () => {
  const syncEvent = new Event('sync');
  syncEvent.tag = 'cache-cleanup';
  self.dispatchEvent(syncEvent);
}, 24 * 60 * 60 * 1000);

console.log(`[SW] ✅ Service Worker ${CACHE_VERSION} loaded successfully`);

// تصدير للاستخدام الخارجي
self.__SW_VERSION = CACHE_VERSION;
self.__SW_DATE = new Date().toISOString();
