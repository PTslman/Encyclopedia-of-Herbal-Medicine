// ============================================
// مدير المزامنة - موسوعة الأعشاب الطبية
// ============================================

const SyncManager = (function() {
    'use strict';
    
    // ========== المتغيرات الخاصة ==========
    let isSyncing = false;
    let lastSyncTime = null;
    let syncListeners = [];
    
    // ========== دوال مساعدة خاصة ==========
    
    function showMessage(message, type = 'info') {
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2e7d32',
            sync: '#2196f3'
        };
        
        const toast = document.createElement('div');
        toast.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
            <i class="fas ${type === 'sync' ? 'fa-sync-alt fa-pulse' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>`;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 50px;
            z-index: 10001;
            font-family: 'Cairo', sans-serif;
            font-size: 0.85rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: fadeInUp 0.3s ease;
            direction: rtl;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function updateSyncButton(loading) {
        const syncBtn = document.getElementById('visitorForceSyncBtn');
        const refreshBtn = document.getElementById('refreshDataBtn');
        
        [syncBtn, refreshBtn].forEach(btn => {
            if (btn) {
                if (loading) {
                    btn.disabled = true;
                    btn.style.opacity = '0.6';
                    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري...';
                } else {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.innerHTML = btn.id === 'visitorForceSyncBtn' ? 
                        '<i class="fas fa-download"></i> تحديث البيانات' : 
                        '<i class="fas fa-sync-alt"></i> تحديث';
                }
            }
        });
    }
    
    function notifyListeners(status, data) {
        syncListeners.forEach(cb => cb(status, data));
    }
    
    // ========== الدوال العامة ==========
    
    // جلب البيانات من Firebase
    async function fetchData(showMessageToast = true) {
        if (isSyncing) {
            if (showMessageToast) showMessage('⚠️ جاري التحميل حالياً', 'warning');
            return false;
        }
        
        if (!navigator.onLine) {
            if (showMessageToast) showMessage('📡 لا يوجد اتصال بالإنترنت', 'warning');
            return false;
        }
        
        isSyncing = true;
        updateSyncButton(true);
        notifyListeners('start', null);
        
        if (showMessageToast) showMessage('🔄 جاري تحميل البيانات...', 'sync');
        
        try {
            const [categoriesSnap, herbsSnap] = await Promise.all([
                categoriesCol.get(),
                herbsCol.get()
            ]);
            
            const categories = [];
            categoriesSnap.forEach(doc => {
                categories.push({ id: doc.id, ...doc.data() });
            });
            
            const herbs = [];
            herbsSnap.forEach(doc => {
                herbs.push({ id: doc.id, ...doc.data() });
            });
            
            // حفظ في localStorage
            const cacheData = {
                categories: categories,
                herbs: herbs,
                timestamp: Date.now(),
                version: '3.0'
            };
            localStorage.setItem('herbal_cache_v3', JSON.stringify(cacheData));
            
            // تحديث المتغيرات العامة
            if (typeof window.categories !== 'undefined') window.categories = categories;
            if (typeof window.herbs !== 'undefined') window.herbs = herbs;
            
            // تحديث الواجهة
            if (typeof renderContent === 'function') renderContent();
            if (typeof updateHerbCount === 'function') updateHerbCount();
            
            lastSyncTime = Date.now();
            
            console.log(`✅ Sync complete: ${herbs.length} herbs, ${categories.length} categories`);
            if (showMessageToast) showMessage(`✅ تم التحميل (${herbs.length} عشبة)`, 'success');
            
            notifyListeners('success', { herbs: herbs.length, categories: categories.length });
            return true;
            
        } catch (error) {
            console.error('❌ Sync failed:', error);
            
            let errorMsg = error.message;
            if (error.code === 'permission-denied') {
                errorMsg = 'ليس لديك صلاحية الوصول';
            } else if (error.code === 'unavailable') {
                errorMsg = 'خدمة Firebase غير متاحة';
            }
            
            if (showMessageToast) showMessage(`❌ فشل التحميل: ${errorMsg}`, 'error');
            notifyListeners('error', { message: errorMsg });
            return false;
            
        } finally {
            isSyncing = false;
            updateSyncButton(false);
        }
    }
    
    // تحميل البيانات من الكاش المحلي فقط
    function loadFromCache() {
        try {
            const cached = localStorage.getItem('herbal_cache_v3');
            if (cached) {
                const data = JSON.parse(cached);
                if (data.categories && data.herbs) {
                    if (typeof window.categories !== 'undefined') window.categories = data.categories;
                    if (typeof window.herbs !== 'undefined') window.herbs = data.herbs;
                    if (typeof renderContent === 'function') renderContent();
                    if (typeof updateHerbCount === 'function') updateHerbCount();
                    console.log(`📦 Loaded from cache: ${data.herbs.length} herbs`);
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }
    
    // إضافة مستمع
    function addListener(callback) {
        syncListeners.push(callback);
    }
    
    // الحصول على الحالة
    function getStatus() {
        return {
            isSyncing: isSyncing,
            lastSync: lastSyncTime,
            lastSyncFormatted: lastSyncTime ? new Date(lastSyncTime).toLocaleString() : null,
            isOnline: navigator.onLine
        };
    }
    
    // المزامنة التلقائية
    function initAutoSync() {
        // عند تحميل الصفحة
        setTimeout(async () => {
            if (navigator.onLine) {
                const cached = localStorage.getItem('herbal_cache_v3');
                if (!cached) {
                    await fetchData(false);
                }
            }
        }, 2000);
        
        // عند عودة الاتصال
        window.addEventListener('online', () => {
            console.log('🌐 Online - auto syncing');
            fetchData(false);
        });
        
        // فحص دوري كل ساعة
        setInterval(() => {
            if (navigator.onLine && !isSyncing) {
                fetchData(false);
            }
        }, 60 * 60 * 1000);
    }
    
    // تهيئة الأزرار
    function initButtons() {
        const visitorBtn = document.getElementById('visitorForceSyncBtn');
        if (visitorBtn) {
            visitorBtn.addEventListener('click', () => fetchData(true));
        }
        
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => fetchData(true));
        }
    }
    
    // التهيئة الرئيسية
    function init() {
        console.log('🔄 SyncManager initializing...');
        initButtons();
        initAutoSync();
        
        // محاولة تحميل من الكاش أولاً
        loadFromCache();
        
        console.log('✅ SyncManager ready');
    }
    
    // ========== واجهة العامة ==========
    return {
        init: init,
        fetchData: fetchData,
        loadFromCache: loadFromCache,
        addListener: addListener,
        getStatus: getStatus,
        sync: fetchData
    };
})();

// ========== التشغيل ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SyncManager.init());
} else {
    SyncManager.init();
}

// تصدير للنطاق العام
window.SyncManager = SyncManager;
window.forceSyncData = () => SyncManager.fetchData(true);

console.log('✅ SyncManager loaded');
