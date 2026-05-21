// js/supabase.js
const SUPABASE_URL = 'https://jedazmlbcnuwmtozldes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGF6bWxiY251d210b3psZGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTQyNjcsImV4cCI6MjA5NDkzMDI2N30.8391ZND2V9_N3RzkFYiDNnej1o_eUQoQ1174nwxpMwI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== جلب البيانات ==========
async function getAllCategories() {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) return [];
    return data;
}

async function getAllHerbs() {
    const { data, error } = await supabase
        .from('herbs')
        .select(`*, categories(name)`)
        .order('name');
    if (error) return [];
    return data.map(h => ({
        id: h.id,
        name: h.name,
        categoryId: h.category_id,
        categoryName: h.categories?.name || 'بدون تصنيف',
        benefits: h.benefits || '—',
        warnings: h.warnings || '—',
        harms: h.harms || '—',
        usage: h.usage || '—',
        notes: h.notes || '—',
        imageUrl: h.image_url
    }));
}

// ========== إدارة الأعشاب ==========
async function addHerb(herbData) {
    return await supabase.from('herbs').insert([{
        name: herbData.name,
        category_id: herbData.categoryId,
        benefits: herbData.benefits,
        warnings: herbData.warnings,
        harms: herbData.harms,
        usage: herbData.usage,
        notes: herbData.notes,
        image_url: herbData.imageUrl
    }]);
}

async function updateHerb(id, herbData) {
    return await supabase
        .from('herbs')
        .update({
            name: herbData.name,
            category_id: herbData.categoryId,
            benefits: herbData.benefits,
            warnings: herbData.warnings,
            harms: herbData.harms,
            usage: herbData.usage,
            notes: herbData.notes,
            image_url: herbData.imageUrl
        })
        .eq('id', id);
}

async function deleteHerb(id) {
    return await supabase.from('herbs').delete().eq('id', id);
}

// ========== إدارة التصنيفات ==========
async function addCategory(name) {
    return await supabase.from('categories').insert([{ name }]);
}

async function updateCategory(id, name) {
    return await supabase.from('categories').update({ name }).eq('id', id);
}

async function deleteCategory(id) {
    return await supabase.from('categories').delete().eq('id', id);
}

// ========== المصادقة ==========
async function loginAdmin(email, password) {
    return await supabase.auth.signInWithPassword({ email, password });
}

async function logoutAdmin() {
    return await supabase.auth.signOut();
}

// ========== تصدير ==========
window.supabase = supabase;
window.getAllCategories = getAllCategories;
window.getAllHerbs = getAllHerbs;
window.addHerb = addHerb;
window.updateHerb = updateHerb;
window.deleteHerb = deleteHerb;
window.addCategory = addCategory;
window.updateCategory = updateCategory;
window.deleteCategory = deleteCategory;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;

console.log('✅ Supabase ready');
console.log('🔐 URL:', SUPABASE_URL);
