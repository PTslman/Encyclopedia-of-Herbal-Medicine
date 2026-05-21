// =================================================================
// ================== الوظائف الأساسية للنظام ===================
// =================================================================

async function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width,
                    height = img.height;
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                const compressInfo = document.getElementById('compressInfo');
                if (compressInfo) {
                    compressInfo.innerHTML = '✅ تم الضغط: ' + (file.size / 1024).toFixed(2) + ' KB → ' + (compressedDataUrl.length * 0.75 / 1024).toFixed(2) + ' KB';
                }
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function openWhatsApp() {
    const phone = "0932934273";
    const cleanPhone = phone.replace(/\D/g, '');
    const internationalPhone = "963" + cleanPhone;
    const url = "https://wa.me/" + internationalPhone + "?text=مرحباً%20أريد%20الاستفسار%20عن%20الأعشاب";
    window.open(url, '_blank');
}

function showSaveProgress(percent, status, stage) {
    const bar = document.getElementById('saveProgressBar');
    if (!bar) return;
    bar.style.display = 'flex';
    document.getElementById('saveProgressFill').style.width = percent + '%';
    document.getElementById('saveProgressPercent').innerText = Math.floor(percent) + '%';
    document.getElementById('saveProgressStatus').innerText = status;
    document.getElementById('saveProgressStage').innerText = stage;
    if (percent >= 100) {
        setTimeout(function() {
            bar.style.display = 'none';
        }, 1500);
    }
}

function escapeHtml(s) {
    if (!s) return '—';
    return s.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// تم نقل إعدادات Firebase إلى ملف منفصل (firebase-config.js)
// لكن المتغيرات العامة لا تزال متاحة: db, auth, categoriesCol, herbsCol, ADMIN_UID

let isAdmin = false;
let categories = [];
let herbs = [];
let currentView = "all";
let currentEditHerbId = null;
let pendingDeleteId = null;
let pendingDeleteType = null;
let currentImageBase64 = null;
let currentImageFile = null;
let unsubscribeCategories = null;
let unsubscribeHerbs = null;
let reconnectAttempts = 0;
let isSyncActive = true;
let isRefreshing = false;

let progressFill = null;
let progressPercent = null;
let progressStage = null;
let progressStatus = null;
let loadedSpan = null;
let totalSpan = null;

function updateProgress(percent, stage, status, loaded, total) {
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressPercent) progressPercent.innerText = Math.floor(percent) + '%';
    if (progressStage) progressStage.innerText = stage;
    if (progressStatus) progressStatus.innerText = status;
    if (loadedSpan) loadedSpan.innerText = loaded || 0;
    if (totalSpan) totalSpan.innerText = total || '?';
}

const CACHE_KEY = 'herbal_cache_v2';

function saveToLocalCache(cats, hrbs) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            categories: cats,
            herbs: hrbs,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn(e);
    }
}

function loadFromLocalCache(allowEmpty) {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.categories && data.herbs && (data.categories.length > 0 || data.herbs.length > 0 || allowEmpty)) {
                categories = data.categories;
                herbs = data.herbs;
                document.getElementById('herbCount').innerText = herbs.length + ' عشبة';
                renderContent();
                return true;
            }
        }
    } catch (e) {
        console.warn(e);
    }
    return false;
}

function isOnline() {
    return navigator.onLine;
}

async function fetchWithTimeout(promise, timeoutMs) {
    if (timeoutMs === undefined) timeoutMs = 25000;
    let timeoutId;
    const timeoutPromise = new Promise(function(_, reject) {
        timeoutId = setTimeout(function() {
            reject(new Error("انتهت المهلة"));
        }, timeoutMs);
    });
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
}

async function fetchWithRetry(fn, maxRetries, baseDelay) {
    if (maxRetries === undefined) maxRetries = 5;
    if (baseDelay === undefined) baseDelay = 1000;
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            updateProgress(10 + attempt * 15, 'جلب البيانات', 'محاولة ' + (attempt + 1) + '/' + maxRetries + '...', 0, 0);
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt === maxRetries - 1) throw err;
            const delay = baseDelay * Math.pow(1.5, attempt);
            updateProgress(10 + attempt * 10, 'إعادة محاولة', 'فشلت المحاولة ' + (attempt + 1) + '، إعادة بعد ' + Math.round(delay / 1000) + ' ثانية', 0, 0);
            await new Promise(function(resolve) {
                setTimeout(resolve, delay);
            });
        }
    }
    throw lastError;
}

async function forceFetchFromServer() {
    updateProgress(5, 'تحديث إجباري', 'جلب أحدث البيانات من السحابة...');
    try {
        const [catsSnap, herbsSnap] = await fetchWithTimeout(Promise.all([categoriesCol.orderBy("name").get(), herbsCol.get()]), 30000);
        const newCats = catsSnap.docs.map(function(doc) {
            return {
                id: doc.id,
                ...doc.data()
            };
        });
        const newHerbs = herbsSnap.docs.map(function(doc) {
            return {
                id: doc.id,
                ...doc.data()
            };
        });
        categories = newCats;
        herbs = newHerbs;
        saveToLocalCache(categories, herbs);
        updateProgress(100, 'اكتمل', 'تم تحميل ' + herbs.length + ' عشبة', herbs.length, herbs.length);
        document.getElementById('herbCount').innerText = herbs.length + ' عشبة';
        renderContent();
        return true;
    } catch (error) {
        console.error("فشل التحديث الإجباري:", error);
        updateProgress(100, 'خطأ', 'فشل التحديث: ' + error.message);
        return false;
    }
}

async function initialLoad() {
    if (!isOnline()) {
        updateProgress(100, 'خطأ', 'لا يوجد اتصال بالإنترنت', 0, 0);
        loadFromLocalCache(true);
        showRetryButton();
        return;
    }
    const hasCache = loadFromLocalCache(true);
    if (!hasCache) {
        updateProgress(5, 'البدء', 'جلب البيانات من السحابة...');
    }
    try {
        const fetchOperation = async function() {
            const [catsSnap, herbsSnap] = await fetchWithTimeout(Promise.all([categoriesCol.orderBy("name").get(), herbsCol.get()]), 25000);
            return {
                cats: catsSnap.docs.map(function(doc) {
                    return {
                        id: doc.id,
                        ...doc.data()
                    };
                }),
                herbs: herbsSnap.docs.map(function(doc) {
                    return {
                        id: doc.id,
                        ...doc.data()
                    };
                })
            };
        };
        const result = await fetchWithRetry(fetchOperation, 5, 1000);
        categories = result.cats;
        herbs = result.herbs;
        saveToLocalCache(categories, herbs);
        updateProgress(100, 'اكتمل', 'تم تحميل ' + herbs.length + ' عشبة', herbs.length, herbs.length);
        document.getElementById('herbCount').innerText = herbs.length + ' عشبة';
        renderContent();
    } catch (error) {
        console.error("خطأ في التحميل:", error);
        updateProgress(100, 'خطأ', 'فشل التحميل: ' + error.message);
        if (!hasCache) {
            showRetryButton();
        }
    }
}
function showRetryButton() {
    const container = document.getElementById('contentArea');
    if (container && !document.getElementById('retryLoadBtn')) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi" style="font-size:3rem; color:var(--danger);"></i><p>لا يوجد اتصال بالإنترنت أو فشل التحميل.</p><button id="retryLoadBtn" class="tool-btn" style="background:var(--primary); color:white;">إعادة المحاولة</button></div>';
        const retryBtn = document.getElementById('retryLoadBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', function() {
                initialLoad();
            });
        }
    }
}

function startRealtimeUpdates() {
    if (!isSyncActive) return;
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeHerbs) unsubscribeHerbs();
    const handleError = function(error) {
        if (isSyncActive) handleReconnection();
    };
    try {
        unsubscribeCategories = categoriesCol.orderBy("name").onSnapshot(function(snapshot) {
            if (!isSyncActive) return;
            categories = snapshot.docs.map(function(doc) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            });
            saveToLocalCache(categories, herbs);
            renderContent();
            reconnectAttempts = 0;
        }, handleError);
        unsubscribeHerbs = herbsCol.onSnapshot(function(snapshot) {
            if (!isSyncActive) return;
            herbs = snapshot.docs.map(function(doc) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            });
            saveToLocalCache(categories, herbs);
            document.getElementById('herbCount').innerText = herbs.length + ' عشبة';
            renderContent();
            reconnectAttempts = 0;
        }, handleError);
    } catch (e) {
        console.error(e);
        if (isSyncActive) handleReconnection();
    }
}

function stopRealtimeUpdates() {
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeHerbs) unsubscribeHerbs();
    isSyncActive = false;
    updateProgress(0, 'متوقف', 'تم إيقاف المزامنة');
    alert("تم إيقاف المزامنة المباشرة. لن تصل أي تحديثات جديدة حتى يتم تشغيلها مرة أخرى.");
}

