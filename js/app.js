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
                let width = img.width, height = img.height;
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

function escapeHtml(s) {
    if (!s) return '—';
    return s.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showSaveProgress(percent, status, stage) {
    const bar = document.getElementById('saveProgressBar');
    if (!bar) return;
    bar.style.display = 'flex';
    const fill = document.getElementById('saveProgressFill');
    const percentSpan = document.getElementById('saveProgressPercent');
    const statusSpan = document.getElementById('saveProgressStatus');
    const stageSpan = document.getElementById('saveProgressStage');
    if (fill) fill.style.width = percent + '%';
    if (percentSpan) percentSpan.innerText = Math.floor(percent) + '%';
    if (statusSpan) statusSpan.innerText = status;
    if (stageSpan) stageSpan.innerText = stage;
    if (percent >= 100) {
        setTimeout(function() { bar.style.display = 'none'; }, 1500);
    }
}

// =================================================================
// ========== متغيرات عامة و Firebase =============================
// =================================================================

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

const CACHE_KEY = 'herbal_cache_v2';

function saveToLocalCache(cats, hrbs) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ categories: cats, herbs: hrbs, timestamp: Date.now() }));
    } catch (e) { console.warn(e); }
}

function loadFromLocalCache(allowEmpty) {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.categories && data.herbs && (data.categories.length > 0 || data.herbs.length > 0 || allowEmpty)) {
                categories = data.categories;
                herbs = data.herbs;
                const herbCountSpan = document.getElementById('herbCount');
                if (herbCountSpan) herbCountSpan.innerText = herbs.length + ' عشبة';
                renderContent();
                return true;
            }
        }
    } catch (e) { console.warn(e); }
    return false;
}

function isOnline() { return navigator.onLine; }

async function fetchWithTimeout(promise, timeoutMs = 10000) {
    let timeoutId;
    const timeoutPromise = new Promise(function(_, reject) {
        timeoutId = setTimeout(function() { reject(new Error("انتهت المهلة")); }, timeoutMs);
    });
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
}

async function fetchWithRetry(fn, maxRetries = 3, baseDelay = 800) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt === maxRetries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(1.5, attempt)));
        }
    }
    throw lastError;
}

async function forceFetchFromServer() {
    try {
        const [catsSnap, herbsSnap] = await fetchWithTimeout(Promise.all([categoriesCol.orderBy("name").get(), herbsCol.get()]), 15000);
        categories = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        herbs = herbsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        saveToLocalCache(categories, herbs);
        const herbCountSpan = document.getElementById('herbCount');
        if (herbCountSpan) herbCountSpan.innerText = herbs.length + ' عشبة';
        renderContent();
        return true;
    } catch (error) {
        console.error("فشل التحديث:", error);
        return false;
    }
}

async function initialLoad() {
    if (!isOnline()) {
        loadFromLocalCache(true);
        showRetryButton();
        return;
    }
    const hasCache = loadFromLocalCache(true);
    try {
        const fetchOperation = async function() {
            const [catsSnap, herbsSnap] = await fetchWithTimeout(Promise.all([categoriesCol.orderBy("name").get(), herbsCol.get()]), 10000);
            return {
                cats: catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                herbs: herbsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            };
        };
        const result = await fetchWithRetry(fetchOperation, 2, 800);
        categories = result.cats;
        herbs = result.herbs;
        saveToLocalCache(categories, herbs);
        const herbCountSpan = document.getElementById('herbCount');
        if (herbCountSpan) herbCountSpan.innerText = herbs.length + ' عشبة';
        renderContent();
    } catch (error) {
        console.error("خطأ في التحميل:", error);
        if (!hasCache) showRetryButton();
    }
}

function showRetryButton() {
    const container = document.getElementById('contentArea');
    if (container && !document.getElementById('retryLoadBtn')) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi" style="font-size:3rem; color:var(--danger);"></i><p>لا يوجد اتصال بالإنترنت أو فشل التحميل.</p><button id="retryLoadBtn" class="tool-btn" style="background:var(--primary); color:white;">إعادة المحاولة</button></div>';
        const retryBtn = document.getElementById('retryLoadBtn');
        if (retryBtn) retryBtn.addEventListener('click', () => initialLoad());
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
            categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            saveToLocalCache(categories, herbs);
            renderContent();
            reconnectAttempts = 0;
        }, handleError);
        unsubscribeHerbs = herbsCol.onSnapshot(function(snapshot) {
            if (!isSyncActive) return;
            herbs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            saveToLocalCache(categories, herbs);
            const herbCountSpan = document.getElementById('herbCount');
            if (herbCountSpan) herbCountSpan.innerText = herbs.length + ' عشبة';
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
    alert("تم إيقاف المزامنة المباشرة.");
}

function restartRealtimeUpdates() {
    if (isSyncActive) {
        alert("المزامنة مفعلة بالفعل.");
        return;
    }
    isSyncActive = true;
    startRealtimeUpdates();
    alert("تم تشغيل المزامنة المباشرة.");
}

function handleReconnection() {
    reconnectAttempts++;
    if (reconnectAttempts < 6) {
        const delay = Math.min(1000 * Math.pow(1.8, reconnectAttempts), 45000);
        setTimeout(() => startRealtimeUpdates(), delay);
    } else {
        console.warn("فشل متكرر في الاتصال");
    }
}

async function manualRefresh() {
    if (isRefreshing) {
        alert("يتم التحديث حالياً، انتظر قليلاً");
        return;
    }
    isRefreshing = true;
    const refreshBtn = document.getElementById('refreshDataBtn');
    const originalText = refreshBtn ? refreshBtn.innerHTML : '';
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري...';
        refreshBtn.disabled = true;
    }
    try {
        if (unsubscribeCategories) unsubscribeCategories();
        if (unsubscribeHerbs) unsubscribeHerbs();
        isSyncActive = false;
        await forceFetchFromServer();
        isSyncActive = true;
        startRealtimeUpdates();
        alert("تم تحديث البيانات");
    } catch (e) {
        alert("فشل التحديث: " + e.message);
        isSyncActive = true;
        startRealtimeUpdates();
    } finally {
        if (refreshBtn) {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }
        isRefreshing = false;
    }
}

