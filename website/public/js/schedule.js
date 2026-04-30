// Schedule page interactions
class SchedulePage {
    constructor() {
        this.scheduleItems = [];
        this.init();
    }

    init() {
        this.bindViewToggle();
        this.bindCalendarButtons();
        this.loadSchedule();
    }

    async loadSchedule() {
        const weekRows = document.querySelector('.week-rows');
        const eventsList = document.querySelector('.events-list');
        const announcementsList = document.querySelector('.announcement-list');

        try {
            const response = await fetch('/api/schedule', { credentials: 'include' });
            const schedule = await response.json();

            if (!Array.isArray(schedule)) {
                throw new Error('Invalid schedule response');
            }

            this.scheduleItems = schedule;
            this.renderSchedule(schedule, weekRows, eventsList);
            this.renderAnnouncements(schedule, announcementsList);
        } catch (error) {
            console.error('[SCHEDULE LOAD ERROR]', error);
            this.showNotification('Failed to load schedule data.', 'error');
        }
    }

    renderSchedule(schedule, weekRows, eventsList) {
        if (weekRows) {
            weekRows.innerHTML = schedule.length
                ? schedule.map((item) => `
                    <div class="time-slot">${this.formatTime(item.scheduled_time) || 'Scheduled'}</div>
                    <div class="schedule-event ${this.escapeHtml(item.class_name || 'general').toLowerCase()}" data-schedule-id="${item.id}">
                        <div class="event-title">${this.escapeHtml(item.title || 'Scheduled session')}</div>
                        <div class="event-details">${this.escapeHtml(item.instructor || 'Staff')} • ${this.escapeHtml(item.class_name || 'General')}</div>
                    </div>
                `).join('')
                : '<div class="schedule-event empty"><div class="event-title">No scheduled events</div></div>';
        }

        if (eventsList) {
            eventsList.innerHTML = schedule.length
                ? schedule.map((item) => `
                    <div class="event-card">
                        <div class="event-date">${this.formatDate(item.scheduled_date) || 'TBD'}</div>
                        <div class="event-info">
                            <h3>${this.escapeHtml(item.title || 'Scheduled session')}</h3>
                            <p>${this.escapeHtml(item.scheduled_time || 'Time TBD')} • ${this.escapeHtml(item.instructor || 'Staff')}</p>
                        </div>
                        <button class="btn-secondary add-to-calendar" data-schedule-id="${item.id}">Add to Calendar</button>
                    </div>
                `).join('')
                : '<div class="event-card"><div class="event-info"><h3>No upcoming events</h3><p>Published schedules will appear here.</p></div></div>';
        }
    }

    renderAnnouncements(schedule, announcementsList) {
        if (!announcementsList) return;

        const announcements = schedule
            .filter((item) => item.published)
            .slice(0, 5)
            .map((item) => `
                <div class="announcement ${item.important ? 'important' : ''}">
                    <div class="announcement-date">${this.formatDate(item.published_at || item.created_at) || 'Recently'}</div>
                    <div class="announcement-content">
                        <h3>${this.escapeHtml(item.title || 'Announcement')}</h3>
                        <p>${this.escapeHtml(item.description || 'Schedule update posted.')}</p>
                    </div>
                </div>
            `);

        announcementsList.innerHTML = announcements.length
            ? announcements.join('')
            : '<div class="announcement"><div class="announcement-content"><h3>No announcements yet</h3><p>Published updates will appear here.</p></div></div>';
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

    formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString();
    }

    formatTime(value) {
        if (!value) return '';
        return String(value);
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
        setTimeout(() => notification.remove(), 2500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SchedulePage();
});
