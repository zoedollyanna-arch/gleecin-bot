class AcademyPage {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadLiveContent();
        this.bindSectionLinks();
    }

    async loadLiveContent() {
        try {
            const response = await fetch('/api/academy-summary', { credentials: 'include' });
            const data = response.ok ? await response.json() : null;

            const scripts = Array.isArray(data?.scripts) ? data.scripts : [];
            const challenges = Array.isArray(data?.challenges) ? data.challenges : [];
            const lessons = Array.isArray(data?.lessons) ? data.lessons : [];
            const certificates = Array.isArray(data?.certifications) ? data.certifications : [];

            this.renderStats({
                scripts: data?.stats?.script_count ?? scripts.length,
                challenges: data?.stats?.challenge_count ?? challenges.length,
                lessons: data?.stats?.lesson_count ?? lessons.length,
                certificates: data?.stats?.certification_count ?? certificates.length
            });

            this.renderScripts(scripts.slice(0, 3));
            this.renderChallenges(challenges.slice(0, 3));
            this.toggleEmptyState(!scripts.length && !challenges.length && !lessons.length);
        } catch (error) {
            console.error('[ACADEMY LOAD ERROR]', error);
            this.renderStats({ scripts: 0, challenges: 0, lessons: 0, certificates: 0 });
            this.renderScripts([]);
            this.renderChallenges([]);
            this.toggleEmptyState(true);
        }
    }

    renderStats({ scripts, challenges, lessons, certificates }) {
        const scriptCount = document.getElementById('academy-scripts-count');
        const challengeCount = document.getElementById('academy-challenges-count');
        const lessonCount = document.getElementById('academy-lessons-count');
        const certCount = document.getElementById('academy-certifications-count');

        if (scriptCount) scriptCount.textContent = String(scripts ?? 0);
        if (challengeCount) challengeCount.textContent = String(challenges ?? 0);
        if (lessonCount) lessonCount.textContent = String(lessons ?? 0);
        if (certCount) certCount.textContent = String(certificates ?? 0);
    }

    renderScripts(scripts) {
        const container = document.getElementById('academy-scripts');
        if (!container) return;

        if (!scripts.length) {
            container.innerHTML = '<p class="academy-empty-line">No scripts available yet.</p>';
            return;
        }

        container.innerHTML = scripts.map((script) => `
            <article class="academy-list-item">
                <strong>${this.escapeHtml(script.title || 'Untitled Script')}</strong>
                <p>${this.escapeHtml(script.description || 'No description available.')}</p>
                <a href="/scripts" class="panel-link">Open script library</a>
            </article>
        `).join('');
    }

    renderChallenges(challenges) {
        const container = document.getElementById('academy-challenges');
        if (!container) return;

        if (!challenges.length) {
            container.innerHTML = '<p class="academy-empty-line">No challenges available yet.</p>';
            return;
        }

        container.innerHTML = challenges.map((challenge) => `
            <article class="academy-list-item">
                <strong>${this.escapeHtml(challenge.title || 'Untitled Challenge')}</strong>
                <p>${this.escapeHtml(challenge.description || 'No description available.')}</p>
                <a href="/learning" class="panel-link">Open learning hub</a>
            </article>
        `).join('');
    }

    toggleEmptyState(show) {
        const emptyState = document.getElementById('academy-empty-state');
        if (!emptyState) return;
        emptyState.hidden = !show;
    }

    bindSectionLinks() {
        document.addEventListener('click', (event) => {
            const actionLink = event.target.closest('.academy-sections a, .academy-panel a');
            if (!actionLink) return;
            if (actionLink.getAttribute('href') === '#') {
                event.preventDefault();
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AcademyPage();
});
