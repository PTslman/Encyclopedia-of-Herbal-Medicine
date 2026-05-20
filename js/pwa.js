// ============================================================
// PWA Manager Ultra - موسوعة الأعشاب الطبية
// الإصدار 5.0 - متكامل بجميع ميزات PWA الحديثة
// تم تطويره ليتوافق مع التغييرات: المزامنة، شريط التقدم، وضع عدم الاتصال
// ============================================================

(function(window, document, navigator) {
    'use strict';
    
    // ==================== المتغيرات العامة ====================
    const PWA_VERSION = '5.0.0';
    const CACHE_NAME = 'herbal-pwa-ultimate-v5';
    const STATIC_CACHE = 'herbal-static-ultimate-v5';
    const DYNAMIC_CACHE = 'herbal-dynamic-ultimate-v5';
    const IMAGE_CACHE = 'herbal-images-ultimate-v5';
    const API_CACHE = 'herbal-api-ultimate-v5';
    
    let swRegistration = null;
    let deferredPrompt = null;
    let isSubscribed = false;
    let syncQueue = [];
    let isOnline = navigator.onLine;
    let syncInProgress = false;
    
    // ==================== إعدادات VAPID للإشعارات ====================
    const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    
    // ==================== قائمة الملفات الأساسية للتخزين المؤقت ====================
    const STATIC_ASSETS = [
        '/Encyclopedia-of-Herbal-Medicine/',
        '/Encyclopedia-of-Herbal-Medicine/index.html',
        '/Encyclopedia-of-Herbal-Medicine/offline.html',
        '/Encyclopedia-of-Herbal-Medicine/help.html',
        '/Encyclopedia-of-Herbal-Medicine/manifest.json',
        '/Encyclopedia-of-Herbal-Medicine/css/style.css',
        '/Encyclopedia-of-Herbal-Medicine/js/firebase-config.js',
        '/Encyclopedia-of-Herbal-Medicine/js/app.js',
        '/Encyclopedia-of-Herbal-Medicine/js/pwa.js',
        '/Encyclopedia-of-Herbal-Medicine/js/local-db.js',
        'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
        'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
        'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js'
    ];
    
    // ==================== دالة تحديث شريط التقدم ====================
    function updateSyncProgress(percent, status) {
        const fill = document.getElementById('syncProgressFill');
        const percentSpan = document.getElementById('syncProgressPercent');
        const statusSpan = document.getElementById('syncStatusText');
        
        if (fill) fill.style.width = Math.min(percent, 100) + '%';
        if (percentSpan) percentSpan.innerText = Math.floor(percent) + '%';
        if (statusSpan) statusSpan.innerText = status || (percent >= 100 ? '✅ مزامن' : '🔄 جاري...');
    }
    
    // ==================== 1. تسجيل Service Worker المتقدم ====================
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[PWA] Service Worker غير مدعوم في هذا المتصفح');
            return false;
        }
        
        try {
            // إلغاء تسجيل أي Service Worker قديم
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                if (registration.active && registration.active.scriptURL.includes('sw.js')) {
                    await registration.unregister();
                    console.log('[PWA] تم إلغاء تسجيل Service Worker القديم');
                }
            }
            
            // تسجيل Service Worker الجديد
            const registration = await navigator.serviceWorker.register('/Encyclopedia-of-Herbal-Medicine/sw.js', {
                scope: '/Encyclopedia-of-Herbal-Medicine/'
            });
            swRegistration = registration;
            console.log('[PWA] ✅ Service Worker مسجل بنجاح:', registration);
            
            // مراقبة التحديثات
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateNotification();
                        }
                    });
                }
            });
            
            return true;
        } catch (error) {
            console.error('[PWA] ❌ فشل تسجيل Service Worker:', error);
            return false;
        }
    }
    
    // ==================== 2. إظهار إشعار التحديث ====================
    function showUpdateNotification() {
        const toast = document.createElement('div');
        toast.innerHTML = `
            <div style="position:fixed;bottom:20px;left:20px;right:20px;background:linear-gradient(135deg,#2e7d32,#1b5e20);color:white;padding:14px 20px;border-radius:60px;z-index:10001;display:flex;justify-content:space-between;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,0.3);direction:rtl;">
                <span><i class="fas fa-sync-alt" style="margin-left:8px;"></i> 🔄 تحديث جديد متاح للتطبيق!</span>
                <button id="pwaUpdateBtn" style="background:#ffd700;color:#1b5e20;border:none;padding:8px 20px;border-radius:40px;cursor:pointer;font-weight:bold;">تحديث الآن</button>
            </div>
        `;
        document.body.appendChild(toast);
        
        const updateBtn = document.getElementById('pwaUpdateBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                localStorage.removeItem('pwa_generated_icons_v2');
                localStorage.removeItem('herbal_manifest_v2');
                window.location.reload();
            });
        }
        
        setTimeout(() => toast.remove(), 10000);
    }
    
    // ==================== 3. إعداد طلب التثبيت ====================
    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('[PWA] ✅ التطبيق جاهز للتثبيت');
            
            // إظهار إشعار للمستخدم
            const toast = document.createElement('div');
            toast.innerHTML = `
                <div style="position:fixed;bottom:80px;left:20px;right:20px;background:#2e7d32;color:white;padding:12px 20px;border-radius:60px;z-index:10001;display:flex;justify-content:space-between;align-items:center;direction:rtl;">
                    <span><i class="fas fa-download"></i> يمكنك تثبيت التطبيق على جهازك!</span>
                    <button id="pwaInstallNowBtn" style="background:#ffd700;color:#1b5e20;border:none;padding:6px 16px;border-radius:40px;cursor:pointer;font-weight:bold;">تثبيت</button>
                </div>
            `;
            document.body.appendChild(toast);
            
            const installBtn = document.getElementById('pwaInstallNowBtn');
            if (installBtn) {
                installBtn.addEventListener('click', () => {
                    showInstallPrompt();
                    toast.remove();
                });
            }
            
            setTimeout(() => toast.remove(), 8000);
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] ✅ تم تثبيت التطبيق بنجاح');
            deferredPrompt = null;
            
            // إظهار رسالة ترحيب
            setTimeout(() => {
                alert('🎉 شكراً لتثبيت موسوعة الأعشاب الطبية!\nيمكنك الآن استخدام التطبيق من شاشة التطبيقات.');
            }, 1000);
        });
    }
    
    // ==================== 4. إظهار طلب التثبيت ====================
    async function showInstallPrompt() {
        if (!deferredPrompt) {
            showManualInstallGuide();
            return;
        }
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] نتيجة التثبيت: ${outcome}`);
        deferredPrompt = null;
    }
    
    // ==================== 5. دليل التثبيت اليدوي ====================
    function showManualInstallGuide() {
        const modal = document.getElementById('installGuideModal');
        if (modal) {
            const isAndroid = /Android/.test(navigator.userAgent);
            const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
            
            let guideText = '';
            if (isAndroid) {
                guideText = '📱 لتثبيت التطبيق على Android:\n1. اضغط على زر القائمة (⋮) في الأعلى\n2. اختر "تثبيت التطبيق"\n3. اتبع التعليمات';
            } else if (isIOS) {
                guideText = '📱 لتثبيت التطبيق على iOS:\n1. اضغط على زر المشاركة ⬆️\n2. اختر "إضافة إلى الشاشة الرئيسية"\n3. اضغط "إضافة"';
            } else {
                guideText = '💻 لتثبيت التطبيق:\n1. ابحث عن أيقونة التثبيت في شريط العنوان\n2. اضغط عليها\n3. اتبع التعليمات';
            }
            
            const guideElement = modal.querySelector('#installGuideText');
            if (guideElement) guideElement.innerHTML = guideText;
            modal.classList.add('active');
        }
    }
    
    // ==================== 6. الإشعارات (Push Notifications) ====================
    async function initPushNotifications() {
        if (!('Notification' in window) || !('PushManager' in window)) {
            console.warn('[PWA] الإشعارات غير مدعومة');
            return false;
        }
        
        if (!swRegistration) await registerServiceWorker();
        if (!swRegistration) return false;
        
        if (Notification.permission === 'granted') {
            await subscribeToPush();
            return true;
        }
        return false;
    }
    
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert('المتصفح لا يدعم الإشعارات');
            return false;
        }
        
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await subscribeToPush();
                alert('✅ تم تفعيل الإشعارات بنجاح');
                return true;
            } else {
                alert('⚠️ لم يتم منح صلاحية الإشعارات');
                return false;
            }
        } catch (error) {
            console.error('[PWA] فشل طلب الإشعارات:', error);
            return false;
        }
    }
    
    async function subscribeToPush() {
        if (!swRegistration?.pushManager) return null;
        
        try {
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            isSubscribed = true;
            localStorage.setItem('push-subscription', JSON.stringify(subscription));
            console.log('[PWA] ✅ تم الاشتراك في الإشعارات');
            return subscription;
        } catch (error) {
            console.error('[PWA] ❌ فشل الاشتراك:', error);
            return null;
        }
    }
    
    async function unsubscribeFromPush() {
        if (!swRegistration?.pushManager) return false;
        
        try {
            const subscription = await swRegistration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                isSubscribed = false;
                localStorage.removeItem('push-subscription');
                console.log('[PWA] ✅ تم إلغاء الاشتراك');
                return true;
            }
        } catch (error) {
            console.error('[PWA] ❌ فشل إلغاء الاشتراك:', error);
        }
        return false;
    }
    
    async function sendTestNotification() {
        if (!swRegistration) {
            alert('Service Worker غير جاهز، حاول مرة أخرى');
            return;
        }
        
        swRegistration.showNotification('🌿 موسوعة الأعشاب الطبية', {
            body: 'مرحباً بك! استكشف فوائد وأضرار الأعشاب الطبية',
            icon: '/Encyclopedia-of-Herbal-Medicine/icons/icon-192.png',
            badge: '/Encyclopedia-of-Herbal-Medicine/icons/icon-72.png',
            vibrate: [200, 100, 200],
            tag: 'welcome-notification',
            actions: [
                { action: 'explore', title: 'استكشاف' },
                { action: 'close', title: 'إغلاق' }
            ],
            data: {
                url: window.location.href,
                date: Date.now()
            }
        });
    }
    
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    // ==================== 7. مزامنة الخلفية (Background Sync) ====================
    async function registerBackgroundSync(tag = 'sync-herbs') {
        if (!swRegistration?.sync) {
            console.warn('[PWA] Background Sync غير مدعوم');
            return false;
        }
        
        try {
            await swRegistration.sync.register(tag);
            console.log(`[PWA] ✅ تم تسجيل مزامنة الخلفية: ${tag}`);
            return true;
        } catch (error) {
            console.error('[PWA] ❌ فشل تسجيل المزامنة:', error);
            return false;
        }
    }
    
    function queueOfflineAction(action, data) {
        let queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        queue.push({
            id: Date.now(),
            action: action,
            data: data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('offline-queue', JSON.stringify(queue));
        
        if (navigator.onLine && swRegistration?.sync) {
            registerBackgroundSync('sync-herbs');
        }
        
        console.log(`[PWA] 📦 تم إضافة "${action}" إلى قائمة الانتظار`);
    }
    
    async function processOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        if (queue.length === 0) return [];
        
        updateSyncProgress(30, `🔄 معالجة ${queue.length} عملية معلقة...`);
        console.log(`[PWA] 🔄 معالجة ${queue.length} عملية معلقة`);
        
        const failed = [];
        for (const item of queue) {
            try {
                if (item.action === 'save-herb' && window.saveHerbToDB) {
                    await window.saveHerbToDB(item.data);
                } else if (item.action === 'delete-herb' && window.deleteHerb) {
                    await window.deleteHerb(item.data.herbId);
                } else if (item.action === 'update-herb' && window.updateHerb) {
                    await window.updateHerb(item.data);
                } else {
                    failed.push(item);
                }
            } catch (error) {
                console.error(`[PWA] ❌ فشل معالجة ${item.id}:`, error);
                failed.push(item);
            }
        }
        
        localStorage.setItem('offline-queue', JSON.stringify(failed));
        updateSyncProgress(100, `✅ تمت معالجة ${queue.length - failed.length} عملية`);
        return queue.filter(q => !failed.includes(q));
    }
    
    // ==================== 8. إدارة الكاش المتقدمة ====================
    async function clearAllCaches() {
        if (!('caches' in window)) return false;
        
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[PWA] ✅ تم مسح جميع الكاشات');
            return true;
        } catch (error) {
            console.error('[PWA] ❌ فشل مسح الكاشات:', error);
            return false;
        }
    }
    
    async function getCacheInfo() {
        if (!('caches' in window)) return [];
        
        const info = [];
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            let size = 0;
            for (const request of keys) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    size += blob.size;
                }
            }
            info.push({
                name: name,
                size: keys.length,
                totalSize: (size / 1024 / 1024).toFixed(2) + ' MB',
                urls: keys.map(req => req.url)
            });
        }
        return info;
    }
    
    async function prefetchAssets(urls) {
        if (!('caches' in window)) return;
        
        try {
            const cache = await caches.open('prefetch-v1');
            await cache.addAll(urls);
            console.log(`[PWA] ✅ تم التحميل المسبق لـ ${urls.length} ملف`);
        } catch (error) {
            console.error('[PWA] ❌ فشل التحميل المسبق:', error);
        }
    }
    
    // ==================== 9. مشاركة التطبيق (Web Share API) ====================
    async function shareApp(title = 'موسوعة الأعشاب الطبية', text = 'استكشف فوائد وأضرار الأعشاب الطبية', url = window.location.href) {
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                console.log('[PWA] ✅ تمت المشاركة بنجاح');
                return true;
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('[PWA] ❌ فشل المشاركة:', error);
                    fallbackCopyLink(url);
                }
            }
        } else {
            fallbackCopyLink(url);
        }
        return false;
    }
    
    async function fallbackCopyLink(url) {
        try {
            await navigator.clipboard.writeText(url);
            alert('✅ تم نسخ رابط التطبيق، يمكنك مشاركته الآن');
        } catch (err) {
            alert('يمكنك مشاركة الرابط: ' + url);
        }
    }
    
    // ==================== 10. كشف حالة الاتصال المتقدم ====================
    function setupConnectivityHandling() {
        window.addEventListener('online', async () => {
            console.log('[PWA] 🌐 تم استعادة الاتصال بالإنترنت');
            isOnline = true;
            
            updateSyncProgress(20, '🔄 جاري المزامنة...');
            showConnectivityToast('✅ تم استعادة الاتصال بالإنترنت', 'success');
            
            // معالجة العمليات المعلقة
            const results = await processOfflineQueue();
            if (results.length > 0) {
                showConnectivityToast(`🔄 تمت مزامنة ${results.length} عملية بنجاح`, 'info');
            }
            
            // تحديث البيانات من السيرفر
            if (window.forceSyncData) {
                await window.forceSyncData();
            } else if (window.forceFetchFromServer) {
                await window.forceFetchFromServer();
            }
            
            updateSyncProgress(100, '✅ مزامن');
        });
        
        window.addEventListener('offline', () => {
            console.log('[PWA] ⚠️ فقدان الاتصال بالإنترنت');
            isOnline = false;
            showConnectivityToast('⚠️ لا يوجد اتصال بالإنترنت - يتم عرض البيانات المخزنة محلياً', 'warning');
            updateSyncProgress(0, '📡 غير متصل');
        });
    }
    
    function showConnectivityToast(message, type = 'info') {
        const colors = {
            success: '#4caf50',
            warning: '#ff9800',
            error: '#f44336',
            info: '#2196f3'
        };
        
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 60px;
            text-align: center;
            z-index: 10001;
            font-size: 0.85rem;
            direction: rtl;
            font-family: 'Cairo', sans-serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: slideUp 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
    
    // ==================== 11. كشف أداء الجهاز ====================
    async function detectPerformance() {
        return new Promise((resolve) => {
            let frames = 0;
            let startTime = performance.now();
            
            function countFrames(timestamp) {
                frames++;
                if (timestamp - startTime < 1000) {
                    requestAnimationFrame(countFrames);
                } else {
                    const fps = Math.round(frames);
                    let level = 'medium';
                    if (fps >= 90) level = 'high';
                    else if (fps <= 45) level = 'low';
                    
                    document.body.classList.add(`performance-${level}`);
                    console.log(`[PWA] 📊 أداء الجهاز: ${fps}FPS (${level})`);
                    resolve({ fps, level });
                }
            }
            
            requestAnimationFrame(countFrames);
        });
    }
    
    // ==================== 12. إضافة أزرار التحكم في الواجهة ====================
    function addControlButtons() {
        // إضافة زر الإشعارات في شريط المسؤول إذا لم يكن موجوداً
        const adminToolbar = document.querySelector('.admin-toolbar');
        if (adminToolbar && !document.getElementById('pwaNotifyBtn')) {
            const notifyBtn = document.createElement('button');
            notifyBtn.id = 'pwaNotifyBtn';
            notifyBtn.className = 'tool-btn';
            notifyBtn.innerHTML = '<i class="fas fa-bell"></i> إشعارات';
            notifyBtn.title = 'تفعيل الإشعارات';
            notifyBtn.onclick = () => requestNotificationPermission();
            adminToolbar.appendChild(notifyBtn);
        }
        
        // إضافة زر مسح الكاش في شريط المسؤول
        if (adminToolbar && !document.getElementById('pwaClearCacheBtn')) {
            const clearCacheBtn = document.createElement('button');
            clearCacheBtn.id = 'pwaClearCacheBtn';
            clearCacheBtn.className = 'tool-btn';
            clearCacheBtn.innerHTML = '<i class="fas fa-broom"></i> مسح الكاش';
            clearCacheBtn.title = 'مسح التخزين المؤقت';
            clearCacheBtn.onclick = async () => {
                if (confirm('⚠️ هل أنت متأكد من مسح الكاش؟ سيتم حذف الملفات المخزنة مؤقتاً.')) {
                    await clearAllCaches();
                    alert('✅ تم مسح الكاش بنجاح');
                }
            };
            adminToolbar.appendChild(clearCacheBtn);
        }
    }
    
    // ==================== 13. الحصول على حالة PWA ====================
    function getPWAStatus() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        return {
            isInstalled: isStandalone,
            isOnline: navigator.onLine,
            serviceWorker: swRegistration ? 'registered' : 'not registered',
            notifications: Notification.permission,
            pushSubscribed: isSubscribed,
            version: PWA_VERSION,
            offlineQueue: JSON.parse(localStorage.getItem('offline-queue') || '[]').length
        };
    }
    
    // ==================== 14. تقرير تشخيصي كامل ====================
    async function getDiagnostics() {
        const cacheInfo = await getCacheInfo();
        const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        const status = getPWAStatus();
        const performance = await detectPerformance();
        
        return {
            ...status,
            performance: performance,
            cacheDetails: cacheInfo,
            offlineQueueSize: queue.length,
            localStorageSize: (JSON.stringify(localStorage).length / 1024).toFixed(2) + ' KB',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            pwaVersion: PWA_VERSION
        };
    }
    
    // ==================== 15. التهيئة الرئيسية ====================
    async function init() {
        console.log(`🚀 [PWA] تهيئة وحدة PWA المتطورة - الإصدار ${PWA_VERSION}`);
        
        // 1. تسجيل Service Worker
        await registerServiceWorker();
        
        // 2. إعداد طلب التثبيت
        setupInstallPrompt();
        
        // 3. إعداد معالجة الاتصال
        setupConnectivityHandling();
        
        // 4. إضافة أزرار التحكم
        addControlButtons();
        
        // 5. كشف أداء الجهاز
        await detectPerformance();
        
        // 6. تهيئة الإشعارات إذا كان الإذن ممنوحاً
        if (Notification.permission === 'granted') {
            await initPushNotifications();
        }
        
        // 7. معالجة قائمة الانتظار
        if (navigator.onLine) {
            await processOfflineQueue();
        }
        
        // 8. التحقق من وضع التثبيت
        if (window.matchMedia('(display-mode: standalone)').matches) {
            document.body.classList.add('pwa-mode');
            console.log('[PWA] 📱 يعمل كتطبيق مثبت');
        }
        
        // 9. تحميل مسبق للملفات
        setTimeout(() => {
            prefetchAssets([
                '/Encyclopedia-of-Herbal-Medicine/',
                '/Encyclopedia-of-Herbal-Medicine/index.html',
                '/Encyclopedia-of-Herbal-Medicine/offline.html',
                '/Encyclopedia-of-Herbal-Medicine/help.html'
            ]);
        }, 3000);
        
        console.log('[PWA] ✅ تم تهيئة وحدة PWA بنجاح');
    }
    
    // ==================== التصدير ====================
    window.PWA = {
        init,
        registerServiceWorker,
        showInstallPrompt,
        requestNotificationPermission,
        sendTestNotification,
        shareApp,
        clearAllCaches,
        getCacheInfo,
        getPWAStatus,
        getDiagnostics,
        processOfflineQueue,
        queueOfflineAction,
        isSubscribed: () => isSubscribed,
        version: PWA_VERSION
    };
    
    // التشغيل التلقائي
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})(window, document, navigator);
