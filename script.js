class AudioVideoToTextConverter {
    constructor() {
        this.canvas = document.getElementById('backgroundCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.fileInput = document.getElementById('fileInput');
        this.uploadTrigger = document.getElementById('uploadTrigger');
        this.uploadBox = document.querySelector('.upload-box');
        this.resultBox = document.getElementById('resultBox');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.sampleTrigger = document.getElementById('sampleTrigger');
        
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.currentPage = this.getCurrentPage();
        this.previousPage = sessionStorage.getItem('previousPage') || 'home';
        
        // Базовый URL для API
        this.apiBaseUrl = 'http://127.0.0.1:5000'; // Фиксируем порт бекенда
        
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('privacy.html')) return 'privacy';
        if (path.includes('pricing')) return 'pricing';
        if (path.includes('changelogs')) return 'changelogs';
        return 'home';
    }

    init() {
        this.setupEventListeners();
        this.initBackgroundAnimation();
        this.initEnhancedNavigation();
        this.initScrollSpy();
        this.updateUIState('ready');
        
        // Проверяем доступность бекенда
        this.checkBackendHealth();
    }

    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`, {
                method: 'GET',
                mode: 'cors', // Явно указываем режим CORS
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (response.ok) {
                const health = await response.json();
                console.log('Backend is healthy:', health);
                return true;
            } else {
                console.warn('Backend health check failed');
                return false;
            }
        } catch (error) {
            console.warn('Backend is not available:', error.message);
            // Показываем более информативное сообщение
            this.showTemporaryMessage(
                'Cannot connect to backend service. Make sure the Python server is running on port 5000.', 
                'error'
            );
            return false;
        }
    }

    setupEventListeners() {
        // File input handling
        this.uploadTrigger.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        this.uploadBox.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadBox.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadBox.addEventListener('drop', (e) => this.handleFileDrop(e));
        
        // Sample file
        this.sampleTrigger.addEventListener('click', () => this.handleSampleFile());
        
        // Result actions
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadResult());
        this.clearBtn.addEventListener('click', () => this.clearResults());
        
        // Keyboard navigation
        this.uploadBox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                this.fileInput.click();
            }
        });

        this.setupEnhancedNavigation();
    }

    setupEnhancedNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                const target = link.getAttribute('data-target') || 
                              (href.includes('#') ? href.substring(1) : 
                              href.replace('.html', ''));

                if (href.includes('.html') || href === '/pricing' || href === '/changelogs') {
                    e.preventDefault();
                    this.navigateToPage(href, target);
                } else {
                    e.preventDefault();
                    this.handleInternalNavigation(target);
                }
            });
        });
    }

    navigateToPage(url, target) {
        sessionStorage.setItem('previousPage', this.currentPage);
        sessionStorage.setItem('navTransition', 'true');
        document.body.classList.add('page-transition-out');
        
        setTimeout(() => {
            if (url.startsWith('/')) {
                window.location.href = url;
            } else {
                window.location.href = url;
            }
        }, 400);
    }

    handleInternalNavigation(target) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-target="${target}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        this.updateNavIndicator();
        
        if (target === 'home') {
            this.scrollToHome();
        } else if (target === 'features') {
            this.scrollToFeatures();
        }
    }

    initEnhancedNavigation() {
        this.updateNavIndicator();
    }

    initScrollSpy() {
        const sections = [
            { id: 'home', element: document.querySelector('#home') || document.querySelector('.gradient-text')?.closest('section') },
            { id: 'features', element: document.getElementById('features') }
        ].filter(section => section.element);

        if (sections.length === 0) return;

        const options = {
            root: null,
            rootMargin: '-40% 0px -40% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isScrolling) {
                    const activeId = entry.target.id || 'home';
                    this.updateActiveNav(activeId);
                }
            });
        }, options);

        sections.forEach(section => {
            if (section.element) {
                observer.observe(section.element);
            }
        });

        window.addEventListener('scroll', () => {
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }
            
            this.scrollTimeout = setTimeout(() => {
                if (!this.isScrolling) {
                    this.handleManualScroll();
                }
            }, 50);
        });
    }

    handleManualScroll() {
        const scrollPosition = window.scrollY + (window.innerHeight / 3);
        
        const homeSection = document.querySelector('#home') || document.querySelector('.gradient-text')?.closest('section');
        const featuresSection = document.getElementById('features');
        
        let activeSection = 'home';
        
        if (featuresSection) {
            const featuresRect = featuresSection.getBoundingClientRect();
            const featuresTop = featuresRect.top + window.scrollY;
            const featuresBottom = featuresTop + featuresRect.height;
            
            if (scrollPosition >= featuresTop && scrollPosition <= featuresBottom) {
                activeSection = 'features';
            }
        }
        
        this.updateActiveNav(activeSection);
    }

    updateActiveNav(sectionId) {
        const homeLink = document.querySelector('.nav-link[href="#home"]');
        const featuresLink = document.querySelector('.nav-link[href="#features"]');
        
        if (!homeLink || !featuresLink) return;
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        if (sectionId === 'home' && homeLink) {
            homeLink.classList.add('active');
        } else if (sectionId === 'features' && featuresLink) {
            featuresLink.classList.add('active');
        }
        
        this.updateNavIndicator();
    }

    scrollToHome() {
        this.isScrolling = true;
        const homeHeader = document.querySelector('.gradient-text');
        if (homeHeader) {
            homeHeader.style.scrollMarginTop = '200px';
            homeHeader.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            setTimeout(() => {
                homeHeader.style.scrollMarginTop = '';
                this.isScrolling = false;
            }, 800);
        } else {
            window.scrollTo({ 
                top: 0, 
                behavior: 'smooth' 
            });
            setTimeout(() => {
                this.isScrolling = false;
            }, 800);
        }
    }

    scrollToFeatures() {
        this.isScrolling = true;
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
            featuresSection.style.scrollMarginTop = '100px';
            featuresSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            setTimeout(() => {
                featuresSection.style.scrollMarginTop = '';
                this.isScrolling = false;
            }, 800);
        }
    }

    updateNavIndicator() {
        const activeLink = document.querySelector('.nav-link.active');
        const navIndicator = document.getElementById('navIndicator');
        
        if (activeLink && navIndicator) {
            const linkRect = activeLink.getBoundingClientRect();
            const navRect = activeLink.parentElement.getBoundingClientRect();
            
            navIndicator.style.width = `${linkRect.width}px`;
            navIndicator.style.left = `${linkRect.left - navRect.left}px`;
        }
    }

    initBackgroundAnimation() {
        const resizeCanvas = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadBox.classList.add('drag-over');
        this.uploadBox.style.borderColor = 'var(--accent-primary)';
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadBox.classList.remove('drag-over');
        this.uploadBox.style.borderColor = '';
    }

    handleFileDrop(e) {
        e.preventDefault();
        this.uploadBox.classList.remove('drag-over');
        this.uploadBox.style.borderColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async handleSampleFile() {
        this.updateUIState('processing');
        this.showProgress(30, 'Loading sample file...');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/sample`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            
            this.showProgress(100, 'Transcription complete!');
            
            // Форматируем результат
            let formattedText = result.text || 'No text recognized';
            if (result.duration) {
                formattedText = `DURATION: ${this.formatDuration(result.duration)}\n\n${formattedText}`;
            }
            if (result.language && result.language !== 'unknown') {
                formattedText = `LANGUAGE: ${result.language.toUpperCase()}\n${formattedText}`;
            }
            if (result.is_sample) {
                formattedText = `🔹 SAMPLE TRANSCRIPTION 🔹\n\n${formattedText}`;
            }
            
            this.displayResult(formattedText);
            this.updateUIState('completed');
            
        } catch (error) {
            console.error('Error loading sample:', error);
            // Fallback to local sample
            this.showProgress(70, 'Transcribing sample audio...');
            await this.delay(1000);
            
            this.showProgress(100, 'Transcription complete!');
            
            const sampleText = `🔹 SAMPLE TRANSCRIPTION 🔹

DURATION: 00:00:45
LANGUAGE: EN

[00:00:00] Welcome to our audio transcription service. This sample demonstrates the high-quality text conversion.

[00:00:15] Our advanced speech recognition technology can handle various accents and background conditions.

[00:00:30] The system automatically detects speaker changes and adds proper punctuation.`;

            this.displayResult(sampleText);
            this.updateUIState('completed');
        }
    }

    async processFile(file, language = 'auto') {
        if (!this.isValidFileType(file)) {
            this.showError('Please select a valid audio or video file (MP3, WAV, MP4, AVI, MOV, M4A, FLAC, AAC, MKV, WMV)');
            return;
        }

        this.updateUIState('processing');
        this.showProgress(10, 'Uploading file...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('language', language);
            
            this.showProgress(30, 'Processing file...');
            
            const response = await fetch(`${this.apiBaseUrl}/transcribe`, {
                method: 'POST',
                body: formData
                // Заголовки не нужны для FormData, браузер установит их автоматически
            });

            if (!response.ok) {
                let errorMessage = `Server error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // Если не удалось распарсить JSON, пробуем получить текст
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            
            this.showProgress(100, 'Transcription complete!');
            
            // Форматируем результат
            let formattedText = result.text || 'No text recognized';
            if (result.duration) {
                formattedText = `DURATION: ${this.formatDuration(result.duration)}\n\n${formattedText}`;
            }
            if (result.language && result.language !== 'unknown') {
                formattedText = `LANGUAGE: ${result.language.toUpperCase()}\n${formattedText}`;
            }
            
            this.displayResult(formattedText);
            this.updateUIState('completed');
            
        } catch (error) {
            console.error('Error processing file:', error);
            this.showError('Error processing file: ' + error.message);
            this.updateUIState('ready');
        }
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    isValidFileType(file) {
        const validTypes = [
            'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a',
            'audio/flac', 'audio/aac', 'video/mp4', 'video/avi', 'video/quicktime', 
            'video/x-msvideo', 'video/x-matroska', 'video/x-ms-wmv'
        ];
        const validExtensions = /\.(mp3|wav|mp4|avi|mov|m4a|flac|aac|mkv|wmv)$/i;
        return validTypes.includes(file.type) || validExtensions.test(file.name);
    }

    displayResult(text) {
        this.resultBox.innerHTML = `
            <div class="result-content">
                <div class="result-header">
                    <h3>Transcription Result</h3>
                    <span class="result-meta">${new Date().toLocaleString()}</span>
                </div>
                <div class="result-text">${this.escapeHtml(text)}</div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async copyToClipboard() {
        const text = this.resultBox.innerText;
        try {
            await navigator.clipboard.writeText(text);
            this.showTemporaryMessage('Text copied to clipboard!', 'success');
        } catch (err) {
            this.showTemporaryMessage('Failed to copy text', 'error');
        }
    }

    downloadResult() {
        const text = this.resultBox.innerText;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showTemporaryMessage('Download started!', 'success');
    }

    clearResults() {
        this.resultBox.innerHTML = `
            <div class="result-placeholder">
                <svg class="result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                <p>Your converted text will appear here</p>
            </div>
        `;
        this.updateUIState('ready');
        this.fileInput.value = '';
        this.showProgress(0, 'Ready to process your files');
    }

    updateUIState(state) {
        // Обновляем состояние кнопок
        if (state === 'ready') {
            this.copyBtn.disabled = true;
            this.downloadBtn.disabled = true;
            this.clearBtn.disabled = true;
        } else if (state === 'processing') {
            this.copyBtn.disabled = true;
            this.downloadBtn.disabled = true;
            this.clearBtn.disabled = true;
        } else if (state === 'completed') {
            this.copyBtn.disabled = false;
            this.downloadBtn.disabled = false;
            this.clearBtn.disabled = false;
        }

        // Обновляем прогресс
        if (state === 'ready') {
            this.showProgress(0, 'Ready to process your files');
        }
    }

    showProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
        
        // Анимация прогресса
        if (percent === 100) {
            this.progressFill.style.transition = 'width 0.5s ease';
        } else {
            this.progressFill.style.transition = 'width 0.3s ease';
        }
    }

    showError(message) {
        this.showTemporaryMessage(message, 'error');
        this.updateUIState('ready');
    }

    showTemporaryMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.className = 'temp-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            background: ${type === 'error' ? 'var(--error)' : 
                         type === 'success' ? 'var(--success)' : 
                         type === 'warning' ? 'var(--warning)' : 'var(--accent-primary)'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: var(--font-primary);
            font-weight: 500;
            box-shadow: var(--shadow-lg);
            animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(messageEl);
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.remove();
            }
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Добавляем CSS анимации для сообщений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .result-content {
        text-align: left;
    }
    
    .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--glass-border);
    }
    
    .result-header h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 1.2rem;
    }
    
    .result-meta {
        color: var(--text-secondary);
        font-size: 0.9rem;
    }
    
    .result-text {
        white-space: pre-wrap;
        line-height: 1.6;
        color: var(--text-primary);
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new AudioVideoToTextConverter();
});
