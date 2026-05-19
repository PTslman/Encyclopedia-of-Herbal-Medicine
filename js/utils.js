// ========== دوال مساعدة عامة ==========

// الهروب من HTML
function escapeHtml(str) {
    if (!str) return '—';
    return String(str)
        .replace(/[&<>]/g, function(match) {
            if (match === '&') return '&amp;';
            if (match === '<') return '&lt;';
            if (match === '>') return '&gt;';
            return match;
        })
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
            return c;
        });
}

// ضغط الصور
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
                
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// ضغط تكيفي حسب حجم الملف
function getAdaptiveCompressionQuality(fileSize) {
    if (fileSize > 2 * 1024 * 1024) return 0.6;
    if (fileSize > 1 * 1024 * 1024) return 0.7;
    if (fileSize > 512 * 1024) return 0.8;
    return 0.9;
}

// التحقق من الاتصال بالإنترنت
function isOnline() {
    return navigator.onLine;
}

// عرض إشعار
function showNotification(title, body, icon = null) {
    if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
                body: body,
                icon: icon || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%232e7d32"/%3E%3Ctext x="50" y="67" font-size="50" text-anchor="middle" fill="white"%3E🌿%3C/text%3E%3C/svg%3E',
                badge: '/icons/icon-72x72.png',
                vibrate: [200, 100, 200]
            });
        });
    }
}

// حفظ البيانات في localStorage مع ضغط
function saveToLocalCache(key, data) {
    try {
        const cacheData = {
            data: data,
            timestamp: Date.now(),
            version: 'v4'
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
        return true;
    } catch (e) {
        console.warn('Failed to save to cache:', e);
        return false;
    }
}

// استرجاع البيانات من localStorage
function loadFromLocalCache(key, maxAge = 7 * 24 * 60 * 60 * 1000) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        
        const cached = JSON.parse(raw);
        const age = Date.now() - (cached.timestamp || 0);
        
        if (age > maxAge) {
            localStorage.removeItem(key);
            return null;
        }
        
        return cached.data;
    } catch (e) {
        console.warn('Failed to load from cache:', e);
        return null;
    }
}

// نسخ النص إلى الحافظة
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

// فتح واتساب
function openWhatsApp(phoneNumber = "0932934273", message = "") {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const internationalPhone = "963" + cleanPhone;
    const encodedMessage = encodeURIComponent(message || "مرحباً، أريد الاستفسار عن الأعشاب");
    const url = `https://wa.me/${internationalPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');
}

// تصدير إلى CSV
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        alert("لا توجد بيانات للتصدير");
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filename}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// تصدير إلى JSON
function exportToJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filename}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// Export all utilities to window
window.escapeHtml = escapeHtml;
window.compressImage = compressImage;
window.getAdaptiveCompressionQuality = getAdaptiveCompressionQuality;
window.isOnline = isOnline;
window.showNotification = showNotification;
window.saveToLocalCache = saveToLocalCache;
window.loadFromLocalCache = loadFromLocalCache;
window.copyToClipboard = copyToClipboard;
window.openWhatsApp = openWhatsApp;
window.exportToCSV = exportToCSV;
window.exportToJSON = exportToJSON;