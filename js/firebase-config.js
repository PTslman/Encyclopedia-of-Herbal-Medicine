const firebaseConfig = {
    apiKey: "AIzaSyB634alkmrWFHIZrAo90oi9nTpMjwR3gXU",
    authDomain: "harb-f6240.firebaseapp.com",
    projectId: "harb-f6240",
    storageBucket: "harb-f6240.firebasestorage.app",
    messagingSenderId: "798448784800",
    appId: "1:798448784800:web:459459715617c4c1a980c5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const settings = { ignoreUndefinedProperties: true, merge: true };
db.settings(settings);

db.enablePersistence({ synchronizeTabs: true })
    .then(function () {
        console.log("تم تفعيل التخزين المحلي والمزامنة بين التبويبات");
    })
    .catch(function (err) {
        if (err.code === 'failed-precondition') {
            console.warn("فشل تفعيل persistence: عدة علامات تبويب مفتوحة");
        } else if (err.code === 'unimplemented') {
            console.warn("المتصفح لا يدعم persistence");
        } else {
            console.error("خطأ غير متوقع في enablePersistence:", err);
        }
    });

const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");
const ADMIN_UID = "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2";
