// =====================================================
// الموسوعة المتكاملة - أكثر من 40 ميزة إضافية
// نظام إدارة الأعشاب الطبية المتقدم
// =====================================================

(function() {
    'use strict';
    
    // =====================================================
    // 1. نظام الإشعارات المتقدم
    // =====================================================
    
    class NotificationSystem {
        constructor() {
            this.permission = false;
            this.queue = [];
        }
        
        async requestPermission() {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                this.permission = permission === 'granted';
                if (this.permission) {
                    this.showNotification('✅ تم تفعيل الإشعارات', 'success');
                }
                return this.permission;
            }
            return false;
        }
        
        showNotification(title, type = 'info', body = '') {
            if (!this.permission) return;
            
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            
            const notification = new Notification(`${icons[type]} ${title}`, {
                body: body,
                icon: '/Encyclopedia-of-Herbal-Medicine/icon-192.png',
                silent: false,
                vibrate: [200, 100, 200]
            });
            
            setTimeout(() => notification.close(), 5000);
        }
        
        scheduleReminder(herbName, timeMinutes) {
            if (!this.permission) return;
            
            setTimeout(() => {
                this.showNotification('تذكير بالعشبة', 'info', `حان وقت مراجعة معلومات ${herbName}`);
            }, timeMinutes * 60 * 1000);
        }
    }
    
    // =====================================================
    // 2. نظام الإحصائيات والتقارير
    // =====================================================
    
    class StatisticsSystem {
        constructor() {
            this.stats = this.loadStats();
        }
        
        loadStats() {
            const saved = localStorage.getItem('herbal_stats');
            return saved ? JSON.parse(saved) : {
                totalViews: 0,
                favoriteHerbs: [],
                searchCount: 0,
                mostViewed: {},
                lastVisit: null,
                visitCount: 0
            };
        }
        
        saveStats() {
            localStorage.setItem('herbal_stats', JSON.stringify(this.stats));
        }
        
        trackView(herbId, herbName) {
            this.stats.totalViews++;
            this.stats.mostViewed[herbId] = (this.stats.mostViewed[herbId] || 0) + 1;
            this.saveStats();
        }
        
        addFavorite(herbId) {
            if (!this.stats.favoriteHerbs.includes(herbId)) {
                this.stats.favoriteHerbs.push(herbId);
                this.saveStats();
                return true;
            }
            return false;
        }
        
        removeFavorite(herbId) {
            this.stats.favoriteHerbs = this.stats.favoriteHerbs.filter(id => id !== herbId);
            this.saveStats();
        }
        
        isFavorite(herbId) {
            return this.stats.favoriteHerbs.includes(herbId);
        }
        
        getMostViewedHerbs(limit = 5) {
            return Object.entries(this.stats.mostViewed)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit);
        }
        
        trackSearch() {
            this.stats.searchCount++;
            this.saveStats();
        }
        
        trackVisit() {
            const today = new Date().toDateString();
            if (this.stats.lastVisit !== today) {
                this.stats.visitCount++;
                this.stats.lastVisit = today;
                this.saveStats();
            }
        }
        
        showStatistics() {
            const statsHtml = `
                <div class="stats-dashboard">
                    <h4>📊 إحصائيات الموسوعة</h4>
                    <div class="stat-item">👁️ عدد المشاهدات: ${this.stats.totalViews}</div>
                    <div class="stat-item">🔍 عمليات البحث: ${this.stats.searchCount}</div>
                    <div class="stat-item">❤️ المفضلة: ${this.stats.favoriteHerbs.length}</div>
                    <div class="stat-item">📅 زيارات اليوم: ${this.stats.visitCount}</div>
                    <div class="stat-item">⭐ آخر زيارة: ${this.stats.lastVisit || 'اليوم'}</div>
                    <h4>🏆 الأعشاب الأكثر مشاهدة</h4>
                    <div id="mostViewedList"></div>
                </div>
            `;
            
            const modal = document.createElement('div');
            modal.className = 'modal-glass active';
            modal.innerHTML = `
                <div class="modal-glass-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>📈 الإحصائيات</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-glass').remove()">✕</button>
                    </div>
                    ${statsHtml}
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const mostViewedList = modal.querySelector('#mostViewedList');
            const mostViewed = this.getMostViewedHerbs();
            if (mostViewed.length) {
                mostViewedList.innerHTML = mostViewed.map(([id, count]) => 
                    `<div class="stat-item">🌿 ${window.herbs?.find(h => h.id == id)?.name || 'عشبة'} - ${count} مشاهدة</div>`
                ).join('');
            } else {
                mostViewedList.innerHTML = '<div class="stat-item">لا توجد بيانات كافية</div>';
            }
        }
    }
    
    // =====================================================
    // 3. نظام المقارنة بين الأعشاب
    // =====================================================
    
    class CompareSystem {
        constructor() {
            this.compareList = [];
            this.loadCompareList();
        }
        
        loadCompareList() {
            const saved = localStorage.getItem('compare_list');
            this.compareList = saved ? JSON.parse(saved) : [];
        }
        
        saveCompareList() {
            localStorage.setItem('compare_list', JSON.stringify(this.compareList));
        }
        
        addToCompare(herb) {
            if (this.compareList.length >= 4) {
                alert('⚠️ يمكن مقارنة 4 أعشاب كحد أقصى');
                return false;
            }
            if (!this.compareList.find(h => h.id === herb.id)) {
                this.compareList.push(herb);
                this.saveCompareList();
                return true;
            }
            return false;
        }
        
        removeFromCompare(herbId) {
            this.compareList = this.compareList.filter(h => h.id !== herbId);
            this.saveCompareList();
        }
        
        showCompare() {
            if (this.compareList.length < 2) {
                alert('⚠️ أضف عشبتين على الأقل للمقارنة');
                return;
            }
            
            let html = '<div class="compare-table"><table style="width:100%;border-collapse:collapse;">';
            html += '<tr><th>الميزة</th>' + this.compareList.map(h => `<th>🌿 ${h.name}</th>`).join('') + '</tr>';
            
            const fields = [
                { label: 'الفوائد', key: 'benefits' },
                { label: 'التحذيرات', key: 'warnings' },
                { label: 'الأضرار', key: 'harms' },
                { label: 'طريقة الاستخدام', key: 'usage' },
                { label: 'ملاحظات', key: 'notes' }
            ];
            
            for (const field of fields) {
                html += `<tr>
                            <td style="font-weight:bold;background:var(--primary-light);padding:10px;">${field.label}</td>
                            ${this.compareList.map(h => `<td style="padding:10px;border-bottom:1px solid var(--separator);">${h[field.key] || '—'}</td>`).join('')}
                        </tr>`;
            }
            
            html += '</table></div>';
            
            const modal = document.createElement('div');
            modal.className = 'modal-glass active';
            modal.innerHTML = `
                <div class="modal-glass-content" style="max-width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>🔄 مقارنة الأعشاب</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-glass').remove()">✕</button>
                    </div>
                    ${html}
                    <div class="modal-actions" style="margin-top:20px;">
                        <button class="btn-secondary" onclick="this.closest('.modal-glass').remove()">إغلاق</button>
                        <button class="danger-btn" onclick="window.compareSystem.clearCompare();this.closest('.modal-glass').remove()">مسح القائمة</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
        
        clearCompare() {
            this.compareList = [];
            this.saveCompareList();
            showToast('✅ تم مسح قائمة المقارنة', 'success');
        }
    }
    
    // =====================================================
    // 4. نظام التصدير والطباعة
    // =====================================================
    
    class ExportSystem {
        static async exportToPDF(herb) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <title>${herb.name} - موسوعة الأعشاب</title>
                    <style>
                        body { font-family: 'Cairo', sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                        h1 { color: #2e7d32; }
                        .info { margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 10px; }
                        .label { font-weight: bold; color: #1b5e20; }
                        img { max-width: 100%; border-radius: 10px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <h1>🌿 ${herb.name}</h1>
                    ${herb.imageUrl ? `<img src="${herb.imageUrl}" alt="${herb.name}">` : ''}
                    <div class="info"><div class="label">💚 الفوائد:</div> ${herb.benefits || '—'}</div>
                    <div class="info"><div class="label">⚠️ التحذيرات:</div> ${herb.warnings || '—'}</div>
                    <div class="info"><div class="label">⚠️ الأضرار:</div> ${herb.harms || '—'}</div>
                    <div class="info"><div class="label">🍵 طريقة الاستخدام:</div> ${herb.usage || '—'}</div>
                    <div class="info"><div class="label">📝 ملاحظات:</div> ${herb.notes || '—'}</div>
                    <hr>
                    <small>تم الإنشاء بواسطة موسوعة الأعشاب الطبية - ${new Date().toLocaleDateString('ar-EG')}</small>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
        
        static exportToCSV(herbs) {
            const headers = ['الاسم', 'التصنيف', 'الفوائد', 'التحذيرات', 'الأضرار', 'الاستخدام'];
            const rows = herbs.map(h => [
                h.name,
                window.categories?.find(c => c.id === h.categoryId)?.name || 'بدون تصنيف',
                h.benefits || '—',
                h.warnings || '—',
                h.harms || '—',
                h.usage || '—'
            ]);
            
            const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `herbs_export_${Date.now()}.csv`;
            link.click();
            showToast('✅ تم تصدير البيانات كـ CSV', 'success');
        }
    }
    
    // =====================================================
    // 5. نظام الوضع الليلي المتقدم
    // =====================================================
    
    class AdvancedTheme {
        constructor() {
            this.scheduleMode = localStorage.getItem('schedule_mode') === 'true';
            if (this.scheduleMode) this.initSchedule();
        }
        
        initSchedule() {
            const checkTime = () => {
                const hour = new Date().getHours();
                const isNight = hour >= 19 || hour < 6;
                if (isNight && !document.body.classList.contains('dark-mode')) {
                    document.body.classList.add('dark-mode');
                } else if (!isNight && document.body.classList.contains('dark-mode')) {
                    document.body.classList.remove('dark-mode');
                }
            };
            checkTime();
            setInterval(checkTime, 60000);
        }
        
        toggleSchedule() {
            this.scheduleMode = !this.scheduleMode;
            localStorage.setItem('schedule_mode', this.scheduleMode);
            if (this.scheduleMode) {
                this.initSchedule();
                showToast('✅ تم تفعيل الوضع التلقائي', 'success');
            } else {
                showToast('✅ تم إلغاء الوضع التلقائي', 'info');
            }
        }
        
        static setHighContrast() {
            document.body.classList.toggle('high-contrast');
            localStorage.setItem('high_contrast', document.body.classList.contains('high-contrast'));
            showToast(document.body.classList.contains('high-contrast') ? '✅ تم تفعيل التباين العالي' : '✅ تم إلغاء التباين العالي', 'info');
        }
    }
    
    // =====================================================
    // 6. نظام البحث المتقدم
    // =====================================================
    
    class AdvancedSearch {
        constructor() {
            this.filters = {
                category: 'all',
                benefits: '',
                searchIn: 'name'
            };
        }
        
        showAdvancedSearch() {
            const modal = document.createElement('div');
            modal.className = 'modal-glass active';
            modal.innerHTML = `
                <div class="modal-glass-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>🔍 بحث متقدم</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-glass').remove()">✕</button>
                    </div>
                    <div class="form-group">
                        <label>🔎 كلمة البحث</label>
                        <input type="text" id="advSearchQuery" placeholder="أدخل كلمة البحث..." class="search-input">
                    </div>
                    <div class="form-group">
                        <label>📂 التصنيف</label>
                        <select id="advSearchCategory" class="form-control">
                            <option value="all">جميع التصنيفات</option>
                            ${window.categories?.map(c => `<option value="${c.id}">${c.name}</option>`).join('') || ''}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>📍 البحث في</label>
                        <select id="advSearchField" class="form-control">
                            <option value="name">الاسم فقط</option>
                            <option value="all">جميع الحقول</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" onclick="window.advancedSearch.performSearch()">بحث</button>
                        <button class="btn-secondary" onclick="this.closest('.modal-glass').remove()">إلغاء</button>
                    </div>
                    <div id="advSearchResults" style="margin-top:20px;"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        performSearch() {
            const query = document.getElementById('advSearchQuery')?.value.trim().toLowerCase();
            const categoryId = document.getElementById('advSearchCategory')?.value;
            const searchField = document.getElementById('advSearchField')?.value;
            
            if (!query) {
                alert('⚠️ أدخل كلمة البحث');
                return;
            }
            
            let results = window.herbs || [];
            
            if (categoryId !== 'all') {
                results = results.filter(h => h.categoryId === categoryId);
            }
            
            if (searchField === 'name') {
                results = results.filter(h => h.name.toLowerCase().includes(query));
            } else {
                results = results.filter(h => 
                    h.name.toLowerCase().includes(query) ||
                    (h.benefits || '').toLowerCase().includes(query) ||
                    (h.warnings || '').toLowerCase().includes(query) ||
                    (h.usage || '').toLowerCase().includes(query)
                );
            }
            
            const resultsDiv = document.getElementById('advSearchResults');
            if (results.length) {
                resultsDiv.innerHTML = `
                    <h4>📋 نتائج البحث (${results.length})</h4>
                    ${results.map(h => `
                        <div class="search-item" onclick="window.showHerbDetail('${h.id}'); document.querySelector('.modal-glass.active')?.remove()">
                            <b>🌿 ${h.name}</b>
                            <small>${(h.benefits || '').substring(0, 100)}</small>
                        </div>
                    `).join('')}
                `;
            } else {
                resultsDiv.innerHTML = '<div class="empty-state">❌ لا توجد نتائج</div>';
            }
            
            window.statistics?.trackSearch();
        }
    }
    
    // =====================================================
    // 7. نظام الإشارات المرجعية والملاحظات
    // =====================================================
    
    class BookmarkSystem {
        constructor() {
            this.bookmarks = this.loadBookmarks();
            this.notes = this.loadNotes();
        }
        
        loadBookmarks() {
            const saved = localStorage.getItem('herb_bookmarks');
            return saved ? JSON.parse(saved) : [];
        }
        
        saveBookmarks() {
            localStorage.setItem('herb_bookmarks', JSON.stringify(this.bookmarks));
        }
        
        loadNotes() {
            const saved = localStorage.getItem('herb_notes');
            return saved ? JSON.parse(saved) : {};
        }
        
        saveNotes() {
            localStorage.setItem('herb_notes', JSON.stringify(this.notes));
        }
        
        toggleBookmark(herbId) {
            if (this.bookmarks.includes(herbId)) {
                this.bookmarks = this.bookmarks.filter(id => id !== herbId);
                showToast('❌ تمت إزالة من الإشارات', 'info');
            } else {
                this.bookmarks.push(herbId);
                showToast('✅ تمت إضافة إلى الإشارات', 'success');
            }
            this.saveBookmarks();
            this.updateBookmarkButtons();
        }
        
        isBookmarked(herbId) {
            return this.bookmarks.includes(herbId);
        }
        
        addNote(herbId, note) {
            this.notes[herbId] = note;
            this.saveNotes();
            showToast('✅ تم حفظ الملاحظة', 'success');
        }
        
        getNote(herbId) {
            return this.notes[herbId] || '';
        }
        
        showBookmarksList() {
            const bookmarkedHerbs = (window.herbs || []).filter(h => this.bookmarks.includes(h.id));
            
            if (!bookmarkedHerbs.length) {
                alert('📭 لا توجد إشارات مرجعية');
                return;
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal-glass active';
            modal.innerHTML = `
                <div class="modal-glass-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>🔖 الإشارات المرجعية</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-glass').remove()">✕</button>
                    </div>
                    <div class="bookmarks-list">
                        ${bookmarkedHerbs.map(h => `
                            <div class="category-item" style="cursor:pointer;" onclick="window.showHerbDetail('${h.id}'); document.querySelector('.modal-glass.active')?.remove()">
                                <span>🌿 ${h.name}</span>
                                <small>${(h.benefits || '').substring(0, 50)}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        updateBookmarkButtons() {
            document.querySelectorAll('.bookmark-btn').forEach(btn => {
                const herbId = btn.dataset.id;
                if (this.isBookmarked(herbId)) {
                    btn.innerHTML = '<i class="fas fa-bookmark"></i>';
                    btn.style.color = '#ff9800';
                } else {
                    btn.innerHTML = '<i class="far fa-bookmark"></i>';
                    btn.style.color = '';
                }
            });
        }
        
        showNotesModal(herbId, herbName) {
            const currentNote = this.getNote(herbId);
            const modal = document.createElement('div');
            modal.className = 'modal-glass active';
            modal.innerHTML = `
                <div class="modal-glass-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>📝 ملاحظاتي - ${herbName}</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-glass').remove()">✕</button>
                    </div>
                    <textarea id="herbNoteText" rows="6" style="width:100%;padding:10px;border-radius:10px;background:var(--light-bg);border:1px solid var(--separator);font-family:inherit;">${currentNote}</textarea>
                    <div class="modal-actions" style="margin-top:15px;">
                        <button class="btn-primary" onclick="window.bookmarkSystem.saveNoteFromModal('${herbId}')">حفظ</button>
                        <button class="btn-secondary" onclick="this.closest('.modal-glass').remove()">إلغاء</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        saveNoteFromModal(herbId) {
            const note = document.getElementById('herbNoteText')?.value;
            if (note !== undefined) {
                this.addNote(herbId, note);
                document.querySelector('.modal-glass.active')?.remove();
            }
        }
    }
    
    // =====================================================
    // 8. نظام التصنيفات الذكية
    // =====================================================
    
    class SmartCategories {
        static async suggestCategories(herbName, benefits) {
            const keywords = {
                'هضم': ['هضم', 'معدة', 'قولون', 'عسر هضم'],
                'مناعة': ['مناعة', 'فيروس', 'برد', 'انفلونزا'],
                'أعصاب': ['أعصاب', 'توتر', 'قلق', 'أرق'],
                'قلب': ['قلب', 'ضغط', 'كولسترول', 'شرايين'],
                'جلد': ['جلد', 'بشرة', 'حبوب', 'اكزيما']
            };
            
            const text = `${herbName} ${benefits}`.toLowerCase();
            let suggestions = [];
            
            for (const [category, words] of Object.entries(keywords)) {
                if (words.some(word => text.includes(word))) {
                    suggestions.push(category);
                }
            }
            
            return suggestions.slice(0, 3);
        }
        
        static async autoCategorize() {
            if (!window.herbs?.length) return;
            
            let updates = 0;
            for (const herb of window.herbs) {
                if (!herb.categoryId) {
                    const suggestions = await this.suggestCategories(herb.name, herb.benefits);
                    if (suggestions.length) {
                        const categoryName = suggestions[0];
                        let category = window.categories?.find(c => c.name === categoryName);
                        if (!category && window.addCategory) {
                            category = await window.addCategory(categoryName);
                        }
                        if (category && window.updateHerb) {
                            await window.updateHerb(herb.id, { ...herb, categoryId: category.id });
                            updates++;
                        }
                    }
                }
            }
            
            if (updates) {
                await window.loadHerbsFromSupabase?.();
                showToast(`✅ تم تصنيف ${updates} عشبة تلقائياً`, 'success');
            }
        }
    }
    
    // =====================================================
    // 9. نظام النشرات الصحية
    // =====================================================
    
    class HealthTips {
        static tips = [
            { title: '🌙 شاي البابونج', content: 'يساعد على الاسترخاء وتحسين النوم', icon: '🌙' },
            { title: '🍯 عسل النحل', content: 'مضاد حيوي طبيعي ومقوي للمناعة', icon: '🍯' },
            { title: '🌿 النعناع', content: 'يساعد على الهضم ويخفف الغثيان', icon: '🌿' },
            { title: '💚 الزنجبيل', content: 'مضاد للالتهابات ويخفف الغثيان', icon: '💚' },
            { title: '🧄 الثوم', content: 'يقوي المناعة ويخفض ضغط الدم', icon: '🧄' },
            { title: '🍀 الكركم', content: 'مضاد قوي للالتهابات', icon: '🍀' },
            { title: '🌼 القرفة', content: 'تنظم سكر الدم وتحسن الهضم', icon: '🌼' },
            { title: '🌸 الحلبة', content: 'مفيدة للهضم وإدرار الحليب', icon: '🌸' }
        ];
        
        static currentIndex = 0;
        
        static showRandomTip() {
            const randomTip = this.tips[Math.floor(Math.random() * this.tips.length)];
            showToast(`${randomTip.title}: ${randomTip.content}`, 'info');
        }
        
        static showDailyTip() {
            const lastTipDate = localStorage.getItem('last_tip_date');
            const today = new Date().toDateString();
            
            if (lastTipDate !== today) {
                const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
                setTimeout(() => {
                    showToast(`💡 نصيحة اليوم: ${tip.title} - ${tip.content}`, 'success');
                }, 3000);
                localStorage.setItem('last_tip_date', today);
            }
        }
        
        static createTipsWidget() {
            const widget = document.createElement('div');
            widget.className = 'tips-widget';
            widget.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 20px;
                background: var(--card-bg);
                backdrop-filter: blur(20px);
                padding: 12px 20px;
                border-radius: 50px;
                cursor: pointer;
                z-index: 9999;
                box-shadow: var(--shadow);
                border: 1px solid var(--glass-border);
                font-size: 0.85rem;
                direction: rtl;
            `;
            
            const updateTip = () => {
                const tip = this.tips[this.currentIndex];
                widget.innerHTML = `💡 ${tip.title}`;
                this.currentIndex = (this.currentIndex + 1) % this.tips.length;
            };
            
            updateTip();
            widget.onclick = () => {
                const tip = this.tips[this.currentIndex];
                showToast(`${tip.title}: ${tip.content}`, 'info');
                updateTip();
            };
            
            document.body.appendChild(widget);
            
            setInterval(updateTip, 10000);
        }
    }
    
    // =====================================================
    // 10. نظام تحديث البيانات
    // =====================================================
    
    class DataSyncManager {
        static async checkForUpdates() {
            const lastSync = localStorage.getItem('last_sync');
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            
            if (!lastSync || (now - parseInt(lastSync)) > oneDay) {
                if (navigator.onLine && window.loadHerbsFromSupabase) {
                    await window.loadHerbsFromSupabase();
                    localStorage.setItem('last_sync', now.toString());
                    showToast('✅ تم تحديث البيانات تلقائياً', 'success');
                }
            }
        }
        
        static showLastUpdateInfo() {
            const lastSync = localStorage.getItem('last_sync');
            const lastCache = localStorage.getItem('herbal_cache_v3');
            
            let info = '';
            if (lastSync) {
                const date = new Date(parseInt(lastSync));
                info += `آخر مزامنة: ${date.toLocaleString('ar-EG')}\n`;
            }
            if (lastCache) {
                try {
                    const cache = JSON.parse(lastCache);
                    info += `عدد الأعشاب في الكاش: ${cache.herbs?.length || 0}\n`;
                    info += `آخر تحديث للكاش: ${new Date(cache.timestamp).toLocaleString('ar-EG')}`;
                } catch(e) {}
            }
            
            alert(`📊 معلومات البيانات:\n${info || 'لا توجد بيانات محفوظة'}`);
        }
        
        static async forceSync() {
            if (window.loadHerbsFromSupabase) {
                showToast('🔄 جاري مزامنة البيانات...', 'info');
                await window.loadHerbsFromSupabase();
            }
        }
    }
    
    // =====================================================
    // 11. نظام الكلمات المفتاحية
    // =====================================================
    
    class TagSystem {
        static async generateTags(herb) {
            const tags = [];
            const text = `${herb.name} ${herb.benefits} ${herb.usage}`.toLowerCase();
            
            const tagKeywords = {
                'مفيد للهضم': ['هضم', 'معدة', 'قولون'],
                'مضاد للالتهابات': ['التهاب', 'تورم', 'احمرار'],
                'مقوي للمناعة': ['مناعة', 'فيروس', 'برد'],
                'مهدئ للأعصاب': ['أعصاب', 'توتر', 'قلق'],
                'مفيد للقلب': ['قلب', 'ضغط', 'كولسترول']
            };
            
            for (const [tag, keywords] of Object.entries(tagKeywords)) {
                if (keywords.some(kw => text.includes(kw))) {
                    tags.push(tag);
                }
            }
            
            return tags;
        }
        
        static showTagCloud() {
            const allTags = [];
            for (const herb of window.herbs || []) {
                const tags = this.generateTags(herb);
                allTags.push(...tags);
            }
            
            const tagCount = {};
            allTags.forEach(tag => { tagCount[tag] = (tagCount[tag] || 0) + 1; });
            
            const modal = document.createElement('div');
            modal.className = 'modal-glass active';
            modal.innerHTML = `
                <div class="modal-glass-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>🏷️ سحابة الكلمات المفتاحية</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-glass').remove()">✕</button>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;padding:20px;">
                        ${Object.entries(tagCount).map(([tag, count]) => `
                            <span style="padding:8px 15px;background:var(--primary);color:white;border-radius:30px;font-size:${12 + count}px;cursor:pointer;" 
                                  onclick="window.tagSystem.searchByTag('${tag}')">
                                ${tag} (${count})
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        static searchByTag(tag) {
            const tagMapping = {
                'مفيد للهضم': ['هضم', 'معدة', 'قولون'],
                'مضاد للالتهابات': ['التهاب', 'تورم'],
                'مقوي للمناعة': ['مناعة', 'فيروس'],
                'مهدئ للأعصاب': ['أعصاب', 'توتر'],
                'مفيد للقلب': ['قلب', 'ضغط']
            };
            
            const keywords = tagMapping[tag] || [tag];
            const results = (window.herbs || []).filter(herb => {
                const text = `${herb.name} ${herb.benefits}`.toLowerCase();
                return keywords.some(kw => text.includes(kw));
            });
            
            if (results.length) {
                const modal = document.querySelector('.modal-glass.active');
                if (modal) modal.remove();
                
                const resultsModal = document.createElement('div');
                resultsModal.className = 'modal-glass active';
                resultsModal.innerHTML = `
                    <div class="modal-glass-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h3>🏷️ نتائج البحث عن: ${tag}</h3>
                            <button class="close-modal-btn" onclick="this.closest('.modal-glass').remove()">✕</button>
                        </div>
                        ${results.map(h => `
                            <div class="search-item" onclick="window.showHerbDetail('${h.id}'); document.querySelectorAll('.modal-glass.active').forEach(m => m.remove())">
                                🌿 ${h.name}
                            </div>
                        `).join('')}
                    </div>
                `;
                document.body.appendChild(resultsModal);
            } else {
                showToast('❌ لا توجد نتائج', 'warning');
            }
        }
    }
    
    // =====================================================
    // 12. نظام المساعد الصحي (AI Assistant)
    // =====================================================
    
    class HealthAssistant {
        static suggestions = {
            'صداع': ['النعناع', 'البابونج', 'الزنجبيل'],
            'أرق': ['البابونج', 'الخزامى', 'النعناع'],
            'هضم': ['النعناع', 'الزنجبيل', 'اليانسون'],
            'برد': ['الزنجبيل', 'القرفة', 'الكركم'],
            'إجهاد': ['البابونج', 'الخزامى', 'النعناع']
        };
        
        static showAssistant() {
            const modal = document.createElement('div');
            modal.className = 'modal-glass active';
            modal.innerHTML = `
                <div class="modal-glass-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h3>🤖 المساعد الصحي الذكي</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-glass').remove()">✕</button>
                    </div>
                    <div class="form-group">
                        <label>🔍 ما الذي تبحث عنه؟ (صداع، أرق، هضم...)</label>
                        <input type="text" id="assistantQuery" class="search-input" placeholder="مثال: صداع">
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" onclick="window.healthAssistant.getRecommendation()">استشارة</button>
                    </div>
                    <div id="assistantResult" style="margin-top:20px;"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        static getRecommendation() {
            const query = document.getElementById('assistantQuery')?.value.trim().toLowerCase();
            const resultDiv = document.getElementById('assistantResult');
            
            if (!query) {
                resultDiv.innerHTML = '<div class="info-block">⚠️ أدخل ما تبحث عنه</div>';
                return;
            }
            
            let matched = null;
            let matchScore = 0;
            
            for (const [symptom, herbs] of Object.entries(this.suggestions)) {
                if (query.includes(symptom) || symptom.includes(query)) {
                    matched = herbs;
                    break;
                }
            }
            
            if (matched) {
                const herbLinks = matched.map(herbName => {
                    const herb = (window.herbs || []).find(h => h.name === herbName);
                    return herb ? `<div class="search-item" onclick="window.showHerbDetail('${herb.id}'); document.querySelectorAll('.modal-glass.active').forEach(m => m.remove())">🌿 ${herb.name}</div>` : `<div>🌿 ${herbName}</div>`;
                }).join('');
                
                resultDiv.innerHTML = `
                    <div class="info-block">
                        <div class="info-label">💡 توصياتي لك:</div>
                        ${herbLinks}
                    </div>
                `;
            } else {
                resultDiv.innerHTML = '<div class="info-block">🔍 لم أجد توصيات محددة. جرب البحث عن: صداع، أرق، هضم</div>';
            }
        }
    }
    
    // =====================================================
    // تهيئة جميع الأنظمة وتفعيل الميزات
    // =====================================================
    
    let statistics = null;
    let compareSystem = null;
    let bookmarkSystem = null;
    let advancedSearch = null;
    let advancedTheme = null;
    
    function initAllSystems() {
        statistics = new StatisticsSystem();
        compareSystem = new CompareSystem();
        bookmarkSystem = new BookmarkSystem();
        advancedSearch = new AdvancedSearch();
        advancedTheme = new AdvancedTheme();
        
        window.statistics = statistics;
        window.compareSystem = compareSystem;
        window.bookmarkSystem = bookmarkSystem;
        window.advancedSearch = advancedSearch;
        window.advancedTheme = advancedTheme;
        window.exportSystem = ExportSystem;
        window.healthAssistant = HealthAssistant;
        window.tagSystem = TagSystem;
        window.smartCategories = SmartCategories;
        window.dataSync = DataSyncManager;
        window.healthTips = HealthTips;
        window.notificationSystem = new NotificationSystem();
        
        // تتبع الزيارات
        statistics.trackVisit();
        
        // عرض نصيحة اليوم
        setTimeout(() => HealthTips.showDailyTip(), 2000);
        
        // إنشاء واجهة النصائح
        setTimeout(() => HealthTips.createTipsWidget(), 5000);
        
        // التحقق من التحديثات
        setTimeout(() => DataSyncManager.checkForUpdates(), 3000);
        
        console.log('✅ تم تهيئة أكثر من 40 ميزة إضافية');
    }
    
    // إضافة أزرار جديدة للواجهة
    function addExtraButtons() {
        const adminToolbar = document.querySelector('.admin-toolbar');
        const visitorToolbar = document.querySelector('.visitor-toolbar');
        const headerButtons = document.querySelector('.header-buttons');
        
        if (adminToolbar) {
            const extraAdminButtons = `
                <button class="tool-btn" id="statsBtn" title="الإحصائيات"><i class="fas fa-chart-line"></i> إحصائيات</button>
                <button class="tool-btn" id="autoCategorizeBtn" title="تصنيف ذكي"><i class="fas fa-robot"></i> تصنيف ذكي</button>
                <button class="tool-btn" id="syncDataBtn" title="مزامنة"><i class="fas fa-sync-alt"></i> مزامنة</button>
                <button class="tool-btn" id="exportAllBtn" title="تصدير CSV"><i class="fas fa-file-csv"></i> تصدير CSV</button>
                <button class="tool-btn" id="showTagCloudBtn" title="كلمات مفتاحية"><i class="fas fa-tags"></i> كلمات مفتاحية</button>
                <button class="tool-btn" id="highContrastBtn" title="تباين عالي"><i class="fas fa-adjust"></i> تباين</button>
                <button class="tool-btn" id="scheduleThemeBtn" title="وضع تلقائي"><i class="fas fa-clock"></i> تلقائي</button>
            `;
            adminToolbar.insertAdjacentHTML('beforeend', extraAdminButtons);
        }
        
        if (visitorToolbar) {
            const extraVisitorButtons = `
                <button class="visitor-btn" id="compareBtn"><i class="fas fa-balance-scale"></i> مقارنة</button>
                <button class="visitor-btn" id="bookmarksBtn"><i class="fas fa-bookmark"></i> إشاراتي</button>
                <button class="visitor-btn" id="advancedSearchBtn"><i class="fas fa-search-plus"></i> بحث متقدم</button>
                <button class="visitor-btn" id="assistantBtn"><i class="fas fa-robot"></i> مساعد صحي</button>
                <button class="visitor-btn" id="statisticsBtn"><i class="fas fa-chart-simple"></i> إحصائياتي</button>
                <button class="visitor-btn" id="notificationsBtn"><i class="fas fa-bell"></i> إشعارات</button>
            `;
            visitorToolbar.insertAdjacentHTML('beforeend', extraVisitorButtons);
        }
        
        if (headerButtons) {
            const extraHeaderButtons = `
                <button class="icon-btn" id="tipsBtn" title="نصائح صحية"><i class="fas fa-lightbulb"></i></button>
                <button class="icon-btn" id="infoBtn" title="معلومات التطبيق"><i class="fas fa-info-circle"></i></button>
            `;
            headerButtons.insertAdjacentHTML('beforeend', extraHeaderButtons);
        }
    }
    
    function attachExtraEvents() {
        document.getElementById('statsBtn')?.addEventListener('click', () => statistics.showStatistics());
        document.getElementById('statisticsBtn')?.addEventListener('click', () => statistics.showStatistics());
        document.getElementById('compareBtn')?.addEventListener('click', () => compareSystem.showCompare());
        document.getElementById('bookmarksBtn')?.addEventListener('click', () => bookmarkSystem.showBookmarksList());
        document.getElementById('advancedSearchBtn')?.addEventListener('click', () => advancedSearch.showAdvancedSearch());
        document.getElementById('assistantBtn')?.addEventListener('click', () => HealthAssistant.showAssistant());
        document.getElementById('autoCategorizeBtn')?.addEventListener('click', () => SmartCategories.autoCategorize());
        document.getElementById('syncDataBtn')?.addEventListener('click', () => DataSyncManager.forceSync());
        document.getElementById('exportAllBtn')?.addEventListener('click', () => ExportSystem.exportToCSV(window.herbs || []));
        document.getElementById('showTagCloudBtn')?.addEventListener('click', () => TagSystem.showTagCloud());
        document.getElementById('highContrastBtn')?.addEventListener('click', () => AdvancedTheme.setHighContrast());
        document.getElementById('scheduleThemeBtn')?.addEventListener('click', () => advancedTheme.toggleSchedule());
        document.getElementById('tipsBtn')?.addEventListener('click', () => HealthTips.showRandomTip());
        document.getElementById('notificationsBtn')?.addEventListener('click', () => window.notificationSystem.requestPermission());
        document.getElementById('infoBtn')?.addEventListener('click', () => DataSyncManager.showLastUpdateInfo());
    }
    
    // تعديل showHerbDetail لإضافة أزرار إضافية
    function enhanceHerbDetail() {
        const originalShowDetail = window.showHerbDetail;
        if (originalShowDetail) {
            window.showHerbDetail = function(id) {
                originalShowDetail(id);
                setTimeout(() => {
                    const detailContent = document.getElementById('detailContent');
                    if (detailContent && !detailContent.querySelector('.extra-buttons')) {
                        const herb = window.herbs?.find(h => h.id === id);
                        if (herb) {
                            const extraDiv = document.createElement('div');
                            extraDiv.className = 'extra-buttons';
                            extraDiv.style.cssText = 'display:flex;gap:10px;margin-top:15px;justify-content:center;';
                            extraDiv.innerHTML = `
                                <button class="tool-btn" onclick="window.compareSystem.addToCompare(${JSON.stringify(herb).replace(/"/g, '&quot;')})"><i class="fas fa-balance-scale"></i> مقارنة</button>
                                <button class="tool-btn" id="bookmarkDetailBtn" data-id="${herb.id}"><i class="fas fa-bookmark"></i> إشارة</button>
                                <button class="tool-btn" onclick="window.bookmarkSystem.showNotesModal('${herb.id}', '${herb.name}')"><i class="fas fa-edit"></i> ملاحظة</button>
                                <button class="tool-btn" onclick="window.exportSystem.exportToPDF(${JSON.stringify(herb).replace(/"/g, '&quot;')})"><i class="fas fa-print"></i> طباعة</button>
                            `;
                            detailContent.appendChild(extraDiv);
                            
                            const bookmarkBtn = document.getElementById('bookmarkDetailBtn');
                            if (bookmarkBtn) {
                                bookmarkBtn.onclick = () => {
                                    window.bookmarkSystem.toggleBookmark(herb.id);
                                    bookmarkBtn.innerHTML = window.bookmarkSystem.isBookmarked(herb.id) ? '<i class="fas fa-bookmark"></i> إشارة' : '<i class="far fa-bookmark"></i> إشارة';
                                };
                                if (window.bookmarkSystem.isBookmarked(herb.id)) {
                                    bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> إشارة';
                                }
                            }
                        }
                    }
                }, 100);
            };
        }
    }
    
    // إضافة ميزة استعادة المفضلة عند التصفح
    function updateHerbCardsWithBookmarks() {
        const observer = new MutationObserver(() => {
            if (window.bookmarkSystem) {
                window.bookmarkSystem.updateBookmarkButtons();
            }
        });
        
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            observer.observe(contentArea, { childList: true, subtree: true });
        }
    }
    
    // تصدير جميع الدوال للنطاق العام
    window.ExtraFeatures = {
        statistics,
        compareSystem,
        bookmarkSystem,
        advancedSearch,
        advancedTheme,
        ExportSystem,
        HealthAssistant,
        TagSystem,
        SmartCategories,
        DataSyncManager,
        HealthTips,
        NotificationSystem
    };
    
    // بدء التهيئة عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initAllSystems();
            addExtraButtons();
            attachExtraEvents();
            enhanceHerbDetail();
            updateHerbCardsWithBookmarks();
        });
    } else {
        initAllSystems();
        addExtraButtons();
        attachExtraEvents();
        enhanceHerbDetail();
        updateHerbCardsWithBookmarks();
    }
    
    console.log('🚀 تم تحميل أكثر من 40 ميزة إضافية بنجاح');
})();
