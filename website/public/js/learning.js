// Interactive Learning Module - Full learner flow
class LearningModule {
    constructor() {
        this.questions = [];
        this.filteredQuestions = [];
        this.progress = {
            total_questions: 0,
            completed_questions: 0,
            correct_answers: 0,
            progress_percent: 0,
            accuracy: 0
        };
        this.certificateData = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadAll();
    }

    bindEvents() {
        document.addEventListener('click', (event) => {
            const submitButton = event.target.closest('[data-submit-answer]');
            const toggleButton = event.target.closest('[data-boolean-value]');
            const refreshButton = event.target.closest('#refresh-learning');

            if (submitButton) {
                event.preventDefault();
                const questionId = submitButton.getAttribute('data-submit-answer');
                this.submitAnswer(questionId);
                return;
            }

            if (toggleButton) {
                event.preventDefault();
                const group = toggleButton.getAttribute('data-toggle-group');
                const value = toggleButton.getAttribute('data-boolean-value');
                this.setBooleanValue(group, value);
                return;
            }

            if (refreshButton) {
                event.preventDefault();
                this.loadAll();
            }
        });

        document.addEventListener('input', (event) => {
            if (event.target.id === 'search-filter' || event.target.id === 'type-filter') {
                this.filterQuestions();
            }
        });
    }

    async loadAll() {
        this.setStatus('Loading questions...');
        await Promise.all([
            this.loadQuestions(),
            this.loadProgress(),
            this.loadCertificates()
        ]);
        this.setStatus('');
    }

    async loadQuestions() {
        const container = document.getElementById('questions-container');
        if (!container) return;

        try {
            const response = await fetch('/api/learning/questions?preview=1', {
                credentials: 'include'
            });
            const data = await response.json();
            this.questions = Array.isArray(data) ? data : [];
            this.filteredQuestions = [...this.questions];
            this.renderQuestions();
        } catch (error) {
            console.error('[LEARNING QUESTIONS ERROR]', error);
            container.innerHTML = '<div class="student-empty-state"><p>Failed to load questions.</p></div>';
        }
    }

    async loadProgress() {
        try {
            const response = await fetch('/api/progress?preview=1', {
                credentials: 'include'
            });
            const data = await response.json();
            this.progress = {
                total_questions: data.total_questions || 0,
                completed_questions: data.completed_questions || 0,
                correct_answers: data.correct_answers || 0,
                progress_percent: data.progress_percent || 0,
                accuracy: data.accuracy || 0
            };
            this.renderProgress();
        } catch (error) {
            console.error('[PROGRESS ERROR]', error);
        }
    }

    async loadCertificates() {
        const summary = document.getElementById('certificate-summary');
        const list = document.getElementById('certificate-list');
        if (!summary || !list) return;

        try {
            const response = await fetch('/api/certificate?preview=1', {
                credentials: 'include'
            });
            const data = await response.json();
            const certificates = Array.isArray(data.certificates) ? data.certificates : [];
            this.certificateData = certificates;

            if (!certificates.length) {
                summary.innerHTML = '<p>No certificate has been issued yet.</p>';
                list.innerHTML = '';
                return;
            }

            summary.innerHTML = `<p>${certificates.length} certificate(s) issued.</p>`;
            list.innerHTML = certificates.map((certificate) => this.renderCertificateCard(certificate)).join('');
        } catch (error) {
            console.error('[CERTIFICATE LOAD ERROR]', error);
            summary.innerHTML = '<p>Failed to load certificate data.</p>';
        }
    }

    renderProgress() {
        const total = document.getElementById('progress-total');
        const completed = document.getElementById('progress-completed');
        const accuracy = document.getElementById('progress-accuracy');
        const bar = document.getElementById('progress-bar-fill');
        const label = document.getElementById('progress-label');

        if (total) total.textContent = String(this.progress.total_questions || 0);
        if (completed) completed.textContent = String(this.progress.completed_questions || 0);
        if (accuracy) accuracy.textContent = `${this.progress.accuracy || 0}%`;
        if (bar) bar.style.width = `${this.progress.progress_percent || 0}%`;
        if (label) label.textContent = `Progress ${this.progress.progress_percent || 0}%`;
    }

