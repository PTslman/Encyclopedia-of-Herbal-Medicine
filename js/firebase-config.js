// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB634alkmrWFHIZrAo90oi9nTpMjwR3gXU",
    authDomain: "harb-f6240.firebaseapp.com",
    projectId: "harb-f6240",
    storageBucket: "harb-f6240.firebasestorage.app",
    messagingSenderId: "798448784800",
    appId: "1:798448784800:web:459459715617c4c1a980c5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore with optimized settings
const db = firebase.firestore();
const auth = firebase.auth();

// Optimize Firestore settings
db.settings({
    ignoreUndefinedProperties: true,
    cacheSizeBytes: 50 * 1024 * 1024 // 50 MB cache
});

// Enable offline persistence with error handling
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log('✅ Offline persistence enabled'))
    .catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn('⚠️ Multiple tabs open, persistence disabled');
        } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Browser doesn\'t support persistence');
        } else {
            console.error('❌ Persistence error:', err);
        }
    });

// Collections
const categoriesCol = db.collection("categories");
const herbsCol = db.collection("herbs");

// Admin UID (replace with actual admin user UID)
const ADMIN_UID = "VwPJ3q2ElUbPmrZR1XyHv1wiI8p2";

// Export for other modules
window.db = db;
window.auth = auth;
window.categoriesCol = categoriesCol;
window.herbsCol = herbsCol;
window.ADMIN_UID = ADMIN_UID;