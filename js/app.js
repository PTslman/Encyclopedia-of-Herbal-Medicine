// ============================================
// موسوعة الأعشاب الطبية - التطبيق الرئيسي
// نسخة متكاملة مع Supabase
// ============================================

// =================================================================
// ========== متغيرات Supabase =====================================
// =================================================================

const SUPABASE_URL = 'https://jedazmlbcnuwmtozldes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGF6bWxiY251d210b3psZGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTQyNjcsImV4cCI6MjA5NDkzMDI2N30.8391ZND2V9_N3RzkFYiDNnej1o_eUQoQ1174nwxpMwI';

let supabase = null;

// تهيئة Supabase
function initSupabase() {
    if (window.supabase && !supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized');
        return true;
    }
    return false;
}

// =================================================================
// ========== دوال Supabase الأساسية ===============================
// =================================================================

// دوال التصنيفات
async function getAllCategories() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return data || [];
}

async function addCategory(name) {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.from('categories').insert([{ name }]).select();
    if (error) throw error;
    return data?.[0];
}

async function updateCategory(id, name) {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    return { error };
}

async function deleteCategory(id) {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.from('categories').delete().eq('id', id);
    return { error };
}

// دوال الأعشاب
async function getAllHerbs() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('herbs').select('*').order('name');
    if (error) throw error;
    return data || [];
}

async function addHerb(herbData) {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.from('herbs').insert([herbData]).select();
    if (error) throw error;
    return data?.[0];
}

async function updateHerb(id, herbData) {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.from('herbs').update(herbData).eq('id', id);
    return { error };
}

async function deleteHerb(id) {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.from('herbs').delete().eq('id', id);
    return { error };
}

// دوال المصادقة
async function loginAdmin(email, password) {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { data };
}

async function logoutAdmin() {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

async function checkCurrentSession() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
}

function onAuthChange(callback) {
    if (!supabase) return;
    supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// =================================================================
// ========== المتغيرات العامة ====================================
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
let currentImageUrl = null;

const CACHE_KEY = 'herbal_cache_v3';

// =================================================================
// ========== دوال مساعدة أساسية ==================================
// =================================================================

function escapeHtml(s) {
    if (!s) return '—';
    return String(s).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function isOnline() { return navigator.onLine; }

function updateHerbCount() {
    const herbCountSpan = document.getElementById('herbCount');
    if (herbCountSpan) {
        herbCountSpan.innerText = (herbs && herbs.length) + ' عشبة';
    }
}

function showToast(message, type = 'info') {
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2e7d32'
    };
    
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 50px;
        z-index: 10001;
        font-family: 'Cairo', sans-serif;
        font-size: 0.85rem;
        text-align: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        direction: rtl;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// =================================================================
// ========== التخزين المحلي =======================================
// =================================================================

function saveToLocalCache() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            categories: categories,
            herbs: herbs,
            timestamp: Date.now()
        }));
        console.log('💾 تم حفظ البيانات محلياً');
    } catch (e) { console.warn(e); }
}

function loadFromLocalCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.categories && data.herbs) {
                categories = data.categories;
                herbs = data.herbs;
                console.log(`📦 تم تحميل ${herbs.length} عشبة من الكاش`);
                return true;
            }
        }
    } catch (e) { console.warn(e); }
    return false;
}

// =================================================================
// ========== جلب البيانات من Supabase =============================
// =================================================================

async function loadHerbsFromSupabase() {
    console.log('🔄 جلب البيانات من Supabase...');
    
    if (!supabase) {
        console.error('❌ Supabase client not initialized');
        showToast('⚠️ النظام غير جاهز، حاول تحديث الصفحة', 'warning');
        return false;
    }
    
    try {
        const cats = await getAllCategories();
        const hrbs = await getAllHerbs();
        
        categories = cats;
        herbs = hrbs;
        
        saveToLocalCache();
        renderContent();
        updateHerbCount();
        
        console.log(`✅ تم جلب ${herbs.length} عشبة و ${categories.length} تصنيف`);
        return true;
    } catch (error) {
        console.error('❌ فشل جلب البيانات:', error);
        showToast('❌ فشل تحميل البيانات: ' + error.message, 'error');
        return false;
    }
}

