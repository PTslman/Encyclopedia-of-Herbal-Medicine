// ============================================
// مدير المزامنة - موسوعة الأعشاب الطبية
// نسخة مبسطة ومستقرة
// ============================================

const SyncManager = (function() {
    'use strict';
    
    let isSyncing = false;
    
    function showMessage(message, type = 'info') {
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2e7d32'
        };
        
        const toast = document.createElement('div');
        toast.textContent = message;
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
            direction: rtl;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    async function fetchData(showToast = true) {
        if (isSyncing) {
            if (showToast) showMessage('⚠️ جاري التحميل حالياً', 'warning');
            return false;
        }
        
        if (!navigator.onLine) {
            if (showToast) showMessage('📡 لا يوجد اتصال بالإنترنت', 'warning');
            return false;
        }
        
        if (typeof herbsCol === 'undefined' || typeof categoriesCol === 'undefined') {
            console.error('Firebase not ready');
            if (showToast) showMessage('❌ Firebase غير جاهز', 'error');
            return false;
        }
        
        isSyncing = true;
        if (showToast) showMessage('🔄 جاري تحميل البيانات...', 'info');
        
        try {
            const [categoriesSnap, herbsSnap] = await Promise.all([
                categoriesCol.get(),
                herbsCol.get()
            ]);
            
            const categories = [];
            categoriesSnap.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));
            
            const herbs = [];
            herbsSnap.forEach(doc => herbs.push({ id: doc.id, ...doc.data() }));
            
            // حفظ في localStorage
            localStorage.setItem('herbal_cache_v3', JSON.stringify({
                categories: categories,
                herbs: herbs,
                timestamp: Date.now()
            }));
            
            // تحديث المتغيرات العامة
            window.categories = categories;
            window.herbs = herbs;
            
            // تحديث الواجهة
            if (typeof renderContent === 'function') renderContent();
            if (typeof updateHerbCount === 'function') updateHerbCount();
            
            console.log(`✅ تم جلب ${herbs.length} عشبة و ${categories.length} تصنيف`);
            if (showToast) showMessage(`✅ تم التحميل (${herbs.length} عشبة)`, 'success');
            return true;
            
        } catch (error) {
            console.error('❌ فشل التحميل:', error);
            if (showToast) showMessage(`❌ فشل التحميل: ${error.message}`, 'error');
            return false;
        } finally {
            isSyncing = false;
        }
    }
    
    function initButtons() {
        const syncBtn = document.getElementById('visitorForceSyncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => fetchData(true));
        }
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => fetchData(true));
        }
    }
    
    function init() {
        console.log('🔄 SyncManager initializing...');
        initButtons();
        
        // محاولة تحميل من الكاش أولاً
        const cached = localStorage.getItem('herbal_cache_v3');
        if (cached) {
            try {
                const data = JSON.parse(cached);
                window.categories = data.categories;
                window.herbs = data.herbs;
                if (typeof renderContent === 'function') renderContent();
                if (typeof updateHerbCount === 'function') updateHerbCount();
                console.log(`📦 تم تحميل ${data.herbs.length} عشبة من الكاش`);
            } catch(e) {}
        }
        
        console.log('✅ SyncManager ready');
    }
    
    return {
        init: init,
        fetchData: fetchData
    };
})();

// التشغيل
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SyncManager.init());
} else {
    SyncManager.init();
}

window.SyncManager = SyncManager;
window.forceSyncData = () => SyncManager.fetchData(true);
