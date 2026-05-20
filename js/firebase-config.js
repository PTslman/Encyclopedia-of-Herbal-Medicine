// ============================================
// إعدادات Firebase - موسوعة الأعشاب الطبية
// مشروع: semoharbs
// النسخة النهائية المتكاملة
// ============================================

// ========== إعدادات المشروع ==========
const firebaseConfig = {
    apiKey: "AIzaSyAkVYaspguYs6gXAOaV7xoiesa38nqgm10",
    authDomain: "semoharbs.firebaseapp.com",
    projectId: "semoharbs",
    storageBucket: "semoharbs.firebasestorage.app",
    messagingSenderId: "497780761661",
    appId: "1:497780761661:web:95ae225c648814c0ed7654"
};

// ========== تهيئة Firebase (مرة واحدة فقط) ==========
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully");
    console.log(`📁 Project: ${firebaseConfig.projectId}`);
} else {
    console.log("⚠️ Firebase already initialized");
}

// ========== الحصول على مراجع الخدمات ==========
const db = firebase.firestore();
const auth = firebase.auth();

// ========== إعدادات Firestore المتقدمة ==========
// هذه الإعدادات تحسن الأداء والتخزين المحلي
db.settings({
    ignoreUndefinedProperties: true,      // تجاهل الحقول غير المعرفة
    merge: true,                          // دمج البيانات بدلاً من استبدالها
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED  // كاش غير محدود للسرعة
});

// ========== تفعيل التخزين المحلي (Offline Persistence) ==========
// هذا يسمح للتطبيق بالعمل دون اتصال بالإنترنت
db.enablePersistence({ 
    synchronizeTabs: true,               // مزامنة بين التبويبات المفتوحة
    experimentalForceOwningTab: true     // قوة التبويب الرئيسي
})
.then(() => {
    console.log("✅ Offline persistence enabled (unlimited cache)");
    console.log("🔄 App will work offline with cached data");
})
.catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("⚠️ Multiple tabs open, persistence disabled in this tab");
        console.warn("   Only one tab can use persistence at a time");
    } else if (err.code === 'unimplemented') {
        console.warn("⚠️ Browser does not support persistence");
        console.warn("   Offline features will be limited");
    } else {
        console.error("❌ Unexpected persistence error:", err);
    }
});

// ========== إعدادات المصادقة (Authentication) ==========
// استخدام لغة الجهاز
auth.useDeviceLanguage();

// مراقبة حالة المصادقة
let currentUser = null;

auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        console.log(`🔐 User signed in: ${user.email}`);
        console.log(`🆔 User UID: ${user.uid}`);
        console.log(`👑 Is admin: ${isUserAdmin(user)}`);
    } else {
        console.log("🔓 User signed out");
        currentUser = null;
    }
});

// ========== مراجع المجموعات (Collections) ==========
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");

// ========== معلومات المسؤول ==========
// هذا الـ UID خاص بالمسؤول الوحيد الذي يمكنه تعديل البيانات
const ADMIN_UID = "OWssFNrZDaZfeSlrLF8ReS8O6LM2";

// قائمة UIDs المسموح لهم كمسؤولين (لإضافة أكثر من مسؤول مستقبلاً)
const ADMIN_UIDS = [
    "OWssFNrZDaZfeSlrLF8ReS8O6LM2"  // المسؤول الرئيسي
];

// ========== دوال التحقق من الصلاحيات ==========
/**
 * التحقق مما إذا كان المستخدم مسؤولاً
 * @param {firebase.User} user - مستخدم Firebase
 * @returns {boolean} - true إذا كان المستخدم مسؤولاً
 */
function isUserAdmin(user) {
    if (!user) return false;
    return ADMIN_UIDS.includes(user.uid);
}

/**
 * التحقق من صلاحيات المسؤول مع عرض رسالة خطأ
 * @param {firebase.User} user - مستخدم Firebase
 * @returns {boolean} - true إذا كان المستخدم مسؤولاً
 */
function requireAdmin(user) {
    const isAdmin = isUserAdmin(user);
    if (!isAdmin) {
        console.warn("⛔ Access denied: User is not an administrator");
        alert("⛔ عذراً، هذه الصفحة مخصصة للمسؤولين فقط");
    }
    return isAdmin;
}

// ========== دوال مساعدة للتعامل مع Firebase ==========

/**
 * إضافة سجل إجراء إلى قاعدة البيانات (للمسؤولين فقط)
 * @param {string} action - نوع الإجراء (مثل: add_herb, delete_category)
 * @param {object} details - تفاصيل الإجراء
 * @returns {Promise} - نتيجة الإضافة
 */
