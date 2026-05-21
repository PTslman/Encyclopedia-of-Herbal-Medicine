// ============================================================
// Sync Manager - موسوعة الأعشاب الطبية
// نظام مزامنة متطور مع واجهة مستخدم احترافية
// ============================================================

class SyncManager {
    constructor() {
        this.isSyncing = false;
        this.lastSync = null;
        this.syncQueue = [];
        this.listeners = [];
        this.init();
    }
    
    init() {
        console.log("🔄 SyncManager initialized");
        this.setupEventListeners();
        this.setupButtons();
        this.autoSync();
    }
    
    // إضافة مستمع
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    // إشعار المستمعين
    notify(status, data) {
        this.listeners.forEach(cb => cb(status, data));
    }
    
    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // عند عودة الاتصال
        window.addEventListener('online', () => {
            console.log("🌐 Online - auto syncing");
            this.sync(false);
        });
        
        // عند فقدان الاتصال
        window.addEventListener('offline', () => {
            console.log("📡 Offline - sync paused");
            this.notify('offline', null);
        });
    }
    
    // إعداد الأزرار
    setupButtons() {
        // زر الزائر
        const visitorBtn = document.getElementById('visitorForceSyncBtn');
        if (visitorBtn) {
            visitorBtn.addEventListener('click', () => this.sync(true));
        }
        
        // زر المسؤول
        const adminBtn = document.getElementById('refreshDataBtn');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => this.sync(true));
        }
    }
    
    // عرض إشعار
    showToast(message, type = 'info') {
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3',
            sync: '#2e7d32'
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
            padding: 14px 20px;
            border-radius: 60px;
            z-index: 10001;
            font-family: 'Cairo', sans-serif;
            font-size: 0.85rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
            direction: rtl;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(50px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // تحديث حالة الزر
    updateButtonState(btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري...';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerHTML = '<i class="fas fa-download"></i> تحديث البيانات';
        }
    }
    
    // المزامنة الرئيسية
    async sync(showToast = true) {
        if (this.isSyncing) {
            if (showToast) this.showToast('⚠️ المزامنة قيد التقدم', 'warning');
            return false;
        }
        
        if (!navigator.onLine) {
            if (showToast) this.showToast('📡 لا يوجد اتصال بالإنترنت', 'warning');
            return false;
        }
        
        this.isSyncing = true;
        this.notify('syncing', null);
        
        // تحديث الأزرار
        const visitorBtn = document.getElementById('visitorForceSyncBtn');
        const adminBtn = document.getElementById('refreshDataBtn');
        this.updateButtonState(visitorBtn, true);
        this.updateButtonState(adminBtn, true);
        
        if (showToast) this.showToast('🔄 جاري تحميل البيانات...', 'sync');
        
        const startTime = performance.now();
        
        try {
            // جلب البيانات
            const [categoriesSnap, herbsSnap] = await Promise.all([
                categoriesCol.get(),
                herbsCol.get()
            ]);
            
            const categories = [];
            categoriesSnap.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));
            
            const herbs = [];
            herbsSnap.forEach(doc => herbs.push({ id: doc.id, ...doc.data() }));
            
            // حفظ في localStorage
            const cache = {
                categories: categories,
                herbs: herbs,
                timestamp: Date.now(),
                version: '2.0'
            };
            localStorage.setItem('herbal_cache_v3', JSON.stringify(cache));
            
            // تحديث المتغيرات العامة
            if (typeof window.categories !== 'undefined') window.categories = categories;
            if (typeof window.herbs !== 'undefined') window.herbs = herbs;
            
            // تحديث الواجهة
            if (typeof renderContent === 'function') renderContent();
            if (typeof updateHerbCount === 'function') updateHerbCount();
            
            this.lastSync = Date.now();
            const duration = Math.round(performance.now() - startTime);
            
            console.log(`✅ Sync completed: ${herbs.length} herbs, ${categories.length} categories (${duration}ms)`);
            
            if (showToast) {
                this.showToast(`✅ تم التحميل (${herbs.length} عشبة)`, 'success');
            }
            
            this.notify('success', { herbs: herbs.length, categories: categories.length, duration });
            return true;
            
        } catch (error) {
            console.error("❌ Sync failed:", error);
            
            let errorMsg = error.message;
            if (error.code === 'permission-denied') {
                errorMsg = 'ليس لديك صلاحية الوصول';
            } else if (error.code === 'unavailable') {
                errorMsg = 'الخدمة غير متاحة حالياً';
            }
            
            if (showToast) {
                this.showToast(`❌ فشل التحميل: ${errorMsg}`, 'error');
            }
            
            this.notify('error', { message: errorMsg });
            return false;
            
        } finally {
            this.isSyncing = false;
            this.updateButtonState(visitorBtn, false);
            this.updateButtonState(adminBtn, false);
        }
    }
    
    // المزامنة التلقائية
    async autoSync() {
        // فحص أول مرة بعد 2 ثانية
        setTimeout(async () => {
            if (navigator.onLine) {
                // التحقق من وجود بيانات قديمة
                const lastCache = localStorage.getItem('herbal_cache_v3');
                if (!lastCache) {
                    console.log("🔄 First time - syncing...");
                    await this.sync(false);
                } else {
                    try {
                        const cache = JSON.parse(lastCache);
                        const age = Date.now() - cache.timestamp;
                        if (age > 24 * 60 * 60 * 1000) { // أقدم من يوم
                            console.log("🔄 Cache expired - auto syncing...");
                            await this.sync(false);
                        }
                    } catch(e) {}
                }
            }
        }, 2000);
        
        // فحص دوري كل ساعة
        setInterval(() => {
            if (navigator.onLine && !this.isSyncing) {
                console.log("🔄 Periodic sync check...");
                this.sync(false);
            }
        }, 60 * 60 * 1000);
    }
    
    // الحصول على الحالة
    getStatus() {
        return {
            isSyncing: this.isSyncing,
            lastSync: this.lastSync,
            lastSyncFormatted: this.lastSync ? new Date(this.lastSync).toLocaleString() : null,
            isOnline: navigator.onLine
        };
    }
}

// ========== تشغيل مدير المزامنة ==========
const syncManager = new SyncManager();
window.syncManager = syncManager;
window.syncData = () => syncManager.sync(true);

console.log("✅ SyncManager ready");