async function resetSync() {
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeHerbs) unsubscribeHerbs();
    isSyncActive = false;
    setTimeout(() => {
        isSyncActive = true;
        startRealtimeUpdates();
        alert("تم إعادة ضبط المزامنة");
    }, 500);
}

function startAdminClock() {
    const clockSpan = document.querySelector('#adminClock span');
    if (!clockSpan) return;
    setInterval(() => {
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
    if (!container) return;
    if (herbs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-leaf"></i><p>لا توجد أعشاب بعد</p></div>';
        return;
    }
    let html = '<div class="herbs-grid">';
    for (let herb of herbs) {
        let catName = "بدون تصنيف";
        const cat = categories.find(c => c.id === herb.categoryId);
        if (cat) catName = cat.name;

        html += `<div class="herb-card" data-id="${herb.id}">`;
        if (herb.imageUrl) {
            html += `<img src="${escapeHtml(herb.imageUrl)}" class="herb-card-image" loading="lazy" onerror="this.style.display='none'">`;
        }
        html += `
            <div class="card-header">
                <span class="herb-name">🌿 ${escapeHtml(herb.name)}</span>
                <span>${escapeHtml(catName)}</span>
            </div>
            <div class="info-block"><div class="info-label">💚 الفوائد</div><div class="info-text">${escapeHtml(herb.benefits || '—')}</div></div>
            <div class="info-block"><div class="info-label">⚠️ التحذيرات</div><div class="info-text">${escapeHtml(herb.warnings || '—')}</div></div>
            <div class="info-block"><div class="info-label">⚡ الأضرار</div><div class="info-text">${escapeHtml(herb.harms || '—')}</div></div>
            <div class="info-block"><div class="info-label">🍵 طريقة الاستخدام</div><div class="info-text">${escapeHtml(herb.usage || '—')}</div></div>
            <div class="info-block"><div class="info-label">📝 ملاحظات</div><div class="info-text">${escapeHtml(herb.notes || '—')}</div></div>
        `;
        if (isAdmin) {
            html += `<div class="card-actions">
                        <i class="fas fa-edit edit-herb" data-id="${herb.id}" style="cursor:pointer;color:var(--primary);"></i>
                        <i class="fas fa-trash-alt del-herb" data-id="${herb.id}" data-name="${escapeHtml(herb.name)}" style="cursor:pointer;color:var(--danger);"></i>
                    </div>`;
        }
        html += `</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
    attachHerbEvents();
}

function renderCategories() {
    const container = document.getElementById('contentArea');
    if (!container) return;
    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>لا توجد تصنيفات</p></div>';
        return;
    }
    let html = '<div class="categories-grid">';
    for (let cat of categories) {
        const herbsCount = herbs.filter(h => h.categoryId === cat.id).length;
        html += `<div class="category-card" data-cat-id="${cat.id}">
                    <div class="card-header">
                        <span class="category-name">📁 ${escapeHtml(cat.name)}</span>
                        <span>${herbsCount} عشبة</span>
                    </div>
                    <div>اضغط لعرض الأعشاب</div>`;
        if (isAdmin) {
            html += `<div class="card-actions">
                        <i class="fas fa-edit edit-cat" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}"></i>
                        <i class="fas fa-trash-alt del-cat" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}"></i>
                    </div>`;
        }
        html += `</div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions')) {
                showCategoryHerbs(card.dataset.catId);
            }
        });
    });

    if (isAdmin) {
        document.querySelectorAll('.edit-cat').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                editCategoryModal(btn.dataset.id, btn.dataset.name);
            };
        });
        document.querySelectorAll('.del-cat').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                pendingDeleteId = btn.dataset.id;
                pendingDeleteType = 'category';
                const deleteMsg = document.getElementById('deleteMessage');
                if (deleteMsg) deleteMsg.innerHTML = `⚠️ حذف التصنيف "${btn.dataset.name}" وجميع أعشابه؟`;
                const deleteModal = document.getElementById('deleteModal');
                if (deleteModal) deleteModal.classList.add('active');
            };
        });
    }
}

function attachHerbEvents() {
    if (isAdmin) {
        document.querySelectorAll('.edit-herb').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                editHerb(btn.dataset.id);
            };
        });
        document.querySelectorAll('.del-herb').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                pendingDeleteId = btn.dataset.id;
                pendingDeleteType = 'herb';
                const deleteMsg = document.getElementById('deleteMessage');
                if (deleteMsg) deleteMsg.innerHTML = `⚠️ حذف "${btn.dataset.name}" من السحابة؟`;
                const deleteModal = document.getElementById('deleteModal');
                if (deleteModal) deleteModal.classList.add('active');
            };
        });
        document.querySelectorAll('.herb-card').forEach(card => {
            card.onclick = (e) => {
                if (!e.target.closest('.card-actions')) {
                    showHerbDetail(card.dataset.id);
                }
            };
        });
    } else {
        document.querySelectorAll('.herb-card').forEach(card => {
            card.onclick = () => showHerbDetail(card.dataset.id);
        });
    }
}

