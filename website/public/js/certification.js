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
        // Download PDF buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-pdf')) {
                this.downloadCertificate(e.target.dataset.certificateId);
            }
        });

        // Share certificate buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('share-certificate')) {
                this.shareCertificate(e.target.dataset.certificateId);
            }
        });

        // Verify blockchain buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('verify-blockchain')) {
                this.verifyBlockchain(e.target.dataset.certificateId);
            }
        });
    }

    async loadCertificates() {
        try {
            const response = await fetch('/api/certifications');
            this.certificates = await response.json();
            
            const container = document.getElementById('certificates-container');
            if (container) {
                container.innerHTML = this.certificates.map(cert => this.renderCertificateCard(cert)).join('');
                this.setupEventListeners(); // Rebind events for new elements
            }
        } catch (error) {
            console.error('Error loading certificates:', error);
            this.showNotification('Failed to load certificates', 'error');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/certifications/stats');
            const stats = await response.json();
            
            const totalElement = document.getElementById('total-certificates');
            const verifiedElement = document.getElementById('verified-certificates');
            const sharedElement = document.getElementById('shared-certificates');
            
            if (totalElement) totalElement.textContent = stats.total || 0;
            if (verifiedElement) verifiedElement.textContent = stats.verified || 0;
            if (sharedElement) sharedElement.textContent = stats.shared || 0;
            
        } catch (error) {
            console.error('Error loading certificate stats:', error);
        }
    }

    renderCertificateCard(certificate) {
        return `
            <div class="certificate-card" data-certificate-id="${certificate.id}">
                <div class="certificate-preview">
                    <img src="${certificate.imageUrl || '/images/certificates/default.jpg'}" alt="${this.escapeHtml(certificate.name)} Certificate">
                </div>
                <div class="certificate-info">
                    <h2>${this.escapeHtml(certificate.name)}</h2>
                    <p class="issue-date">Issued: ${new Date(certificate.earnedDate).toLocaleDateString()}</p>
                    <div class="verification-status ${certificate.isVerified ? 'verified' : 'unverified'}">
                        ${certificate.isVerified ? 'Blockchain Verified ✓' : 'Not Verified'}
                    </div>
                    ${certificate.blockchainHash ? `
                        <div class="blockchain-hash" title="Click to verify">${this.truncateHash(certificate.blockchainHash)}</div>
                    ` : ''}
                    <div class="certificate-actions">
                        <button class="btn-secondary download-pdf" data-certificate-id="${certificate.id}">
                            <i class="fas fa-file-pdf"></i> Download PDF
                        </button>
                        <button class="btn-secondary share-certificate" data-certificate-id="${certificate.id}">
                            <i class="fas fa-share-alt"></i> Share
                        </button>
                        ${certificate.isVerified ? `
                            <button class="btn-success verify-blockchain" data-certificate-id="${certificate.id}">
                                Verify
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async downloadCertificate(certificateId) {
        try {
            // Show loading state
            const button = document.querySelector(`[data-certificate-id="${certificateId}"] .download-pdf`);
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            button.disabled = true;

            // Generate and download PDF
            const response = await fetch(`/api/certifications/${certificateId}/pdf`);
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${certificateId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Restore button
            button.innerHTML = originalText;
            button.disabled = false;
            
            this.showNotification('Certificate downloaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error downloading certificate:', error);
            this.showNotification('Failed to download certificate', 'error');
            
            // Restore button on error
            const button = document.querySelector(`[data-certificate-id="${certificateId}"] .download-pdf`);
            if (button) {
                button.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
                button.disabled = false;
            }
        }
    }

    async shareCertificate(certificateId) {
        const certificate = this.certificates.find(cert => cert.id == certificateId);
        if (!certificate) return;

        const shareData = {
            title: `${certificate.name} Certificate`,
            text: `I earned my ${certificate.name} certificate from GLEECIN Academy!`,
            url: certificate.pdfUrl || window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: copy URL to clipboard
                await navigator.clipboard.writeText(shareData.url);
                this.showNotification('Certificate URL copied to clipboard!', 'success');
                
                // Update shared count in database
                await this.markCertificateShared(certificateId);
            }
        } catch (error) {
            console.error('Error sharing certificate:', error);
            this.showNotification('Failed to share certificate', 'error');
        }
    }

    async markCertificateShared(certificateId) {
        try {
            await fetch(`/api/certifications/${certificateId}/share`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error marking certificate as shared:', error);
        }
    }

    async verifyBlockchain(certificateId) {
        const certificate = this.certificates.find(cert => cert.id == certificateId);
        if (!certificate || !certificate.blockchainHash) return;

        try {
            // In a real implementation, this would verify against the actual blockchain
            // For simulation, we'll just show a verification process
            const button = document.querySelector(`[data-certificate-id="${certificateId}"] .verify-blockchain`);
            const originalText = button.textContent;
            button.textContent = 'Verifying...';
            button.disabled = true;

            // Simulate blockchain verification delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Show verification result
            this.showNotification('Certificate verified on blockchain! ✅', 'success');
            
            // Restore button
            button.textContent = originalText;
            button.disabled = false;
            
        } catch (error) {
            console.error('Error verifying blockchain:', error);
            this.showNotification('Blockchain verification failed', 'error');
            
            // Restore button on error
            const button = document.querySelector(`[data-certificate-id="${certificateId}"] .verify-blockchain`);
            if (button) {
                button.textContent = 'Verify';
                button.disabled = false;
            }
        }
    }

    truncateHash(hash) {
        if (!hash || hash.length <= 12) return hash;
        return `${hash.substring(0, 6)}...${hash.substring(hash.length - 6)}`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
    new CertificationSystem();
});