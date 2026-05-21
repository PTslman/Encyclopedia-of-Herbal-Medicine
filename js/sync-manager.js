// =====================================================
// مدير المزامنة - Supabase
// =====================================================

const SyncManager = (function() {
    'use strict';
    
    let isSyncing = false;
    
    async function fetchData(showToast = true) {
        if (isSyncing) return false;
        if (!navigator.onLine) {
            if (showToast) alert('⚠️ لا يوجد اتصال بالإنترنت');
            return false;
        }
        
        isSyncing = true;
        
        try {
            const categories = await window.getAllCategories();
            const herbs = await window.getAllHerbs();
            
            const cacheData = {
                categories: categories,
                herbs: herbs,
                timestamp: Date.now()
            };
            localStorage.setItem('herbal_cache_v3', JSON.stringify(cacheData));
            
            if (window.categories) window.categories = categories;
            if (window.herbs) window.herbs = herbs;
            if (window.renderContent) window.renderContent();
            if (window.updateHerbCount) window.updateHerbCount();
            
            console.log(`✅ Sync complete: ${herbs.length} herbs, ${categories.length} categories`);
            if (showToast) alert(`✅ تم التحميل (${herbs.length} عشبة)`);
            return true;
            
        } catch (error) {
            console.error('❌ Sync failed:', error);
            if (showToast) alert('❌ فشل تحميل البيانات');
            return false;
        } finally {
            isSyncing = false;
        }
    }
    
    function loadFromCache() {
        try {
            const cached = localStorage.getItem('herbal_cache_v3');
            if (cached) {
                const data = JSON.parse(cached);
                if (data.categories && data.herbs) {
                    if (window.categories) window.categories = data.categories;
                    if (window.herbs) window.herbs = data.herbs;
                    if (window.renderContent) window.renderContent();
                    if (window.updateHerbCount) window.updateHerbCount();
                    console.log(`📦 Loaded from cache: ${data.herbs.length} herbs`);
                    return true;
                }
            }
        } catch (e) {
            console.warn('Failed to load cache:', e);
        }
        return false;
    }
    
    function clearCache() {
        localStorage.removeItem('herbal_cache_v3');
        alert('🗑️ تم مسح الكاش');
    }
    
    async function init() {
        console.log('🔄 SyncManager initializing...');
        
        const hasCache = loadFromCache();
        if (!hasCache && navigator.onLine) {
            await fetchData(false);
        } else if (hasCache && navigator.onLine) {
            setTimeout(() => fetchData(false), 2000);
        }
        
        console.log('✅ SyncManager ready');
    }
    
    return {
        init: init,
        fetchData: fetchData,
        loadFromCache: loadFromCache,
        clearCache: clearCache,
        isSyncing: () => isSyncing
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SyncManager.init());
} else {
    SyncManager.init();
}

window.SyncManager = SyncManager;
window.forceSyncData = () => SyncManager.fetchData(true);
