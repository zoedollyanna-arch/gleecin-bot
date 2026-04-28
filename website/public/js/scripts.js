// Script Library Module
class ScriptLibrary {
    constructor() {
        this.scripts = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadScripts();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('script-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterScripts(e.target.value);
            });
        }

        // Filter by category
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterByCategory(e.target.value);
            });
        }

        // Filter by language
        const languageFilter = document.getElementById('language-filter');
        if (languageFilter) {
            languageFilter.addEventListener('change', (e) => {
                this.filterByLanguage(e.target.value);
            });
        }

        // Copy to clipboard buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-button')) {
                this.copyToClipboard(e.target.dataset.scriptId);
            }
        });
    }

    async loadScripts() {
        try {
            const params = new URLSearchParams(window.location.search);
            const category = params.get('category') || '';
            
            let url = '/api/scripts';
            if (category) {
                url += `?category=${encodeURIComponent(category)}`;
            }
            
            const response = await fetch(url);
            this.scripts = await response.json();
            
            this.displayScripts(this.scripts);
        } catch (error) {
            console.error('Error loading scripts:', error);
            this.showNotification('Failed to load scripts', 'error');
        }
    }

    displayScripts(scripts) {
        const container = document.getElementById('scripts-container');
        if (!container) return;

        if (scripts.length === 0) {
            container.innerHTML = '<p>No scripts found.</p>';
            return;
        }

        container.innerHTML = scripts.map(script => this.renderScriptCard(script)).join('');
        
        // Apply syntax highlighting to all code blocks
        this.applySyntaxHighlighting();
    }

    renderScriptCard(script) {
        return `
            <div class="script-card" data-script-id="${script.id}" data-category="${script.category}" data-language="${script.language}">
                <div class="script-header">
                    <h2>${this.escapeHtml(script.name)}</h2>
                    <span class="language-badge ${script.language.toLowerCase()}">${script.language}</span>
                </div>
                <p class="script-description">${this.escapeHtml(script.description)}</p>
                <div class="code-display" id="code-${script.id}">${this.escapeHtml(script.code)}</div>
                <button class="copy-button" data-script-id="${script.id}">Copy Code</button>
                <div class="script-stats">
                    <span>👁️ ${script.view_count} views</span>
                    <span>⬇️ ${script.download_count} downloads</span>
                    <span>⭐ ${script.rating}</span>
                </div>
                <div class="script-tags">
                    ${script.tags ? script.tags.split(',').map(tag => `<span class="tag">${this.escapeHtml(tag.trim())}</span>`).join('') : ''}
                </div>
            </div>
        `;
    }

    applySyntaxHighlighting() {
        // Simple syntax highlighting for LSL/JavaScript
        document.querySelectorAll('.code-display').forEach(block => {
            const code = block.textContent;
            const highlighted = this.highlightCode(code);
            block.innerHTML = highlighted;
        });
    }

    highlightCode(code) {
        if (!code) return '';

        // Detect language (simplified)
        const isLSL = code.includes('llSay') || code.includes('default') || code.includes('state');
        const isJS = code.includes('function') || code.includes('const') || code.includes('let');

        let highlighted = this.escapeHtml(code);

        if (isLSL) {
            // LSL keywords and functions
            const lslKeywords = ['default', 'state', 'if', 'else', 'while', 'for', 'do', 'integer', 'float', 'string', 'key', 'vector', 'rotation', 'list', 'event', 'return'];
            const lslFunctions = ['llSay', 'llWhisper', 'llShout', 'llOwnerSay', 'llSetPos', 'llGetPos', 'llSleep', 'llGiveMoney', 'llRegionSay', 'llInstantMessage'];
            
            lslKeywords.forEach(keyword => {
                const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
                highlighted = highlighted.replace(regex, '<span class="keyword">$1</span>');
            });

            lslFunctions.forEach(func => {
                const regex = new RegExp(`\\b(${func})\\b`, 'g');
                highlighted = highlighted.replace(regex, '<span class="function">$1</span>');
            });
        } else if (isJS) {
            // JavaScript keywords and common functions
            const jsKeywords = ['function', 'const', 'let', 'var', 'if', 'else', 'while', 'for', 'return', 'class', 'import', 'export', 'async', 'await', 'try', 'catch', 'finally'];
            const jsFunctions = ['console.log', 'setTimeout', 'setInterval', 'fetch', 'JSON.parse', 'JSON.stringify'];
            
            jsKeywords.forEach(keyword => {
                const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
                highlighted = highlighted.replace(regex, '<span class="keyword">$1</span>');
            });

            jsFunctions.forEach(func => {
                const regex = new RegExp(`\\b(${func})\\b`, 'g');
                highlighted = highlighted.replace(regex, '<span class="function">$1</span>');
            });
        }

        // Strings
        highlighted = highlighted.replace(/(".*?"|'.*?')/g, '<span class="string">$1</span>');
        
        // Numbers
        highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
        
        // Comments
        highlighted = highlighted.replace(/(\/\/[^\n]*)/g, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');

        return highlighted;
    }

    filterScripts(searchTerm) {
        const filtered = this.scripts.filter(script => 
            script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            script.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (script.tags && script.tags.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.displayScripts(filtered);
    }

    filterByCategory(category) {
        const filtered = category === 'all' 
            ? this.scripts 
            : this.scripts.filter(script => script.category === category);
        this.displayScripts(filtered);
    }

    filterByLanguage(language) {
        const filtered = language === 'all' 
            ? this.scripts 
            : this.scripts.filter(script => script.language === language);
        this.displayScripts(filtered);
    }

    async copyToClipboard(scriptId) {
        try {
            const script = this.scripts.find(s => s.id == scriptId);
            if (script) {
                await navigator.clipboard.writeText(script.code);
                this.showNotification('Code copied to clipboard!', 'success');
                
                // Update download count
                await this.updateDownloadCount(scriptId);
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            this.showNotification('Failed to copy code', 'error');
        }
    }

    async updateDownloadCount(scriptId) {
        try {
            await fetch(`/api/scripts/${scriptId}/download`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error updating download count:', error);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScriptLibrary();
});