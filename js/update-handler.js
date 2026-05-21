// =====================================================
// مدير التحديثات
// =====================================================

const UpdateManager = {
    init: function() {
        console.log('🔄 Update Manager initialized');
        this.checkForUpdates();
        setInterval(() => this.checkForUpdates(), 30 * 60 * 1000);
    },
    
    checkForUpdates: async function() {
        try {
            const response = await fetch('/Encyclopedia-of-Herbal-Medicine/version.json?t=' + Date.now());
            const newVersion = await response.json();
            
            const cached = localStorage.getItem('herbal_version');
            if (cached !== newVersion.hash) {
                console.log('🆕 Update available:', newVersion.version);
                this.showUpdateNotification(newVersion);
                localStorage.setItem('herbal_version', newVersion.hash);
            }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    },
    
    showUpdateNotification: function(version) {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="position:fixed;bottom:80px;left:20px;right:20px;background:#2e7d32;color:white;padding:12px 20px;border-radius:60px;z-index:10001;display:flex;justify-content:space-between;align-items:center;direction:rtl;">
                <span>🔄 تحديث جديد متاح (${version.version})</span>
                <button id="updateNowBtn" style="background:#ffd700;color:#1b5e20;border:none;padding:6px 16px;border-radius:40px;cursor:pointer;">تحديث</button>
            </div>
        `;
        document.body.appendChild(notification);
        
        document.getElementById('updateNowBtn')?.addEventListener('click', () => {
            window.location.reload();
        });
        
        setTimeout(() => notification.remove(), 15000);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UpdateManager.init());
} else {
    UpdateManager.init();
}

window.UpdateManager = UpdateManager;
