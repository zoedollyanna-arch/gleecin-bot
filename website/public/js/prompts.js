// Prompts Library Module
class PromptsLibrary {
    constructor() {
        this.prompts = [];
        this.filteredPrompts = [];
        this.isAdmin = document.body?.dataset?.isAdmin === 'true';
        this.dom = this.getDom();
        this.init();
    }

    getDom() {
        return {
            container: document.getElementById('prompts-container'),
            search: document.getElementById('prompt-search'),
            category: document.getElementById('prompt-category-filter'),
            adminForm: document.getElementById('admin-prompt-form'),
            promptId: document.getElementById('prompt-id'),
            title: document.getElementById('prompt-title'),
            categoryInput: document.getElementById('prompt-category'),
            description: document.getElementById('prompt-description'),
            promptText: document.getElementById('prompt-text'),
            isPublic: document.getElementById('prompt-is-public'),
            saveButton: document.getElementById('prompt-save-button'),
            cancelButton: document.getElementById('prompt-cancel-button'),
            deleteButton: document.getElementById('prompt-delete-button')
        };
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
            const editButton = event.target.closest('[data-edit-prompt]');
            if (copyButton) {
                event.preventDefault();
                await this.copyPrompt(copyButton.getAttribute('data-copy-prompt'));
            }
            if (editButton && this.isAdmin) {
                event.preventDefault();
                this.startEdit(editButton.getAttribute('data-edit-prompt'));
            }
        });

        if (this.dom.adminForm) {
            this.dom.adminForm.addEventListener('submit', (event) => this.savePrompt(event));
        }

        if (this.dom.cancelButton) {
            this.dom.cancelButton.addEventListener('click', () => this.resetForm());
        }

        if (this.dom.deleteButton) {
            this.dom.deleteButton.addEventListener('click', () => this.deleteCurrentPrompt());
        }
    }

    async loadPrompts() {
        if (!this.dom.container) return;

        try {
            const response = await fetch('/api/prompts', { credentials: 'include' });
            const data = await response.json();
            this.prompts = Array.isArray(data) ? data : [];
            this.filteredPrompts = [...this.prompts];
            this.renderPrompts();
        } catch (error) {
            console.error('[PROMPTS ERROR]', error);
            this.dom.container.innerHTML = '<div class="student-empty-state"><p>Failed to load prompts.</p></div>';
        }
    }

    applyFilters() {
        const search = this.dom.search?.value?.trim().toLowerCase() || '';
        const category = this.dom.category?.value || 'all';

        this.filteredPrompts = this.prompts.filter((prompt) => {
            const matchesCategory = category === 'all' || String(prompt.category || '').toLowerCase() === category;
            const haystack = `${prompt.title || ''} ${prompt.category || ''} ${prompt.description || ''} ${prompt.prompt_text || ''}`.toLowerCase();
            const matchesSearch = !search || haystack.includes(search);
            return matchesCategory && matchesSearch;
        });

        this.renderPrompts();
    }

    renderPrompts() {
        if (!this.dom.container) return;

        if (!this.filteredPrompts.length) {
            this.dom.container.innerHTML = '<div class="student-empty-state"><p>No prompts match your filters.</p></div>';
            return;
        }

        this.dom.container.innerHTML = this.filteredPrompts.map((prompt) => this.renderPromptCard(prompt)).join('');
    }

    renderPromptCard(prompt) {
        const adminActions = this.isAdmin
            ? `<div class="student-card__actions">
                    <button class="btn-secondary" type="button" data-edit-prompt="${prompt.id}">Edit</button>
                    <button class="btn-secondary" type="button" data-copy-prompt="${prompt.id}">Copy</button>
               </div>`
            : `<div class="student-card__actions">
                    <button class="btn-primary" type="button" data-copy-prompt="${prompt.id}">Copy</button>
               </div>`;

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
                ${adminActions}
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

    startEdit(promptId) {
        const prompt = this.prompts.find((entry) => String(entry.id) === String(promptId));
        if (!prompt || !this.isAdmin) return;

        this.dom.promptId.value = prompt.id;
        this.dom.title.value = prompt.title || '';
        this.dom.categoryInput.value = prompt.category || '';
        this.dom.description.value = prompt.description || '';
        this.dom.promptText.value = prompt.prompt_text || '';
        this.dom.isPublic.value = prompt.is_public ? 'true' : 'false';
        this.dom.saveButton.textContent = 'Update prompt';
        this.dom.deleteButton.disabled = false;
        this.dom.deleteButton.dataset.promptId = prompt.id;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    resetForm() {
        if (!this.isAdmin || !this.dom.adminForm) return;
        this.dom.adminForm.reset();
        this.dom.promptId.value = '';
        this.dom.saveButton.textContent = 'Create prompt';
        delete this.dom.deleteButton.dataset.promptId;
    }

    async savePrompt(event) {
        event.preventDefault();
        if (!this.isAdmin) return;

        const payload = {
            title: this.dom.title.value,
            category: this.dom.categoryInput.value,
            description: this.dom.description.value,
            prompt_text: this.dom.promptText.value,
            is_public: this.dom.isPublic.value
        };

        const promptId = this.dom.promptId.value.trim();
        const method = promptId ? 'PUT' : 'POST';
        const url = promptId ? `/api/prompts/${promptId}` : '/api/prompts';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const json = await response.json();

            if (!response.ok || !json.success) {
                throw new Error(json.error || 'Failed to save prompt');
            }

            this.showNotification(promptId ? 'Prompt updated' : 'Prompt created', 'success');
            this.resetForm();
            await this.loadPrompts();
        } catch (error) {
            console.error('[PROMPT SAVE ERROR]', error);
            this.showNotification(error.message || 'Failed to save prompt', 'error');
        }
    }

    async deleteCurrentPrompt() {
        if (!this.isAdmin) return;
        const promptId = this.dom.deleteButton?.dataset?.promptId;
        if (!promptId) {
            this.showNotification('Select a prompt to delete', 'error');
            return;
        }

        if (!confirm('Delete this prompt permanently?')) return;

        try {
            const response = await fetch(`/api/prompts/${promptId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const json = await response.json();

            if (!response.ok || !json.success) {
                throw new Error(json.error || 'Failed to delete prompt');
            }

            this.showNotification('Prompt deleted', 'success');
            this.resetForm();
            await this.loadPrompts();
        } catch (error) {
            console.error('[PROMPT DELETE ERROR]', error);
            this.showNotification(error.message || 'Failed to delete prompt', 'error');
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
