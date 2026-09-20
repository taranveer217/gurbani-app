// ui.js - Advanced UI & State Controller

class UIController {
    constructor() {
        this.screens = document.querySelectorAll('.screen');
        this.navItems = document.querySelectorAll('.nav-item');
        
        // Settings Elements
        this.themeBtns = document.querySelectorAll('.theme-btn');
        this.fontBtns = document.querySelectorAll('.font-btn');
        this.langToggles = document.querySelectorAll('.reader-settings-drawer input[type="checkbox"]');
        
        // Reader Elements
        this.readerScreen = document.getElementById('screen-reader');
        this.readerContent = document.getElementById('reader-content');
        this.readerTitle = document.getElementById('reader-title-bar');
        this.readerSettingsDrawer = document.getElementById('reader-display-options');
        
        this.initSettings();
        this.initNavigation();
        this.bindEvents();
    }

    /* --- INITIALIZATION --- */
    initNavigation() {
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                this.navigateTo(targetId);
            });
        });
    }

    navigateTo(screenId) {
        if (this.readerScreen.classList.contains('active')) {
            this.readerScreen.classList.remove('active');
        }
        this.screens.forEach(s => s.classList.remove('active'));
        this.navItems.forEach(n => n.classList.remove('active'));

        const targetScreen = document.getElementById(screenId);
        if (targetScreen) targetScreen.classList.add('active');

        const navItem = document.querySelector(`.nav-item[data-target="${screenId}"]`);
        if (navItem) navItem.classList.add('active');
    }

    initSettings() {
        // Load Theme
        const savedTheme = localStorage.getItem('theme') || 'theme-traditional';
        document.body.className = document.body.className.replace(/theme-\w+/, savedTheme);
        this.themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === savedTheme);
            btn.addEventListener('click', (e) => {
                const theme = e.target.getAttribute('data-theme');
                document.body.className = document.body.className.replace(/theme-\w+/, theme);
                localStorage.setItem('theme', theme);
                this.themeBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Load Font Size
        const savedFont = localStorage.getItem('font-size') || 'font-size-medium';
        document.body.className = document.body.className.replace(/font-size-\w+/, savedFont);
        this.fontBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-size') === savedFont);
            btn.addEventListener('click', (e) => {
                const size = e.target.getAttribute('data-size');
                document.body.className = document.body.className.replace(/font-size-\w+/, size);
                localStorage.setItem('font-size', size);
                this.fontBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Load Language Toggles
        const defaultLangs = { gurmukhi: true, roman: false, punjabi: true, english: true };
        const savedLangs = JSON.parse(localStorage.getItem('lang-settings')) || defaultLangs;
        
        Object.keys(savedLangs).forEach(lang => {
            document.body.setAttribute(`data-lang-${lang}`, savedLangs[lang]);
            const toggle = document.getElementById(`toggle-${lang}`);
            if (toggle) toggle.checked = savedLangs[lang];
        });

        this.langToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const lang = e.target.id.replace('toggle-', '');
                savedLangs[lang] = e.target.checked;
                document.body.setAttribute(`data-lang-${lang}`, savedLangs[lang]);
                localStorage.setItem('lang-settings', JSON.stringify(savedLangs));
            });
        });
    }

    bindEvents() {
        document.querySelector('.close-reader').addEventListener('click', () => {
            this.readerScreen.classList.remove('active');
        });

        const searchTrigger = document.querySelector('.search-trigger');
        searchTrigger?.addEventListener('click', (event) => {
            event.preventDefault();
            this.navigateTo('screen-gurbani');
            document.getElementById('gurbani-search-input')?.focus({ preventScroll: true });
        });

        document.getElementById('reader-settings-btn').addEventListener('click', () => {
            this.readerSettingsDrawer.classList.toggle('active');
        });

        document.getElementById('download-data-btn').addEventListener('click', async (e) => {
            const button = e.currentTarget;
            button.disabled = true;
            button.textContent = 'Downloading...';
            try {
                await window.API.downloadAllNitnem();
                button.textContent = 'Updated for Offline Use';
            } catch (error) {
                button.textContent = 'Download Failed';
            } finally {
                button.disabled = false;
                this.calculateStorage();
            }
        });

        // Reader Favorite/Bookmark bindings
        document.getElementById('reader-favorite-btn').addEventListener('click', () => this.toggleSavedShabad('favorite'));
        document.getElementById('reader-bookmark-btn').addEventListener('click', () => this.toggleSavedShabad('bookmark'));

        const searchInput = document.getElementById('gurbani-search-input');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            clearSearchBtn.style.display = val.length > 0 ? 'inline-flex' : 'none';
            clearTimeout(searchTimeout);
            const valTrimmed = val.trim();
            if (valTrimmed.length === 0) {
                document.getElementById('gurbani-search-results').innerHTML = '';
                document.getElementById('search-status').textContent = '';
                this.renderSearchFrontPage();
                return;
            }
            document.getElementById('search-front-page').style.display = 'none';
            searchTimeout = setTimeout(() => this.executeSearch(valTrimmed), 600);
        });
        
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
        
        // Search History Clear Binding
        document.getElementById('clear-history-btn').addEventListener('click', () => {
            localStorage.removeItem('recent_searches');
            this.renderSearchFrontPage();
        });

        this.calculateStorage();
        this.initKeyboard();
        this.renderSearchFrontPage();
    }

    /* --- RENDERERS & KEYBOARD --- */
    
    initKeyboard() {
        const keyboardContainer = document.getElementById('gurmukhi-keyboard');
        const keyboardToggleBtn = document.getElementById('keyboard-toggle-btn');
        const keyboardCloseBtn = document.getElementById('keyboard-close-btn');
        const keyboardKeys = document.getElementById('keyboard-keys');
        const searchInput = document.getElementById('gurbani-search-input');
        
        if (!keyboardContainer || !keyboardToggleBtn) return;

        keyboardToggleBtn.addEventListener('click', () => keyboardContainer.classList.toggle('hidden'));
        keyboardCloseBtn.addEventListener('click', () => keyboardContainer.classList.add('hidden'));

        // Exhaustive 35 Akhri + Matras
        const gurmukhiChars = [
            'ੳ', 'ਅ', 'ੲ', 'ਸ', 'ਹ', 'ਕ', 'ਖ', 'ਗ', 'ਘ', 'ਙ',
            'ਚ', 'ਛ', 'ਜ', 'ਝ', 'ਞ', 'ਟ', 'ਠ', 'ਡ', 'ਢ', 'ਣ',
            'ਤ', 'ਥ', 'ਦ', 'ਧ', 'ਨ', 'ਪ', 'ਫ', 'ਬ', 'ਭ', 'ਮ',
            'ਯ', 'ਰ', 'ਲ', 'ਵ', 'ੜ', 'ਸ਼', 'ਖ਼', 'ਗ਼', 'ਜ਼', 'ਫ਼', 'ਲ਼',
            'ੰ', 'ਂ', 'ਃ', 'ਁ', '੍', 'ੱ', 'ੇ', 'ੈ', 'ੋ', 'ੌ', 'ੁ', 'ੂ', 'ਾ', 'ਿ', 'ੀ'
        ];

        let keysHtml = '';
        gurmukhiChars.forEach(char => {
            keysHtml += `<button class="gurmukhi-key" data-char="${char}">${char}</button>`;
        });
        
        keysHtml += `<button class="gurmukhi-key action-key space-key" data-action="space">Space</button>`;
        keysHtml += `<button class="gurmukhi-key action-key backspace-key" data-action="backspace">⌫</button>`;
        keysHtml += `<button class="gurmukhi-key action-key search-key" data-action="search">🔍 Search</button>`;
        
        keyboardKeys.innerHTML = keysHtml;

        keyboardKeys.addEventListener('click', (e) => {
            const btn = e.target.closest('.gurmukhi-key');
            if (!btn) return;

            let val = searchInput.value;
            const action = btn.getAttribute('data-action');
            const char = btn.getAttribute('data-char');

            const start = searchInput.selectionStart ?? val.length;
            const end = searchInput.selectionEnd ?? val.length;
            if (char) {
                val = val.slice(0, start) + char + val.slice(end);
                searchInput.value = val;
                searchInput.setSelectionRange(start + char.length, start + char.length);
            } else if (action === 'space') {
                val = val.slice(0, start) + ' ' + val.slice(end);
                searchInput.value = val;
                searchInput.setSelectionRange(start + 1, start + 1);
            } else if (action === 'backspace') {
                if (start !== end) {
                    val = val.slice(0, start) + val.slice(end);
                    searchInput.value = val;
                    searchInput.setSelectionRange(start, start);
                } else if (start > 0) {
                    val = val.slice(0, start - 1) + val.slice(end);
                    searchInput.value = val;
                    searchInput.setSelectionRange(start - 1, start - 1);
                }
            } else if (action === 'search') {
                keyboardContainer.classList.add('hidden');
                return; // Action only, no input change
            }

            searchInput.dispatchEvent(new Event('input'));
        });
    }

    /* --- STORAGE ENGINE --- */
    renderSearchFrontPage() {
        document.getElementById('search-front-page').style.display = 'block';
        
        // 1. Render Search History
        const searches = JSON.parse(localStorage.getItem('recent_searches')) || [];
        const historyContainer = document.getElementById('search-history-container');
        const chipsContainer = document.getElementById('history-chips');
        
        if (searches.length > 0) {
            historyContainer.style.display = 'block';
            chipsContainer.innerHTML = searches.map(q => `<button class="chip" type="button"></button>`).join('');
            chipsContainer.querySelectorAll('.chip').forEach(chip => {
                const query = searches[Array.from(chipsContainer.children).indexOf(chip)];
                chip.textContent = query;
                chip.addEventListener('click', () => {
                    document.getElementById('gurbani-search-input').value = query;
                    document.getElementById('gurbani-search-input').dispatchEvent(new Event('input'));
                });
            });
        } else {
            historyContainer.style.display = 'none';
        }

        // 2. Render Saved Shabads
        const saved = JSON.parse(localStorage.getItem('saved_shabads')) || [];
        const savedContainer = document.getElementById('favorites-container');
        const savedList = document.getElementById('saved-shabads-list');
        
        if (saved.length > 0) {
            savedContainer.style.display = 'block';
            savedList.innerHTML = saved.map(s => `
                <li class="list-item" data-id="${s.id}">
                    <div style="flex:1;">
                        <h3 class="gurmukhi-text" style="font-size:1.1rem; text-align:left; margin:0;"></h3>
                        <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
                            ${s.type === 'favorite' ? '❤️' : '🔖'} • Ang ${s.ang}
                        </p>
                    </div>
                </li>
            `).join('');
            saved.forEach((item, index) => {
                savedList.querySelectorAll('.list-item h3')[index].textContent = item.firstLine || 'Saved Shabad';
            });
            
            savedList.querySelectorAll('.list-item').forEach(li => {
                li.addEventListener('click', () => {
                    this.openBaniReader(li.getAttribute('data-id'), 'Saved Shabad', true); // true = isShabad
                });
            });
        } else {
            savedContainer.style.display = 'none';
        }
    }

    saveSearchQuery(query) {
        if (!query || query.length < 2) return;
        let searches = JSON.parse(localStorage.getItem('recent_searches')) || [];
        searches = searches.filter(q => q !== query); // Remove duplicate
        searches.unshift(query); // Add to front
        if (searches.length > 15) searches.pop(); // Keep max 15
        localStorage.setItem('recent_searches', JSON.stringify(searches));
    }

    escapeHTML(value) {
        return String(value || '').replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[character]));
    }

    toggleSavedShabad(type) {
        if (!this.currentShabadData) return;
        const shabadId = this.currentShabadData.id;
        let saved = JSON.parse(localStorage.getItem('saved_shabads')) || [];
        const existingIdx = saved.findIndex(s => s.id === shabadId);
        
        if (existingIdx >= 0 && saved[existingIdx].type === type) {
            saved.splice(existingIdx, 1); // Toggle off if clicking the same type
            alert(`${type} removed.`);
        } else {
            if (existingIdx >= 0) saved.splice(existingIdx, 1); // Switch type
            saved.unshift({
                id: shabadId,
                type: type,
                firstLine: this.currentShabadData.firstLine,
                    ang: this.currentShabadData.ang,
                    lines: this.currentShabadData.lines
            });
            alert(`Saved to ${type}s!`);
        }
        localStorage.setItem('saved_shabads', JSON.stringify(saved));
        
        // Update button visual state
        this.updateSavedButtonsState();
    }
    
    updateSavedButtonsState() {
        if (!this.currentShabadData) return;
        const shabadId = this.currentShabadData.id;
        const saved = JSON.parse(localStorage.getItem('saved_shabads')) || [];
        const existing = saved.find(s => s.id === shabadId);
        
        const favBtn = document.getElementById('reader-favorite-btn');
        const bookBtn = document.getElementById('reader-bookmark-btn');
        
        favBtn.style.color = (existing && existing.type === 'favorite') ? '#DC2626' : '';
        bookBtn.style.color = (existing && existing.type === 'bookmark') ? '#FF8C00' : '';
    }

    async calculateStorage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usageMB = (estimate.usage / (1024 * 1024)).toFixed(2);
            document.getElementById('storage-usage').textContent = `${usageMB} MB`;
        }
    }

    renderContinueListening() {
        const state = JSON.parse(localStorage.getItem('continue_listening'));
        const card = document.getElementById('continue-listening-card');
        if (state && state.url) {
            card.style.display = 'flex';
            document.getElementById('continue-title').textContent = state.title;
            document.getElementById('continue-time').textContent = `${window.Player.formatTime(state.time)} / ${window.Player.formatTime(state.duration)}`;
            
            const btn = card.querySelector('.continue-play-btn');
            // Remove old listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => {
                window.Player.play({
                    url: state.url,
                    title: state.title,
                    paathId: state.paathId,
                    resumeTime: state.time,
                    subtitle: 'Nitnem Audio'
                });
            });
        }
    }

    updateRealTimeDate() {
        const today = new Date();
        const optionsEn = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' };
        const enDate = new Intl.DateTimeFormat('en-IN', optionsEn).format(today);
        const paDate = new Intl.DateTimeFormat('pa-IN', optionsEn).format(today);

        const dateEnEl = document.getElementById('live-date-en');
        const datePaEl = document.getElementById('live-date-pa');
        const liveTimeEl = document.getElementById('live-clock-big');
        
        if (dateEnEl) dateEnEl.textContent = enDate;
        if (datePaEl) datePaEl.textContent = paDate;
        if (liveTimeEl) liveTimeEl.textContent = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(today);

        // Use local date string YYYY-MM-DD to avoid timezone shift issues
        return window.API.getCurrentIndiaDate();
    }

    async renderHomeHukamnama() {
        const todayIndiaDate = this.updateRealTimeDate();
        if (!this.clockTimer) {
            this.clockTimer = setInterval(() => {
                const dateKey = this.updateRealTimeDate();
                if (dateKey !== this.currentIndiaDate) {
                    this.currentIndiaDate = dateKey;
                    this.refreshDailyHukamnama(dateKey);
                }
            }, 1000);
        }
        this.currentIndiaDate = todayIndiaDate;
        this.scheduleNextIndiaMidnight();
        this.bindDailyRefreshEvents();
        return this.refreshDailyHukamnama(todayIndiaDate);
    }

    bindDailyRefreshEvents() {
        if (this.dailyRefreshEventsBound) return;
        this.dailyRefreshEventsBound = true;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.refreshDailyHukamnama(this.updateRealTimeDate());
        });
        window.addEventListener('focus', () => this.refreshDailyHukamnama(this.updateRealTimeDate()));
        window.addEventListener('pageshow', () => this.refreshDailyHukamnama(this.updateRealTimeDate()));
        window.addEventListener('online', () => this.refreshDailyHukamnama(this.updateRealTimeDate()));
    }

    scheduleNextIndiaMidnight() {
        if (this.midnightTimer) clearTimeout(this.midnightTimer);
        const delay = Math.max(0, window.API.getNextIndiaMidnight() - Date.now());
        this.midnightTimer = setTimeout(() => {
            const dateKey = this.updateRealTimeDate();
            this.currentIndiaDate = dateKey;
            this.refreshDailyHukamnama(dateKey);
        }, delay + 50);
    }

    setHukamnamaLoading() {
        const morningDateEl = document.getElementById('huk-morning-date');
        const morningAngEl = document.getElementById('huk-morning-ang');
        const morningGurmukhiEl = document.getElementById('huk-morning-gurmukhi');
        const readBtn = document.getElementById('read-morning-btn');
        morningDateEl.textContent = 'Checking for updates...';
        morningAngEl.textContent = '';
        morningGurmukhiEl.textContent = '';
        readBtn.disabled = true;
        morningGurmukhiEl.parentElement.parentElement.querySelectorAll('.hukamnama-retry').forEach(button => button.remove());
    }

    async refreshDailyHukamnama(dateKey = this.updateRealTimeDate()) {
        const requestId = (this.hukamnamaRequestId || 0) + 1;
        this.hukamnamaRequestId = requestId;
        this.currentIndiaDate = dateKey;
        this.scheduleNextIndiaMidnight();
        this.setHukamnamaLoading();

        const data = await window.API.getHukamnama(dateKey);
        if (requestId !== this.hukamnamaRequestId || dateKey !== this.updateRealTimeDate()) return;

        const morningDateEl = document.getElementById('huk-morning-date');
        const morningAngEl = document.getElementById('huk-morning-ang');
        const morningGurmukhiEl = document.getElementById('huk-morning-gurmukhi');
        const readBtn = document.getElementById('read-morning-btn');

        if (data && !data.error && data.hukamnama && data.hukamnama.length > 0) {
            let dateStr = 'Today\'s Hukamnama';
            if (data.date && data.date.gregorian) {
                const g = data.date.gregorian;
                const apiYear = g.year;
                const apiMonth = String(g.monthno).padStart(2, '0');
                const apiDay = String(g.date).padStart(2, '0');
                dateStr = new Date(Date.UTC(apiYear, g.monthno - 1, g.date)).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'long', day: 'numeric', year: 'numeric' });
            }

            morningDateEl.textContent = dateStr;
            const angNum = data.pageno || (data.hukamnama[0] && data.hukamnama[0].line.pageno);
            morningAngEl.textContent = angNum ? `Ang ${angNum}` : '';

            const firstLine = data.hukamnama.find(l => l.line.type === 4) || data.hukamnama[0];
            if (firstLine) {
                morningGurmukhiEl.textContent = firstLine.line.gurmukhi.unicode;
                readBtn.disabled = false;
                this.currentHukamnamaData = data;
                
                const newBtn = readBtn.cloneNode(true);
                readBtn.parentNode.replaceChild(newBtn, readBtn);
                newBtn.addEventListener('click', () => {
                    this.currentReaderType = 'hukamnama';
                    this.renderReaderFromData(`Amrit Vela Hukamnama (${dateStr})`, data.hukamnama);
                });
                if (this.currentReaderType === 'hukamnama' && this.readerScreen.classList.contains('active')) {
                    this.renderReaderFromData(`Amrit Vela Hukamnama (${dateStr})`, data.hukamnama);
                }
            }
        } else {
            morningDateEl.textContent = 'Unable to fetch today\'s Hukamnama';
            morningAngEl.textContent = '';
            morningGurmukhiEl.textContent = data && data.cachedData ? `${data.message || 'The latest verified Hukamnama is from a previous date.'} Previous data is not shown as today.` : (data && data.message ? data.message : 'Please check your connection and try again.');
            readBtn.disabled = true;
            morningGurmukhiEl.parentElement.parentElement.querySelectorAll('.hukamnama-retry').forEach(button => button.remove());
            const retryBtn = document.createElement('button');
            retryBtn.className = 'secondary-btn';
            retryBtn.classList.add('hukamnama-retry');
            retryBtn.type = 'button';
            retryBtn.textContent = 'Retry';
            retryBtn.addEventListener('click', () => this.refreshDailyHukamnama(this.updateRealTimeDate()));
            morningGurmukhiEl.insertAdjacentElement('afterend', retryBtn);
        }

        const watchMorningBtn = document.getElementById('watch-morning-btn');
        if (watchMorningBtn && !watchMorningBtn.dataset.pauseBound) {
            watchMorningBtn.dataset.pauseBound = 'true';
            watchMorningBtn.addEventListener('click', () => {
                if (window.Player) window.Player.pause();
            });
        }

        const listenEveningBtn = document.getElementById('listen-evening-btn');
        if (listenEveningBtn) {
            listenEveningBtn.onclick = () => {
                window.Player.play({ url: 'https://live.sgpc.net:8443/;', title: 'Sri Harmandir Sahib', subtitle: 'Live Audio Stream' });
            };
        }
    }

    async renderNitnemLists() {
        const banis = await window.API.getBanisList();
        if (!banis || !Array.isArray(banis)) {
            document.getElementById('quick-nitnem-grid').innerHTML = '<p class="data-error">Unable to load Nitnem. Please refresh and try again.</p>';
            document.getElementById('nitnem-list').innerHTML = '';
            return;
        }

        // Core Nitnem for quick access
        const coreIds = [1, 2, 3, 4, 5, 7, 11]; // Japji, Jaap, Tav Prasad, Chaupai, Anand, Rehras, Sohila
        const coreBanis = banis.filter(b => coreIds.includes(b.id));

        document.getElementById('quick-nitnem-grid').innerHTML = coreBanis.map(b => `
            <div class="nitnem-card" data-id="${this.escapeHTML(b.id)}">
                <h4>${this.escapeHTML(b.english)}</h4>
                <div class="gurmukhi-text" style="font-size: 1rem; margin-top:5px;">${this.escapeHTML(b.unicode)}</div>
            </div>
        `).join('');

        // Full list for Nitnem tab
        document.getElementById('nitnem-list').innerHTML = banis.map(b => `
            <li class="list-item" data-id="${b.id}">
                <div>
                    <h3>${this.escapeHTML(b.english)}</h3>
                        <p class="gurmukhi-text" style="font-size:1.1rem; margin-top:2px; text-align:left;">${this.escapeHTML(b.unicode)}</p>
                </div>
                <div>
                        ${window.API.getBaniAudioUrl(b.id) ? `<button class="icon-btn play-bani-btn" data-id="${this.escapeHTML(b.id)}" data-title="${this.escapeHTML(b.english)}" aria-label="Play Audio"><i data-lucide="play-circle"></i></button>` : '<span class="audio-unavailable">Audio unavailable</span>'}
                </div>
            </li>
        `).join('');

        // Bind clicking card/list to open reader
        document.querySelectorAll('.nitnem-card, .list-item[data-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.play-bani-btn')) return; // Ignore if clicking play btn
                const id = parseInt(el.getAttribute('data-id'));
                if (el.classList.contains('nitnem-card')) {
                    const audio = window.API.getBaniAudio(id);
                    if (audio) window.Player.play({ ...audio, subtitle: 'Nitnem Audio', isLive: false });
                    return;
                }
                this.openBaniReader(id, el.querySelector('h4, h3').textContent);
            });
        });

        // Bind Play buttons
        document.querySelectorAll('.play-bani-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                const title = btn.getAttribute('data-title');
                const audio = window.API.getBaniAudio(id);
                if (audio) window.Player.play({ ...audio, subtitle: 'Nitnem Audio', isLive: false });
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }

    async openBaniReader(id, title, isShabad = false) {
        this.currentReaderType = 'other';
        this.readerTitle.textContent = title;
        this.readerContent.innerHTML = '<div class="loading-spinner">Loading from Database...</div>';
        this.readerScreen.classList.add('active');
        this.readerSettingsDrawer.classList.remove('active');

        try {
            const savedItem = isShabad ? (JSON.parse(localStorage.getItem('saved_shabads')) || []).find(item => String(item.id) === String(id)) : null;
            const data = savedItem && savedItem.lines ? { shabad: savedItem.lines } : (isShabad ? await window.API.getShabad(id) : await window.API.getBani(id));
            if (data && data.error) throw new Error(data.message);
            
            const targetArray = isShabad ? data.shabad : data.bani;
            if (targetArray && targetArray.length > 0) {
                // Save context for saving/bookmarking
                if (isShabad) {
                    this.currentShabadData = {
                        id: (data.shabadinfo && data.shabadinfo.shabadid) || targetArray[0].line.shabadid || id,
                        firstLine: targetArray[0].line.gurmukhi ? targetArray[0].line.gurmukhi.unicode : '',
                        ang: (data.shabadinfo && data.shabadinfo.pageno) || targetArray[0].line.pageno,
                        lines: targetArray
                    };
                    this.updateSavedButtonsState();
                    document.getElementById('reader-favorite-btn').style.display = 'inline-flex';
                    document.getElementById('reader-bookmark-btn').style.display = 'inline-flex';
                } else {
                    this.currentShabadData = null;
                    document.getElementById('reader-favorite-btn').style.display = 'none';
                    document.getElementById('reader-bookmark-btn').style.display = 'none';
                }
                
                this.renderReaderFromData(title, targetArray);
            } else {
                throw new Error("No data found.");
            }
        } catch (e) {
            this.readerContent.textContent = '';
            const error = document.createElement('div');
            error.className = 'loading-spinner';
            error.style.color = 'var(--text-gurmukhi)';
            error.textContent = e.message || 'Error loading Bani. Connect to internet to cache.';
            const back = document.createElement('button');
            back.className = 'secondary-btn';
            back.type = 'button';
            back.textContent = 'Go Back';
            back.addEventListener('click', () => this.readerScreen.classList.remove('active'));
            error.appendChild(document.createElement('br'));
            error.appendChild(document.createElement('br'));
            error.appendChild(back);
            this.readerContent.appendChild(error);
        }
    }

    renderReaderFromData(title, linesArray) {
        this.readerTitle.textContent = title;
        
        let html = '';
        linesArray.forEach(item => {
            const line = item.line;
            if (!line) return;
            
            const gurmukhi = line.gurmukhi ? line.gurmukhi.unicode : '';
            const punjabi = line.translation && line.translation.punjabi && line.translation.punjabi.default ? line.translation.punjabi.default.unicode : '';
            const english = line.translation && line.translation.english ? line.translation.english.default : '';
            const roman = line.transliteration && line.transliteration.english ? line.transliteration.english.text : '';

            // Handle translations missing based on user request (Show explicitly if missing but allowed, else CSS handles it)
            html += `
                <div class="bani-stanza">
                    <div class="gurmukhi-text">${this.escapeHTML(gurmukhi)}</div>
                    <div class="roman-text">${this.escapeHTML(roman) || '<span style="opacity:0.5;">Transliteration not available.</span>'}</div>
                    <div class="punjabi-text">${this.escapeHTML(punjabi) || '<span style="opacity:0.5;">Translation not available.</span>'}</div>
                    <div class="english-text">${this.escapeHTML(english) || '<span style="opacity:0.5;">Translation not available.</span>'}</div>
                </div>
            `;
        });
        this.readerContent.innerHTML = html;
        this.readerScreen.classList.add('active');
        this.readerContent.scrollTop = 0;
    }

    async executeSearch(query) {
        const resultsContainer = document.getElementById('gurbani-search-results');
        const status = document.getElementById('search-status');
        
        status.innerHTML = 'ਗੁਰਬਾਣੀ ਖੋਜ ਰਹੇ ਹਾਂ…<br><span style="font-size:0.75rem; color:var(--text-secondary); font-family:\'Inter\', sans-serif;">Searching Gurbani...</span>';
        resultsContainer.innerHTML = '';
        
        const isGurmukhi = /[\u0A00-\u0A7F]/.test(query);
        let searchType = 0; // 0 = First Letter Start (Default)

        if (isGurmukhi) {
            // If the query has spaces or Gurmukhi matras (vowels), it's likely a full word search
            const hasMatras = /[\u0A3E-\u0A4C\u0A70\u0A71]/.test(query);
            if (hasMatras || query.includes(' ')) {
                searchType = 2; // 2 = Full Word (Gurmukhi)
            } else {
                searchType = 0; // 0 = First Letter from start
            }
        } else {
            // Check if it looks like an English translation sentence
            const words = query.trim().split(/\s+/);
            const isFullEnglish = words.length > 1 && words.every(w => w.length > 2);
            if (isFullEnglish) {
                searchType = 3; // 3 = Full Word (English Translation)
            } else {
                searchType = 0; // 0 = First Letter from start
            }
        }

        try {
            const data = await window.API.search(query, searchType);
            
            if (data && data.error) {
                throw new Error(data.message);
            }
            
            if (data && data.shabads && data.shabads.length > 0) {
                this.saveSearchQuery(query);
                status.textContent = `Found ${data.count} results for "${query}"`;
                
                resultsContainer.innerHTML = data.shabads.map(item => {
                    const line = item.shabad;
                    const pageno = line.pageno || 'Unknown';
                    const raag = line.raag ? line.raag.english : 'Unknown Raag';
                    const writer = line.writer ? line.writer.english : 'Unknown Mahalla';
                    const source = line.source ? line.source.english : 'Gurbani';
                    
                    return `
                    <li class="list-item search-result-item" data-shabad-id="${this.escapeHTML(line.shabadid)}" style="display:flex; flex-direction:column; align-items:flex-start; cursor:pointer;">
                        <p class="gurmukhi-text" style="font-size:1.3rem; text-align:left; color:var(--text-gurmukhi); margin-bottom: 2px;">${this.escapeHTML(line.gurmukhi && line.gurmukhi.unicode)}</p>
                        <p class="roman-text" style="font-size:0.95rem; text-align:left; color:var(--text-primary); margin-bottom: 4px;">${this.escapeHTML(line.transliteration && line.transliteration.english && line.transliteration.english.text)}</p>
                        <div class="shabad-result-meta" style="margin-top:0.25rem;">
                            <span>Ang ${pageno}</span>
                            <span>${raag}</span>
                            <span>${writer}</span>
                            <span>${source}</span>
                        </div>
                    </li>`;
                }).join('');

                if (window.lucide) window.lucide.createIcons();

                document.querySelectorAll('li[data-shabad-id]').forEach(li => {
                    li.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const id = li.getAttribute('data-shabad-id');
                        const sourceTitle = li.querySelector('.shabad-result-meta span:last-child').textContent || 'Gurbani';
                        this.openBaniReader(id, sourceTitle, true);
                    });
                });

            } else {
                status.innerHTML = 'ਕੋਈ ਨਤੀਜਾ ਨਹੀਂ ਮਿਲਿਆ<br><span style="font-size:0.8rem; color:var(--text-secondary); font-family:\'Inter\', sans-serif;">No verified Gurbani result found. Try typing the first letters of each word in english.</span>';
            }
        } catch(e) {
            status.textContent = e.message || 'Unable to search verified Gurbani.';
            const retry = document.createElement('button');
            retry.className = 'secondary-btn';
            retry.type = 'button';
            retry.textContent = 'Retry';
            retry.addEventListener('click', () => this.executeSearch(query));
            status.appendChild(document.createElement('br'));
            status.appendChild(document.createElement('br'));
            status.appendChild(retry);
        }
    }

    renderKirtanStations() {
        const list = window.API.getLiveStations();
        const container = document.getElementById('kirtan-list');
        
        container.innerHTML = list.map(station => `
            <div class="card kirtan-card" data-url="${station.url}" data-title="${station.name}">
                <div class="kirtan-card-icon">
                    <i data-lucide="radio"></i>
                </div>
                <div class="kirtan-card-info">
                    <h3>${this.escapeHTML(station.name)}</h3>
                    <p>${this.escapeHTML(station.source)}</p>
                    <div class="live-indicator"><span class="live-dot"></span> STREAM SOURCE</div>
                </div>
                <button class="kirtan-play-btn"><i data-lucide="play"></i></button>
            </div>
        `).join('');

        document.querySelectorAll('.kirtan-card').forEach(el => {
            el.addEventListener('click', () => {
                const url = el.getAttribute('data-url');
                const title = el.getAttribute('data-title');
                window.Player.play({ url, title, isLive: true });
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }
}

window.UI = new UIController();