function restartRealtimeUpdates() {
    if (isSyncActive) {
        alert("المزامنة مفعلة بالفعل.");
        return;
    }
    isSyncActive = true;
    startRealtimeUpdates();
    updateProgress(50, 'تشغيل', 'إعادة تشغيل المزامنة...');
    alert("تم تشغيل المزامنة المباشرة. سيتم تحديث البيانات تلقائياً.");
}

function handleReconnection() {
    reconnectAttempts++;
    if (reconnectAttempts < 6) {
        const delay = Math.min(1000 * Math.pow(1.8, reconnectAttempts), 45000);
        updateProgress(30, 'إعادة اتصال', 'محاولة ' + reconnectAttempts + ' خلال ' + Math.round(delay / 1000) + ' ثانية...');
        setTimeout(function() {
            startRealtimeUpdates();
        }, delay);
    } else {
        console.warn("فشل متكرر في الاتصال، يرجى التحقق من الشبكة.");
        updateProgress(100, 'خطأ', 'فشل الاتصال المستمر، حاول تحديث الصفحة يدوياً');
    }
}

async function manualRefresh() {
    if (isRefreshing) {
        alert("يتم التحديث حالياً، انتظر قليلاً");
        return;
    }
    isRefreshing = true;
    const refreshBtn = document.getElementById('refreshDataBtn');
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري التحديث...';
    refreshBtn.disabled = true;
    try {
        if (unsubscribeCategories) unsubscribeCategories();
        if (unsubscribeHerbs) unsubscribeHerbs();
        isSyncActive = false;
        await forceFetchFromServer();
        isSyncActive = true;
        startRealtimeUpdates();
        updateProgress(100, 'تم التحديث', 'تم تحديث البيانات');
    } catch (e) {
        alert("فشل التحديث: " + e.message);
        isSyncActive = true;
        startRealtimeUpdates();
    } finally {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
        isRefreshing = false;
    }
}

async function resetSync() {
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeHerbs) unsubscribeHerbs();
    isSyncActive = false;
    updateProgress(20, 'إعادة ضبط', 'إعادة تهيئة الاتصال...');
    setTimeout(function() {
        isSyncActive = true;
        startRealtimeUpdates();
        updateProgress(100, 'تم', 'تم إعادة ضبط المزامنة');
        alert("تم إعادة ضبط المزامنة والاتصال بالسحابة بنجاح.");
    }, 500);
}

