// Interactive Learning Module - Coding Challenges
class LearningModule {
    constructor() {
        this.currentChallengeId = null;
        this.editor = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadChallenges();
        this.setupCodeEditor();
    }

    setupEventListeners() {
        // Challenge selection
        document.querySelectorAll('.challenge-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('submit-challenge')) {
                    this.selectChallenge(card.dataset.challengeId);
                }
            });
        });

        // Submit challenge button
        document.querySelectorAll('.submit-challenge').forEach(button => {
            button.addEventListener('click', () => {
                this.submitChallenge();
            });
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.filterChallenges(button.dataset.difficulty);
            });
        });
    }

    setupCodeEditor() {
        const codeArea = document.getElementById('code-editor');
        if (codeArea) {
            // Simple code highlighting for LSL
            codeArea.addEventListener('input', () => {
                this.highlightCode(codeArea.value);
            });
        }
    }

    highlightCode(code) {
        // Simple syntax highlighting for LSL
        const keywords = ['default', 'state', 'if', 'else', 'while', 'for', 'integer', 'float', 'string', 'key', 'vector', 'rotation', 'list'];
        const functions = ['llSay', 'llWhisper', 'llShout', 'llSetPos', 'llGetPos', 'llSleep', 'llOwnerSay'];
        
        let highlighted = code
            .replace(/(\/\/[^\n]*)/g, '<span class="comment">$1</span>')
            .replace(/(".*?")/g, '<span class="string">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');

        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
            highlighted = highlighted.replace(regex, '<span class="keyword">$1</span>');
        });

        functions.forEach(func => {
            const regex = new RegExp(`\\b(${func})\\b`, 'g');
            highlighted = highlighted.replace(regex, '<span class="function">$1</span>');
        });

        // Update display (if we had a display area)
        // This is simplified - in a real implementation, you'd have a separate display div
    }

    async loadChallenges() {
        try {
            const response = await fetch('/api/challenges');
            const challenges = await response.json();
            
            const container = document.getElementById('challenges-container');
            if (container) {
                container.innerHTML = challenges.map(challenge => this.renderChallengeCard(challenge)).join('');
                this.setupEventListeners(); // Rebind events for new elements
            }
        } catch (error) {
            console.error('Error loading challenges:', error);
            this.showNotification('Failed to load challenges', 'error');
        }
    }

    selectChallenge(challengeId) {
        this.currentChallengeId = challengeId;
        
        // Highlight selected challenge
        document.querySelectorAll('.challenge-card').forEach(card => {
            card.classList.remove('selected');
        });
        const selectedCard = document.querySelector(`[data-challenge-id="${challengeId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            
            // Load challenge details
            this.loadChallengeDetails(challengeId);
        }
    }

    async loadChallengeDetails(challengeId) {
        try {
            const response = await fetch(`/api/challenges/${challengeId}`);
            const challenge = await response.json();
            
            // Update editor with starter code
            const editor = document.getElementById('code-editor');
            if (editor) {
                editor.value = challenge.starter_code || '// Write your code here';
            }
            
            // Display test cases
            this.displayTestCases(challenge.testCases);
            
        } catch (error) {
            console.error('Error loading challenge details:', error);
            this.showNotification('Failed to load challenge details', 'error');
        }
    }

    displayTestCases(testCases) {
        const container = document.getElementById('test-cases-container');
        if (container) {
            container.innerHTML = `
                <h3>Test Cases</h3>
                ${testCases.map((testCase, index) => `
                    <div class="test-case-item">
                        <strong>Test ${index + 1}:</strong> Input: ${JSON.stringify(testCase.input)}
                        ${testCase.hidden ? '(Hidden)' : `Expected: ${testCase.expected}`}
                    </div>
                `).join('')}
            `;
        }
    }

    async submitChallenge() {
        if (!this.currentChallengeId) {
            this.showNotification('Please select a challenge first', 'error');
            return;
        }

        const code = document.getElementById('code-editor')?.value;
        if (!code) {
            this.showNotification('Please write some code before submitting', 'error');
            return;
        }

        try {
            const response = await fetch('/api/challenges/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    challengeId: this.currentChallengeId,
                    code: code
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayTestResults(result.results);
                this.updateProgressStats(result.passedTests, result.totalTests);
                
                if (result.isCorrect) {
                    this.showNotification('Congratulations! All tests passed!', 'success');
                } else {
                    this.showNotification(`Tests passed: ${result.passedTests}/${result.totalTests}`, 'info');
                }
            } else {
                this.showNotification('Submission failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error submitting challenge:', error);
            this.showNotification('Failed to submit challenge', 'error');
        }
    }

    displayTestResults(results) {
        const container = document.getElementById('test-results');
        if (container) {
            container.innerHTML = results.map(result => `
                <div class="test-result-item ${result.passed ? 'passed' : 'failed'}">
                    <span>${result.message}</span>
                    <span>${result.passed ? '✓' : '✗'}</span>
                </div>
            `).join('');
        }
    }

    updateProgressStats(passed, total) {
        // Update progress stats if they exist
        const passedElement = document.getElementById('passed-tests');
        const totalElement = document.getElementById('total-tests');
        
        if (passedElement) passedElement.textContent = passed;
        if (totalElement) totalElement.textContent = total;
    }

    filterChallenges(difficulty) {
        // Filter challenges by difficulty
        document.querySelectorAll('.challenge-card').forEach(card => {
            if (difficulty === 'all' || card.dataset.difficulty === difficulty) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
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
    new LearningModule();
});