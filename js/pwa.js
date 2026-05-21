// =====================================================
// PWA المتكاملة - Service Worker وإعدادات التثبيت
// تم تعديله ليتوافق مع كود التطبيق الأصلي
// =====================================================

(function() {
    'use strict';
    
    // =====================================================
    // إعدادات Service Worker المتقدم
    // =====================================================
    
    class PWAManager {
        constructor() {
            this.deferredPrompt = null;
            this.swRegistration = null;
            this.isInstalled = false;
            this.init();
        }
        
        async init() {
            await this.registerServiceWorker();
            this.setupBeforeInstallPrompt();
            this.checkInstalledStatus();
            this.setupOnlineStatusListener();
        }
        
        async registerServiceWorker() {
            if (!('serviceWorker' in navigator)) {
                console.log('Service Worker غير مدعوم في هذا المتصفح');
                return false;
            }
            
            try {
                // Service Worker متقدم مع استراتيجيات تخزين ذكية
                const swCode = `
                    const CACHE_NAME = 'herbal-master-v5';
                    const STATIC_CACHE = 'herbal-static-v5';
                    const DYNAMIC_CACHE = 'herbal-dynamic-v5';
                    const IMAGE_CACHE = 'herbal-images-v5';
                    const MAX_DYNAMIC_ITEMS = 100;
                    const MAX_IMAGE_ITEMS = 200;
                    
                    // الأصول الثابتة التي يتم تخزينها مسبقاً
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
                    
                    // تثبيت Service Worker
                    self.addEventListener('install', event => {
                        console.log('[SW] جاري تثبيت Service Worker');
                        self.skipWaiting();
                        event.waitUntil(
                            caches.open(STATIC_CACHE).then(cache => {
                                return cache.addAll(STATIC_ASSETS);
                            }).catch(err => {
                                console.error('[SW] فشل تخزين الأصول الثابتة:', err);
                            })
                        );
                    });
                    
                    // تفعيل Service Worker
                    self.addEventListener('activate', event => {
                        console.log('[SW] جاري تفعيل Service Worker');
                        event.waitUntil(
                            caches.keys().then(keys => {
                                return Promise.all(
                                    keys.map(key => {
                                        if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE && key !== CACHE_NAME) {
                                            console.log('[SW] حذف الكاش القديم:', key);
                                            return caches.delete(key);
                                        }
                                    })
                                );
                            }).then(() => {
                                return self.clients.claim();
                            })
                        );
                    });
                    
                    // إدارة طلبات الشبكة
                    self.addEventListener('fetch', event => {
                        const url = new URL(event.request.url);
                        
                        // معالجة الصور بشكل خاص
                        if (event.request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
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
                        
                        // الأصول الثابتة
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
                        
                        // طلبات Firebase و APIs الخارجية
                        if (url.hostname.includes('googleapis') || url.hostname.includes('firebase')) {
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
                        
                        // استراتيجية: محاولة الشبكة أولاً، ثم العودة للكاش
                        event.respondWith(
                            fetch(event.request).catch(() => {
                                return caches.match(event.request);
                            })
                        );
                    });
                    
                    // مزامنة الخلفية عند استعادة الاتصال
                    self.addEventListener('sync', event => {
                        if (event.tag === 'sync-herbs') {
                            event.waitUntil(syncHerbsData());
                        }
                    });
                    
                    // استقبال الإشعارات
                    self.addEventListener('push', event => {
                        const data = event.data ? event.data.json() : {};
                        const options = {
                            body: data.body || 'تحديث جديد في موسوعة الأعشاب',
                            icon: data.icon || '/icons/icon-192.png',
                            badge: '/icons/icon-72.png',
                            vibrate: [200, 100, 200],
                            data: {
                                url: data.url || './'
                            }
                        };
                        
                        event.waitUntil(
                            self.registration.showNotification(data.title || '🌿 موسوعة الأعشاب', options)
                        );
                    });
                    
                    // التعامل مع الضغط على الإشعار
                    self.addEventListener('notificationclick', event => {
                        event.notification.close();
                        event.waitUntil(
                            clients.openWindow(event.notification.data?.url || './')
                        );
                    });
                    
                    // دالة مزامنة البيانات
                    async function syncHerbsData() {
                        const cache = await caches.open(DYNAMIC_CACHE);
                        const syncData = await cache.match('/sync-data');
                        if (syncData) {
                            const data = await syncData.json();
                            // إرسال البيانات إلى الخادم
                            await fetch('/api/sync', {
                                method: 'POST',
                                body: JSON.stringify(data),
                                headers: { 'Content-Type': 'application/json' }
                            });
                            await cache.delete('/sync-data');
                        }
                    }
                `;
                
                const swBlob = new Blob([swCode], { type: 'application/javascript' });
                const swURL = URL.createObjectURL(swBlob);
                
                const registration = await navigator.serviceWorker.register(swURL);
                this.swRegistration = registration;
                console.log('[PWA] Service Worker تم تسجيله بنجاح');
                
                // التحقق من التحديثات
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
                return true;
            } catch (error) {
                console.error('[PWA] فشل تسجيل Service Worker:', error);
                return false;
            }
        }
        
        setupBeforeInstallPrompt() {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
                this.showInstallButton();
                console.log('[PWA] حدث beforeinstallprompt تم捕获ه');
            });
            
            window.addEventListener('appinstalled', () => {
                this.isInstalled = true;
                this.deferredPrompt = null;
                this.hideInstallButton();
                console.log('[PWA] تم تثبيت التطبيق بنجاح');
                this.showInstallSuccessMessage();
            });
        }
        
        showInstallButton() {
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) {
                installBtn.style.display = 'flex';
                installBtn.style.animation = 'pulse 0.5s ease';
            }
        }
        
        hideInstallButton() {
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) {
                installBtn.style.display = 'none';
            }
        }
        
        async installPWA() {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.isInstalled = true;
                    this.hideInstallButton();
                    this.showToast('✅ تم تثبيت التطبيق بنجاح', 'success');
                } else {
                    this.showToast('❌ تم إلغاء التثبيت', 'info');
                }
                this.deferredPrompt = null;
            } else {
                this.showInstallGuide();
            }
        }
        
        showInstallGuide() {
            const guideModal = document.getElementById('installGuideModal');
            if (guideModal) {
                guideModal.classList.add('active');
            } else {
                // إنشاء دليل التثبيت إذا لم يكن موجوداً
                this.createInstallGuide();
            }
        }
        
        createInstallGuide() {
            const modal = document.createElement('div');
            modal.id = 'installGuideModal';
            modal.className = 'modal-glass';
            modal.innerHTML = `
                <div class="modal-glass-content">
                    <div class="modal-header">
                        <h3>📲 تثبيت التطبيق</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-glass').classList.remove('active')">✕</button>
                    </div>
                    <div style="text-align:center;padding:20px;">
                        <i class="fas fa-download" style="font-size:48px;color:var(--primary);margin-bottom:15px;"></i>
                        <p>لتثبيت التطبيق على جهازك:</p>
                        <ul style="text-align:right;margin:15px 0;">
                            <li>📍 في متصفح Chrome: اضغط على القائمة (⋮) ثم اختر "تثبيت التطبيق"</li>
                            <li>📍 في متصفح Safari: اضغط على مشاركة ثم اختر "إضافة إلى الشاشة الرئيسية"</li>
                            <li>📍 في المتصفحات الأخرى: ابحث عن خيار "تثبيت" أو "إضافة إلى الشاشة الرئيسية"</li>
                        </ul>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" onclick="document.getElementById('installGuideModal').classList.remove('active')">فهمت</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.classList.add('active');
        }
        
        showUpdateNotification() {
            const toast = document.createElement('div');
            toast.className = 'update-toast';
            toast.innerHTML = `
                <div style="background:var(--primary);color:white;padding:12px 20px;border-radius:50px;position:fixed;bottom:20px;right:20px;z-index:10000;box-shadow:0 4px 15px rgba(0,0,0,0.2);display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-sync-alt fa-spin"></i>
                    <span>🔄 تحديث جديد متاح!</span>
                    <button onclick="location.reload()" style="background:white;color:var(--primary);border:none;border-radius:30px;padding:5px 15px;cursor:pointer;">تحديث</button>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 10000);
        }
        
        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = 'pwa-toast';
            const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
            toast.innerHTML = `
                <div style="background:var(--card-bg);color:var(--text);padding:10px 20px;border-radius:50px;position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:10001;box-shadow:0 4px 15px rgba(0,0,0,0.2);display:flex;align-items:center;gap:10px;border:1px solid var(--separator);">
                    <span>${icons[type] || 'ℹ️'}</span>
                    <span>${message}</span>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
        
        showInstallSuccessMessage() {
            this.showToast('🎉 تم تثبيت موسوعة الأعشاب على جهازك!', 'success');
        }
        
        checkInstalledStatus() {
            // التحقق مما إذا كان التطبيق يعمل في وضع standalone (مثبت)
            if (window.matchMedia('(display-mode: standalone)').matches) {
                this.isInstalled = true;
                this.hideInstallButton();
                document.body.classList.add('pwa-installed');
                console.log('[PWA] التطبيق يعمل في وضع PWA');
            }
            
            window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
                if (e.matches) {
                    this.isInstalled = true;
                    this.hideInstallButton();
                }
            });
        }
        
        setupOnlineStatusListener() {
            window.addEventListener('online', () => {
                this.showToast('🌐 تم استعادة الاتصال بالإنترنت', 'success');
                // محاولة مزامنة البيانات عند عودة الاتصال
                if (this.swRegistration && this.swRegistration.sync) {
                    this.swRegistration.sync.register('sync-herbs');
                }
                // إعادة تحميل البيانات من السحابة
                if (window.forceFetchFromServer) {
                    window.forceFetchFromServer();
                }
            });
            
            window.addEventListener('offline', () => {
                this.showToast('📴 لا يوجد اتصال بالإنترنت - يتم عرض البيانات المخزنة', 'warning');
            });
        }
        
        async subscribeToPushNotifications() {
            if (!this.swRegistration) {
                console.log('[PWA] Service Worker غير جاهز');
                return false;
            }
            
            try {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    this.showToast('⚠️ يرجى السماح بالإشعارات', 'warning');
                    return false;
                }
                
                const subscription = await this.swRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U')
                });
                
                console.log('[PWA] تم الاشتراك في الإشعارات', subscription);
                this.showToast('🔔 تم تفعيل الإشعارات', 'success');
                return true;
            } catch (error) {
                console.error('[PWA] فشل الاشتراك في الإشعارات:', error);
                return false;
            }
        }
        
        urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        }
        
        async clearCache() {
            if (!('caches' in window)) {
                this.showToast('⚠️ المتصفح لا يدعم Cache API', 'warning');
                return;
            }
            
            try {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                this.showToast('✅ تم مسح الكاش بنجاح', 'success');
                return true;
            } catch (error) {
                console.error('[PWA] فشل مسح الكاش:', error);
                this.showToast('❌ فشل مسح الكاش', 'error');
                return false;
            }
        }
        
        getCacheSize() {
            if (!('caches' in window)) return;
            
            caches.keys().then(async names => {
                let total = 0;
                for (const name of names) {
                    const cache = await caches.open(name);
                    const keys = await cache.keys();
                    for (const request of keys) {
                        const response = await cache.match(request);
                        const blob = await response.blob();
                        total += blob.size;
                    }
                }
                const sizeMB = (total / (1024 * 1024)).toFixed(2);
                console.log(`[PWA] حجم الكاش: ${sizeMB} MB`);
                return sizeMB;
            });
        }
    }
    
    // =====================================================
    // تحسينات إضافية لتجربة PWA
    // =====================================================
    
    class PWAEnhancements {
        static setupSplashScreen() {
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen && window.matchMedia('(display-mode: standalone)').matches) {
                // إخفاء شاشة البداية بعد تحميل التطبيق
                setTimeout(() => {
                    splashScreen.classList.add('hide');
                    document.getElementById('mainApp').style.display = 'block';
                }, 1500);
            }
        }
        
        static setupThemeColor() {
            const themeColor = document.querySelector('meta[name="theme-color"]');
            if (themeColor) {
                window.addEventListener('load', () => {
                    const isDark = document.body.classList.contains('dark-mode');
                    themeColor.setAttribute('content', isDark ? '#1a1a2e' : '#2e7d32');
                });
            }
        }
        
        static setupOfflinePage() {
            if ('caches' in window) {
                caches.open('offline-page').then(cache => {
                    const offlineHTML = `
                        <!DOCTYPE html>
                        <html lang="ar" dir="rtl">
                        <head>
                            <meta charset="UTF-8">
                            <title>غير متصل - موسوعة الأعشاب</title>
                            <style>
                                body { font-family: 'Cairo', sans-serif; text-align: center; padding: 50px; background: #fef9e6; }
                                h1 { color: #2e7d32; }
                                .icon { font-size: 64px; margin: 20px; }
                            </style>
                        </head>
                        <body>
                            <div class="icon">🌿</div>
                            <h1>غير متصل بالإنترنت</h1>
                            <p>يرجى التحقق من اتصالك بالإنترنت</p>
                            <button onclick="location.reload()">إعادة المحاولة</button>
                        </body>
                        </html>
                    `;
                    cache.put('/offline.html', new Response(offlineHTML, { headers: { 'Content-Type': 'text/html' } }));
                });
            }
        }
        
        static setupAutoRefresh() {
            let refreshTimer = null;
            
            const scheduleRefresh = () => {
                if (refreshTimer) clearInterval(refreshTimer);
                refreshTimer = setInterval(() => {
                    if (navigator.onLine && document.visibilityState === 'visible') {
                        if (window.forceFetchFromServer) {
                            window.forceFetchFromServer();
                        }
                    }
                }, 30 * 60 * 1000); // كل 30 دقيقة
            };
            
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    scheduleRefresh();
                }
            });
            
            scheduleRefresh();
        }
        
        static setupShortcuts() {
            // معالجة اختصارات URL
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('search') === 'true') {
                setTimeout(() => {
                    const searchBtn = document.getElementById('searchBtn');
                    if (searchBtn) searchBtn.click();
                }, 1000);
            }
            if (urlParams.get('add') === 'true' && window.isAdmin) {
                setTimeout(() => {
                    const addBtn = document.getElementById('addHerbBtn');
                    if (addBtn) addBtn.click();
                }, 1000);
            }
        }
    }
    
    // =====================================================
    // ربط الأزرار والتهيئة
    // =====================================================
    
    let pwaManager = null;
    
    function initPWA() {
        pwaManager = new PWAManager();
        
        // إضافة مستمع لتثبيت التطبيق
        const installBtn = document.getElementById('installPwaBtn');
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                if (pwaManager) pwaManager.installPWA();
            });
        }
        
        // إضافة زر تنظيف الكاش في شريط المسؤول
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            const originalClick = clearCacheBtn.onclick;
            clearCacheBtn.addEventListener('click', () => {
                if (confirm('⚠️ هل تريد مسح جميع ملفات التخزين المؤقت (Cache)؟ سيتم إعادة تحميل الصفحة.')) {
                    if (pwaManager) pwaManager.clearCache().then(() => location.reload());
                }
            });
        }
        
        // إضافة زر تفعيل الإشعارات
        const notifyBtn = document.getElementById('requestNotifyBtn');
        if (notifyBtn) {
            notifyBtn.addEventListener('click', () => {
                if (pwaManager) pwaManager.subscribeToPushNotifications();
            });
        }
        
        // تحسينات إضافية
        PWAEnhancements.setupSplashScreen();
        PWAEnhancements.setupThemeColor();
        PWAEnhancements.setupOfflinePage();
        PWAEnhancements.setupAutoRefresh();
        PWAEnhancements.setupShortcuts();
        
        console.log('[PWA] تم تهيئة نظام PWA بالكامل');
    }
    
    // بدء التهيئة عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPWA);
    } else {
        initPWA();
    }
    
    // تصدير الدوال للنطاق العام
    window.PWAManager = PWAManager;
    window.pwaManager = pwaManager;
    window.installPWA = () => pwaManager?.installPWA();
    window.clearPWACache = () => pwaManager?.clearCache();
    
})();