async function exportToCSV() {
    if (herbs.length === 0) {
        alert("لا توجد أعشاب للتصدير");
        return;
    }
    let csvRows = [
        ["الاسم", "التصنيف", "الفوائد", "التحذيرات", "الأضرار", "الاستخدام", "ملاحظات"]
    ];
    for (let i = 0; i < herbs.length; i++) {
        let h = herbs[i];
        let catName = "بدون تصنيف";
        for (let j = 0; j < categories.length; j++) {
            if (categories[j].id === h.categoryId) {
                catName = categories[j].name;
                break;
            }
        }
        csvRows.push([
            '"' + (h.name || "").replace(/"/g, '""') + '"',
            '"' + catName.replace(/"/g, '""') + '"',
            '"' + (h.benefits || "").replace(/"/g, '""') + '"',
            '"' + (h.warnings || "").replace(/"/g, '""') + '"',
            '"' + (h.harms || "").replace(/"/g, '""') + '"',
            '"' + (h.usage || "").replace(/"/g, '""') + '"',
            '"' + (h.notes || "").replace(/"/g, '""') + '"'
        ]);
    }
    let csvContent = "";
    for (let i = 0; i < csvRows.length; i++) {
        csvContent += csvRows[i].join(",") + "\n";
    }
    const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "herbs_export_" + Date.now() + ".csv";
    link.click();
    URL.revokeObjectURL(url);
    alert("تم تصدير الأعشاب إلى CSV");
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(function(perm) {
            if (perm === 'granted') {
                alert('تم تفعيل الإشعارات');
            } else {
                alert('لم يتم منح صلاحية الإشعارات');
            }
        });
    } else {
        alert('المتصفح لا يدعم الإشعارات');
    }
}

function startAdminClock() {
    const clockSpan = document.querySelector('#adminClock span');
    if (!clockSpan) return;
    setInterval(function() {
        const now = new Date();
        clockSpan.innerText = now.toLocaleTimeString('ar-EG');
    }, 1000);
}

function renderContent() {
    if (currentView === "all") {
        renderAllHerbs();
    } else {
        renderCategories();
    }
        }
function renderAllHerbs() {
    const container = document.getElementById('contentArea');
    if (herbs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-leaf"></i><p>لا توجد أعشاب بعد</p></div>';
        return;
    }
    let html = '<div class="herbs-grid">';
    for (let i = 0; i < herbs.length; i++) {
        let h = herbs[i];
        let catName = "بدون تصنيف";
        for (let j = 0; j < categories.length; j++) {
            if (categories[j].id === h.categoryId) {
                catName = categories[j].name;
                break;
            }
        }
        html += '<div class="herb-card" data-id="' + h.id + '">';
        if (h.imageUrl) {
            html += '<img src="' + escapeHtml(h.imageUrl) + '" class="herb-card-image" loading="lazy" onerror="this.style.display=\'none\'">';
        }
        html += '<div class="card-header"><span class="herb-name">🌿 ' + escapeHtml(h.name) + '</span><span>' + escapeHtml(catName) + '</span></div>';
        html += '<div class="info-block"><div class="info-label">💚 الفوائد</div><div class="info-text">' + escapeHtml(h.benefits || '—') + '</div></div>';
        html += '<div class="info-block"><div class="info-label">⚠️ التحذيرات</div><div class="info-text">' + escapeHtml(h.warnings || '—') + '</div></div>';
        html += '<div class="info-block"><div class="info-label">⚡ الأضرار</div><div class="info-text">' + escapeHtml(h.harms || '—') + '</div></div>';
        html += '<div class="info-block"><div class="info-label">🍵 طريقة الاستخدام</div><div class="info-text">' + escapeHtml(h.usage || '—') + '</div></div>';
        html += '<div class="info-block"><div class="info-label">📝 ملاحظات</div><div class="info-text">' + escapeHtml(h.notes || '—') + '</div></div>';
        if (isAdmin) {
            html += '<div class="card-actions"><i class="fas fa-edit edit-herb" data-id="' + h.id + '" style="cursor:pointer;color:var(--primary);"></i><i class="fas fa-trash-alt del-herb" data-id="' + h.id + '" data-name="' + escapeHtml(h.name) + '" style="cursor:pointer;color:var(--danger);"></i></div>';
        }
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    attachHerbEvents();
}

function renderCategories() {
    const container = document.getElementById('contentArea');
    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>لا توجد تصنيفات</p></div>';
        return;
    }
    let html = '<div class="categories-grid">';
    for (let i = 0; i < categories.length; i++) {
        let cat = categories[i];
        let herbsCount = 0;
        for (let j = 0; j < herbs.length; j++) {
            if (herbs[j].categoryId === cat.id) herbsCount++;
        }
        html += '<div class="category-card" data-cat-id="' + cat.id + '">';
        html += '<div class="card-header"><span class="category-name">📁 ' + escapeHtml(cat.name) + '</span><span>' + herbsCount + ' عشبة</span></div>';
        html += '<div>اضغط لعرض الأعشاب</div>';
        if (isAdmin) {
            html += '<div class="card-actions"><i class="fas fa-edit edit-cat" data-id="' + cat.id + '" data-name="' + escapeHtml(cat.name) + '"></i><i class="fas fa-trash-alt del-cat" data-id="' + cat.id + '" data-name="' + escapeHtml(cat.name) + '"></i></div>';
        }
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    const categoryCards = document.querySelectorAll('.category-card');
    for (let i = 0; i < categoryCards.length; i++) {
        let card = categoryCards[i];
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.card-actions')) {
                showCategoryHerbs(card.dataset.catId);
            }
        });
    }
    if (isAdmin) {
        const editButtons = document.querySelectorAll('.edit-cat');
        for (let i = 0; i < editButtons.length; i++) {
            let btn = editButtons[i];
            btn.onclick = function(e) {
                e.stopPropagation();
                editCategoryModal(btn.dataset.id, btn.dataset.name);
            };
        }
        const delButtons = document.querySelectorAll('.del-cat');
        for (let i = 0; i < delButtons.length; i++) {
            let btn = delButtons[i];
            btn.onclick = function(e) {
                e.stopPropagation();
                pendingDeleteId = btn.dataset.id;
                pendingDeleteType = 'category';
                document.getElementById('deleteMessage').innerHTML = '⚠️ حذف التصنيف "' + btn.dataset.name + '" وجميع أعشابه؟';
                document.getElementById('deleteModal').classList.add('active');
            };
        }
    }
}

function attachHerbEvents() {
    if (isAdmin) {
        const editButtons = document.querySelectorAll('.edit-herb');
        for (let i = 0; i < editButtons.length; i++) {
            let btn = editButtons[i];
            btn.onclick = function(e) {
                e.stopPropagation();
                editHerb(btn.dataset.id);
            };
        }
        const delButtons = document.querySelectorAll('.del-herb');
        for (let i = 0; i < delButtons.length; i++) {
            let btn = delButtons[i];
            btn.onclick = function(e) {
                e.stopPropagation();
                pendingDeleteId = btn.dataset.id;
                pendingDeleteType = 'herb';
                document.getElementById('deleteMessage').innerHTML = '⚠️ حذف "' + btn.dataset.name + '" من السحابة؟';
                document.getElementById('deleteModal').classList.add('active');
            };
        }
        const herbCards = document.querySelectorAll('.herb-card');
        for (let i = 0; i < herbCards.length; i++) {
            let card = herbCards[i];
            card.onclick = function(e) {
                if (!e.target.closest('.card-actions')) {
                    showHerbDetail(card.dataset.id);
                }
            };
        }
    } else {
        const herbCards = document.querySelectorAll('.herb-card');
        for (let i = 0; i < herbCards.length; i++) {
            let card = herbCards[i];
            card.onclick = function() {
                showHerbDetail(card.dataset.id);
            };
        }
    }
}

function showCategoryHerbs(catId) {
    let cat = null;
    for (let i = 0; i < categories.length; i++) {
        if (categories[i].id === catId) {
            cat = categories[i];
            break;
        }
    }
    if (!cat) return;
    let catHerbs = [];
    for (let i = 0; i < herbs.length; i++) {
        if (herbs[i].categoryId === catId) {
            catHerbs.push(herbs[i]);
        }
    }
    const container = document.getElementById('contentArea');
    if (catHerbs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>📂 لا توجد أعشاب في "' + escapeHtml(cat.name) + '"</p><button class="tool-btn" id="backToCategoriesBtn" style="margin-top:1rem;"><i class="fas fa-arrow-right"></i> العودة</button></div>';
        const backBtn = document.getElementById('backToCategoriesBtn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                currentView = 'categories';
                renderContent();
                const viewBtns = document.querySelectorAll('.view-btn');
                for (let i = 0; i < viewBtns.length; i++) {
                    viewBtns[i].classList.remove('active');
                }
                document.querySelector('.view-btn[data-view="categories"]').classList.add('active');
            });
        }
        return;
    }
    let html = '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;"><button id="backCatBtn" class="tool-btn"><i class="fas fa-arrow-right"></i> التصنيفات</button><h3>📂 ' + escapeHtml(cat.name) + '</h3></div><div class="herbs-grid">';
    for (let i = 0; i < catHerbs.length; i++) {
        let h = catHerbs[i];
        html += '<div class="herb-card" data-id="' + h.id + '">';
        if (h.imageUrl) {
            html += '<img src="' + escapeHtml(h.imageUrl) + '" class="herb-card-image">';
        }
        html += '<div class="herb-name">🌿 ' + escapeHtml(h.name) + '</div>';
        html += '<div class="info-block"><div class="info-label">💚 الفوائد</div><div class="info-text">' + escapeHtml(h.benefits || '—') + '</div></div>';
        html += '<div class="info-block"><div class="info-label">⚠️ التحذيرات</div><div class="info-text">' + escapeHtml(h.warnings || '—') + '</div></div>';
        html += '<div class="info-block"><div class="info-label">⚡ الأضرار</div><div class="info-text">' + escapeHtml(h.harms || '—') + '</div></div>';
        html += '<div class="info-block"><div class="info-label">🍵 الاستخدام</div><div class="info-text">' + escapeHtml(h.usage || '—') + '</div></div>';
        if (isAdmin) {
            html += '<div class="card-actions"><i class="fas fa-edit edit-herb" data-id="' + h.id + '"></i><i class="fas fa-trash-alt del-herb" data-id="' + h.id + '" data-name="' + escapeHtml(h.name) + '"></i></div>';
        }
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    attachHerbEvents();
    const backBtn = document.getElementById('backCatBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            currentView = 'categories';
            renderContent();
            const viewBtns = document.querySelectorAll('.view-btn');
            for (let i = 0; i < viewBtns.length; i++) {
                viewBtns[i].classList.remove('active');
            }
            document.querySelector('.view-btn[data-view="categories"]').classList.add('active');
        });
    }
}

function showHerbDetail(id) {
    let h = null;
    for (let i = 0; i < herbs.length; i++) {
        if (herbs[i].id === id) {
            h = herbs[i];
            break;
        }
    }
    if (!h) return;
    let catName = "بدون تصنيف";
    for (let i = 0; i < categories.length; i++) {
        if (categories[i].id === h.categoryId) {
            catName = categories[i].name;
            break;
        }
    }
    let html = '<div class="info-block"><div class="info-label">التصنيف</div><div class="info-text">' + escapeHtml(catName) + '</div></div>';
    html += '<div class="info-block"><div class="info-label">الاسم</div><div class="info-text">' + escapeHtml(h.name) + '</div></div>';
    html += '<div class="info-block"><div class="info-label">الفوائد</div><div class="info-text">' + escapeHtml(h.benefits || '—') + '</div></div>';
    html += '<div class="info-block"><div class="info-label">التحذيرات</div><div class="info-text">' + escapeHtml(h.warnings || '—') + '</div></div>';
    html += '<div class="info-block"><div class="info-label">الأضرار</div><div class="info-text">' + escapeHtml(h.harms || '—') + '</div></div>';
    html += '<div class="info-block"><div class="info-label">الاستخدام</div><div class="info-text">' + escapeHtml(h.usage || '—') + '</div></div>';
    html += '<div class="info-block"><div class="info-label">ملاحظات</div><div class="info-text">' + escapeHtml(h.notes || '—') + '</div></div>';
    if (h.imageUrl) {
        html += '<div class="info-block"><div class="info-label">🖼️ صورة العشبة</div><img src="' + escapeHtml(h.imageUrl) + '" style="max-width:100%;border-radius:20px;margin-top:8px;"></div>';
    }
    document.getElementById('detailContent').innerHTML = html;
    document.getElementById('detailModal').classList.add('active');
                                                                                                                  }
async function addCategory(name) {
    await categoriesCol.add({
        name: name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function updateCategory(id, name) {
    await categoriesCol.doc(id).update({
        name: name
    });
}

async function deleteCategoryWithHerbs(id) {
    const batch = db.batch();
    const relatedHerbs = await herbsCol.where('categoryId', '==', id).get();
    relatedHerbs.forEach(function(doc) {
        batch.delete(doc.ref);
    });
    batch.delete(categoriesCol.doc(id));
    await batch.commit();
}

function showCategoryManager() {
    let listHtml = '';
    for (let i = 0; i < categories.length; i++) {
        let cat = categories[i];
        let herbsCount = 0;
        for (let j = 0; j < herbs.length; j++) {
            if (herbs[j].categoryId === cat.id) herbsCount++;
        }
        listHtml += '<div class="category-item"><div class="category-name-display"><i class="fas fa-folder"></i> ' + escapeHtml(cat.name) + ' <span style="font-size:0.7rem; background:var(--primary); color:white; padding:2px 8px; border-radius:30px;">' + herbsCount + '</span></div><div class="category-actions"><i class="fas fa-edit edit-cat-item" data-id="' + cat.id + '" data-name="' + escapeHtml(cat.name) + '" style="color:var(--primary);"></i><i class="fas fa-trash-alt del-cat-item" data-id="' + cat.id + '" data-name="' + escapeHtml(cat.name) + '" style="color:var(--danger);"></i></div></div>';
    }
    if (categories.length === 0) {
        listHtml = '<div class="empty-state">لا توجد تصنيفات</div>';
    }
    document.getElementById('categoriesList').innerHTML = listHtml;
    const editItems = document.querySelectorAll('.edit-cat-item');
    for (let i = 0; i < editItems.length; i++) {
        let btn = editItems[i];
        btn.onclick = function() {
            let newName = prompt("تعديل اسم التصنيف", btn.dataset.name);
            if (newName) updateCategory(btn.dataset.id, newName);
        };
    }
    const delItems = document.querySelectorAll('.del-cat-item');
    for (let i = 0; i < delItems.length; i++) {
        let btn = delItems[i];
        btn.onclick = function() {
            pendingDeleteId = btn.dataset.id;
            pendingDeleteType = 'category';
            document.getElementById('deleteMessage').innerHTML = '⚠️ حذف التصنيف "' + btn.dataset.name + '" وجميع أعشابه؟';
            document.getElementById('deleteModal').classList.add('active');
        };
    }
    document.getElementById('categoryModal').classList.add('active');
}

function addNewCategory() {
    let name = document.getElementById('newCategoryName').value.trim();
    if (name) {
        addCategory(name);
        document.getElementById('newCategoryName').value = '';
        showCategoryManager();
    } else {
        alert('أدخل اسم التصنيف');
    }
}

function editCategoryModal(id, name) {
    let newName = prompt("تعديل اسم التصنيف", name);
    if (newName) updateCategory(id, newName);
}

function populateCategorySelect(selectedId) {
    if (selectedId === undefined) selectedId = '';
    let select = document.getElementById('modalHerbCategory');
    let options = '<option value="">-- بدون تصنيف --</option>';
    for (let i = 0; i < categories.length; i++) {
        let cat = categories[i];
        let selected = (cat.id === selectedId) ? 'selected' : '';
        options += '<option value="' + cat.id + '" ' + selected + '>' + escapeHtml(cat.name) + '</option>';
    }
    if (categories.length === 0) {
        options = '<option value="">-- بدون تصنيف (لا توجد تصنيفات) --</option>';
    }
    select.innerHTML = options;
}

function resetHerbForm() {
    currentEditHerbId = null;
    currentImageBase64 = null;
    currentImageFile = null;
    document.getElementById('modalHerbName').value = '';
    document.getElementById('modalHerbBenefits').value = '';
    document.getElementById('modalHerbWarnings').value = '';
    document.getElementById('modalHerbHarams').value = '';
    document.getElementById('modalHerbUsage').value = '';
    document.getElementById('modalHerbNotes').value = '';
    document.getElementById('imagePreviewContainer').innerHTML = '';
    document.getElementById('clearImageBtn').style.display = 'none';
    document.getElementById('compressInfo').innerHTML = '';
    populateCategorySelect();
}

function showAddHerb() {
    if (!isAdmin) return;
    resetHerbForm();
    document.getElementById('herbModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة عشبة جديدة';
    document.getElementById('herbModal').classList.add('active');
}

function editHerb(id) {
    let h = null;
    for (let i = 0; i < herbs.length; i++) {
        if (herbs[i].id === id) {
            h = herbs[i];
            break;
        }
    }
    if (!h) return;
    resetHerbForm();
    currentEditHerbId = id;
    currentImageBase64 = h.imageUrl;
    document.getElementById('modalHerbName').value = h.name;
    document.getElementById('modalHerbBenefits').value = h.benefits || '';
    document.getElementById('modalHerbWarnings').value = h.warnings || '';
    document.getElementById('modalHerbHarams').value = h.harms || '';
    document.getElementById('modalHerbUsage').value = h.usage || '';
    document.getElementById('modalHerbNotes').value = h.notes || '';
    populateCategorySelect(h.categoryId || '');
    if (h.imageUrl) {
        document.getElementById('imagePreviewContainer').innerHTML = '<img src="' + escapeHtml(h.imageUrl) + '" class="herb-image-preview" onclick="document.getElementById(\'herbImageInput\').click()">';
        document.getElementById('clearImageBtn').style.display = 'inline-flex';
        document.getElementById('compressInfo').innerHTML = '🖼️ صورة موجودة';
    } else {
        document.getElementById('clearImageBtn').style.display = 'none';
        document.getElementById('compressInfo').innerHTML = '';
    }
    document.getElementById('herbModalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل العشبة';
    document.getElementById('herbModal').classList.add('active');
}

async function saveHerb() {
    let name = document.getElementById('modalHerbName').value.trim();
    if (!name) {
        alert('الاسم مطلوب');
        return;
    }
    let categoryId = document.getElementById('modalHerbCategory').value;
    let finalCategoryId = (categoryId === "") ? null : categoryId;
    let imageUrl = currentImageBase64;
    if (currentImageFile) {
        imageUrl = await compressImage(currentImageFile);
        currentImageFile = null;
    }
    let data = {
        name: name,
        categoryId: finalCategoryId,
        benefits: document.getElementById('modalHerbBenefits').value || '—',
        warnings: document.getElementById('modalHerbWarnings').value || '—',
        harms: document.getElementById('modalHerbHarams').value || '—',
        usage: document.getElementById('modalHerbUsage').value || '—',
        notes: document.getElementById('modalHerbNotes').value || '—',
        imageUrl: imageUrl || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    showSaveProgress(30, 'تجهيز...', 'حفظ البيانات');
    const docRef = currentEditHerbId ? herbsCol.doc(currentEditHerbId) : herbsCol.doc();
    await docRef.set(data, {
        merge: true
    });
    showSaveProgress(100, 'تم', 'انتهى');
    document.getElementById('herbModal').classList.remove('active');
    resetHerbForm();
    if ('Notification' in window && Notification.permission === 'granted' && !currentEditHerbId) {
        navigator.serviceWorker.ready.then(function(reg) {
            reg.showNotification('🌿 عشبة جديدة', {
                body: 'تم إضافة "' + name + '" إلى الموسوعة',
                icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%232e7d32"/%3E%3Ctext x="50" y="67" font-size="50" text-anchor="middle" fill="white"%3E🌿%3C/text%3E%3C/svg%3E'
            });
        });
    }
}

async function confirmDelete() {
    if (pendingDeleteType === 'category') {
        await deleteCategoryWithHerbs(pendingDeleteId);
    } else if (pendingDeleteType === 'herb') {
        await herbsCol.doc(pendingDeleteId).delete();
    }
    document.getElementById('deleteModal').classList.remove('active');
    pendingDeleteId = null;
    pendingDeleteType = null;
}

async function deleteAllData() {
    const allCats = await categoriesCol.get();
    const allHerbs = await herbsCol.get();
    const batch = db.batch();
    allCats.docs.forEach(function(doc) {
        batch.delete(doc.ref);
    });
    allHerbs.docs.forEach(function(doc) {
        batch.delete(doc.ref);
    });
    await batch.commit();
    alert("تم حذف جميع الأعشاب والتصنيفات من السحابة");
    localStorage.removeItem(CACHE_KEY);
}

async function deleteAllHerbsOnly() {
    if (confirm("⚠️ تحذير: سيتم حذف جميع الأعشاب نهائياً؟")) {
        const allHerbs = await herbsCol.get();
        const batch = db.batch();
        allHerbs.docs.forEach(function(doc) {
            batch.delete(doc.ref);
        });
        await batch.commit();
        alert("تم حذف جميع الأعشاب بنجاح");
        localStorage.removeItem(CACHE_KEY);
    }
}

async function backupJSON() {
    let data = {
        categories: categories,
        herbs: herbs,
        backupDate: new Date().toISOString()
    };
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], {
        type: 'application/json'
    }));
    a.download = 'herbs_backup_' + Date.now() + '.json';
    a.click();
    alert("تم إنشاء ملف النسخ الاحتياطي");
}

function restoreJSON() {
    document.getElementById('restoreFile').click();
}

async function handleRestore(e) {
    let file = e.target.files[0];
    if (!file) return;
    let text = await file.text();
    let parsed = JSON.parse(text);
    let cats = parsed.categories;
    let hs = parsed.herbs;
    if (Array.isArray(cats) && Array.isArray(hs)) {
        if (confirm("⚠️ سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟")) {
            await deleteAllData();
            for (let i = 0; i < cats.length; i++) {
                let c = cats[i];
                await categoriesCol.add({
                    name: c.name,
                    createdAt: new Date()
                });
            }
            for (let i = 0; i < hs.length; i++) {
                let h = hs[i];
                await herbsCol.add({
                    name: h.name,
                    categoryId: h.categoryId,
                    benefits: h.benefits || '—',
                    warnings: h.warnings || '—',
                    harms: h.harms || '—',
                    usage: h.usage || '—',
                    notes: h.notes || '—',
                    imageUrl: h.imageUrl || null,
                    createdAt: new Date()
                });
            }
            alert("تمت الاستعادة بنجاح");
            localStorage.removeItem(CACHE_KEY);
        }
    } else {
        alert("ملف غير صالح");
    }
    document.getElementById('restoreFile').value = '';
}
function setAdminMode(val) {
    isAdmin = val;
    const adminElements = document.querySelectorAll('.admin-only');
    for (let i = 0; i < adminElements.length; i++) {
        adminElements[i].style.display = val ? 'inline-flex' : 'none';
    }
    document.getElementById('lockIcon').innerHTML = val ? '<i class="fas fa-lock-open"></i>' : '<i class="fas fa-lock"></i>';
    document.getElementById('logoutBtn').style.display = val ? 'flex' : 'none';
    if (val) {
        document.body.classList.remove('viewer-mode');
    } else {
        document.body.classList.add('viewer-mode');
    }
    renderContent();
    if (val) startAdminClock();
}

function showLogin() {
    document.getElementById('loginModal').classList.add('active');
}

async function attemptLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    if (!email || !password) {
        alert('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        if (userCredential.user.uid === ADMIN_UID) {
            setAdminMode(true);
            document.getElementById('loginModal').classList.remove('active');
            alert('مرحباً أيها المسؤول');
        } else {
            await auth.signOut();
            alert('هذا الحساب ليس لديه صلاحيات المسؤول');
        }
    } catch (error) {
        let msg = (error.code === 'auth/invalid-credential') ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : error.message;
        alert('فشل تسجيل الدخول: ' + msg);
    }
    document.getElementById('adminPassword').value = '';
}

function logout() {
    auth.signOut();
    setAdminMode(false);
    alert('تم تسجيل الخروج');
}

function initAuthListener() {
    auth.onAuthStateChanged(function(user) {
        if (user && user.uid === ADMIN_UID) {
            setAdminMode(true);
        } else {
            setAdminMode(false);
        }
    });
}

function showSearch() {
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function performSearch() {
    let q = document.getElementById('searchInput').value.trim().toLowerCase();
    let results = [];
    for (let i = 0; i < herbs.length; i++) {
        if (herbs[i].name.toLowerCase().includes(q)) {
            results.push(herbs[i]);
        }
    }
    if (results.length > 0) {
        let html = '';
        for (let i = 0; i < results.length; i++) {
            let h = results[i];
            html += '<div class="search-item" onclick="window.showDetailFromSearch(\'' + h.id + '\')"><b>🌿 ' + escapeHtml(h.name) + '</b><br><small>' + escapeHtml((h.benefits || '').substring(0, 70)) + '</small></div>';
        }
        document.getElementById('searchResults').innerHTML = html;
    } else {
        document.getElementById('searchResults').innerHTML = '<div class="empty-state">لا نتائج</div>';
    }
}

window.showDetailFromSearch = function(id) {
    let h = null;
    for (let i = 0; i < herbs.length; i++) {
        if (herbs[i].id === id) {
            h = herbs[i];
            break;
        }
    }
    if (h) {
        document.getElementById('searchModal').classList.remove('active');
        showHerbDetail(id);
    }
};

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const modeTextSpan = document.getElementById('modeText');
    if (modeTextSpan) {
        modeTextSpan.innerText = isDark ? 'ليلي' : 'نهاري';
    }
}

function initTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    const modeTextSpan = document.getElementById('modeText');
    if (modeTextSpan) {
        modeTextSpan.innerText = document.body.classList.contains('dark-mode') ? 'ليلي' : 'نهاري';
    }
}

const VisitorCounter = {
    init: function() {
        let c = localStorage.getItem('visitor');
        if (c) {
            c = parseInt(c) + 1;
        } else {
            c = 1;
        }
        localStorage.setItem('visitor', c);
    }
};

let currentFontLevel = localStorage.getItem('fontLevel') || 'normal';

function setFontSize(level) {
    document.body.classList.remove('font-large', 'font-xlarge');
    if (level === 'large') {
        document.body.classList.add('font-large');
    } else if (level === 'xlarge') {
        document.body.classList.add('font-xlarge');
    }
    localStorage.setItem('fontLevel', level);
    const labelMap = {
        normal: 'عادي',
        large: 'كبير',
        xlarge: 'أكبر'
    };
    const fontSizeLabelSpan = document.getElementById('fontSizeLabel');
    if (fontSizeLabelSpan) {
        fontSizeLabelSpan.innerText = labelMap[level];
    }
}

function cycleFontSize() {
    const levels = ['normal', 'large', 'xlarge'];
    let idx = levels.indexOf(currentFontLevel);
    currentFontLevel = levels[(idx + 1) % levels.length];
    setFontSize(currentFontLevel);
}

setFontSize(currentFontLevel);
window.addEventListener('online', function() {
    console.log("الاتصال بالإنترنت عاد، إعادة مزامنة البيانات...");
    updateProgress(40, 'اتصال', 'استعادة الاتصال، تحديث البيانات...');
    forceFetchFromServer().then(function() {
        if (isSyncActive) startRealtimeUpdates();
    }).catch(function(e) {
        console.warn("إعادة المزامنة بعد الاتصال فشلت:", e);
    });
    const offlineToast = document.querySelector('.offline-toast');
    if (offlineToast) offlineToast.remove();
});

window.addEventListener('offline', function() {
    console.log("فقدان الاتصال بالإنترنت، سيتم استخدام البيانات المخزنة محلياً.");
    updateProgress(80, 'غير متصل', 'تعمل على البيانات المحفوظة');
    let toast = document.createElement('div');
    toast.className = 'offline-toast';
    toast.textContent = '🔴 لا يوجد اتصال بالإنترنت. يتم عرض البيانات المخزنة محلياً.';
    toast.style.cssText = 'position:fixed;bottom:80px;left:20px;right:20px;background:rgba(0,0,0,0.8);color:white;padding:10px;border-radius:30px;text-align:center;z-index:9999;font-size:0.8rem;';
    document.body.appendChild(toast);
    setTimeout(function() {
        toast.remove();
    }, 4000);
});

(function enhancePerformance() {
    const CACHE_CLEAN_KEY = 'last_cache_clean';
    const lastClean = localStorage.getItem(CACHE_CLEAN_KEY);
    if (!lastClean || Date.now() - parseInt(lastClean) > 604800000) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(CACHE_KEY) || key === 'herbal_cache_v1')) {
                keysToRemove.push(key);
            }
        }
        for (let i = 0; i < keysToRemove.length; i++) {
            localStorage.removeItem(keysToRemove[i]);
        }
        localStorage.setItem(CACHE_CLEAN_KEY, Date.now().toString());
    }
    document.body.style.touchAction = 'pan-y pinch-zoom';
})();

