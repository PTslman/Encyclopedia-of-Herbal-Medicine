// ========== دوال مساعدة ==========
function escapeHtml(str) {
    if (!str) return '—';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

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
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function isOnline() { return navigator.onLine; }

function saveToLocalCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ data: data, timestamp: Date.now() }));
        return true;
    } catch(e) { return false; }
}

function loadFromLocalCache(key, maxAge = 7*24*60*60*1000) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp > maxAge) {
            localStorage.removeItem(key);
            return null;
        }
        return cached.data;
    } catch(e) { return null; }
}

function exportToJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert('تم النسخ')).catch(() => alert('فشل النسخ'));
}

function openWhatsApp() {
    window.open('https://wa.me/9630932934273?text=مرحباً أريد الاستفسار عن الأعشاب', '_blank');
}

// ========== بيانات التطبيق ==========
let categories = [];
let herbs = [];
let isAdmin = false;
let currentView = "all";
let currentEditHerbId = null;
let currentImageBase64 = null;
let currentImageFile = null;
let pendingDeleteId = null;
let pendingDeleteType = null;
let unsubscribeCategories = null;
let unsubscribeHerbs = null;
let isSyncActive = true;

// تحديث العرض
function updateHerbCount() {
    const el = document.getElementById('herbCount');
    if (el) el.innerText = herbs.length + ' عشبة';
}

// عرض المحتوى
function renderContent() {
    if (currentView === "all") {
        renderAllHerbs();
    } else {
        renderCategories();
    }
}

function renderAllHerbs() {
    const container = document.getElementById('contentArea');
    if (!herbs.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-leaf"></i><p>لا توجد أعشاب بعد</p></div>';
        return;
    }
    
    let html = '<div class="herbs-grid">';
    for (const herb of herbs) {
        const cat = categories.find(c => c.id === herb.categoryId);
        const catName = cat ? cat.name : "بدون تصنيف";
        
        html += `
            <div class="herb-card" data-id="${herb.id}">
                ${herb.imageUrl ? `<img src="${escapeHtml(herb.imageUrl)}" class="herb-card-image" loading="lazy">` : ''}
                <div class="card-header">
                    <span class="herb-name">🌿 ${escapeHtml(herb.name)}</span>
                    <span>${escapeHtml(catName)}</span>
                </div>
                <div class="info-block"><div class="info-label">💚 الفوائد</div><div class="info-text">${escapeHtml(herb.benefits || '—')}</div></div>
                <div class="info-block"><div class="info-label">⚠️ التحذيرات</div><div class="info-text">${escapeHtml(herb.warnings || '—')}</div></div>
                <div class="info-block"><div class="info-label">⚡ الأضرار</div><div class="info-text">${escapeHtml(herb.harms || '—')}</div></div>
                <div class="info-block"><div class="info-label">🍵 طريقة الاستخدام</div><div class="info-text">${escapeHtml(herb.usage || '—')}</div></div>
                ${isAdmin ? `
                    <div class="card-actions">
                        <i class="fas fa-edit edit-herb" data-id="${herb.id}" style="color:var(--primary);"></i>
                        <i class="fas fa-trash-alt del-herb" data-id="${herb.id}" data-name="${escapeHtml(herb.name)}" style="color:var(--danger);"></i>
                    </div>
                ` : ''}
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
    
    // ربط الأحداث
    if (isAdmin) {
        document.querySelectorAll('.edit-herb').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); editHerb(btn.dataset.id); };
        });
        document.querySelectorAll('.del-herb').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); pendingDeleteId = btn.dataset.id; pendingDeleteType = 'herb'; document.getElementById('deleteMessage').innerHTML = `⚠️ حذف "${btn.dataset.name}"؟`; document.getElementById('deleteModal').classList.add('active'); };
        });
    }
    document.querySelectorAll('.herb-card').forEach(card => {
        card.onclick = (e) => { if (!e.target.closest('.card-actions')) showHerbDetail(card.dataset.id); };
    });
}

function renderCategories() {
    const container = document.getElementById('contentArea');
    if (!categories.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>لا توجد تصنيفات</p></div>';
        return;
    }
    
    let html = '<div class="categories-grid">';
    for (const cat of categories) {
        const herbsCount = herbs.filter(h => h.categoryId === cat.id).length;
        html += `
            <div class="category-card" data-cat-id="${cat.id}">
                <div class="card-header">
                    <span class="category-name">📁 ${escapeHtml(cat.name)}</span>
                    <span>${herbsCount} عشبة</span>
                </div>
                <div>اضغط لعرض الأعشاب</div>
                ${isAdmin ? `
                    <div class="card-actions">
                        <i class="fas fa-edit edit-cat" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}"></i>
                        <i class="fas fa-trash-alt del-cat" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}"></i>
                    </div>
                ` : ''}
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
    
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions')) showCategoryHerbs(card.dataset.catId);
        });
    });
    
    if (isAdmin) {
        document.querySelectorAll('.edit-cat').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); const newName = prompt("تعديل اسم التصنيف", btn.dataset.name); if(newName) updateCategory(btn.dataset.id, newName); };
        });
        document.querySelectorAll('.del-cat').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); pendingDeleteId = btn.dataset.id; pendingDeleteType = 'category'; document.getElementById('deleteMessage').innerHTML = `⚠️ حذف التصنيف "${btn.dataset.name}" وجميع أعشابه؟`; document.getElementById('deleteModal').classList.add('active'); };
        });
    }
}

