import L from 'leaflet';

export interface MapTileConfig {
    url: string;
    options: L.TileLayerOptions;
    provider: 'carto' | 'osm';
}

/**
 * Returns the appropriate Tile Layer configuration for Leaflet maps.
 * 
 * CARTO requires an API key (?key=YOUR_API_KEY) to serve un-watermarked basemaps.
 * If VITE_CARTO_API_KEY is configured in .env, it uses CARTO basemaps with the key.
 * If no key is configured, it falls back to OpenStreetMap (with custom dark filter styling in dark mode)
 * so that maps are always crystal-clear and fully functional without any watermarks.
 */
export const getMapTileConfig = (theme: 'dark' | 'light' = 'dark'): MapTileConfig => {
    const rawKey = import.meta.env.VITE_CARTO_API_KEY;
    const cartoKey = typeof rawKey === 'string' ? rawKey.trim() : '';

    if (cartoKey) {
        const url = theme === 'light'
            ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
            : `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`;

        return {
            url,
            provider: 'carto',
            options: {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }
        };
    }

    // High-availability open fallback: OpenStreetMap
    return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        provider: 'osm',
        options: {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
            subdomains: 'abc',
            maxZoom: 19,
            className: theme === 'dark' ? 'dark-map-tiles' : ''
        }
    };
};

/**
 * Helper to create and attach a TileLayer to a Leaflet map instance.
 */
export const createMapTileLayer = (theme: 'dark' | 'light' = 'dark'): L.TileLayer => {
    const config = getMapTileConfig(theme);
    return L.tileLayer(config.url, config.options);
};

// In-memory cache for reverse-geocoded coordinates to prevent redundant Nominatim lookups
const reverseGeocodeCache = new Map<string, string>();

/**
 * Reverse geocodes [lat, lng] to a human-readable street/city address.
 * Falls back gracefully to formatted coordinates if the geocoder is rate-limited or fails.
 */
export const reverseGeocodeCoord = async (lat: number, lng: number): Promise<string> => {
    if (!lat || !lng || (lat === 0 && lng === 0)) {
        return 'No coordinates recorded';
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (reverseGeocodeCache.has(cacheKey)) {
        return reverseGeocodeCache.get(cacheKey)!;
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'es,en'
                }
            }
        );
        if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
                const parts = data.display_name.split(', ');
                const shortAddress = parts.slice(0, 4).join(', ');
                reverseGeocodeCache.set(cacheKey, shortAddress);
                return shortAddress;
            }
        }
    } catch (e) {
        // Silently catch network/rate limit errors
    }

    const fallback = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? 'E' : 'W'}`;
    reverseGeocodeCache.set(cacheKey, fallback);
    return fallback;
};