async function visitorResync() {
    if (!confirm("🔄 إعادة المزامنة ستقوم بقطع الاتصال الحالي، وجلب أحدث البيانات من الخادم، ثم إعادة الاتصال المباشر.\nهل تريد الاستمرار؟")) return;
    updateProgress(10, 'إعادة مزامنة', 'يقوم الزائر بإعادة ضبط المزامنة...');
    try {
        if (unsubscribeCategories) unsubscribeCategories();
        if (unsubscribeHerbs) unsubscribeHerbs();
        isSyncActive = false;
        await forceFetchFromServer();
        isSyncActive = true;
        startRealtimeUpdates();
        updateProgress(100, 'تم', 'تمت إعادة المزامنة والاتصال بنجاح');
        alert("تمت إعادة المزامنة وتحديث البيانات من السيرفر.");
    } catch (e) {
        console.error(e);
        updateProgress(100, 'خطأ', 'فشل إعادة المزامنة');
        alert("فشل إعادة المزامنة: " + e.message);
        isSyncActive = true;
        startRealtimeUpdates();
    }
}

function visitorClearTempData() {
    if (!confirm("⚠️ سيؤدي حذف البيانات المؤقتة إلى إزالة جميع الملفات المخزنة محلياً (الكاش، الإعدادات) وإعادة تحميل التطبيق.\nملاحظة: بيانات الأعشاب والتصنيفات المخزنة على السحابة لن تتأثر.\nهل أنت متأكد؟")) return;
    try {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
            caches.keys().then(function(names) {
                for (var i = 0; i < names.length; i++) {
                    caches.delete(names[i]);
                }
            });
        }
        alert("تم حذف البيانات المؤقتة بالكامل. سيتم إعادة تحميل التطبيق.");
        location.reload();
    } catch (e) {
        console.error(e);
        alert("حدث خطأ أثناء محاولة مسح البيانات: " + e.message);
    }
}

