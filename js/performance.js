// ========== تحسينات الأداء ==========

// إدارة مؤشر التقدم
let progressFill = null;
let progressPercent = null;
let progressStage = null;
let progressStatus = null;
let progressTimer = null;

function initProgressElements() {
    progressFill = document.getElementById('inlineProgressFill');
    progressPercent = document.getElementById('inlineProgressText');
}

function updateProgress(percent, stage, status, loaded, total) {
    if (!progressFill) initProgressElements();
    
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressPercent) progressPercent.innerText = `${Math.floor(percent)}%`;
    
    // إظهار المؤشر تلقائياً
    const indicator = document.getElementById('inlineProgressIndicator');
    if (indicator && indicator.classList.contains('hidden')) {
        indicator.classList.remove('hidden');
    }
    
    // إخفاء المؤشر بعد اكتمال التحميل
    if (percent >= 100 || stage === 'اكتمل' || stage === 'تم') {
        if (progressTimer) clearTimeout(progressTimer);
        progressTimer = setTimeout(() => {
            if (indicator) indicator.classList.add('hidden');
        }, 1000);
    }
}

// تحميل أولي ذكي
async function initialLoad() {
    updateProgress(5, 'بدء التحميل', 'جلب البيانات...');
    
    // محاولة تحميل من الكاش أولاً
    const cached = loadFromLocalCache('herbal_cache_v4');
    if (cached && cached.categories && cached.herbs) {
        window.categories = () => cached.categories;
        window.herbs = () => cached.herbs;
        renderContent();
        updateProgress(50, 'من الكاش', 'تم تحميل البيانات المخزنة محلياً');
    }
    
    // محاولة التحديث من السيرفر
    if (isOnline()) {
        try {
            await forceFetchFromServer();
            updateProgress(100, 'اكتمل', 'تم تحديث البيانات');
        } catch (error) {
            console.error('Initial load error:', error);
            updateProgress(100, 'خطأ', 'فشل التحميل من السيرفر');
        }
    } else {
        updateProgress(100, 'غير متصل', 'تعمل على البيانات المحفوظة');
    }
}

// إدارة حجم الخط
let currentFontLevel = localStorage.getItem('fontLevel') || 'normal';

function setFontSize(level) {
    document.body.classList.remove('font-large', 'font-xlarge');
    if (level === 'large') document.body.classList.add('font-large');
    if (level === 'xlarge') document.body.classList.add('font-xlarge');
    
    localStorage.setItem('fontLevel', level);
    
    const labels = { normal: 'عادي', large: 'كبير', xlarge: 'أكبر' };
    const labelSpan = document.getElementById('fontSizeLabel');
    if (labelSpan) labelSpan.innerText = labels[level];
    
    currentFontLevel = level;
}

function cycleFontSize() {
    const levels = ['normal', 'large', 'xlarge'];
    const idx = levels.indexOf(currentFontLevel);
    const next = levels[(idx + 1) % levels.length];
    setFontSize(next);
}

// إدارة الثيم
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateModeText();
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateModeText();
}

function updateModeText() {
    const modeText = document.getElementById('modeText');
    if (modeText) {
        modeText.innerText = document.body.classList.contains('dark-mode') ? 'ليلي' : 'نهاري';
    }
}

// مراقب الأداء الخفي
class PerformanceGuardian {
    constructor() {
        this.memoryThreshold = 150 * 1024 * 1024;
        this.checkInterval = 30000;
        this.intervalId = null;
        this.start();
    }
    
    start() {
        this.intervalId = setInterval(() => this.check(), this.checkInterval);
    }
    
    check() {
        // فحص استخدام الذاكرة
        if (performance.memory && performance.memory.usedJSHeapSize > this.memoryThreshold) {
            console.warn('⚠️ تجاوز حد الذاكرة');
            this.cleanMemory();
        }
        
        // فحص حالة المزامنة
        if (window.isSyncActive && (!window.unsubscribeHerbs || !window.unsubscribeCategories)) {
            console.warn('⚠️ فقدان مستمعي Firebase');
            if (window.startRealtimeUpdates) window.startRealtimeUpdates();
        }
    }
    
