// Class detail page interactions
class ClassDetailPage {
    constructor() {
        this.init();
    }

    init() {
        this.bindEnrollButton();
        this.applyRouteContext();
    }

    bindEnrollButton() {
        const enrollButton = document.getElementById('enroll-button');
        if (!enrollButton) return;

        enrollButton.addEventListener('click', () => {
            const classId = this.getClassId();
            if (!classId) return;
            window.location.href = `/student/sessions?class=${classId}`;
        });
    }

    applyRouteContext() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const tab = params.get('tab');

        if (action === 'enroll') {
            const enrollButton = document.getElementById('enroll-button');
            if (enrollButton) {
                enrollButton.textContent = 'Request Enrollment';
                enrollButton.classList.add('btn-primary');
            }
        }

        if (tab === 'syllabus') {
            const syllabusSection = document.querySelector('.class-topics');
            if (syllabusSection) {
                syllabusSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    getClassId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('classId') || document.getElementById('enroll-button')?.dataset.classId || '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ClassDetailPage();
});
