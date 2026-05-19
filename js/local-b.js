// ============================================
// قاعدة البيانات المحلية - موسوعة الأعشاب الطبية
// تعمل كمصدر أساسي للبيانات وتتزامن مع Firebase
// ============================================

class LocalDatabase {
    constructor() {
        this.db = null;
        this.categories = [];
        this.herbs = [];
        this.isLoaded = false;
        this.syncCallbacks = [];
        this.dbPath = '/Encyclopedia-of-Herbal-Medicine/data/db.json';
    }
    
    // تحميل قاعدة البيانات من الملف المحلي
    async loadLocalDatabase() {
        try {
            console.log('📂 جاري تحميل قاعدة البيانات المحلية...');
            const response = await fetch(this.dbPath);
            if (!response.ok) throw new Error('فشل تحميل ملف البيانات');
            
            this.db = await response.json();
            this.categories = this.db.categories || [];
            this.herbs = this.db.herbs || [];
            this.isLoaded = true;
            
            console.log(`✅ تم تحميل قاعدة البيانات المحلية: ${this.categories.length} تصنيف, ${this.herbs.length} عشبة`);
            
            // حفظ نسخة احتياطية في localStorage
            this.backupToLocalStorage();
            
            return true;
        } catch (error) {
            console.error('❌ فشل تحميل قاعدة البيانات المحلية:', error);
            // محاولة الاستعادة من localStorage
            return this.restoreFromLocalStorage();
        }
    }
    
    // حفظ نسخة احتياطية في localStorage
    backupToLocalStorage() {
        try {
            const backup = {
                categories: this.categories,
                herbs: this.herbs,
                lastUpdated: new Date().toISOString(),
                version: this.db?.version || '1.0.0'
            };
            localStorage.setItem('herbal_local_backup', JSON.stringify(backup));
            console.log('💾 تم حفظ نسخة احتياطية في localStorage');
        } catch (e) {
            console.warn('فشل حفظ النسخة الاحتياطية:', e);
        }
    }
    
    // استعادة من localStorage
    restoreFromLocalStorage() {
        try {
            const backup = localStorage.getItem('herbal_local_backup');
            if (backup) {
                const data = JSON.parse(backup);
                this.categories = data.categories || [];
                this.herbs = data.herbs || [];
                this.isLoaded = true;
                console.log(`🔄 تم الاستعادة من النسخة الاحتياطية: ${this.categories.length} تصنيف, ${this.herbs.length} عشبة`);
                return true;
            }
        } catch (e) {
            console.warn('فشل الاستعادة من النسخة الاحتياطية:', e);
        }
        return false;
    }
    
    // الحصول على جميع التصنيفات
    getCategories() {
        return [...this.categories];
    }
    
    // الحصول على جميع الأعشاب
    getHerbs() {
        return [...this.herbs];
    }
    
    // الحصول على عشبة بواسطة ID
    getHerbById(id) {
        return this.herbs.find(h => h.id === id);
    }
    
    // الحصول على تصنيف بواسطة ID
    getCategoryById(id) {
        return this.categories.find(c => c.id === id);
    }
    
    // إضافة عشبة جديدة
    addHerb(herb) {
        const newHerb = {
            ...herb,
            id: this.generateId('herb'),
            updatedAt: new Date().toISOString()
        };
        this.herbs.push(newHerb);
        this.backupToLocalStorage();
        this.triggerSync('add', 'herb', newHerb);
        return newHerb;
    }
    
    // تحديث عشبة
    updateHerb(id, updates) {
        const index = this.herbs.findIndex(h => h.id === id);
        if (index !== -1) {
            this.herbs[index] = {
                ...this.herbs[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.backupToLocalStorage();
            this.triggerSync('update', 'herb', this.herbs[index]);
            return this.herbs[index];
        }
        return null;
    }
    
    // حذف عشبة
    deleteHerb(id) {
        const index = this.herbs.findIndex(h => h.id === id);
        if (index !== -1) {
            const deleted = this.herbs.splice(index, 1)[0];
            this.backupToLocalStorage();
            this.triggerSync('delete', 'herb', { id });
            return deleted;
        }
        return null;
    }
    
    // إضافة تصنيف
    addCategory(category) {
        const newCategory = {
            ...category,
            id: this.generateId('cat'),
            createdAt: new Date().toISOString()
        };
        this.categories.push(newCategory);
        this.backupToLocalStorage();
        this.triggerSync('add', 'category', newCategory);
        return newCategory;
    }
    
    // تحديث تصنيف
    updateCategory(id, name) {
        const index = this.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            this.categories[index].name = name;
            this.backupToLocalStorage();
            this.triggerSync('update', 'category', this.categories[index]);
            return this.categories[index];
        }
        return null;
    }
    
    // حذف تصنيف وجميع أعشابه
    deleteCategory(id) {
        const index = this.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            const deleted = this.categories.splice(index, 1)[0];
            // حذف جميع الأعشاب المرتبطة بهذا التصنيف
            this.herbs = this.herbs.filter(h => h.categoryId !== id);
            this.backupToLocalStorage();
            this.triggerSync('delete', 'category', { id });
            return deleted;
        }
        return null;
    }
    
