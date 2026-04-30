// Academy overview page interactions
class AcademyPage {
    constructor() {
        this.init();
    }

    init() {
        this.bindSectionLinks();
        this.bindTestimonialHover();
    }

    bindSectionLinks() {
        document.addEventListener('click', (event) => {
            const actionLink = event.target.closest('.academy-sections a, .testimonial a');
            if (!actionLink) return;

            const href = actionLink.getAttribute('href');
            if (href === '#') {
                event.preventDefault();
                this.showNotification('This guide is being moved into the production knowledge base.', 'info');
            }
        });
    }

    bindTestimonialHover() {
        document.querySelectorAll('.testimonial').forEach((card) => {
            card.addEventListener('mouseenter', () => card.classList.add('interactive-element'));
            card.addEventListener('mouseleave', () => card.classList.remove('interactive-element'));
        });
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
    new AcademyPage();
});
