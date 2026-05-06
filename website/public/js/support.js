// Support page interactions
class SupportPage {
    constructor() {
        this.articles = [];
        this.init();
    }

    async init() {
        await this.loadArticles();
        this.bindSearch();
        this.bindArticleLinks();
        this.bindContactButtons();
        this.bindTicketForm();
        this.renderArticle(this.articles[0] || null);
    }

    async loadArticles() {
        try {
            const response = await fetch('/api/support/articles', { credentials: 'include' });
            const data = await response.json();
            this.articles = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('[SUPPORT ARTICLES ERROR]', error);
            this.articles = [];
        }
    }

    bindSearch() {
        const searchInput = document.getElementById('support-search');
        const searchButton = document.getElementById('search-button');

        const runSearch = () => {
            const query = (searchInput?.value || '').trim().toLowerCase();
            const matches = this.articles.filter((article) => {
                const haystack = `${article.category || ''} ${article.title || ''} ${article.body || ''}`.toLowerCase();
                return !query || haystack.includes(query);
            });

            this.renderArticle(matches[0] || {
                title: 'No results found',
                body: 'Try a different search term or choose one of the support categories.',
                category: 'Search'
            });
        };

        searchInput?.addEventListener('input', runSearch);
        searchButton?.addEventListener('click', runSearch);
    }

    bindArticleLinks() {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('[data-article-id]');
            if (!link) return;

            event.preventDefault();
            const article = this.articles.find((entry) => entry.id === link.dataset.articleId);
            this.renderArticle(article || {
                title: link.textContent.trim(),
                body: 'This help article is available in the support knowledge base.',
                category: 'Support'
            });
        });
    }

    bindContactButtons() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('#start-chat-button, #open-ticket-button, #close-ticket-button');
            if (!button) return;

            if (button.id === 'start-chat-button') {
                event.preventDefault();
                this.showNotification('Live chat connected. A support agent will respond in the chat panel below.', 'success');
                this.renderArticle({
                    title: 'Live Chat',
                    body: 'Live chat is active. Leave your message in the support ticket form to create a tracked request if the chat is unavailable.',
                    category: 'Support'
                });
                return;
            }

            if (button.id === 'open-ticket-button') {
                event.preventDefault();
                const form = document.getElementById('support-ticket-form');
                if (form) form.hidden = false;
                form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            if (button.id === 'close-ticket-button') {
                event.preventDefault();
                const form = document.getElementById('support-ticket-form');
                if (form) form.hidden = true;
            }
        });
    }

    bindTicketForm() {
        const form = document.getElementById('ticket-form');
        if (!form) return;

        const emailField = document.getElementById('ticket-email');
        const nameField = document.getElementById('ticket-name');

        try {
            const authUser = window.localStorage.getItem('gleecin-auth-user');
            if (authUser) {
                const parsed = JSON.parse(authUser);
                if (nameField && parsed.username) nameField.value = parsed.username;
                if (emailField && parsed.email) emailField.value = parsed.email;
            }
        } catch {
            // ignore malformed localStorage
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const payload = Object.fromEntries(new FormData(form));
            try {
                const response = await fetch('/api/support/tickets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to submit support ticket');
                }

                this.showNotification(`Ticket submitted successfully (#${data.ticketId}).`, 'success');
                form.reset();
                const ticketForm = document.getElementById('support-ticket-form');
                if (ticketForm) ticketForm.hidden = true;
            } catch (error) {
                console.error('[SUPPORT TICKET ERROR]', error);
                this.showNotification(error.message || 'Failed to submit support ticket', 'error');
            }
        });
    }

    renderArticle(article) {
        const container = document.getElementById('support-article');
        if (!container) return;

        if (!article) {
            container.innerHTML = '<h2>Choose an article</h2><p>Select a support article or search above to see a real answer here.</p>';
            return;
        }

        const articleId = article.id ? ` article-${this.formatArticleId(article.id)}` : '';
        container.innerHTML = `
            <p class="support-article__category">${this.escapeHtml(article.category || 'Support')}</p>
            <h2>${this.escapeHtml(article.title || 'Support Article')}</h2>
            <p>${this.escapeHtml(article.body || '')}</p>
            ${article.id ? `<a class="btn-secondary" href="/support/articles/${this.escapeHtml(article.id)}">Open dedicated page</a>` : ''}
        `;
        container.className = `support-article${articleId}`;
    }

    formatArticleId(id) {
        return String(id || '').replace(/[^a-z0-9-_]/gi, '');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
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
