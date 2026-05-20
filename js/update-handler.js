// ============================================
// مدير التحديثات الديناميكية
// ============================================

const UpdateManager = {
  currentVersion: null,
  checkInterval: null,
  
  // تهيئة مدير التحديثات
  init: async function() {
    console.log('🔄 تهيئة مدير التحديثات...');
    await this.loadCurrentVersion();
    this.startPeriodicCheck();
    this.setupMessageListener();
  },
  
  // تحميل الإصدار الحالي
  loadCurrentVersion: async function() {
    try {
      const response = await fetch('/Encyclopedia-of-Herbal-Medicine/version.json?t=' + Date.now());
      this.currentVersion = await response.json();
      console.log('📦 الإصدار الحالي:', this.currentVersion.version);
    } catch (error) {
      console.error('فشل تحميل الإصدار:', error);
    }
  },
  
  // التحقق الدوري من التحديثات
  startPeriodicCheck: function() {
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, 30 * 60 * 1000); // كل 30 دقيقة
  },
  
  // التحقق من وجود تحديثات
  checkForUpdates: async function() {
    console.log('🔍 التحقق من وجود تحديثات...');
    
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
  
  // إظهار إشعار للمستخدم
  showUpdateNotification: function(newVersion) {
    // إظهار إشعار منبثق
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position:fixed;bottom:100px;left:20px;right:20px;background:linear-gradient(135deg,#2e7d32,#1b5e20);color:white;padding:15px 20px;border-radius:60px;z-index:10001;display:flex;justify-content:space-between;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,0.3);direction:rtl;animation:slideUp 0.3s ease;">
        <div>
          <strong>🔄 تحديث جديد متاح!</strong><br>
          <small>الإصدار ${newVersion.version}</small>
        </div>
        <div>
          <button id="updateNowBtn" style="background:#ffd700;color:#1b5e20;border:none;padding:8px 20px;border-radius:40px;cursor:pointer;font-weight:bold;margin-left:10px;">تحديث الآن</button>
          <button id="updateLaterBtn" style="background:transparent;color:#ffd700;border:1px solid #ffd700;padding:8px 15px;border-radius:40px;cursor:pointer;">لاحقاً</button>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    
    document.getElementById('updateNowBtn')?.addEventListener('click', () => {
      this.applyUpdate();
      notification.remove();
    });
    
    document.getElementById('updateLaterBtn')?.addEventListener('click', () => {
      notification.remove();
    });
    
    setTimeout(() => notification.remove(), 10000);
  },
  
  // تطبيق التحديث
  applyUpdate: async function() {
    console.log('🔄 جاري تطبيق التحديث...');
    
    // إظهار مؤشر تحميل
    const loader = document.createElement('div');
    loader.id = 'updateLoader';
    loader.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;direction:rtl;">
        <div style="background:white;padding:30px;border-radius:24px;text-align:center;">
          <div class="splash-spinner" style="width:40px;height:40px;margin:0 auto 15px;"></div>
          <h3>🔄 جاري تحديث التطبيق...</h3>
          <p style="margin-top:10px;">الرجاء الانتظار</p>
        </div>
      </div>
    `;
    document.body.appendChild(loader);
    
    // إرسال طلب تحديث إلى Service Worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SKIP_WAITING'
      });
    }
    
    // إعادة تحميل الصفحة بعد لحظات
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  },
  
  // إعداد مستمع الرسائل من Service Worker
  setupMessageListener: function() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        console.log('📢 استلام إشعار تحديث من Service Worker');
        this.showUpdateNotification(event.data);
      }
    });
  },
  
  // التحقق اليدوي (زر التحديث)
  manualCheck: function() {
    this.checkForUpdates();
  }
};

// تهيئة مدير التحديثات عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UpdateManager.init());
} else {
  UpdateManager.init();
}

// إضافة الوظيفة للنطاق العام
window.UpdateManager = UpdateManager;
