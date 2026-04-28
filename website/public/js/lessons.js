// Lesson Vault Module
class LessonVault {
    constructor() {
        this.currentLessonId = null;
        this.videoElement = null;
        this.progressInterval = null;
        this.captionsEnabled = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadLessons();
    }

    setupEventListeners() {
        // Lesson selection
        document.querySelectorAll('.lesson-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('download-button')) {
                    this.selectLesson(card.dataset.lessonId);
                }
            });
        });

        // Download buttons
        document.querySelectorAll('.download-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadLesson(button.dataset.lessonId);
            });
        });

        // Caption toggle
        const captionToggle = document.getElementById('caption-toggle');
        if (captionToggle) {
            captionToggle.addEventListener('click', () => {
                this.toggleCaptions();
            });
        }

        // Video events (will be set up when video is loaded)
    }

    async loadLessons() {
        try {
            const response = await fetch('/api/lessons', {
                credentials: 'include'
            });
            const lessons = await response.json();
            
            const container = document.getElementById('lessons-container');
            if (container) {
                container.innerHTML = lessons.map(lesson => this.renderLessonCard(lesson)).join('');
                this.setupEventListeners(); // Rebind events for new elements
            }
        } catch (error) {
            console.error('Error loading lessons:', error);
            this.showNotification('Failed to load lessons', 'error');
        }
    }

    selectLesson(lessonId) {
        this.currentLessonId = lessonId;
        
        // Highlight selected lesson
        document.querySelectorAll('.lesson-card').forEach(card => {
            card.classList.remove('selected');
        });
        const selectedCard = document.querySelector(`[data-lesson-id="${lessonId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            
            // Load lesson details
            this.loadLessonDetails(lessonId);
        }
    }

    async loadLessonDetails(lessonId) {
        try {
            const response = await fetch(`/api/lessons/${lessonId}`, {
                credentials: 'include'
            });
            const lesson = await response.json();
            
            // Create video player
            this.createVideoPlayer(lesson.video_url, lesson.duration_seconds);
            
            // Display transcript
            this.displayTranscript(lesson.transcript);
            
            // Set up progress tracking
            this.setupProgressTracking(lessonId, lesson.duration_seconds);
            
        } catch (error) {
            console.error('Error loading lesson details:', error);
            this.showNotification('Failed to load lesson details', 'error');
        }
    }

    createVideoPlayer(videoUrl, duration) {
        const playerContainer = document.getElementById('video-player');
        if (!playerContainer) return;

        // In a real implementation, this would embed an actual video player
        // For now, we'll create a simulated player
        playerContainer.innerHTML = `
            <div class="video-player-placeholder">
                <h3>Video Player</h3>
                <p>Video URL: ${videoUrl}</p>
                <p>Duration: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}</p>
                <div class="video-controls">
                    <button id="play-pause-btn" class="btn-primary">▶ Play</button>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="video-progress" style="width: 0%;"></div>
                        </div>
                        <span class="progress-text" id="progress-text">0:00 / ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}</span>
                    </div>
                    <button id="caption-toggle" class="caption-toggle">CC Off</button>
                </div>
            </div>
        `;

        // Set up simulated video controls
        this.setupVideoControls(duration);
    }

    setupVideoControls(duration) {
        let currentTime = 0;
        let isPlaying = false;
        let playInterval;

        const playPauseBtn = document.getElementById('play-pause-btn');
        const progressFill = document.getElementById('video-progress');
        const progressText = document.getElementById('progress-text');

        playPauseBtn.addEventListener('click', () => {
            if (isPlaying) {
                // Pause
                clearInterval(playInterval);
                playPauseBtn.textContent = '▶ Play';
                isPlaying = false;
            } else {
                // Play
                playInterval = setInterval(() => {
                    currentTime++;
                    if (currentTime >= duration) {
                        clearInterval(playInterval);
                        currentTime = duration;
                        isPlaying = false;
                        playPauseBtn.textContent = '▶ Play';
                        this.markLessonComplete(this.currentLessonId);
                    }
                    
                    const progressPercent = (currentTime / duration) * 100;
                    progressFill.style.width = `${progressPercent}%`;
                    progressText.textContent = `${Math.floor(currentTime / 60)}:${String(currentTime % 60).padStart(2, '0')} / ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
                    
                    // Save progress every 30 seconds
                    if (currentTime % 30 === 0) {
                        this.saveProgress(this.currentLessonId, currentTime, duration, progressPercent);
                    }
                }, 1000);
                
                playPauseBtn.textContent = '⏸ Pause';
                isPlaying = true;
            }
        });

        // Simulate clicking on progress bar to seek
        const progressBar = document.querySelector('.progress-bar');
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newTime = Math.floor((clickX / rect.width) * duration);
            currentTime = newTime;
            
            const progressPercent = (currentTime / duration) * 100;
            progressFill.style.width = `${progressPercent}%`;
            progressText.textContent = `${Math.floor(currentTime / 60)}:${String(currentTime % 60).padStart(2, '0')} / ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
        });
    }

    displayTranscript(transcript) {
        const transcriptContainer = document.getElementById('transcript-container');
        if (transcriptContainer && transcript) {
            const lines = transcript.split('\n').filter(line => line.trim());
            transcriptContainer.innerHTML = lines.map((line, index) => 
                `<div class="transcript-line">${this.escapeHtml(line)}</div>`
            ).join('');
        }
    }

    setupProgressTracking(lessonId, duration) {
        // Clear any existing interval
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        // Save progress every 30 seconds while lesson is active
        this.progressInterval = setInterval(() => {
            // In a real implementation, this would get actual video time
            // For simulation, we'll just save current progress
            const progressFill = document.getElementById('video-progress');
            if (progressFill) {
                const progressPercent = parseFloat(progressFill.style.width) || 0;
                const currentTime = Math.floor((progressPercent / 100) * duration);
                this.saveProgress(lessonId, currentTime, duration, progressPercent);
            }
        }, 30000);
    }

    async saveProgress(lessonId, currentTime, duration, progressPercent) {
        try {
            await fetch('/api/lessons/progress', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lessonId: lessonId,
                    currentTime: currentTime,
                    duration: duration,
                    progressPercentage: progressPercent
                })
            });
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    async markLessonComplete(lessonId) {
        try {
            await fetch('/api/lessons/complete', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lessonId: lessonId
                })
            });
            this.showNotification('Lesson completed! 🎉', 'success');
        } catch (error) {
            console.error('Error marking lesson complete:', error);
        }
    }

    async downloadLesson(lessonId) {
        try {
            // In a real implementation, this would download the actual video file
            // For now, we'll simulate the download
            this.showNotification('Downloading lesson...', 'info');
            
            // Update download count in database
            await fetch(`/api/lessons/${lessonId}/download`, {
                method: 'POST',
                credentials: 'include'
            });
            
            setTimeout(() => {
                this.showNotification('Lesson downloaded successfully!', 'success');
            }, 2000);
            
        } catch (error) {
            console.error('Error downloading lesson:', error);
            this.showNotification('Failed to download lesson', 'error');
        }
    }

    toggleCaptions() {
        this.captionsEnabled = !this.captionsEnabled;
        const captionToggle = document.getElementById('caption-toggle');
        if (captionToggle) {
            captionToggle.textContent = this.captionsEnabled ? 'CC On' : 'CC Off';
        }
        
        const transcriptContainer = document.getElementById('transcript-container');
        if (transcriptContainer) {
            transcriptContainer.style.display = this.captionsEnabled ? 'block' : 'none';
        }
    }

    renderLessonCard(lesson) {
        return `
            <div class="lesson-card" data-lesson-id="${lesson.id}">
                <h2>${this.escapeHtml(lesson.title)}</h2>
                <p class="lesson-description">${this.escapeHtml(lesson.description)}</p>
                <div class="lesson-meta">
                    <span class="lesson-category">${lesson.category}</span>
                    <span class="lesson-duration">${Math.floor(lesson.duration_seconds / 60)} min</span>
                    ${lesson.is_premium ? '<span class="badge violet">Premium</span>' : ''}
                    ${lesson.completed ? '<span class="badge cyan">✓ Completed</span>' : ''}
                </div>
                <div class="lesson-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${lesson.progressPercentage}%;"></div>
                    </div>
                    <span class="progress-text">${lesson.progressPercentage}%</span>
                </div>
                <button class="download-button" data-lesson-id="${lesson.id}">Download</button>
            </div>
        `;
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
    new LessonVault();
});