// ========== دوال قاعدة البيانات ==========

let categories = [];
let herbs = [];
let unsubscribeCategories = null;
let unsubscribeHerbs = null;
let isSyncActive = true;
let reconnectAttempts = 0;

// تحديث التقدم (سيتم ربطه لاحقاً)
let updateProgressCallback = null;

function setUpdateProgressCallback(callback) {
    updateProgressCallback = callback;
}

function updateProgress(percent, stage, status, loaded, total) {
    if (updateProgressCallback) {
        updateProgressCallback(percent, stage, status, loaded, total);
    }
}

// جلب البيانات من السيرفر
async function fetchFromServer() {
    try {
        const [catsSnap, herbsSnap] = await Promise.all([
            categoriesCol.orderBy("name").get(),
            herbsCol.get()
        ]);
        
        const newCategories = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const newHerbs = herbsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        return { categories: newCategories, herbs: newHerbs };
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}

// تحديث إجباري من السيرفر
async function forceFetchFromServer() {
    updateProgress(5, 'تحديث إجباري', 'جلب أحدث البيانات...');
    
    try {
        const { categories: newCats, herbs: newHerbs } = await fetchFromServer();
        categories = newCats;
        herbs = newHerbs;
        
        saveToLocalCache('herbal_cache_v4', { categories, herbs });
        updateProgress(100, 'اكتمل', `تم تحميل ${herbs.length} عشبة`);
        
        // تحديث واجهة المستخدم
        if (window.renderContent) window.renderContent();
        if (window.updateHerbCount) window.updateHerbCount(herbs.length);
        
        return true;
    } catch (error) {
        console.error("Force fetch failed:", error);
        updateProgress(100, 'خطأ', `فشل التحديث: ${error.message}`);
        return false;
    }
}

// بدء المزامنة المباشرة
function startRealtimeUpdates() {
    if (!isSyncActive) return;
    
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeHerbs) unsubscribeHerbs();
    
    const handleError = (error) => {
        console.error("Snapshot error:", error);
        if (isSyncActive) handleReconnection();
    };
    
    try {
        unsubscribeCategories = categoriesCol.orderBy("name").onSnapshot(snapshot => {
            if (!isSyncActive) return;
            categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            saveToLocalCache('herbal_cache_v4', { categories, herbs });
            if (window.renderContent) window.renderContent();
            reconnectAttempts = 0;
            updateSyncLedStatus('connected');
        }, handleError);
        
        unsubscribeHerbs = herbsCol.onSnapshot(snapshot => {
            if (!isSyncActive) return;
            herbs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            saveToLocalCache('herbal_cache_v4', { categories, herbs });
            if (window.updateHerbCount) window.updateHerbCount(herbs.length);
            if (window.renderContent) window.renderContent();
            reconnectAttempts = 0;
            updateSyncLedStatus('connected');
        }, handleError);
        
        updateSyncLedStatus('syncing');
    } catch (e) {
        console.error("Start updates error:", e);
        handleReconnection();
    }
}

// إيقاف المزامنة
function stopRealtimeUpdates() {
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeHerbs) unsubscribeHerbs();
    isSyncActive = false;
    updateSyncLedStatus('disconnected');
    updateProgress(0, 'متوقف', 'تم إيقاف المزامنة');
}

// إعادة تشغيل المزامنة
function restartRealtimeUpdates() {
    if (isSyncActive) {
        alert("المزامنة مفعلة بالفعل");
        return;
    }
    isSyncActive = true;
    startRealtimeUpdates();
    updateProgress(50, 'تشغيل', 'إعادة تشغيل المزامنة...');
}

// إعادة ضبط المزامنة
function resetSync() {
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeHerbs) unsubscribeHerbs();
    isSyncActive = false;
    
    updateProgress(20, 'إعادة ضبط', 'إعادة تهيئة الاتصال...');
    
    setTimeout(() => {
        isSyncActive = true;
        startRealtimeUpdates();
        updateProgress(100, 'تم', 'تم إعادة ضبط المزامنة');
        alert("تم إعادة ضبط المزامنة بنجاح");
    }, 500);
}

