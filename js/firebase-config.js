// ============================================
// إعدادات Firebase - موسوعة الأعشاب الطبية
// نسخة متوافقة مع نظام المزامنة المتقدم
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
    ignoreUndefinedProperties: true,      // تجاهل الخصائص غير المعرفة
    merge: true,                          // دمج البيانات بدلاً من استبدالها
    cacheSizeBytes: 50 * 1024 * 1024      // 50 MB - حجم كاش التخزين المحلي
});

// ========== تفعيل التخزين المحلي والمزامنة بين التبويبات ==========
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        console.log("✅ Offline persistence enabled successfully");
        console.log("🔄 Multi-tab synchronization is active");
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("⚠️ Failed to enable persistence: Multiple tabs are open");
            console.warn("   Only one tab can use persistence at a time");
        } else if (err.code === 'unimplemented') {
            console.warn("⚠️ Browser does not support persistence");
            console.warn("   Offline features will not be available");
        } else {
            console.error("❌ Unexpected error enabling persistence:", err);
        }
    });

// ========== مراجع المجموعات (Collections) ==========
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");

// ========== معلومات المسؤول ==========
// UID المسؤول - يمكن الحصول عليه من Firebase Console -> Authentication -> Users
const ADMIN_UID = "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2";

// قائمة UIDs المسموح لهم بالدخول كمسؤولين (للمستقبل - إضافة أكثر من مسؤول)
const ADMIN_UIDS = [
    "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2",  // المسؤول الرئيسي
    // يمكن إضافة المزيد من UIDs هنا عند الحاجة
];

// ========== دوال مساعدة للتحقق من الصلاحيات ==========
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

// ========== إعدادات المصادقة (Authentication) ==========
// تكوين إعدادات المصادقة
auth.useDeviceLanguage(); // استخدام لغة الجهاز

// مراقبة حالة المصادقة
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

// ========== دوال مساعدة للتعامل مع Firebase ==========

/**
 * إضافة سجل إجراء إلى قاعدة البيانات (للمسؤولين فقط)
 * @param {string} action - نوع الإجراء
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
 * اختبار الاتصال بقاعدة البيانات
 * @returns {Promise<boolean>} - true إذا كان الاتصال يعمل
 */
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

/**
 * جلب جميع البيانات من Firebase (للإستخدام في forceSyncData)
 * @returns {Promise<object>} - { herbs, categories }
 */
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

/**
 * حفظ البيانات إلى Firebase (للمسؤولين فقط)
 * @param {object} data - { herbs, categories }
 * @returns {Promise<boolean>}
 */
async function saveAllDataToFirebase(data) {
    if (!currentUser || !isUserAdmin(currentUser)) {
        console.warn("Cannot save data: User is not admin");
        return false;
    }
    
    try {
        const batch = db.batch();
        
        // حذف البيانات القديمة
        const oldHerbs = await herbsCol.get();
        oldHerbs.forEach(doc => batch.delete(doc.ref));
        
        const oldCategories = await categoriesCol.get();
        oldCategories.forEach(doc => batch.delete(doc.ref));
        
        // إضافة البيانات الجديدة
        for (const herb of data.herbs) {
            const docRef = herbsCol.doc(herb.id);
            batch.set(docRef, herb);
        }
        
        for (const category of data.categories) {
            const docRef = categoriesCol.doc(category.id);
            batch.set(docRef, category);
        }
        
        await batch.commit();
        console.log('✅ تم حفظ البيانات في Firebase بنجاح');
        return true;
    } catch (error) {
        console.error('❌ فشل حفظ البيانات في Firebase:', error);
        return false;
    }
}

// ========== تصدير المتغيرات والدوال للنطاق العام ==========
window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;
window.ADMIN_UIDS = ADMIN_UIDS;
window.isUserAdmin = isUserAdmin;
window.requireAdmin = requireAdmin;
window.addAdminLog = addAdminLog;
window.getQuickStats = getQuickStats;
window.testFirebaseConnection = testFirebaseConnection;
window.fetchAllDataFromFirebase = fetchAllDataFromFirebase;
window.saveAllDataToFirebase = saveAllDataToFirebase;

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

// اختبار الاتصال التلقائي بعد 2 ثانية (اختياري)
setTimeout(() => {
    testFirebaseConnection();
}, 2000);