function showCategoryHerbs(catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const catHerbs = herbs.filter(h => h.categoryId === catId);
    const container = document.getElementById('contentArea');
    
    if (!catHerbs.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>لا توجد أعشاب في "${escapeHtml(cat.name)}"</p><button class="tool-btn" id="backToCategoriesBtn"><i class="fas fa-arrow-right"></i> العودة</button></div>`;
        document.getElementById('backToCategoriesBtn')?.addEventListener('click', () => { currentView = 'categories'; renderContent(); updateViewToggle('categories'); });
        return;
    }
    
    let html = `<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;"><button id="backCatBtn" class="tool-btn"><i class="fas fa-arrow-right"></i> التصنيفات</button><h3>📂 ${escapeHtml(cat.name)}</h3></div><div class="herbs-grid">`;
    for (const herb of catHerbs) {
        html += `
            <div class="herb-card" data-id="${herb.id}">
                ${herb.imageUrl ? `<img src="${escapeHtml(herb.imageUrl)}" class="herb-card-image">` : ''}
                <div class="herb-name">🌿 ${escapeHtml(herb.name)}</div>
                <div class="info-block"><div class="info-label">💚 الفوائد</div><div class="info-text">${escapeHtml(herb.benefits || '—')}</div></div>
                ${isAdmin ? `<div class="card-actions"><i class="fas fa-edit edit-herb" data-id="${herb.id}"></i><i class="fas fa-trash-alt del-herb" data-id="${herb.id}" data-name="${escapeHtml(herb.name)}"></i></div>` : ''}
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
    
    if (isAdmin) {
        document.querySelectorAll('.edit-herb').forEach(btn => { btn.onclick = (e) => { e.stopPropagation(); editHerb(btn.dataset.id); }; });
        document.querySelectorAll('.del-herb').forEach(btn => { btn.onclick = (e) => { e.stopPropagation(); pendingDeleteId = btn.dataset.id; pendingDeleteType = 'herb'; document.getElementById('deleteMessage').innerHTML = `⚠️ حذف "${btn.dataset.name}"؟`; document.getElementById('deleteModal').classList.add('active'); }; });
    }
    document.querySelectorAll('.herb-card').forEach(card => { card.onclick = (e) => { if (!e.target.closest('.card-actions')) showHerbDetail(card.dataset.id); }; });
    document.getElementById('backCatBtn')?.addEventListener('click', () => { currentView = 'categories'; renderContent(); updateViewToggle('categories'); });
}

function showHerbDetail(id) {
    const herb = herbs.find(h => h.id === id);
    if (!herb) return;
    const cat = categories.find(c => c.id === herb.categoryId);
    const html = `
        <div class="info-block"><div class="info-label">التصنيف</div><div class="info-text">${escapeHtml(cat ? cat.name : 'بدون تصنيف')}</div></div>
        <div class="info-block"><div class="info-label">الاسم</div><div class="info-text">${escapeHtml(herb.name)}</div></div>
        <div class="info-block"><div class="info-label">الفوائد</div><div class="info-text">${escapeHtml(herb.benefits || '—')}</div></div>
        <div class="info-block"><div class="info-label">التحذيرات</div><div class="info-text">${escapeHtml(herb.warnings || '—')}</div></div>
        <div class="info-block"><div class="info-label">الأضرار</div><div class="info-text">${escapeHtml(herb.harms || '—')}</div></div>
        <div class="info-block"><div class="info-label">الاستخدام</div><div class="info-text">${escapeHtml(herb.usage || '—')}</div></div>
        ${herb.imageUrl ? `<div class="info-block"><div class="info-label">🖼️ صورة العشبة</div><img src="${escapeHtml(herb.imageUrl)}" style="max-width:100%;border-radius:20px;"></div>` : ''}
    `;
    document.getElementById('detailContent').innerHTML = html;
    document.getElementById('detailModal').classList.add('active');
}

function editHerb(id) {
    const herb = herbs.find(h => h.id === id);
    if (!herb) return;
    resetHerbForm();
    currentEditHerbId = id;
    currentImageBase64 = herb.imageUrl;
    document.getElementById('modalHerbName').value = herb.name;
    document.getElementById('modalHerbBenefits').value = herb.benefits || '';
    document.getElementById('modalHerbWarnings').value = herb.warnings || '';
    document.getElementById('modalHerbHarams').value = herb.harms || '';
    document.getElementById('modalHerbUsage').value = herb.usage || '';
    document.getElementById('modalHerbNotes').value = herb.notes || '';
    populateCategorySelect(herb.categoryId || '');
    if (herb.imageUrl) {
        document.getElementById('imagePreviewContainer').innerHTML = `<img src="${herb.imageUrl}" class="herb-image-preview" onclick="document.getElementById('herbImageInput').click()">`;
        document.getElementById('clearImageBtn').style.display = 'inline-flex';
    }
    document.getElementById('herbModalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل العشبة';
    document.getElementById('herbModal').classList.add('active');
}

function showAddHerb() {
    if (!isAdmin) return;
    resetHerbForm();
    document.getElementById('herbModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة عشبة جديدة';
    document.getElementById('herbModal').classList.add('active');
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
    populateCategorySelect();
}

function populateCategorySelect(selectedId = '') {
    const select = document.getElementById('modalHerbCategory');
    let options = '<option value="">-- بدون تصنيف --</option>';
    for (const cat of categories) {
        options += `<option value="${cat.id}" ${cat.id === selectedId ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`;
    }
    select.innerHTML = options;
}

async function saveHerb() {
    const name = document.getElementById('modalHerbName').value.trim();
    if (!name) { alert('الاسم مطلوب'); return; }
    
    let imageUrl = currentImageBase64;
    if (currentImageFile) {
        try {
            imageUrl = await compressImage(currentImageFile);
            currentImageFile = null;
        } catch(e) {
            console.error('فشل ضغط الصورة:', e);
            alert('فشل ضغط الصورة، سيتم استخدام الصورة الأصلية إن وجدت');
            imageUrl = currentImageBase64 || null;
        }
    }
    
    const herbData = {
        name: name,
        categoryId: document.getElementById('modalHerbCategory').value || null,
        benefits: document.getElementById('modalHerbBenefits').value || '—',
        warnings: document.getElementById('modalHerbWarnings').value || '—',
        harms: document.getElementById('modalHerbHarams').value || '—',
        usage: document.getElementById('modalHerbUsage').value || '—',
        notes: document.getElementById('modalHerbNotes').value || '—',
        imageUrl: imageUrl || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = currentEditHerbId ? herbsCol.doc(currentEditHerbId) : herbsCol.doc();
    await docRef.set(herbData, { merge: true });
    document.getElementById('herbModal').classList.remove('active');
    resetHerbForm();
}

async function confirmDelete() {
    if (pendingDeleteType === 'category') {
        const batch = db.batch();
        const relatedHerbs = await herbsCol.where('categoryId', '==', pendingDeleteId).get();
        relatedHerbs.forEach(doc => batch.delete(doc.ref));
        batch.delete(categoriesCol.doc(pendingDeleteId));
        await batch.commit();
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
    allCats.docs.forEach(doc => batch.delete(doc.ref));
    allHerbs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    localStorage.removeItem('herbal_cache');
    alert('تم حذف جميع البيانات');
}

function showCategoryManager() {
    let listHtml = '';
    for (const cat of categories) {
        const herbsCount = herbs.filter(h => h.categoryId === cat.id).length;
        listHtml += `
            <div class="category-item">
                <div class="category-name-display"><i class="fas fa-folder"></i> ${escapeHtml(cat.name)} <span style="background:var(--primary);color:white;padding:2px 8px;border-radius:30px;">${herbsCount}</span></div>
                <div class="category-actions">
                    <i class="fas fa-edit edit-cat-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}"></i>
                    <i class="fas fa-trash-alt del-cat-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}"></i>
                </div>
            </div>
        `;
    }
    document.getElementById('categoriesList').innerHTML = listHtml || '<div class="empty-state">لا توجد تصنيفات</div>';
    
    document.querySelectorAll('.edit-cat-item').forEach(btn => {
        btn.onclick = () => { const newName = prompt("تعديل اسم التصنيف", btn.dataset.name); if(newName) updateCategory(btn.dataset.id, newName); };
    });
    document.querySelectorAll('.del-cat-item').forEach(btn => {
        btn.onclick = () => { pendingDeleteId = btn.dataset.id; pendingDeleteType = 'category'; document.getElementById('deleteMessage').innerHTML = `⚠️ حذف التصنيف "${btn.dataset.name}" وجميع أعشابه؟`; document.getElementById('deleteModal').classList.add('active'); };
    });
    document.getElementById('categoryModal').classList.add('active');
}

async function addNewCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    if (name) {
        await categoriesCol.add({ name: name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        document.getElementById('newCategoryName').value = '';
    } else { alert('أدخل اسم التصنيف'); }
}

async function updateCategory(id, name) {
    await categoriesCol.doc(id).update({ name: name });
}

function backupJSON() {
    exportToJSON({ categories, herbs, backupDate: new Date().toISOString() }, 'herbs_backup');
}

function restoreJSON() {
    document.getElementById('restoreFile').click();
}

async function handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.categories && data.herbs) {
        if (confirm('سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟')) {
            await deleteAllData();
            for (const cat of data.categories) await categoriesCol.add({ name: cat.name });
            for (const herb of data.herbs) await herbsCol.add({ name: herb.name, categoryId: herb.categoryId, benefits: herb.benefits || '—', warnings: herb.warnings || '—', harms: herb.harms || '—', usage: herb.usage || '—', notes: herb.notes || '—', imageUrl: herb.imageUrl || null });
            alert('تمت الاستعادة بنجاح');
        }
    } else { alert('ملف غير صالح'); }
    document.getElementById('restoreFile').value = '';
}

function showSearch() {
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function performSearch() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const results = herbs.filter(h => h.name.toLowerCase().includes(q));
    const container = document.getElementById('searchResults');
    if (results.length) {
        let html = '';
        for (const h of results) {
            html += `<div class="search-item" onclick="window.showDetailFromSearch('${h.id}')"><b>🌿 ${escapeHtml(h.name)}</b><br><small>${escapeHtml((h.benefits || '').substring(0, 70))}</small></div>`;
        }
        container.innerHTML = html;
    } else {
        container.innerHTML = '<div class="empty-state">لا نتائج</div>';
    }
}
window.showDetailFromSearch = (id) => {
    document.getElementById('searchModal').classList.remove('active');
    showHerbDetail(id);
};

function updateViewToggle(view) {
    document.querySelectorAll('.view-btn').forEach(btn => {
        if (btn.dataset.view === view) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

// ========== Firebase والمزامنة ==========
async function forceFetchFromServer() {
    try {
        const [catsSnap, herbsSnap] = await Promise.all([categoriesCol.orderBy('name').get(), herbsCol.get()]);
        categories = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        herbs = herbsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        saveToLocalCache('herbal_cache', { categories, herbs });
        updateHerbCount();
        renderContent();
    } catch(e) {
        console.error('فشل الاتصال بالسيرفر:', e);
        alert('فشل الاتصال بالسيرفر، يتم عرض البيانات المخزنة محلياً');
    }
}

function startRealtimeUpdates() {
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeHerbs) unsubscribeHerbs();
    unsubscribeCategories = categoriesCol.orderBy('name').onSnapshot(snapshot => {
        categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        saveToLocalCache('herbal_cache', { categories, herbs });
        renderContent();
    });
    unsubscribeHerbs = herbsCol.onSnapshot(snapshot => {
        herbs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        saveToLocalCache('herbal_cache', { categories, herbs });
        updateHerbCount();
        renderContent();
    });
}

async function initialLoad() {
    const cached = loadFromLocalCache('herbal_cache');
    if (cached) {
        categories = cached.categories || [];
        herbs = cached.herbs || [];
        updateHerbCount();
        renderContent();
    }
    if (isOnline()) {
        try { await forceFetchFromServer(); }
        catch(e) { console.error(e); }
    }
    startRealtimeUpdates();
}

// ========== المصادقة ==========
function setAdminMode(val) {
    isAdmin = val;
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = val ? 'inline-flex' : 'none');
    document.getElementById('lockIcon').innerHTML = val ? '<i class="fas fa-lock-open"></i>' : '<i class="fas fa-lock"></i>';
    document.getElementById('logoutBtn').style.display = val ? 'flex' : 'none';
    document.body.classList.toggle('viewer-mode', !val);
    document.querySelectorAll('.visitor-only').forEach(el => el.style.display = val ? 'none' : 'flex');
    renderContent();
    // تم إزالة استدعاء startAdminClock لأنه لا يوجد عنصر ساعة في HTML
}

async function login(email, password) {
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        if (cred.user.uid === ADMIN_UID) {
            setAdminMode(true);
            alert('مرحباً أيها المسؤول');
            return true;
        } else {
            await auth.signOut();
            alert('هذا الحساب ليس لديه صلاحيات المسؤول');
            return false;
        }
    } catch(e) { alert('فشل تسجيل الدخول: ' + e.message); return false; }
}

function logout() { auth.signOut(); setAdminMode(false); alert('تم تسجيل الخروج'); }

function initAuthListener() {
    auth.onAuthStateChanged(user => { setAdminMode(user && user.uid === ADMIN_UID); });
}

// ========== الثيم وحجم الخط ==========
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
    setFontSize(levels[(idx + 1) % levels.length]);
}
function initTheme() {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
    // تم إزالة الكود المتعلق بـ modeText لعدم وجود العنصر في HTML المعدل
}
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    // تم إزالة تحديث modeText
}

// ========== إحصائيات الزوار ==========
function initVisitorCounter() {
    let count = parseInt(localStorage.getItem('visitor_count') || '0');
    count++;
    localStorage.setItem('visitor_count', count);
    localStorage.setItem('last_visit_date', new Date().toLocaleDateString('ar-EG'));
}

function showQuickHelp() {
    alert(`📖 دليل سريع:
🔍 بحث: اضغط على زر "بحث"
📂 التصنيفات: اضغط على أي تصنيف
🌿 الأعشاب: اضغط على أي عشبة للتفاصيل
🌙/☀️: تغيير المظهر
🔊 تغيير حجم الخط من زر Aa
📞 واتساب للتواصل`);
}

function shareApp() {
    if (navigator.share) {
        navigator.share({ title: 'موسوعة الأعشاب الطبية', text: 'استكشف فوائد الأعشاب', url: window.location.href });
    } else {
        copyToClipboard(window.location.href);
    }
}

function showVisitorCategories() {
    if (!categories.length) { alert('لا توجد تصنيفات'); return; }
    let listHtml = '';
    for (const cat of categories) {
        const count = herbs.filter(h => h.categoryId === cat.id).length;
        listHtml += `<div class="category-item" data-cat-id="${cat.id}" style="cursor:pointer;"><div class="category-name-display"><i class="fas fa-folder"></i> ${escapeHtml(cat.name)} <span style="background:var(--primary);color:white;padding:2px 8px;border-radius:30px;">${count}</span></div><i class="fas fa-chevron-left"></i></div>`;
    }
    const modal = document.createElement('div');
    modal.className = 'modal-glass active';
    modal.innerHTML = `<div class="modal-glass-content"><div class="modal-header"><h3>📂 التصنيفات</h3><div class="close-modal-btn" onclick="this.closest('.modal-glass').remove()"><i class="fas fa-times"></i></div></div><div style="max-height:400px;overflow-y:auto;">${listHtml}</div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            modal.remove();
            showCategoryHerbs(item.dataset.catId);
        });
    });
}