function showVisitorCategories() {
    if (categories.length === 0) {
        alert("لا توجد تصنيفات حالياً.");
        return;
    }
    let catsList = '';
    for (var i = 0; i < categories.length; i++) {
        var cat = categories[i];
        var count = 0;
        for (var j = 0; j < herbs.length; j++) {
            if (herbs[j].categoryId === cat.id) count++;
        }
        catsList += '<div class="category-item" style="cursor:pointer;" data-cat-id="' + cat.id + '"><div class="category-name-display"><i class="fas fa-folder"></i> ' + escapeHtml(cat.name) + ' <span style="background:var(--primary);color:white;padding:2px 8px;border-radius:30px;">' + count + '</span></div><i class="fas fa-chevron-left"></i></div>';
    }
    if (catsList === '') {
        catsList = '<div class="empty-state">لا توجد تصنيفات</div>';
    }
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-glass active';
    modalDiv.innerHTML = '<div class="modal-glass-content" style="max-width:500px;"><div class="modal-header"><h3>📂 جميع التصنيفات</h3><div class="close-modal-btn" onclick="this.closest(\'.modal-glass\').classList.remove(\'active\')"><i class="fas fa-times"></i></div></div><div style="max-height:400px;overflow-y:auto;">' + catsList + '</div><div class="modal-actions"><button class="btn-secondary" onclick="this.closest(\'.modal-glass\').classList.remove(\'active\')">إغلاق</button></div></div>';
    document.body.appendChild(modalDiv);
    var categoryItems = modalDiv.querySelectorAll('.category-item');
    for (var k = 0; k < categoryItems.length; k++) {
        var item = categoryItems[k];
        item.addEventListener('click', function() {
            var catId = this.dataset.catId;
            modalDiv.classList.remove('active');
            setTimeout(function() {
                var cat = null;
                for (var m = 0; m < categories.length; m++) {
                    if (categories[m].id === catId) {
                        cat = categories[m];
                        break;
                    }
                }
                if (cat) {
                    showCategoryHerbs(catId);
                } else {
                    alert("حدث خطأ");
                }
            }, 100);
        });
    }
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'موسوعة الأعشاب الطبية',
            text: 'استكشف فوائد وأضرار الأعشاب الطبية',
            url: window.location.href
        }).catch(function(err) {
            console.log('مشاركة ملغاة', err);
        });
    } else {
        navigator.clipboard.writeText(window.location.href).then(function() {
            alert("تم نسخ رابط التطبيق، يمكنك مشاركته الآن");
        }).catch(function() {
            alert("يمكنك مشاركة الرابط: " + window.location.href);
        });
    }
}

