// ============================================
// pwa.js - Progressive Web App Advanced Module (نسخة مصححة)
// ============================================

const PWA = (function() {
    let swRegistration = null;
    let deferredPrompt = null;
    
    // ==================== Service Worker Registration ====================
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker not supported');
            return null;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
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
            <div style="position:fixed;bottom:20px;left:20px;right:20px;background:#2e7d32;color:white;padding:12px 20px;border-radius:50px;z-index:10001;display:flex;justify-content:space-between;align-items:center;">
                <span>🔄 تحديث جديد متاح!</span>
                <button id="updateNowBtn" style="background:white;color:#2e7d32;border:none;padding:5px 15px;border-radius:30px;cursor:pointer;">تحديث</button>
            </div>
        `;
        document.body.appendChild(toast);
        document.getElementById('updateNowBtn')?.addEventListener('click', () => location.reload());
        setTimeout(() => toast.remove(), 10000);
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
        const closeBtn = document.getElementById('closeInstallGuideActBtn');
        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
        const closeX = document.getElementById('closeInstallGuideBtn');
        if (closeX) closeX.onclick = () => modal.classList.remove('active');
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
            online: navigator.onLine
        };
    }
    
    // ==================== Initialization ====================
    async function init() {
        console.log('🚀 Initializing PWA Module');
        await registerServiceWorker();
        setupInstallPrompt();
        setupConnectivityHandling();
        
        if (window.matchMedia('(display-mode: standalone)').matches) {
            document.body.classList.add('pwa-mode');
            console.log('📱 Running as installed PWA');
        }
        
        console.log('✅ PWA Module initialized');
    }
    
    // ==================== Public API ====================
    return {
        init,
        registerServiceWorker,
        showInstallPrompt,
        shareApp,
        getPWAStatus
    };
})();

// ==================== Auto-initialize on load ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWA.init());
} else {
    PWA.init();
}

window.PWA = PWA;
