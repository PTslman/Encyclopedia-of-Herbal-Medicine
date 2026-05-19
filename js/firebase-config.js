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
} else {
    console.log("⚠️ Firebase already initialized");
}

const db = firebase.firestore();
const auth = firebase.auth();

// إعدادات Firestore
db.settings({
    ignoreUndefinedProperties: true,
    merge: true,
    cacheSizeBytes: 50 * 1024 * 1024
});

// تفعيل التخزين المحلي
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log("✅ Offline persistence enabled"))
    .catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn("⚠️ Multiple tabs open, persistence disabled");
        } else if (err.code === 'unimplemented') {
            console.warn("⚠️ Browser does not support persistence");
        }
    });

const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");

// ⚠️ IMPORTANT: استبدل هذا الـ UID بـ UID المستخدم المسؤول الفعلي من Firebase Console
// اذهب إلى Firebase Console -> Authentication -> Users -> انسخ UID
const ADMIN_UID = "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2"; // <- غيّر هذا إلى UID الصحيح

// دالة للتحقق من صلاحيات المسؤول
function isUserAdmin(user) {
    return user && user.uid === ADMIN_UID;
}

window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;
window.isUserAdmin = isUserAdmin;

console.log("✅ Firebase config loaded. ADMIN_UID:", ADMIN_UID);
