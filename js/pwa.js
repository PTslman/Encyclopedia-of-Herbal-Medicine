// ============================================
// pwa.js - Progressive Web App Advanced Module
// Fully-featured PWA Manager with:
// - Service Worker Registration & Updates
// - Push Notifications (VAPID)
// - Background Sync
// - Advanced Caching Strategies (Workbox-like)
// - Install Prompt Handling
// - Web Share API
// ============================================

const PWA = (function() {
    // ==================== Private Variables ====================
    let swRegistration = null;
    let deferredPrompt = null;
    let isSubscribed = false;
    
    // VAPID Keys - يجب استبدالها بمفاتيح من الخادم الخاص بك
    // لتوليدها: https://web-push-codelab.glitch.me/
    const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    
    // ==================== Public Constants ====================
    const CACHE_STRATEGIES = {
        CACHE_FIRST: 'cache-first',
        NETWORK_FIRST: 'network-first',
        STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
        NETWORK_ONLY: 'network-only',
        CACHE_ONLY: 'cache-only'
    };
    
    // ==================== Service Worker Management ====================
    
    /**
     * Register Service Worker with automatic updates
     * @returns {Promise<ServiceWorkerRegistration>}
     */
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker not supported');
            return null;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            swRegistration = registration;
            console.log('✅ Service Worker registered:', registration);
            
            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 New Service Worker installing...');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('🆕 Update available, prompting user');
                        showUpdateToast();
                    }
                });
            });
            
            // Check for updates periodically (every hour)
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000);
            
            return registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            return null;
        }
    }
    
    /**
     * Show update notification to user
     */
    function showUpdateToast() {
        const toast = document.createElement('div');
        toast.className = 'update-toast';
        toast.innerHTML = `
            <div class="update-toast-content">
                <i class="fas fa-sync-alt"></i>
                <span>تحديث جديد متاح!</span>
                <button id="updateNowBtn" class="update-btn">تحديث الآن</button>
            </div>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: var(--primary, #2e7d32);
            color: white;
            padding: 12px 20px;
            border-radius: 50px;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            direction: rtl;
            font-family: 'Cairo', sans-serif;
        `;
        document.body.appendChild(toast);
        
        document.getElementById('updateNowBtn')?.addEventListener('click', () => {
            window.location.reload();
        });
        
        setTimeout(() => toast.remove(), 10000);
    }
    
    // ==================== Push Notifications ====================
    
    /**
     * Initialize push notifications
     * @returns {Promise<boolean>}
     */
    async function initPushNotifications() {
        if (!('Notification' in window)) {
            console.warn('⚠️ Notifications not supported');
            return false;
        }
        
        if (!('PushManager' in window)) {
            console.warn('⚠️ PushManager not supported');
            return false;
        }
        
        if (!swRegistration) {
            await registerServiceWorker();
        }
        
        if (!swRegistration) return false;
        
        // Check permission status
        const permission = Notification.permission;
        if (permission === 'granted') {
            await subscribeToPush();
            return true;
        } else if (permission === 'default') {
            // Don't auto-request, wait for user action
            return false;
        }
        
        return false;
    }
    
    /**
     * Request notification permission
     * @returns {Promise<boolean>}
     */
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert('المتصفح لا يدعم الإشعارات');
            return false;
        }
        
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                await subscribeToPush();
                return true;
            } else {
                console.log('❌ Notification permission denied');
                return false;
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            return false;
        }
    }
    
    /**
     * Subscribe to push notifications
     * @returns {Promise<PushSubscription|null>}
     */
    async function subscribeToPush() {
        if (!swRegistration || !swRegistration.pushManager) {
            console.warn('PushManager not available');
            return null;
        }
        
        try {
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            
            console.log('✅ Push subscription:', subscription);
            isSubscribed = true;
            
            // Send subscription to backend
            await sendSubscriptionToServer(subscription);
            
            return subscription;
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
            return null;
        }
    }
    
    /**
     * Unsubscribe from push notifications
     * @returns {Promise<boolean>}
     */
    async function unsubscribeFromPush() {
        if (!swRegistration || !swRegistration.pushManager) return false;
        
        try {
            const subscription = await swRegistration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                isSubscribed = false;
                console.log('✅ Unsubscribed from push');
                return true;
            }
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
        }
        return false;
    }
    
    /**
     * Send subscription to backend server
     * @param {PushSubscription} subscription 
     */
    async function sendSubscriptionToServer(subscription) {
        try {
            // Store subscription in localStorage for demo purposes
            localStorage.setItem('push-subscription', JSON.stringify(subscription));
            
            // In production, send to your backend:
            // await fetch('/api/push/subscribe', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(subscription)
            // });
            
            console.log('✅ Subscription saved locally');
        } catch (error) {
            console.error('Failed to send subscription:', error);
        }
    }
    
    /**
     * Send test notification
     */
    async function sendTestNotification() {
        if (!swRegistration) {
            await registerServiceWorker();
        }
        
        if (swRegistration) {
            swRegistration.showNotification('🌿 موسوعة الأعشاب', {
                body: 'تم تحديث الموسوعة بإضافة أعشاب جديدة!',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                vibrate: [200, 100, 200],
                actions: [
                    { action: 'explore', title: 'استكشاف' },
                    { action: 'close', title: 'إغلاق' }
                ]
            });
        }
    }
    
    /**
     * Convert base64 string to Uint8Array for VAPID
     * @param {string} base64String 
     * @returns {Uint8Array}
     */
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    // ==================== Background Sync ====================
    
    /**
     * Register background sync for offline actions
     * @param {string} tag 
     * @returns {Promise<boolean>}
     */
    async function registerBackgroundSync(tag = 'sync-herbs') {
        if (!swRegistration || !swRegistration.sync) {
            console.warn('⚠️ Background Sync not supported');
            return false;
        }
        
        try {
            await swRegistration.sync.register(tag);
            console.log(`✅ Background sync registered: ${tag}`);
            return true;
        } catch (error) {
            console.error('Failed to register background sync:', error);
            return false;
        }
    }
    
    /**
     * Queue an action for offline execution
     * @param {string} action 
     * @param {Object} data 
     */
    function queueOfflineAction(action, data) {
        let queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        queue.push({
            id: Date.now(),
            action: action,
            data: data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('offline-queue', JSON.stringify(queue));
        
        // Try to sync if online
        if (navigator.onLine && swRegistration && swRegistration.sync) {
            registerBackgroundSync('sync-herbs');
        }
    }
    
    /**
     * Process offline queue
     * @returns {Promise<Array>}
     */
    async function processOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        if (queue.length === 0) return [];
        
        const results = [];
        const failed = [];
        
        for (const item of queue) {
            try {
                let result;
                switch (item.action) {
                    case 'save-herb':
                        result = await window.saveHerbToDB?.(item.data);
                        break;
                    case 'delete-herb':
                        result = await window.deleteHerb?.(item.data.herbId);
                        break;
                    default:
                        result = null;
                }
                
                if (result !== false) {
                    results.push({ ...item, status: 'success' });
                } else {
                    failed.push(item);
                }
            } catch (error) {
                console.error(`Failed to process ${item.action}:`, error);
                failed.push(item);
            }
        }
        
        // Update queue with failed items only
        localStorage.setItem('offline-queue', JSON.stringify(failed));
        
        return results;
    }
    
    // ==================== Advanced Caching Management ====================
    
    /**
     * Clear all caches
     * @returns {Promise<boolean>}
     */
    async function clearAllCaches() {
        if (!('caches' in window)) return false;
        
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('✅ All caches cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear caches:', error);
            return false;
        }
    }
    
    /**
     * Get cache storage information
     * @returns {Promise<Array>}
     */
    async function getCacheInfo() {
        if (!('caches' in window)) return [];
        
        const info = [];
        const cacheNames = await caches.keys();
        
        for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            info.push({
                name: name,
                size: keys.length,
                urls: keys.map(req => req.url)
            });
        }
        
        return info;
    }
    
    /**
     * Prefetch critical assets for offline use
     * @param {Array<string>} urls 
     */
    async function prefetchAssets(urls) {
        if (!('caches' in window)) return;
        
        const cache = await caches.open('prefetch-v1');
        await cache.addAll(urls);
        console.log(`✅ Prefetched ${urls.length} assets`);
    }
    
    // ==================== Install Prompt Handling ====================
    
    /**
     * Setup install prompt handler
     */
    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) {
                installBtn.style.display = 'flex';
                installBtn.addEventListener('click', showInstallPrompt);
            }
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('✅ App installed successfully');
            deferredPrompt = null;
            
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) installBtn.style.display =none';
        });
    }
    
    /**
     * Show install prompt to user
     */
    async function showInstallPrompt() {
        if (!deferredPrompt) {
            showManualInstallGuide();
            return;
        }
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('✅ User accepted install');
        } else {
            console.log('❌ User dismissed install');
        }
        
        deferredPrompt = null;
    }
    
    /**
     * Show manual install guide for browsers that don't support auto prompt
     */
    function showManualInstallGuide() {
        const modal = document.getElementById('installGuideModal');
        if (modal) modal.classList.add('active');
    }
    
    // ==================== Web Share API ====================
    
    /**
     * Share app using Web Share API
     * @param {string} title 
     * @param {string} text 
     * @param {string} url 
     */
    async function shareApp(title = 'موسوعة الأعشاب الطبية', text = 'استكشف فوائد وأضرار الأعشاب الطبية', url = window.location.href) {
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                console.log('✅ Shared successfully');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Share failed:', error);
                    fallbackCopyLink(url);
                }
            }
        } else {
            fallbackCopyLink(url);
        }
    }
    
    /**
     * Fallback to clipboard copy
     * @param {string} url 
     */
    async function fallbackCopyLink(url) {
        try {
            await navigator.clipboard.writeText(url);
            alert('تم نسخ رابط التطبيق، يمكنك مشاركته الآن');
        } catch (err) {
            alert('يمكنك مشاركة الرابط: ' + url);
        }
    }
    
    // ==================== Online/Offline Handling ====================
    
    /**
     * Setup online/offline event listeners
     */
    function setupConnectivityHandling() {
        window.addEventListener('online', async () => {
            console.log('🟢 Back online');
            showConnectivityToast('تم استعادة الاتصال بالإنترنت', 'success');
            
            // Process offline queue
            const results = await processOfflineQueue();
            if (results.length > 0) {
                showConnectivityToast(`تمت مزامنة ${results.length} عملية غير متصلة`, 'info');
            }
            
            // Refresh data
            if (window.forceFetchFromServer) {
                window.forceFetchFromServer();
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('🔴 Offline');
            showConnectivityToast('لا يوجد اتصال بالإنترنت. سيتم حفظ التغييرات محلياً', 'warning');
        });
    }
    
    /**
     * Show connectivity toast message
     * @param {string} message 
     * @param {string} type 
     */
    function showConnectivityToast(message, type = 'info') {
        const colors = {
            success: '#4caf50',
            warning: '#ff9800',
            error: '#c62828',
            info: '#2196f3'
        };
        
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 30px;
            text-align: center;
            z-index: 9999;
            font-size: 0.9rem;
            direction: rtl;
            font-family: 'Cairo', sans-serif;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // ==================== PWA Status & Diagnostics ====================
    
    /**
     * Get PWA status information
     * @returns {Object}
     */
    function getPWAStatus() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isInstalled = deferredPrompt === null && isStandalone;
        
        return {
            isStandalone: isStandalone,
            isInstalled: isInstalled,
            serviceWorker: swRegistration ? 'registered' : 'not registered',
            notifications: Notification.permission,
            pushSubscribed: isSubscribed,
            online: navigator.onLine
        };
    }
    
    /**
     * Generate diagnostics report
     * @returns {Promise<Object>}
     */
    async function getDiagnostics() {
        const cacheInfo = await getCacheInfo();
        const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        const status = getPWAStatus();
        
        return {
            ...status,
            cacheSize: cacheInfo.length,
            cacheDetails: cacheInfo,
            offlineQueueSize: queue.length,
            offlineQueueItems: queue,
            userAgent: navigator.userAgent,
            language: navigator.language,
            timestamp: new Date().toISOString()
        };
    }
    
    // ==================== Initialization ====================
    
    /**
     * Initialize all PWA features
     */
    async function init() {
        console.log('🚀 Initializing PWA Module...');
        
        // Register Service Worker
        await registerServiceWorker();
        
        // Setup install prompt
        setupInstallPrompt();
        
        // Setup connectivity handling
        setupConnectivityHandling();
        
        // Initialize push notifications (if permission already granted)
        if (Notification.permission === 'granted') {
            await initPushNotifications();
        }
        
        // Check if running as PWA
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        if (isPWA) {
            document.body.classList.add('pwa-mode');
            console.log('📱 Running as installed PWA');
        }
        
        // Prefetch critical assets
        setTimeout(() => {
            prefetchAssets([
                '/',
                '/index.html',
                '/css/style.css',
                '/manifest.json'
            ]);
        }, 3000);
        
        console.log('✅ PWA Module initialized');
    }
    
    // ==================== Public API ====================
    return {
        init,
        registerServiceWorker,
        initPushNotifications,
        requestNotificationPermission,
        subscribeToPush,
        unsubscribeFromPush,
        sendTestNotification,
        registerBackgroundSync,
        queueOfflineAction,
        processOfflineQueue,
        clearAllCaches,
        getCacheInfo,
        prefetchAssets,
        showInstallPrompt,
        shareApp,
        getPWAStatus,
        getDiagnostics,
        CACHE_STRATEGIES,
        isSubscribed: () => isSubscribed
    };
})();

// ==================== Auto-initialize on load ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWA.init());
} else {
    PWA.init();
}

// ==================== Export for use in other modules ====================
window.PWA = PWA;