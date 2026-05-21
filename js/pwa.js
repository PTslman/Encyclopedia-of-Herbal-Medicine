// =====================================================
// PWA Manager - موسوعة الأعشاب الطبية
// =====================================================

(function() {
    'use strict';
    
    let deferredPrompt = null;
    
    // تسجيل Service Worker
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker not supported');
            return false;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/Encyclopedia-of-Herbal-Medicine/sw.js');
            console.log('✅ Service Worker registered');
            return true;
        } catch (error) {
            console.error('❌ Service Worker failed:', error);
            return false;
        }
    }
    
    // إعداد طلب التثبيت
    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('✅ App can be installed');
            
            // إظهار زر التثبيت
            showInstallButton();
        });
    }
    
    function showInstallButton() {
        const btn = document.createElement('button');
        btn.id = 'pwaInstallBtn';
        btn.innerHTML = '<i class="fas fa-download"></i> تثبيت التطبيق';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2e7d32;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 50px;
            z-index: 10001;
            font-family: 'Cairo', sans-serif;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        
        btn.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`Install prompt outcome: ${outcome}`);
                deferredPrompt = null;
                btn.remove();
            }
        };
        
        document.body.appendChild(btn);
        
        setTimeout(() => btn.remove(), 10000);
    }
    
    // مشاركة التطبيق
    async function shareApp() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'موسوعة الأعشاب الطبية',
                    text: 'استكشف فوائد وأضرار الأعشاب الطبية',
                    url: window.location.href
                });
                console.log('✅ Shared successfully');
            } catch (error) {
                console.log('Share cancelled or failed');
            }
        } else {
            await navigator.clipboard.writeText(window.location.href);
            alert('✅ تم نسخ الرابط');
        }
    }
    
    // التهيئة
    async function init() {
        console.log('🚀 PWA Manager initializing');
        await registerServiceWorker();
        setupInstallPrompt();
        
        // إضافة زر المشاركة في شريط الزوار
        const shareBtn = document.getElementById('shareAppBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', shareApp);
        }
        
        console.log('✅ PWA Manager ready');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.PWA = { shareApp, registerServiceWorker };
})();
