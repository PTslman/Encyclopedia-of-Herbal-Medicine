// ============================================
// إعدادات Firebase - موسوعة الأعشاب الطبية (النسخة المطورة)
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
const storage = firebase.storage(); // إضافة Storage للصور

// ========== إعدادات Firestore المحسنة ==========
db.settings({
    ignoreUndefinedProperties: true,
    merge: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// ========== تفعيل التخزين المحلي مع معالجة الأخطاء ==========
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log("✅ Offline persistence enabled (unlimited cache)"))
    .catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn("⚠️ Multiple tabs open, persistence disabled");
        } else if (err.code === 'unimplemented') {
            console.warn("⚠️ Browser does not support persistence");
        } else {
            console.error("❌ Persistence error:", err);
        }
    });

// ========== مراجع المجموعات والتخزين ==========
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");
const storageRef = storage.ref();

// ========== معلومات المسؤول ==========
// حساب المسؤول: admin@herbal.com
// كلمة السر: admin1442
const ADMIN_EMAIL = "admin@herbal.com";
const ADMIN_PASSWORD = "admin1442";
let ADMIN_UID = "OWssFNrZDaZfeSlrLF8ReS8O6LM2"; // UID المعروف

// ========== دالة جلب UID المسؤول ==========
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
        
        // محاولة تسجيل الدخول لجلب UID
        const userCredential = await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        ADMIN_UID = userCredential.user.uid;
        localStorage.setItem('admin_uid', ADMIN_UID);
        console.log("✅ Admin UID fetched and saved:", ADMIN_UID);
        window.ADMIN_UID = ADMIN_UID;
        
        // تسجيل الخروج فوراً
        await auth.signOut();
        console.log("🔓 Signed out after fetching UID");
        
        return ADMIN_UID;
    } catch (error) {
        console.error("❌ Failed to fetch admin UID:", error);
        console.log("⚠️ Using default ADMIN_UID");
        window.ADMIN_UID = ADMIN_UID;
        return ADMIN_UID;
    }
}

// ========== دوال التحقق ==========
function isUserAdmin(user) {
    if (!user) return false;
    return user.uid === ADMIN_UID || user.email === ADMIN_EMAIL;
}

// ========== دوال اختبار الاتصال ==========
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
        if (error.code === 'permission-denied') {
            console.error("   → Check Security Rules in Firebase Console");
        }
        return false;
    }
}

// ========== دوال جلب البيانات ==========
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

// ========== دوال رفع الصور إلى Storage ==========
async function uploadImageToStorage(file, herbId) {
    if (!file) return null;
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${herbId}_${Date.now()}.${fileExt}`;
        const imageRef = storageRef.child(`herb_images/${fileName}`);
        
        const uploadTask = await imageRef.put(file);
        const downloadURL = await uploadTask.ref.getDownloadURL();
        
        console.log(`✅ Image uploaded: ${fileName}`);
        return downloadURL;
    } catch (error) {
        console.error("❌ Failed to upload image:", error);
        return null;
    }
}

async function deleteImageFromStorage(imageUrl) {
    if (!imageUrl) return;
    try {
        const imageRef = storage.refFromURL(imageUrl);
        await imageRef.delete();
        console.log("✅ Image deleted from Storage");
    } catch (error) {
        console.warn("⚠️ Failed to delete image:", error);
    }
}

// ========== تصدير المتغيرات والدوال ==========
window.db = db;
window.auth = auth;
window.storage = storage;
window.storageRef = storageRef;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;
window.ADMIN_EMAIL = ADMIN_EMAIL;
window.isUserAdmin = isUserAdmin;
window.testFirebaseConnection = testFirebaseConnection;
window.fetchAllDataFromFirebase = fetchAllDataFromFirebase;
window.uploadImageToStorage = uploadImageToStorage;
window.deleteImageFromStorage = deleteImageFromStorage;
window.fetchAdminUID = fetchAdminUID;

// ========== تشغيل الجلب التلقائي ==========
fetchAdminUID();

// ========== مراقبة حالة المصادقة ==========
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log(`🔐 User signed in: ${user.email}`);
        console.log(`🆔 User UID: ${user.uid}`);
        console.log(`👑 Is admin: ${isUserAdmin(user)}`);
    } else {
        console.log("🔓 No user signed in");
    }
});

// ========== تسجيل معلومات التهيئة ==========
console.log("=========================================");
console.log("🌿 موسوعة الأعشاب الطبية - Firebase Config");
console.log("=========================================");
console.log(`📁 Project: ${firebaseConfig.projectId}`);
console.log(`🗄️ Firestore: ${db ? "✅ Initialized" : "❌ Failed"}`);
console.log(`📦 Storage: ${storage ? "✅ Initialized" : "❌ Failed"}`);
console.log(`🔐 Auth: ${auth ? "✅ Initialized" : "❌ Failed"}`);
console.log(`👤 Admin Email: ${ADMIN_EMAIL}`);
console.log(`🆔 Admin UID: ${ADMIN_UID}`);
console.log(`💾 Cache: Unlimited`);
console.log("=========================================");

// اختبار الاتصال بعد 3 ثوانٍ
setTimeout(() => {
    testFirebaseConnection();
}, 3000);
