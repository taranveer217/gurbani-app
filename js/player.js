// player.js - Advanced Audio Player

class AudioPlayer {
    constructor() {
        this.audio = document.getElementById('global-audio');
        this.playerEl = document.getElementById('audio-player');
        this.titleEl = document.getElementById('player-title');
        this.subtitleEl = document.getElementById('player-subtitle');
        this.playPauseBtn = document.getElementById('player-play-pause');
        this.prevBtn = document.getElementById('player-prev');
        this.nextBtn = document.getElementById('player-next');
        
        this.progressBar = document.getElementById('player-progress');
        this.progressContainer = document.getElementById('player-progress-container');
        this.timeCurrent = document.getElementById('player-time-current');
        this.timeTotal = document.getElementById('player-time-total');
        
        this.liveBadge = document.getElementById('player-live-badge');
        
        // Expanded controls
        this.repeatBtn = document.getElementById('player-repeat');
        this.speedBtn = document.getElementById('player-speed');
        this.muteBtn = document.getElementById('player-mute');
        this.infoToggleBtn = document.getElementById('player-info-toggle');

        this.currentTrack = null;
        this.isPlaying = false;
        this.isLive = false;
        this.isRepeating = false;
        this.playbackSpeeds = [1, 1.25, 1.5, 2, 0.75];
        this.currentSpeedIdx = 0;

        this.initEventListeners();
    }

    initEventListeners() {
        this.playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePlay(); });
        this.infoToggleBtn.addEventListener('click', () => {
            this.playerEl.classList.toggle('expanded');
        });

        // Audio Events
        this.audio.addEventListener('play', () => this.updateUIState(true));
        this.audio.addEventListener('pause', () => this.updateUIState(false));
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => {
            if (!this.isLive) {
                this.timeTotal.textContent = this.formatTime(this.audio.duration);
            } else {
                this.timeTotal.textContent = 'LIVE';
            }
        });
        this.audio.addEventListener('ended', () => {
            if (this.isRepeating) {
                this.audio.currentTime = 0;
                this.audio.play();
            } else {
                this.updateUIState(false);
            }
        });

        // Progress Bar Seek
        this.progressContainer.addEventListener('click', (e) => {
            if (this.isLive || !this.audio.duration) return;
            const rect = this.progressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            const percent = clickX / width;
            this.audio.currentTime = percent * this.audio.duration;
        });

        // Expanded Controls
        this.repeatBtn.addEventListener('click', () => {
            this.isRepeating = !this.isRepeating;
            this.repeatBtn.style.color = this.isRepeating ? 'var(--accent-gold)' : 'var(--text-primary)';
        });

        this.speedBtn.addEventListener('click', () => {
            this.currentSpeedIdx = (this.currentSpeedIdx + 1) % this.playbackSpeeds.length;
            const speed = this.playbackSpeeds[this.currentSpeedIdx];
            this.audio.playbackRate = speed;
            this.speedBtn.textContent = speed + 'x';
        });

        this.muteBtn.addEventListener('click', () => {
            this.audio.muted = !this.audio.muted;
            this.muteBtn.innerHTML = `<i data-lucide="${this.audio.muted ? 'volume-x' : 'volume-2'}"></i>`;
            if (window.lucide) window.lucide.createIcons();
        });
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    play(trackInfo) {
        if (!trackInfo.url) return;

        this.currentTrack = trackInfo;
        this.isLive = trackInfo.isLive || false;
        
        this.audio.src = trackInfo.url;
        this.audio.load();
        this.audio.playbackRate = this.playbackSpeeds[this.currentSpeedIdx];
        this.audio.play().catch(e => console.error("Playback failed", e));
        
        this.titleEl.textContent = trackInfo.title;
        this.subtitleEl.textContent = trackInfo.subtitle || (this.isLive ? 'Live Broadcast' : 'Gurbani');
        
        this.liveBadge.style.display = this.isLive ? 'inline-block' : 'none';
        this.playerEl.classList.remove('collapsed');

        this.saveContinueListening(trackInfo);
        this.setupMediaSession();
    }

    togglePlay() {
        if (!this.currentTrack) return;
        
        if (this.audio.paused) {
            if (this.isLive && this.audio.error) {
                this.audio.src = this.currentTrack.url; // Resync
            }
            this.audio.play();
        } else {
            this.audio.pause();
        }
    }

    updateUIState(playing) {
        this.isPlaying = playing;
        this.playPauseBtn.innerHTML = `<i data-lucide="${playing ? 'pause' : 'play'}"></i>`;
        if (window.lucide) window.lucide.createIcons();
    }

    updateProgress() {
        if (this.isLive || !this.audio.duration) {
            this.progressBar.style.width = '100%';
            this.timeCurrent.textContent = '--:--';
            return;
        }
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBar.style.width = `${percent}%`;
        this.timeCurrent.textContent = this.formatTime(this.audio.currentTime);
        
        // Update continue listening state periodically
        if (Math.floor(this.audio.currentTime) % 10 === 0) {
            this.saveContinueListening(this.currentTrack, this.audio.currentTime);
        }
    }

    saveContinueListening(track, time = 0) {
        if (this.isLive) return; // Don't save live streams
        const state = { title: track.title, url: track.url, time: time, duration: this.audio.duration || 0 };
        localStorage.setItem('continue_listening', JSON.stringify(state));
        window.UI.renderContinueListening(); // Notify UI
    }

    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: this.currentTrack.title,
                artist: this.currentTrack.subtitle || 'Gurbani Nitnem',
                album: this.isLive ? 'Live Kirtan' : 'Gurbani'
            });
            navigator.mediaSession.setActionHandler('play', () => this.audio.play());
            navigator.mediaSession.setActionHandler('pause', () => this.audio.pause());
            if (!this.isLive) {
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    if (details.fastSeek && 'fastSeek' in this.audio) {
                        this.audio.fastSeek(details.seekTime);
                    } else {
                        this.audio.currentTime = details.seekTime;
                    }
                });
            }
        }
    }
}

window.Player = new AudioPlayer();