function showCategoryHerbs(catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    const catHerbs = herbs.filter(h => h.categoryId === catId);
    const container = document.getElementById('contentArea');
    if (!container) return;

    if (catHerbs.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>📂 لا توجد أعشاب في "${escapeHtml(cat.name)}"</p><button class="tool-btn" id="backToCategoriesBtn" style="margin-top:1rem;"><i class="fas fa-arrow-right"></i> العودة</button></div>`;
        const backBtn = document.getElementById('backToCategoriesBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                currentView = 'categories';
                renderContent();
                updateViewButtons('categories');
            });
        }
        return;
    }

    let html = `<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
                    <button id="backCatBtn" class="tool-btn"><i class="fas fa-arrow-right"></i> التصنيفات</button>
                    <h3>📂 ${escapeHtml(cat.name)}</h3>
                </div>
                <div class="herbs-grid">`;

    for (let herb of catHerbs) {
        html += `<div class="herb-card" data-id="${herb.id}">`;
        if (herb.imageUrl) html += `<img src="${escapeHtml(herb.imageUrl)}" class="herb-card-image">`;
        html += `
            <div class="herb-name">🌿 ${escapeHtml(herb.name)}</div>
            <div class="info-block"><div class="info-label">💚 الفوائد</div><div class="info-text">${escapeHtml(herb.benefits || '—')}</div></div>
            <div class="info-block"><div class="info-label">⚠️ التحذيرات</div><div class="info-text">${escapeHtml(herb.warnings || '—')}</div></div>
            <div class="info-block"><div class="info-label">⚡ الأضرار</div><div class="info-text">${escapeHtml(herb.harms || '—')}</div></div>
            <div class="info-block"><div class="info-label">🍵 الاستخدام</div><div class="info-text">${escapeHtml(herb.usage || '—')}</div></div>
        `;
        if (isAdmin) {
            html += `<div class="card-actions">
                        <i class="fas fa-edit edit-herb" data-id="${herb.id}"></i>
                        <i class="fas fa-trash-alt del-herb" data-id="${herb.id}" data-name="${escapeHtml(herb.name)}"></i>
                    </div>`;
        }
        html += `</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
    attachHerbEvents();

    const backBtn = document.getElementById('backCatBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            currentView = 'categories';
            renderContent();
            updateViewButtons('categories');
        });
    }
}

function showHerbDetail(id) {
    const herb = herbs.find(h => h.id === id);
    if (!herb) return;

    let catName = "بدون تصنيف";
    const cat = categories.find(c => c.id === herb.categoryId);
    if (cat) catName = cat.name;

    let html = `
        <div class="info-block"><div class="info-label">التصنيف</div><div class="info-text">${escapeHtml(catName)}</div></div>
        <div class="info-block"><div class="info-label">الاسم</div><div class="info-text">${escapeHtml(herb.name)}</div></div>
        <div class="info-block"><div class="info-label">الفوائد</div><div class="info-text">${escapeHtml(herb.benefits || '—')}</div></div>
        <div class="info-block"><div class="info-label">التحذيرات</div><div class="info-text">${escapeHtml(herb.warnings || '—')}</div></div>
        <div class="info-block"><div class="info-label">الأضرار</div><div class="info-text">${escapeHtml(herb.harms || '—')}</div></div>
        <div class="info-block"><div class="info-label">الاستخدام</div><div class="info-text">${escapeHtml(herb.usage || '—')}</div></div>
        <div class="info-block"><div class="info-label">ملاحظات</div><div class="info-text">${escapeHtml(herb.notes || '—')}</div></div>
    `;
    if (herb.imageUrl) {
        html += `<div class="info-block"><div class="info-label">🖼️ صورة العشبة</div><img src="${escapeHtml(herb.imageUrl)}" style="max-width:100%;border-radius:20px;margin-top:8px;"></div>`;
    }
    const detailContent = document.getElementById('detailContent');
    const detailModal = document.getElementById('detailModal');
    if (detailContent) detailContent.innerHTML = html;
    if (detailModal) detailModal.classList.add('active');
}

// =================================================================
// ========== إدارة التصنيفات =====================================
// =================================================================

