// ========== إدارة المصادقة ==========

let isAdmin = false;

// التحقق من حالة المصادقة
function initAuthListener() {
    auth.onAuthStateChanged(user => {
        const isAdminUser = user && user.uid === ADMIN_UID;
        setAdminMode(isAdminUser);
    });
}

// تعيين وضع المسؤول
function setAdminMode(adminStatus) {
    isAdmin = adminStatus;
    
    // تحديث ظهور عناصر المسؤول
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = adminStatus ? 'inline-flex' : 'none';
    });
    
    // تحديث أيقونة القفل
    const lockIcon = document.getElementById('lockIcon');
    if (lockIcon) {
        lockIcon.innerHTML = adminStatus ? '<i class="fas fa-lock-open"></i>' : '<i class="fas fa-lock"></i>';
    }
    
    // تحديث وضع الزائر
    const visitorElements = document.querySelectorAll('.visitor-only');
    visitorElements.forEach(el => {
        el.style.display = adminStatus ? 'none' : 'flex';
    });
    
    document.body.classList.toggle('viewer-mode', !adminStatus);
    
    // إعادة عرض المحتوى
    if (window.renderContent) window.renderContent();
    
    // بدء ساعة المسؤول إذا كان مسؤولاً
    if (adminStatus && window.startAdminClock) {
        window.startAdminClock();
    }
}

// تسجيل الدخول
async function login(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        if (userCredential.user.uid === ADMIN_UID) {
            setAdminMode(true);
            return { success: true, message: 'مرحباً أيها المسؤول' };
        } else {
            await auth.signOut();
            return { success: false, message: 'هذا الحساب ليس لديه صلاحيات المسؤول' };
        }
    } catch (error) {
        let message = 'فشل تسجيل الدخول';
        if (error.code === 'auth/invalid-credential') {
            message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'تم تعطيل الحساب مؤقتاً. حاول لاحقاً';
        } else {
            message = error.message;
        }
        return { success: false, message };
    }
}

// تسجيل الخروج
function logout() {
    auth.signOut();
    setAdminMode(false);
    return { success: true, message: 'تم تسجيل الخروج' };
}

// التحقق من صلاحية المسؤول
function checkAdminAccess() {
    return isAdmin;
}

// ساعة المسؤول
let adminClockInterval = null;

function startAdminClock() {
    if (adminClockInterval) clearInterval(adminClockInterval);
    
    const clockSpan = document.querySelector('#adminClock span');
    if (!clockSpan) return;
    
    adminClockInterval = setInterval(() => {
        const now = new Date();
        clockSpan.innerText = now.toLocaleTimeString('ar-EG');
    }, 1000);
}

function stopAdminClock() {
    if (adminClockInterval) {
        clearInterval(adminClockInterval);
        adminClockInterval = null;
    }
}

// Export to window
window.isAdmin = () => isAdmin;
window.initAuthListener = initAuthListener;
window.login = login;
window.logout = logout;
window.checkAdminAccess = checkAdminAccess;
window.startAdminClock = startAdminClock;
window.stopAdminClock = stopAdminClock;