async function addAdminLog(action, details) {
    if (!currentUser || !isUserAdmin(currentUser)) {
        console.warn("Cannot add log: User is not admin");
        return null;
    }
    
    try {
        const logsCol = db.collection("admin_logs");
        const logEntry = {
            action: action,
            details: details,
            adminEmail: currentUser.email,
            adminUid: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            date: new Date().toISOString()
        };
        const docRef = await logsCol.add(logEntry);
        console.log(`📝 Admin log added: ${action}`);
        return docRef;
    } catch (error) {
        console.error("Failed to add admin log:", error);
        return null;
    }
}

/**
 * اختبار الاتصال بقاعدة البيانات
 * @returns {Promise<boolean>} - true إذا كان الاتصال يعمل
 */
async function testFirebaseConnection() {
    console.log("🔍 Testing Firebase connection...");
    try {
        const startTime = performance.now();
        await herbsCol.limit(1).get();
        const endTime = performance.now();
        const latency = (endTime - startTime).toFixed(0);
        console.log(`✅ Firebase connection successful (${latency}ms)`);
        return true;
    } catch (error) {
        console.error("❌ Firebase connection failed:", error);
        if (error.code === 'permission-denied') {
            console.error("   → Check Security Rules in Firebase Console");
        } else if (error.code === 'unavailable') {
            console.error("   → Network issue or Firebase service unavailable");
        }
        return false;
    }
}

/**
 * جلب جميع البيانات من Firebase دفعة واحدة
 * @returns {Promise<{herbs: Array, categories: Array}>}
 */
async function fetchAllDataFromFirebase() {
    console.log('📡 Fetching all data from Firebase...');
    
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
        
        console.log(`✅ Fetched ${herbs.length} herbs and ${categories.length} categories`);
        return { herbs, categories };
    } catch (error) {
        console.error('❌ Failed to fetch data from Firebase:', error);
        throw error;
    }
}

/**
 * الحصول على إحصائيات سريعة من قاعدة البيانات
 * @returns {Promise<object>} - إحصائيات
 */
async function getQuickStats() {
    try {
        const [herbsSnap, categoriesSnap] = await Promise.all([
            herbsCol.get(),
            categoriesCol.get()
        ]);
        
        return {
            totalHerbs: herbsSnap.size,
            totalCategories: categoriesSnap.size,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Failed to get stats:", error);
        return {
            totalHerbs: 0,
            totalCategories: 0,
            error: error.message
        };
    }
}

/**
 * مسح الكاش المحلي لقاعدة البيانات (للمسؤولين فقط)
 * @returns {Promise<boolean>} - true إذا تم المسح بنجاح
 */
async function clearFirestoreCache() {
    if (!currentUser || !isUserAdmin(currentUser)) {
        console.warn("Cannot clear cache: User is not admin");
        return false;
    }
    
    try {
        if (db && db.terminate) {
            await db.terminate();
            console.log("Firestore terminated");
            await db.clearPersistence();
            console.log("✅ Firestore cache cleared");
            // إعادة تهيئة الاتصال
            await db.settings({
                ignoreUndefinedProperties: true,
                merge: true,
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });
            return true;
        }
    } catch (error) {
        console.error("Failed to clear cache:", error);
        return false;
    }
    return false;
}

// ========== تصدير المتغيرات والدوال للنطاق العام ==========
// هذا ضروري لاستخدامها في ملفات app.js وغيرها
window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;
window.ADMIN_UIDS = ADMIN_UIDS;
window.currentUser = currentUser;
window.isUserAdmin = isUserAdmin;
window.requireAdmin = requireAdmin;
window.addAdminLog = addAdminLog;
window.testFirebaseConnection = testFirebaseConnection;
window.fetchAllDataFromFirebase = fetchAllDataFromFirebase;
window.getQuickStats = getQuickStats;
window.clearFirestoreCache = clearFirestoreCache;

// ========== تسجيل معلومات التهيئة النهائية ==========
console.log("=========================================");
console.log("🌿 موسوعة الأعشاب الطبية - Firebase Config");
console.log("=========================================");
console.log(`📁 Project ID: ${firebaseConfig.projectId}`);
console.log(`🗄️ Firestore: ${db ? "✅ Initialized" : "❌ Failed"}`);
console.log(`🔐 Auth: ${auth ? "✅ Initialized" : "❌ Failed"}`);
console.log(`👑 Admin UID: ${ADMIN_UID}`);
console.log(`📊 Admin count: ${ADMIN_UIDS.length}`);
console.log(`💾 Cache: Unlimited`);
console.log("=========================================");

// ========== اختبار الاتصال التلقائي ==========
// يتم اختبار الاتصال بعد 3 ثوانٍ من تحميل الصفحة
setTimeout(() => {
    testFirebaseConnection();
}, 3000);

// ========== تسجيل نجاح التحميل ==========
console.log("✅ Firebase configuration loaded successfully");
