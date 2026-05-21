// =====================================================
// التخزين المحلي المتقدم - للنسخ الاحتياطي
// =====================================================

const LocalDB = {
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    },
    
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    },
    
    delete(key) {
        localStorage.removeItem(key);
    },
    
    clear() {
        localStorage.clear();
    },
    
    exportAll() {
        const all = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('herbal_')) {
                all[key] = localStorage.getItem(key);
            }
        }
        return all;
    },
    
    importAll(data) {
        for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(key, value);
        }
    }
};

window.LocalDB = LocalDB;
console.log('✅ LocalDB ready');
