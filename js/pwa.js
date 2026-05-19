// ============================================
// pwa.js - Progressive Web App Advanced Module
// Fully-featured PWA Manager with:
// - Service Worker Registration & Updates
// - Push Notifications (VAPID)
// - Background Sync
// - Advanced Caching Strategies
// - Install Prompt Handling
// - Web Share API
// - AUTO-GENERATED ICONS (AI-Powered)
// ============================================

const PWA = (function() {
    // ==================== Private Variables ====================
    let swRegistration = null;
    let deferredPrompt = null;
    let isSubscribed = false;
    
    // VAPID Keys
    const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    
    // أيقونات PWA
    let generatedIcons = [];
    const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
    
    // ==================== Public Constants ====================
    const CACHE_STRATEGIES = {
        CACHE_FIRST: 'cache-first',
        NETWORK_FIRST: 'network-first',
        STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
        NETWORK_ONLY: 'network-only',
        CACHE_ONLY: 'cache-only'
    };
    
    // ==================== توليد الأيقونات بالذكاء الاصطناعي ====================
    
    /**
     * رسم خلفية عشبية متطورة
     */
    function drawHerbalBackground(ctx, size) {
        const center = size / 2;
        
        // خلفية متدرجة - ألوان طبيعية
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#0a3d12');
        grad.addColorStop(0.3, '#1b5e20');
        grad.addColorStop(0.6, '#2e7d32');
        grad.addColorStop(1, '#0d3b12');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        
        // نقوش عشبية ذهبية في الخلفية
        ctx.save();
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = size * 0.38;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(center, center, center + Math.cos(angle + 0.5) * radius * 0.7, center + Math.sin(angle + 0.5) * radius * 0.7);
            ctx.fillStyle = '#ffd700';
            ctx.fill();
        }
        ctx.restore();
        
        // زخارف أوراق ذهبية حول الحواف
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = size * 0.44;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            const leafSize = size * 0.07;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(leafSize, -leafSize/2, leafSize*1.5, 0);
            ctx.quadraticCurveTo(leafSize, leafSize/2, 0, 0);
            ctx.fillStyle = `rgba(255, 215, 0, ${0.7 - i * 0.05})`;
            ctx.fill();
            ctx.restore();
        }
    }
    
    /**
     * رسم إطار زخرفي عربي
     */
    function drawArabicBorder(ctx, size) {
        const center = size / 2;
        
        // دائرة خارجية ذهبية
        ctx.beginPath();
        ctx.arc(center, center, size * 0.42, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = size * 0.02;
        ctx.stroke();
        
        // دائرة داخلية
        ctx.beginPath();
        ctx.arc(center, center, size * 0.38, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = size * 0.008;
        ctx.stroke();
        
        // نقاط زخرفية على الدائرة
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const radius = size * 0.41;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.arc(x, y, size * 0.01, 0, Math.PI * 2);
            ctx.fillStyle = i % 2 === 0 ? '#ffd700' : 'rgba(255, 215, 0, 0.5)';
            ctx.fill();
        }
    }
    
    /**
     * رسم الخط العربي المزخرف "لِدْتُ أَصْبَحُ"
     */
    function drawArabicCalligraphy(ctx, size) {
        const center = size / 2;
        
        ctx.save();
        ctx.shadowBlur = size * 0.03;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        
        // السطر الأول: "لِدْتُ"
        ctx.font = `bold ${size * 0.22}px "Cairo", "Amiri", "Scheherazade New", serif`;
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('لِدْتُ', center, center - size * 0.12);
        
        // السطر الثاني: "أَصْبَحُ"
        ctx.font = `bold ${size * 0.22}px "Cairo", "Amiri", "Scheherazade New", serif`;
        ctx.fillStyle = '#ffecb3';
        ctx.fillText('أَصْبَحُ', center, center + size * 0.05);
        
        // رمز العشبة بين السطرين
        ctx.font = `${size * 0.2}px "Segoe UI Emoji", "Apple Color Emoji"`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🌿', center, center - size * 0.02);
        
        ctx.restore();
    }
    
    /**
     * رسم زخارف نباتية إضافية
     */
    function drawFloralDecorations(ctx, size) {
        const center = size / 2;
        
        // أوراق متفرقة
        const leaves = [
            { angle: -0.8, radius: 0.28, scale: 0.12 },
            { angle: 0.8, radius: 0.28, scale: 0.12 },
            { angle: -2.2, radius: 0.3, scale: 0.1 },
            { angle: 2.2, radius: 0.3, scale: 0.1 },
            { angle: -1.5, radius: 0.32, scale: 0.09 },
            { angle: 1.5, radius: 0.32, scale: 0.09 }
        ];
        
        for (const leaf of leaves) {
            const x = center + Math.cos(leaf.angle) * size * leaf.radius;
            const y = center + Math.sin(leaf.angle) * size * leaf.radius;
            const leafSize = size * leaf.scale;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(leaf.angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(leafSize, -leafSize/2.5, leafSize*1.3, 0);
            ctx.quadraticCurveTo(leafSize, leafSize/2.5, 0, 0);
            ctx.fillStyle = `rgba(168, 218, 120, 0.8)`;
            ctx.fill();
            ctx.restore();
        }
    }
    
    /**
     * توليد أيقونة مفردة
     */
    function generateSingleIcon(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // 1. الخلفية العشبية
        drawHerbalBackground(ctx, size);
        
        // 2. الإطار الزخرفي
        drawArabicBorder(ctx, size);
        
        // 3. الزخارف النباتية
        drawFloralDecorations(ctx, size);
        
        // 4. الخط العربي المزخرف
        drawArabicCalligraphy(ctx, size);
        
        // 5. تأثير الإضاءة النهائي
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const lightGrad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        lightGrad.addColorStop(0, 'rgba(255,255,200,0.15)');
        lightGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
        
        return canvas.toDataURL('image/png');
    }
    
    /**
     * توليد جميع أيقونات PWA
     */
    async function generateAllIcons() {
        console.log('🎨 جاري توليد أيقونات PWA بالذكاء الاصطناعي...');
        
        const savedIcons = localStorage.getItem('pwa_generated_icons');
        if (savedIcons) {
            try {
                const icons = JSON.parse(savedIcons);
                if (icons && icons.length === ICON_SIZES.length && (Date.now() - (icons[0]?.timestamp || 0) < 7 * 24 * 60 * 60 * 1000)) {
                    console.log('✅ استخدام أيقونات مخزنة مسبقاً');
                    generatedIcons = icons;
                    await updateManifestWithIcons();
                    return;
                }
            } catch(e) {}
        }
        
        // توليد أيقونات جديدة
        for (let i = 0; i < ICON_SIZES.length; i++) {
            const size = ICON_SIZES[i];
            console.log(`📱 توليد أيقونة ${size}x${size}...`);
            const iconDataUrl = generateSingleIcon(size);
            generatedIcons.push({
                size: size,
                dataUrl: iconDataUrl,
                timestamp: Date.now()
            });
            
            // تأخير بسيط لتجنب تجاوز الذاكرة
            await new Promise(r => setTimeout(r, 10));
        }
        
        // حفظ في localStorage
        localStorage.setItem('pwa_generated_icons', JSON.stringify(generatedIcons));
        console.log('✅ تم توليد وحفظ جميع الأيقونات بنجاح');
        
        // تحديث manifest
        await updateManifestWithIcons();
    }
    
    /**
     * تحديث manifest.json بالأيقونات الجديدة
     */
    async function updateManifestWithIcons() {
        const manifestContent = {
            name: "موسوعة الأعشاب الطبية",
            short_name: "أعشاب طبية",
            description: "موسوعة متكاملة للأعشاب الطبية مع مزامنة سحابية فورية",
            start_url: "/",
            display: "standalone",
            theme_color: "#2e7d32",
            background_color: "#fef9e6",
            orientation: "portrait",
            lang: "ar",
            dir: "rtl",
            categories: ["health", "medical", "education", "lifestyle"],
            icons: generatedIcons.map(icon => ({
                src: `data:image/png;base64,${icon.dataUrl.split(',')[1]}`,
                sizes: `${icon.size}x${icon.size}`,
                type: "image/png",
                purpose: "any maskable"
            })),
            shortcuts: [
                {
                    name: "البحث عن عشبة",
                    short_name: "بحث",
                    url: "/?search=true",
                    icons: [{ src: "data:image/png;base64,placeholder", sizes: "96x96" }]
                },
                {
                    name: "إضافة عشبة",
                    short_name: "إضافة",
                    url: "/?add=true",
                    icons: [{ src: "data:image/png;base64,placeholder", sizes: "96x96" }]
                }
            ],
            screenshots: [
                {
                    src: "screenshots/mobile.png",
                    sizes: "360x640",
                    type: "image/png"
                }
            ],
            prefer_related_applications: false,
            display_override: ["window-controls-overlay", "standalone"]
        };
        
        // حفظ manifest في localStorage للتطبيق الرئيسي
        localStorage.setItem('herbal_manifest', JSON.stringify(manifestContent));
        
        // محاولة تحديث ملف manifest الفعلي إذا كان موجوداً
        try {
            const manifestBlob = new Blob([JSON.stringify(manifestContent, null, 2)], { type: 'application/json' });
            const manifestUrl = URL.createObjectURL(manifestBlob);
            
            // تحديث رابط manifest في الصفحة
            let manifestLink = document.querySelector('link[rel="manifest"]');
            if (manifestLink) {
                manifestLink.href = manifestUrl;
            }
            
            console.log('✅ تم تحديث manifest.json بنجاح');
        } catch(e) {
            console.warn('⚠️ لا يمكن تحديث ملف manifest الفعلي، ولكن البيانات محفوظة محلياً');
        }
    }
    
    /**
     * إضافة الأيقونات إلى الصفحة (apple-touch-icons وغيرها)
     */
    function addIconsToDOM() {
        if (generatedIcons.length === 0) return;
        
        // إضافة أيقونات Apple Touch
        for (const icon of generatedIcons) {
            let link = document.querySelector(`link[rel="apple-touch-icon"][sizes="${icon.size}x${icon.size}"]`);
            if (!link) {
                link = document.createElement('link');
                link.rel = 'apple-touch-icon';
                link.sizes = `${icon.size}x${icon.size}`;
                document.head.appendChild(link);
            }
            link.href = icon.dataUrl;
        }
        
        // إضافة أيقونة رئيسية
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        const defaultIcon = generatedIcons.find(i => i.size === 192) || generatedIcons[0];
        if (defaultIcon) {
            favicon.href = defaultIcon.dataUrl;
        }
        
        console.log('✅ تم إضافة الأيقونات إلى الصفحة');
    }
    
    // ==================== Service Worker Management ====================
    
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
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateToast();
                    }
                });
            });
            
            setInterval(() => registration.update(), 60 * 60 * 1000);
            return registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            return null;
        }
    }
    
    function showUpdateToast() {
        const toast = document.createElement('div');
        toast.className = 'update-toast';
        toast.innerHTML = `
            <div class="update-toast-content" style="position:fixed;bottom:20px;left:20px;right:20px;background:#2e7d32;color:white;padding:12px 20px;border-radius:50px;z-index:10001;display:flex;justify-content:space-between;align-items:center;">
                <span>🔄 تحديث جديد متاح!</span>
                <button id="updateNowBtn" style="background:white;color:#2e7d32;border:none;padding:5px 15px;border-radius:30px;cursor:pointer;">تحديث</button>
            </div>
        `;
        document.body.appendChild(toast);
        document.getElementById('updateNowBtn')?.addEventListener('click', () => location.reload());
        setTimeout(() => toast.remove(), 10000);
    }
    
    // ==================== Push Notifications ====================
    
    async function initPushNotifications() {
        if (!('Notification' in window) || !('PushManager' in window)) return false;
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
                return true;
            }
        } catch (error) {
            console.error(error);
        }
        return false;
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
            return subscription;
        } catch (error) {
            console.error('Failed to subscribe:', error);
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
                return true;
            }
        } catch (error) {}
        return false;
    }
    
    async function sendTestNotification() {
        if (swRegistration) {
            swRegistration.showNotification('🌿 موسوعة الأعشاب', {
                body: 'تم تحديث الموسوعة بإضافة أعشاب جديدة!',
                icon: generatedIcons.find(i => i.size === 192)?.dataUrl || '/icons/icon-192x192.png',
                badge: generatedIcons.find(i => i.size === 72)?.dataUrl,
                vibrate: [200, 100, 200],
                actions: [{ action: 'explore', title: 'استكشاف' }, { action: 'close', title: 'إغلاق' }]
            });
        }
    }
    
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
        return outputArray;
    }
    
    // ==================== Background Sync ====================
    
    async function registerBackgroundSync(tag = 'sync-herbs') {
        if (!swRegistration?.sync) return false;
        try {
            await swRegistration.sync.register(tag);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    function queueOfflineAction(action, data) {
        let queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        queue.push({ id: Date.now(), action, data, timestamp: new Date().toISOString() });
        localStorage.setItem('offline-queue', JSON.stringify(queue));
        if (navigator.onLine && swRegistration?.sync) registerBackgroundSync('sync-herbs');
    }
    
    async function processOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        if (queue.length === 0) return [];
        
        const failed = [];
        for (const item of queue) {
            try {
                if (item.action === 'save-herb') await window.saveHerbToDB?.(item.data);
                else if (item.action === 'delete-herb') await window.deleteHerb?.(item.data.herbId);
                else failed.push(item);
            } catch (error) {
                failed.push(item);
            }
        }
        localStorage.setItem('offline-queue', JSON.stringify(failed));
        return queue.filter(q => !failed.includes(q));
    }
    
    // ==================== Advanced Caching ====================
    
    async function clearAllCaches() {
        if (!('caches' in window)) return false;
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            return true;
        } catch (error) {
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
            info.push({ name, size: keys.length, urls: keys.map(req => req.url) });
        }
        return info;
    }
    
    async function prefetchAssets(urls) {
        if (!('caches' in window)) return;
        const cache = await caches.open('prefetch-v1');
        await cache.addAll(urls);
    }
    
    // ==================== Install Prompt ====================
    
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
            deferredPrompt = null;
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) installBtn.style.display = 'none';
        });
    }
    
    async function showInstallPrompt() {
        if (!deferredPrompt) {
            showManualInstallGuide();
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
    }
    
    function showManualInstallGuide() {
        const modal = document.getElementById('installGuideModal');
        if (modal) modal.classList.add('active');
    }
    
    // ==================== Web Share API ====================
    
    async function shareApp(title = 'موسوعة الأعشاب الطبية', text = 'استكشف فوائد وأضرار الأعشاب الطبية', url = window.location.href) {
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
            } catch (error) {
                if (error.name !== 'AbortError') fallbackCopyLink(url);
            }
        } else {
            fallbackCopyLink(url);
        }
    }
    
    async function fallbackCopyLink(url) {
        try {
            await navigator.clipboard.writeText(url);
            alert('تم نسخ رابط التطبيق');
        } catch (err) {
            alert('يمكنك مشاركة الرابط: ' + url);
        }
    }
    
    // ==================== Online/Offline Handling ====================
    
    function setupConnectivityHandling() {
        window.addEventListener('online', async () => {
            showConnectivityToast('تم استعادة الاتصال بالإنترنت', 'success');
            const results = await processOfflineQueue();
            if (results.length > 0) showConnectivityToast(`تمت مزامنة ${results.length} عملية`, 'info');
            if (window.forceFetchFromServer) window.forceFetchFromServer();
        });
        
        window.addEventListener('offline', () => {
            showConnectivityToast('لا يوجد اتصال بالإنترنت. سيتم حفظ التغييرات محلياً', 'warning');
        });
    }
    
    function showConnectivityToast(message, type = 'info') {
        const colors = { success: '#4caf50', warning: '#ff9800', error: '#c62828', info: '#2196f3' };
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `position:fixed;bottom:80px;left:20px;right:20px;background:${colors[type]};color:white;padding:12px 20px;border-radius:30px;text-align:center;z-index:9999;font-size:0.9rem;direction:rtl;font-family:'Cairo',sans-serif;`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // ==================== PWA Status ====================
    
    function getPWAStatus() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        return {
            isStandalone,
            isInstalled: deferredPrompt === null && isStandalone,
            serviceWorker: swRegistration ? 'registered' : 'not registered',
            notifications: Notification.permission,
            pushSubscribed: isSubscribed,
            online: navigator.onLine,
            iconsGenerated: generatedIcons.length > 0
        };
    }
    
    async function getDiagnostics() {
        const cacheInfo = await getCacheInfo();
        const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        return { ...getPWAStatus(), cacheSize: cacheInfo.length, offlineQueueSize: queue.length, userAgent: navigator.userAgent, timestamp: new Date().toISOString() };
    }
    
    // ==================== Initialization ====================
    
    async function init() {
        console.log('🚀 Initializing PWA Module with Auto-Generated Icons...');
        
        // توليد الأيقونات تلقائياً
        await generateAllIcons();
        addIconsToDOM();
        
        // تسجيل Service Worker
        await registerServiceWorker();
        
        // إعدادات PWA الأخرى
        setupInstallPrompt();
        setupConnectivityHandling();
        
        if (Notification.permission === 'granted') await initPushNotifications();
        
        if (window.matchMedia('(display-mode: standalone)').matches) {
            document.body.classList.add('pwa-mode');
            console.log('📱 Running as installed PWA');
        }
        
        setTimeout(() => prefetchAssets(['/', '/index.html', '/css/style.css', '/manifest.json']), 3000);
        
        console.log('✅ PWA Module initialized with', generatedIcons.length, 'auto-generated icons');
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
        generateAllIcons,
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

window.PWA = PWA;
