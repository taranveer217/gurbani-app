// api.js - Gurbani data layer

const API_BASE_URL = 'https://api.gurbaninow.com/v2';
const DATA_CACHE_NAME = 'gurbani-data-cache-v2';
const REQUEST_TIMEOUT_MS = 15000;
const NITNEM_AUDIO = Object.freeze({
    1: { paathId: 'japji-sahib', title: 'Jap Ji Sahib', url: 'https://www.sikhnet.com/gurbani/audio/play/7334' },
    2: { paathId: 'jaap-sahib', title: 'Jaap Sahib', url: 'https://www.sikhnet.com/gurbani/audio/play/7333' },
    3: { paathId: 'tav-prasad-savaiye', title: 'Tav Prasad Savaiye', url: 'https://www.sikhnet.com/gurbani/audio/play/7332' },
    4: { paathId: 'benti-chaupai-sahib', title: 'Benti Chaupai Sahib', url: 'https://www.sikhnet.com/gurbani/audio/play/7331' },
    5: { paathId: 'anand-sahib', title: 'Anand Sahib', url: 'https://www.sikhnet.com/gurbani/audio/play/70125' },
    7: { paathId: 'rehras-sahib', title: 'Rehras Sahib', url: 'https://www.sikhnet.com/gurbani/audio/play/7328' },
    11: { paathId: 'sohila-sahib', title: 'Sohila Sahib', url: 'https://www.sikhnet.com/gurbani/audio/play/70127' }
});
const HUKAMNAMA_SOURCES = {
    sgpc: 'https://sgpc.net/hukamnama/',
    sgpcProxy: `https://api.allorigins.win/get?url=${encodeURIComponent('https://sgpc.net/hukamnama/')}`,
    gurbaniNow: `${API_BASE_URL}/hukamnama/today`,
    sikhNet: 'https://www.sikhnet.com/hukam'
};

function getIndiaDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
}

function getHukamnamaDate(data) {
    const gregorian = data && data.date && data.date.gregorian;
    if (!gregorian || !gregorian.year || !gregorian.monthno || !gregorian.date) return null;
    return `${gregorian.year}-${String(gregorian.monthno).padStart(2, '0')}-${String(gregorian.date).padStart(2, '0')}`;
}

function getNextIndiaMidnightTimestamp(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});
    const nextDayUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1);
    return nextDayUtc - (5 * 60 + 30) * 60 * 1000;
}


function toAsciiDigits(value) {
    return String(value).replace(/[੦-੯]/g, digit => String('੦੧੨੩੪੫੬੭੮੯'.indexOf(digit)));
}

