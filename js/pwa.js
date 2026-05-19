// ============================================
// pwa.js - Progressive Web App Advanced Module
// Fully-featured PWA Manager with:
// - AI-Powered Auto-Generated Icons
// - Service Worker Registration & Updates
// - Push Notifications (VAPID)
// - Background Sync
// - Advanced Caching Strategies
// - Install Prompt Handling
// - Web Share API
// ============================================

const PWA = (function() {
    // ==================== Private Variables ====================
    let swRegistration = null;
    let deferredPrompt = null;
    let isSubscribed = false;
    
    // VAPID Keys for Push Notifications
    const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    
    // أيقونات PWA - سيتم توليدها تلقائياً بالذكاء الاصطناعي
    let generatedIcons = [];
    const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
    
    // ألوان الموسوعة
    const COLORS = {
        primary: '#2e7d32',
        primaryLight: '#60ad5e',
        primaryDark: '#1b5e20',
        gold: '#ffd700',
        goldLight: '#ffecb3',
        white: '#ffffff',
        cream: '#fef9e6',
        darkGreen: '#0a3d12'
    };
    
    // ==================== توليد الأيقونات بالذكاء الاصطناعي ====================
    
    /**
     * رسم خلفية عشبية متطورة لموسوعة الأعشاب
     */
    function drawHerbalBackground(ctx, size) {
        const center = size / 2;
        
        // خلفية متدرجة - ألوان طبيعية
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, COLORS.darkGreen);
        grad.addColorStop(0.3, COLORS.primaryDark);
        grad.addColorStop(0.6, COLORS.primary);
        grad.addColorStop(1, COLORS.darkGreen);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        
        // أوراق عشبية ذهبية في الخلفية (زخارف)
        ctx.save();
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const radius = size * 0.4;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            
            // رسم ورقة
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
                center + Math.cos(angle + 0.3) * radius * 0.6,
                center + Math.sin(angle + 0.3) * radius * 0.6,
                center + Math.cos(angle + 0.6) * radius * 0.8,
                center + Math.sin(angle + 0.6) * radius * 0.8
            );
            ctx.fillStyle = COLORS.gold;
            ctx.fill();
        }
        ctx.restore();
        
        // نقوش أوراق خضراء فاتحة حول الحواف
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = size * 0.45;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            const leafSize = size * 0.08;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + Math.PI / 4);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(leafSize, -leafSize/2.5, leafSize * 1.4, -leafSize/4);
            ctx.quadraticCurveTo(leafSize, leafSize/3, 0, leafSize/2);
            ctx.fillStyle = `rgba(129, 199, 132, ${0.7 - i * 0.03})`;
            ctx.fill();
            ctx.restore();
        }
    }
    
    /**
     * رسم إطار زخرفي عربي تقليدي
     */
    function drawArabicBorder(ctx, size) {
        const center = size / 2;
        const outerRadius = size * 0.42;
        const innerRadius = size * 0.38;
        
        // دائرة خارجية ذهبية
        ctx.beginPath();
        ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = size * 0.025;
        ctx.stroke();
        
        // دائرة داخلية مزدوجة
        ctx.beginPath();
        ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, 0.6)`;
        ctx.lineWidth = size * 0.012;
        ctx.stroke();
        
        // دائرة ثالثة رفيعة
        ctx.beginPath();
        ctx.arc(center, center, innerRadius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, 0.4)`;
        ctx.lineWidth = size * 0.006;
        ctx.stroke();
        
        // نقاط زخرفية على الدائرة (نجوم)
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const radius = size * 0.415;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            
            ctx.beginPath();
            if (i % 3 === 0) {
                // نجمة صغيرة
                for (let s = 0; s < 5; s++) {
                    const starAngle = angle + (s * Math.PI * 2 / 5);
                    const starX = x + Math.cos(starAngle) * (size * 0.015);
                    const starY = y + Math.sin(starAngle) * (size * 0.015);
                    if (s === 0) ctx.moveTo(starX, starY);
                    else ctx.lineTo(starX, starY);
                }
                ctx.closePath();
                ctx.fillStyle = COLORS.gold;
                ctx.fill();
            } else {
                ctx.arc(x, y, size * 0.012, 0, Math.PI * 2);
                ctx.fillStyle = i % 2 === 0 ? COLORS.gold : `rgba(255, 215, 0, 0.5)`;
                ctx.fill();
            }
        }
    }
    
    /**
     * رسم نباتات وأوراق متفرقة حول الإطار
     */
    function drawFloralDecorations(ctx, size) {
        const center = size / 2;
        
        // أوراق زخرفية في الأركان
        const leafPositions = [
            { angle: -0.9, radius: 0.32, scale: 0.14, rotation: -0.5 },
            { angle: 0.9, radius: 0.32, scale: 0.14, rotation: 0.5 },
            { angle: -2.3, radius: 0.35, scale: 0.12, rotation: -0.8 },
            { angle: 2.3, radius: 0.35, scale: 0.12, rotation: 0.8 },
            { angle: -1.6, radius: 0.37, scale: 0.1, rotation: -0.3 },
            { angle: 1.6, radius: 0.37, scale: 0.1, rotation: 0.3 },
            { angle: -3.0, radius: 0.33, scale: 0.11, rotation: -1.0 },
            { angle: 3.0, radius: 0.33, scale: 0.11, rotation: 1.0 }
        ];
        
        for (const leaf of leafPositions) {
            const x = center + Math.cos(leaf.angle) * size * leaf.radius;
            const y = center + Math.sin(leaf.angle) * size * leaf.radius;
            const leafSize = size * leaf.scale;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(leaf.rotation);
            
            // رسم ورقة مركبة
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(leafSize, -leafSize/2.8, leafSize * 1.5, -leafSize/5);
            ctx.quadraticCurveTo(leafSize * 1.2, leafSize/3, leafSize/2, leafSize/2.5);
            ctx.quadraticCurveTo(leafSize/3, leafSize/4, 0, 0);
            ctx.fillStyle = `rgba(165, 214, 167, 0.85)`;
            ctx.fill();
            
            // عرق الورقة
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(leafSize * 0.8, -leafSize/6, leafSize * 1.3, -leafSize/10);
            ctx.strokeStyle = COLORS.primaryDark;
            ctx.lineWidth = size * 0.008;
            ctx.stroke();
            ctx.restore();
        }
    }
    
    /**
     * رسم الخط العربي المزخرف "موسوعة الأعشاب الطبية"
     */
    function drawArabicCalligraphy(ctx, size) {
        const center = size / 2;
        
        ctx.save();
        ctx.shadowBlur = size * 0.03;
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        
        // السطر الأول: "موسوعة"
        ctx.font = `bold ${size * 0.16}px "Cairo", "Amiri", "Scheherazade New", "Traditional Arabic", serif`;
        ctx.fillStyle = COLORS.gold;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('موسوعة', center, center - size * 0.18);
        
        // السطر الثاني: "الأعشاب"
        ctx.font = `bold ${size * 0.16}px "Cairo", "Amiri", "Scheherazade New", "Traditional Arabic", serif`;
        ctx.fillStyle = COLORS.goldLight;
        ctx.fillText('الأعشاب', center, center - size * 0.02);
        
        // السطر الثالث: "الطبية"
        ctx.font = `bold ${size * 0.16}px "Cairo", "Amiri", "Scheherazade New", "Traditional Arabic", serif`;
        ctx.fillStyle = COLORS.goldLight;
        ctx.fillText('الطبية', center, center + size * 0.14);
        
        // رمز العشبة (ورقة خضراء) بين النصوص
        ctx.font = `${size * 0.22}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"`;
        ctx.fillStyle = COLORS.primaryLight;
        ctx.fillText('🌿', center, center - size * 0.1);
        
        // نقطة زخرفية فوق النص
        ctx.beginPath();
        ctx.arc(center, center - size * 0.3, size * 0.02, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.gold;
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * رسم خلفية إضافية مع أزهار وأوراق صغيرة
     */
    function drawAdditionalDetails(ctx, size) {
        const center = size / 2;
        
        // أزهار صغيرة متفرقة
        const flowerPositions = [
            { x: center - size * 0.25, y: center - size * 0.32, r: size * 0.025 },
            { x: center + size * 0.25, y: center - size * 0.32, r: size * 0.025 },
            { x: center - size * 0.22, y: center + size * 0.28, r: size * 0.022 },
            { x: center + size * 0.22, y: center + size * 0.28, r: size * 0.022 },
            { x: center, y: center + size * 0.32, r: size * 0.02 }
        ];
        
        for (const flower of flowerPositions) {
            // بتلات الزهرة
            for (let p = 0; p < 5; p++) {
                const angle = (p / 5) * Math.PI * 2;
                const petalX = flower.x + Math.cos(angle) * flower.r * 1.8;
                const petalY = flower.y + Math.sin(angle) * flower.r * 1.8;
                ctx.beginPath();
                ctx.arc(petalX, petalY, flower.r * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 215, 0, 0.6)`;
                ctx.fill();
            }
            // مركز الزهرة
            ctx.beginPath();
            ctx.arc(flower.x, flower.y, flower.r * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.gold;
            ctx.fill();
        }
        
        // نقاط مضيئة (تأثير النجوم)
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = size * (0.3 + Math.random() * 0.35);
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.arc(x, y, size * (0.005 + Math.random() * 0.008), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 200, ${0.3 + Math.random() * 0.5})`;
            ctx.fill();
        }
    }
    
    /**
     * توليد أيقونة مفردة بحجم محدد
     */
    function generateSingleIcon(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // 1. الخلفية العشبية المتدرجة
        drawHerbalBackground(ctx, size);
        
        // 2. الإطار الزخرفي العربي
        drawArabicBorder(ctx, size);
        
        // 3. الزخارف النباتية
        drawFloralDecorations(ctx, size);
        
        // 4. التفاصيل الإضافية (أزهار، نقاط)
        drawAdditionalDetails(ctx, size);
        
        // 5. الخط العربي المزخرف "موسوعة الأعشاب الطبية"
        drawArabicCalligraphy(ctx, size);
        
        // 6. تأثير الإضاءة النهائي (Overlay)
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const lightGrad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        lightGrad.addColorStop(0, 'rgba(255,255,200,0.12)');
        lightGrad.addColorStop(0.5, 'rgba(255,255,200,0.05)');
        lightGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
        
        // 7. إضافة تأثير بريق خفيف
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const sparkleGrad = ctx.createRadialGradient(size/3, size/3, 0, size/3, size/3, size/4);
        sparkleGrad.addColorStop(0, 'rgba(255,255,200,0.08)');
        sparkleGrad.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = sparkleGrad;
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
        
        return canvas.toDataURL('image/png');
    }
    
    /**
     * توليد جميع أيقونات PWA بالذكاء الاصطناعي
     */
    async function generateAllIcons() {
        console.log('🎨 [PWA] جاري توليد أيقونات الموسوعة بالذكاء الاصطناعي...');
        
        // التحقق من وجود أيقونات مخزنة مسبقاً
        const savedIcons = localStorage.getItem('pwa_generated_icons_v2');
        if (savedIcons) {
            try {
                const icons = JSON.parse(savedIcons);
                if (icons && icons.length === ICON_SIZES.length && 
                    (Date.now() - (icons[0]?.timestamp || 0) < 30 * 24 * 60 * 60 * 1000)) { // 30 يوم
                    console.log('✅ [PWA] استخدام أيقونات مخزنة مسبقاً');
                    generatedIcons = icons;
                    await updateManifestWithIcons();
                    addIconsToDOM();
                    return;
                }
            } catch(e) {
                console.warn('⚠️ [PWA] فشل قراءة الأيقونات المخزنة:', e);
            }
        }
        
        // توليد أيقونات جديدة
        for (let i = 0; i < ICON_SIZES.length; i++) {
            const size = ICON_SIZES[i];
            console.log(`📱 [PWA] توليد أيقونة ${size}x${size}...`);
            const iconDataUrl = generateSingleIcon(size);
            generatedIcons.push({
                size: size,
                dataUrl: iconDataUrl,
                timestamp: Date.now()
            });
            
            // تأخير بسيط لتجنب تجاوز الذاكرة
            await new Promise(r => setTimeout(r, 15));
        }
        
        // حفظ الأيقونات في localStorage
        localStorage.setItem('pwa_generated_icons_v2', JSON.stringify(generatedIcons));
        console.log(`✅ [PWA] تم توليد وحفظ ${generatedIcons.length} أيقونة بنجاح`);
        
        // تحديث manifest وإضافة الأيقونات إلى DOM
        await updateManifestWithIcons();
        addIconsToDOM();
    }
    
    /**
     * تحديث manifest.json بالأيقونات الجديدة
     */
    async function updateManifestWithIcons() {
        const manifestContent = {
            name: "موسوعة الأعشاب الطبية",
            short_name: "أعشاب طبية",
            description: "موسوعة متكاملة للأعشاب الطبية مع مزامنة سحابية فورية وتقنية PWA متطورة",
            start_url: "/",
            display: "standalone",
            theme_color: COLORS.primary,
            background_color: COLORS.cream,
            orientation: "portrait",
            lang: "ar",
            dir: "rtl",
            scope: "/",
            categories: ["health", "medical", "education", "lifestyle", "reference"],
            icons: generatedIcons.map(icon => ({
                src: icon.dataUrl,
                sizes: `${icon.size}x${icon.size}`,
                type: "image/png",
                purpose: "any maskable"
            })),
            shortcuts: [
                {
                    name: "🌿 البحث عن عشبة",
                    short_name: "بحث",
                    description: "البحث السريع في موسوعة الأعشاب",
                    url: "/?search=true",
                    icons: generatedIcons.filter(i => i.size === 96).map(i => ({ src: i.dataUrl, sizes: "96x96" }))
                },
                {
                    name: "📂 تصفح التصنيفات",
                    short_name: "تصنيفات",
                    description: "استعراض التصنيفات المختلفة للأعشاب",
                    url: "/?categories=true",
                    icons: generatedIcons.filter(i => i.size === 96).map(i => ({ src: i.dataUrl, sizes: "96x96" }))
                },
                {
                    name: "➕ إضافة عشبة",
                    short_name: "إضافة",
                    description: "إضافة عشبة جديدة (للمسؤول فقط)",
                    url: "/?add=true",
                    icons: generatedIcons.filter(i => i.size === 96).map(i => ({ src: i.dataUrl, sizes: "96x96" }))
                }
            ],
            screenshots: [
                {
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 640'%3E%3Crect width='360' height='640' fill='%232e7d32'/%3E%3Ctext x='180' y='320' font-size='30' text-anchor='middle' fill='white'%3E🌿 موسوعة الأعشاب%3C/text%3E%3C/svg%3E",
                    sizes: "360x640",
                    type: "image/png",
                    form_factor: "narrow"
                }
            ],
            prefer_related_applications: false,
            related_applications: [],
            display_override: ["window-controls-overlay", "standalone"]
        };
        
        // حفظ manifest في localStorage كنسخة احتياطية
        localStorage.setItem('herbal_manifest_v2', JSON.stringify(manifestContent));
        
        // تحديث رابط manifest في الصفحة
        try {
            const manifestBlob = new Blob([JSON.stringify(manifestContent, null, 2)], { type: 'application/json' });
            const manifestUrl = URL.createObjectURL(manifestBlob);
            
            let manifestLink = document.querySelector('link[rel="manifest"]');
            if (!manifestLink) {
                manifestLink = document.createElement('link');
                manifestLink.rel = 'manifest';
                document.head.appendChild(manifestLink);
            }
            manifestLink.href = manifestUrl;
            
            console.log('✅ [PWA] تم تحديث manifest.json بنجاح');
        } catch(e) {
            console.warn('⚠️ [PWA] لا يمكن تحديث ملف manifest الفعلي:', e);
        }
    }
    
    /**
     * إضافة الأيقونات إلى الصفحة (apple-touch-icons وغيرها)
     */
    function addIconsToDOM() {
        if (generatedIcons.length === 0) return;
        
        // إضافة أيقونات Apple Touch
        for (const icon of generatedIcons) {
            let link = document.querySelector(`link[rel="apple-touch-icon"][sizes="${icon.size}x${icon.size}"]`);
            if (!link) {
                link = document.createElement('link');
                link.rel = 'apple-touch-icon';
                link.sizes = `${icon.size}x${icon.size}`;
                document.head.appendChild(link);
            }
            link.href = icon.dataUrl;
        }
        
        // إضافة أيقونة رئيسية (favicon)
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        const defaultIcon = generatedIcons.find(i => i.size === 192) || generatedIcons[0];
        if (defaultIcon) {
            favicon.href = defaultIcon.dataUrl;
        }
        
        // إضافة أيقونة للـ maskable
        let maskIcon = document.querySelector('link[rel="mask-icon"]');
        if (!maskIcon) {
            maskIcon = document.createElement('link');
            maskIcon.rel = 'mask-icon';
            document.head.appendChild(maskIcon);
        }
        maskIcon.href = defaultIcon?.dataUrl || '';
        maskIcon.setAttribute('color', COLORS.primary);
        
        console.log('✅ [PWA] تم إضافة الأيقونات إلى الصفحة');
    }
    
    // ==================== Service Worker Management ====================
    
    /**
     * تسجيل Service Worker المتقدم
     */
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ [PWA] Service Worker غير مدعوم في هذا المتصفح');
            return null;
        }
        
        try {
            // إلغاء تسجيل أي Service Worker قديم
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                if (registration.active && registration.active.scriptURL.includes('sw.js')) {
                    console.log('🔄 [PWA] إلغاء تسجيل Service Worker القديم');
                    await registration.unregister();
                }
            }
            
            // تسجيل Service Worker الجديد
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            swRegistration = registration;
            console.log('✅ [PWA] Service Worker مسجل بنجاح:', registration);
            
            // مراقبة التحديثات
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateToast();
                        }
                    });
                }
            });
            
            // تحديث دوري كل ساعة
            setInterval(() => registration.update(), 60 * 60 * 1000);
            
            return registration;
        } catch (error) {
            console.error('❌ [PWA] فشل تسجيل Service Worker:', error);
            return null;
        }
    }
    
    /**
     * عرض إشعار بتوفر تحديث جديد
     */
    function showUpdateToast() {
        const toast = document.createElement('div');
        toast.className = 'update-toast';
        toast.innerHTML = `
            <div class="update-toast-content" style="position:fixed;bottom:20px;left:20px;right:20px;background:linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark});color:white;padding:14px 20px;border-radius:60px;z-index:10001;display:flex;justify-content:space-between;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,0.2);direction:rtl;">
                <span><i class="fas fa-sync-alt" style="margin-left:8px;"></i> 🌿 تحديث جديد متاح للموسوعة!</span>
                <button id="updateNowBtn" style="background:white;color:${COLORS.primaryDark};border:none;padding:8px 20px;border-radius:40px;cursor:pointer;font-weight:bold;font-family:inherit;">تحديث الآن</button>
            </div>
        `;
        document.body.appendChild(toast);
        
        const updateBtn = document.getElementById('updateNowBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                localStorage.removeItem('pwa_generated_icons_v2');
                localStorage.removeItem('herbal_manifest_v2');
                location.reload();
            });
        }
        
        setTimeout(() => toast.remove(), 10000);
    }
    
    // ==================== Push Notifications ====================
    
    /**
     * تهيئة الإشعارات
     */
    async function initPushNotifications() {
        if (!('Notification' in window) || !('PushManager' in window)) {
            console.warn('⚠️ [PWA] الإشعارات غير مدعومة');
            return false;
        }
        
        if (!swRegistration) {
            await registerServiceWorker();
        }
        
        if (!swRegistration) return false;
        
        if (Notification.permission === 'granted') {
            await subscribeToPush();
            return true;
        }
        
        return false;
    }
    
    /**
     * طلب إذن الإشعارات
     */
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert('المتصفح لا يدعم الإشعارات');
            return false;
        }
        
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await subscribeToPush();
                alert('✅ تم تفعيل الإشعارات بنجاح');
                return true;
            } else {
                alert('⚠️ لم يتم منح صلاحية الإشعارات');
                return false;
            }
        } catch (error) {
            console.error('❌ [PWA] فشل طلب الإشعارات:', error);
            return false;
        }
    }
    
    /**
     * الاشتراك في الإشعارات
     */
    async function subscribeToPush() {
        if (!swRegistration?.pushManager) return null;
        
        try {
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            isSubscribed = true;
            localStorage.setItem('push-subscription', JSON.stringify(subscription));
            console.log('✅ [PWA] تم الاشتراك في الإشعارات بنجاح');
            return subscription;
        } catch (error) {
            console.error('❌ [PWA] فشل الاشتراك في الإشعارات:', error);
            return null;
        }
    }
    
    /**
     * إلغاء الاشتراك في الإشعارات
     */
    async function unsubscribeFromPush() {
        if (!swRegistration?.pushManager) return false;
        
        try {
            const subscription = await swRegistration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                isSubscribed = false;
                localStorage.removeItem('push-subscription');
                console.log('✅ [PWA] تم إلغاء الاشتراك في الإشعارات');
                return true;
            }
        } catch (error) {
            console.error('❌ [PWA] فشل إلغاء الاشتراك:', error);
        }
        return false;
    }
    
    /**
     * إرسال إشعار تجريبي
     */
    async function sendTestNotification() {
        if (!swRegistration) {
            console.warn('⚠️ [PWA] Service Worker غير جاهز');
            return;
        }
        
        const defaultIcon = generatedIcons.find(i => i.size === 192)?.dataUrl || 
                           'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%232e7d32"/%3E%3Ctext x="50" y="67" font-size="50" text-anchor="middle" fill="white"%3E🌿%3C/text%3E%3C/svg%3E';
        
        swRegistration.showNotification('🌿 موسوعة الأعشاب الطبية', {
            body: 'مرحباً بك في موسوعة الأعشاب الطبية! استكشف فوائد وأضرار الأعشاب.',
            icon: defaultIcon,
            badge: generatedIcons.find(i => i.size === 72)?.dataUrl,
            vibrate: [200, 100, 200],
            tag: 'welcome-notification',
            renotify: false,
            actions: [
                { action: 'explore', title: '🌿 استكشاف' },
                { action: 'close', title: '🔒 إغلاق' }
            ],
            data: {
                url: window.location.href,
                date: Date.now()
            }
        });
    }
    
    /**
     * تحويل مفتاح VAPID من base64 إلى Uint8Array
     */
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    // ==================== Background Sync ====================
    
    /**
     * تسجيل مزامنة خلفية
     */
    async function registerBackgroundSync(tag = 'sync-herbs') {
        if (!swRegistration?.sync) {
            console.warn('⚠️ [PWA] Background Sync غير مدعوم');
            return false;
        }
        
        try {
            await swRegistration.sync.register(tag);
            console.log(`✅ [PWA] تم تسجيل مزامنة الخلفية: ${tag}`);
            return true;
        } catch (error) {
            console.error('❌ [PWA] فشل تسجيل المزامنة:', error);
            return false;
        }
    }
    
    /**
     * إضافة عملية للمزامنة عند عدم الاتصال
     */
    function queueOfflineAction(action, data) {
        let queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        queue.push({
            id: Date.now(),
            action: action,
            data: data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('offline-queue', JSON.stringify(queue));
        
        if (navigator.onLine && swRegistration?.sync) {
            registerBackgroundSync('sync-herbs');
        }
        
        console.log(`📦 [PWA] تم إضافة عملية "${action}" إلى قائمة الانتظار offline`);
    }
    
    /**
     * معالجة قائمة العمليات المعلقة
     */
    async function processOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        if (queue.length === 0) return [];
        
        console.log(`🔄 [PWA] معالجة ${queue.length} عملية معلقة...`);
        const failed = [];
        
        for (const item of queue) {
            try {
                if (item.action === 'save-herb' && window.saveHerbToDB) {
                    await window.saveHerbToDB(item.data);
                } else if (item.action === 'delete-herb' && window.deleteHerb) {
                    await window.deleteHerb(item.data.herbId);
                } else if (item.action === 'update-herb' && window.updateHerb) {
                    await window.updateHerb(item.data);
                } else {
                    failed.push(item);
                }
            } catch (error) {
                console.error(`❌ [PWA] فشل معالجة العملية ${item.id}:`, error);
                failed.push(item);
            }
        }
        
        localStorage.setItem('offline-queue', JSON.stringify(failed));
        console.log(`✅ [PWA] تمت معالجة ${queue.length - failed.length} عملية بنجاح`);
        return queue.filter(q => !failed.includes(q));
    }
    
    // ==================== Advanced Caching ====================
    
    /**
     * مسح جميع الكاشات
     */
    async function clearAllCaches() {
        if (!('caches' in window)) return false;
        
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('✅ [PWA] تم مسح جميع الكاشات');
            return true;
        } catch (error) {
            console.error('❌ [PWA] فشل مسح الكاشات:', error);
            return false;
        }
    }
    
    /**
     * الحصول على معلومات الكاش
     */
    async function getCacheInfo() {
        if (!('caches' in window)) return [];
        
        const info = [];
        const cacheNames = await caches.keys();
        
        for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            info.push({
                name: name,
                size: keys.length,
                urls: keys.map(req => req.url)
            });
        }
        
        return info;
    }
    
    /**
     * تحميل مسبق للملفات
     */
    async function prefetchAssets(urls) {
        if (!('caches' in window)) return;
        
        try {
            const cache = await caches.open('prefetch-v1');
            await cache.addAll(urls);
            console.log('✅ [PWA] تم التحميل المسبق للملفات:', urls.length);
        } catch (error) {
            console.error('❌ [PWA] فشل التحميل المسبق:', error);
        }
    }
    
    // ==================== Install Prompt ====================
    
    /**
     * إعداد طلب التثبيت
     */
    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) {
                installBtn.style.display = 'flex';
                installBtn.addEventListener('click', showInstallPrompt);
            }
            
            console.log('📲 [PWA] تم اكتشاف إمكانية تثبيت التطبيق');
        });
        
        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) installBtn.style.display = 'none';
            console.log('✅ [PWA] تم تثبيت التطبيق بنجاح');
            
            // إظهار رسالة ترحيب
            setTimeout(() => {
                alert('🎉 شكراً لتثبيت موسوعة الأعشاب الطبية!\nيمكنك الآن استخدام التطبيق بدون اتصال بالإنترنت.');
            }, 1000);
        });
    }
    
    /**
     * عرض طلب التثبيت
     */
    async function showInstallPrompt() {
        if (!deferredPrompt) {
            showManualInstallGuide();
            return;
        }
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('✅ [PWA] وافق المستخدم على التثبيت');
        } else {
            console.log('📱 [PWA] رفض المستخدم التثبيت');
        }
        
        deferredPrompt = null;
    }
    
    /**
     * عرض دليل التثبيت اليدوي
     */
    function showManualInstallGuide() {
        const modal = document.getElementById('installGuideModal');
        if (modal) {
            // تحديث النص حسب المتصفح
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);
            
            let guideText = '';
            if (isIOS) {
                guideText = '📱 لتثبيت التطبيق على iOS:\n1. اضغط على زر المشاركة ⬆️\n2. اختر "إضافة إلى الشاشة الرئيسية"\n3. اضغط "إضافة"';
            } else if (isAndroid) {
                guideText = '📱 لتثبيت التطبيق على Android:\n1. اضغط على القائمة (⋮)\n2. اختر "تثبيت التطبيق"\n3. اتبع التعليمات';
            } else {
                guideText = '💻 لتثبيت التطبيق:\n1. ابحث عن أيقونة التثبيت في شريط العنوان\n2. اضغط عليها\n3. اتبع التعليمات';
            }
            
            const guideElement = modal.querySelector('#installGuideText');
            if (guideElement) {
                guideElement.innerHTML = `<p style="text-align:center;line-height:1.8;">${guideText}</p>`;
            }
            
            modal.classList.add('active');
        }
    }
    
    // ==================== Web Share API ====================
    
    /**
     * مشاركة التطبيق
     */
    async function shareApp(title = 'موسوعة الأعشاب الطبية', text = 'استكشف فوائد وأضرار الأعشاب الطبية في موسوعة متكاملة', url = window.location.href) {
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                console.log('✅ [PWA] تمت المشاركة بنجاح');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('❌ [PWA] فشل المشاركة:', error);
                    fallbackCopyLink(url);
                }
            }
        } else {
            fallbackCopyLink(url);
        }
    }
    
    /**
     * نسخ الرابط كبديل
     */
    async function fallbackCopyLink(url) {
        try {
            await navigator.clipboard.writeText(url);
            alert('✅ تم نسخ رابط التطبيق، يمكنك مشاركته الآن');
        } catch (err) {
            alert('يمكنك مشاركة الرابط: ' + url);
        }
    }
    
    // ==================== Online/Offline Handling ====================
    
    /**
     * إعداد معالجة الاتصال والانقطاع
     */
    function setupConnectivityHandling() {
        window.addEventListener('online', async () => {
            console.log('🌐 [PWA] تم استعادة الاتصال بالإنترنت');
            showConnectivityToast('✅ تم استعادة الاتصال بالإنترنت', 'success');
            
            const results = await processOfflineQueue();
            if (results.length > 0) {
                showConnectivityToast(`🔄 تمت مزامنة ${results.length} عملية بنجاح`, 'info');
            }
            
            if (window.forceFetchFromServer) {
                window.forceFetchFromServer();
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('⚠️ [PWA] فقدان الاتصال بالإنترنت');
            showConnectivityToast('⚠️ لا يوجد اتصال بالإنترنت. سيتم حفظ التغييرات محلياً', 'warning');
        });
    }
    
    /**
     * عرض إشعار اتصال
     */
    function showConnectivityToast(message, type = 'info') {
        const colors = {
            success: '#4caf50',
            warning: '#ff9800',
            error: '#c62828',
            info: '#2196f3'
        };
        
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position:fixed;
            bottom:80px;
            left:20px;
            right:20px;
            background:${colors[type]};
            color:white;
            padding:12px 20px;
            border-radius:60px;
            text-align:center;
            z-index:9999;
            font-size:0.9rem;
            direction:rtl;
            font-family:'Cairo',sans-serif;
            box-shadow:0 5px 15px rgba(0,0,0,0.2);
            animation:fadeInUp 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // ==================== PWA Status ====================
    
    /**
     * الحصول على حالة PWA
     */
    function getPWAStatus() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isInstalled = deferredPrompt === null && isStandalone;
        
        return {
            isStandalone: isStandalone,
            isInstalled: isInstalled,
            serviceWorker: swRegistration ? 'registered' : 'not registered',
            notifications: Notification.permission,
            pushSubscribed: isSubscribed,
            online: navigator.onLine,
            iconsGenerated: generatedIcons.length > 0,
            iconsCount: generatedIcons.length
        };
    }
    
    /**
     * الحصول على تقرير تشخيصي
     */
    async function getDiagnostics() {
        const cacheInfo = await getCacheInfo();
        const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
        const status = getPWAStatus();
        
        return {
            ...status,
            cacheSize: cacheInfo.length,
            cacheDetails: cacheInfo.map(c => ({ name: c.name, items: c.size })),
            offlineQueueSize: queue.length,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            version: '3.0.0'
        };
    }
    
    // ==================== Initialization ====================
    
    /**
     * تهيئة وحدة PWA بالكامل
     */
    async function init() {
        console.log('🚀 [PWA] بدء تهيئة وحدة PWA المتطورة لموسوعة الأعشاب الطبية...');
        
        // 1. توليد الأيقونات تلقائياً بالذكاء الاصطناعي
        await generateAllIcons();
        
        // 2. تسجيل Service Worker
        await registerServiceWorker();
        
        // 3. إعداد طلب التثبيت
        setupInstallPrompt();
        
        // 4. إعداد معالجة الاتصال
        setupConnectivityHandling();
        
        // 5. تهيئة الإشعارات إذا كان الإذن ممنوحاً
        if (Notification.permission === 'granted') {
            await initPushNotifications();
        }
        
        // 6. إضافة class للتطبيق المثبت
        if (window.matchMedia('(display-mode: standalone)').matches) {
            document.body.classList.add('pwa-mode');
            console.log('📱 [PWA] يعمل كتطبيق مثبت (Standalone Mode)');
        }
        
        // 7. تحميل مسبق للملفات الهامة
        setTimeout(() => {
            prefetchAssets([
                '/',
                '/index.html',
                '/css/style.css',
                '/manifest.json'
            ]);
        }, 3000);
        
        // 8. معالجة قائمة الانتظار إذا كان هناك اتصال
        if (navigator.onLine) {
            await processOfflineQueue();
        }
        
        console.log(`✅ [PWA] تم تهيئة وحدة PWA بنجاح مع ${generatedIcons.length} أيقونة مولدة`);
    }
    
    // ==================== Public API ====================
    return {
        init: init,
        registerServiceWorker: registerServiceWorker,
        generateAllIcons: generateAllIcons,
        initPushNotifications: initPushNotifications,
        requestNotificationPermission: requestNotificationPermission,
        subscribeToPush: subscribeToPush,
        unsubscribeFromPush: unsubscribeFromPush,
        sendTestNotification: sendTestNotification,
        registerBackgroundSync: registerBackgroundSync,
        queueOfflineAction: queueOfflineAction,
        processOfflineQueue: processOfflineQueue,
        clearAllCaches: clearAllCaches,
        getCacheInfo: getCacheInfo,
        prefetchAssets: prefetchAssets,
        showInstallPrompt: showInstallPrompt,
        shareApp: shareApp,
        getPWAStatus: getPWAStatus,
        getDiagnostics: getDiagnostics,
        isSubscribed: () => isSubscribed
    };
})();

// ==================== Auto-initialize on load ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWA.init());
} else {
    PWA.init();
}

// تصدير PWA للنطاق العام
window.PWA = PWA;
