// ============================================
// إعدادات Firebase - نسخة محسنة وسريعة
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyB634alkmrWFHIZrAo90oi9nTpMjwR3gXU",
    authDomain: "harb-f6240.firebaseapp.com",
    projectId: "harb-f6240",
    storageBucket: "harb-f6240.firebasestorage.app",
    messagingSenderId: "798448784800",
    appId: "1:798448784800:web:459459715617c4c1a980c5"
};

// ========== تهيئة Firebase مع إعدادات السرعة ==========
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized");
}

const db = firebase.firestore();
const auth = firebase.auth();

// ========== إعدادات Firestore لتسريع الأداء ==========
db.settings({
    ignoreUndefinedProperties: true,           // تجاهل الخصائص غير المعرفة
    merge: true,                               // دمج البيانات
    cacheSizeBytes: 100 * 1024 * 1024          // 100 MB كاش (زيادة من 50MB)
});

// ========== تفعيل التخزين المحلي مع إعدادات أسرع ==========
db.enablePersistence({ 
    synchronizeTabs: true,
    experimentalForceOwningTab: true           // قوة التبويب الرئيسي
})
.then(() => {
    console.log("✅ Offline persistence enabled (100MB cache)");
})
.catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("⚠️ Multiple tabs open, using memory cache only");
    } else if (err.code === 'unimplemented') {
        console.warn("⚠️ Browser does not support persistence");
    }
});

// ========== إعدادات المصادقة السريعة ==========
auth.useDeviceLanguage();
auth.settings.appVerificationDisabledForTesting = false;

// ========== مراجع المجموعات ==========
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");

// ========== إنشاء فهارس مسبقة (للسرعة) ==========
// ملاحظة: هذه الفهارس يجب إنشاؤها في Firebase Console
// اذهب إلى Firestore -> Indexes -> Add Composite Index

// الفهرس الموصى به للأعشاب:
// Collection: herbs
// Fields: name (Ascending), categoryId (Ascending)

// ========== UID المسؤول ==========
const ADMIN_UID = "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2";

// ========== دوال مساعدة سريعة ==========
function isUserAdmin(user) {
    return user && user.uid === ADMIN_UID;
}

// دالة جلب سريعة مع Cache First
async function fastFetch(collection, limit = 100) {
    try {
        const snapshot = await collection.limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Fast fetch failed:", error);
        return [];
    }
}

// دالة جلب جميع الأعشاب مع تحسين الأداء
async function fastFetchAllHerbs() {
    const cached = localStorage.getItem('herbs_cache_fast');
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 30000) { // 30 ثانية كاش
            console.log('⚡ Using cached herbs (fast mode)');
            return data;
        }
    }
    
    const herbs = await fastFetch(herbsCol, 500);
    localStorage.setItem('herbs_cache_fast', JSON.stringify({
        data: herbs,
        timestamp: Date.now()
    }));
    return herbs;
}

// ========== تصدير المتغيرات ==========
window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;
window.isUserAdmin = isUserAdmin;
window.fastFetch = fastFetch;
window.fastFetchAllHerbs = fastFetchAllHerbs;

console.log("⚡ Firebase config loaded (fast mode)");