async function addCategory(name) {
    await categoriesCol.add({ name: name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
}

async function updateCategory(id, name) {
    await categoriesCol.doc(id).update({ name: name });
}

async function deleteCategoryWithHerbs(id) {
    const batch = db.batch();
    const relatedHerbs = await herbsCol.where('categoryId', '==', id).get();
    relatedHerbs.forEach(doc => batch.delete(doc.ref));
    batch.delete(categoriesCol.doc(id));
    await batch.commit();
}

function showCategoryManager() {
    let listHtml = '';
    for (let cat of categories) {
        const herbsCount = herbs.filter(h => h.categoryId === cat.id).length;
        listHtml += `<div class="category-item">
                        <div class="category-name-display">
                            <i class="fas fa-folder"></i> ${escapeHtml(cat.name)}
                            <span style="font-size:0.7rem; background:var(--primary); color:white; padding:2px 8px; border-radius:30px;">${herbsCount}</span>
                        </div>
                        <div class="category-actions">
                            <i class="fas fa-edit edit-cat-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" style="color:var(--primary);"></i>
                            <i class="fas fa-trash-alt del-cat-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" style="color:var(--danger);"></i>
                        </div>
                    </div>`;
    }
    const categoriesList = document.getElementById('categoriesList');
    if (categoriesList) {
        categoriesList.innerHTML = categories.length === 0 ? '<div class="empty-state">لا توجد تصنيفات</div>' : listHtml;
    }

    document.querySelectorAll('.edit-cat-item').forEach(btn => {
        btn.onclick = () => {
            let newName = prompt("تعديل اسم التصنيف", btn.dataset.name);
            if (newName) updateCategory(btn.dataset.id, newName);
        };
    });
    document.querySelectorAll('.del-cat-item').forEach(btn => {
        btn.onclick = () => {
            pendingDeleteId = btn.dataset.id;
            pendingDeleteType = 'category';
            const deleteMsg = document.getElementById('deleteMessage');
            if (deleteMsg) deleteMsg.innerHTML = `⚠️ حذف التصنيف "${btn.dataset.name}" وجميع أعشابه؟`;
            const deleteModal = document.getElementById('deleteModal');
            if (deleteModal) deleteModal.classList.add('active');
        };
    });
    const categoryModal = document.getElementById('categoryModal');
    if (categoryModal) categoryModal.classList.add('active');
}

function addNewCategory() {
    let name = document.getElementById('newCategoryName')?.value.trim();
    if (name) {
        addCategory(name);
        const newCategoryInput = document.getElementById('newCategoryName');
        if (newCategoryInput) newCategoryInput.value = '';
        showCategoryManager();
    } else {
        alert('أدخل اسم التصنيف');
    }
}

function editCategoryModal(id, name) {
    let newName = prompt("تعديل اسم التصنيف", name);
    if (newName) updateCategory(id, newName);
}

// =================================================================
// ========== إدارة الأعشاب =======================================
// =================================================================

function populateCategorySelect(selectedId = '') {
    let select = document.getElementById('modalHerbCategory');
    if (!select) return;
    let options = '<option value="">-- بدون تصنيف --</option>';
    for (let cat of categories) {
        options += `<option value="${cat.id}" ${cat.id === selectedId ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`;
    }
    select.innerHTML = options;
}

function resetHerbForm() {
    currentEditHerbId = null;
    currentImageBase64 = null;
    currentImageFile = null;
    const herbName = document.getElementById('modalHerbName');
    const benefits = document.getElementById('modalHerbBenefits');
    const warnings = document.getElementById('modalHerbWarnings');
    const harams = document.getElementById('modalHerbHarams');
    const usage = document.getElementById('modalHerbUsage');
    const notes = document.getElementById('modalHerbNotes');
    const preview = document.getElementById('imagePreviewContainer');
    const clearBtn = document.getElementById('clearImageBtn');
    const compressInfo = document.getElementById('compressInfo');
    if (herbName) herbName.value = '';
    if (benefits) benefits.value = '';
    if (warnings) warnings.value = '';
    if (harams) harams.value = '';
    if (usage) usage.value = '';
    if (notes) notes.value = '';
    if (preview) preview.innerHTML = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (compressInfo) compressInfo.innerHTML = '';
    populateCategorySelect();
}

function showAddHerb() {
    if (!isAdmin) return;
    resetHerbForm();
    const herbModalTitle = document.getElementById('herbModalTitle');
    if (herbModalTitle) herbModalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة عشبة جديدة';
    const herbModal = document.getElementById('herbModal');
    if (herbModal) herbModal.classList.add('active');
}

function editHerb(id) {
    const herb = herbs.find(h => h.id === id);
    if (!herb) return;
    resetHerbForm();
    currentEditHerbId = id;
    currentImageBase64 = herb.imageUrl;
    const herbName = document.getElementById('modalHerbName');
    const benefits = document.getElementById('modalHerbBenefits');
    const warnings = document.getElementById('modalHerbWarnings');
    const harams = document.getElementById('modalHerbHarams');
    const usage = document.getElementById('modalHerbUsage');
    const notes = document.getElementById('modalHerbNotes');
    if (herbName) herbName.value = herb.name;
    if (benefits) benefits.value = herb.benefits || '';
    if (warnings) warnings.value = herb.warnings || '';
    if (harams) harams.value = herb.harms || '';
    if (usage) usage.value = herb.usage || '';
    if (notes) notes.value = herb.notes || '';
    populateCategorySelect(herb.categoryId || '');
    if (herb.imageUrl) {
        const preview = document.getElementById('imagePreviewContainer');
        const clearBtn = document.getElementById('clearImageBtn');
        if (preview) preview.innerHTML = `<img src="${escapeHtml(herb.imageUrl)}" class="herb-image-preview" onclick="document.getElementById('herbImageInput').click()">`;
        if (clearBtn) clearBtn.style.display = 'inline-flex';
        const compressInfo = document.getElementById('compressInfo');
        if (compressInfo) compressInfo.innerHTML = '🖼️ صورة موجودة';
    }
    const herbModalTitle = document.getElementById('herbModalTitle');
    if (herbModalTitle) herbModalTitle.innerHTML = '<i class="fas fa-edit"></i> تعديل العشبة';
    const herbModal = document.getElementById('herbModal');
    if (herbModal) herbModal.classList.add('active');
}

async function saveHerb() {
    let name = document.getElementById('modalHerbName')?.value.trim();
    if (!name) {
        alert('الاسم مطلوب');
        return;
    }
    let categoryId = document.getElementById('modalHerbCategory')?.value;
    let finalCategoryId = (categoryId === "") ? null : categoryId;
    let imageUrl = currentImageBase64;
    if (currentImageFile) {
        imageUrl = await compressImage(currentImageFile);
        currentImageFile = null;
    }
    let data = {
        name: name,
        categoryId: finalCategoryId,
        benefits: document.getElementById('modalHerbBenefits')?.value || '—',
        warnings: document.getElementById('modalHerbWarnings')?.value || '—',
        harms: document.getElementById('modalHerbHarams')?.value || '—',
        usage: document.getElementById('modalHerbUsage')?.value || '—',
        notes: document.getElementById('modalHerbNotes')?.value || '—',
        imageUrl: imageUrl || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    showSaveProgress(30, 'تجهيز...', 'حفظ البيانات');
    const docRef = currentEditHerbId ? herbsCol.doc(currentEditHerbId) : herbsCol.doc();
    await docRef.set(data, { merge: true });
    showSaveProgress(100, 'تم', 'انتهى');
    const herbModal = document.getElementById('herbModal');
    if (herbModal) herbModal.classList.remove('active');
    resetHerbForm();
}

async function confirmDelete() {
    if (pendingDeleteType === 'category') {
        await deleteCategoryWithHerbs(pendingDeleteId);
    } else if (pendingDeleteType === 'herb') {
        await herbsCol.doc(pendingDeleteId).delete();
    }
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) deleteModal.classList.remove('active');
    pendingDeleteId = null;
    pendingDeleteType = null;
}

async function deleteAllData() {
    const allCats = await categoriesCol.get();
    const allHerbs = await herbsCol.get();
    const batch = db.batch();
    allCats.docs.forEach(doc => batch.delete(doc.ref));
    allHerbs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    alert("تم حذف جميع الأعشاب والتصنيفات من السحابة");
    localStorage.removeItem(CACHE_KEY);
}

async function deleteAllHerbsOnly() {
    if (confirm("⚠️ تحذير: سيتم حذف جميع الأعشاب نهائياً؟")) {
        const allHerbs = await herbsCol.get();
        const batch = db.batch();
        allHerbs.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert("تم حذف جميع الأعشاب بنجاح");
        localStorage.removeItem(CACHE_KEY);
    }
}

async function backupJSON() {
    let data = { categories: categories, herbs: herbs, backupDate: new Date().toISOString() };
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = 'herbs_backup_' + Date.now() + '.json';
    a.click();
    alert("تم إنشاء ملف النسخ الاحتياطي");
}

function restoreJSON() {
    const restoreFile = document.getElementById('restoreFile');
    if (restoreFile) restoreFile.click();
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
            for (let c of cats) {
                await categoriesCol.add({ name: c.name, createdAt: new Date() });
            }
            for (let h of hs) {
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
    if (document.getElementById('restoreFile')) document.getElementById('restoreFile').value = '';
}

// =================================================================
// ========== المصادقة والمسؤول ===================================
// =================================================================

function setAdminMode(val) {
    isAdmin = val;
    const adminElements = document.querySelectorAll('.admin-only');
    for (let i = 0; i < adminElements.length; i++) {
        adminElements[i].style.display = val ? 'flex' : 'none';
    }
    const lockIcon = document.getElementById('lockIcon');
    if (lockIcon) lockIcon.innerHTML = val ? '<i class="fas fa-lock-open"></i>' : '<i class="fas fa-lock"></i>';
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = val ? 'flex' : 'none';
    if (val) {
        document.body.classList.remove('viewer-mode');
    } else {
        document.body.classList.add('viewer-mode');
    }
    renderContent();
    if (val) startAdminClock();
}

function showLogin() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) loginModal.classList.add('active');
}

async function attemptLogin() {
    const email = document.getElementById('adminEmail')?.value.trim();
    const password = document.getElementById('adminPassword')?.value;
    if (!email || !password) {
        alert('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }
    const loginBtn = document.getElementById('confirmLoginBtn');
    const originalText = loginBtn ? loginBtn.innerHTML : '';
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري...';
        loginBtn.disabled = true;
    }
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        if (user.uid === ADMIN_UID) {
            setAdminMode(true);
            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.remove('active');
            alert('مرحباً أيها المسؤول');
        } else {
            await auth.signOut();
            alert('⚠️ هذا الحساب ليس لديه صلاحيات المسؤول.\nUID الخاص بك: ' + user.uid);
        }
    } catch (error) {
        let msg = '';
        switch (error.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
                break;
            case 'auth/too-many-requests':
                msg = 'تم تعطيل الحساب مؤقتاً. حاول لاحقاً';
                break;
            default:
                msg = error.message;
        }
        alert('❌ فشل تسجيل الدخول: ' + msg);
    } finally {
        if (loginBtn) {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
        const adminPassword = document.getElementById('adminPassword');
        if (adminPassword) adminPassword.value = '';
    }
}

function logout() {
    auth.signOut();
    setAdminMode(false);
    alert('تم تسجيل الخروج');
}

function initAuthListener() {
    auth.onAuthStateChanged(user => {
        if (user && user.uid === ADMIN_UID) {
            setAdminMode(true);
        } else {
            setAdminMode(false);
        }
    });
}

// =================================================================
// ========== البحث ===============================================
// =================================================================

function showSearch() {
    const searchModal = document.getElementById('searchModal');
    if (searchModal) {
        searchModal.classList.add('active');
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 100);
        }
        const searchResults = document.getElementById('searchResults');
        if (searchResults) searchResults.innerHTML = '';
    }
}

