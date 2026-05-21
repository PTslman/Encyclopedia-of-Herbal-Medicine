// ============================================================
// Firebase Configuration - الموسوعة الأعشاب الطبية
// النسخة المتطورة مع دعم كامل للميزات المتقدمة
// ============================================================

// ========== إعدادات المشروع ==========
const firebaseConfig = {
    apiKey: "AIzaSyAkVYaspguYs6gXAOaV7xoiesa38nqgm10",
    authDomain: "semoharbs.firebaseapp.com",
    projectId: "semoharbs",
    storageBucket: "semoharbs.firebasestorage.app",
    messagingSenderId: "497780761661",
    appId: "1:497780761661:web:95ae225c648814c0ed7654"
};

// ========== تهيئة Firebase مع إعادة محاولة ==========
let retryCount = 0;
const MAX_RETRIES = 3;

function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase initialized");
            return true;
        }
        return true;
    } catch (error) {
        console.error("❌ Firebase init failed:", error);
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`🔄 Retry ${retryCount}/${MAX_RETRIES}...`);
            setTimeout(initFirebase, 1000);
        }
        return false;
    }
}

initFirebase();

// ========== الحصول على الخدمات ==========
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// ========== إعدادات Firestore المتقدمة ==========
db.settings({
    ignoreUndefinedProperties: true,
    merge: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// ========== تفعيل التخزين المحلي مع معالجة الأخطاء ==========
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log("✅ Persistence enabled"))
    .catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn("⚠️ Multiple tabs open - persistence disabled");
        } else {
            console.warn("⚠️ Persistence error:", err.message);
        }
    });

// ========== مراجع المجموعات ==========
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");
const storageRef = storage.ref();

// ========== معلومات المسؤول ==========
const ADMIN_EMAIL = "admin@herbal.com";
const ADMIN_PASSWORD = "admin1442";
const ADMIN_UID = "OWssFNrZDaZfeSlrLF8ReS8O6LM2";

// ========== دوال متقدمة ==========

// جلب UID المسؤول تلقائياً
async function fetchAdminUID() {
    try {
        const savedUID = localStorage.getItem('admin_uid');
        if (savedUID) {
            window.ADMIN_UID = savedUID;
            return savedUID;
        }
        const userCred = await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        const uid = userCred.user.uid;
        localStorage.setItem('admin_uid', uid);
        window.ADMIN_UID = uid;
        await auth.signOut();
        return uid;
    } catch (error) {
        console.warn("Cannot fetch admin UID:", error.message);
        window.ADMIN_UID = ADMIN_UID;
        return ADMIN_UID;
    }
}

// التحقق من صلاحيات المسؤول
function isUserAdmin(user) {
    if (!user) return false;
    return user.uid === (window.ADMIN_UID || ADMIN_UID) || user.email === ADMIN_EMAIL;
}

// اختبار الاتصال
async function testConnection() {
    const start = performance.now();
    try {
        await herbsCol.limit(1).get();
        const latency = Math.round(performance.now() - start);
        console.log(`✅ Firebase connection: ${latency}ms`);
        return { success: true, latency };
    } catch (error) {
        console.error("❌ Firebase connection failed:", error.message);
        return { success: false, error: error.message };
    }
}

// جلب جميع البيانات
async function fetchAllData() {
    console.log("📡 Fetching all data...");
    const start = performance.now();
    try {
        const [categoriesSnap, herbsSnap] = await Promise.all([
            categoriesCol.get(),
            herbsCol.get()
        ]);
        
        const categories = [];
        categoriesSnap.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));
        
        const herbs = [];
        herbsSnap.forEach(doc => herbs.push({ id: doc.id, ...doc.data() }));
        
        const duration = Math.round(performance.now() - start);
        console.log(`✅ Fetched ${herbs.length} herbs, ${categories.length} categories (${duration}ms)`);
        
        return { categories, herbs, duration };
    } catch (error) {
        console.error("❌ Fetch failed:", error);
        throw error;
    }
}

// حفظ البيانات
async function saveAllData(categories, herbs) {
    const batch = db.batch();
    
    // حذف القديم
    const oldCategories = await categoriesCol.get();
    oldCategories.forEach(doc => batch.delete(doc.ref));
    const oldHerbs = await herbsCol.get();
    oldHerbs.forEach(doc => batch.delete(doc.ref));
    
    // إضافة الجديد
    categories.forEach(cat => {
        const ref = categoriesCol.doc();
        batch.set(ref, { name: cat.name, createdAt: new Date().toISOString() });
    });
    
    herbs.forEach(herb => {
        const ref = herbsCol.doc();
        batch.set(ref, {
            name: herb.name,
            categoryId: herb.categoryId,
            benefits: herb.benefits || '—',
            warnings: herb.warnings || '—',
            harms: herb.harms || '—',
            usage: herb.usage || '—',
            notes: herb.notes || '—',
            imageUrl: herb.imageUrl || null,
            updatedAt: new Date().toISOString()
        });
    });
    
    await batch.commit();
    console.log(`✅ Saved ${herbs.length} herbs, ${categories.length} categories`);
}

// رفع صورة
async function uploadImage(file, path) {
    const ext = file.name.split('.').pop();
    const fileName = `${path}_${Date.now()}.${ext}`;
    const imageRef = storageRef.child(`herb_images/${fileName}`);
    
    const uploadTask = await imageRef.put(file);
    const downloadURL = await uploadTask.ref.getDownloadURL();
    console.log(`✅ Image uploaded: ${fileName}`);
    return downloadURL;
}

// حذف صورة
async function deleteImage(url) {
    if (!url) return;
    try {
        const imageRef = storage.refFromURL(url);
        await imageRef.delete();
        console.log("✅ Image deleted");
    } catch (error) {
        console.warn("Cannot delete image:", error.message);
    }
}

// ========== تصدير ==========
window.db = db;
window.auth = auth;
window.storage = storage;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;
window.isUserAdmin = isUserAdmin;
window.testConnection = testConnection;
window.fetchAllData = fetchAllData;
window.saveAllData = saveAllData;
window.uploadImage = uploadImage;
window.deleteImage = deleteImage;
window.fetchAdminUID = fetchAdminUID;

// ========== مراقبة حالة المصادقة ==========
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`🔐 Logged in: ${user.email}`);
        console.log(`👑 Admin: ${isUserAdmin(user)}`);
    } else {
        console.log("🔓 Logged out");
    }
});

// ========== اختبار الاتصال ==========
setTimeout(() => testConnection(), 2000);

console.log("✅ Firebase config loaded (advanced mode)");
