// ========== دوال واجهة المستخدم ==========

let currentView = "all";
let currentEditHerbId = null;
let currentImageBase64 = null;
let currentImageFile = null;
let pendingDeleteId = null;
let pendingDeleteType = null;

// تحديث عدد الأعشاب
function updateHerbCount(count) {
    const herbCountEl = document.getElementById('herbCount');
    if (herbCountEl) {
        herbCountEl.innerText = `${count} عشبة`;
    }
}

// عرض المحتوى حسب العرض الحالي
function renderContent() {
    if (currentView === "all") {
        renderAllHerbs();
    } else {
        renderCategories();
    }
}

// عرض جميع الأعشاب
function renderAllHerbs() {
    const container = document.getElementById('contentArea');
    const currentHerbs = window.herbs ? window.herbs() : [];
    
    if (!currentHerbs || currentHerbs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-leaf"></i><p>لا توجد أعشاب بعد</p></div>';
        return;
    }
    
    let html = '<div class="herbs-grid">';
    const currentCategories = window.categories ? window.categories() : [];
    
    for (const herb of currentHerbs) {
        const cat = currentCategories.find(c => c.id === herb.categoryId);
        const catName = cat ? cat.name : "بدون تصنيف";
        
        html += `
            <div class="herb-card" data-id="${herb.id}">
                ${herb.imageUrl ? `<img src="${escapeHtml(herb.imageUrl)}" class="herb-card-image" loading="lazy" onerror="this.style.display='none'">` : ''}
                <div class="card-header">
                    <span class="herb-name">🌿 ${escapeHtml(herb.name)}</span>
                    <span>${escapeHtml(catName)}</span>
                </div>
                <div class="info-block">
                    <div class="info-label">💚 الفوائد</div>
                    <div class="info-text">${escapeHtml(herb.benefits || '—')}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">⚠️ التحذيرات</div>
                    <div class="info-text">${escapeHtml(herb.warnings || '—')}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">⚡ الأضرار</div>
                    <div class="info-text">${escapeHtml(herb.harms || '—')}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">🍵 طريقة الاستخدام</div>
                    <div class="info-text">${escapeHtml(herb.usage || '—')}</div>
                </div>
                ${window.isAdmin() ? `
                    <div class="card-actions">
                        <i class="fas fa-edit edit-herb" data-id="${herb.id}" style="cursor:pointer;color:var(--primary);"></i>
                        <i class="fas fa-trash-alt del-herb" data-id="${herb.id}" data-name="${escapeHtml(herb.name)}" style="cursor:pointer;color:var(--danger);"></i>
                    </div>
                ` : ''}
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
    
    attachHerbEvents();
}

// عرض التصنيفات
function renderCategories() {
    const container = document.getElementById('contentArea');
    const currentCategories = window.categories ? window.categories() : [];
    const currentHerbs = window.herbs ? window.herbs() : [];
    
    if (!currentCategories || currentCategories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>لا توجد تصنيفات</p></div>';
        return;
    }
    
    let html = '<div class="categories-grid">';
    
    for (const cat of currentCategories) {
        const herbsCount = currentHerbs.filter(h => h.categoryId === cat.id).length;
        
        html += `
            <div class="category-card" data-cat-id="${cat.id}">
                <div class="card-header">
                    <span class="category-name">📁 ${escapeHtml(cat.name)}</span>
                    <span>${herbsCount} عشبة</span>
                </div>
                <div>اضغط لعرض الأعشاب</div>
                ${window.isAdmin() ? `
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
    
    // إضافة مستمعي الأحداث
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions')) {
                showCategoryHerbs(card.dataset.catId);
            }
        });
    });
    
    if (window.isAdmin()) {
        document.querySelectorAll('.edit-cat').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                editCategory(btn.dataset.id, btn.dataset.name);
            };
        });
        
        document.querySelectorAll('.del-cat').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                pendingDeleteId = btn.dataset.id;
                pendingDeleteType = 'category';
                document.getElementById('deleteMessage').innerHTML = `⚠️ حذف التصنيف "${btn.dataset.name}" وجميع أعشابه؟`;
                document.getElementById('deleteModal').classList.add('active');
            };
        });
    }
}

// إضافة مستمعي الأحداث للأعشاب
function attachHerbEvents() {
    const isAdminMode = window.isAdmin();
    
    if (isAdminMode) {
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
                document.getElementById('deleteMessage').innerHTML = `⚠️ حذف "${btn.dataset.name}" من السحابة؟`;
                document.getElementById('deleteModal').classList.add('active');
            };
        });
    }
    
    document.querySelectorAll('.herb-card').forEach(card => {
        card.onclick = (e) => {
            if (!e.target.closest('.card-actions')) {
                showHerbDetail(card.dataset.id);
            }
        };
    });
}

// عرض أعشاب تصنيف معين
function showCategoryHerbs(categoryId) {
    const currentCategories = window.categories ? window.categories() : [];
    const currentHerbs = window.herbs ? window.herbs() : [];
    
    const category = currentCategories.find(c => c.id === categoryId);
    if (!category) return;
    
    const categoryHerbs = currentHerbs.filter(h => h.categoryId === categoryId);
    const container = document.getElementById('contentArea');
    
    if (categoryHerbs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>📂 لا توجد أعشاب في "${escapeHtml(category.name)}"</p>
                <button class="tool-btn" id="backToCategoriesBtn" style="margin-top:1rem;"><i class="fas fa-arrow-right"></i> العودة</button>
            </div>
        `;
        document.getElementById('backToCategoriesBtn')?.addEventListener('click', () => {
            currentView = 'categories';
            renderContent();
            updateViewToggle('categories');
        });
        return;
    }
    
    let html = `
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
            <button id="backCatBtn" class="tool-btn"><i class="fas fa-arrow-right"></i> التصنيفات</button>
            <h3>📂 ${escapeHtml(category.name)}</h3>
        </div>
        <div class="herbs-grid">
    `;
    
    for (const herb of categoryHerbs) {
        html += `
            <div class="herb-card" data-id="${herb.id}">
                ${herb.imageUrl ? `<img src="${escapeHtml(herb.imageUrl)}" class="herb-card-image" loading="lazy">` : ''}
                <div class="herb-name">🌿 ${escapeHtml(herb.name)}</div>
                <div class="info-block"><div class="info-label">💚 الفوائد</div><div class="info-text">${escapeHtml(herb.benefits || '—')}</div></div>
                <div class="info-block"><div class="info-label">⚠️ التحذيرات</div><div class="info-text">${escapeHtml(herb.warnings || '—')}</div></div>
                <div class="info-block"><div class="info-label">⚡ الأضرار</div><div class="info-text">${escapeHtml(herb.harms || '—')}</div></div>
                ${window.isAdmin() ? `
                    <div class="card-actions">
                        <i class="fas fa-edit edit-herb" data-id="${herb.id}"></i>
                        <i class="fas fa-trash-alt del-herb" data-id="${herb.id}" data-name="${escapeHtml(herb.name)}"></i>
                    </div>
                ` : ''}
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
    
    attachHerbEvents();
    document.getElementById('backCatBtn')?.addEventListener('click', () => {
        currentView = 'categories';
        renderContent();
        updateViewToggle('categories');
    });
}

// عرض تفاصيل عشبة
function showHerbDetail(herbId) {
    const currentHerbs = window.herbs ? window.herbs() : [];
    const currentCategories = window.categories ? window.categories() : [];
    
    const herb = currentHerbs.find(h => h.id === herbId);
    if (!herb) return;
    
    const category = currentCategories.find(c => c.id === herb.categoryId);
    const catName = category ? category.name : "بدون تصنيف";
    
    const html = `
        <div class="info-block"><div class="info-label">التصنيف</div><div class="info-text">${escapeHtml(catName)}</div></div>
        <div class="info-block"><div class="info-label">الاسم</div><div class="info-text">${escapeHtml(herb.name)}</div></div>
        <div class="info-block"><div class="info-label">الفوائد</div><div class="info-text">${escapeHtml(herb.benefits || '—')}</div></div>
        <div class="info-block"><div class="info-label">التحذيرات</div><div class="info-text">${escapeHtml(herb.warnings || '—')}</div></div>
        <div class="info-block"><div class="info-label">الأضرار</div><div class="info-text">${escapeHtml(herb.harms || '—')}</div></div>
        <div class="info-block"><div class="info-label">الاستخدام</div><div class="info-text">${escapeHtml(herb.usage || '—')}</div></div>
        <div class="info-block"><div class="info-label">ملاحظات</div><div class="info-text">${escapeHtml(herb.notes || '—')}</div></div>
        ${herb.imageUrl ? `<div class="info-block"><div class="info-label">🖼️ صورة العشبة</div><img src="${escapeHtml(herb.imageUrl)}" style="max-width:100%;border-radius:20px;margin-top:8px;"></div>` : ''}
    `;
    
    document.getElementById('detailContent').innerHTML = html;
    document.getElementById('detailModal').classList.add('active');
}

// تحرير عشبة
function editHerb(herbId) {
    const currentHerbs = window.herbs ? window.herbs() : [];
    const herb = currentHerbs.find(h => h.id === herbId);
    if (!herb) return;
    
    resetHerbForm();
    currentEditHerbId = herbId;
    currentImageBase64 = herb.imageUrl;
    
    document.getElementById('modalHerbName').value = herb.name;
    document.getElementById('modalHerbBenefits').value = herb.benefits || '';
    document.getElementById('modalHerbWarnings').value = herb.warnings || '';
    document.getElementById('modalHerbHarams').value = herb.harms || '';
    document.getElementById('modalHerbUsage').value = herb.usage || '';
    document.getElementById('modalHerbNotes').value = herb.notes || '';
    
    populateCategorySelect(herb.categoryId || '');
    
    if (herb.imageUrl) {
        document.getElementById('imagePreviewContainer').innerHTML = `<img src="${escapeHtml(herb.imageUrl)}" class="herb-image-preview" onclick="document.getElementById('herbImageInput').click()">`;
        document.getElementById('clearImageBtn').style.display = 'inline-flex';
    }
    
    document.getElementById('herbModalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل العشبة';
    document.getElementById('herbModal').classList.add('active');
}

// إضافة عشبة جديدة
function showAddHerb() {
    if (!window.isAdmin()) return;
    resetHerbForm();
    document.getElementById('herbModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة عشبة جديدة';
    document.getElementById('herbModal').classList.add('active');
}

// إعادة تعيين نموذج العشبة
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

// تعبئة قائمة التصنيفات
function populateCategorySelect(selectedId = '') {
    const currentCategories = window.categories ? window.categories() : [];
    const select = document.getElementById('modalHerbCategory');
    
    let options = '<option value="">-- بدون تصنيف --</option>';
    for (const cat of currentCategories) {
        options += `<option value="${cat.id}" ${cat.id === selectedId ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`;
    }
    select.innerHTML = options;
}

// حفظ العشبة
async function saveHerb() {
    const name = document.getElementById('modalHerbName').value.trim();
    if (!name) {
        alert('الاسم مطلوب');
        return;
    }
    
    const categoryId = document.getElementById('modalHerbCategory').value || null;
    let imageUrl = currentImageBase64;
    
    if (currentImageFile) {
        const quality = getAdaptiveCompressionQuality(currentImageFile.size);
        imageUrl = await compressImage(currentImageFile, 800, quality);
        currentImageFile = null;
    }
    
    const herbData = {
        name: name,
        categoryId: categoryId,
        benefits: document.getElementById('modalHerbBenefits').value || '—',
        warnings: document.getElementById('modalHerbWarnings').value || '—',
        harms: document.getElementById('modalHerbHarams').value || '—',
        usage: document.getElementById('modalHerbUsage').value || '—',
        notes: document.getElementById('modalHerbNotes').value || '—',
        imageUrl: imageUrl || null
    };
    
    try {
        await window.saveHerbToDB(herbData, currentEditHerbId);
        document.getElementById('herbModal').classList.remove('active');
        resetHerbForm();
        
        if (!currentEditHerbId) {
            showNotification('🌿 عشبة جديدة', `تم إضافة "${name}" إلى الموسوعة`);
        }
    } catch (error) {
        alert('فشل حفظ العشبة: ' + error.message);
    }
}

// حذف مؤكد
async function confirmDelete() {
    if (pendingDeleteType === 'category') {
        await window.deleteCategoryWithHerbs(pendingDeleteId);
    } else if (pendingDeleteType === 'herb') {
        await window.deleteHerb(pendingDeleteId);
    }
    
    document.getElementById('deleteModal').classList.remove('active');
    pendingDeleteId = null;
    pendingDeleteType = null;
}

// حذف الكل
async function deleteAll() {
    if (confirm('⚠️ تحذير: سيتم حذف جميع الأعشاب والتصنيفات نهائياً؟')) {
        await window.deleteAllData();
        alert('تم حذف جميع البيانات');
    }
}

// حذف الأعشاب فقط
async function deleteAllHerbsOnly() {
    if (confirm('⚠️ تحذير: سيتم حذف جميع الأعشاب نهائياً؟')) {
        await window.deleteAllHerbsOnly();
        alert('تم حذف جميع الأعشاب');
    }
}

// إدارة التصنيفات
function showCategoryManager() {
    const currentCategories = window.categories ? window.categories() : [];
    const currentHerbs = window.herbs ? window.herbs() : [];
    
    let listHtml = '';
    for (const cat of currentCategories) {
        const herbsCount = currentHerbs.filter(h => h.categoryId === cat.id).length;
        listHtml += `
            <div class="category-item">
                <div class="category-name-display">
                    <i class="fas fa-folder"></i> ${escapeHtml(cat.name)}
                    <span style="font-size:0.7rem; background:var(--primary); color:white; padding:2px 8px; border-radius:30px;">${herbsCount}</span>
                </div>
                <div class="category-actions">
                    <i class="fas fa-edit edit-cat-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" style="color:var(--primary);"></i>
                    <i class="fas fa-trash-alt del-cat-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" style="color:var(--danger);"></i>
                </div>
            </div>
        `;
    }
    
    if (currentCategories.length === 0) {
        listHtml = '<div class="empty-state">لا توجد تصنيفات</div>';
    }
    
    document.getElementById('categoriesList').innerHTML = listHtml;
    
    document.querySelectorAll('.edit-cat-item').forEach(btn => {
        btn.onclick = () => editCategory(btn.dataset.id, btn.dataset.name);
    });
    
    document.querySelectorAll('.del-cat-item').forEach(btn => {
        btn.onclick = () => {
            pendingDeleteId = btn.dataset.id;
            pendingDeleteType = 'category';
            document.getElementById('deleteMessage').innerHTML = `⚠️ حذف التصنيف "${btn.dataset.name}" وجميع أعشابه؟`;
            document.getElementById('deleteModal').classList.add('active');
        };
    });
    
    document.getElementById('categoryModal').classList.add('active');
}

// تحرير تصنيف
async function editCategory(id, currentName) {
    const newName = prompt("تعديل اسم التصنيف", currentName);
    if (newName && newName !== currentName) {
        await window.updateCategory(id, newName);
    }
}

// إضافة تصنيف جديد
async function addNewCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    if (name) {
        await window.addCategory(name);
        document.getElementById('newCategoryName').value = '';
        showCategoryManager();
    } else {
        alert('أدخل اسم التصنيف');
    }
}

// البحث
function showSearch() {
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const currentHerbs = window.herbs ? window.herbs() : [];
    
    const results = currentHerbs.filter(herb => 
        herb.name.toLowerCase().includes(query)
    );
    
    const container = document.getElementById('searchResults');
    
    if (results.length > 0) {
        let html = '';
        for (const herb of results) {
            html += `
                <div class="search-item" onclick="window.showDetailFromSearch('${herb.id}')">
                    <b>🌿 ${escapeHtml(herb.name)}</b><br>
                    <small>${escapeHtml((herb.benefits || '').substring(0, 70))}</small>
                </div>
            `;
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

// تحديث زر العرض
function updateViewToggle(view) {
    const btns = document.querySelectorAll('.view-btn');
    btns.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// نسخ احتياطي
function backupJSON() {
    const data = {
        categories: window.categories(),
        herbs: window.herbs(),
        backupDate: new Date().toISOString(),
        version: '4.0'
    };
    exportToJSON(data, 'herbs_backup');
}

// استعادة من نسخة احتياطية
function restoreJSON() {
    document.getElementById('restoreFile').click();
}

async function handleRestore(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.categories && data.herbs && Array.isArray(data.categories) && Array.isArray(data.herbs)) {
            if (confirm('⚠️ سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟')) {
                await window.deleteAllData();
                
                for (const cat of data.categories) {
                    await window.addCategory(cat.name);
                }
                
                for (const herb of data.herbs) {
                    await window.saveHerbToDB({
                        name: herb.name,
                        categoryId: herb.categoryId,
                        benefits: herb.benefits || '—',
                        warnings: herb.warnings || '—',
                        harms: herb.harms || '—',
                        usage: herb.usage || '—',
                        notes: herb.notes || '—',
                        imageUrl: herb.imageUrl || null
                    });
                }
                
                alert('تمت الاستعادة بنجاح');
            }
        } else {
            alert('ملف غير صالح');
        }
    } catch (error) {
        alert('خطأ في قراءة الملف: ' + error.message);
    }
    
    document.getElementById('restoreFile').value = '';
}

// تحديث يدوي
async function manualRefresh() {
    const btn = document.getElementById('refreshDataBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري التحديث...';
    btn.disabled = true;
    
    try {
        await window.forceFetchFromServer();
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Export UI functions
window.updateHerbCount = updateHerbCount;
window.renderContent = renderContent;
window.showAddHerb = showAddHerb;
window.editHerb = editHerb;
window.saveHerb = saveHerb;
window.confirmDelete = confirmDelete;
window.deleteAll = deleteAll;
window.deleteAllHerbsOnly = deleteAllHerbsOnly;
window.showCategoryManager = showCategoryManager;
window.addNewCategory = addNewCategory;
window.editCategory = editCategory;
window.showSearch = showSearch;
window.performSearch = performSearch;
window.backupJSON = backupJSON;
window.restoreJSON = restoreJSON;
window.handleRestore = handleRestore;
window.manualRefresh = manualRefresh;