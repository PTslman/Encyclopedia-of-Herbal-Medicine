// ============================================
// إعدادات Firebase - موسوعة الأعشاب الطبية
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAkVYaspguYs6gXAOaV7xoiesa38nqgm10",
    authDomain: "semoharbs.firebaseapp.com",
    projectId: "semoharbs",
    storageBucket: "semoharbs.firebasestorage.app",
    messagingSenderId: "497780761661",
    appId: "1:497780761661:web:95ae225c648814c0ed7654"
};

// تهيئة Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized");
}

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// إعدادات Firestore
db.settings({
    ignoreUndefinedProperties: true,
    merge: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// تفعيل التخزين المحلي
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log("✅ Offline persistence enabled"))
    .catch(err => console.warn("⚠️ Persistence:", err.message));

// مراجع المجموعات
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");
const storageRef = storage.ref();

// معلومات المسؤول
const ADMIN_UID = "OWssFNrZDaZfeSlrLF8ReS8O6LM2";
const ADMIN_EMAIL = "admin@herbal.com";

// دوال مساعدة
function isUserAdmin(user) {
    return user && (user.uid === ADMIN_UID || user.email === ADMIN_EMAIL);
}

// اختبار الاتصال
async function testFirebaseConnection() {
    try {
        await herbsCol.limit(1).get();
        console.log("✅ Firebase connected");
        return true;
    } catch (error) {
        console.error("❌ Firebase connection failed:", error.message);
        return false;
    }
}

// تصدير
window.db = db;
window.auth = auth;
window.storage = storage;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;
window.isUserAdmin = isUserAdmin;
window.testFirebaseConnection = testFirebaseConnection;

console.log("✅ Firebase config loaded");
