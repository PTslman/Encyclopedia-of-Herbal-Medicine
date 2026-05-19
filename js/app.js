// ========== التشغيل الرئيسي للتطبيق ==========

// ربط دوال التقدم
window.setUpdateProgressCallback(window.updateProgress);

// عداد الزوار
class VisitorCounter {
    static init() {
        let count = parseInt(localStorage.getItem('visitor_count') || '0');
        count++;
        localStorage.setItem('visitor_count', count);
        localStorage.setItem('last_visit_date', new Date().toLocaleDateString('ar-EG'));
    }
    
    static getStats() {
        return {
            visits: localStorage.getItem('visitor_count') || 1,
            lastVisit: localStorage.getItem('last_visit_date') || 'غير معروف'
        };
    }
}

// دوال الزوار
function showVisitorStats() {
    const stats = VisitorCounter.getStats();
    alert(`📊 إحصائيات سريعة:\n👥 عدد زياراتك: ${stats.visits}\n🌿 عدد الأعشاب: ${window.herbs().length}\n📂 عدد التصنيفات: ${window.categories().length}\n📅 آخر زيارة: ${stats.lastVisit}`);
}

function showQuickHelp() {
    alert(`📖 دليل سريع لاستخدام الموسوعة:
🔍 بحث: اضغط على زر "بحث" لكتابة اسم العشبة
📂 التصنيفات: اضغط على أي تصنيف لعرض أعشابه
🌿 الأعشاب: اضغط على أي عشبة لرؤية التفاصيل كاملة
🌙/☀️: يمكنك تغيير المظهر من زر القمر/الشمس
🔊 يمكنك تغيير حجم الخط من زر "Aa"
📞 للتواصل المباشر: اضغط على زر واتساب
📲 لتثبيت التطبيق: اضغط على زر التحميل (إن وجد)`);
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'موسوعة الأعشاب الطبية',
            text: 'استكشف فوائد وأضرار الأعشاب الطبية',
            url: window.location.href
        }).catch(() => console.log('تم إلغاء المشاركة'));
    } else {
        copyToClipboard(window.location.href).then(success => {
            alert(success ? 'تم نسخ الرابط' : 'فشل نسخ الرابط');
        });
    }
}