function performSearch() {
    let q = document.getElementById('searchInput')?.value.trim().toLowerCase();
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    if (!q) {
        searchResults.innerHTML = '<div class="empty-state">اكتب اسم العشبة للبحث</div>';
        return;
    }
    let results = herbs.filter(h => h.name.toLowerCase().includes(q));
    if (results.length > 0) {
        let html = '';
        for (let h of results) {
            html += `<div class="search-item" onclick="window.showDetailFromSearch('${h.id}')">
                        <b>🌿 ${escapeHtml(h.name)}</b><br>
                        <small>${escapeHtml((h.benefits || '').substring(0, 70))}</small>
                    </div>`;
        }
        searchResults.innerHTML = html;
    } else {
        searchResults.innerHTML = '<div class="empty-state">لا توجد نتائج</div>';
    }
}

window.showDetailFromSearch = function(id) {
    if (herbs.find(h => h.id === id)) {
        const searchModal = document.getElementById('searchModal');
        if (searchModal) searchModal.classList.remove('active');
        showHerbDetail(id);
    }
};

// =================================================================
// ========== الثيم وحجم الخط =====================================
// =================================================================

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const modeTextSpan = document.getElementById('modeText');
    if (modeTextSpan) modeTextSpan.innerText = isDark ? 'ليلي' : 'نهاري';
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    const modeTextSpan = document.getElementById('modeText');
    if (modeTextSpan) {
        modeTextSpan.innerText = document.body.classList.contains('dark-mode') ? 'ليلي' : 'نهاري';
    }
}

