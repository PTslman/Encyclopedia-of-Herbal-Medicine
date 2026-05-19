// sw.js - Service Worker متطور لموسوعة الأعشاب الطبية
const CACHE_NAME = 'herbal-master-v4';
const STATIC_CACHE = 'herbal-static-v4';
const DYNAMIC_CACHE = 'herbal-dynamic-v4';
const MAX_DYNAMIC_ITEMS = 50;
const STATIC_ASSETS = [
    '.',
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/firebase-config.js',
    './js/app.js',
    './js/pwa.js',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            })
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    if (STATIC_ASSETS.some(asset => url.href.includes(asset) || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                const fetchPromise = fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(STATIC_CACHE).then(cache => cache.put(event.request, responseClone));
                    }
                    return response;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        );
        return;
    }
    
    if (url.pathname.includes('/googleapis') || url.pathname.includes('/firebase')) {
        event.respondWith(
            fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, responseClone);
                        cache.keys().then(keys => {
                            if (keys.length > MAX_DYNAMIC_ITEMS) {
                                const toDelete = keys.slice(0, keys.length - MAX_DYNAMIC_ITEMS);
                                toDelete.forEach(key => cache.delete(key));
                            }
                        });
                    });
                }
                return response;
            }).catch(() => caches.match(event.request))
        );
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});// sw.js - Service Worker متقدم لموسوعة الأعشاب الطبية
const CACHE_VERSION = 'v5';
const STATIC_CACHE = `herbal-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `herbal-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `herbal-images-${CACHE_VERSION}`;
const MAX_DYNAMIC_ITEMS = 100;
const MAX_IMAGE_ITEMS = 200;

// الملفات الثابتة التي يتم تخزينها عند التثبيت (بدون روابط خطوط محددة)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/firebase-config.js',
  '/js/pwa.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
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
  return STATIC_ASSETS.some(asset => url === asset || (asset !== '/' && url.includes(asset))) ||
         url.match(/\.(js|css|woff2|woff|ttf)$/i);
}

// استراتيجيات التخزين المؤقت
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (event.request.url.startsWith('blob:') || 
      event.request.url.startsWith('data:') ||
      event.request.url.startsWith('chrome-extension:')) {
    return;
  }
  
  if (isFirebaseRequest(event.request.url)) {
    return;
  }
  
  // Cache First للملفات الثابتة
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
          if (url.pathname.endsWith('.html') || url.pathname === '/') {
            return caches.match('/index.html');
          }
          return new Response('⚠️ غير متصل بالإنترنت', { status: 503 });
        });
      })
    );
    return;
  }
  
  // Stale-While-Revalidate للصور
  if (isImageRequest(event.request.url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
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
  
  // Network First للمحتوى الديناميكي
  event.respondWith(
    fetch(event.request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(event.request, responseClone);
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
});

// مزامنة الخلفية (يتم إرسال رسالة للتطبيق لمعالجة البيانات)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-herbs') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_TRIGGERED', timestamp: Date.now() });
        });
      })
    );
  }
});
