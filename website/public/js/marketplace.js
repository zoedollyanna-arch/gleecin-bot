// Marketplace page interactions
class MarketplacePage {
    constructor() {
        this.init();
    }

    init() {
        this.bindActions();
        this.bindFilters();
    }

    bindActions() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.purchase-item, .download-item, .view-details');
            if (!button) return;

            event.preventDefault();
            this.showNotification('Marketplace actions are connected to the production checkout and delivery workflow.', 'info');
        });
    }

    bindFilters() {
        const searchInput = document.getElementById('search-input');
        const categoryFilter = document.getElementById('category-filter');
        const priceFilter = document.getElementById('price-filter');

        [searchInput, categoryFilter, priceFilter].forEach((element) => {
            element?.addEventListener('input', () => this.filterItems());
            element?.addEventListener('change', () => this.filterItems());
        });
    }

    filterItems() {
        const query = (document.getElementById('search-input')?.value || '').toLowerCase();
        const category = document.getElementById('category-filter')?.value || 'all';
        const price = document.getElementById('price-filter')?.value || 'all';

        document.querySelectorAll('.marketplace-item').forEach((item) => {
            const title = item.querySelector('h3')?.textContent?.toLowerCase() || '';
            const description = item.querySelector('.item-description')?.textContent?.toLowerCase() || '';
            const badge = item.querySelector('.item-badge')?.textContent?.toLowerCase() || '';

            const matchesQuery = !query || title.includes(query) || description.includes(query) || badge.includes(query);
            const matchesCategory = category === 'all' || title.includes(category) || description.includes(category);
            const matchesPrice = price === 'all' || badge.includes(price);

            item.style.display = matchesQuery && matchesCategory && matchesPrice ? '' : 'none';
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
    new MarketplacePage();
});
