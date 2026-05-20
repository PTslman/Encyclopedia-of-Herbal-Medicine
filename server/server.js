const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// مسار ملف البيانات
const DATA_PATH = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// قراءة قاعدة البيانات
async function readDB() {
    try {
        const data = await fs.readFile(DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { categories: [], herbs: [], settings: {} };
    }
}

// كتابة قاعدة البيانات
async function writeDB(data) {
    try {
        await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('خطأ في الكتابة:', error);
        return false;
    }
}

// توليد ID
function generateId(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// التحقق من التوكن
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ error: 'غير مصرح به' });
    }
    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'توكن غير صالح' });
    }
}

// ========== مسارات API ==========

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'بيانات غير صحيحة' });
    }
});

// الحصول على جميع التصنيفات
app.get('/api/categories', async (req, res) => {
    const db = await readDB();
    res.json(db.categories);
});

// إضافة تصنيف
app.post('/api/categories', verifyToken, async (req, res) => {
    const { name } = req.body;
    const db = await readDB();
    const newCategory = {
        id: generateId('cat'),
        name: name,
        createdAt: new Date().toISOString()
    };
    db.categories.push(newCategory);
    await writeDB(db);
    res.json({ success: true, category: newCategory });
});

// حذف تصنيف
app.delete('/api/categories/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    db.categories = db.categories.filter(c => c.id !== id);
    db.herbs = db.herbs.filter(h => h.categoryId !== id);
    await writeDB(db);
    res.json({ success: true });
});

// الحصول على جميع الأعشاب
app.get('/api/herbs', async (req, res) => {
    const db = await readDB();
    res.json(db.herbs);
});

// إضافة عشبة
app.post('/api/herbs', verifyToken, async (req, res) => {
    const { name, categoryId, benefits, warnings, harms, usage, notes, imageUrl } = req.body;
    const db = await readDB();
    const newHerb = {
        id: generateId('herb'),
        name: name,
        categoryId: categoryId || null,
        benefits: benefits || '—',
        warnings: warnings || '—',
        harms: harms || '—',
        usage: usage || '—',
        notes: notes || '—',
        imageUrl: imageUrl || null,
        updatedAt: new Date().toISOString()
    };
    db.herbs.push(newHerb);
    await writeDB(db);
    res.json({ success: true, herb: newHerb });
});

// تحديث عشبة
app.put('/api/herbs/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const db = await readDB();
    const index = db.herbs.findIndex(h => h.id === id);
    if (index !== -1) {
        db.herbs[index] = { ...db.herbs[index], ...updates, updatedAt: new Date().toISOString() };
        await writeDB(db);
        res.json({ success: true, herb: db.herbs[index] });
    } else {
        res.status(404).json({ error: 'غير موجود' });
    }
});

// حذف عشبة
app.delete('/api/herbs/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    db.herbs = db.herbs.filter(h => h.id !== id);
    await writeDB(db);
    res.json({ success: true });
});

// إحصائيات
app.get('/api/stats', async (req, res) => {
    const db = await readDB();
    res.json({
        categoriesCount: db.categories.length,
        herbsCount: db.herbs.length
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