function showVisitorCategories() {
    const cats = window.categories();
    if (cats.length === 0) {
        alert("لا توجد تصنيفات حالياً");
        return;
    }
    
    let listHtml = '';
    for (const cat of cats) {
        const count = window.herbs().filter(h => h.categoryId === cat.id).length;
        listHtml += `
            <div class="category-item" data-cat-id="${cat.id}" style="cursor:pointer;">
                <div class="category-name-display">
                    <i class="fas fa-folder"></i> ${escapeHtml(cat.name)}
                    <span style="background:var(--primary);color:white;padding:2px 8px;border-radius:30px;">${count}</span>
                </div>
                <i class="fas fa-chevron-left"></i>
            </div>
        `;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-glass active';
    modal.innerHTML = `
        <div class="modal-glass-content" style="max-width:500px;">
            <div class="modal-header">
                <h3>📂 جميع التصنيفات</h3>
                <div class="close-modal-btn" onclick="this.closest('.modal-glass').classList.remove('active')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div style="max-height:400px;overflow-y:auto;">${listHtml}</div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="this.closest('.modal-glass').classList.remove('active')">إغلاق</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            const catId = item.dataset.catId;
            modal.classList.remove('active');
            setTimeout(() => showCategoryHerbs(catId), 100);
        });
    });
}

// تقرير النظام للمسؤول
function showSystemReport() {
    const lastCache = loadFromLocalCache('herbal_cache_v4');
    const lastCacheDate = lastCache?.timestamp ? new Date(lastCache.timestamp).toLocaleString() : 'لا يوجد';
    
    const report = {
        'عدد الأعشاب': window.herbs().length,
        'عدد التصنيفات': window.categories().length,
        'حالة المزامنة': window.isSyncActive ? 'نشطة' : 'متوقفة',
        'المستخدم مسؤول': window.isAdmin(),
        'آخر تحديث للكاش': lastCacheDate,
        'حالة الاتصال': isOnline() ? 'متصل' : 'غير متصل'
    };
    
    let reportText = '📋 تقرير النظام:\n';
    for (const [key, value] of Object.entries(report)) {
        reportText += `${key}: ${value}\n`;
    }
    alert(reportText);
}

// تنظيف الكاش
function clearCache() {
    if (confirm('⚠️ هل أنت متأكد من مسح الكاش المحلي؟ سيتم إعادة تحميل الصفحة.')) {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
            caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
        }
        alert('تم مسح الكاش، سيتم إعادة تحميل التطبيق');
        location.reload();
    }
}

// تهيئة المستمعين
function initEventListeners() {
    // أزرار المسؤول
    document.getElementById('addHerbBtn')?.addEventListener('click', showAddHerb);
    document.getElementById('manageCategoriesBtn')?.addEventListener('click', showCategoryManager);
    document.getElementById('backupBtn')?.addEventListener('click', backupJSON);
    document.getElementById('restoreBtn')?.addEventListener('click', restoreJSON);
    document.getElementById('restoreFile')?.addEventListener('change', handleRestore);
    document.getElementById('deleteAllBtn')?.addEventListener('click', () => document.getElementById('deleteAllConfirmModal').classList.add('active'));
    document.getElementById('deleteAllHerbsOnlyBtn')?.addEventListener('click', deleteAllHerbsOnly);
    document.getElementById('stopSyncBtn')?.addEventListener('click', stopRealtimeUpdates);
    document.getElementById('startSyncBtn')?.addEventListener('click', restartRealtimeUpdates);
    document.getElementById('resetSyncBtn')?.addEventListener('click', resetSync);
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => exportToCSV(window.herbs(), 'herbs'));
    document.getElementById('requestNotifyBtn')?.addEventListener('click', requestNotificationPermission);
    document.getElementById('clearCacheBtn')?.addEventListener('click', clearCache);
    document.getElementById('systemReportBtn')?.addEventListener('click', showSystemReport);
    document.getElementById('copyAppLinkBtn')?.addEventListener('click', () => copyToClipboard(window.location.href).then(() => alert('تم نسخ الرابط')));
    
    // أزرار عامة
    document.getElementById('refreshDataBtn')?.addEventListener('click', manualRefresh);
    document.getElementById('searchBtn')?.addEventListener('click', showSearch);
    document.getElementById('lockIcon')?.addEventListener('click', () => document.getElementById('loginModal').classList.add('active'));
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('whatsappBtn')?.addEventListener('click', () => openWhatsApp());
    document.getElementById('fontSizeToggleBtn')?.addEventListener('click', cycleFontSize);
    
    // أزرار الزوار
    document.getElementById('visitorCategoriesBtn')?.addEventListener('click', showVisitorCategories);
    document.getElementById('shareAppBtn')?.addEventListener('click', shareApp);
    document.getElementById('visitorStatsBtn')?.addEventListener('click', showVisitorStats);
    document.getElementById('quickHelpBtn')?.addEventListener('click', showQuickHelp);
    document.getElementById('visitorResyncBtn')?.addEventListener('click', () => forceFetchFromServer());
    document.getElementById('visitorClearTempBtn')?.addEventListener('click', clearCache);
    
    // أزرار المودالات
    document.getElementById('closeSearchModalBtn')?.addEventListener('click', () => document.getElementById('searchModal').classList.remove('active'));
    document.getElementById('searchInput')?.addEventListener('input', performSearch);
    document.getElementById('closeCategoryModalBtn')?.addEventListener('click', () => document.getElementById('categoryModal').classList.remove('active'));
    document.getElementById('addCategoryBtn')?.addEventListener('click', addNewCategory);
    document.getElementById('closeHerbModalBtn')?.addEventListener('click', () => document.getElementById('herbModal').classList.remove('active'));
    document.getElementById('cancelHerbModalBtn')?.addEventListener('click', () => document.getElementById('herbModal').classList.remove('active'));
    document.getElementById('saveHerbModalBtn')?.addEventListener('click', saveHerb);
    document.getElementById('closeDetailModalBtn')?.addEventListener('click', () => document.getElementById('detailModal').classList.remove('active'));
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => document.getElementById('deleteModal').classList.remove('active'));
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
    document.getElementById('cancelDeleteAllBtn')?.addEventListener('click', () => document.getElementById('deleteAllConfirmModal').classList.remove('active'));
    document.getElementById('confirmDeleteAllBtn')?.addEventListener('click', async () => {
        document.getElementById('deleteAllConfirmModal').classList.remove('active');
        await deleteAll();
    });
    document.getElementById('cancelLoginBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.remove('active'));
    document.getElementById('confirmLoginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const result = await login(email, password);
        alert(result.message);
        if (result.success) {
            document.getElementById('loginModal').classList.remove('active');
            document.getElementById('adminPassword').value = '';
        }
    });
    
    // رفع الصورة
    document.getElementById('uploadImageBtn')?.addEventListener('click', () => document.getElementById('herbImageInput').click());
    document.getElementById('herbImageInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            currentImageFile = file;
            const compressed = await compressImage(file, 800, 0.8);
            currentImageBase64 = compressed;
            document.getElementById('imagePreviewContainer').innerHTML = `<img src="${compressed}" class="herb-image-preview" onclick="document.getElementById('herbImageInput').click()">`;
            document.getElementById('clearImageBtn').style.display = 'inline-flex';
        }
    });
    document.getElementById('clearImageBtn')?.addEventListener('click', () => {
        currentImageBase64 = null;
        currentImageFile = null;
        document.getElementById('herbImageInput').value = '';
        document.getElementById('imagePreviewContainer').innerHTML = '';
        document.getElementById('clearImageBtn').style.display = 'none';
    });
    
    // تبديل العرض
    document.getElementById('viewToggle')?.addEventListener('click', (e) => {
        if (e.target.dataset.view) {
            currentView = e.target.dataset.view;
            renderContent();
            updateViewToggle(currentView);
        }
    });
}

// تشغيل التطبيق
async function startApp() {
    console.log('🚀 بدء تشغيل التطبيق...');
    
    // التهيئات
    initTheme();
    initAuthListener();
    VisitorCounter.init();
    registerServiceWorker();
    setupPWAInstall();
    setupConnectionAlerts();
    startPerformanceGuardian();
    cleanOldCache();
    
    // تحميل البيانات
    await initialLoad();
    
    // بدء المزامنة
    startRealtimeUpdates();
    
    // طلب الإشعارات بعد 5 ثوانٍ
    setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            requestNotificationPermission();
        }
    }, 5000);
    
    // تهيئة المستمعين
    initEventListeners();
    
    // تحسينات إضافية
    setTimeout(() => {
        lazyLoadImages();
        optimizeForWeakDevices();
        checkPWAStatus();
    }, 1000);
    
    console.log('✅ التطبيق جاهز للاستخدام');
}

// بدء التطبيق عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

// معالج شاشة البداية (يتم بعد تحميل DOM)
smartSplashHandler();
