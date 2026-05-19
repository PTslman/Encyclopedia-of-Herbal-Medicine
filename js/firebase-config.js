// ========== إعدادات Firebase ==========
const firebaseConfig = {
    apiKey: "AIzaSyB634alkmrWFHIZrAo90oi9nTpMjwR3gXU",
    authDomain: "harb-f6240.firebaseapp.com",
    projectId: "harb-f6240",
    storageBucket: "harb-f6240.firebasestorage.app",
    messagingSenderId: "798448784800",
    appId: "1:798448784800:web:459459715617c4c1a980c5"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// إعدادات Firestore المحسنة
const db = firebase.firestore();
const auth = firebase.auth();

// إعدادات قاعدة البيانات
db.settings({
    ignoreUndefinedProperties: true,
    cacheSizeBytes: 50 * 1024 * 1024 // 50 MB cache
});

// تفعيل التخزين المحلي مع معالجة الأخطاء
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log('✅ Offline persistence enabled'))
    .catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn('⚠️ Multiple tabs open, persistence disabled');
        } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Browser does not support persistence');
        } else {
            console.error('❌ Persistence error:', err);
        }
    });

// المجموعات
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");

// UID المسؤول (يجب استبداله بـ UID الخاص بحساب المسؤول في Firebase)
// يمكنك الحصول عليه من Firebase Console -> Authentication -> Users
const ADMIN_UID = "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2";

// تصدير للمتغيرات العامة
window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;

console.log('✅ Firebase configuration loaded');
