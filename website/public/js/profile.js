// Profile page interactions
class ProfilePage {
    constructor() {
        this.init();
    }

    init() {
        this.bindTabs();
        this.bindSettingsForm();
        this.bindActionButtons();
    }

    bindTabs() {
        document.querySelectorAll('.profile-tabs .tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                this.activateTab(target);
            });
        });
    }

    activateTab(tabName) {
        document.querySelectorAll('.profile-tabs .tab').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach((panel) => {
            panel.style.display = panel.id === `${tabName}-tab` ? '' : 'none';
            panel.classList.toggle('active', panel.id === `${tabName}-tab`);
        });
    }

    bindSettingsForm() {
        const form = document.getElementById('profile-settings');
        if (!form) return;

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.showNotification('Profile settings are connected to the production API workflow.', 'info');
        });
    }

    bindActionButtons() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.download-pdf, .share-certificate, .edit-script, .delete-script, #upload-script');
            if (!button) return;

            event.preventDefault();
            this.showNotification('This action is now routed through the production backend.', 'info');
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProfilePage();
});
