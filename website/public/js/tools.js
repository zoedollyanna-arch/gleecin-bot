// Tools and setup page interactions
class ToolsPage {
    constructor() {
        this.init();
    }

    init() {
        this.bindGuides();
        this.bindQuickStart();
    }

    bindGuides() {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('.tool-card a, .guide a');
            const button = event.target.closest('.quick-setup button');
            if (!link && !button) return;

            event.preventDefault();
            this.showNotification('This guide is available in the production knowledge base workflow.', 'info');
        });
    }

    bindQuickStart() {
        const checklist = document.querySelector('.quick-setup ol');
        if (checklist) {
            checklist.classList.add('interactive-element');
        }
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
    new ToolsPage();
});
