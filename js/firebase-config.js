// ============================================
// إعدادات Firebase - موسوعة الأعشاب الطبية
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyB634alkmrWFHIZrAo90oi9nTpMjwR3gXU",
    authDomain: "harb-f6240.firebaseapp.com",
    projectId: "harb-f6240",
    storageBucket: "harb-f6240.firebasestorage.app",
    messagingSenderId: "798448784800",
    appId: "1:798448784800:web:459459715617c4c1a980c5"
};

// تهيئة Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized");
}

const db = firebase.firestore();
const auth = firebase.auth();

// إعدادات Firestore
db.settings({
    ignoreUndefinedProperties: true,
    merge: true,
    cacheSizeBytes: 100 * 1024 * 1024
});

// تفعيل التخزين المحلي
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log("✅ Offline persistence enabled"))
    .catch(err => console.warn("⚠️ Persistence error:", err));

// ========== المراجع ==========
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");

// ========== UID المسؤول (استبدله بـ UID الصحيح من Firebase Console) ==========
const ADMIN_UID = "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2";

// ========== تصدير المتغيرات للنطاق العام (مهم جداً!) ==========
window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;   // ← هذا السطر هو الحل

console.log("✅ Firebase config loaded. ADMIN_UID:", ADMIN_UID);
