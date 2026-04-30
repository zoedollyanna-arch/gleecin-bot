// Script Library Module
class ScriptLibrary {
    constructor() {
        this.scripts = [];
        this.filteredScripts = [];
        this.currentPage = 1;
        this.pageSize = 9;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadScripts();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }

        const languageFilter = document.getElementById('language-filter');
        if (languageFilter) {
            languageFilter.addEventListener('change', () => this.applyFilters());
        }

        const applyFiltersButton = document.getElementById('apply-filters');
        if (applyFiltersButton) {
            applyFiltersButton.addEventListener('click', () => this.applyFilters());
        }

        document.addEventListener('click', (e) => {
            const copyButton = e.target.closest('.copy-code');
            const downloadButton = e.target.closest('.download-script');

            if (copyButton) {
                this.copyToClipboard(copyButton.dataset.scriptId);
            }

            if (downloadButton) {
                this.downloadScript(downloadButton.dataset.scriptId);
            }
        });
    }

    async loadScripts() {
        try {
            const params = new URLSearchParams(window.location.search);
            const category = params.get('category');

            let url = '/api/scripts';
            if (category) {
                url += `?category=${encodeURIComponent(category)}`;
            }

            const response = await fetch(url, { credentials: 'include' });
            const scripts = await response.json();

            this.scripts = Array.isArray(scripts) ? scripts : [];
            this.filteredScripts = [...this.scripts];
            this.displayScripts(this.filteredScripts);
        } catch (error) {
            console.error('Error loading scripts:', error);
            this.renderEmptyState('Failed to load scripts');
        }
    }

    displayScripts(scripts) {
        const container = document.getElementById('scripts-container');
        if (!container) return;

        if (!scripts.length) {
            this.renderEmptyState('No scripts available yet.');
            return;
        }

        this.filteredScripts = scripts;
        const pageItems = this.getPageItems(scripts);

        container.innerHTML = pageItems.map((script) => this.renderScriptCard(script)).join('');
        this.highlightCodeBlocks();
        this.renderPagination(scripts.length);
    }

    renderEmptyState(message) {
        const pagination = document.getElementById('pagination-container');
        if (pagination) pagination.innerHTML = '';

        const container = document.getElementById('scripts-container');
        if (!container) return;
        container.innerHTML = `<div class="empty-state"><p>${this.escapeHtml(message)}</p></div>`;
    }

    renderScriptCard(script) {
        const code = script.code || '';
        const language = (script.language || 'lsl').toLowerCase();
        const title = script.title || 'Untitled Script';
        const description = script.description || 'No description provided.';
        const category = script.category || 'general';
        const priceTier = script.price_tier || 'free';
        const tags = Array.isArray(script.tags) ? script.tags : [];
        const viewCount = Number(script.view_count || 0);
        const downloadCount = Number(script.download_count || 0);

        return `
            <article class="script-card" data-script-id="${script.id}" data-category="${this.escapeHtml(category)}" data-language="${this.escapeHtml(language)}">
                <div class="script-header">
                    <h3>${this.escapeHtml(title)}</h3>
                    <div class="script-meta">
                        <span class="language-badge ${this.escapeHtml(language)}">${this.escapeHtml(script.language || 'LSL')}</span>
                        <span class="tag beginner">${this.escapeHtml(category)}</span>
                        <span class="tier-badge ${this.escapeHtml(priceTier)}">${this.escapeHtml(priceTier.toUpperCase())}</span>
                    </div>
                </div>
                <p class="script-description">${this.escapeHtml(description)}</p>
                <div class="script-preview">
                    <pre><code class="language-${this.escapeHtml(language)}">${this.escapeHtml(code)}</code></pre>
                </div>
                <div class="script-stats">
                    <span class="stat">👁️ ${viewCount} views</span>
                    <span class="stat">⬇️ ${downloadCount} downloads</span>
                </div>
                <div class="script-actions">
                    <button class="btn-secondary copy-code" data-script-id="${script.id}">📋 Copy Code</button>
                    <button class="btn-primary download-script" data-script-id="${script.id}">📥 Download</button>
                </div>
                ${tags.length ? `<div class="script-tags">${tags.map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
            </article>
        `;
    }

    highlightCodeBlocks() {
        if (window.hljs) {
            document.querySelectorAll('pre code').forEach((block) => window.hljs.highlightElement(block));
        }
    }

    filterScripts(searchTerm) {
        this.currentPage = 1;
        this.applyFilters();
    }

    applyFilters() {
        this.currentPage = 1;
        const category = document.getElementById('category-filter')?.value || 'all';
        const language = document.getElementById('language-filter')?.value || 'all';
        const search = (document.getElementById('search-input')?.value || '').trim().toLowerCase();

        const filtered = this.scripts.filter((script) => {
            const scriptCategory = (script.category || 'general').toLowerCase();
            const scriptLanguage = (script.language || 'lsl').toLowerCase();
            const title = (script.title || '').toLowerCase();
            const description = (script.description || '').toLowerCase();
            const tags = Array.isArray(script.tags) ? script.tags.join(' ').toLowerCase() : '';

            const categoryMatch = category === 'all' || scriptCategory === category;
            const languageMatch = language === 'all' || scriptLanguage === language;
            const searchMatch = !search || title.includes(search) || description.includes(search) || tags.includes(search);

            return categoryMatch && languageMatch && searchMatch;
        });

        this.filteredScripts = filtered;
        this.currentPage = 1;
        this.displayScripts(filtered);
    }

    getPageItems(scripts) {
        const start = (this.currentPage - 1) * this.pageSize;
        return scripts.slice(start, start + this.pageSize);
    }

    renderPagination(totalCount) {
        const pagination = document.getElementById('pagination-container');
        if (!pagination) return;

        const totalPages = Math.max(1, Math.ceil(totalCount / this.pageSize));
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }

        const pageButtons = [];
        pageButtons.push(`<button class="pagination-btn" data-page="${Math.max(1, this.currentPage - 1)}" ${this.currentPage === 1 ? 'disabled' : ''}>← Prev</button>`);

        for (let page = 1; page <= totalPages; page += 1) {
            pageButtons.push(`<button class="pagination-btn ${page === this.currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`);
        }

        pageButtons.push(`<button class="pagination-btn" data-page="${Math.min(totalPages, this.currentPage + 1)}" ${this.currentPage === totalPages ? 'disabled' : ''}>Next →</button>`);

        pagination.innerHTML = pageButtons.join('');
        pagination.querySelectorAll('button[data-page]').forEach((button) => {
            button.addEventListener('click', (event) => {
                const page = Number(event.currentTarget.dataset.page);
                if (!page || page === this.currentPage) return;
                this.currentPage = page;
                this.displayScripts(this.filteredScripts);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    async copyToClipboard(scriptId) {
        const script = this.scripts.find((entry) => String(entry.id) === String(scriptId));
        if (!script) {
            this.showNotification('Script not found', 'error');
            return;
        }

        const code = script.code || '';
        if (!code.trim()) {
            this.showNotification('No script code available', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(code);
            this.showNotification('Code copied to clipboard!', 'success');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            this.showNotification('Failed to copy code', 'error');
        }
    }

    async downloadScript(scriptId) {
        const script = this.scripts.find((entry) => String(entry.id) === String(scriptId));
        if (!script) {
            this.showNotification('Script not found', 'error');
            return;
        }

        const code = script.code || '';
        const title = (script.title || 'script').replace(/\s+/g, '-').toLowerCase();
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title}.lsl`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }

    escapeHtml(text) {
        const value = String(text ?? '');
        const div = document.createElement('div');
        div.textContent = value;
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
    new ScriptLibrary();
});
