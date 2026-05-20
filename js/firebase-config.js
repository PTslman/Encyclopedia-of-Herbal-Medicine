// ============================================
// إعدادات Firebase - موسوعة الأعشاب الطبية
// نسخة متوافقة مع جميع التغييرات
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyB634alkmrWFHIZrAo90oi9nTpMjwR3gXU",
    authDomain: "harb-f6240.firebaseapp.com",
    projectId: "harb-f6240",
    storageBucket: "harb-f6240.firebasestorage.app",
    messagingSenderId: "798448784800",
    appId: "1:798448784800:web:459459715617c4c1a980c5"
};

// ========== تهيئة Firebase ==========
// التأكد من عدم وجود تهيئة مسبقة
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully");
} else {
    console.log("⚠️ Firebase already initialized");
}

// ========== الحصول على مراجع الخدمات ==========
const db = firebase.firestore();
const auth = firebase.auth();

// ========== إعدادات Firestore المحسنة ==========
db.settings({
    ignoreUndefinedProperties: true,
    merge: true,
    cacheSizeBytes: 100 * 1024 * 1024  // 100 MB كاش
});

// ========== تفعيل التخزين المحلي ==========
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        console.log("✅ Offline persistence enabled (100MB cache)");
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("⚠️ Multiple tabs open, persistence disabled");
        } else if (err.code === 'unimplemented') {
            console.warn("⚠️ Browser does not support persistence");
        } else {
            console.error("❌ Persistence error:", err);
        }
    });

// ========== مراجع المجموعات ==========
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");

// ========== معلومات المسؤول ==========
const ADMIN_UID = "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2";

// قائمة UIDs المسموح لهم كمسؤولين
const ADMIN_UIDS = [
    "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2"
];

// ========== دوال مساعدة ==========
function isUserAdmin(user) {
    if (!user) return false;
    return ADMIN_UIDS.includes(user.uid);
}

function requireAdmin(user) {
    const isAdmin = isUserAdmin(user);
    if (!isAdmin) {
        console.warn("⛔ Access denied: User is not an administrator");
        alert("⛔ عذراً، هذه الصفحة مخصصة للمسؤولين فقط");
    }
    return isAdmin;
}

// اختبار الاتصال بقاعدة البيانات
async function testFirebaseConnection() {
    try {
        const startTime = performance.now();
        await herbsCol.limit(1).get();
        const endTime = performance.now();
        const latency = (endTime - startTime).toFixed(0);
        console.log(`✅ Firebase connection successful (${latency}ms)`);
        return true;
    } catch (error) {
        console.error("❌ Firebase connection failed:", error);
        return false;
    }
}

// جلب جميع البيانات من Firebase (للاستخدام في forceSyncData)
async function fetchAllDataFromFirebase() {
    console.log('📡 جلب البيانات من Firebase...');
    
    try {
        const [herbsSnapshot, categoriesSnapshot] = await Promise.all([
            herbsCol.get(),
            categoriesCol.get()
        ]);
        
        const herbs = [];
        herbsSnapshot.forEach(doc => {
            herbs.push({ id: doc.id, ...doc.data() });
        });
        
        const categories = [];
        categoriesSnapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ تم جلب ${herbs.length} عشبة و ${categories.length} تصنيف من Firebase`);
        return { herbs, categories };
    } catch (error) {
        console.error('❌ فشل جلب البيانات من Firebase:', error);
        throw error;
    }
}

// ========== مراقبة حالة المصادقة ==========
let currentUser = null;

auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        console.log(`🔐 User signed in: ${user.email} (${user.uid})`);
        console.log(`👑 Is admin: ${isUserAdmin(user)}`);
    } else {
        console.log("🔓 User signed out");
        currentUser = null;
    }
});

// ========== تصدير المتغيرات والدوال للنطاق العام ==========
window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;
window.ADMIN_UIDS = ADMIN_UIDS;
window.isUserAdmin = isUserAdmin;
window.requireAdmin = requireAdmin;
window.testFirebaseConnection = testFirebaseConnection;
window.fetchAllDataFromFirebase = fetchAllDataFromFirebase;

// ========== تسجيل معلومات التهيئة ==========
console.log("=========================================");
console.log("🌿 موسوعة الأعشاب الطبية - Firebase Config");
console.log("=========================================");
console.log(`📁 Project ID: ${firebaseConfig.projectId}`);
console.log(`🗄️ Firestore: ${db ? "✅ Initialized" : "❌ Failed"}`);
console.log(`🔐 Auth: ${auth ? "✅ Initialized" : "❌ Failed"}`);
console.log(`👑 Admin UID: ${ADMIN_UID}`);
console.log(`📊 Admin count: ${ADMIN_UIDS.length}`);
console.log("=========================================");

// اختبار الاتصال التلقائي بعد 3 ثواني
setTimeout(() => {
    testFirebaseConnection();
}, 3000);