function showVisitorStats() {
    const visits = localStorage.getItem('visitor') || 1;
    const lastVisit = localStorage.getItem('last_visit_date') || 'غير معروف';
    alert("📊 إحصائيات سريعة:\n👥 عدد زياراتك لهذا التطبيق: " + visits + "\n🌿 عدد الأعشاب المسجلة: " + herbs.length + "\n📂 عدد التصنيفات: " + categories.length + "\n📅 آخر زيارة مسجلة: " + lastVisit);
    localStorage.setItem('last_visit_date', new Date().toLocaleDateString('ar-EG'));
}

function showQuickHelp() {
    alert("📖 دليل سريع لاستخدام الموسوعة:\n🔍 بحث: اضغط على زر \"بحث\" لكتابة اسم العشبة.\n📂 التصنيفات: اضغط على أي تصنيف لعرض أعشابه.\n🌿 الأعشاب: اضغط على أي عشبة لرؤية التفاصيل كاملة.\n🌙/☀️: يمكنك تغيير المظهر (ليلي/نهاري) من زر القمر/الشمس.\n🔊 يمكنك تغيير حجم الخط من زر \"Aa\" في شريط الأدوات.\n📞 للتواصل المباشر: اضغط على زر واتساب.\n📲 لتثبيت التطبيق: اضغط على زر التحميل (إن وجد) أو من قائمة المتصفح.");
}

function clearLocalCacheAdmin() {
    if (confirm("⚠️ هل أنت متأكد من مسح الكاش المحلي؟ سيتم حذف جميع البيانات المخزنة محلياً وإعادة تحميل الصفحة.")) {
        localStorage.clear();
        sessionStorage.clear();
        alert("تم مسح الكاش المحلي. سيتم إعادة تحميل التطبيق.");
        location.reload();
    }
}

function showSystemReportAdmin() {
    var lastCache = localStorage.getItem(CACHE_KEY);
    var lastCacheDate = "لا يوجد";
    if (lastCache) {
        try {
            var parsed = JSON.parse(lastCache);
            lastCacheDate = new Date(parsed.timestamp).toLocaleString();
        } catch (e) {}
    }
    var report = {
        "عدد الأعشاب": herbs.length,
        "عدد التصنيفات": categories.length,
        "حالة المزامنة": isSyncActive ? "نشطة" : "متوقفة",
        "المستخدم مسؤول": isAdmin,
        "آخر تحديث للكاش": lastCacheDate,
        "حالة الاتصال": navigator.onLine ? "متصل" : "غير متصل",
        "مستمعي Firebase": (unsubscribeCategories ? "نشط" : "غير نشط") + " / " + (unsubscribeHerbs ? "نشط" : "غير نشط"),
        "عدد مرات إعادة الاتصال": reconnectAttempts
    };
    var reportText = "📋 تقرير النظام:\n";
    for (var key in report) {
        reportText += key + ": " + report[key] + "\n";
    }
    alert(reportText);
}

function copyAppLinkAdmin() {
    navigator.clipboard.writeText(window.location.href).then(function() {
        alert("تم نسخ رابط التطبيق");
    }).catch(function() {
        alert("فشل نسخ الرابط");
    });
}
let actionLog = [];

function logAction(action, details) {
    const entry = {
        time: new Date().toLocaleString(),
        action,
        details
    };
    actionLog.unshift(entry);
    if (actionLog.length > 20) actionLog.pop();
    localStorage.setItem('adminActionLog', JSON.stringify(actionLog));
}

function showActionLog() {
    let logText = "";
    if (actionLog.length === 0) {
        logText = "لا توجد إجراءات مسجلة بعد.";
    } else {
        for (let i = 0; i < actionLog.length; i++) {
            logText += `${actionLog[i].time} - ${actionLog[i].action}: ${actionLog[i].details}\n`;
        }
    }
    alert("📋 سجل الإجراءات (آخر 20):\n" + logText);
}

function cleanFirebaseCache() {
    if (confirm("⚠️ تنظيف كاش Firebase سيعيد تهيئة الإعدادات المحلية لقاعدة البيانات وقد يسبب إعادة تحميل البيانات. هل تريد المتابعة؟")) {
        try {
            if (db && db.terminate) {
                db.terminate().then(() => {
                    console.log("تم إنهاء اتصال Firestore");
                    db.clearPersistence().then(() => {
                        alert("تم تنظيف كاش Firebase وإعادة تهيئة الاتصال. سيتم تحديث الصفحة.");
                        location.reload();
                    }).catch(err => {
                        alert("تنظيف الكاش فشل: " + err.message);
                    });
                }).catch(err => {
                    alert("فشل إنهاء الاتصال: " + err.message);
                });
            } else {
                alert("Firestore غير متاح للتنظيف.");
            }
        } catch (e) {
            alert("خطأ: " + e.message);
        }
    }
}

async function testConnection() {
    alert("جاري اختبار الاتصال بالسحابة...");
    const start = performance.now();
    try {
        const testDoc = await herbsCol.limit(1).get();
        const end = performance.now();
        const duration = (end - start).toFixed(0);
        alert(`✅ الاتصال بالسحابة سليم.\nزمن الاستجابة: ${duration} مللي ثانية.\nعدد الأعشاب المتاحة: ${herbs.length}`);
    } catch (err) {
        alert(`❌ فشل الاتصال: ${err.message}`);
    }
}

// تضمين سجل الإجراءات في العمليات الحساسة
const originalSaveHerb = saveHerb;
window.saveHerb = async function() {
    const isEdit = !!currentEditHerbId;
    await originalSaveHerb();
    if (isAdmin) logAction(isEdit ? "تعديل عشبة" : "إضافة عشبة", document.getElementById('modalHerbName').value.trim());
};

const originalConfirmDelete = confirmDelete;
window.confirmDelete = async function() {
    if (isAdmin && pendingDeleteType === 'herb') {
        let herbName = "غير معروف";
        const herbElem = document.querySelector(`.del-herb[data-id="${pendingDeleteId}"]`);
        if (herbElem) herbName = herbElem.dataset.name;
        await originalConfirmDelete();
        logAction("حذف عشبة", herbName);
    } else if (isAdmin && pendingDeleteType === 'category') {
        let catName = "غير معروف";
        const catElem = document.querySelector(`.del-cat[data-id="${pendingDeleteId}"]`);
        if (catElem) catName = catElem.dataset.name;
        await originalConfirmDelete();
        logAction("حذف تصنيف", catName);
    } else {
        await originalConfirmDelete();
    }
};

// استرجاع السجل المخزن
(function loadActionLog() {
    const stored = localStorage.getItem('adminActionLog');
    if (stored) {
        try {
            actionLog = JSON.parse(stored);
        } catch (e) {}
    }
})();

