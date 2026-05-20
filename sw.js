// ============================================
// Service Worker متقدم - تحديث ديناميكي
// ============================================

const CACHE_NAME = 'herbal-pwa-v8';
const STATIC_CACHE = 'herbal-static-v8';
const DYNAMIC_CACHE = 'herbal-dynamic-v8';
const VERSION_CHECK_INTERVAL = 60 * 60 * 1000; // كل ساعة

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

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// تفعيل Service Worker مع تنظيف الكاش القديم
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
    }).then(() => self.clients.claim())
  );
});

// ========== التحقق من وجود تحديثات ==========
async function checkForUpdates() {
  try {
    const response = await fetch('/Encyclopedia-of-Herbal-Medicine/version.json?t=' + Date.now());
    const newVersion = await response.json();
    
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/Encyclopedia-of-Herbal-Medicine/version.json');
    
    if (cachedResponse) {
      const oldVersion = await cachedResponse.json();
      if (oldVersion.hash !== newVersion.hash) {
        console.log('[SW] تحديث جديد متاح!');
        
        // إرسال إشعار للتطبيق
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version: newVersion.version,
            files: newVersion.files
          });
        });
        
        // تحديث الكاش تلقائياً
        await updateCache(newVersion.files);
      }
    }
  } catch (error) {
    console.error('[SW] فشل التحقق من التحديثات:', error);
  }
}

// ========== تحديث الكاش ==========
async function updateCache(files) {
  const cache = await caches.open(STATIC_CACHE);
  for (const file of files) {
    try {
      const response = await fetch('/Encyclopedia-of-Herbal-Medicine/' + file + '?t=' + Date.now());
      if (response.ok) {
        await cache.put('/Encyclopedia-of-Herbal-Medicine/' + file, response);
        console.log('[SW] تم تحديث:', file);
      }
    } catch (error) {
      console.error('[SW] فشل تحديث:', file, error);
    }
  }
}

// التحقق الدوري من التحديثات
setInterval(checkForUpdates, VERSION_CHECK_INTERVAL);

// التحقق عند استلام رسالة
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_FOR_UPDATES') {
    checkForUpdates();
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ========== استراتيجيات التخزين المؤقت ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // تجاهل Firebase
  if (url.href.includes('firebaseio.com') || url.href.includes('googleapis.com')) {
    return;
  }
  
  // ملف version.json - دائماً من الشبكة
  if (url.pathname.includes('version.json')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

// التحقق من التحديثات عند التفعيل
checkForUpdates();
