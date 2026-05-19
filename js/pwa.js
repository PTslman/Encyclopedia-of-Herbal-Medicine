// ============================================
// PWA Manager - موسوعة الأعشاب الطبية
// إدارة التثبيت والإشعارات والتخزين المؤقت
// ============================================

const PWA = (function() {
  let swRegistration = null;
  let deferredPrompt = null;
  
  // أيقونات PWA - يتم توليدها تلقائياً
  const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
  
  // توليد أيقونة PNG من SVG
  async function generateIcon(size) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      // خلفية خضراء متدرجة
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#1b5e20');
      grad.addColorStop(1, '#2e7d32');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      
      // إطار ذهبي
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = size * 0.04;
      ctx.beginPath();
      ctx.arc(size/2, size/2, size * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      
      // رمز الورقة
      ctx.font = `${size * 0.5}px "Segoe UI Emoji"`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌿', size/2, size/2);
      
      // نص عربي
      ctx.font = `bold ${size * 0.12}px "Cairo"`;
      ctx.fillStyle = '#ffd700';
      ctx.fillText('موسوعة الأعشاب', size/2, size * 0.85);
      
      canvas.toBlob(blob => {
        resolve(URL.createObjectURL(blob));
      }, 'image/png');
    });
  }
  
  // توليد جميع الأيقونات وتحديث manifest
  async function generateAllIcons() {
    console.log('[PWA] Generating icons...');
    
    for (const size of ICON_SIZES) {
      const iconUrl = await generateIcon(size);
      // تخزين الأيقونة في IndexedDB أو localStorage
      localStorage.setItem(`icon_${size}`, iconUrl);
    }
    
    // تحديث manifest
    await updateManifest();
    console.log('[PWA] Icons generated successfully');
  }
  
  // تحديث manifest.json
  async function updateManifest() {
    const manifest = {
      name: "موسوعة الأعشاب الطبية",
      short_name: "أعشاب طبية",
      description: "موسوعة متكاملة للأعشاب الطبية",
      start_url: "/",
      display: "standalone",
      theme_color: "#2e7d32",
      background_color: "#fef9e6",
      orientation: "portrait",
      lang: "ar",
      dir: "rtl",
      icons: ICON_SIZES.map(size => ({
        src: localStorage.getItem(`icon_${size}`) || `/icons/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any maskable"
      }))
    };
    
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(manifestBlob);
    
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifestURL;
  }
  
  // تسجيل Service Worker
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker not supported');
      return null;
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRegistration = registration;
      console.log('[PWA] Service Worker registered:', registration);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
      return null;
    }
  }
  
  // إظهار إشعار التحديث
  function showUpdateToast() {
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="position:fixed;bottom:20px;left:20px;right:20px;background:#2e7d32;color:white;padding:12px 20px;border-radius:50px;z-index:10001;display:flex;justify-content:space-between;align-items:center;">
        <span>🔄 تحديث جديد متاح!</span>
        <button id="updateBtn" style="background:white;color:#2e7d32;border:none;padding:6px 16px;border-radius:30px;cursor:pointer;">تحديث</button>
      </div>
    `;
    document.body.appendChild(toast);
    document.getElementById('updateBtn')?.addEventListener('click', () => location.reload());
    setTimeout(() => toast.remove(), 10000);
  }
  
  // إعداد طلب التثبيت
  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('[PWA] Install prompt available');
      
      // يمكنك إظهار زر التثبيت هنا إذا أردت
      const installBtn = document.getElementById('installPwaBtn');
      if (installBtn) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', showInstallPrompt);
      }
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      deferredPrompt = null;
      const installBtn = document.getElementById('installPwaBtn');
      if (installBtn) installBtn.style.display = 'none';
      
      // إظهار رسالة ترحيب
      setTimeout(() => {
        alert('🎉 شكراً لتثبيت موسوعة الأعشاب الطبية!\nيمكنك الآن استخدام التطبيق بدون اتصال بالإنترنت.');
      }, 1000);
    });
  }
  
  // إظهار طلب التثبيت
  async function showInstallPrompt() {
    if (!deferredPrompt) {
      // عرض دليل التثبيت اليدوي
      const modal = document.getElementById('installGuideModal');
      if (modal) modal.classList.add('active');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    deferredPrompt = null;
  }
  
  // طلب إذن الإشعارات
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      alert('المتصفح لا يدعم الإشعارات');
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
  
  // إرسال إشعار تجريبي
  async function sendTestNotification() {
    if (!swRegistration) {
      alert('Service Worker غير جاهز');
      return;
    }
    
    swRegistration.showNotification('🌿 موسوعة الأعشاب الطبية', {
      body: 'مرحباً بك في الموسوعة! استكشف فوائد الأعشاب.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200]
    });
  }
  
  // الحصول على حالة PWA
  function getPWAStatus() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return {
      isInstalled: isStandalone,
      serviceWorker: swRegistration ? 'registered' : 'not registered',
      notifications: Notification.permission,
      online: navigator.onLine
    };
  }
  
  // تهيئة PWA
  async function init() {
    console.log('[PWA] Initializing...');
    
    // توليد الأيقونات
    await generateAllIcons();
    
    // تسجيل Service Worker
    await registerServiceWorker();
    
    // إعداد طلب التثبيت
    setupInstallPrompt();
    
    // إضافة class للتطبيق المثبت
    if (window.matchMedia('(display-mode: standalone)').matches) {
      document.body.classList.add('pwa-mode');
      console.log('[PWA] Running as installed app');
    }
    
    // فحص حالة الاتصال
    window.addEventListener('online', () => {
      console.log('[PWA] Online');
      if (swRegistration) swRegistration.update();
    });
    
    window.addEventListener('offline', () => {
      console.log('[PWA] Offline');
    });
    
    console.log('[PWA] Initialized successfully');
  }
  
  return {
    init,
    registerServiceWorker,
    generateAllIcons,
    requestNotificationPermission,
    sendTestNotification,
    showInstallPrompt,
    getPWAStatus
  };
})();

// التشغيل التلقائي
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PWA.init());
} else {
  PWA.init();
}

window.PWA = PWA;
