// ============================================
// PWA Manager - تركيز على ظهور زر التثبيت
// ============================================

(function() {
    let deferredPrompt = null;
    
    // تسجيل Service Worker فوراً
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('✅ Service Worker registered:', reg);
            })
            .catch(err => {
                console.error('❌ Service Worker registration failed:', err);
            });
    }
    
    // الاستماع لحدث beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('✅ beforeinstallprompt event fired!');
        e.preventDefault();
        deferredPrompt = e;
        
        // إظهار زر التثبيت
        const installBtn = document.getElementById('installPwaBtn');
        if (installBtn) {
            installBtn.style.display = 'flex';
            installBtn.classList.add('show');
            console.log('✅ Install button shown');
            
            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`Install outcome: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            });
        }
    });
    
    // التأكد من عدم وجود أخطاء
    window.addEventListener('appinstalled', () => {
        console.log('✅ App installed successfully');
        const installBtn = document.getElementById('installPwaBtn');
        if (installBtn) installBtn.style.display = 'none';
    });
    
    // فحص حالة التثبيت الحالية
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ App is already installed and running in standalone mode');
        document.body.classList.add('pwa-mode');
    }
    
    console.log('✅ PWA Manager initialized');
})();
