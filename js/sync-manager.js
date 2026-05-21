// =====================================================
// مدير المزامنة - Firebase
// متوافق مع كود التطبيق الأصلي
// =====================================================

const SyncManager = (function() {
    'use strict';
    
    let isSyncing = false;
    let syncCallbacks = [];
    
    // ========== جلب البيانات من Firebase ==========
    async function fetchData(showToast = true) {
        if (isSyncing) {
            console.log('⚠️ المزامنة قيد التقدم بالفعل');
            return false;
        }
        
        if (!navigator.onLine) {
            if (showToast) showMessage('⚠️ لا يوجد اتصال بالإنترنت', 'warning');
            return false;
        }
        
        isSyncing = true;
        showProgress(10, 'جاري المزامنة...');
        
        try {
            // استخدام الدوال الموجودة في التطبيق الأصلي
            if (typeof forceFetchFromServer === 'function') {
                const result = await forceFetchFromServer();
                if (result) {
                    console.log('✅ تمت المزامنة بنجاح');
                    if (showToast) showMessage('✅ تم مزامنة البيانات بنجاح', 'success');
                    notifyCallbacks(true);
                    return true;
                } else {
                    throw new Error('فشلت المزامنة');
                }
            } 
            // بديل: جلب البيانات مباشرة من Firebase
            else if (typeof herbsCol !== 'undefined' && typeof categoriesCol !== 'undefined') {
                const [catsSnap, herbsSnap] = await Promise.all([
                    categoriesCol.orderBy("name").get(),
                    herbsCol.get()
                ]);
                
                const categories = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const herbs = herbsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // تحديث المتغيرات العامة
                if (typeof window.categories !== 'undefined') window.categories = categories;
                if (typeof window.herbs !== 'undefined') window.herbs = herbs;
                if (typeof window.categories !== 'undefined') window.categories = categories;
                if (typeof window.herbs !== 'undefined') window.herbs = herbs;
                
                // حفظ في الكاش
                saveToCache(categories, herbs);
                
                // تحديث الواجهة
                if (typeof renderContent === 'function') renderContent();
                if (typeof updateHerbCount === 'function') updateHerbCount();
                
                console.log(`✅ Sync complete: ${herbs.length} herbs, ${categories.length} categories`);
                if (showToast) showMessage(`✅ تم التحميل (${herbs.length} عشبة)`, 'success');
                notifyCallbacks(true);
                return true;
            } else {
                throw new Error('Firebase غير مهيأ بشكل صحيح');
            }
            
        } catch (error) {
            console.error('❌ فشل المزامنة:', error);
            if (showToast) showMessage('❌ فشل تحميل البيانات: ' + error.message, 'error');
            notifyCallbacks(false);
            return false;
        } finally {
            isSyncing = false;
            showProgress(100, 'اكتمل');
        }
    }
    
    // ========== حفظ البيانات في الكاش ==========
    function saveToCache(categories, herbs) {
        try {
            const cacheData = {
                categories: categories,
                herbs: herbs,
                timestamp: Date.now(),
                version: '5.0.0'
            };
            localStorage.setItem('herbal_cache_v3', JSON.stringify(cacheData));
            console.log('💾 تم حفظ البيانات في الكاش');
            return true;
        } catch (e) {
            console.warn('فشل حفظ الكاش:', e);
            return false;
        }
    }
    
    // ========== تحميل البيانات من الكاش ==========
    function loadFromCache() {
        try {
            const cached = localStorage.getItem('herbal_cache_v3');
            if (cached) {
                const data = JSON.parse(cached);
                if (data.categories && data.herbs && data.categories.length > 0) {
                    // تحديث المتغيرات العامة
                    if (typeof window.categories !== 'undefined') window.categories = data.categories;
                    if (typeof window.herbs !== 'undefined') window.herbs = data.herbs;
                    
                    // تحديث الواجهة
                    if (typeof renderContent === 'function') renderContent();
                    if (typeof updateHerbCount === 'function') updateHerbCount();
                    
                    const age = Date.now() - (data.timestamp || 0);
                    const ageHours = Math.floor(age / (1000 * 60 * 60));
                    console.log(`📦 Loaded from cache: ${data.herbs.length} herbs, ${data.categories.length} categories (${ageHours} hours old)`);
                    
                    // إظهار معلومات للمستخدم
                    if (ageHours > 24) {
                        showMessage(`📦 بيانات مخزنة من ${ageHours} ساعة. يُفضل تحديث البيانات`, 'info');
                    }
                    
                    return true;
                } else if (data.herbs && data.herbs.length > 0) {
                    // حتى لو كانت التصنيفات فارغة
                    if (typeof window.herbs !== 'undefined') window.herbs = data.herbs;
                    if (typeof renderContent === 'function') renderContent();
                    if (typeof updateHerbCount === 'function') updateHerbCount();
                    console.log(`📦 Loaded ${data.herbs.length} herbs from cache (no categories)`);
                    return true;
                }
            }
        } catch (e) {
            console.warn('Failed to load cache:', e);
        }
        return false;
    }
    
    // ========== مسح الكاش ==========
    function clearCache() {
        try {
            localStorage.removeItem('herbal_cache_v3');
            localStorage.removeItem('herbal_cache_v2');
            localStorage.removeItem('herbal_cache_v1');
            
            // مسح كاش Service Worker إذا أمكن
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        if (name.includes('herbal')) {
                            caches.delete(name);
                        }
                    });
                });
            }
            
            showMessage('🗑️ تم مسح الكاش بنجاح', 'success');
            console.log('🗑️ Cache cleared successfully');
            return true;
        } catch (e) {
            console.error('Failed to clear cache:', e);
            showMessage('❌ فشل مسح الكاش', 'error');
            return false;
        }
    }
    
    // ========== الحصول على معلومات الكاش ==========
    function getCacheInfo() {
        try {
            const cached = localStorage.getItem('herbal_cache_v3');
            if (cached) {
                const data = JSON.parse(cached);
                return {
                    hasCache: true,
                    herbsCount: data.herbs?.length || 0,
                    categoriesCount: data.categories?.length || 0,
                    timestamp: data.timestamp,
                    date: new Date(data.timestamp).toLocaleString('ar-EG'),
                    age: Date.now() - (data.timestamp || 0),
                    version: data.version || 'unknown'
                };
            }
        } catch (e) {}
        return { hasCache: false };
    }
    
    // ========== عرض رسالة للمستخدم ==========
    function showMessage(msg, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(msg, type);
        } else if (typeof alert === 'function') {
            alert(msg);
        } else {
            console.log(`[${type}] ${msg}`);
        }
    }
    
    // ========== عرض تقدم المزامنة ==========
    function showProgress(percent, status) {
        if (typeof updateProgress === 'function') {
            updateProgress(percent, 'مزامنة', status);
        } else if (typeof showInlineProgress === 'function') {
            showInlineProgress();
            if (typeof updateProgressValue === 'function') {
                updateProgressValue(percent);
            }
        }
    }
    
    // ========== تسجيل ردود النداء ==========
    function onSyncComplete(callback) {
        if (typeof callback === 'function') {
            syncCallbacks.push(callback);
        }
    }
    
    function notifyCallbacks(success) {
        syncCallbacks.forEach(callback => {
            try {
                callback(success);
            } catch(e) {
                console.error('Callback error:', e);
            }
        });
    }
    
    // ========== المزامنة التلقائية ==========
    let autoSyncInterval = null;
    
    function startAutoSync(intervalMinutes = 30) {
        if (autoSyncInterval) clearInterval(autoSyncInterval);
        
        autoSyncInterval = setInterval(() => {
            if (navigator.onLine && !isSyncing) {
                console.log('🔄 Auto-sync triggered');
                fetchData(false);
            }
        }, intervalMinutes * 60 * 1000);
        
        console.log(`✅ Auto-sync started (every ${intervalMinutes} minutes)`);
    }
    
    function stopAutoSync() {
        if (autoSyncInterval) {
            clearInterval(autoSyncInterval);
            autoSyncInterval = null;
            console.log('⏹️ Auto-sync stopped');
        }
    }
    
    // ========== مراقبة الاتصال ==========
    function setupConnectionMonitor() {
        window.addEventListener('online', () => {
            console.log('🌐 Connection restored, syncing...');
            showMessage('🌐 تم استعادة الاتصال، جاري المزامنة...', 'success');
            setTimeout(() => fetchData(false), 1000);
        });
        
        window.addEventListener('offline', () => {
            console.log('📴 Connection lost');
            showMessage('📴 لا يوجد اتصال بالإنترنت - يتم عرض البيانات المخزنة', 'warning');
        });
    }
    
    // ========== التهيئة ==========
    async function init() {
        console.log('🔄 SyncManager initializing (Firebase mode)...');
        
        // تحميل من الكاش أولاً
        const hasCache = loadFromCache();
        
        // إذا كان هناك اتصال، حاول المزامنة
        if (navigator.onLine) {
            if (hasCache) {
                // تحديث في الخلفية بعد 2 ثانية
                setTimeout(() => fetchData(false), 2000);
            } else {
                // لا يوجد كاش، جلب فوري
                await fetchData(true);
            }
        } else if (!hasCache) {
            showMessage('⚠️ لا يوجد اتصال ولا بيانات مخزنة', 'warning');
        }
        
        // إعداد المراقبة
        setupConnectionMonitor();
        
        // بدء المزامنة التلقائية
        startAutoSync(30);
        
        console.log('✅ SyncManager ready (Firebase mode)');
    }
    
    // ========== إعادة ضبط المزامنة ==========
    async function resetAndSync() {
        stopAutoSync();
        clearCache();
        
        if (navigator.onLine) {
            showMessage('🔄 جاري إعادة تهيئة المزامنة...', 'info');
            const result = await fetchData(true);
            startAutoSync(30);
            return result;
        } else {
            showMessage('⚠️ لا يوجد اتصال بالإنترنت', 'warning');
            startAutoSync(30);
            return false;
        }
    }
    
    // ========== تصدير البيانات ==========
    function exportData() {
        const cacheInfo = getCacheInfo();
        if (!cacheInfo.hasCache) {
            showMessage('⚠️ لا توجد بيانات للتصدير', 'warning');
            return;
        }
        
        try {
            const cached = localStorage.getItem('herbal_cache_v3');
            if (cached) {
                const data = JSON.parse(cached);
                const exportData = {
                    exportDate: new Date().toISOString(),
                    version: data.version || '5.0.0',
                    categories: data.categories,
                    herbs: data.herbs,
                    stats: {
                        herbsCount: data.herbs?.length || 0,
                        categoriesCount: data.categories?.length || 0
                    }
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `herbal_export_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                showMessage('✅ تم تصدير البيانات بنجاح', 'success');
            }
        } catch (e) {
            console.error('Export failed:', e);
            showMessage('❌ فشل تصدير البيانات', 'error');
        }
    }
    
    // ========== الواجهة العامة ==========
    return {
        init: init,
        fetchData: fetchData,
        loadFromCache: loadFromCache,
        clearCache: clearCache,
        getCacheInfo: getCacheInfo,
        startAutoSync: startAutoSync,
        stopAutoSync: stopAutoSync,
        resetAndSync: resetAndSync,
        exportData: exportData,
        onSyncComplete: onSyncComplete,
        isSyncing: () => isSyncing
    };
})();

// ========== التهيئة التلقائية ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SyncManager.init());
} else {
    // تأخير بسيط للسماح بتحميل Firebase أولاً
    setTimeout(() => SyncManager.init(), 500);
}

// ========== تصدير للاستخدام العام ==========
window.SyncManager = SyncManager;
window.forceSyncData = () => SyncManager.fetchData(true);
window.clearAllCache = () => SyncManager.clearCache();
window.resetSync = () => SyncManager.resetAndSync();

console.log('📦 sync-manager.js loaded (Firebase mode)');