// معالجة إعادة الاتصال
function handleReconnection() {
    reconnectAttempts++;
    updateSyncLedStatus('syncing');
    
    if (reconnectAttempts < 6) {
        const delay = Math.min(1000 * Math.pow(1.8, reconnectAttempts), 45000);
        updateProgress(30, 'إعادة اتصال', `محاولة ${reconnectAttempts} بعد ${Math.round(delay/1000)} ثانية...`);
        
        setTimeout(() => {
            startRealtimeUpdates();
        }, delay);
    } else {
        updateProgress(100, 'خطأ', 'فشل الاتصال المستمر، حاول تحديث الصفحة');
        updateSyncLedStatus('disconnected');
    }
}

// تحديث حالة LED
function updateSyncLedStatus(status) {
    const led = document.getElementById('syncStatusLed');
    if (!led) return;
    
    led.className = `sync-status-led ${status}`;
}

// إضافة تصنيف
async function addCategory(name) {
    try {
        await categoriesCol.add({
            name: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Add category error:", error);
        return false;
    }
}

// تحديث تصنيف
async function updateCategory(id, name) {
    try {
        await categoriesCol.doc(id).update({ name: name });
        return true;
    } catch (error) {
        console.error("Update category error:", error);
        return false;
    }
}

// حذف تصنيف مع أعشابه
async function deleteCategoryWithHerbs(categoryId) {
    try {
        const batch = db.batch();
        
        const relatedHerbs = await herbsCol.where('categoryId', '==', categoryId).get();
        relatedHerbs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        batch.delete(categoriesCol.doc(categoryId));
        await batch.commit();
        
        return true;
    } catch (error) {
        console.error("Delete category error:", error);
        return false;
    }
}

// إضافة أو تحديث عشبة
async function saveHerbToDB(herbData, herbId = null) {
    try {
        const docRef = herbId ? herbsCol.doc(herbId) : herbsCol.doc();
        await docRef.set({
            ...herbData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        return docRef.id;
    } catch (error) {
        console.error("Save herb error:", error);
        throw error;
    }
}

// حذف عشبة
async function deleteHerb(herbId) {
    try {
        await herbsCol.doc(herbId).delete();
        return true;
    } catch (error) {
        console.error("Delete herb error:", error);
        return false;
    }
}

// حذف جميع البيانات
async function deleteAllData() {
    try {
        const allCats = await categoriesCol.get();
        const allHerbs = await herbsCol.get();
        const batch = db.batch();
        
        allCats.docs.forEach(doc => batch.delete(doc.ref));
        allHerbs.docs.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
        localStorage.removeItem('herbal_cache_v4');
        
        return true;
    } catch (error) {
        console.error("Delete all error:", error);
        return false;
    }
}

// حذف الأعشاب فقط
async function deleteAllHerbsOnly() {
    try {
        const allHerbs = await herbsCol.get();
        const batch = db.batch();
        
        allHerbs.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        localStorage.removeItem('herbal_cache_v4');
        return true;
    } catch (error) {
        console.error("Delete herbs error:", error);
        return false;
    }
}

// Export to window
window.categories = () => categories;
window.herbs = () => herbs;
window.startRealtimeUpdates = startRealtimeUpdates;
window.stopRealtimeUpdates = stopRealtimeUpdates;
window.restartRealtimeUpdates = restartRealtimeUpdates;
window.resetSync = resetSync;
window.forceFetchFromServer = forceFetchFromServer;
window.addCategory = addCategory;
window.updateCategory = updateCategory;
window.deleteCategoryWithHerbs = deleteCategoryWithHerbs;
window.saveHerbToDB = saveHerbToDB;
window.deleteHerb = deleteHerb;
window.deleteAllData = deleteAllData;
window.deleteAllHerbsOnly = deleteAllHerbsOnly;
window.setUpdateProgressCallback = setUpdateProgressCallback;