// ============================================
// إعدادات Firebase - موسوعة الأعشاب الطبية
// نسخة متوافقة مع التطبيق بالكامل
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

// ========== إعدادات Firestore ==========
db.settings({
    ignoreUndefinedProperties: true,
    merge: true,
    cacheSizeBytes: 100 * 1024 * 1024  // 100 MB cache
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

// ========== UID المسؤول ==========
// ⚠️ IMPORTANT: استبدل هذا الـ UID بـ UID المستخدم المسؤول الفعلي من Firebase Console
// اذهب إلى Firebase Console -> Authentication -> Users -> انسخ UID
const ADMIN_UID = "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2";

// ========== تصدير المتغيرات للنطاق العام (مهم جداً لـ app.js) ==========
window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;

// ========== دوال مساعدة ==========
function isUserAdmin(user) {
    return user && user.uid === ADMIN_UID;
}

window.isUserAdmin = isUserAdmin;

// دالة اختبار الاتصال
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

window.testFirebaseConnection = testFirebaseConnection;

// دالة جلب جميع البيانات من Firebase
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

window.fetchAllDataFromFirebase = fetchAllDataFromFirebase;

// ========== تسجيل معلومات التهيئة ==========
console.log("=========================================");
console.log("🌿 موسوعة الأعشاب الطبية - Firebase Config");
console.log("=========================================");
console.log(`📁 Project ID: ${firebaseConfig.projectId}`);
console.log(`🗄️ Firestore: ${db ? "✅ Initialized" : "❌ Failed"}`);
console.log(`🔐 Auth: ${auth ? "✅ Initialized" : "❌ Failed"}`);
console.log(`👑 Admin UID: ${ADMIN_UID}`);
console.log("=========================================");

// اختبار الاتصال التلقائي بعد 2 ثانية
setTimeout(() => {
    testFirebaseConnection();
}, 2000);