// =================================================================
// ========== دالة setAdminMode ====================================
// =================================================================

function setAdminMode(val) {
    isAdmin = val;
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        if (el.style) el.style.display = val ? 'inline-flex' : 'none';
    });
    
    const lockIcon = document.getElementById('lockIcon');
    if (lockIcon) {
        lockIcon.innerHTML = val ? '<i class="fas fa-lock-open"></i>' : '<i class="fas fa-lock"></i>';
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = val ? 'flex' : 'none';
    }
    
    document.body.classList.toggle('viewer-mode', !val);
    
    if (typeof renderContent === 'function') renderContent();
}

// =================================================================
// ========== التحقق من حالة المسؤول ===============================
// =================================================================

async function checkAdminStatus() {
    if (typeof checkCurrentSession === 'function') {
        const user = await checkCurrentSession();
        if (user) {
            console.log('✅ Admin logged in:', user.email);
            isAdmin = true;
            setAdminMode(true);
        } else {
            console.log('👤 Visitor mode');
            isAdmin = false;
            setAdminMode(false);
        }
    }
}

// =================================================================
// ========== التحميل الأولي =======================================
// =================================================================

async function initialLoad() {
    console.log('🚀 بدء التحميل الأولي...');
    
    // تهيئة Supabase
    initSupabase();
    
    // 1. عرض البيانات من الكاش فوراً
    const hasCache = loadFromLocalCache();
    
    if (hasCache) {
        renderContent();
        updateHerbCount();
        console.log('📦 تم عرض البيانات من الكاش');
    } else {
        const container = document.getElementById('contentArea');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-spinner fa-pulse"></i>
                    <p>جاري تحميل الموسوعة...</p>
                </div>
            `;
        }
    }
    
    // 2. محاولة جلب بيانات جديدة من Supabase
    if (navigator.onLine) {
        setTimeout(() => {
            loadHerbsFromSupabase();
        }, 500);
    }
    
    // 3. إخفاء شاشة البداية
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        const mainApp = document.getElementById('mainApp');
        if (splash && mainApp) {
            splash.classList.add('hide');
            mainApp.style.display = 'block';
            console.log('✅ تم إخفاء شاشة البداية');
        }
    }, 1500);
}

// =================================================================
// ========== عرض الأعشاب والتصنيفات ===============================
// =================================================================

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
    
    if (!herbs || herbs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-leaf"></i>
                <p>لا توجد أعشاب في الموسوعة</p>
                ${isAdmin ? '<button id="addFirstHerbBtn" class="tool-btn" style="margin-top:15px;background:var(--primary);color:white;"><i class="fas fa-plus-circle"></i> أضف أول عشبة</button>' : '<p class="hint">سيتم إضافة الأعشاب قريباً</p>'}
            </div>
        `;
        document.getElementById('addFirstHerbBtn')?.addEventListener('click', () => showAddHerb());
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
            <div class="info-block"><div class="info-label">🍵 طريقة الاستخدام</div><div class="info-text">${escapeHtml(herb.usage || '—')}</div></div>
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
    
    if (!categories || categories.length === 0) {
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
                document.getElementById('deleteMessage').innerHTML = `⚠️ حذف التصنيف "${btn.dataset.name}" وجميع أعشابه؟`;
                document.getElementById('deleteModal').classList.add('active');
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
                document.getElementById('deleteMessage').innerHTML = `⚠️ حذف "${btn.dataset.name}" من الموسوعة؟`;
                document.getElementById('deleteModal').classList.add('active');
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
    
    if (catHerbs.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>📂 لا توجد أعشاب في "${escapeHtml(cat.name)}"</p><button class="tool-btn" id="backToCategoriesBtn" style="margin-top:1rem;"><i class="fas fa-arrow-right"></i> العودة</button></div>`;
        document.getElementById('backToCategoriesBtn')?.addEventListener('click', () => {
            currentView = 'categories';
            renderContent();
            updateViewButtons('categories');
        });
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
    
    document.getElementById('backCatBtn')?.addEventListener('click', () => {
        currentView = 'categories';
        renderContent();
        updateViewButtons('categories');
    });
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
    document.getElementById('detailContent').innerHTML = html;
    document.getElementById('detailModal').classList.add('active');
}

// =================================================================
// ========== إدارة التصنيفات (Supabase) ===========================
// =================================================================

function showCategoryManager() {
    let listHtml = '';
    for (let cat of categories) {
        const herbsCount = herbs.filter(h => h.categoryId === cat.id).length;
        listHtml += `<div class="category-item">
                        <div class="category-name-display">
                            <i class="fas fa-folder"></i> ${escapeHtml(cat.name)}
                            <span style="background:var(--primary);color:white;padding:2px 8px;border-radius:30px;">${herbsCount}</span>
                        </div>
                        <div class="category-actions">
                            <i class="fas fa-edit edit-cat-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}"></i>
                            <i class="fas fa-trash-alt del-cat-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}"></i>
                        </div>
                    </div>`;
    }
    document.getElementById('categoriesList').innerHTML = listHtml || '<div class="empty-state">لا توجد تصنيفات</div>';
    
    document.querySelectorAll('.edit-cat-item').forEach(btn => {
        btn.onclick = async () => {
            let newName = prompt("تعديل اسم التصنيف", btn.dataset.name);
            if (newName) {
                const result = await updateCategory(btn.dataset.id, newName);
                if (!result.error) {
                    await loadHerbsFromSupabase();
                    showToast('✅ تم تعديل التصنيف', 'success');
                } else {
                    showToast('❌ فشل تعديل التصنيف', 'error');
                }
            }
        };
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

async function addNewCategory() {
    let name = document.getElementById('newCategoryName')?.value.trim();
    if (name) {
        const result = await addCategory(name);
        if (result) {
            document.getElementById('newCategoryName').value = '';
            await loadHerbsFromSupabase();
            showToast('✅ تم إضافة التصنيف', 'success');
            showCategoryManager();
        } else {
            showToast('❌ فشل إضافة التصنيف', 'error');
        }
    } else {
        alert('أدخل اسم التصنيف');
    }
}

function editCategoryModal(id, name) {
    let newName = prompt("تعديل اسم التصنيف", name);
    if (newName) updateCategory(id, newName);
}

// =================================================================
// ========== إدارة الأعشاب (Supabase) =============================
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
    currentImageUrl = null;
    document.getElementById('modalHerbName').value = '';
    document.getElementById('modalHerbBenefits').value = '';
    document.getElementById('modalHerbWarnings').value = '';
    document.getElementById('modalHerbHarms').value = '';
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
    const herb = herbs.find(h => h.id === id);
    if (!herb) return;
    resetHerbForm();
    currentEditHerbId = id;
    currentImageUrl = herb.imageUrl;
    document.getElementById('modalHerbName').value = herb.name;
    document.getElementById('modalHerbBenefits').value = herb.benefits || '';
    document.getElementById('modalHerbWarnings').value = herb.warnings || '';
    document.getElementById('modalHerbHarms').value = herb.harms || '';
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

async function compressImage(file, maxWidth = 500, quality = 0.6) {
    return new Promise((resolve, reject) => {
        if (file.size < 100 * 1024) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            return;
        }
        
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
                
                let finalQuality = quality;
                if (file.size > 2 * 1024 * 1024) finalQuality = 0.3;
                else if (file.size > 1 * 1024 * 1024) finalQuality = 0.4;
                
                const compressedDataUrl = canvas.toDataURL('image/jpeg', finalQuality);
                document.getElementById('compressInfo').innerHTML = `✅ تم الضغط: ${(file.size/1024).toFixed(1)}KB → ${(compressedDataUrl.length * 0.75 / 1024).toFixed(1)}KB`;
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

async function saveHerb() {
    const name = document.getElementById('modalHerbName')?.value.trim();
    if (!name) {
        alert('الاسم مطلوب');
        return;
    }
    
    if (!navigator.onLine) {
        alert('⚠️ لا يوجد اتصال بالإنترنت');
        return;
    }
    
    let imageUrl = currentImageUrl;
    if (currentImageFile) {
        imageUrl = await compressImage(currentImageFile);
        currentImageFile = null;
    }
    
    const herbData = {
        name: name,
        categoryId: document.getElementById('modalHerbCategory')?.value || null,
        benefits: document.getElementById('modalHerbBenefits')?.value || '—',
        warnings: document.getElementById('modalHerbWarnings')?.value || '—',
        harms: document.getElementById('modalHerbHarms')?.value || '—',
        usage: document.getElementById('modalHerbUsage')?.value || '—',
        notes: document.getElementById('modalHerbNotes')?.value || '—',
        imageUrl: imageUrl || null
    };
    
    const saveBtn = document.getElementById('saveHerbModalBtn');
    const originalText = saveBtn?.innerHTML;
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري الحفظ...';
        saveBtn.disabled = true;
    }
    
    try {
        let result;
        if (currentEditHerbId) {
            result = await updateHerb(currentEditHerbId, herbData);
        } else {
            result = await addHerb(herbData);
        }
        
        if (result && result.error) {
            throw new Error(result.error.message);
        }
        
        showToast('✅ تم حفظ العشبة بنجاح', 'success');
        
        await loadHerbsFromSupabase();
        
        document.getElementById('herbModal')?.classList.remove('active');
        resetHerbForm();
        
    } catch (error) {
        console.error('❌ فشل الحفظ:', error);
        showToast('❌ فشل حفظ العشبة: ' + error.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

async function confirmDelete() {
    if (!pendingDeleteId || !pendingDeleteType) {
        document.getElementById('deleteModal')?.classList.remove('active');
        return;
    }
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    const originalText = deleteBtn?.innerHTML;
    if (deleteBtn) {
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري الحذف...';
        deleteBtn.disabled = true;
    }
    
    try {
        if (pendingDeleteType === 'category') {
            await deleteCategory(pendingDeleteId);
            showToast('✅ تم حذف التصنيف', 'success');
        } else if (pendingDeleteType === 'herb') {
            await deleteHerb(pendingDeleteId);
            showToast('✅ تم حذف العشبة', 'success');
        }
        
        await loadHerbsFromSupabase();
        
    } catch (error) {
        console.error('❌ فشل الحذف:', error);
        showToast('❌ فشل الحذف: ' + error.message, 'error');
    } finally {
        if (deleteBtn) {
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
        document.getElementById('deleteModal')?.classList.remove('active');
        pendingDeleteId = null;
        pendingDeleteType = null;
    }
}

// =================================================================
// ========== المصادقة (Supabase) ==================================
// =================================================================

function showLogin() {
    document.getElementById('loginModal').classList.add('active');
}

async function attemptLogin() {
    const email = document.getElementById('adminEmail')?.value.trim();
    const password = document.getElementById('adminPassword')?.value;
    
    if (!email || !password) {
        alert('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }
    
    const loginBtn = document.getElementById('confirmLoginBtn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري...';
    loginBtn.disabled = true;
    
    try {
        const result = await loginAdmin(email, password);
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        setAdminMode(true);
        document.getElementById('loginModal').classList.remove('active');
        showToast('مرحباً أيها المسؤول', 'success');
        
    } catch (error) {
        console.error('❌ فشل تسجيل الدخول:', error);
        alert('❌ فشل تسجيل الدخول: ' + (error.message || 'بيانات غير صحيحة'));
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
        document.getElementById('adminPassword').value = '';
    }
}

function logout() {
    logoutAdmin();
    setAdminMode(false);
    showToast('تم تسجيل الخروج', 'info');
}

function initAuthListener() {
    onAuthChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            setAdminMode(true);
        } else if (event === 'SIGNED_OUT') {
            setAdminMode(false);
        }
    });
}

// =================================================================
// ========== البحث ================================================
// =================================================================

function showSearch() {
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
    setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
}

function performSearch() {
    let q = document.getElementById('searchInput')?.value.trim().toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    if (!resultsDiv) return;
    
    if (!q) {
        resultsDiv.innerHTML = '<div class="empty-state">اكتب اسم العشبة للبحث</div>';
        return;
    }
    
    const results = herbs.filter(h => h.name.toLowerCase().includes(q));
    if (results.length > 0) {
        let html = '';
        for (let h of results) {
            html += `<div class="search-item" onclick="window.showDetailFromSearch('${h.id}')">
                        <b>🌿 ${escapeHtml(h.name)}</b><br>
                        <small>${escapeHtml((h.benefits || '').substring(0, 70))}</small>
                    </div>`;
        }
        resultsDiv.innerHTML = html;
    } else {
        resultsDiv.innerHTML = '<div class="empty-state">لا توجد نتائج</div>';
    }
}

window.showDetailFromSearch = function(id) {
    if (herbs.find(h => h.id === id)) {
        document.getElementById('searchModal').classList.remove('active');
        showHerbDetail(id);
    }
};

// =================================================================
// ========== الثيم وحجم الخط ======================================
// =================================================================

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    const modeText = document.getElementById('modeText');
    if (modeText) modeText.innerText = document.body.classList.contains('dark-mode') ? 'ليلي' : 'نهاري';
}

function initTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    const modeText = document.getElementById('modeText');
    if (modeText) modeText.innerText = document.body.classList.contains('dark-mode') ? 'ليلي' : 'نهاري';
}

let currentFontLevel = localStorage.getItem('fontLevel') || 'normal';

function setFontSize(level) {
    document.body.classList.remove('font-large', 'font-xlarge');
    if (level === 'large') document.body.classList.add('font-large');
    if (level === 'xlarge') document.body.classList.add('font-xlarge');
    localStorage.setItem('fontLevel', level);
    const fontSizeLabel = document.getElementById('fontSizeLabel');
    if (fontSizeLabel) fontSizeLabel.innerText = { normal: 'عادي', large: 'كبير', xlarge: 'أكبر' }[level];
    currentFontLevel = level;
}

function cycleFontSize() {
    const levels = ['normal', 'large', 'xlarge'];
    let idx = levels.indexOf(currentFontLevel);
    setFontSize(levels[(idx + 1) % levels.length]);
}

setFontSize(currentFontLevel);

// =================================================================
// ========== دوال الزوار ==========================================
// =================================================================

const VisitorCounter = { init: () => {
    let c = localStorage.getItem('visitor');
    localStorage.setItem('visitor', c ? parseInt(c) + 1 : 1);
}};

function shareApp() {
    if (navigator.share) {
        navigator.share({ title: 'موسوعة الأعشاب الطبية', url: window.location.href });
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => alert('تم نسخ الرابط'));
    }
}

function showQuickHelp() {
    alert(`📖 دليل سريع:
🔍 بحث: اضغط على زر "بحث"
📂 التصنيفات: اضغط على أي تصنيف
🌿 الأعشاب: اضغط على أي عشبة للتفاصيل
🌙/☀️: تغيير المظهر
🔊 تغيير حجم الخط من زر "Aa"
📞 للتواصل: اضغط على واتساب`);
}

function updateViewButtons(view) {
    const buttons = document.querySelectorAll('.view-btn-large');
    buttons.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function openWhatsApp() {
    window.open('https://wa.me/9630932934273?text=مرحباً أريد الاستفسار عن الأعشاب', '_blank');
}

// =================================================================
// ========== النسخ الاحتياطي والاستعادة (Supabase) =================
// =================================================================

async function deleteAllData() {
    if (!confirm("⚠️ هل أنت متأكد من حذف جميع الأعشاب والتصنيفات؟\nهذا الإجراء لا يمكن التراجع عنه!")) {
        return;
    }
    
    const deleteBtn = document.getElementById('confirmDeleteAllBtn');
    const originalText = deleteBtn?.innerHTML;
    if (deleteBtn) {
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري الحذف...';
        deleteBtn.disabled = true;
    }
    
    try {
        const herbsToDelete = [...herbs];
        const categoriesToDelete = [...categories];
        
        for (const herb of herbsToDelete) {
            await deleteHerb(herb.id);
        }
        
        for (const cat of categoriesToDelete) {
            await deleteCategory(cat.id);
        }
        
        await loadHerbsFromSupabase();
        showToast('✅ تم حذف جميع البيانات', 'success');
        
    } catch (error) {
        console.error('❌ فشل حذف البيانات:', error);
        showToast('❌ حدث خطأ أثناء الحذف', 'error');
    } finally {
        if (deleteBtn) {
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    }
}

async function backupJSON() {
    const data = { categories, herbs, backupDate: new Date().toISOString() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = `herbs_backup_${Date.now()}.json`;
    a.click();
    showToast('تم إنشاء ملف النسخ الاحتياطي', 'success');
}

function restoreJSON() {
    document.getElementById('restoreFile').click();
}

async function handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.categories || !data.herbs) {
            throw new Error('ملف غير صالح');
        }
        
        if (!confirm("سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟")) {
            return;
        }
        
        const restoreBtn = document.getElementById('restoreBtn');
        const originalText = restoreBtn?.innerHTML;
        if (restoreBtn) {
            restoreBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري الاستعادة...';
            restoreBtn.disabled = true;
        }
        
        const herbsToDelete = [...herbs];
        const categoriesToDelete = [...categories];
        
        for (const herb of herbsToDelete) {
            await deleteHerb(herb.id);
        }
        for (const cat of categoriesToDelete) {
            await deleteCategory(cat.id);
        }
        
        const categoryMap = new Map();
        for (const cat of data.categories) {
            const result = await addCategory(cat.name);
            if (result) categoryMap.set(cat.id, result.id);
        }
        
        for (const herb of data.herbs) {
            const newCategoryId = categoryMap.get(herb.categoryId) || null;
            await addHerb({
                name: herb.name,
                categoryId: newCategoryId,
                benefits: herb.benefits || '—',
                warnings: herb.warnings || '—',
                harms: herb.harms || '—',
                usage: herb.usage || '—',
                notes: herb.notes || '—',
                imageUrl: herb.imageUrl || null
            });
        }
        
        await loadHerbsFromSupabase();
        showToast('✅ تمت الاستعادة بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ فشل الاستعادة:', error);
        showToast('❌ فشل استعادة البيانات: ' + error.message, 'error');
    } finally {
        document.getElementById('restoreFile').value = '';
        const restoreBtn = document.getElementById('restoreBtn');
        if (restoreBtn) {
            restoreBtn.innerHTML = '<i class="fas fa-upload"></i> استعادة';
            restoreBtn.disabled = false;
        }
    }
}

// =================================================================
// ========== إضافة مستمعي الأحداث =================================
// =================================================================

document.addEventListener('DOMContentLoaded', function() {
    // أزرار رئيسية
    document.getElementById('mainSearchBtn')?.addEventListener('click', showSearch);
    document.getElementById('closeSearchModalBtn')?.addEventListener('click', () => document.getElementById('searchModal').classList.remove('active'));
    document.getElementById('searchInput')?.addEventListener('input', performSearch);
    document.getElementById('lockIcon')?.addEventListener('click', showLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('cancelLoginBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.remove('active'));
    document.getElementById('confirmLoginBtn')?.addEventListener('click', attemptLogin);
    document.getElementById('whatsappBtn')?.addEventListener('click', openWhatsApp);
    document.getElementById('fontSizeToggleBtn')?.addEventListener('click', cycleFontSize);
    document.getElementById('shareAppBtn')?.addEventListener('click', shareApp);
    document.getElementById('quickHelpBtn')?.addEventListener('click', showQuickHelp);
    
    // أزرار العرض
    document.getElementById('viewToggle')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.view-btn-large');
        if (btn?.dataset.view) {
            currentView = btn.dataset.view;
            updateViewButtons(currentView);
            renderContent();
        }
    });
    
    // أزرار المسؤول
    document.getElementById('addHerbBtn')?.addEventListener('click', showAddHerb);
    document.getElementById('manageCategoriesBtn')?.addEventListener('click', showCategoryManager);
    document.getElementById('closeCategoryModalBtn')?.addEventListener('click', () => document.getElementById('categoryModal').classList.remove('active'));
    document.getElementById('addCategoryBtn')?.addEventListener('click', addNewCategory);
    document.getElementById('closeHerbModalBtn')?.addEventListener('click', () => document.getElementById('herbModal').classList.remove('active'));
    document.getElementById('cancelHerbModalBtn')?.addEventListener('click', () => document.getElementById('herbModal').classList.remove('active'));
    document.getElementById('saveHerbModalBtn')?.addEventListener('click', saveHerb);
    document.getElementById('closeDetailModalBtn')?.addEventListener('click', () => document.getElementById('detailModal').classList.remove('active'));
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => document.getElementById('deleteModal').classList.remove('active'));
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
    document.getElementById('deleteAllBtn')?.addEventListener('click', () => document.getElementById('deleteAllConfirmModal').classList.add('active'));
    document.getElementById('closeDeleteAllModalBtn')?.addEventListener('click', () => document.getElementById('deleteAllConfirmModal').classList.remove('active'));
    document.getElementById('cancelDeleteAllBtn')?.addEventListener('click', () => document.getElementById('deleteAllConfirmModal').classList.remove('active'));
    document.getElementById('confirmDeleteAllBtn')?.addEventListener('click', async () => {
        document.getElementById('deleteAllConfirmModal').classList.remove('active');
        await deleteAllData();
    });
    
    // نسخ احتياطي واستعادة
    document.getElementById('backupBtn')?.addEventListener('click', backupJSON);
    document.getElementById('restoreBtn')?.addEventListener('click', restoreJSON);
    document.getElementById('restoreFile')?.addEventListener('change', handleRestore);
    
    // رفع الصورة
    document.getElementById('uploadImageBtn')?.addEventListener('click', () => document.getElementById('herbImageInput').click());
    document.getElementById('herbImageInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) {
                alert('⚠️ حجم الصورة كبير جداً (حد أقصى 5 ميجابايت)');
                return;
            }
            currentImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('imagePreviewContainer').innerHTML = `<img src="${e.target.result}" class="herb-image-preview" onclick="document.getElementById('herbImageInput').click()">`;
                document.getElementById('clearImageBtn').style.display = 'inline-flex';
            };
            reader.readAsDataURL(file);
        }
    });
    document.getElementById('clearImageBtn')?.addEventListener('click', () => {
        currentImageFile = null;
        currentImageUrl = null;
        document.getElementById('herbImageInput').value = '';
        document.getElementById('imagePreviewContainer').innerHTML = '';
        document.getElementById('clearImageBtn').style.display = 'none';
    });
    
    // زر تحديث البيانات
    document.getElementById('visitorForceSyncBtn')?.addEventListener('click', () => {
        loadHerbsFromSupabase();
    });
    document.getElementById('refreshDataBtn')?.addEventListener('click', () => {
        loadHerbsFromSupabase();
    });
    
    // إغلاق المودالات بالضغط على الخلفية
    document.querySelectorAll('.modal-glass').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
    
    // إغلاق بزر ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-glass.active').forEach(modal => modal.classList.remove('active'));
        }
    });
    
    // بدء التطبيق
    VisitorCounter.init();
    initTheme();
    initAuthListener();
    
    // التحقق من حالة المسؤول والتحميل
    setTimeout(async () => {
        await checkAdminStatus();
        await initialLoad();
    }, 100);
});

console.log('✅ التطبيق جاهز مع Supabase');
