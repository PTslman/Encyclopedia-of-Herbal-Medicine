// ============================================
// إعدادات Firebase - موسوعة الأعشاب الطبية
// مشروع: semoharbs
// حساب المسؤول: admin@herbal.com
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

// ========== تهيئة Firebase ==========
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

// ========== إعدادات Firestore المحسنة ==========
db.settings({
    ignoreUndefinedProperties: true,
    merge: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// ========== تفعيل التخزين المحلي ==========
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log("✅ Offline persistence enabled"))
    .catch(err => console.warn("⚠️ Persistence error:", err));

// ========== مراجع المجموعات ==========
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");

// ========== معلومات المسؤول ==========
// حساب المسؤول: admin@herbal.com
// كلمة السر: admin1442
// سيتم جلب UID تلقائياً بعد تسجيل الدخول الأول
let ADMIN_UID = null;

// ========== دالة جلب UID المسؤول تلقائياً ==========
async function fetchAdminUID() {
    try {
        // محاولة جلب UID من localStorage أولاً
        const savedUID = localStorage.getItem('admin_uid');
        if (savedUID) {
            ADMIN_UID = savedUID;
            console.log("✅ Admin UID loaded from cache:", ADMIN_UID);
            window.ADMIN_UID = ADMIN_UID;
            return ADMIN_UID;
        }
        
        // البحث عن المستخدم بواسطة البريد الإلكتروني
        const userCredential = await auth.signInWithEmailAndPassword("admin@herbal.com", "admin1442");
        ADMIN_UID = userCredential.user.uid;
        localStorage.setItem('admin_uid', ADMIN_UID);
        console.log("✅ Admin UID fetched and saved:", ADMIN_UID);
        window.ADMIN_UID = ADMIN_UID;
        
        // تسجيل الخروج فوراً (لن يبقى المسؤول مسجل الدخول تلقائياً)
        await auth.signOut();
        console.log("🔓 Signed out after fetching UID");
        
        return ADMIN_UID;
    } catch (error) {
        console.error("❌ Failed to fetch admin UID:", error);
        console.log("⚠️ Please login manually at least once to get the UID");
        return null;
    }
}

// ========== دوال مساعدة ==========
function isUserAdmin(user) {
    if (!user || !ADMIN_UID) return false;
    return user.uid === ADMIN_UID;
}

// اختبار الاتصال
async function testFirebaseConnection() {
    try {
        const startTime = performance.now();
        await herbsCol.limit(1).get();
        const endTime = performance.now();
        console.log(`✅ Firebase connection successful (${endTime - startTime}ms)`);
        return true;
    } catch (error) {
        console.error("❌ Firebase connection failed:", error);
        return false;
    }
}

// جلب جميع البيانات
async function fetchAllDataFromFirebase() {
    console.log('📡 Fetching data from Firebase...');
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
        console.error('❌ Failed to fetch data:', error);
        throw error;
    }
}

// ========== تصدير المتغيرات للنطاق العام ==========
window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.isUserAdmin = isUserAdmin;
window.testFirebaseConnection = testFirebaseConnection;
window.fetchAllDataFromFirebase = fetchAllDataFromFirebase;
window.fetchAdminUID = fetchAdminUID;

// محاولة جلب UID تلقائياً
fetchAdminUID();

// ========== مراقبة حالة المصادقة ==========
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log(`🔐 User signed in: ${user.email}`);
        console.log(`🆔 User UID: ${user.uid}`);
        if (ADMIN_UID) {
            console.log(`👑 Is admin: ${user.uid === ADMIN_UID}`);
        }
    } else {
        console.log("🔓 No user signed in");
    }
});

// ========== تسجيل معلومات التهيئة ==========
console.log("=========================================");
console.log("🌿 Firebase Config Loaded");
console.log("=========================================");
console.log(`📁 Project: ${firebaseConfig.projectId}`);
console.log(`👤 Admin Email: admin@herbal.com`);
console.log(`🔑 Admin Password: admin1442`);
console.log(`🆔 Admin UID: ${ADMIN_UID || "Not yet fetched - will be fetched on first login"}`);
console.log("=========================================");

// اختبار الاتصال بعد 2 ثانية
setTimeout(() => {
    testFirebaseConnection();
}, 2000);
