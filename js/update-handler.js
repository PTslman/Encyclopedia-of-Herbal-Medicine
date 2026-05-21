// =====================================================
// مدير التحديثات - متوافق مع Firebase
// =====================================================

const UpdateManager = {
    currentVersion: null,
    updateCheckInterval: null,
    updateCallbacks: [],
    
    init: function() {
        console.log('🔄 Update Manager initialized (Firebase mode)');
        
        // تحميل الإصدار الحالي من localStorage
        this.currentVersion = localStorage.getItem('herbal_app_version');
        
        // التحقق من التحديثات فوراً
        this.checkForUpdates();
        
        // التحقق كل 30 دقيقة
        this.updateCheckInterval = setInterval(() => this.checkForUpdates(), 30 * 60 * 1000);
        
        // الاستماع لرسائل Service Worker
        this.listenForSWMessages();
    },
    
    listenForSWMessages: function() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                const { type, version, message } = event.data || {};
                
                if (type === 'UPDATE_AVAILABLE') {
                    console.log('🆕 Update notification from SW:', version);
                    this.showUpdateNotification({ version: version, message: message });
                } else if (type === 'SW_ACTIVATED') {
                    console.log('✅ Service Worker activated:', version);
                }
            });
        }
    },
    
    checkForUpdates: async function() {
        try {
            // محاولة جلب version.json من المسار النسبي
            const response = await fetch('./version.json?t=' + Date.now(), {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const newVersion = await response.json();
            console.log('📦 Version check:', newVersion.version);
            
            // التحقق من وجود تحديث
            const cachedHash = localStorage.getItem('herbal_version_hash');
            const cachedVersion = localStorage.getItem('herbal_app_version');
            
            if (cachedHash !== newVersion.hash) {
                console.log('🆕 Update available:', {
                    old: cachedVersion,
                    new: newVersion.version,
                    hash: newVersion.hash
                });
                
                this.showUpdateNotification(newVersion);
                localStorage.setItem('herbal_version_hash', newVersion.hash);
                localStorage.setItem('herbal_app_version', newVersion.version);
                this.currentVersion = newVersion.version;
                
                // تنبيه المستمعين
                this.notifyCallbacks(true, newVersion);
            } else {
                console.log('✅ No updates available (current:', cachedVersion || 'unknown', ')');
            }
            
            return { hasUpdate: cachedHash !== newVersion.hash, version: newVersion };
            
        } catch (error) {
            console.error('❌ Update check failed:', error);
            this.notifyCallbacks(false, null);
            return { hasUpdate: false, error: error.message };
        }
    },
    
    showUpdateNotification: function(versionData) {
        // تجنب إنشاء إشعارات متعددة
        if (document.querySelector('.update-notification')) return;
        
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, #2e7d32, #1b5e20);
            color: white;
            padding: 14px 20px;
            border-radius: 60px;
            z-index: 10001;
            display: flex;
            justify-content: space-between;
            align-items: center;
            direction: rtl;
            gap: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            animation: slideUp 0.3s ease;
        `;
        
        // إضافة حركة slideUp إذا لم تكن موجودة
        if (!document.querySelector('#updateAnimationStyle')) {
            const style = document.createElement('style');
            style.id = 'updateAnimationStyle';
            style.textContent = `
                @keyframes slideUp {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideDown {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(100px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // إعداد محتوى الإشعار
        const changelogHtml = versionData.changelog && versionData.changelog.length 
            ? `<div style="font-size:11px;margin-top:4px;opacity:0.8;">✨ ${versionData.changelog[0].substring(0, 50)}${versionData.changelog[0].length > 50 ? '...' : ''}</div>`
            : '';
        
        notification.innerHTML = `
            <div style="display:flex;flex-direction:column;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-sync-alt fa-spin"></i>
                    <span style="font-weight:bold;">🆕 تحديث جديد متاح</span>
                    <span style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:30px;font-size:12px;">${versionData.version || '5.0.0'}</span>
                </div>
                ${changelogHtml}
            </div>
            <div style="display:flex;gap:10px;">
                <button id="updateLaterBtn" style="background:rgba(255,255,255,0.2);color:white;border:none;padding:6px 12px;border-radius:40px;cursor:pointer;">لاحقاً</button>
                <button id="updateNowBtn" style="background:#ffd700;color:#1b5e20;border:none;padding:6px 16px;border-radius:40px;cursor:pointer;font-weight:bold;">تحديث</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // أحداث الأزرار
        const updateNowBtn = document.getElementById('updateNowBtn');
        const updateLaterBtn = document.getElementById('updateLaterBtn');
        
        if (updateNowBtn) {
            updateNowBtn.addEventListener('click', () => {
                this.performUpdate();
                notification.style.animation = 'slideDown 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            });
        }
        
        if (updateLaterBtn) {
            updateLaterBtn.addEventListener('click', () => {
                notification.style.animation = 'slideDown 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            });
        }
        
        // إخفاء تلقائي بعد 30 ثانية
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideDown 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 30000);
        
        // عرض إشعار عبر Notification API إذا كان متاحاً
        this.showBrowserNotification(versionData);
    },
    
    showBrowserNotification: function(versionData) {
        if ('Notification' in window && Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification('🌿 تحديث جديد لموسوعة الأعشاب', {
                    body: `الإصدار ${versionData.version} متاح الآن مع تحسينات جديدة!`,
                    icon: 'icons/icon-192.png',
                    badge: 'icons/icon-72.png',
                    vibrate: [200, 100, 200],
                    tag: 'herbal-update',
                    data: { url: './' }
                });
            });
        }
    },
    
    performUpdate: function() {
        console.log('🔄 Performing update...');
        
        // محاولة تحديث Service Worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // مسح الكاش القديم
        if (typeof SyncManager !== 'undefined' && SyncManager.clearCache) {
            SyncManager.clearCache();
        } else {
            // مسح localStorage
            const keysToKeep = ['theme', 'fontSize', 'visitor', 'adminActionLog'];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!keysToKeep.includes(key) && !key.startsWith('herbal_version')) {
                    localStorage.removeItem(key);
                }
            }
        }
        
        // إعادة تحميل الصفحة
        setTimeout(() => {
            window.location.reload();
        }, 500);
    },
    
    forceCheck: function() {
        console.log('🔍 Force update check requested');
        return this.checkForUpdates();
    },
    
    getCurrentVersion: function() {
        return this.currentVersion || localStorage.getItem('herbal_app_version') || 'unknown';
    },
    
    onUpdateAvailable: function(callback) {
        if (typeof callback === 'function') {
            this.updateCallbacks.push(callback);
        }
    },
    
    notifyCallbacks: function(hasUpdate, versionData) {
        this.updateCallbacks.forEach(callback => {
            try {
                callback(hasUpdate, versionData);
            } catch(e) {
                console.error('Update callback error:', e);
            }
        });
    },
    
    stop: function() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
            console.log('⏹️ Update manager stopped');
        }
    },
    
    // التحقق من تحديث Service Worker
    checkSWUpdate: function() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) {
                    reg.update().then(() => {
                        console.log('🔄 SW update check completed');
                    }).catch(err => {
                        console.error('SW update failed:', err);
                    });
                }
            });
        }
    }
};

// ========== التهيئة التلقائية ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UpdateManager.init());
} else {
    setTimeout(() => UpdateManager.init(), 500);
}

// ========== تصدير للاستخدام العام ==========
window.UpdateManager = UpdateManager;
window.checkForAppUpdates = () => UpdateManager.forceCheck();
window.getAppVersion = () => UpdateManager.getCurrentVersion();

console.log('📦 update-handler.js loaded (Firebase mode)');
