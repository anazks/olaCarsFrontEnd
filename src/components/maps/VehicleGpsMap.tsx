import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Dummy GPS positions for vehicles (simulates satellite API response) ──
// Positions around Accra, Ghana (typical OlaCars operating region)
const DUMMY_POSITIONS: Record<string, { latitude: number; longitude: number; speed: number; lastUpdate: string }> = {};

const generateDummyPosition = (vehicleId: string) => {
    if (DUMMY_POSITIONS[vehicleId]) return DUMMY_POSITIONS[vehicleId];

    // Generate a random position around Accra, Ghana  (lat ~5.5-5.7, lng ~-0.3 to -0.1)
    const baseLocations = [
        { lat: 5.6037, lng: -0.1870, label: 'Accra Central' },
        { lat: 5.6508, lng: -0.1869, label: 'East Legon' },
        { lat: 5.5560, lng: -0.1969, label: 'Osu' },
        { lat: 5.6145, lng: -0.2350, label: 'Achimota' },
        { lat: 5.5753, lng: -0.2500, label: 'Dansoman' },
        { lat: 5.6366, lng: -0.1250, label: 'Tema' },
        { lat: 5.5913, lng: -0.2218, label: 'Kaneshie' },
        { lat: 5.6681, lng: -0.1648, label: 'Madina' },
        { lat: 6.6885, lng: -1.6244, label: 'Kumasi' },
        { lat: 5.1107, lng: -1.2466, label: 'Cape Coast' },
    ];

    // Use vehicleId hash to pick a deterministic position
    const hash = vehicleId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const base = baseLocations[hash % baseLocations.length];

    // Add small random offset so each vehicle is at a slightly different spot
    const offset = () => (Math.random() - 0.5) * 0.02;

    const pos = {
        latitude: base.lat + offset(),
        longitude: base.lng + offset(),
        speed: Math.floor(Math.random() * 80) + 10,
        lastUpdate: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
    };

    DUMMY_POSITIONS[vehicleId] = pos;
    return pos;
};

// ── Custom car marker icon ──
const createCarIcon = () => {
    return L.divIcon({
        className: 'vehicle-marker',
        html: `
            <div style="
                width: 36px; height: 36px;
                background: linear-gradient(135deg, #C8E600, #a3c400);
                border-radius: 50%;
                border: 3px solid #fff;
                box-shadow: 0 2px 12px rgba(200,230,0,0.5), 0 0 20px rgba(200,230,0,0.25);
                display: flex; align-items: center; justify-content: center;
                position: relative;
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                    <circle cx="7" cy="17" r="2"/>
                    <circle cx="17" cy="17" r="2"/>
                </svg>
                <div style="
                    position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
                    width: 0; height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 8px solid #fff;
                "></div>
            </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44],
    });
};

// ── Map Component ──
interface VehicleGpsMapProps {
    vehicleId: string;
    vehicleName?: string;
    isActivated?: boolean;
    height?: string;
}

const VehicleGpsMap = ({ vehicleId, vehicleName = 'Vehicle', isActivated = true, height = '280px' }: VehicleGpsMapProps) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    const position = generateDummyPosition(vehicleId);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Create map instance
        const map = L.map(mapRef.current, {
            center: [position.latitude, position.longitude],
            zoom: 14,
            zoomControl: true,
            attributionControl: true,
            scrollWheelZoom: true,
        });

        // Dark-themed tile layer (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
        }).addTo(map);

        // Add vehicle marker
        const marker = L.marker([position.latitude, position.longitude], {
            icon: createCarIcon(),
        }).addTo(map);

        // Popup with vehicle info
        const timeSinceUpdate = Math.floor((Date.now() - new Date(position.lastUpdate).getTime()) / 60000);
        marker.bindPopup(`
            <div style="font-family: 'Inter', sans-serif; min-width: 180px; padding: 4px;">
                <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px; color: #111;">${vehicleName}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 11px;">
                    <div style="color: #888;">Latitude</div><div style="font-weight: 600;">${position.latitude.toFixed(4)}°</div>
                    <div style="color: #888;">Longitude</div><div style="font-weight: 600;">${position.longitude.toFixed(4)}°</div>
                    <div style="color: #888;">Speed</div><div style="font-weight: 600;">${position.speed} km/h</div>
                    <div style="color: #888;">Last Update</div><div style="font-weight: 600;">${timeSinceUpdate} min ago</div>
                </div>
                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; text-align: center;">
                    🛰️ Simulated GPS Data
                </div>
            </div>
        `).openPopup();

        // Add accuracy circle
        L.circle([position.latitude, position.longitude], {
            radius: 150,
            color: '#C8E600',
            fillColor: '#C8E600',
            fillOpacity: 0.08,
            weight: 1,
            dashArray: '5,5',
        }).addTo(map);

        // Add geofence circle (larger)
        L.circle([position.latitude, position.longitude], {
            radius: 2000,
            color: 'rgba(200,230,0,0.3)',
            fillColor: 'transparent',
            weight: 1,
            dashArray: '10,10',
        }).addTo(map);

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [vehicleId]);

    if (!isActivated) {
        return (
            <div
                style={{
                    height,
                    background: 'rgba(239,68,68,0.05)',
                    border: '1px dashed rgba(239,68,68,0.2)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#ef4444',
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2 L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>GPS Not Activated</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>Activate GPS tracking to view vehicle position</span>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Map Container */}
            <div
                ref={mapRef}
                style={{
                    height,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-main)',
                }}
            />

            {/* Floating Info Overlay */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    background: 'rgba(10,10,10,0.85)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    border: '1px solid rgba(200,230,0,0.2)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#C8E600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live</span>
                </div>
                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{position.speed} km/h</span>
                    <span style={{ margin: '0 6px', opacity: 0.4 }}>•</span>
                    <span>{position.latitude.toFixed(4)}°, {position.longitude.toFixed(4)}°</span>
                </div>
            </div>

            {/* Simulated data badge */}
            <div
                style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(10,10,10,0.75)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 1000,
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}
            >
                🛰️ Simulated
            </div>
        </div>
    );
};

export default VehicleGpsMap;