// ========== معالج شاشة البداية ==========
function smartSplashHandler() {
    const splash = document.getElementById('splashScreen');
    const mainApp = document.getElementById('mainApp');
    if (!splash || !mainApp) return;
    let hidden = false;
    const hide = () => { if (hidden) return; hidden = true; splash.classList.add('hide'); mainApp.style.display = 'block'; };
    setTimeout(() => { if (!hidden) hide(); }, 3000);
    const checkInterval = setInterval(() => {
        if ((herbs.length > 0 || categories.length > 0) && !hidden) {
            clearInterval(checkInterval);
            setTimeout(hide, 100);
        }
    }, 100);
}

// ========== تهيئة المستمعين (مع الإصلاحات) ==========
function initEventListeners() {
    document.getElementById('refreshDataBtn')?.addEventListener('click', forceFetchFromServer);
    document.getElementById('addHerbBtn')?.addEventListener('click', showAddHerb);
    document.getElementById('manageCategoriesBtn')?.addEventListener('click', showCategoryManager);
    document.getElementById('backupBtn')?.addEventListener('click', backupJSON);
    document.getElementById('restoreBtn')?.addEventListener('click', restoreJSON);
    document.getElementById('restoreFile')?.addEventListener('change', handleRestore);
    document.getElementById('deleteAllBtn')?.addEventListener('click', () => document.getElementById('deleteAllConfirmModal').classList.add('active'));
    document.getElementById('confirmDeleteAllBtn')?.addEventListener('click', async () => { await deleteAllData(); document.getElementById('deleteAllConfirmModal').classList.remove('active'); });
    document.getElementById('closeDeleteAllModalBtn')?.addEventListener('click', () => document.getElementById('deleteAllConfirmModal').classList.remove('active'));
    document.getElementById('cancelDeleteAllBtn')?.addEventListener('click', () => document.getElementById('deleteAllConfirmModal').classList.remove('active'));
    document.getElementById('searchBtn')?.addEventListener('click', showSearch);
    document.getElementById('closeSearchModalBtn')?.addEventListener('click', () => document.getElementById('searchModal').classList.remove('active'));
    document.getElementById('searchInput')?.addEventListener('input', performSearch);
    document.getElementById('lockIcon')?.addEventListener('click', () => document.getElementById('loginModal').classList.add('active'));
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('cancelLoginBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.remove('active'));
    document.getElementById('confirmLoginBtn')?.addEventListener('click', async () => { await login(document.getElementById('adminEmail').value, document.getElementById('adminPassword').value); document.getElementById('loginModal').classList.remove('active'); document.getElementById('adminPassword').value = ''; });
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('whatsappBtn')?.addEventListener('click', openWhatsApp);
    document.getElementById('fontSizeToggleBtn')?.addEventListener('click', cycleFontSize);
    document.getElementById('closeCategoryModalBtn')?.addEventListener('click', () => document.getElementById('categoryModal').classList.remove('active'));
    document.getElementById('addCategoryBtn')?.addEventListener('click', addNewCategory);
    document.getElementById('closeHerbModalBtn')?.addEventListener('click', () => document.getElementById('herbModal').classList.remove('active'));
    document.getElementById('cancelHerbModalBtn')?.addEventListener('click', () => document.getElementById('herbModal').classList.remove('active'));
    document.getElementById('saveHerbModalBtn')?.addEventListener('click', saveHerb);
    document.getElementById('closeDetailModalBtn')?.addEventListener('click', () => document.getElementById('detailModal').classList.remove('active'));
    
    // إصلاح أزرار مودال الحذف (التوافق مع الـ HTML المعدل)
    document.getElementById('cancelDeleteModalBtn')?.addEventListener('click', () => document.getElementById('deleteModal').classList.remove('active'));
    document.getElementById('closeDeleteModalBtn')?.addEventListener('click', () => document.getElementById('deleteModal').classList.remove('active'));
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
    
    document.getElementById('uploadImageBtn')?.addEventListener('click', () => document.getElementById('herbImageInput').click());
    document.getElementById('herbImageInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            currentImageFile = file;
            try {
                const compressed = await compressImage(file);
                currentImageBase64 = compressed;
                document.getElementById('imagePreviewContainer').innerHTML = `<img src="${compressed}" class="herb-image-preview" onclick="document.getElementById('herbImageInput').click()">`;
                document.getElementById('clearImageBtn').style.display = 'inline-flex';
            } catch(e) {
                console.error('فشل ضغط الصورة أثناء المعاينة:', e);
                alert('تعذر معالجة الصورة');
            }
        }
    });
    document.getElementById('clearImageBtn')?.addEventListener('click', () => {
        currentImageBase64 = null;
        currentImageFile = null;
        document.getElementById('herbImageInput').value = '';
        document.getElementById('imagePreviewContainer').innerHTML = '';
        document.getElementById('clearImageBtn').style.display = 'none';
    });
    document.getElementById('visitorCategoriesBtn')?.addEventListener('click', showVisitorCategories);
    document.getElementById('shareAppBtn')?.addEventListener('click', shareApp);
    document.getElementById('quickHelpBtn')?.addEventListener('click', showQuickHelp);
    document.getElementById('viewToggle')?.addEventListener('click', (e) => {
        if (e.target.dataset.view) {
            currentView = e.target.dataset.view;
            renderContent();
            updateViewToggle(currentView);
        }
    });
}

// ========== تشغيل التطبيق ==========
async function startApp() {
    initTheme();
    initAuthListener();
    initVisitorCounter();
    await initialLoad();
    initEventListeners();
    smartSplashHandler();
}
startApp();
