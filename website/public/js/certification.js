// Certification System Module
class CertificationSystem {
    constructor() {
        this.certificates = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCertificates();
        this.loadStats();
    }

    setupEventListeners() {
        document.addEventListener('click', async (event) => {
            const viewButton = event.target.closest('[data-view-certificate]');
            const downloadButton = event.target.closest('[data-download-certificate]');
            const shareButton = event.target.closest('[data-share-certificate]');
            const closeButton = event.target.closest('[data-close-certificate-modal]');

            if (viewButton) {
                event.preventDefault();
                this.openCertificateModal(viewButton.getAttribute('data-view-certificate'));
                return;
            }

            if (downloadButton) {
                event.preventDefault();
                await this.downloadCertificate(downloadButton.getAttribute('data-download-certificate'));
                return;
            }

            if (shareButton) {
                event.preventDefault();
                await this.shareCertificate(shareButton.getAttribute('data-share-certificate'));
                return;
            }

            if (closeButton) {
                event.preventDefault();
                this.closeModal();
            }
        });
    }

    async loadCertificates() {
        const container = document.getElementById('certificates-container');
        const emptyState = document.getElementById('certificates-empty-state');
        if (!container || !emptyState) return;

        try {
            const response = await fetch('/api/certifications', { credentials: 'include' });
            const data = await response.json();
            this.certificates = Array.isArray(data) ? data : [];

            if (!this.certificates.length) {
                container.innerHTML = '';
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';
            container.innerHTML = this.certificates.map((certificate) => this.renderCertificateCard(certificate)).join('');
        } catch (error) {
            console.error('[CERTIFICATES LOAD ERROR]', error);
            emptyState.style.display = 'block';
            emptyState.innerHTML = '<p>Failed to load certificates.</p>';
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/certificate', { credentials: 'include' });
            const data = await response.json();
            const certificates = Array.isArray(data.certificates) ? data.certificates : [];

            const totalElement = document.getElementById('total-certificates');
            const verifiedElement = document.getElementById('verified-certificates');
            const sharedElement = document.getElementById('shared-certificates');

            if (totalElement) totalElement.textContent = String(certificates.length);
            if (verifiedElement) verifiedElement.textContent = String(certificates.length);
            if (sharedElement) sharedElement.textContent = String(certificates.filter((certificate) => certificate.shared).length);
        } catch (error) {
            console.error('[CERTIFICATE STATS ERROR]', error);
        }
    }

    renderCertificateCard(certificate) {
        const issuedDate = certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : 'Recently';

        return `
            <article class="certificate-card" data-certificate-id="${certificate.id}">
                <div class="certificate-preview">
                    <div class="certificate-placeholder">GL</div>
                    <div class="certificate-overlay">
                        <button class="btn-primary" type="button" data-view-certificate="${certificate.id}">View Certificate</button>
                    </div>
                </div>
                <div class="certificate-info">
                    <h3>${this.escapeHtml(certificate.course_name || 'Certificate')}</h3>
                    <p class="issue-date">Issued: ${issuedDate}</p>
                    <div class="certificate-meta">
                        <span class="status verified">Verified</span>
                        <span class="blockchain-hash">${this.escapeHtml(certificate.certificate_id || '')}</span>
                    </div>
                </div>
                <div class="certificate-actions">
                    <button class="btn-secondary" type="button" data-download-certificate="${certificate.id}">Download</button>
                    <button class="btn-secondary" type="button" data-share-certificate="${certificate.id}">Share</button>
                </div>
            </article>
        `;
    }

    openCertificateModal(certificateId) {
        const certificate = this.certificates.find((entry) => String(entry.id) === String(certificateId));
        if (!certificate) {
            this.showNotification('Certificate not found', 'error');
            return;
        }

        const modal = document.getElementById('certificate-modal');
        if (!modal) return;

        const image = document.getElementById('certificate-full-image');
        const title = document.getElementById('certificate-title');
        const recipient = document.getElementById('certificate-recipient');
        const date = document.getElementById('certificate-date');
        const verification = document.getElementById('verification-status');
        const hash = document.querySelector('.blockchain-hash-inline');

        if (image) image.src = certificate.certificate_url || '';
        if (title) title.textContent = certificate.course_name || 'Certificate';
        if (recipient) recipient.textContent = `Awarded to: ${certificate.user_id}`;
        if (date) date.textContent = `Issued on: ${certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : 'Recently'}`;
        if (verification) verification.textContent = 'Status: Verified';
        if (hash) hash.textContent = certificate.certificate_id || '';

        modal.style.display = 'flex';
    }

    closeModal() {
        const modal = document.getElementById('certificate-modal');
        if (modal) modal.style.display = 'none';
    }

    async downloadCertificate(certificateId) {
        try {
            const response = await fetch(`/api/certifications/${certificateId}/download`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `GLEECIN-Certificate-${certificateId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            this.showNotification('Certificate downloaded successfully', 'success');
        } catch (error) {
            console.error('[CERT DOWNLOAD ERROR]', error);
            this.showNotification(error.message || 'Failed to download certificate', 'error');
        }
    }

    async shareCertificate(certificateId) {
        try {
            const response = await fetch(`/api/certifications/${certificateId}/share`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Share failed');
            }

            await navigator.clipboard.writeText(data.shareUrl || window.location.href);
            this.showNotification('Certificate link copied', 'success');
            await this.loadCertificates();
            await this.loadStats();
        } catch (error) {
            console.error('[CERT SHARE ERROR]', error);
            this.showNotification(error.message || 'Failed to share certificate', 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
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
    new CertificationSystem();
});