    cleanMemory() {
        // إزالة الصور خارج الشاشة
        const images = document.querySelectorAll('.herb-card-image');
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.top > window.innerHeight + 200) {
                const src = img.src;
                if (src && !src.startsWith('data:')) {
                    img.removeAttribute('src');
                    img.setAttribute('data-src', src);
                }
            }
        });
        
        // تنظيف البيانات المؤقتة
        if (window.currentImageBase64 && window.currentImageBase64.length > 50000) {
            window.currentImageBase64 = null;
        }
        if (window.currentImageFile) window.currentImageFile = null;
    }
}

// تحميل الصور بتكاسل
function lazyLoadImages() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '100px', threshold: 0.01 });
    
    document.querySelectorAll('.herb-card-image[data-src]').forEach(img => {
        observer.observe(img);
    });
}

// تحسين للأجهزة الضعيفة
function optimizeForWeakDevices() {
    if ('connection' in navigator && navigator.connection) {
        if (navigator.connection.saveData) {
            document.body.classList.add('save-data-mode');
            const style = document.createElement('style');
            style.textContent = `
                .herb-card, .category-card { transition: none !important; box-shadow: none !important; }
                .herb-card:hover, .category-card:hover { transform: none !important; }
            `;
            document.head.appendChild(style);
        }
    }
}

// معالج شاشة البداية الذكي
function smartSplashHandler() {
    const splash = document.getElementById('splashScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (!splash || !mainApp) return;
    
    let isHidden = false;
    
    function hideSplash() {
        if (isHidden) return;
        isHidden = true;
        splash.classList.add('hide');
        mainApp.style.display = 'block';
    }
    
    // مهلة قصوى 3 ثوانٍ
    setTimeout(() => {
        if (!isHidden) {
            console.warn('⚠️ انتهت مهلة شاشة البداية، إخفاء قسراً');
            hideSplash();
        }
    }, 3000);
    
    // مراقبة اكتمال التحميل
    const checkInterval = setInterval(() => {
        const hasData = (window.herbs && window.herbs().length > 0) || 
                       (window.categories && window.categories().length > 0);
        if (hasData && !isHidden) {
            clearInterval(checkInterval);
            setTimeout(hideSplash, 100);
        }
    }, 100);
}

// تنبيهات الاتصال
function setupConnectionAlerts() {
    window.addEventListener('online', () => {
        console.log('🟢 الاتصال بالإنترنت عاد');
        const toast = document.createElement('div');
        toast.textContent = '✅ تم استعادة الاتصال بالإنترنت';
        toast.style.cssText = 'position:fixed;bottom:80px;left:20px;right:20px;background:#4caf50;color:white;padding:10px;border-radius:30px;text-align:center;z-index:9999;font-size:0.9rem;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        
        if (window.forceFetchFromServer) window.forceFetchFromServer();
    });
    
    window.addEventListener('offline', () => {
        console.log('🔴 فقدان الاتصال بالإنترنت');
        const toast = document.createElement('div');
        toast.textContent = '🔴 لا يوجد اتصال بالإنترنت. يتم عرض البيانات المخزنة محلياً';
        toast.style.cssText = 'position:fixed;bottom:80px;left:20px;right:20px;background:#c62828;color:white;padding:10px;border-radius:30px;text-align:center;z-index:9999;font-size:0.9rem;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    });
}

// تنظيف الكاش القديم
function cleanOldCache() {
    const CACHE_CLEAN_KEY = 'last_cache_clean';
    const lastClean = localStorage.getItem(CACHE_CLEAN_KEY);
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    
    if (!lastClean || Date.now() - parseInt(lastClean) > ONE_WEEK) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('herbal_cache') || key === 'adminActionLog')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item.timestamp && Date.now() - item.timestamp > ONE_WEEK * 2) {
                        keysToRemove.push(key);
                    }
                } catch(e) {}
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        localStorage.setItem(CACHE_CLEAN_KEY, Date.now().toString());
    }
}

// تصدير التحسينات
window.updateProgress = updateProgress;
window.initialLoad = initialLoad;
window.setFontSize = setFontSize;
window.cycleFontSize = cycleFontSize;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.setupConnectionAlerts = setupConnectionAlerts;
window.smartSplashHandler = smartSplashHandler;
window.lazyLoadImages = lazyLoadImages;
window.optimizeForWeakDevices = optimizeForWeakDevices;
window.cleanOldCache = cleanOldCache;

// بدء المراقب
let performanceGuardian = null;

function startPerformanceGuardian() {
    if (!performanceGuardian) {
        performanceGuardian = new PerformanceGuardian();
    }
}