    renderQuestions() {
        const container = document.getElementById('questions-container');
        if (!container) return;

        if (!this.filteredQuestions.length) {
            container.innerHTML = '<div class="student-empty-state"><p>No questions match your filter.</p></div>';
            return;
        }

        container.innerHTML = this.filteredQuestions.map((question) => this.renderQuestionCard(question)).join('');
        this.restoreBooleanSelections();
    }

    renderQuestionCard(question) {
        const type = this.escapeHtml(question.question_type || 'multiple_choice');
        const title = this.escapeHtml(question.quiz_title || 'Learning Question');
        const questionText = this.escapeHtml(question.question_text || '');
        const options = Array.isArray(question.options) ? question.options : this.parseOptions(question.options);
        const hasOptions = Array.isArray(options) && options.length > 0;

        return `
            <article class="student-card learning-question" data-question-id="${question.id}" data-question-type="${type}">
                <div class="student-card__topline">
                    <div>
                        <h2>${title}</h2>
                        <p class="question-type-label">${this.formatQuestionType(type)}</p>
                    </div>
                    <span class="student-badge student-badge--muted">Ready</span>
                </div>

                <p class="question-text">${questionText}</p>

                <div class="question-input">
                    ${this.renderInput(question, options)}
                </div>

                <div class="question-actions">
                    <button class="btn-primary" type="button" data-submit-answer="${question.id}">Submit Answer</button>
                </div>

                <div class="submission-state" id="submission-state-${question.id}" aria-live="polite" data-feedback-hidden="true"></div>

                ${!hasOptions && type === 'multiple_choice' ? '<div class="question-feedback question-feedback--warning">This question is missing answer options.</div>' : ''}
            </article>
        `;
    }

    renderInput(question, options) {
        const type = question.question_type || 'multiple_choice';

        if (type === 'multiple_choice') {
            if (!Array.isArray(options) || options.length === 0) {
                return `
                    <div class="student-empty-state">
                        <p>Answer options are not available for this question yet.</p>
                    </div>
                `;
            }

            return `
                <fieldset class="answer-options">
                    <legend class="sr-only">Select one answer</legend>
                    ${options.map((option, index) => `
                        <label class="answer-option">
                            <input type="radio" name="answer-${question.id}" value="${this.escapeAttribute(option)}" ${index === 0 ? 'data-default-answer="true"' : ''}>
                            <span>${this.escapeHtml(option)}</span>
                        </label>
                    `).join('')}
                </fieldset>
            `;
        }

        if (type === 'true_false') {
            return `
                <div class="boolean-toggle" data-toggle-group="answer-${question.id}">
                    <button type="button" class="btn-secondary" data-boolean-value="True">True</button>
                    <button type="button" class="btn-secondary" data-boolean-value="False">False</button>
                </div>
                <input type="hidden" id="answer-${question.id}" value="">
            `;
        }

        if (type === 'fill_blank' || type === 'prediction') {
            return `
                <textarea id="answer-${question.id}" class="answer-textarea" rows="3" placeholder="Type your answer here..."></textarea>
            `;
        }

        if (type === 'debug' || type === 'challenge') {
            return `
                <textarea id="answer-${question.id}" class="code-editor answer-textarea" rows="8" placeholder="// Write or fix the code here..."></textarea>
            `;
        }

        return `
            <textarea id="answer-${question.id}" class="answer-textarea" rows="4" placeholder="Type your answer here..."></textarea>
        `;
    }

    async submitAnswer(questionId) {
        const question = this.questions.find((entry) => String(entry.id) === String(questionId));
        if (!question) {
            this.showSubmissionState(questionId, 'Question not found.', 'error');
            return;
        }

        const answer = this.collectAnswer(question);
        if (!String(answer).trim()) {
            this.showSubmissionState(questionId, 'Answer cannot be empty.', 'error');
            return;
        }

        const button = document.querySelector(`[data-submit-answer="${questionId}"]`);
        const previousText = button?.textContent || 'Submit Answer';

        if (button) {
            button.disabled = true;
            button.textContent = 'Submitting...';
        }

        this.showSubmissionState(questionId, 'Submitting answer...', 'info');

        try {
            const response = await fetch('/api/submit-answer?preview=1', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId,
                    answer
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Submission failed');
            }

            this.showSubmissionState(
                questionId,
                `${data.correct ? 'Correct' : 'Incorrect'} — ${data.feedback || ''} (Score: ${data.score || 0})`,
                data.correct ? 'success' : 'error'
            );

            const feedbackElement = document.getElementById(`submission-state-${questionId}`);
            if (feedbackElement) {
                feedbackElement.dataset.feedbackHidden = 'false';
            }

            this.progress = {
                total_questions: data.progress?.totalQuestions ?? this.progress.total_questions,
                completed_questions: data.progress?.completedQuestions ?? this.progress.completed_questions,
                correct_answers: data.progress?.correctAnswers ?? this.progress.correct_answers,
                progress_percent: data.progress?.progressPercent ?? this.progress.progress_percent,
                accuracy: data.progress?.completedQuestions > 0
                    ? Math.round((data.progress.correctAnswers / data.progress.completedQuestions) * 100)
                    : this.progress.accuracy
            };

            this.renderProgress();
            await this.loadCertificates();

            if (data.certificate) {
                this.showSubmissionState(questionId, `${data.feedback || 'Submission saved.'} Certificate issued.`, 'success');
            }
        } catch (error) {
            console.error('[SUBMIT ANSWER ERROR]', error);
            this.showSubmissionState(questionId, error.message || 'Failed to submit answer.', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = previousText;
            }
        }
    }