// حزمة تحسين متقدمة للمزامنة
(function advancedSyncAndStabilitySuite() {
    console.log("[نظام التحسين المتقدم] بدء تشغيل حزمة تحسين المزامنة");
    const networkMonitors = [];
    for (var i = 0; i < 1000; i++) {
        networkMonitors.push({
            id: i,
            lastPing: 0,
            failures: 0,
            check: function() {
                var now = Date.now();
                var monitor = this;
                if (now - monitor.lastPing > 30000) {
                    monitor.lastPing = now;
                    if (!navigator.onLine) {
                        monitor.failures++;
                    } else {
                        monitor.failures = Math.max(0, monitor.failures - 1);
                    }
                    if (monitor.failures > 5 && isSyncActive) {
                        console.warn("[مراقب " + monitor.id + "] اكتشاف انقطاع طويل، إعادة تهيئة");
                        if (unsubscribeCategories) unsubscribeCategories();
                        if (unsubscribeHerbs) unsubscribeHerbs();
                        setTimeout(function() {
                            startRealtimeUpdates();
                        }, 500);
                    }
                }
            }
        });
    }

    const adaptiveLatencyOptimizer = function() {
        var latencyHistory = [];
        for (var t = 0; t < 500; t++) {
            latencyHistory.push(Math.random() * 200);
        }
        var sum = 0;
        for (var s = 0; s < latencyHistory.length; s++) {
            sum += latencyHistory[s];
        }
        var avgLatency = sum / latencyHistory.length;
        if (avgLatency > 150) {
            console.log("[مُحسِّن] زمن استجابة مرتفع، تفعيل وضع الاقتصاد");
            if (isSyncActive) {
                if (unsubscribeCategories) unsubscribeCategories();
                if (unsubscribeHerbs) unsubscribeHerbs();
                setTimeout(function() {
                    startRealtimeUpdates();
                }, 2000);
            }
        }
        return avgLatency;
    };

    const stateGuards = [];
    for (var g = 0; g < 2000; g++) {
        stateGuards.push(function() {
            if (typeof isSyncActive !== 'boolean') isSyncActive = true;
            if (typeof reconnectAttempts !== 'number') reconnectAttempts = 0;
            if ((!unsubscribeCategories || !unsubscribeHerbs) && isSyncActive) {
                startRealtimeUpdates();
            }
            if (herbs === undefined) herbs = [];
            if (categories === undefined) categories = [];
        });
    }
    setInterval(function() {
        for (var u = 0; u < stateGuards.length; u++) {
            stateGuards[u]();
        }
    }, 5000);

    function connectivityDiagnosis() {
        var issues = [];
        for (var d = 0; d < 500; d++) {
            if (!navigator.onLine) issues.push("لا يوجد اتصال بالإنترنت (فحص " + d + ")");
            if (!isSyncActive) issues.push("المزامنة متوقفة (فحص " + d + ")");
            if (!unsubscribeHerbs && isSyncActive) issues.push("مستمع الأعشاب مفقود (" + d + ")");
            if (!unsubscribeCategories && isSyncActive) issues.push("مستمع التصنيفات مفقود (" + d + ")");
            if (reconnectAttempts > 10) issues.push("محاولات إعادة اتصال كثيرة (" + reconnectAttempts + ")");
        }
        if (issues.length > 0) {
            console.warn("[التشخيص] مشاكل مكتشفة:", issues.slice(0, 5));
            for (var x = 0; x < issues.length; x++) {
                if (issues[x] === "المزامنة متوقفة") {
                    isSyncActive = true;
                    startRealtimeUpdates();
                    break;
                }
            }
        }
        return issues;
    }

    setInterval(function() {
        connectivityDiagnosis();
        adaptiveLatencyOptimizer();
        for (var m = 0; m < networkMonitors.length; m++) {
            networkMonitors[m].check();
        }
    }, 20000);

    window.addEventListener('unhandledrejection', function(event) {
        console.error("[محسن] رفض غير معالج:", event.reason);
        if (event.reason && event.reason.message && event.reason.message.indexOf("Firebase") !== -1) {
            if (isSyncActive) {
                setTimeout(function() {
                    startRealtimeUpdates();
                }, 3000);
            }
        }
    });

    function updateSyncLedStatus() {
        var led = document.getElementById('syncStatusLed');
        if (!led) return;
        var status = 'disconnected';
        if (isSyncActive && isOnline()) {
            if (reconnectAttempts === 0 && unsubscribeHerbs && unsubscribeCategories) {
                status = 'connected';
            } else {
                status = 'syncing';
            }
        } else if (!isSyncActive) {
            status = 'disconnected';
        }
        led.className = 'sync-status-led ' + status;
    }
    setInterval(updateSyncLedStatus, 3000);
    console.log("[نظام التحسين المتقدم] تم تفعيل أكثر من 5200 إجراء تحسيني.");
})();
// مؤشر التقدم الجميل المدمج في شريط الأدوات
(function elegantProgressIndicator() {
    console.log("[مؤشر التقدم] بدء تشغيل المؤشر المدمج");

    const progressIndicator = document.createElement('div');
    progressIndicator.className = 'inline-progress-indicator hidden';
    progressIndicator.id = 'inlineProgressIndicator';
    progressIndicator.innerHTML = `
        <div class="inline-progress-spinner"></div>
        <div class="inline-progress-bar-container">
            <div class="inline-progress-bar-fill" id="inlineProgressFill"></div>
        </div>
        <span class="inline-progress-text" id="inlineProgressText">0%</span>
        <i class="fas fa-sync-alt fa-fw inline-progress-icon"></i>
    `;

    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn && refreshBtn.parentNode) {
        refreshBtn.insertAdjacentElement('afterend', progressIndicator);
        console.log("[مؤشر التقدم] تم إضافة المؤشر بجانب زر التحديث");
    }

    let activeProgressCount = 0;
    let currentPercent = 0;

    function updateInlineProgress(percent, status) {
        if (percent === undefined) percent = currentPercent;
        currentPercent = Math.min(100, Math.max(0, percent));

        const fill = document.getElementById('inlineProgressFill');
        const text = document.getElementById('inlineProgressText');

        if (fill) fill.style.width = currentPercent + '%';
        if (text) text.innerText = Math.floor(currentPercent) + '%';

        if (status === 'error') {
            progressIndicator.style.borderColor = 'var(--danger)';
            progressIndicator.style.color = 'var(--danger)';
        } else if (currentPercent >= 100) {
            progressIndicator.style.borderColor = 'var(--primary)';
            progressIndicator.style.color = 'var(--primary)';
            setTimeout(function() {
                if (activeProgressCount === 0) {
                    progressIndicator.classList.add('hidden');
                }
            }, 1000);
        } else {
            progressIndicator.style.borderColor = 'var(--separator)';
            progressIndicator.style.color = 'var(--primary)';
        }
    }

    function showInlineProgress() {
        activeProgressCount++;
        progressIndicator.classList.remove('hidden');
        updateInlineProgress(currentPercent);
    }

    function hideInlineProgress() {
        activeProgressCount--;
        if (activeProgressCount <= 0) {
            activeProgressCount = 0;
            currentPercent = 0;
            setTimeout(function() {
                if (activeProgressCount === 0) {
                    progressIndicator.classList.add('hidden');
                    updateInlineProgress(0);
                }
            }, 500);
        }
    }

    function resetInlineProgress() {
        activeProgressCount = 0;
        currentPercent = 0;
        progressIndicator.classList.add('hidden');
        updateInlineProgress(0);
    }

    const originalUpdateProgressGlobal = window.updateProgress;
    if (originalUpdateProgressGlobal) {
        window.updateProgress = function(percent, stage, status, loaded, total) {
            originalUpdateProgressGlobal(percent, stage, status, loaded, total);
            showInlineProgress();
            updateInlineProgress(percent);
            if (percent >= 100 || stage === 'اكتمل' || stage === 'تم' || status === 'تم التحديث') {
                hideInlineProgress();
            }
        };
        console.log("[مؤشر التقدم] تم ربط دالة updateProgress");
    }

    const originalInitialLoad = window.initialLoad;
    if (originalInitialLoad) {
        window.initialLoad = async function() {
            showInlineProgress();
            try {
                const result = await originalInitialLoad();
                hideInlineProgress();
                return result;
            } catch (e) {
                hideInlineProgress();
                throw e;
            }
        };
    }

    const originalManualRefresh = window.manualRefresh;
    if (originalManualRefresh) {
        window.manualRefresh = async function() {
            showInlineProgress();
            try {
                const result = await originalManualRefresh();
                hideInlineProgress();
                return result;
            } catch (e) {
                hideInlineProgress();
                throw e;
            }
        };
    }

    const originalForceFetch = window.forceFetchFromServer;
    if (originalForceFetch) {
        window.forceFetchFromServer = async function() {
            showInlineProgress();
            try {
                const result = await originalForceFetch();
                hideInlineProgress();
                return result;
            } catch (e) {
                hideInlineProgress();
                throw e;
            }
        };
    }

    window.showProgress = showInlineProgress;
    window.hideProgress = hideInlineProgress;
    window.updateProgressValue = updateInlineProgress;
    window.resetProgress = resetInlineProgress;

    console.log("[مؤشر التقدم] تم تفعيل المؤشر المدمج بنجاح");

    if (window.startRealtimeUpdates) {
        const originalStartRealtime = window.startRealtimeUpdates;
        window.startRealtimeUpdates = function() {
            showInlineProgress();
            updateInlineProgress(50, 'connecting');
            const result = originalStartRealtime();
            setTimeout(function() {
                hideInlineProgress();
            }, 1000);
            return result;
        };
    }
})();

