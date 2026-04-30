// Interactive Learning Module - Coding Challenges
class LearningModule {
    constructor() {
        this.currentChallengeId = null;
        this.challenges = [];
        this.filteredChallenges = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCodeEditor();
        this.bindModalControls();
        this.loadChallenges();
    }

    setupEventListeners() {
        document.addEventListener('click', (event) => {
            const challengeCard = event.target.closest('.challenge-card');
            const startButton = event.target.closest('.start-challenge');
            const runButton = event.target.closest('#run-tests');
            const submitButton = event.target.closest('#submit-solution');

            if (challengeCard && !event.target.closest('button, a')) {
                this.selectChallenge(challengeCard.dataset.challengeId);
                this.openChallengeModal(challengeCard);
                return;
            }

            if (startButton && challengeCard) {
                event.preventDefault();
                this.selectChallenge(challengeCard.dataset.challengeId);
                this.openChallengeModal(challengeCard);
                return;
            }

            if (runButton) {
                event.preventDefault();
                this.runTests();
                return;
            }

            if (submitButton) {
                event.preventDefault();
                this.submitChallenge();
            }
        });

        const difficultyFilter = document.getElementById('difficulty-filter');
        const categoryFilter = document.getElementById('category-filter');
        const searchButton = document.getElementById('search-btn');

        if (difficultyFilter) {
            difficultyFilter.addEventListener('change', () => this.filterChallenges());
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterChallenges());
        }