let currentFontLevel = localStorage.getItem('fontLevel') || 'normal';

function setFontSize(level) {
    document.body.classList.remove('font-large', 'font-xlarge');
    if (level === 'large') document.body.classList.add('font-large');
    if (level === 'xlarge') document.body.classList.add('font-xlarge');
    localStorage.setItem('fontLevel', level);
    const labelMap = { normal: 'عادي', large: 'كبير', xlarge: 'أكبر' };
    const fontSizeLabel = document.getElementById('fontSizeLabel');
    if (fontSizeLabel) fontSizeLabel.innerText = labelMap[level];
    currentFontLevel = level;
}

function cycleFontSize() {
    const levels = ['normal', 'large', 'xlarge'];
    let idx = levels.indexOf(currentFontLevel);
    setFontSize(levels[(idx + 1) % levels.length]);
}

setFontSize(currentFontLevel);

// =================================================================
// ========== دوال الزوار =========================================
// =================================================================

const VisitorCounter = {
    init: function() {
        let c = localStorage.getItem('visitor');
        c = c ? parseInt(c) + 1 : 1;
        localStorage.setItem('visitor', c);
    }
};

async function visitorResync() {
    if (!confirm("🔄 إعادة المزامنة ستقوم بقطع الاتصال الحالي، وجلب أحدث البيانات من الخادم، ثم إعادة الاتصال المباشر.\nهل تريد الاستمرار؟")) return;
    try {
        if (unsubscribeCategories) unsubscribeCategories();
        if (unsubscribeHerbs) unsubscribeHerbs();
        isSyncActive = false;
        await forceFetchFromServer();
        isSyncActive = true;
        startRealtimeUpdates();
        alert("تمت إعادة المزامنة وتحديث البيانات من السيرفر.");
    } catch (e) {
        console.error(e);
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
            caches.keys().then(names => names.forEach(name => caches.delete(name)));
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
    for (let cat of categories) {
        const count = herbs.filter(h => h.categoryId === cat.id).length;
        catsList += `<div class="category-item" style="cursor:pointer;" data-cat-id="${cat.id}">
                        <div class="category-name-display">
                            <i class="fas fa-folder"></i> ${escapeHtml(cat.name)}
                            <span style="background:var(--primary);color:white;padding:2px 8px;border-radius:30px;">${count}</span>
                        </div>
                        <i class="fas fa-chevron-left"></i>
                    </div>`;
    }
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-glass active';
    modalDiv.innerHTML = `<div class="modal-glass-content" style="max-width:500px;">
                            <div class="modal-header">
                                <h3>📂 جميع التصنيفات</h3>
                                <div class="close-modal-btn" onclick="this.closest('.modal-glass').classList.remove('active')"><i class="fas fa-times"></i></div>
                            </div>
                            <div style="max-height:400px;overflow-y:auto;">${catsList}</div>
                            <div class="modal-actions">
                                <button class="btn-secondary" onclick="this.closest('.modal-glass').classList.remove('active')">إغلاق</button>
                            </div>
                        </div>`;
    document.body.appendChild(modalDiv);
    modalDiv.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            const catId = item.dataset.catId;
            modalDiv.classList.remove('active');
            setTimeout(() => {
                const cat = categories.find(c => c.id === catId);
                if (cat) showCategoryHerbs(catId);
                else alert("حدث خطأ");
            }, 100);
        });
    });
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'موسوعة الأعشاب الطبية',
            text: 'استكشف فوائد وأضرار الأعشاب الطبية',
            url: window.location.href
        }).catch(err => console.log('مشاركة ملغاة', err));
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => alert("تم نسخ رابط التطبيق، يمكنك مشاركته الآن"))
            .catch(() => alert("يمكنك مشاركة الرابط: " + window.location.href));
    }
}

function showVisitorStats() {
    const visits = localStorage.getItem('visitor') || 1;
    const lastVisit = localStorage.getItem('last_visit_date') || 'غير معروف';
    alert(`📊 إحصائيات سريعة:\n👥 عدد زياراتك لهذا التطبيق: ${visits}\n🌿 عدد الأعشاب المسجلة: ${herbs.length}\n📂 عدد التصنيفات: ${categories.length}\n📅 آخر زيارة مسجلة: ${lastVisit}`);
    localStorage.setItem('last_visit_date', new Date().toLocaleDateString('ar-EG'));
}

function showQuickHelp() {
    alert(`📖 دليل سريع لاستخدام الموسوعة:
🔍 بحث: اضغط على زر "بحث" لكتابة اسم العشبة.
📂 التصنيفات: اضغط على أي تصنيف لعرض أعشابه.
🌿 الأعشاب: اضغط على أي عشبة لرؤية التفاصيل كاملة.
🌙/☀️: يمكنك تغيير المظهر (ليلي/نهاري) من زر القمر/الشمس.
🔊 يمكنك تغيير حجم الخط من زر "Aa" في شريط الأدوات.
📞 للتواصل المباشر: اضغط على زر واتساب.
📲 لتثبيت التطبيق: اضغط على زر التحميل (إن وجد) أو من قائمة المتصفح.`);
}