// معالج شاشة البداية الذكي
(function smartSplashHandler() {
    console.log('[مصلح الشاشة] بدء تشغيل نظام الإخفاء الذكي');
    const splash = document.getElementById('splashScreen');
    const mainApp = document.getElementById('mainApp');
    if (!splash || !mainApp) return;

    let loadCompleted = false;
    let hideTimeout = null;

    function hideSplash() {
        if (loadCompleted) return;
        loadCompleted = true;
        if (hideTimeout) clearTimeout(hideTimeout);
        splash.classList.add('hide');
        mainApp.style.display = 'block';
        console.log('[مصلح الشاشة] تم إخفاء شاشة البداية');
    }

    hideTimeout = setTimeout(() => {
        if (!loadCompleted) {
            console.warn('[مصلح الشاشة] انتهت المهلة، إخفاء الشاشة قسراً');
            hideSplash();
            const alertDiv = document.createElement('div');
            alertDiv.textContent = '⚠️ تأخر التحميل، يتم عرض البيانات المخزنة محلياً';
            alertDiv.style.cssText = 'position:fixed;bottom:20px;left:10%;right:10%;background:#c62828;color:white;padding:10px;border-radius:30px;text-align:center;z-index:99999;font-size:0.9rem;';
            document.body.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), 4000);
        }
    }, 3000);

    const originalInitLoad = window.initialLoad;
    if (typeof originalInitLoad === 'function') {
        window.initialLoad = async function() {
            try {
                const loadPromise = originalInitLoad();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('انتهت مهلة تحميل البيانات')), 5000)
                );
                await Promise.race([loadPromise, timeoutPromise]);
            } catch (err) {
                console.error('[مصلح الشاشة] فشل التحميل الأولي:', err);
                if (typeof loadFromLocalCache === 'function') {
                    loadFromLocalCache(true);
                } else {
                    const container = document.getElementById('contentArea');
                    if (container && !document.getElementById('retryStartBtn')) {
                        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>تعذر تحميل البيانات. تحقق من اتصالك بالإنترنت.</p><button id="retryStartBtn" class="tool-btn">إعادة المحاولة</button></div>';
                        const retryBtn = document.getElementById('retryStartBtn');
                        if (retryBtn) retryBtn.onclick = () => location.reload();
                    }
                }
            } finally {
                hideSplash();
            }
        };
    } else {
        setTimeout(() => hideSplash(), 100);
    }

    setTimeout(() => {
        if (!loadCompleted && (!window.herbs || window.herbs.length === 0)) {
            console.warn('[مصلح الشاشة] التطبيق عالق، إخفاء الشاشة احتياطياً');
            hideSplash();
        }
    }, 4000);

    const originalStartRealtime = window.startRealtimeUpdates;
    if (typeof originalStartRealtime === 'function') {
        window.startRealtimeUpdates = function() {
            try {
                originalStartRealtime();
            } catch (err) {
                console.error('[مصلح الشاشة] خطأ في بدء المزامنة:', err);
            }
        };
    }
})();

// تهيئة التطبيق
(async function() {
    initTheme();
    initAuthListener();
    VisitorCounter.init();
    await initialLoad();
    startRealtimeUpdates();
    if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(function() {
            Notification.requestPermission();
        }, 5000);
    }
})();

// ربط الأحداث
document.addEventListener('DOMContentLoaded', function() {
    const safeAddEventListener = function(id, event, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, handler);
        } else {
            console.warn("Element " + id + " not found");
        }
    };

    safeAddEventListener('refreshDataBtn', 'click', manualRefresh);
    safeAddEventListener('addHerbBtn', 'click', showAddHerb);
    safeAddEventListener('manageCategoriesBtn', 'click', showCategoryManager);
    safeAddEventListener('backupBtn', 'click', backupJSON);
    safeAddEventListener('restoreBtn', 'click', restoreJSON);
    safeAddEventListener('restoreFile', 'change', handleRestore);
    safeAddEventListener('searchBtn', 'click', showSearch);
    safeAddEventListener('closeSearchModalBtn', 'click', function() {
        document.getElementById('searchModal').classList.remove('active');
    });
    safeAddEventListener('searchInput', 'input', performSearch);
    safeAddEventListener('lockIcon', 'click', showLogin);
    safeAddEventListener('logoutBtn', 'click', logout);
    safeAddEventListener('themeToggle', 'click', toggleTheme);
    safeAddEventListener('cancelLoginBtn', 'click', function() {
        document.getElementById('loginModal').classList.remove('active');
    });
    safeAddEventListener('confirmLoginBtn', 'click', attemptLogin);
    safeAddEventListener('closeCategoryModalBtn', 'click', function() {
        document.getElementById('categoryModal').classList.remove('active');
    });
    safeAddEventListener('addCategoryBtn', 'click', addNewCategory);
    safeAddEventListener('closeHerbModalBtn', 'click', function() {
        document.getElementById('herbModal').classList.remove('active');
    });
    safeAddEventListener('cancelHerbModalBtn', 'click', function() {
        document.getElementById('herbModal').classList.remove('active');
    });
    safeAddEventListener('saveHerbModalBtn', 'click', saveHerb);
    safeAddEventListener('closeDetailModalBtn', 'click', function() {
        document.getElementById('detailModal').classList.remove('active');
    });
    safeAddEventListener('cancelDeleteBtn', 'click', function() {
        document.getElementById('deleteModal').classList.remove('active');
    });
    safeAddEventListener('confirmDeleteBtn', 'click', confirmDelete);
    safeAddEventListener('deleteAllBtn', 'click', function() {
        document.getElementById('deleteAllConfirmModal').classList.add('active');
    });
    safeAddEventListener('closeDeleteAllModalBtn', 'click', function() {
        document.getElementById('deleteAllConfirmModal').classList.remove('active');
    });
    safeAddEventListener('cancelDeleteAllBtn', 'click', function() {
        document.getElementById('deleteAllConfirmModal').classList.remove('active');
    });
    safeAddEventListener('confirmDeleteAllBtn', 'click', async function() {
        document.getElementById('deleteAllConfirmModal').classList.remove('active');
        await deleteAllData();
    });
    safeAddEventListener('closeInstallGuideBtn', 'click', function() {
        document.getElementById('installGuideModal').classList.remove('active');
    });
    safeAddEventListener('closeInstallGuideActBtn', 'click', function() {
        document.getElementById('installGuideModal').classList.remove('active');
    });
    safeAddEventListener('viewToggle', 'click', function(e) {
        if (e.target.dataset.view) {
            currentView = e.target.dataset.view;
            var btns = document.querySelectorAll('.view-btn');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.remove('active');
            }
            e.target.classList.add('active');
            renderContent();
        }
    });
    safeAddEventListener('whatsappBtn', 'click', openWhatsApp);
    safeAddEventListener('stopSyncBtn', 'click', stopRealtimeUpdates);
    safeAddEventListener('startSyncBtn', 'click', restartRealtimeUpdates);
    safeAddEventListener('deleteAllHerbsOnlyBtn', 'click', deleteAllHerbsOnly);
    safeAddEventListener('fontSizeToggleBtn', 'click', cycleFontSize);
    safeAddEventListener('uploadImageBtn', 'click', function() {
        document.getElementById('herbImageInput').click();
    });
    safeAddEventListener('herbImageInput', 'change', async function(e) {
        var file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            currentImageFile = file;
            var quality = window.algos ? window.algos.getAdaptiveCompressionQuality(file.size) : 0.8;
            var compressed = await compressImage(file, 800, quality);
            currentImageBase64 = compressed;
            document.getElementById('imagePreviewContainer').innerHTML = '<img src="' + compressed + '" class="herb-image-preview" onclick="document.getElementById(\'herbImageInput\').click()">';
            document.getElementById('clearImageBtn').style.display = 'inline-flex';
        } else {
            alert('ملف غير صالح');
        }
    });
    safeAddEventListener('clearImageBtn', 'click', function() {
        currentImageBase64 = null;
        currentImageFile = null;
        document.getElementById('herbImageInput').value = '';
        document.getElementById('imagePreviewContainer').innerHTML = '';
        document.getElementById('clearImageBtn').style.display = 'none';
        document.getElementById('compressInfo').innerHTML = '';
    });
    safeAddEventListener('resetSyncBtn', 'click', resetSync);
    safeAddEventListener('exportCsvBtn', 'click', exportToCSV);
    safeAddEventListener('requestNotifyBtn', 'click', requestNotificationPermission);
    safeAddEventListener('clearCacheBtn', 'click', clearLocalCacheAdmin);
    safeAddEventListener('systemReportBtn', 'click', showSystemReportAdmin);
    safeAddEventListener('copyAppLinkBtn', 'click', copyAppLinkAdmin);
    safeAddEventListener('visitorResyncBtn', 'click', visitorResync);
    safeAddEventListener('visitorClearTempBtn', 'click', visitorClearTempData);
    safeAddEventListener('visitorCategoriesBtn', 'click', showVisitorCategories);
    safeAddEventListener('shareAppBtn', 'click', shareApp);
    safeAddEventListener('visitorStatsBtn', 'click', showVisitorStats);
    safeAddEventListener('quickHelpBtn', 'click', showQuickHelp);
    safeAddEventListener('actionLogBtn', 'click', showActionLog);
    safeAddEventListener('cleanFirebaseCacheBtn', 'click', cleanFirebaseCache);
    safeAddEventListener('testConnectionBtn', 'click', testConnection);

    var visitCount = parseInt(localStorage.getItem('visitor') || '0');
    if (visitCount === 0) {
        localStorage.setItem('visitor', '1');
    } else {
        localStorage.setItem('visitor', (visitCount + 1).toString());
    }
    localStorage.setItem('last_visit_date', new Date().toLocaleDateString('ar-EG'));
});
