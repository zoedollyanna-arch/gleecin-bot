// Schedule page interactions
class SchedulePage {
    constructor() {
        this.init();
    }

    init() {
        this.bindViewToggle();
        this.bindCalendarButtons();
    }

    bindViewToggle() {
        const weekView = document.getElementById('week-view');
        const monthView = document.getElementById('month-view');

        if (weekView) {
            weekView.addEventListener('click', () => {
                weekView.classList.add('active');
                monthView?.classList.remove('active');
            });
        }

        if (monthView) {
            monthView.addEventListener('click', () => {
                monthView.classList.add('active');
                weekView?.classList.remove('active');
            });
        }
    }

    bindCalendarButtons() {
        document.addEventListener('click', (event) => {
            const addButton = event.target.closest('.add-to-calendar');
            const eventCard = event.target.closest('.event-card');
            const scheduleEvent = event.target.closest('.schedule-event');

            if (addButton) {
                event.preventDefault();
                this.showNotification('Calendar export will open from the event details.', 'info');
                return;
            }

            if (eventCard && !event.target.closest('button, a')) {
                this.showNotification('Open the event details in the admin schedule panel.', 'info');
                return;
            }

            if (scheduleEvent && !scheduleEvent.classList.contains('empty')) {
                this.showNotification('Schedule item selected.', 'info');
            }
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
    new SchedulePage();
});
