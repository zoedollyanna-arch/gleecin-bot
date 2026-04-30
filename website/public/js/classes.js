// Classes page interactions
class ClassesPage {
    constructor() {
        this.init();
    }

    init() {
        this.bindCardActions();
        this.bindFilters();
    }

    bindCardActions() {
        document.addEventListener('click', (event) => {
            const enrollButton = event.target.closest('.enroll-class');
            const syllabusButton = event.target.closest('.view-syllabus');
            const classCard = event.target.closest('.class-card');

            if (enrollButton) {
                event.preventDefault();
                const card = enrollButton.closest('.class-card');
                if (!card) return;
                this.handleEnroll(card.dataset.classId);
                return;
            }

            if (syllabusButton) {
                event.preventDefault();
                const card = syllabusButton.closest('.class-card');
                if (!card) return;
                this.viewSyllabus(card.dataset.classId);
                return;
            }

            if (classCard && !event.target.closest('button, a')) {
                this.viewClass(classCard.dataset.classId);
            }
        });
    }

    bindFilters() {
        const levelFilter = document.getElementById('level-filter');
        const categoryFilter = document.getElementById('category-filter');

        if (levelFilter) {
            levelFilter.addEventListener('change', () => this.applyFilters());
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
    }

    applyFilters() {
        const level = document.getElementById('level-filter')?.value || 'all';
        const category = document.getElementById('category-filter')?.value || 'all';

        document.querySelectorAll('.class-card').forEach((card) => {
            const matchesLevel = level === 'all' || card.textContent.toLowerCase().includes(level);
            const matchesCategory = category === 'all' || true;
            card.style.display = matchesLevel && matchesCategory ? '' : 'none';
        });
    }

    handleEnroll(classId) {
        if (!classId) return;
        window.location.href = `/class/${classId}?action=enroll`;
    }

    viewSyllabus(classId) {
        if (!classId) return;
        window.location.href = `/class/${classId}?tab=syllabus`;
    }

    viewClass(classId) {
        if (!classId) return;
        window.location.href = `/class/${classId}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ClassesPage();
});