    collectAnswer(question) {
        const type = question.question_type || 'multiple_choice';

        if (type === 'multiple_choice') {
            const selected = document.querySelector(`input[name="answer-${question.id}"]:checked`);
            return selected?.value || '';
        }

        if (type === 'true_false') {
            return document.getElementById(`answer-${question.id}`)?.value || '';
        }

        return document.getElementById(`answer-${question.id}`)?.value || '';
    }

    setBooleanValue(group, value) {
        const hidden = document.getElementById(group);
        if (hidden) hidden.value = value;

        document.querySelectorAll(`[data-toggle-group="${group}"] [data-boolean-value]`).forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-boolean-value') === value);
        });
    }

    restoreBooleanSelections() {
        document.querySelectorAll('.boolean-toggle').forEach((group) => {
            const hidden = group.nextElementSibling;
            if (hidden && hidden.value) {
                const selected = group.querySelector(`[data-boolean-value="${hidden.value}"]`);
                if (selected) selected.classList.add('active');
            }
        });
    }

    filterQuestions() {
        const typeFilter = document.getElementById('type-filter')?.value || 'all';
        const search = document.getElementById('search-filter')?.value || '';

        this.filteredQuestions = this.questions.filter((question) => {
            const matchesType = typeFilter === 'all' || String(question.question_type || '') === typeFilter;
            const haystack = `${question.quiz_title || ''} ${question.question_text || ''} ${question.explanation || ''}`.toLowerCase();
            const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
            return matchesType && matchesSearch;
        });

        this.renderQuestions();
    }

    renderCertificateCard(certificate) {
        return `
            <article class="student-card">
                <div class="student-card__topline">
                    <div>
                        <h3>${this.escapeHtml(certificate.course_name || 'Certificate')}</h3>
                        <p>Issued ${new Date(certificate.issued_at).toLocaleDateString()}</p>
                    </div>
                    <span class="student-badge ${certificate.is_custom ? 'student-badge--success' : ''}">${certificate.is_custom ? 'Custom' : 'System'}</span>
                </div>
                <p>Certificate ID: ${this.escapeHtml(certificate.certificate_id || '')}</p>
                ${certificate.certificate_url ? `<a class="btn-secondary" href="${this.escapeAttribute(certificate.certificate_url)}" target="_blank" rel="noreferrer">Download</a>` : ''}
            </article>
        `;
    }

    parseOptions(options) {
        if (!options) return [];
        if (Array.isArray(options)) return options;
        try {
            const parsed = typeof options === 'string' ? JSON.parse(options) : options;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    formatQuestionType(type) {
        const labels = {
            multiple_choice: 'Multiple choice',
            true_false: 'True / False',
            fill_blank: 'Fill in the blank',
            debug: 'Debug',
            prediction: 'Prediction',
            challenge: 'Challenge'
        };
        return labels[type] || type;
    }

    showSubmissionState(questionId, message, type) {
        const element = document.getElementById(`submission-state-${questionId}`);
        if (!element) return;
        element.className = `submission-state ${type}`;
        element.textContent = message;
    }

    setStatus(message) {
        const status = document.getElementById('learning-status');
        if (status) status.textContent = message;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    }

    escapeAttribute(text) {
        return this.escapeHtml(text).replace(/"/g, '"');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LearningModule();
});
