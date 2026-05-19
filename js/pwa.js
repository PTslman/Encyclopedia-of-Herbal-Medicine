// ============================================
// PWA Manager - Android Only
// موسوعة الأعشاب الطبية
// ============================================

const PWA = (function() {
  let deferredPrompt = null;
  let swRegistration = null;
  
  // تسجيل Service Worker
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      swRegistration = registration;
      console.log('✅ Service Worker registered');
      return registration;
    } catch (error) {
      console.error('❌ Service Worker failed:', error);
      return null;
    }
  }
  
  // إعداد طلب التثبيت
  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('✅ Install prompt ready');
      
      // إظهار زر التثبيت
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
      if (installBtn) installBtn.style.display = 'none';
      
      // رسالة ترحيب
      setTimeout(() => {
        alert('🎉 شكراً لتثبيت موسوعة الأعشاب الطبية!\nيمكنك الآن استخدام التطبيق من شاشة التطبيقات.');
      }, 1000);
    });
  }
  
  // إظهار طلب التثبيت
  async function showInstallPrompt() {
    if (!deferredPrompt) {
      showManualInstallGuide();
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Install outcome: ${outcome}`);
    deferredPrompt = null;
  }
  
  // دليل التثبيت اليدوي
  function showManualInstallGuide() {
    const modal = document.getElementById('installGuideModal');
    if (modal) modal.classList.add('active');
  }
  
  // طلب الإشعارات
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      alert('الإشعارات غير مدعومة');
      return false;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('✅ تم تفعيل الإشعارات');
      return true;
    } else {
      alert('⚠️ لم يتم تفعيل الإشعارات');
      return false;
    }
  }
  
  // إشعار تجريبي
  async function sendTestNotification() {
    if (!swRegistration) {
      alert('جاري تجهيز الخدمة... حاول مرة أخرى');
      return;
    }
    
    swRegistration.showNotification('🌿 موسوعة الأعشاب الطبية', {
      body: 'مرحباً بك! استكشف فوائد الأعشاب',
      icon: '/icons/icon-192.png',
      vibrate: [200, 100, 200]
    });
  }
  
  // الحالة
  function getStatus() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return {
      isInstalled: isStandalone,
      serviceWorker: swRegistration ? '✅' : '❌',
      notifications: Notification.permission,
      online: navigator.onLine
    };
  }
  
  // التهيئة
  async function init() {
    console.log('🚀 Initializing Android PWA...');
    await registerServiceWorker();
    setupInstallPrompt();
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      document.body.classList.add('pwa-mode');
      console.log('📱 Running as installed Android app');
    }
    
    console.log('✅ Android PWA ready');
  }
  
  return {
    init,
    showInstallPrompt,
    requestNotificationPermission,
    sendTestNotification,
    getStatus
  };
})();

// التشغيل
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PWA.init());
} else {
  PWA.init();
}

window.PWA = PWA;
