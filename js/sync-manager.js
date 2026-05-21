// ============================================
// نظام المزامنة المنفصل - موسوعة الأعشاب الطبية
// مستقل عن app.js لتجنب التعارضات
// ============================================

(function() {
    'use strict';
    
    console.log('🔄 تهيئة نظام المزامنة المنفصل...');
    
    // ========== المتغيرات ==========
    let isSyncing = false;
    let lastSyncTime = null;
    
    // ========== دالة جلب البيانات من Firebase ==========
    async function fetchFromFirebase(showToast = false) {
        if (isSyncing) {
            console.log('⚠️ مزامنة قيد التقدم بالفعل');
            return false;
        }
        
        if (typeof herbsCol === 'undefined' || typeof categoriesCol === 'undefined') {
            console.error('❌ Firebase غير جاهز');
            if (showToast) showMessage('⚠️ Firebase قيد التحميل، حاول مرة أخرى', 'warning');
            return false;
        }
        
        if (!navigator.onLine) {
            if (showToast) showMessage('⚠️ لا يوجد اتصال بالإنترنت', 'warning');
            return false;
        }
        
        isSyncing = true;
        if (showToast) showMessage('🔄 جاري تحميل البيانات...', 'info');
        
        try {
            // مهلة 10 ثوانٍ
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('انتهت المهلة')), 10000)
            );
            
            const fetchPromise = Promise.all([
                categoriesCol.get(),
                herbsCol.get()
            ]);
            
            const [categoriesSnap, herbsSnap] = await Promise.race([fetchPromise, timeoutPromise]);
            
            const fbCategories = [];
            categoriesSnap.forEach(doc => {
                fbCategories.push({ id: doc.id, ...doc.data() });
            });
            
            const fbHerbs = [];
            herbsSnap.forEach(doc => {
                fbHerbs.push({ id: doc.id, ...doc.data() });
            });
            
            // حفظ في localStorage
            const cacheData = {
                categories: fbCategories,
                herbs: fbHerbs,
                timestamp: Date.now()
            };
            localStorage.setItem('herbal_cache_v3', JSON.stringify(cacheData));
            
            // تحديث المتغيرات العامة إذا كانت موجودة
            if (typeof window.categories !== 'undefined') window.categories = fbCategories;
            if (typeof window.herbs !== 'undefined') window.herbs = fbHerbs;
            
            // تحديث الواجهة إذا كانت الدالة موجودة
            if (typeof window.renderContent === 'function') window.renderContent();
            if (typeof window.updateHerbCount === 'function') window.updateHerbCount();
            
            lastSyncTime = Date.now();
            isSyncing = false;
            
            console.log(`✅ تم جلب ${fbHerbs.length} عشبة و ${fbCategories.length} تصنيف`);
            if (showToast) showMessage(`✅ تم التحميل (${fbHerbs.length} عشبة)`, 'success');
            
            return true;
            
        } catch (error) {
            console.error('❌ فشل التحميل:', error);
            isSyncing = false;
            if (showToast) showMessage('❌ فشل التحميل، تأكد من اتصالك بالإنترنت', 'error');
            return false;
        }
    }
    
    // ========== دالة عرض الرسائل ==========
    function showMessage(text, type = 'info') {
        const colors = {
            success: '#4caf50',
            warning: '#ff9800',
            error: '#f44336',
            info: '#2e7d32'
        };
        
        const toast = document.createElement('div');
        toast.textContent = text;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 50px;
            text-align: center;
            z-index: 10001;
            font-size: 0.85rem;
            font-family: 'Cairo', sans-serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: fadeInUp 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // ========== تهيئة الأزرار ==========
    function initButtons() {
        // زر التحديث في شريط الزائر
        const visitorSyncBtn = document.getElementById('visitorForceSyncBtn');
        if (visitorSyncBtn) {
            // إزالة أي مستمعات قديمة
            const newBtn = visitorSyncBtn.cloneNode(true);
            visitorSyncBtn.parentNode.replaceChild(newBtn, visitorSyncBtn);
            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const originalHTML = newBtn.innerHTML;
                newBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري...';
                newBtn.disabled = true;
                await fetchFromFirebase(true);
                newBtn.innerHTML = originalHTML;
                newBtn.disabled = false;
            });
            console.log('✅ زر تحديث البيانات (الزائر) جاهز');
        }
        
        // زر التحديث في شريط المسؤول
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            const newBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);
            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const originalHTML = newBtn.innerHTML;
                newBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري...';
                newBtn.disabled = true;
                await fetchFromFirebase(true);
                newBtn.innerHTML = originalHTML;
                newBtn.disabled = false;
            });
            console.log('✅ زر تحديث البيانات (المسؤول) جاهز');
        }
        
        // زر الفحص اليدوي للتحديثات (اختياري)
        const checkUpdateBtn = document.getElementById('checkUpdateBtn');
        if (checkUpdateBtn) {
            const newBtn = checkUpdateBtn.cloneNode(true);
            checkUpdateBtn.parentNode.replaceChild(newBtn, checkUpdateBtn);
            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await fetchFromFirebase(true);
            });
        }
    }
    
    // ========== تصدير الدوال للنطاق العام ==========
    window.SyncManager = {
        fetchData: fetchFromFirebase,
        getLastSyncTime: () => lastSyncTime,
        isSyncing: () => isSyncing
    };
    
    // ربط الدالة العالمية للاستخدام من أي مكان
    window.forceSyncData = fetchFromFirebase;
    
    // تهيئة الأزرار بعد تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initButtons);
    } else {
        initButtons();
    }
    
    // مزامنة تلقائية عند عودة الاتصال (بدون إزعاج المستخدم)
    window.addEventListener('online', () => {
        console.log('🟢 تم استعادة الاتصال - مزامنة تلقائية في الخلفية');
        fetchFromFirebase(false);
    });
    
    console.log('✅ نظام المزامنة المنفصل جاهز');
})();
