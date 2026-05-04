// Prompts Library Module
class PromptsLibrary {
    constructor() {
        this.prompts = [];
        this.filteredPrompts = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPrompts();
    }

    bindEvents() {
        document.addEventListener('input', (event) => {
            if (event.target.id === 'prompt-search' || event.target.id === 'prompt-category-filter') {
                this.applyFilters();
            }
        });

        document.addEventListener('click', async (event) => {
            const copyButton = event.target.closest('[data-copy-prompt]');
            if (copyButton) {
                event.preventDefault();
                await this.copyPrompt(copyButton.getAttribute('data-copy-prompt'));
            }
        });
    }

    async loadPrompts() {
        const container = document.getElementById('prompts-container');
        if (!container) return;

        try {
            const response = await fetch('/api/prompts', { credentials: 'include' });
            const data = await response.json();
            this.prompts = Array.isArray(data) ? data : [];
            this.filteredPrompts = [...this.prompts];
            this.renderPrompts();
        } catch (error) {
            console.error('[PROMPTS ERROR]', error);
            container.innerHTML = '<div class="student-empty-state"><p>Failed to load prompts.</p></div>';
        }
    }

    applyFilters() {
        const search = document.getElementById('prompt-search')?.value?.trim().toLowerCase() || '';
        const category = document.getElementById('prompt-category-filter')?.value || 'all';

        this.filteredPrompts = this.prompts.filter((prompt) => {
            const matchesCategory = category === 'all' || String(prompt.category || '').toLowerCase() === category;
            const haystack = `${prompt.title || ''} ${prompt.category || ''} ${prompt.description || ''} ${prompt.prompt_text || ''}`.toLowerCase();
            const matchesSearch = !search || haystack.includes(search);
            return matchesCategory && matchesSearch;
        });

        this.renderPrompts();
    }

    renderPrompts() {
        const container = document.getElementById('prompts-container');
        if (!container) return;

        if (!this.filteredPrompts.length) {
            container.innerHTML = '<div class="student-empty-state"><p>No prompts match your filters.</p></div>';
            return;
        }

        container.innerHTML = this.filteredPrompts.map((prompt) => this.renderPromptCard(prompt)).join('');
    }

    renderPromptCard(prompt) {
        return `
            <article class="student-card prompt-card" data-prompt-id="${prompt.id}">
                <div class="student-card__topline">
                    <div>
                        <h3>${this.escapeHtml(prompt.title || 'Prompt')}</h3>
                        <p class="prompt-category">${this.escapeHtml(prompt.category || 'general')}</p>
                    </div>
                    <span class="student-badge student-badge--muted">${prompt.is_public ? 'Public' : 'Private'}</span>
                </div>

                <p class="prompt-description">${this.escapeHtml(prompt.description || '')}</p>
                <pre class="prompt-text">${this.escapeHtml(prompt.prompt_text || '')}</pre>

                <div class="student-card__actions">
                    <button class="btn-primary" type="button" data-copy-prompt="${prompt.id}">Copy</button>
                </div>
            </article>
        `;
    }

    async copyPrompt(promptId) {
        const prompt = this.prompts.find((entry) => String(entry.id) === String(promptId));
        if (!prompt) {
            this.showNotification('Prompt not found', 'error');
            return;
        }

        const text = [prompt.title, prompt.description, prompt.prompt_text].filter(Boolean).join('\n\n');
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Prompt copied to clipboard', 'success');
        } catch (error) {
            console.error('[COPY PROMPT ERROR]', error);
            this.showNotification('Failed to copy prompt', 'error');
        }
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
    new PromptsLibrary();
});
