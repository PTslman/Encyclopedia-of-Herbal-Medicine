// ============================================
// Supabase Client - موسوعة الأعشاب الطبية
// ============================================

const SUPABASE_URL = 'https://jedazmlbcnuwmtozldes.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aDhcoHUjny6A8OPzmNgXgA_V6ItA5D8';

// تهيئة عميل Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// دوال جلب البيانات
// ============================================

// جلب جميع التصنيفات
async function getAllCategories() {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
    
    if (error) {
        console.error('❌ فشل جلب التصنيفات:', error);
        return [];
    }
    return data;
}

// جلب جميع الأعشاب مع أسماء التصنيفات
async function getAllHerbs() {
    const { data, error } = await supabase
        .from('herbs')
        .select(`*, categories (name)`)
        .order('name');
    
    if (error) {
        console.error('❌ فشل جلب الأعشاب:', error);
        return [];
    }
    
    return data.map(herb => ({
        id: herb.id,
        name: herb.name,
        categoryId: herb.category_id,
        categoryName: herb.categories?.name || 'بدون تصنيف',
        benefits: herb.benefits || '—',
        warnings: herb.warnings || '—',
        harms: herb.harms || '—',
        usage: herb.usage || '—',
        notes: herb.notes || '—',
        imageUrl: herb.image_url,
        updatedAt: herb.updated_at
    }));
}

// ============================================
// دوال إدارة الأعشاب
// ============================================

// إضافة عشبة جديدة
async function addHerb(herbData) {
    const { data, error } = await supabase
        .from('herbs')
        .insert([{
            name: herbData.name,
            category_id: herbData.categoryId || null,
            benefits: herbData.benefits || '—',
            warnings: herbData.warnings || '—',
            harms: herbData.harms || '—',
            usage: herbData.usage || '—',
            notes: herbData.notes || '—',
            image_url: herbData.imageUrl || null,
            updated_at: new Date().toISOString()
        }])
        .select();
    
    return { data, error };
}

// تحديث عشبة
async function updateHerb(id, herbData) {
    const { data, error } = await supabase
        .from('herbs')
        .update({
            name: herbData.name,
            category_id: herbData.categoryId || null,
            benefits: herbData.benefits || '—',
            warnings: herbData.warnings || '—',
            harms: herbData.harms || '—',
            usage: herbData.usage || '—',
            notes: herbData.notes || '—',
            image_url: herbData.imageUrl || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
    
    return { data, error };
}

// حذف عشبة
async function deleteHerb(id) {
    const { error } = await supabase
        .from('herbs')
        .delete()
        .eq('id', id);
    
    return { error };
}

// ============================================
// دوال إدارة التصنيفات
// ============================================

// إضافة تصنيف
async function addCategory(name) {
    const { data, error } = await supabase
        .from('categories')
        .insert([{ name: name }])
        .select();
    
    return { data, error };
}

// تحديث تصنيف
async function updateCategory(id, name) {
    const { error } = await supabase
        .from('categories')
        .update({ name: name })
        .eq('id', id);
    
    return { error };
}

// حذف تصنيف
async function deleteCategory(id) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
    
    return { error };
}

// ============================================
// دوال المصادقة (الأهم - هذه كانت مفقودة!)
// ============================================

// تسجيل الدخول كمسؤول
async function loginAdmin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) {
        console.error('❌ فشل تسجيل الدخول:', error.message);
        return { data: null, error };
    }
    
    console.log('✅ تم تسجيل الدخول بنجاح:', data.user.email);
    return { data, error: null };
}

// تسجيل الخروج
async function logoutAdmin() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('❌ فشل تسجيل الخروج:', error.message);
    } else {
        console.log('✅ تم تسجيل الخروج');
    }
    return { error };
}

// مراقبة حالة المصادقة
function onAuthChange(callback) {
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth event:', event);
        if (callback) callback(event, session);
    });
}

// الحصول على المستخدم الحالي
async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('❌ فشل جلب المستخدم:', error.message);
        return null;
    }
    return user;
}

// ============================================
// تصدير الدوال للنطاق العام
// ============================================

window.supabaseClient = supabase;
window.getAllCategories = getAllCategories;
window.getAllHerbs = getAllHerbs;
window.addHerb = addHerb;
window.updateHerb = updateHerb;
window.deleteHerb = deleteHerb;
window.addCategory = addCategory;
window.updateCategory = updateCategory;
window.deleteCategory = deleteCategory;
window.loginAdmin = loginAdmin;      // ← هذه كانت مفقودة!
window.logoutAdmin = logoutAdmin;
window.onAuthChange = onAuthChange;
window.getCurrentUser = getCurrentUser;

console.log('✅ Supabase client ready');
console.log('🔐 loginAdmin function available:', typeof loginAdmin);
