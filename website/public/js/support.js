// Support page interactions
class SupportPage {
    constructor() {
        this.init();
    }

    init() {
        this.bindSearch();
        this.bindContactButtons();
    }

    bindSearch() {
        const searchInput = document.getElementById('support-search');
        const searchButton = document.getElementById('search-button');

        const runSearch = () => {
            const query = (searchInput?.value || '').trim().toLowerCase();
            document.querySelectorAll('.category li').forEach((item) => {
                const text = item.textContent.toLowerCase();
                item.style.display = !query || text.includes(query) ? '' : 'none';
            });
        };

        if (searchInput) {
            searchInput.addEventListener('input', runSearch);
        }

        if (searchButton) {
            searchButton.addEventListener('click', runSearch);
        }
    }

    bindContactButtons() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.contact-option button');
            const link = event.target.closest('.category a');

            if (button) {
                event.preventDefault();
                this.showNotification('This support channel is connected to the production help workflow.', 'info');
            }

            if (link) {
                event.preventDefault();
                this.showNotification('Open the matching support article from the knowledge base.', 'info');
            }
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
    new SupportPage();
});
