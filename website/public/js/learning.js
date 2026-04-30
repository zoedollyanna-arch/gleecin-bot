// Interactive Learning Module - Coding Challenges
class LearningModule {
    constructor() {
        this.currentChallengeId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCodeEditor();
        this.bindModalControls();
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

    openChallengeModal(card) {
        const modal = document.getElementById('challenge-modal');
        const title = card.querySelector('.challenge-header h3')?.textContent || 'Challenge';
        const difficulty = card.querySelector('.difficulty')?.textContent || 'Beginner';
        const description = card.querySelector('.challenge-description')?.textContent || '';

        document.getElementById('modal-challenge-title').textContent = title;
        document.getElementById('modal-difficulty').textContent = difficulty;
        document.getElementById('modal-description').textContent = description;

        if (modal) {
            modal.style.display = 'block';
        }

        const editor = document.getElementById('code-editor');
        if (editor && !editor.value.trim()) {
            editor.value = this.getStarterCode(card.dataset.challengeId);
        }
    }

    closeChallengeModal() {
        const modal = document.getElementById('challenge-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    getStarterCode(challengeId) {
        if (String(challengeId) === '1') {
            return `default
{
    state_entry()
    {
        llSay(0, "Hello World");
    }
}`;
        }

        if (String(challengeId) === '2') {
            return `default
{
    touch_start(integer total_number)
    {
        llSetPos(llGetPos() + <0.0, 0.0, 1.0>);
    }
}`;
        }

        return `default
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

        document.querySelectorAll('.challenge-card').forEach(card => {
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

        document.querySelectorAll('.challenge-card').forEach((card) => {
            const cardDifficulty = card.querySelector('.difficulty')?.textContent?.toLowerCase() || '';
            const cardCategory = card.dataset.category || '';
            const matchesDifficulty = difficulty === 'all' || cardDifficulty.includes(difficulty);
            const matchesCategory = category === 'all' || cardCategory.includes(category);
            card.style.display = matchesDifficulty && matchesCategory ? '' : 'none';
        });
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
        list.innerHTML = results.map(result => `<div class="test-result-item ${result.passed ? 'passed' : 'failed'}">${result.message}</div>`).join('');
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
            this.showNotification('Failed to submit challenge', 'error');
        }
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
