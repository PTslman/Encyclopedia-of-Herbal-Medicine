// ============================================
// مدير التحديثات - إشعار للمستخدمين المثبتين
// ============================================

const UpdateManager = {
  currentVersion: null,
  updateCheckInterval: null,
  
  init: async function() {
    console.log('🔄 تهيئة مدير التحديثات...');
    await this.loadCurrentVersion();
    this.startPeriodicCheck();
    this.setupMessageListener();
    this.setupManualCheck();
  },
  
  loadCurrentVersion: async function() {
    try {
      const response = await fetch('/Encyclopedia-of-Herbal-Medicine/version.json?t=' + Date.now());
      this.currentVersion = await response.json();
      console.log('📦 الإصدار الحالي:', this.currentVersion.version);
    } catch (error) {
      console.error('فشل تحميل الإصدار:', error);
    }
  },
  
  startPeriodicCheck: function() {
    // فحص كل 5 دقائق
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, 5 * 60 * 1000);
  },
  
  checkForUpdates: async function() {
    try {
      const response = await fetch('/Encyclopedia-of-Herbal-Medicine/version.json?t=' + Date.now());
      const newVersion = await response.json();
      
      if (this.currentVersion && this.currentVersion.hash !== newVersion.hash) {
        console.log('🆕 تحديث جديد متاح!');
        this.showUpdateNotification(newVersion);
      }
    } catch (error) {
      console.error('فشل التحقق:', error);
    }
  },
  
  showUpdateNotification: function(newVersion) {
    // إظهار إشعار للمستخدم
    const notification = document.createElement('div');
    notification.id = 'updateNotification';
    notification.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#2e7d32,#1b5e20);color:white;padding:15px;text-align:center;z-index:20002;box-shadow:0 4px 15px rgba(0,0,0,0.3);direction:rtl;animation:slideDown 0.3s ease;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <strong>🔄 تحديث جديد متاح!</strong><br>
            <small>الإصدار ${newVersion.version}</small>
          </div>
          <div>
            <button id="updateNowBtn" style="background:#ffd700;color:#1b5e20;border:none;padding:8px 20px;border-radius:40px;cursor:pointer;font-weight:bold;margin-left:10px;">تحديث الآن</button>
            <button id="updateLaterBtn" style="background:transparent;color:#ffd700;border:1px solid #ffd700;padding:8px 15px;border-radius:40px;cursor:pointer;">لاحقاً</button>
          </div>
        </div>
      </div>
      <style>
        @keyframes slideDown {
          from { transform: translateY(-100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(notification);
    
    document.getElementById('updateNowBtn')?.addEventListener('click', () => {
      this.applyUpdate();
      notification.remove();
    });
    
    document.getElementById('updateLaterBtn')?.addEventListener('click', () => {
      notification.remove();
    });
    
    // إخفاء تلقائي بعد 30 ثانية
    setTimeout(() => {
      if (document.getElementById('updateNotification')) {
        notification.remove();
      }
    }, 30000);
  },
  
  applyUpdate: async function() {
    console.log('🔄 جاري تطبيق التحديث...');
    
    // إظهار مؤشر التحميل
    const loader = document.createElement('div');
    loader.id = 'updateLoader';
    loader.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;direction:rtl;">
        <div style="background:white;padding:30px;border-radius:24px;text-align:center;">
          <div class="splash-spinner" style="width:40px;height:40px;margin:0 auto 15px;"></div>
          <h3>🔄 جاري تحديث التطبيق...</h3>
          <p>الرجاء الانتظار</p>
        </div>
      </div>
    `;
    document.body.appendChild(loader);
    
    // مسح الكاش القديم
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // إعادة تحميل الصفحة
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  },
  
  setupMessageListener: function() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        console.log('📢 استلام إشعار تحديث من Service Worker');
        this.checkForUpdates();
      }
    });
  },
  
  setupManualCheck: function() {
    // إضافة زر تحديث يدوي في شريط الزائر
    const checkUpdateBtn = document.createElement('button');
    checkUpdateBtn.id = 'checkUpdateBtn';
    checkUpdateBtn.className = 'visitor-btn';
    checkUpdateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> فحص التحديثات';
    checkUpdateBtn.onclick = () => this.checkForUpdates();
    
    const visitorToolbar = document.querySelector('.visitor-toolbar');
    if (visitorToolbar && !document.getElementById('checkUpdateBtn')) {
      visitorToolbar.appendChild(checkUpdateBtn);
    }
  },
  
  manualCheck: function() {
    this.checkForUpdates();
  }
};

// تهيئة مدير التحديثات
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UpdateManager.init());
} else {
  UpdateManager.init();
}

window.UpdateManager = UpdateManager;