// =================================================================
// ========== تحديث أزرار العرض ===================================
// =================================================================

function updateViewButtons(view) {
    const btns = document.querySelectorAll('.view-btn-large');
    btns.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// =================================================================
// ========== إغلاق المودالات بالضغط على الخلفية ==================
// =================================================================

function closeModalOnBackground(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// =================================================================
// ========== معالج شاشة البداية الذكي ============================
// =================================================================

(function smartSplashHandler() {
    const splash = document.getElementById('splashScreen');
    const mainApp = document.getElementById('mainApp');
    if (!splash || !mainApp) return;
    let loadCompleted = false;
    function hideSplash() {
        if (loadCompleted) return;
        loadCompleted = true;
        splash.classList.add('hide');
        mainApp.style.display = 'block';
    }
    setTimeout(() => { if (!loadCompleted) hideSplash(); }, 3000);
    setTimeout(() => { if (!loadCompleted && (!herbs || herbs.length === 0)) hideSplash(); }, 4000);
})();

// =================================================================
// ========== تهيئة التطبيق =======================================
// =================================================================

(async function() {
    initTheme();
    initAuthListener();
    VisitorCounter.init();
    await initialLoad();
    startRealtimeUpdates();
    updateViewButtons(currentView);
})();

// =================================================================
// ========== إضافة مستمعي الأحداث ================================
// =================================================================

document.addEventListener('DOMContentLoaded', function() {

    // إغلاق المودالات بالضغط على الخلفية
    closeModalOnBackground('categoryModal');
    closeModalOnBackground('herbModal');
    closeModalOnBackground('detailModal');
    closeModalOnBackground('searchModal');
    closeModalOnBackground('loginModal');
    closeModalOnBackground('deleteModal');
    closeModalOnBackground('deleteAllConfirmModal');
    closeModalOnBackground('installGuideModal');

    // إغلاق المودالات بزر ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-glass.active').forEach(modal => modal.classList.remove('active'));
        }
    });

    // زر البحث الرئيسي
    const mainSearchBtn = document.getElementById('mainSearchBtn');
    if (mainSearchBtn) {
        mainSearchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showSearch();
        });
    }

    // أزرار العرض الكبيرة
    const viewToggleLarge = document.getElementById('viewToggle');
    if (viewToggleLarge) {
        viewToggleLarge.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-btn-large');
            if (btn && btn.dataset.view) {
                currentView = btn.dataset.view;
                updateViewButtons(currentView);
                renderContent();
            }
        });
    }

    // أزرار المسؤول
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', manualRefresh);
    
    const addHerbBtn = document.getElementById('addHerbBtn');
    if (addHerbBtn) addHerbBtn.addEventListener('click', showAddHerb);
    
    const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
    if (manageCategoriesBtn) manageCategoriesBtn.addEventListener('click', showCategoryManager);
    
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) backupBtn.addEventListener('click', backupJSON);
    
    const restoreBtn = document.getElementById('restoreBtn');
    if (restoreBtn) restoreBtn.addEventListener('click', restoreJSON);
    
    const restoreFile = document.getElementById('restoreFile');
    if (restoreFile) restoreFile.addEventListener('change', handleRestore);
    
    const lockIcon = document.getElementById('lockIcon');
    if (lockIcon) lockIcon.addEventListener('click', showLogin);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    
    const cancelLoginBtn = document.getElementById('cancelLoginBtn');
    if (cancelLoginBtn) cancelLoginBtn.addEventListener('click', () => {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.remove('active');
    });
    
    const confirmLoginBtn = document.getElementById('confirmLoginBtn');
    if (confirmLoginBtn) confirmLoginBtn.addEventListener('click', attemptLogin);
    
    const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
    if (closeCategoryModalBtn) closeCategoryModalBtn.addEventListener('click', () => {
        const categoryModal = document.getElementById('categoryModal');
        if (categoryModal) categoryModal.classList.remove('active');
    });
    
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) addCategoryBtn.addEventListener('click', addNewCategory);
    
    const closeHerbModalBtn = document.getElementById('closeHerbModalBtn');
    if (closeHerbModalBtn) closeHerbModalBtn.addEventListener('click', () => {
        const herbModal = document.getElementById('herbModal');
        if (herbModal) herbModal.classList.remove('active');
    });
    
    const cancelHerbModalBtn = document.getElementById('cancelHerbModalBtn');
    if (cancelHerbModalBtn) cancelHerbModalBtn.addEventListener('click', () => {
        const herbModal = document.getElementById('herbModal');
        if (herbModal) herbModal.classList.remove('active');
    });
    
    const saveHerbModalBtn = document.getElementById('saveHerbModalBtn');
    if (saveHerbModalBtn) saveHerbModalBtn.addEventListener('click', saveHerb);
    
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', () => {
        const detailModal = document.getElementById('detailModal');
        if (detailModal) detailModal.classList.remove('active');
    });
    
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) deleteModal.classList.remove('active');
    });
    
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDelete);
    
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', () => {
        const deleteAllConfirmModal = document.getElementById('deleteAllConfirmModal');
        if (deleteAllConfirmModal) deleteAllConfirmModal.classList.add('active');
    });
    
    const closeDeleteAllModalBtn = document.getElementById('closeDeleteAllModalBtn');
    if (closeDeleteAllModalBtn) closeDeleteAllModalBtn.addEventListener('click', () => {
        const deleteAllConfirmModal = document.getElementById('deleteAllConfirmModal');
        if (deleteAllConfirmModal) deleteAllConfirmModal.classList.remove('active');
    });
    
    const cancelDeleteAllBtn = document.getElementById('cancelDeleteAllBtn');
    if (cancelDeleteAllBtn) cancelDeleteAllBtn.addEventListener('click', () => {
        const deleteAllConfirmModal = document.getElementById('deleteAllConfirmModal');
        if (deleteAllConfirmModal) deleteAllConfirmModal.classList.remove('active');
    });
    
    const confirmDeleteAllBtn = document.getElementById('confirmDeleteAllBtn');
    if (confirmDeleteAllBtn) confirmDeleteAllBtn.addEventListener('click', async () => {
        const deleteAllConfirmModal = document.getElementById('deleteAllConfirmModal');
        if (deleteAllConfirmModal) deleteAllConfirmModal.classList.remove('active');
        await deleteAllData();
    });
    
    const closeInstallGuideBtn = document.getElementById('closeInstallGuideBtn');
    if (closeInstallGuideBtn) closeInstallGuideBtn.addEventListener('click', () => {
        const installGuideModal = document.getElementById('installGuideModal');
        if (installGuideModal) installGuideModal.classList.remove('active');
    });
    
    const closeInstallGuideActBtn = document.getElementById('closeInstallGuideActBtn');
    if (closeInstallGuideActBtn) closeInstallGuideActBtn.addEventListener('click', () => {
        const installGuideModal = document.getElementById('installGuideModal');
        if (installGuideModal) installGuideModal.classList.remove('active');
    });
    
    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) whatsappBtn.addEventListener('click', openWhatsApp);
    
    const stopSyncBtn = document.getElementById('stopSyncBtn');
    if (stopSyncBtn) stopSyncBtn.addEventListener('click', stopRealtimeUpdates);
    
    const startSyncBtn = document.getElementById('startSyncBtn');
    if (startSyncBtn) startSyncBtn.addEventListener('click', restartRealtimeUpdates);
    
    const deleteAllHerbsOnlyBtn = document.getElementById('deleteAllHerbsOnlyBtn');
    if (deleteAllHerbsOnlyBtn) deleteAllHerbsOnlyBtn.addEventListener('click', deleteAllHerbsOnly);
    
    const fontSizeToggleBtn = document.getElementById('fontSizeToggleBtn');
    if (fontSizeToggleBtn) fontSizeToggleBtn.addEventListener('click', cycleFontSize);
    
    const resetSyncBtn = document.getElementById('resetSyncBtn');
    if (resetSyncBtn) resetSyncBtn.addEventListener('click', resetSync);
    
    const visitorResyncBtn = document.getElementById('visitorResyncBtn');
    if (visitorResyncBtn) visitorResyncBtn.addEventListener('click', visitorResync);
    
    const visitorClearTempBtn = document.getElementById('visitorClearTempBtn');
    if (visitorClearTempBtn) visitorClearTempBtn.addEventListener('click', visitorClearTempData);
    
    const visitorCategoriesBtn = document.getElementById('visitorCategoriesBtn');
    if (visitorCategoriesBtn) visitorCategoriesBtn.addEventListener('click', showVisitorCategories);
    
    const shareAppBtn = document.getElementById('shareAppBtn');
    if (shareAppBtn) shareAppBtn.addEventListener('click', shareApp);
    
    const visitorStatsBtn = document.getElementById('visitorStatsBtn');
    if (visitorStatsBtn) visitorStatsBtn.addEventListener('click', showVisitorStats);
    
    const quickHelpBtn = document.getElementById('quickHelpBtn');
    if (quickHelpBtn) quickHelpBtn.addEventListener('click', showQuickHelp);
    
    const closeSearchModalBtn = document.getElementById('closeSearchModalBtn');
    if (closeSearchModalBtn) closeSearchModalBtn.addEventListener('click', () => {
        const searchModal = document.getElementById('searchModal');
        if (searchModal) searchModal.classList.remove('active');
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', performSearch);
    
    // رفع الصورة
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    if (uploadImageBtn) uploadImageBtn.addEventListener('click', () => {
        const herbImageInput = document.getElementById('herbImageInput');
        if (herbImageInput) herbImageInput.click();
    });
    
    const herbImageInput = document.getElementById('herbImageInput');
    if (herbImageInput) {
        herbImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                currentImageFile = file;
                const compressed = await compressImage(file);
                currentImageBase64 = compressed;
                const previewContainer = document.getElementById('imagePreviewContainer');
                if (previewContainer) {
                    previewContainer.innerHTML = `<img src="${compressed}" class="herb-image-preview" onclick="document.getElementById('herbImageInput').click()">`;
                }
                const clearBtn = document.getElementById('clearImageBtn');
                if (clearBtn) clearBtn.style.display = 'inline-flex';
            } else {
                alert('ملف غير صالح');
            }
        });
    }
    
    const clearImageBtn = document.getElementById('clearImageBtn');
    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', () => {
            currentImageBase64 = null;
            currentImageFile = null;
            const herbImageInput = document.getElementById('herbImageInput');
            if (herbImageInput) herbImageInput.value = '';
            const previewContainer = document.getElementById('imagePreviewContainer');
            if (previewContainer) previewContainer.innerHTML = '';
            clearImageBtn.style.display = 'none';
            const compressInfo = document.getElementById('compressInfo');
            if (compressInfo) compressInfo.innerHTML = '';
        });
    }
    
    // تسجيل زائر
    let visitCount = parseInt(localStorage.getItem('visitor') || '0');
    localStorage.setItem('visitor', visitCount === 0 ? '1' : (visitCount + 1).toString());
    localStorage.setItem('last_visit_date', new Date().toLocaleDateString('ar-EG'));
    
});