    // توليد ID فريد
    generateId(prefix = '') {
        return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // مزامنة مع Firebase
    async syncWithFirebase() {
        console.log('🔄 بدء المزامنة مع Firebase...');
        
        if (!window.db || !window.herbsCol || !window.categoriesCol) {
            console.warn('⚠️ Firebase غير متاح، المزامنة مؤجلة');
            return false;
        }
        
        try {
            // المزامنة من المحلي إلى Firebase
            for (const herb of this.herbs) {
                const docRef = window.herbsCol.doc(herb.id);
                await docRef.set(herb, { merge: true });
            }
            
            for (const category of this.categories) {
                const docRef = window.categoriesCol.doc(category.id);
                await docRef.set(category, { merge: true });
            }
            
            console.log('✅ تمت المزامنة مع Firebase بنجاح');
            return true;
        } catch (error) {
            console.error('❌ فشل المزامنة مع Firebase:', error);
            return false;
        }
    }
    
    // استيراد من Firebase
    async importFromFirebase() {
        console.log('📥 جاري الاستيراد من Firebase...');
        
        if (!window.db || !window.herbsCol || !window.categoriesCol) {
            console.warn('⚠️ Firebase غير متاح');
            return false;
        }
        
        try {
            const [herbsSnap, categoriesSnap] = await Promise.all([
                window.herbsCol.get(),
                window.categoriesCol.get()
            ]);
            
            const firebaseHerbs = herbsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const firebaseCategories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (firebaseHerbs.length > 0) this.herbs = firebaseHerbs;
            if (firebaseCategories.length > 0) this.categories = firebaseCategories;
            
            this.backupToLocalStorage();
            console.log(`✅ تم الاستيراد من Firebase: ${this.categories.length} تصنيف, ${this.herbs.length} عشبة`);
            return true;
        } catch (error) {
            console.error('❌ فشل الاستيراد من Firebase:', error);
            return false;
        }
    }
    
    // تسجيل دالة للمزامنة
    onSync(callback) {
        this.syncCallbacks.push(callback);
    }
    
    // تنفيذ المزامنة
    triggerSync(action, type, data) {
        this.syncCallbacks.forEach(callback => {
            try {
                callback({ action, type, data, timestamp: new Date().toISOString() });
            } catch(e) {}
        });
    }
    
    // تصدير قاعدة البيانات كـ JSON
    exportToJSON() {
        return {
            categories: this.categories,
            herbs: this.herbs,
            lastUpdated: new Date().toISOString(),
            version: '1.0.0'
        };
    }
    
    // استيراد من JSON
    importFromJSON(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            this.categories = data.categories || [];
            this.herbs = data.herbs || [];
            this.backupToLocalStorage();
            console.log(`✅ تم الاستيراد من JSON: ${this.categories.length} تصنيف, ${this.herbs.length} عشبة`);
            return true;
        } catch (error) {
            console.error('❌ فشل الاستيراد من JSON:', error);
            return false;
        }
    }
    
    // الحصول على إحصائيات
    getStats() {
        return {
            categoriesCount: this.categories.length,
            herbsCount: this.herbs.length,
            isLoaded: this.isLoaded,
            lastBackup: localStorage.getItem('herbal_local_backup') ? 'متوفر' : 'غير متوفر'
        };
    }
}

// إنشاء نسخة عامة من قاعدة البيانات
window.LocalDB = new LocalDatabase();

// تهيئة قاعدة البيانات عند تحميل الصفحة
(async function initLocalDatabase() {
    await window.LocalDB.loadLocalDatabase();
    console.log('📊 إحصائيات قاعدة البيانات المحلية:', window.LocalDB.getStats());
})();