        if (searchButton) {
            searchButton.addEventListener('click', () => this.filterChallenges());
        }
    }

    bindModalControls() {
        const modal = document.getElementById('challenge-modal');
        const closeButton = modal?.querySelector('.close');

        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeChallengeModal());
        }

        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    this.closeChallengeModal();
                }
            });
        }
    }

    setupCodeEditor() {
        const codeArea = document.getElementById('code-editor');
        if (codeArea) {
            codeArea.addEventListener('input', () => {
                this.highlightCode(codeArea.value);
            });
        }
    }

    async loadChallenges() {
        const container = document.getElementById('challenges-container');
        if (!container) return;

        try {
            const response = await fetch('/api/challenges', { credentials: 'include' });
            const challenges = await response.json();

            this.challenges = Array.isArray(challenges) ? challenges : [];
            this.filteredChallenges = [...this.challenges];
            this.renderChallenges(this.filteredChallenges);
        } catch (error) {
            console.error('[CHALLENGES LOAD ERROR]', error);
            container.innerHTML = '<div class="student-empty-state"><p>Failed to load challenges.</p></div>';
        }
    }

    renderChallenges(challenges) {
        const container = document.getElementById('challenges-container');
        if (!container) return;

        if (!challenges.length) {
            container.innerHTML = '<div class="student-empty-state"><p>No challenges available yet.</p></div>';
            return;
        }

        container.innerHTML = challenges.map((challenge) => this.renderChallengeCard(challenge)).join('');
    }

    renderChallengeCard(challenge) {
        const title = this.escapeHtml(challenge.title || 'Challenge');
        const description = this.escapeHtml(challenge.description || '');
        const difficulty = this.escapeHtml(challenge.difficulty || challenge.level || 'Beginner');
        const category = this.escapeHtml(challenge.category || 'general');
        const starterCode = this.escapeHtml(challenge.starter_code || '');

        return `
            <article class="student-card challenge-card" data-challenge-id="${challenge.id}" data-category="${category}" data-difficulty="${difficulty.toLowerCase()}" data-starter-code="${starterCode}">
                <div class="student-card__topline">
                    <h2>${title}</h2>
                    <span class="student-badge">${difficulty}</span>
                </div>
                <p class="challenge-description">${description}</p>
                <div class="challenge-stats">
                    <span class="stat">Real DB data</span>
                    <span class="stat">${this.escapeHtml(String(challenge.price_tier || 'free').toUpperCase())}</span>
                </div>
                <button class="btn-secondary start-challenge" type="button">Start challenge</button>
            </article>
        `;
    }

    openChallengeModal(card) {
        const modal = document.getElementById('challenge-modal');
        const title = card.querySelector('.student-card__topline h2')?.textContent || 'Challenge';
        const difficulty = card.querySelector('.student-badge')?.textContent || 'Beginner';
        const description = card.querySelector('.challenge-description')?.textContent || '';

        const modalTitle = document.getElementById('modal-challenge-title');
        const modalDifficulty = document.getElementById('modal-difficulty');
        const modalDescription = document.getElementById('modal-description');

        if (modalTitle) modalTitle.textContent = title;
        if (modalDifficulty) modalDifficulty.textContent = difficulty;
        if (modalDescription) modalDescription.textContent = description;

        if (modal) {
            modal.style.display = 'block';
        }

        const editor = document.getElementById('code-editor');
        if (editor && !editor.value.trim()) {
            editor.value = card.dataset.starterCode || this.getStarterCode(card.dataset.challengeId);
        }
    }

    closeChallengeModal() {
        const modal = document.getElementById('challenge-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    getStarterCode(challengeId) {
        const challenge = this.challenges.find((entry) => String(entry.id) === String(challengeId));
        return challenge?.starter_code || `default
{
    state_entry()
    {
        // Write your code here
    }
}`;
    }

    highlightCode(code) {
        return code;
    }

    selectChallenge(challengeId) {
        this.currentChallengeId = challengeId;

        document.querySelectorAll('.challenge-card').forEach((card) => {
            card.classList.remove('selected');
        });

        const selectedCard = document.querySelector(`[data-challenge-id="${challengeId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }

    filterChallenges() {
        const difficulty = document.getElementById('difficulty-filter')?.value || 'all';
        const category = document.getElementById('category-filter')?.value || 'all';

        this.filteredChallenges = this.challenges.filter((challenge) => {
            const challengeDifficulty = String(challenge.difficulty || challenge.level || '').toLowerCase();
            const challengeCategory = String(challenge.category || '').toLowerCase();
            const matchesDifficulty = difficulty === 'all' || challengeDifficulty.includes(difficulty);
            const matchesCategory = category === 'all' || challengeCategory.includes(category);
            return matchesDifficulty && matchesCategory;
        });

        this.renderChallenges(this.filteredChallenges);
    }

    runTests() {
        const code = document.getElementById('code-editor')?.value || '';
        const results = this.getTestResults(code);
        this.displayTestResults(results);
    }

    getTestResults(code) {
        const normalized = code.toLowerCase();
        if (String(this.currentChallengeId) === '1') {
            return [
                { passed: normalized.includes('llsay'), message: normalized.includes('llsay') ? '✓ Uses llSay' : '✗ Missing llSay' },
                { passed: normalized.includes('hello world'), message: normalized.includes('hello world') ? '✓ Outputs Hello World' : '✗ Missing Hello World text' }
            ];
        }

        if (String(this.currentChallengeId) === '2') {
            const ok = normalized.includes('llsetpos') || normalized.includes('llmovetotarget');
            return [{ passed: ok, message: ok ? '✓ Movement function detected' : '✗ Missing movement function' }];
        }

        return [{ passed: code.trim().length > 10, message: code.trim().length > 10 ? '✓ Code looks valid' : '✗ Code too short' }];
    }

    displayTestResults(results) {
        const container = document.getElementById('test-results');
        const list = document.getElementById('results-list');
        if (!container || !list) return;

        container.style.display = 'block';
        list.innerHTML = results.map((result) => `<div class="test-result-item ${result.passed ? 'passed' : 'failed'}">${result.message}</div>`).join('');
    }

    async submitChallenge() {
        if (!this.currentChallengeId) {
            this.showNotification('Please select a challenge first', 'error');
            return;
        }

        const code = document.getElementById('code-editor')?.value || '';
        if (!code.trim()) {
            this.showNotification('Please write some code before submitting', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/challenges/${this.currentChallengeId}/submit`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Challenge submitted successfully', 'success');
                this.displayTestResults(this.getTestResults(code));
            } else {
                this.showNotification(result.error || 'Submission failed', 'error');
            }
        } catch (error) {
            console.error('[CHALLENGE SUBMIT ERROR]', error);
            this.showNotification('Failed to submit challenge', 'error');
        }
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

        setTimeout(() => notification.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LearningModule();
});