function parseDateKey(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parsePunjabiDate(text) {
    const months = {
        ਜਨਵਰੀ: 1, ਫ਼ਰਵਰੀ: 2, ਮਾਰਚ: 3, ਅਪ੍ਰੈਲ: 4, ਮਈ: 5, ਜੂਨ: 6,
        ਜੁਲਾਈ: 7, ਅਗਸਤ: 8, ਸਤੰਬਰ: 9, ਅਕਤੂਬਰ: 10, ਨਵੰਬਰ: 11, ਦਸੰਬਰ: 12
    };
    const monthPattern = Object.keys(months).join('|');
    const match = String(text).match(new RegExp(`([੦-੯0-9]{1,2})\\s*(?:${monthPattern})[^੦-੯0-9]{0,30}([੦-੯0-9]{4})`));
    if (!match) return null;
    const monthName = Object.keys(months).find(month => match[0].includes(month));
    return parseDateKey(Number(toAsciiDigits(match[2])), months[monthName], Number(toAsciiDigits(match[1])));
}

function makeGurbaniNowData(data, source) {
    return { ...data, source };
}

function parseSgpcHukamnama(html, requestedDate) {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const bodyText = document.body ? document.body.innerText : '';
    const date = parsePunjabiDate(bodyText);
    if (date !== requestedDate) throw new Error(`SGPC returned ${date || 'an undated page'}`);

    const candidates = Array.from(document.querySelectorAll('article, section, div, p'))
        .map(element => element.innerText || '')
        .filter(text => text.includes('ੴ') && text.includes('ਅੰਗ') && text.length > 100)
        .sort((left, right) => left.length - right.length);
    const candidate = candidates[0] || '';
    const dateIndex = candidate.search(/[੦-੯0-9]{1,2}\s*(?:ਜਨਵਰੀ|ਫ਼ਰਵਰੀ|ਮਾਰਚ|ਅਪ੍ਰੈਲ|ਮਈ|ਜੂਨ|ਜੁਲਾਈ|ਅਗਸਤ|ਸਤੰਬਰ|ਅਕਤੂਬਰ|ਨਵੰਬਰ|ਦਸੰਬਰ)/);
    const text = (dateIndex >= 0 ? candidate.slice(0, dateIndex) : candidate).trim();
    const angMatch = candidate.match(/ਅੰਗ\s*[:：]\s*([੦-੯0-9]+)/);
    const ang = angMatch ? Number(toAsciiDigits(angMatch[1])) : null;
    if (!text || !ang || !/[\u0A00-\u0A7F]/.test(text)) throw new Error('SGPC response did not contain complete Unicode Gurmukhi text');

    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    return {
        source: 'SGPC',
        verifiedDate: requestedDate,
        date: { gregorian: { year: Number(requestedDate.slice(0, 4)), monthno: Number(requestedDate.slice(5, 7)), date: Number(requestedDate.slice(8, 10)) } },
        pageno: ang,
        hukamnamainfo: { pageno: ang },
        hukamnama: lines.map((unicode, index) => ({ line: { id: `sgpc-${index}`, type: 4, pageno: ang, gurmukhi: { unicode } } }))
    };
}

async function fetchTextWithCache(url) {
    return API.fetchWithCache(url, { forceNetwork: true, allowCachedFallback: true, responseType: 'text' });
}

async function completeSgpcHukamnama(data) {
    const titleLine = data.hukamnama.find(item => item.line.gurmukhi.unicode.includes('ਭਗਤ'));
    if (!titleLine) throw new Error('SGPC Hukamnama title was not found');
    const query = titleLine.line.gurmukhi.unicode.replace(/[॥|]/g, '').trim();
    const search = await API.search(query, 2);
    const match = search && Array.isArray(search.shabads) ? search.shabads.find(item => item.shabad && item.shabad.pageno === data.pageno) : null;
    if (!match || !match.shabad.shabadid) throw new Error('Unicode Shabad match was not found');
    const full = await API.getShabad(match.shabad.shabadid);
    if (!full || !Array.isArray(full.shabad) || !full.shabad.length || !full.shabadinfo || full.shabadinfo.pageno !== data.pageno) {
        throw new Error('Unicode Shabad match was incomplete or had a different Ang');
    }
    return { ...data, hukamnama: full.shabad, hukamnamainfo: full.shabadinfo, source: 'SGPC + GurbaniNow' };
}

const API = {
    async fetchWithCache(url, options = {}) {
        const { forceNetwork = false, allowCachedFallback = true, responseType = 'json' } = options;
        let cache;
        try {
            cache = await caches.open(DATA_CACHE_NAME);
            const cachedResponse = await cache.match(url);
            if (cachedResponse && !forceNetwork) {
                return { data: responseType === 'text' ? await cachedResponse.text() : await cachedResponse.json(), cached: true };
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
            const fetchResponse = await fetch(url, { signal: controller.signal, cache: 'no-store' });
            clearTimeout(timeout);
            if (!fetchResponse.ok) throw new Error(`API returned ${fetchResponse.status}`);
            const data = responseType === 'text' ? await fetchResponse.text() : await fetchResponse.json();
            await cache.put(url, new Response(responseType === 'text' ? data : JSON.stringify(data), {
                headers: { 'Content-Type': responseType === 'text' ? 'text/html; charset=utf-8' : 'application/json' }
            }));
            return { data, cached: false };
        } catch (error) {
            console.error('Fetch error:', error);
            if (allowCachedFallback && cache) {
                const fallbackResponse = await cache.match(url);
                if (fallbackResponse) return { data: responseType === 'text' ? await fallbackResponse.text() : await fallbackResponse.json(), cached: true };
            }
            return { error: true, type: 'network', message: 'Gurbani data could not be loaded. Please check your internet connection and try again.' };
        }
    },

    async getHukamnama(dateKey = getIndiaDateKey()) {
        this.hukamnamaRequests = this.hukamnamaRequests || {};
        if (this.hukamnamaRequests[dateKey]) return this.hukamnamaRequests[dateKey];

        const request = (async () => {
            const sources = [
            async () => {
                const result = await this.fetchWithCache(HUKAMNAMA_SOURCES.sgpcProxy, { forceNetwork: true, allowCachedFallback: true });
                if (result.error) throw new Error(result.message);
                if (!result.data || !result.data.contents) throw new Error('SGPC transport returned no page contents');
                return { ...(await completeSgpcHukamnama(parseSgpcHukamnama(result.data.contents, dateKey))), cached: result.cached };
            },
            async () => {
                const result = await fetchTextWithCache(HUKAMNAMA_SOURCES.sgpc);
                if (result.error) throw new Error(result.message);
                return { ...(await completeSgpcHukamnama(parseSgpcHukamnama(result.data, dateKey))), cached: result.cached };
            },
            async () => {
                const result = await this.fetchWithCache(`${HUKAMNAMA_SOURCES.gurbaniNow}?date=${encodeURIComponent(dateKey)}`, { forceNetwork: true, allowCachedFallback: true });
                if (result.error) throw new Error(result.message);
                const date = getHukamnamaDate(result.data);
                if (date !== dateKey || !result.data.hukamnama || !result.data.hukamnama.length) throw new Error(`GurbaniNow returned ${date || 'an undated response'}`);
                return { ...makeGurbaniNowData(result.data, 'GurbaniNow'), cached: result.cached, verifiedDate: date };
            },
            async () => {
                const result = await fetchTextWithCache(`${HUKAMNAMA_SOURCES.sikhNet}/archive/${encodeURIComponent(dateKey)}`);
                if (result.error) throw new Error(result.message);
                const parsed = parseSgpcHukamnama(result.data, dateKey);
                return { ...parsed, source: 'SikhNet', cached: result.cached };
            }
            ];

            for (const source of sources) {
                try {
                    return await source();
                } catch (error) {
                    console.warn('Hukamnama source rejected:', error.message);
                }
            }
            return {
                error: true,
                type: 'hukamnama-unavailable',
                message: "Today's Hukamnama could not be retrieved right now. Please try again shortly.",
                expectedDate: dateKey
            };
        })();
        this.hukamnamaRequests[dateKey] = request;
        try {
            return await request;
        } finally {
            delete this.hukamnamaRequests[dateKey];
        }
    },

    getCurrentIndiaDate() {
        return getIndiaDateKey();
    },

    getNextIndiaMidnight() {
        return getNextIndiaMidnightTimestamp();
    },

    async getBanisList() {
        // Fetch full list of banis from GurbaniNow
        const result = await this.fetchWithCache(`${API_BASE_URL}/banis`);
        return result.error ? result : result.data;
    },

    async getBani(id) {
        const result = await this.fetchWithCache(`${API_BASE_URL}/banis/${id}`);
        return result.error ? result : result.data;
    },

    async getShabad(id) {
        const result = await this.fetchWithCache(`${API_BASE_URL}/shabad/${id}`);
        return result.error ? result : result.data;
    },

    async search(query, searchType = 0) {
        // SearchTypes: 0=FirstLetter Start, 1=AnyFirstLetter, 2=FullWord (Gurmukhi), 3=English Translation
        const result = await this.fetchWithCache(`${API_BASE_URL}/search/${encodeURIComponent(query)}?searchtype=${searchType}`);
        return result.error ? result : result.data;
    },

    getLiveStations() {
        return [
            { id: 'sgpc', name: 'Sri Harmandir Sahib (Darbar Sahib)', source: 'SGPC live stream', url: 'https://live.sgpc.net:8443/;', isLive: true }
        ];
    },

    getBaniAudioUrl(baniId) {
        return null;
    },

    getBaniAudio(baniId) {
        return NITNEM_AUDIO[baniId] || null;
    },

    async downloadAllNitnem() {
        // Pre-cache all core banis for offline use
        const coreBaniIds = [1, 2, 3, 4, 5, 7, 11, 12, 13, 14]; // Core ones
        let progress = 0;
        for (const id of coreBaniIds) {
            const data = await this.getBani(id);
            if (!data || data.error) throw new Error(`Unable to cache Bani ${id}`);
            progress += (100 / coreBaniIds.length);
        }
        return true;
    }
};

window.API = API;
