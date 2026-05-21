// ============================================
// مدير المزامنة - Supabase
// موسوعة الأعشاب الطبية
// ============================================

const SyncManager = (function() {
    'use strict';
    
    // ========== المتغيرات الخاصة ==========
    let isSyncing = false;
    let lastSyncTime = null;
    let syncListeners = [];
    let autoSyncInterval = null;
    let onlineStatus = navigator.onLine;
    
    // إعدادات المزامنة
    const SYNC_INTERVAL = 30 * 60 * 1000; // 30 دقيقة
    const KEEP_ALIVE_INTERVAL = 24 * 60 * 60 * 1000; // 24 ساعة - منع إيقاف Supabase
    
    // ========== دوال مساعدة خاصة ==========
    
    // عرض رسالة للمستخدم
    function showMessage(message, type = 'info') {
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2e7d32',
            sync: '#2196f3'
        };
        
        // إزالة أي رسالة سابقة
        const oldToast = document.querySelector('.sync-toast');
        if (oldToast) oldToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'sync-toast';
        toast.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;">
                <i class="fas ${type === 'sync' ? 'fa-sync-alt fa-pulse' : type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 14px 20px;
            border-radius: 60px;
            z-index: 10001;
            font-family: 'Cairo', sans-serif;
            font-size: 0.85rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
            animation: slideUp 0.3s ease;
            direction: rtl;
            backdrop-filter: blur(10px);
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(50px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // تحديث شريط التقدم
    function updateProgressBar(percent, status) {
        const fill = document.getElementById('syncProgressFill');
        const percentSpan = document.getElementById('syncProgressPercent');
        const statusSpan = document.getElementById('syncStatusText');
        
        if (fill) {
            fill.style.width = Math.min(percent, 100) + '%';
            if (percent >= 100) {
                fill.style.background = '#4caf50';
                setTimeout(() => {
                    if (fill) fill.style.width = '0%';
                    if (percentSpan) percentSpan.innerText = '0%';
                }, 2000);
            } else if (percent >= 50) {
                fill.style.background = 'linear-gradient(90deg, #2e7d32, #ffd700)';
            } else {
                fill.style.background = 'linear-gradient(90deg, #2e7d32, #4caf50)';
            }
        }
        if (percentSpan) percentSpan.innerText = Math.floor(percent) + '%';
        if (statusSpan) statusSpan.innerText = status || (percent >= 100 ? '✅ مزامن' : '🔄 جاري...');
    }
    
    // تحديث حالة زر التحديث
    function updateButtonState(loading) {
        const syncBtn = document.getElementById('visitorForceSyncBtn');
        const refreshBtn = document.getElementById('refreshDataBtn');
        
        [syncBtn, refreshBtn].forEach(btn => {
            if (btn) {
                if (loading) {
                    btn.disabled = true;
                    btn.style.opacity = '0.6';
                    btn.style.cursor = 'wait';
                    const originalHtml = btn.innerHTML;
                    btn.setAttribute('data-original', originalHtml);
                    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري...';
                } else {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    const original = btn.getAttribute('data-original');
                    if (original) {
                        btn.innerHTML = original;
                    } else {
                        btn.innerHTML = btn.id === 'visitorForceSyncBtn' ? 
                            '<i class="fas fa-sync-alt"></i> تحديث البيانات' : 
                            '<i class="fas fa-sync-alt"></i> تحديث';
                    }
                }
            }
        });
    }
    
    // تحديث مؤشر LED
    function updateLedStatus() {
        const led = document.getElementById('syncStatusLed');
        if (!led) return;
        
        if (!navigator.onLine) {
            led.className = 'sync-status-led disconnected';
            led.title = 'غير متصل بالإنترنت';
        } else if (isSyncing) {
            led.className = 'sync-status-led syncing';
            led.title = 'جاري المزامنة...';
        } else {
            led.className = 'sync-status-led connected';
            led.title = 'متصل ومزامن';
        }
    }
    
    // إشعار المستمعين
    function notifyListeners(status, data) {
        syncListeners.forEach(cb => {
            try {
                cb(status, data);
            } catch(e) {}
        });
    }
    
    // منع إيقاف Supabase (Keep Alive)
    function keepSupabaseAlive() {
        if (window.supabaseClient && navigator.onLine) {
            console.log('🔄 Supabase keep-alive ping...');
            window.supabaseClient.from('categories').select('count', { count: 'exact', head: true })
                .then(() => console.log('✅ Keep-alive successful'))
                .catch(err => console.warn('⚠️ Keep-alive failed:', err.message));
        }
    }
    
    // ========== الدوال العامة ==========
    
    // جلب البيانات من Supabase
    async function fetchData(showToast = true) {
        if (isSyncing) {
            if (showToast) showMessage('⚠️ جاري التحميل حالياً', 'warning');
            return false;
        }
        
        if (!navigator.onLine) {
            if (showToast) showMessage('📡 لا يوجد اتصال بالإنترنت', 'warning');
            updateLedStatus();
            return false;
        }
        
        if (typeof window.getAllHerbs === 'undefined') {
            console.error('❌ Supabase client not ready');
            if (showToast) showMessage('❌ النظام غير جاهز، حاول مرة أخرى', 'error');
            return false;
        }
        
        isSyncing = true;
        updateButtonState(true);
        updateLedStatus();
        updateProgressBar(10, '🔄 جاري الاتصال...');
        notifyListeners('start', null);
        
        if (showToast) showMessage('🔄 جاري تحميل البيانات...', 'sync');
        
        const startTime = performance.now();
        
        try {
            // جلب التصنيفات
            updateProgressBar(20, '📡 جلب التصنيفات...');
            const categories = await window.getAllCategories();
            
            updateProgressBar(40, '📡 جلب الأعشاب...');
            const herbs = await window.getAllHerbs();
            
            updateProgressBar(70, '💾 حفظ البيانات...');
            
            // حفظ في localStorage
            const cacheData = {
                categories: categories,
                herbs: herbs,
                timestamp: Date.now(),
                version: '2.0'
            };
            localStorage.setItem('herbal_cache_v3', JSON.stringify(cacheData));
            
            // تحديث المتغيرات العامة
            if (typeof window.categories !== 'undefined') window.categories = categories;
            if (typeof window.herbs !== 'undefined') window.herbs = herbs;
            
            // تحديث الواجهة
            if (typeof renderContent === 'function') renderContent();
            if (typeof updateHerbCount === 'function') updateHerbCount();
            
            lastSyncTime = Date.now();
            const duration = ((performance.now() - startTime) / 1000).toFixed(1);
            
            console.log(`✅ Sync complete: ${herbs.length} herbs, ${categories.length} categories (${duration}s)`);
            updateProgressBar(100, '✅ مزامن');
            
            if (showToast) showMessage(`✅ تم التحميل (${herbs.length} عشبة)`, 'success');
            
            notifyListeners('success', { herbs: herbs.length, categories: categories.length, duration });
            return true;
            
        } catch (error) {
            console.error('❌ Sync failed:', error);
            updateProgressBar(0, '❌ فشل');
            
            let errorMsg = 'حدث خطأ أثناء التحميل';
            if (error.message === 'Failed to fetch') {
                errorMsg = 'فشل الاتصال بالخادم';
            } else if (error.message.includes('JWT')) {
                errorMsg = 'خطأ في المصادقة';
            }
            
            if (showToast) showMessage(`❌ ${errorMsg}`, 'error');
            notifyListeners('error', { message: errorMsg });
            return false;
            
        } finally {
            isSyncing = false;
            updateButtonState(false);
            updateLedStatus();
            setTimeout(() => {
                if (!isSyncing) updateProgressBar(0, '✅ متصل');
            }, 2000);
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
                    console.log(`📦 Loaded from cache: ${data.herbs.length} herbs, ${data.categories.length} categories`);
                    
                    const age = Date.now() - data.timestamp;
                    const hours = Math.floor(age / (1000 * 60 * 60));
                    if (hours > 0) {
                        console.log(`📦 Cache age: ${hours} hours`);
                    }
                    return true;
                }
            }
        } catch (e) {
            console.warn('Failed to load cache:', e);
        }
        return false;
    }
    
    // مسح الكاش
    function clearCache() {
        localStorage.removeItem('herbal_cache_v3');
        showMessage('🗑️ تم مسح الكاش', 'success');
        console.log('🗑️ Cache cleared');
    }
    
    // إضافة مستمع
    function addListener(callback) {
        syncListeners.push(callback);
    }
    
    // الحصول على حالة المزامنة
    function getStatus() {
        return {
            isSyncing: isSyncing,
            lastSync: lastSyncTime,
            lastSyncFormatted: lastSyncTime ? new Date(lastSyncTime).toLocaleString('ar-EG') : null,
            isOnline: navigator.onLine
        };
    }
    
    // بدء المزامنة التلقائية
    function startAutoSync() {
        if (autoSyncInterval) clearInterval(autoSyncInterval);
        
        autoSyncInterval = setInterval(() => {
            if (navigator.onLine && !isSyncing) {
                console.log('🔄 Auto-sync triggered');
                fetchData(false);
            }
        }, SYNC_INTERVAL);
        
        console.log(`✅ Auto-sync enabled (every ${SYNC_INTERVAL / 60000} minutes)`);
    }
    
    // إعداد مستمعي الأحداث
    function setupEventListeners() {
        // عند عودة الاتصال
        window.addEventListener('online', () => {
            onlineStatus = true;
            console.log('🌐 Online - auto syncing');
            updateLedStatus();
            fetchData(false);
        });
        
        // عند فقدان الاتصال
        window.addEventListener('offline', () => {
            onlineStatus = false;
            console.log('📡 Offline');
            updateLedStatus();
            if (!loadFromCache()) {
                showMessage('⚠️ لا يوجد اتصال بالإنترنت ولا بيانات مخزنة', 'warning');
            }
        });
        
        // منع إيقاف Supabase (Keep Alive)
        setInterval(() => {
            keepSupabaseAlive();
        }, KEEP_ALIVE_INTERVAL);
        
        // أول ping بعد 5 ثوانٍ
        setTimeout(() => keepSupabaseAlive(), 5000);
    }
    
    // إعداد الأزرار
    function setupButtons() {
        // زر التحديث في شريط الزائر
        const visitorSyncBtn = document.getElementById('visitorForceSyncBtn');
        if (visitorSyncBtn) {
            const newBtn = visitorSyncBtn.cloneNode(true);
            visitorSyncBtn.parentNode.replaceChild(newBtn, visitorSyncBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                fetchData(true);
            });
            console.log('✅ زر تحديث البيانات (الزائر) جاهز');
        }
        
        // زر التحديث في شريط المسؤول
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            const newBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                fetchData(true);
            });
            console.log('✅ زر التحديث (المسؤول) جاهز');
        }
        
        // زر إعادة المزامنة
        const resyncBtn = document.getElementById('visitorResyncBtn');
        if (resyncBtn) {
            const newBtn = resyncBtn.cloneNode(true);
            resyncBtn.parentNode.replaceChild(newBtn, resyncBtn);
            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                showMessage('🔄 إعادة مزامنة كاملة...', 'sync');
                clearCache();
                await fetchData(true);
            });
            console.log('✅ زر إعادة المزامنة جاهز');
        }
    }
    
    // التهيئة الرئيسية
    async function init() {
        console.log('🔄 SyncManager initializing...');
        
        // تحميل من الكاش أولاً
        const hasCache = loadFromCache();
        if (!hasCache && navigator.onLine) {
            console.log('📦 No cache available, fetching fresh data...');
            await fetchData(false);
        } else if (hasCache && navigator.onLine) {
            // تحديث في الخلفية
            setTimeout(() => fetchData(false), 2000);
        }
        
        // إعداد المكونات
        setupButtons();
        setupEventListeners();
        startAutoSync();
        updateLedStatus();
        
        console.log('✅ SyncManager ready');
    }
    
    // ========== الواجهة العامة ==========
    return {
        init: init,
        fetchData: fetchData,
        loadFromCache: loadFromCache,
        clearCache: clearCache,
        addListener: addListener,
        getStatus: getStatus,
        isSyncing: () => isSyncing
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
window.clearSyncCache = () => SyncManager.clearCache();

console.log('✅ SyncManager loaded');
