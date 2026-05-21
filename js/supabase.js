// =====================================================
// موسوعة الأعشاب الطبية - Supabase Client
// الإصدار النهائي المصحح - يعمل 100%
// =====================================================

const SUPABASE_URL = 'https://jedazmlbcnuwmtozldes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGF6bWxiY251d210b3psZGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTQyNjcsImV4cCI6MjA5NDkzMDI2N30.8391ZND2V9_N3RzkFYiDNnej1o_eUQoQ1174nwxpMwI';

// تهيئة العميل
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🚀 Supabase initialized');

// ========== جلب التصنيفات ==========
window.getAllCategories = async function() {
    try {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('name');
        
        if (error) throw error;
        console.log('✅ Categories loaded:', data?.length || 0);
        return data || [];
    } catch (error) {
        console.error('❌ Error in getAllCategories:', error.message);
        return [];
    }
};

// ========== جلب الأعشاب ==========
window.getAllHerbs = async function() {
    try {
        const { data, error } = await supabaseClient
            .from('herbs')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        const formatted = (data || []).map(herb => ({
            id: herb.id,
            name: herb.name,
            categoryId: herb.category_id,
            benefits: herb.benefits || '—',
            warnings: herb.warnings || '—',
            harms: herb.harms || '—',
            usage: herb.usage || '—',
            notes: herb.notes || '—',
            imageUrl: herb.image_url
        }));
        
        console.log('✅ Herbs loaded:', formatted.length);
        return formatted;
    } catch (error) {
        console.error('❌ Error in getAllHerbs:', error.message);
        return [];
    }
};

// ========== إضافة عشبة ==========
window.addHerb = async function(herbData) {
    try {
        const { data, error } = await supabaseClient
            .from('herbs')
            .insert([{
                name: herbData.name,
                category_id: herbData.categoryId || null,
                benefits: herbData.benefits || '—',
                warnings: herbData.warnings || '—',
                harms: herbData.harms || '—',
                usage: herbData.usage || '—',
                notes: herbData.notes || '—',
                image_url: herbData.imageUrl || null
            }])
            .select();
        
        if (error) throw error;
        console.log('✅ Herb added:', herbData.name);
        return { data, error: null };
    } catch (error) {
        console.error('❌ Add herb failed:', error.message);
        return { data: null, error };
    }
};

// ========== تحديث عشبة ==========
window.updateHerb = async function(id, herbData) {
    try {
        const { data, error } = await supabaseClient
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
                updated_at: new Date()
            })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        console.log('✅ Herb updated:', herbData.name);
        return { data, error: null };
    } catch (error) {
        console.error('❌ Update herb failed:', error.message);
        return { data: null, error };
    }
};

// ========== حذف عشبة ==========
window.deleteHerb = async function(id) {
    try {
        const { error } = await supabaseClient
            .from('herbs')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Herb deleted:', id);
        return { error: null };
    } catch (error) {
        console.error('❌ Delete herb failed:', error.message);
        return { error };
    }
};

// ========== إضافة تصنيف ==========
window.addCategory = async function(name) {
    try {
        const { data, error } = await supabaseClient
            .from('categories')
            .insert([{ name }])
            .select();
        
        if (error) throw error;
        console.log('✅ Category added:', name);
        return { data, error: null };
    } catch (error) {
        console.error('❌ Add category failed:', error.message);
        return { data: null, error };
    }
};

// ========== تحديث تصنيف ==========
window.updateCategory = async function(id, name) {
    try {
        const { error } = await supabaseClient
            .from('categories')
            .update({ name })
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Category updated:', name);
        return { error: null };
    } catch (error) {
        console.error('❌ Update category failed:', error.message);
        return { error };
    }
};

// ========== حذف تصنيف ==========
window.deleteCategory = async function(id) {
    try {
        await supabaseClient.from('herbs').delete().eq('category_id', id);
        
        const { error } = await supabaseClient
            .from('categories')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Category deleted:', id);
        return { error: null };
    } catch (error) {
        console.error('❌ Delete category failed:', error.message);
        return { error };
    }
};

// ========== تسجيل الدخول ==========
window.loginAdmin = async function(email, password) {
    try {
        console.log('🔐 Attempting login for:', email);
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('✅ Login successful! User:', data.user.email);
        return { data, error: null };
        
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        return { data: null, error };
    }
};

// ========== تسجيل الخروج ==========
window.logoutAdmin = async function() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        console.log('✅ Logout successful');
        return { error: null };
    } catch (error) {
        console.error('❌ Logout failed:', error.message);
        return { error };
    }
};

// ========== مراقبة حالة المصادقة ==========
window.onAuthChange = function(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth event:', event);
        if (callback) callback(event, session);
    });
};

// ========== التحقق من الجلسة الحالية ==========
window.checkCurrentSession = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        console.log('👤 Current user:', session.user.email);
        return session.user;
    } else {
        console.log('👤 No user logged in');
        return null;
    }
};

console.log('✅ Supabase module loaded completely');
