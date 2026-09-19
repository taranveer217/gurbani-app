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

        document.getElementById('reader-settings-btn').addEventListener('click', () => {
            this.readerSettingsDrawer.classList.toggle('active');
        });

        document.getElementById('download-data-btn').addEventListener('click', async (e) => {
            e.target.textContent = 'Downloading...';
            await window.API.downloadAllNitnem();
            e.target.textContent = 'Downloaded (Available Offline)';
            this.calculateStorage();
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

            if (char) {
                val += char;
            } else if (action === 'space') {
                val += ' ';
            } else if (action === 'backspace') {
                val = val.slice(0, -1);
            } else if (action === 'search') {
                keyboardContainer.classList.add('hidden');
                return; // Action only, no input change
            }

            searchInput.value = val;
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
            chipsContainer.innerHTML = searches.map(q => `<button class="chip">${q}</button>`).join('');
            chipsContainer.querySelectorAll('.chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    document.getElementById('gurbani-search-input').value = chip.textContent;
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
                        <h3 class="gurmukhi-text" style="font-size:1.1rem; text-align:left; margin:0;">${s.firstLine}</h3>
                        <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
                            ${s.type === 'favorite' ? '❤️' : '🔖'} • Ang ${s.ang}
                        </p>
                    </div>
                </li>
            `).join('');
            
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
                ang: this.currentShabadData.ang
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
                window.Player.play({ url: state.url, title: state.title });
                window.Player.audio.currentTime = state.time; // Seek to last point
            });
        }
    }

    updateRealTimeDate() {
        const today = new Date();
        const optionsEn = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        
        let paDate = '';
        let enDate = '';
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        enDate = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
        
        try {
            paDate = new Intl.DateTimeFormat('pa-IN', optionsEn).format(today);
        } catch (e) {
            console.warn("Browser does not support Punjabi locale automatically.");
            paDate = "ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ";
        }

        const dateEnEl = document.getElementById('live-date-en');
        const datePaEl = document.getElementById('live-date-pa');
        const liveTimeEl = document.getElementById('live-clock-big');
        
        if (dateEnEl) dateEnEl.textContent = enDate;
        if (datePaEl) datePaEl.textContent = paDate;
        if (liveTimeEl) liveTimeEl.textContent = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Use local date string YYYY-MM-DD to avoid timezone shift issues
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async renderHomeHukamnama() {
        const todayLocalStr = this.updateRealTimeDate();
        setInterval(() => this.updateRealTimeDate(), 1000); // Update time every second

        const data = await window.API.getHukamnama();
        const morningDateEl = document.getElementById('huk-morning-date');
        const morningAngEl = document.getElementById('huk-morning-ang');
        const morningGurmukhiEl = document.getElementById('huk-morning-gurmukhi');
        const readBtn = document.getElementById('read-morning-btn');

        if (data && data.hukamnama && data.hukamnama.length > 0) {
            let dateStr = 'Today\'s Hukamnama';
            let isPreviousDay = false;
            
            if (data.date && data.date.gregorian) {
                const g = data.date.gregorian;
                // API returns gregorian: { monthno: 9, date: 19, year: 2026 }
                const apiYear = g.year;
                const apiMonth = String(g.monthno).padStart(2, '0');
                const apiDay = String(g.date).padStart(2, '0');
                const apiDateLocalStr = `${apiYear}-${apiMonth}-${apiDay}`;
                
                const parsedDate = new Date(apiYear, g.monthno - 1, g.date);
                if (!isNaN(parsedDate.getTime())) {
                    dateStr = parsedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
                    if (apiDateLocalStr !== todayLocalStr) {
                        isPreviousDay = true;
                    }
                }
            }

            if (isPreviousDay) {
                morningDateEl.innerHTML = `${dateStr} <span style="font-size:0.7rem; background:var(--accent-gold); color:var(--accent-navy); padding:2px 4px; border-radius:4px; margin-left:4px;">Previous Day</span>`;
            } else {
                morningDateEl.textContent = dateStr;
            }
            
            const angNum = data.pageno || (data.hukamnama[0] && data.hukamnama[0].line.pageno);
            morningAngEl.textContent = angNum ? `Ang ${angNum}` : '';

            const firstLine = data.hukamnama.find(l => l.line.type === 4) || data.hukamnama[0];
            if (firstLine) {
                morningGurmukhiEl.textContent = firstLine.line.gurmukhi.unicode;
                readBtn.disabled = false;
                
                const newBtn = readBtn.cloneNode(true);
                readBtn.parentNode.replaceChild(newBtn, readBtn);
                newBtn.addEventListener('click', () => {
                    this.renderReaderFromData(`Amrit Vela Hukamnama (${dateStr})`, data.hukamnama);
                });
            }
        } else {
            morningDateEl.textContent = "Error fetching from Sri Darbar Sahib.";
            morningAngEl.textContent = '';
            morningGurmukhiEl.textContent = '';
            readBtn.disabled = true;
        }

        // Setup Amrit Vela Watch Action (Native HTML Link)
        const watchMorningBtn = document.getElementById('watch-morning-btn');
        if (watchMorningBtn) {
            watchMorningBtn.addEventListener('click', () => {
                if (window.Player) window.Player.pause(); // Pause background audio
            });
        }

        // Setup Sandhya Vela Actions (Fallback to Official Sources)
        document.getElementById('listen-evening-btn').addEventListener('click', () => {
            window.Player.play({ url: 'https://live.sgpc.net:8443/;', title: 'Sri Harmandir Sahib', subtitle: 'Live Audio Stream' });
        });
        const watchEveningBtn = document.getElementById('watch-evening-btn');
        if (watchEveningBtn) {
            watchEveningBtn.addEventListener('click', () => {
                if (window.Player) window.Player.pause(); // Pause background audio
            });
        }
    }

    async renderNitnemLists() {
        const banis = await window.API.getBanisList();
        if (!banis || !Array.isArray(banis)) return;

        // Core Nitnem for quick access
        const coreIds = [1, 2, 3, 4, 5, 7, 11]; // Japji, Jaap, Tav Prasad, Chaupai, Anand, Rehras, Sohila
        const coreBanis = banis.filter(b => coreIds.includes(b.id));

        document.getElementById('quick-nitnem-grid').innerHTML = coreBanis.map(b => `
            <div class="nitnem-card" data-id="${b.id}">
                <h4>${b.english}</h4>
                <div class="gurmukhi-text" style="font-size: 1rem; margin-top:5px;">${b.unicode}</div>
            </div>
        `).join('');

        // Full list for Nitnem tab
        document.getElementById('nitnem-list').innerHTML = banis.map(b => `
            <li class="list-item" data-id="${b.id}">
                <div>
                    <h3>${b.english}</h3>
                    <p class="gurmukhi-text" style="font-size:1.1rem; margin-top:2px; text-align:left;">${b.unicode}</p>
                </div>
                <div>
                    <button class="icon-btn play-bani-btn" data-id="${b.id}" data-title="${b.english}" aria-label="Play Audio">
                        <i data-lucide="play-circle"></i>
                    </button>
                </div>
            </li>
        `).join('');

        // Bind clicking card/list to open reader
        document.querySelectorAll('.nitnem-card, .list-item[data-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.play-bani-btn')) return; // Ignore if clicking play btn
                this.openBaniReader(parseInt(el.getAttribute('data-id')), el.querySelector('h4, h3').textContent);
            });
        });

        // Bind Play buttons
        document.querySelectorAll('.play-bani-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                const title = btn.getAttribute('data-title');
                const url = window.API.getBaniAudioUrl(id);
                window.Player.play({ url, title });
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }

    async openBaniReader(id, title, isShabad = false) {
        this.readerTitle.textContent = title;
        this.readerContent.innerHTML = '<div class="loading-spinner">Loading from Database...</div>';
        this.readerScreen.classList.add('active');
        this.readerSettingsDrawer.classList.remove('active');

        try {
            const data = isShabad ? await window.API.getShabad(id) : await window.API.getBani(id);
            if (data && data.error) throw new Error(data.message);
            
            const targetArray = isShabad ? data.shabad : data.bani;
            if (targetArray && targetArray.length > 0) {
                // Save context for saving/bookmarking
                if (isShabad) {
                    this.currentShabadData = {
                        id: targetArray[0].line.shabadid,
                        firstLine: targetArray[0].line.gurmukhi.unicode,
                        ang: targetArray[0].line.pageno
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
            this.readerContent.innerHTML = `<div class="loading-spinner" style="color:var(--text-gurmukhi);">${e.message || 'Error loading Bani. Connect to internet to cache.'} <br><br> <button class="secondary-btn" onclick="document.querySelector('.close-reader').click()">Go Back</button></div>`;
        }
    }

    renderReaderFromData(title, linesArray) {
        this.readerTitle.textContent = title;
        
        let html = '';
        linesArray.forEach(item => {
            const line = item.line;
            if (!line) return;
            
            const gurmukhi = line.gurmukhi ? line.gurmukhi.unicode : '';
            const punjabi = line.translation && line.translation.punjabi ? line.translation.punjabi.default.unicode : '';
            const english = line.translation && line.translation.english ? line.translation.english.default : '';
            const roman = line.transliteration && line.transliteration.english ? line.transliteration.english.text : '';

            // Handle translations missing based on user request (Show explicitly if missing but allowed, else CSS handles it)
            html += `
                <div class="bani-stanza">
                    <div class="gurmukhi-text">${gurmukhi}</div>
                    <div class="roman-text">${roman || '<span style="opacity:0.5;">Transliteration not available.</span>'}</div>
                    <div class="punjabi-text">${punjabi || '<span style="opacity:0.5;">Translation not available.</span>'}</div>
                    <div class="english-text">${english || '<span style="opacity:0.5;">Translation not available.</span>'}</div>
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
                    const line = item.shabad.shabadinfo.line; 
                    const pageno = item.shabad.shabadinfo.pageno || 'Unknown';
                    const raag = item.shabad.shabadinfo.raag ? item.shabad.shabadinfo.raag.english : 'Unknown Raag';
                    const writer = item.shabad.shabadinfo.writer ? item.shabad.shabadinfo.writer.english : 'Unknown Mahalla';
                    const source = item.shabad.shabadinfo.source ? item.shabad.shabadinfo.source.english : 'Gurbani';
                    
                    return `
                    <li class="list-item search-result-item" data-shabad-id="${item.shabad.shabadinfo.id}" style="display:flex; flex-direction:column; align-items:flex-start; cursor:pointer;">
                        <p class="gurmukhi-text" style="font-size:1.3rem; text-align:left; color:var(--text-gurmukhi); margin-bottom: 2px;">${line.gurmukhi.unicode}</p>
                        <p class="roman-text" style="font-size:0.95rem; text-align:left; color:var(--text-primary); margin-bottom: 4px;">${line.transliteration.english.text}</p>
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
            status.innerHTML = `<span style="color:var(--text-gurmukhi);">${e.message}</span><br><br><button class="secondary-btn" onclick="window.UI.executeSearch('${query}')">Retry</button>`;
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
                    <h3>${station.name}</h3>
                    <p>${station.source}</p>
                    <div class="live-indicator"><span class="live-dot"></span> LIVE NOW</div>
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
