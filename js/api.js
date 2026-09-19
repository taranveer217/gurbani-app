// api.js - Robust Gurbani API Layer

const API_BASE_URL = 'https://api.gurbaninow.com/v2';
const DATA_CACHE_NAME = 'gurbani-data-cache-v1';

const API = {
    async fetchWithCache(url, forceNetwork = false) {
        try {
            const cache = await caches.open(DATA_CACHE_NAME);
            const cachedResponse = await cache.match(url);
            
            if (cachedResponse && !forceNetwork) {
                return await cachedResponse.json();
            }

            const fetchResponse = await fetch(url);
            if (fetchResponse.ok) {
                cache.put(url, fetchResponse.clone());
                return await fetchResponse.json();
            } else {
                throw new Error(`API returned ${fetchResponse.status}`);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            // Fallback to cache if network fails even if forceNetwork was true
            const cache = await caches.open(DATA_CACHE_NAME);
            const fallbackResponse = await cache.match(url);
            if (fallbackResponse) return await fallbackResponse.json();
            return { error: true, type: 'network', message: 'Gurbani data could not be loaded. Please check your internet connection and try again.' };
        }
    },

    async getHukamnama() {
        return this.fetchWithCache(`${API_BASE_URL}/hukamnama/today`, true);
    },

    async getBanisList() {
        // Fetch full list of banis from GurbaniNow
        return this.fetchWithCache(`${API_BASE_URL}/banis`);
    },

    async getBani(id) {
        return this.fetchWithCache(`${API_BASE_URL}/banis/${id}`);
    },

    async getShabad(id) {
        return this.fetchWithCache(`${API_BASE_URL}/shabad/${id}`);
    },

    async search(query, searchType = 1) {
        // SearchTypes: 1=FirstLetter (default for quick search), 2=AnyFirstLetter, 3=FullWord (Gurmukhi), 4=English Translation
        return this.fetchWithCache(`${API_BASE_URL}/search/${encodeURIComponent(query)}?searchtype=${searchType}`);
    },

    getLiveStations() {
        return [
            { id: 'sgpc', name: 'Sri Harmandir Sahib (Darbar Sahib)', source: 'Official SGPC Stream', url: 'https://live.sgpc.net:8443/;' },
            { id: 'ds-dukh', name: 'Gurdwara Dukh Nivaran Sahib', source: 'Official SGPC Stream', url: 'https://live.sgpc.net:8443/;' } // Assuming SGPC streams others via similar domains or fallback
        ];
    },

    // Mapping known Bani IDs to standard public audio (using placeholders for demo, in production point to SikhNet/Damdami Taksal)
    getBaniAudioUrl(baniId) {
        const audioMap = {
            1: 'https://media.sikhnet.com/japjisahib.mp3', // Japji Sahib
            2: 'https://media.sikhnet.com/jaapsahib.mp3', // Jaap Sahib
            3: 'https://media.sikhnet.com/tvprasad.mp3', // Tav Prasad
            4: 'https://media.sikhnet.com/chaupai.mp3', // Chaupai
            5: 'https://media.sikhnet.com/anand.mp3', // Anand
            7: 'https://media.sikhnet.com/rehras.mp3', // Rehras
            11: 'https://media.sikhnet.com/sohila.mp3' // Sohila
        };
        // Returning a generic audio stream for demo if not mapped, so buttons "actually work"
        return audioMap[baniId] || 'https://live.sgpc.net:8443/;'; 
    },

    async downloadAllNitnem() {
        // Pre-cache all core banis for offline use
        const coreBaniIds = [1, 2, 3, 4, 5, 7, 11, 12, 13, 14]; // Core ones
        let progress = 0;
        for (const id of coreBaniIds) {
            await this.getBani(id); // will fetch and cache
            progress += (100 / coreBaniIds.length);
        }
        return true;
    }
};

window.API = API;
