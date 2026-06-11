import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
    Crosshair, Search, Cpu, Wifi, WifiOff, Database, 
    Calendar, Shield, Activity, Info, RefreshCw, SlidersHorizontal, 
    Copy, Check, FileSpreadsheet, User, Phone, MapPin, Gauge,
    Battery, Zap, Navigation, Link, ExternalLink, Satellite
} from 'lucide-react';
import OlaLoader from '../../../components/common/OlaLoader';
import { getGpsVehiclesList, getGpsLocationsList, getDeviceLiveStreamingUrl, getDeviceMediaEventUrl, type GpsVehicle, type GpsLocation } from '../../../services/gpsService';
import { getAllVehicles } from '../../../services/vehicleService';
import { getAllDrivers } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GpsVehicles = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState<GpsVehicle[]>([]);
    const [locations, setLocations] = useState<GpsLocation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [plateStatusFilter, setPlateStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'PENDING'>('ALL');
    const [copiedImei, setCopiedImei] = useState<string | null>(null);
    const [liveStreamLoading, setLiveStreamLoading] = useState(false);
    const [mediaEventLoading, setMediaEventLoading] = useState(false);
    
    // View state: 'list' (fleet table), 'map' (fleet map), 'track' (single vehicle tracking detail page)
    const [activeView, setActiveView] = useState<'list' | 'map' | 'track'>('list');
    const [selectedTrackVehicle, setSelectedTrackVehicle] = useState<GpsVehicle | null>(null);

    // Fleet linkage state
    const [fleetVehicles, setFleetVehicles] = useState<any[]>([]);
    const [fleetDrivers, setFleetDrivers] = useState<Driver[]>([]);

    // Leaflet references
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<{ [imei: string]: L.Marker }>({});

    const trackMapContainerRef = useRef<HTMLDivElement | null>(null);
    const trackMapRef = useRef<L.Map | null>(null);
    const trackMarkerRef = useRef<L.Marker | null>(null);

    // Fetch GPS telemetry (devices + locations) + fleet vehicle/driver linkage
    const loadGpsData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const [vehiclesData, locationsData, fleetRes, driversRes] = await Promise.all([
                getGpsVehiclesList(),
                getGpsLocationsList(),
                getAllVehicles({ limit: 500 }).catch(() => ({ data: [] })),
                getAllDrivers({ limit: 1000 }).catch(() => ({ data: [] }))
            ]);
            setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
            setLocations(Array.isArray(locationsData) ? locationsData : []);
            setFleetVehicles((fleetRes as any).data || []);
            setFleetDrivers((driversRes as any).data || []);
        } catch (err: any) {
            console.error("Failed to load GPS devices", err);
            setError(err.message || "Failed to retrieve telemetry data from Jimi server.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadGpsData();
    }, []);

    // Initialize/cleanup Fleet map container
    useEffect(() => {
        if (activeView === 'map' && mapContainerRef.current) {
            if (!mapRef.current) {
                mapRef.current = L.map(mapContainerRef.current, {
                    zoomControl: false
                }).setView([9.0232, -79.5244], 12);

                L.control.zoom({ position: 'topright' }).addTo(mapRef.current);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    maxZoom: 20
                }).addTo(mapRef.current);
            }

            setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 150);
        }

        return () => {
            if (activeView !== 'map' && mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markersRef.current = {};
            }
        };
    }, [activeView]);

    // Plot/update Fleet markers dynamically
    useEffect(() => {
        if (!mapRef.current || activeView !== 'map' || locations.length === 0) return;

        const currentImeis = new Set(locations.map(loc => loc.imei));
        Object.keys(markersRef.current).forEach(imei => {
            if (!currentImeis.has(imei)) {
                markersRef.current[imei].remove();
                delete markersRef.current[imei];
            }
        });

        locations.forEach(loc => {
            const vehicle = vehicles.find(v => v.imei === loc.imei);
            const isOnline = loc.status === 1;
            const color = isOnline ? '#C8E600' : '#f97316';
            const pulseClass = isOnline ? 'gps-pulse-active' : '';
            const statusLabel = isOnline ? 'Online' : 'Offline';
            const speedLabel = isOnline ? `${loc.speed} km/h` : 'Stopped';

            const htmlMarker = `
                <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                    <span class="${pulseClass}" style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: ${color}; opacity: 0.25;"></span>
                    <span style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background-color: ${color}; border: 2.5px solid #171717; box-shadow: 0 0 10px rgba(0,0,0,0.7);"></span>
                </div>
            `;

            const icon = L.divIcon({
                html: htmlMarker,
                className: 'custom-gps-leaflet-icon',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -10]
            });

            const position: L.LatLngExpression = [loc.lat, loc.lng];

            const popupHtml = `
                <div style="background-color: #171717; color: #fff; font-family: 'Inter', sans-serif; min-width: 200px; padding: 4px; border-radius: 12px;">
                    <div style="font-weight: 800; font-size: 13px; border-bottom: 1px solid #333; padding-bottom: 6px; margin-bottom: 6px; color: #C8E600; display: flex; align-items: center; justify-content: space-between;">
                        <span>${vehicle?.deviceName || 'GPS Tracker'}</span>
                        <span style="font-size: 9px; padding: 2px 6px; border-radius: 999px; background-color: ${color}20; color: ${color}; border: 1px solid ${color}30;">
                            ${statusLabel}
                        </span>
                    </div>
                    <div style="font-size: 11px; display: grid; gap: 4px;">
                        <div><strong style="color: #888;">Plate:</strong> <span style="font-weight: 600;">${vehicle?.vehicleNumber || 'N/A'}</span></div>
                        <div><strong style="color: #888;">IMEI:</strong> <span style="font-family: monospace; font-size: 10px;">${loc.imei}</span></div>
                        <div><strong style="color: #888;">Ignition (ACC):</strong> <span style="font-weight: 600; color: ${loc.accStatus === 1 ? '#C8E600' : '#888'};">${loc.accStatus === 1 ? 'ON' : 'OFF'}</span></div>
                        <div><strong style="color: #888;">Speed:</strong> <span style="font-weight: 700;">${speedLabel}</span></div>
                        <div><strong style="color: #888;">Driver:</strong> <span style="font-weight: 600;">${vehicle?.driverName || 'Unassigned'}</span></div>
                        <div style="font-size: 9px; color: #666; margin-top: 4px; text-align: right;">Updated: ${loc.gpsTime.split(' ')[1] || 'N/A'} UTC</div>
                    </div>
                </div>
            `;

            if (markersRef.current[loc.imei]) {
                markersRef.current[loc.imei].setLatLng(position);
                markersRef.current[loc.imei].setIcon(icon);
                markersRef.current[loc.imei].getPopup()?.setContent(popupHtml);
            } else {
                const marker = L.marker(position, { icon })
                    .bindPopup(popupHtml, {
                        closeButton: false,
                        className: 'dark-leaflet-popup'
                    })
                    .addTo(mapRef.current!);
                markersRef.current[loc.imei] = marker;
            }
        });

        if (locations.length > 0) {
            try {
                const group = L.featureGroup(Object.values(markersRef.current));
                mapRef.current.fitBounds(group.getBounds().pad(0.15));
            } catch (err) {
                console.warn("[GPS Map] Fit bounds error", err);
            }
        }
    }, [locations, vehicles, activeView]);

    // Initialize/cleanup Single Vehicle tracking map container
    useEffect(() => {
        if (activeView === 'track' && selectedTrackVehicle && trackMapContainerRef.current) {
            const loc = locations.find(l => l.imei === selectedTrackVehicle.imei);
            const lat = loc ? loc.lat : 9.0232;
            const lng = loc ? loc.lng : -79.5244;

            if (!trackMapRef.current) {
                trackMapRef.current = L.map(trackMapContainerRef.current, {
                    zoomControl: false
                }).setView([lat, lng], 15);

                L.control.zoom({ position: 'topright' }).addTo(trackMapRef.current);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    maxZoom: 20
                }).addTo(trackMapRef.current);
            } else {
                trackMapRef.current.setView([lat, lng], 15);
            }

            if (loc) {
                const isOnline = loc.status === 1;
                const color = isOnline ? '#C8E600' : '#f97316';
                const pulseClass = isOnline ? 'gps-pulse-active' : '';
                const statusLabel = isOnline ? 'Online' : 'Offline';
                const speedLabel = isOnline ? `${loc.speed} km/h` : 'Stopped';

                const htmlMarker = `
                    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                        <span class="${pulseClass}" style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background-color: ${color}; opacity: 0.3;"></span>
                        <span style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background-color: ${color}; border: 3px solid #171717; box-shadow: 0 0 12px rgba(0,0,0,0.8);"></span>
                    </div>
                `;

                const icon = L.divIcon({
                    html: htmlMarker,
                    className: 'custom-gps-leaflet-icon-track',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -12]
                });

                const popupHtml = `
                    <div style="background-color: #171717; color: #fff; font-family: 'Inter', sans-serif; min-width: 160px; padding: 4px; border-radius: 8px; text-align: center;">
                        <div style="font-weight: 800; font-size: 12px; color: #C8E600;">${selectedTrackVehicle.deviceName}</div>
                        <div style="font-size: 11px; margin-top: 4px; font-weight: 700; color: ${color};">${statusLabel} • ${speedLabel}</div>
                    </div>
                `;

                if (trackMarkerRef.current) {
                    trackMarkerRef.current.setLatLng([loc.lat, loc.lng]);
                    trackMarkerRef.current.setIcon(icon);
                    trackMarkerRef.current.getPopup()?.setContent(popupHtml);
                } else {
                    trackMarkerRef.current = L.marker([loc.lat, loc.lng], { icon })
                        .bindPopup(popupHtml, { closeButton: false, className: 'dark-leaflet-popup' })
                        .addTo(trackMapRef.current!)
                        .openPopup();
                }
            }

            setTimeout(() => {
                trackMapRef.current?.invalidateSize();
            }, 150);
        }

        return () => {
            if (activeView !== 'track' && trackMapRef.current) {
                trackMapRef.current.remove();
                trackMapRef.current = null;
                trackMarkerRef.current = null;
            }
        };
    }, [activeView, selectedTrackVehicle, locations]);

    // Filtered data memo
    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const matchesSearch = 
                (v.deviceName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.imei || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.sim || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.vehicleNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.carFrame || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesStatus = selectedStatus === 'ALL' || v.status === selectedStatus;
            
            let matchesPlateStatus = true;
            if (plateStatusFilter === 'ASSIGNED') {
                matchesPlateStatus = !!v.vehicleNumber && v.vehicleNumber.trim() !== '' && v.vehicleNumber !== 'Pending';
            } else if (plateStatusFilter === 'PENDING') {
                matchesPlateStatus = !v.vehicleNumber || v.vehicleNumber.trim() === '' || v.vehicleNumber === 'Pending';
            }
            
            return matchesSearch && matchesStatus && matchesPlateStatus;
        });
    }, [vehicles, searchQuery, selectedStatus, plateStatusFilter]);

    // Build a linked data map: GPS IMEI -> { fleetVehicle, driver }
    const linkedDataMap = useMemo(() => {
        const map: Record<string, { fleetVehicle?: any; driver?: Driver }> = {};
        vehicles.forEach(gpsV => {
            const gpsVin = gpsV.carFrame?.toUpperCase().trim();
            const gpsPlate = gpsV.vehicleNumber?.toUpperCase().trim();

            const fleetV = fleetVehicles.find(fv => {
                const fvVin = fv.basicDetails?.vin?.toUpperCase().trim();
                const fvPlate = fv.legalDocs?.registrationNumber?.toUpperCase().trim();
                const fvFleetNum = fv.basicDetails?.fleetNumber?.toUpperCase().trim();
                
                return (
                    (gpsVin && fvVin && gpsVin === fvVin) ||
                    (gpsPlate && fvPlate && gpsPlate === fvPlate) ||
                    (gpsVin && fvPlate && gpsVin === fvPlate) ||
                    (gpsPlate && fvVin && gpsPlate === fvVin) ||
                    (gpsVin && fvFleetNum && gpsVin === fvFleetNum)
                );
            });

            if (fleetV) {
                const driver = fleetDrivers.find(d => {
                    const vId = typeof d.currentVehicle === 'object' ? (d.currentVehicle as any)?._id : d.currentVehicle;
                    return vId && String(vId) === String(fleetV._id);
                });
                map[gpsV.imei] = { fleetVehicle: fleetV, driver };
            }
        });
        return map;
    }, [vehicles, fleetVehicles, fleetDrivers]);

    // Lookup corresponding location data for active tracking vehicle
    const trackedLoc = useMemo(() => {
        if (!selectedTrackVehicle) return null;
        return locations.find(loc => loc.imei === selectedTrackVehicle.imei) || null;
    }, [selectedTrackVehicle, locations]);

    // Format coordinates beautifully
    const formatCoords = (lat?: number, lng?: number) => {
        if (lat === undefined || lng === undefined) return 'N/A';
        const latDirection = lat >= 0 ? 'N' : 'S';
        const lngDirection = lng >= 0 ? 'E' : 'W';
        return `${Math.abs(lat).toFixed(5)}° ${latDirection}, ${Math.abs(lng).toFixed(5)}° ${lngDirection}`;
    };

    // Statistics calculations
    const stats = useMemo(() => {
        const total = vehicles.length;
        const online = vehicles.filter(v => v.status === 'NORMAL').length;
        const offline = vehicles.filter(v => v.status === 'OFFLINE').length;
        const disabled = vehicles.filter(v => v.enabledFlag === 0).length;
        const expired = vehicles.filter(v => v.status === 'EXPIRED').length;

        const plateAssigned = vehicles.filter(v => !!v.vehicleNumber && v.vehicleNumber.trim() !== '' && v.vehicleNumber !== 'Pending').length;
        const platePending = vehicles.filter(v => !v.vehicleNumber || v.vehicleNumber.trim() === '' || v.vehicleNumber === 'Pending').length;

        return { total, online, offline, disabled, expired, plateAssigned, platePending };
    }, [vehicles]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedImei(text);
        setTimeout(() => setCopiedImei(null), 2000);
    };

    const handleOpenLiveStream = async (imei: string) => {
        setLiveStreamLoading(true);
        try {
            const responseData = await getDeviceLiveStreamingUrl(imei);
            const url = responseData;
            if (url) {
                let finalUrl = typeof url === 'object' ? JSON.stringify(url) : String(url);
                if (typeof url === 'object' && url !== null) {
                    finalUrl = (url as any).url || (url as any).liveUrl || (url as any).h5Url || (url as any).pageUrl || (Object.values(url).find(v => typeof v === 'string' && v.startsWith('http')) as string) || finalUrl;
                }
                if (finalUrl.startsWith('http') || finalUrl.startsWith('rtmp') || finalUrl.startsWith('ws') || finalUrl.startsWith('rtsp')) {
                    window.open(finalUrl, '_blank', 'noopener,noreferrer');
                } else {
                    alert(`Stream response: ${finalUrl}\nPlease contact support if this is a raw format.`);
                }
            } else {
                alert('No live stream URL returned by the device.');
            }
        } catch (error: any) {
            console.error('[GpsVehicles] Live stream error:', error);
            alert(`Live Stream Error: ${error.response?.data?.message || error.message}`);
        } finally {
            setLiveStreamLoading(false);
        }
    };

    const handleOpenMediaEvent = async (imei: string) => {
        setMediaEventLoading(true);
        try {
            const responseData = await getDeviceMediaEventUrl(imei);
            const url = responseData;
            if (url) {
                let finalUrl = typeof url === 'object' ? JSON.stringify(url) : String(url);
                if (typeof url === 'object' && url !== null) {
                    finalUrl = (url as any).url || (url as any).liveUrl || (url as any).h5Url || (url as any).pageUrl || (Object.values(url).find(v => typeof v === 'string' && v.startsWith('http')) as string) || finalUrl;
                }
                if (finalUrl.startsWith('http') || finalUrl.startsWith('rtmp') || finalUrl.startsWith('ws') || finalUrl.startsWith('rtsp')) {
                    window.open(finalUrl, '_blank', 'noopener,noreferrer');
                } else {
                    alert(`Media Event response: ${finalUrl}\nPlease contact support if this is a raw format.`);
                }
            } else {
                alert('No media event URL returned by the device.');
            }
        } catch (error: any) {
            console.error('[GpsVehicles] Media event error:', error);
            alert(`Media Event Error: ${error.response?.data?.message || error.message}`);
        } finally {
            setMediaEventLoading(false);
        }
    };

    const handleExportCSV = () => {
        const headers = ["IMEI", "Device Name", "SIM Card", "Activation Time", "Expiration", "Vehicle Number", "VIN/Frame", "Status", "Driver", "Driver Phone"];
        const rows = filteredVehicles.map(v => [
            v.imei,
            v.deviceName,
            v.sim,
            v.activationTime,
            v.expiration,
            v.vehicleNumber || 'N/A',
            v.carFrame || 'N/A',
            v.status,
            v.driverName || 'Unassigned',
            v.driverPhone || 'N/A'
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `GPS_Vehicles_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <OlaLoader fullScreen size="lg" />;
    }

    return (
        <div className="p-6 md:p-8 min-h-screen text-[var(--text-main)] bg-[var(--bg-main)] animate-fadeIn transition-colors duration-300">
            {/* Dark Leaflet Popup Custom Styling */}
            <style>{`
                .dark-leaflet-popup .leaflet-popup-content-wrapper {
                    background: #171717 !important;
                    border: 1px solid #333333 !important;
                    border-radius: 12px !important;
                    padding: 0px !important;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6) !important;
                }
                .dark-leaflet-popup .leaflet-popup-tip {
                    background: #171717 !important;
                    border-left: 1px solid #333333 !important;
                    border-right: 1px solid #333333 !important;
                }
                .gps-pulse-active {
                    animation: gps-pulse-anim 1.8s infinite ease-in-out;
                }
                @keyframes gps-pulse-anim {
                    0% { transform: scale(0.65); opacity: 0.6; }
                    50% { transform: scale(1.2); opacity: 0.15; }
                    100% { transform: scale(0.65); opacity: 0.6; }
                }
                .leaflet-container {
                    background: #121212 !important;
                }
            `}</style>

            {/* Header section with Satellite radar animation */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#C8E600]/10 flex items-center justify-center border border-[#C8E600]/20 shadow-[0_0_15px_rgba(200,230,0,0.1)] relative">
                        <Crosshair className="text-[#C8E600] animate-pulse" size={28} />
                        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[var(--bg-main)] animate-ping" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black tracking-tight">
                                {activeView === 'track' && selectedTrackVehicle
                                    ? `Tracking: ${selectedTrackVehicle.deviceName}`
                                    : t('sidebar.items.gpsVehicles', 'GPS Connected Vehicles')}
                            </h1>
                            <span className="text-[10px] font-black uppercase bg-[#C8E600]/15 text-[#C8E600] px-2.5 py-1 rounded-full border border-[#C8E600]/25 flex items-center gap-1 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live Telemetry
                            </span>
                        </div>
                        <p className="text-sm font-medium mt-1 text-[var(--text-dim)]">
                            Jimi IoT Tracksolid Gateway Integration — Account: <span className="text-[var(--text-main)] font-semibold">ARRENDADORA_OLA_CARS</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {activeView !== 'track' && (
                        <button 
                            onClick={handleExportCSV}
                            className="px-4 py-2.5 rounded-xl border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] transition-all font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-sm text-[var(--text-main)]"
                        >
                            <FileSpreadsheet size={16} /> Export CSV
                        </button>
                    )}
                    <button
                        onClick={() => loadGpsData(true)}
                        disabled={refreshing}
                        className="px-4 py-2.5 rounded-xl bg-[#C8E600] text-black font-extrabold text-xs flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_12px_rgba(200,230,0,0.2)]"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Syncing...' : 'Refresh Telemetry'}
                    </button>
                </div>
            </div>

            {/* Error banner if API connectivity fails */}
            {error && (
                <div className="mb-6 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 flex items-start gap-3 shadow-lg">
                    <WifiOff size={20} className="mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-sm">Offline Mock mode enabled</h4>
                        <p className="text-xs opacity-80 mt-0.5">{error}. Visualizing cache logs.</p>
                    </div>
                </div>
            )}

            {/* List/Map Toggle Mode Tabs (Hidden in single track view) */}
            {activeView !== 'track' && (
                <div className="flex rounded-xl bg-[var(--bg-input)] p-1 border border-[var(--border-main)] overflow-hidden mb-6 w-full sm:w-fit">
                    <button
                        onClick={() => setActiveView('list')}
                        className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-2 ${activeView === 'list' ? 'bg-[#C8E600] text-black shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'}`}
                    >
                        <SlidersHorizontal size={14} /> List View
                    </button>
                    <button
                        onClick={() => setActiveView('map')}
                        className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-2 ${activeView === 'map' ? 'bg-[#C8E600] text-black shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'}`}
                    >
                        <MapPin size={14} /> Live Fleet Map
                    </button>
                </div>
            )}

            {/* View Switching */}
            {activeView === 'list' ? (
                <>
                    {/* Telemetry Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="p-6 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] transition-all hover:-translate-y-1 hover:shadow-lg duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <div className="text-[var(--text-dim)] text-xs font-bold uppercase tracking-wider">Total Hardware Bindings</div>
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><Cpu size={18} /></div>
                            </div>
                            <div className="text-3xl font-black">{stats.total}</div>
                            <div className="text-[10px] mt-1 text-[var(--text-dim)]">Registered IMEI units</div>
                        </div>

                        <div className="p-6 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] transition-all hover:-translate-y-1 hover:shadow-lg duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <div className="text-[var(--text-dim)] text-xs font-bold uppercase tracking-wider">Active GPS Sync</div>
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><Wifi size={18} /></div>
                            </div>
                            <div className="text-3xl font-black text-[#C8E600]">{stats.online}</div>
                            <div className="text-[10px] mt-1 text-[var(--text-dim)]">Connected, streaming coordinates</div>
                        </div>

                        <div className="p-6 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] transition-all hover:-translate-y-1 hover:shadow-lg duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <div className="text-[var(--text-dim)] text-xs font-bold uppercase tracking-wider">Offline Status</div>
                                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><WifiOff size={18} /></div>
                            </div>
                            <div className="text-3xl font-black text-orange-400">{stats.offline}</div>
                            <div className="text-[10px] mt-1 text-[var(--text-dim)]">Signal lost or parked indoors</div>
                        </div>

                        <div className="p-6 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] transition-all hover:-translate-y-1 hover:shadow-lg duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <div className="text-[var(--text-dim)] text-xs font-bold uppercase tracking-wider">Disabled Units</div>
                                <div className="p-2 rounded-xl bg-red-500/10 text-red-400"><Shield size={18} /></div>
                            </div>
                            <div className="text-3xl font-black text-rose-500">{stats.disabled}</div>
                            <div className="text-[10px] mt-1 text-[var(--text-dim)]">Flagged inactive by operators</div>
                        </div>
                    </div>

                    {/* Filter controls row */}
                    <div className="flex flex-col xl:flex-row gap-4 items-center justify-between p-4 mb-6 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]">
                        <div className="relative w-full xl:w-80">
                            <input 
                                type="text" 
                                placeholder="Search Name, IMEI, Plate, SIM..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] text-xs font-semibold outline-none focus:border-[#C8E600] transition-all"
                            />
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                            {/* Plate Status Filter */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-dim)] whitespace-nowrap">
                                    <Database size={14} /> Plate Status:
                                </div>
                                <div className="flex rounded-xl bg-[var(--bg-input)] p-1 border border-[var(--border-main)] overflow-hidden w-full md:w-auto">
                                    {[
                                        { label: 'ALL', count: stats.total },
                                        { label: 'ASSIGNED', count: stats.plateAssigned },
                                        { label: 'PENDING', count: stats.platePending }
                                    ].map(status => (
                                        <button
                                            key={status.label}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPlateStatusFilter(status.label as any);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex-1 md:flex-initial flex items-center justify-center gap-1.5 ${plateStatusFilter === status.label ? 'bg-[#C8E600] text-black shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'}`}
                                        >
                                            {status.label} <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${plateStatusFilter === status.label ? 'bg-black/20 text-black' : 'bg-white/5 text-[var(--text-muted)]'}`}>{status.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Device Status Filter */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-dim)] whitespace-nowrap">
                                    <SlidersHorizontal size={14} /> Device Status:
                                </div>
                                <div className="flex rounded-xl bg-[var(--bg-input)] p-1 border border-[var(--border-main)] overflow-hidden w-full md:w-auto">
                                    {[
                                        { label: 'ALL', count: stats.total },
                                        { label: 'NORMAL', count: stats.online },
                                        { label: 'OFFLINE', count: stats.offline },
                                        { label: 'EXPIRED', count: stats.expired }
                                    ].map(status => (
                                        <button
                                            key={status.label}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStatus(status.label);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex-1 md:flex-initial flex items-center justify-center gap-1.5 ${selectedStatus === status.label ? 'bg-[#C8E600] text-black shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'}`}
                                        >
                                            {status.label} <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${selectedStatus === status.label ? 'bg-black/20 text-black' : 'bg-white/5 text-[var(--text-muted)]'}`}>{status.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hardware Telemetry List */}
                    <div className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--border-main)] text-[11px] font-black uppercase text-[var(--text-dim)] bg-[var(--bg-input)]/20">
                                        <th className="px-6 py-4">Hardware Profile</th>
                                        <th className="px-6 py-4">IMEI Identifier</th>
                                        <th className="px-6 py-4">SIM Card Info</th>
                                        <th className="px-6 py-4">Status & Sync</th>
                                        <th className="px-6 py-4">Expiration Time</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-main)]">
                                    {filteredVehicles.map((vehicle) => {
                                        const isOnline = vehicle.status === 'NORMAL';
                                        const isOffline = vehicle.status === 'OFFLINE';
                                        
                                        return (
                                            <tr 
                                                key={vehicle.imei} 
                                                onClick={() => {
                                                    setSelectedTrackVehicle(vehicle);
                                                    setActiveView('track');
                                                }}
                                                className="hover:bg-[var(--sidebar-hover)]/30 transition-all duration-150 cursor-pointer"
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOnline ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                            <Activity size={18} className={isOnline ? 'animate-pulse' : ''} />
                                                        </div>
                                                        <div>
                                                            <div className="font-extrabold text-sm text-white">{vehicle.deviceName || 'Unnamed Device'}</div>
                                                            <div className="text-xs text-[var(--text-dim)] font-bold mt-0.5 flex items-center gap-1.5">
                                                                <span>{vehicle.mcType || 'VL802'}</span>
                                                                <span className="w-1 h-1 rounded-full bg-[var(--border-main)]" />
                                                                <span>Plate: {vehicle.vehicleNumber || 'Pending'}</span>
                                                            </div>
                                                            {/* Fleet-linked driver info */}
                                                            {linkedDataMap[vehicle.imei]?.driver && (
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8E600]" />
                                                                    <span className="text-[10px] font-bold text-[#C8E600]">
                                                                        {linkedDataMap[vehicle.imei]!.driver!.personalInfo?.fullName}
                                                                    </span>
                                                                    <span className="text-[9px] text-[var(--text-dim)] font-medium">
                                                                        {linkedDataMap[vehicle.imei]!.driver!.personalInfo?.phone}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {linkedDataMap[vehicle.imei] && !linkedDataMap[vehicle.imei]?.driver && (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Link size={10} className="text-blue-400" />
                                                                    <span className="text-[10px] font-bold text-blue-400">Fleet Matched</span>
                                                                    <span className="text-[9px] text-[var(--text-dim)]">· No driver assigned</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--text-muted)]">
                                                        <span>{vehicle.imei}</span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopy(vehicle.imei);
                                                            }}
                                                            className="p-1 rounded hover:bg-[var(--sidebar-hover)] transition-all text-[var(--text-dim)] hover:text-[var(--text-main)]"
                                                            title="Copy IMEI"
                                                        >
                                                            {copiedImei === vehicle.imei ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                                        </button>
                                                    </div>
                                                    {vehicle.carFrame && (
                                                        <div className="text-[10px] font-mono text-[var(--text-dim)] font-bold mt-0.5">VIN: {vehicle.carFrame}</div>
                                                    )}
                                                </td>
                                                
                                                <td className="px-6 py-5">
                                                    <div className="text-xs font-bold text-[var(--text-main)]">{vehicle.sim}</div>
                                                    <div className="text-[10px] text-[var(--text-dim)] font-medium mt-0.5">Group: {vehicle.deviceGroup}</div>
                                                </td>
                                                
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center">
                                                        <span 
                                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                                isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                                isOffline ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                                            }`}
                                                        >
                                                            {vehicle.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] text-[var(--text-dim)] font-semibold mt-1">
                                                        Bound to: {vehicle.enabledFlag === 1 ? 'Activated Engine Relay' : 'Bypass Switch'}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5">
                                                    <div className="text-xs font-bold flex items-center gap-1.5 text-white">
                                                        <Calendar size={13} className="text-[var(--text-dim)]" />
                                                        {vehicle.expiration ? vehicle.expiration.split(' ')[0] : 'N/A'}
                                                    </div>
                                                    <div className="text-[9px] text-[var(--text-dim)] font-semibold mt-0.5">Activated: {vehicle.activationTime ? vehicle.activationTime.split(' ')[0] : 'N/A'}</div>
                                                </td>

                                                <td className="px-6 py-5 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTrackVehicle(vehicle);
                                                            setActiveView('track');
                                                        }}
                                                        className="px-4 py-2 rounded-xl bg-[#C8E600] text-black font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 hover:opacity-90 shadow-[0_3px_8px_rgba(200,230,0,0.15)]"
                                                    >
                                                        <MapPin size={13} /> Track
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    
                                    {filteredVehicles.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-sm font-medium italic text-[var(--text-dim)] bg-[var(--bg-main)]/5">
                                                No active GPS trackers match your search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : activeView === 'map' ? (
                /* Fleet map view visualizing all trackers */
                <div className="relative rounded-3xl border border-[var(--border-main)] overflow-hidden shadow-2xl bg-[var(--bg-card)]">
                    <div 
                        ref={mapContainerRef} 
                        className="w-full h-[60vh] md:h-[70vh] relative" 
                        style={{ zIndex: 1 }}
                    />
                    <div className="absolute bottom-5 left-5 z-[10] bg-[#171717]/85 backdrop-blur-md p-3.5 rounded-2xl border border-[var(--border-main)] max-w-xs text-xs shadow-lg flex items-start gap-2.5">
                        <Info size={16} className="text-[#C8E600] mt-0.5 flex-shrink-0" />
                        <div>
                            <h5 className="font-bold text-white mb-0.5">Live Fleet Overview</h5>
                            <p className="text-[11px] text-gray-400 leading-normal">
                                Click on any pulsing vehicle marker to check live speed, ignition (ACC) state, plate details, and operator details.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                /* Dedicated single-vehicle tracking dashboard with hardware and location info */
                selectedTrackVehicle && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
                        {/* Map Panel showing only selected vehicle (8 cols) */}
                        <div className="lg:col-span-8 rounded-3xl border border-[var(--border-main)] overflow-hidden shadow-2xl bg-[var(--bg-card)] relative">
                            <div 
                                ref={trackMapContainerRef} 
                                className="w-full h-[55vh] lg:h-[75vh] relative" 
                                style={{ zIndex: 1 }}
                            />
                            
                            {/* Floating back to list button */}
                            <div className="absolute top-4 left-4 z-[10]">
                                <button
                                    onClick={() => {
                                        setActiveView('list');
                                        setSelectedTrackVehicle(null);
                                    }}
                                    className="px-4 py-2.5 rounded-xl bg-[#171717]/90 hover:bg-[#222]/95 text-white font-extrabold text-xs flex items-center gap-2 border border-[#333] cursor-pointer transition-all shadow-lg backdrop-blur-sm"
                                >
                                    ← Back to Fleet List
                                </button>
                            </div>

                            {/* Floating location card details */}
                            {trackedLoc && (
                                <div className="absolute bottom-4 left-4 right-4 lg:right-auto z-[10] bg-[#171717]/90 backdrop-blur-md p-4 rounded-2xl border border-[var(--border-main)] max-w-md shadow-xl flex items-start gap-3">
                                    <Navigation className="text-[#C8E600] animate-pulse flex-shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-1">Geographic Address</h4>
                                        <p className="text-xs text-gray-300 font-medium leading-relaxed">
                                            {trackedLoc.locDesc || "Calculating positioning details..."}
                                        </p>
                                        <div className="text-[10px] font-bold text-gray-500 mt-2">
                                            Coordinates: {formatCoords(trackedLoc.lat, trackedLoc.lng)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Real-time Hardware & Telemetry specifications panel (4 cols) */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Hardware Profile header */}
                            <div className="p-6 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[#C8E600]/10 text-[#C8E600] flex items-center justify-center border border-[#C8E600]/20">
                                            <Cpu size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white">{selectedTrackVehicle.deviceName}</h3>
                                            <p className="text-xs text-[var(--text-dim)] font-bold">IMEI: {selectedTrackVehicle.imei}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {trackedLoc && (
                                            <span 
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                    trackedLoc.status === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                }`}
                                            >
                                                {trackedLoc.status === 1 ? 'Online' : 'Offline'}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenMediaEvent(selectedTrackVehicle.imei)}
                                                disabled={mediaEventLoading}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] uppercase font-bold transition-all hover:bg-orange-500/10 active:scale-95 disabled:opacity-50"
                                                style={{ borderColor: 'rgba(249,115,22,0.3)', color: '#f97316', background: 'var(--bg-input)' }}
                                            >
                                                <Database size={12} />
                                                {mediaEventLoading ? 'Loading...' : 'Media Events'}
                                            </button>
                                            <button
                                                onClick={() => handleOpenLiveStream(selectedTrackVehicle.imei)}
                                                disabled={liveStreamLoading}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] uppercase font-bold transition-all hover:bg-[#C8E600]/10 active:scale-95 disabled:opacity-50"
                                                style={{ borderColor: 'rgba(200,230,0,0.3)', color: '#C8E600', background: 'var(--bg-input)' }}
                                            >
                                                <Satellite size={12} />
                                                {liveStreamLoading ? 'Loading...' : 'Live Stream'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)]/30">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider flex items-center gap-1.5"><Info size={12} /> Hardware Node</span>
                                        <div className="text-sm font-extrabold mt-1 text-[var(--text-main)]">{selectedTrackVehicle.mcType}</div>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)]/30">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider flex items-center gap-1.5"><Zap size={12} /> Signal Status</span>
                                        <div className="text-sm font-extrabold mt-1 text-[var(--text-main)]">
                                            {trackedLoc && trackedLoc.status === 1 ? 'Connected' : 'Signal Lost'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Speed & Ignition telemetry */}
                            <div className="p-6 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm space-y-5">
                                <h4 className="text-xs font-black uppercase text-[#C8E600] border-b border-[var(--border-main)] pb-3">Telemetry Indicators</h4>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Live Speed</span>
                                        <div className="text-3xl font-black mt-1 text-white">
                                            {trackedLoc && trackedLoc.status === 1 ? `${trackedLoc.speed} km/h` : '0 km/h'}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-full bg-[#C8E600]/10 flex items-center justify-center border border-[#C8E600]/20 animate-pulse">
                                        <Gauge size={28} className="text-[#C8E600]" />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between text-xs border-b border-[var(--border-main)]/30 pb-2.5">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)]">Ignition status (ACC)</span>
                                        <span className={`font-extrabold px-2.5 py-0.5 rounded-lg text-[10px] border ${trackedLoc?.accStatus === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                            {trackedLoc?.accStatus === 1 ? 'ON (Engine Running)' : 'OFF (Engine Rest)'}
                                        </span>
                                    </div>

                                    {trackedLoc && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-[10px] font-bold text-[var(--text-dim)] flex items-center gap-1">
                                                    <Battery size={13} className={(trackedLoc?.electQuantity || 0) > 25 ? 'text-green-500' : 'text-red-500'} />
                                                    Hardware Battery
                                                </span>
                                                <span className="font-extrabold text-white">{trackedLoc?.electQuantity || 0}%</span>
                                            </div>
                                            <div className="w-full bg-[var(--bg-input)] rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${(trackedLoc?.electQuantity || 0) > 25 ? 'bg-green-500' : 'bg-red-500'}`}
                                                    style={{ width: `${trackedLoc?.electQuantity || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Operator & Contract details */}
                            <div className="p-6 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm space-y-4">
                                <h4 className="text-xs font-black uppercase text-[#C8E600] border-b border-[var(--border-main)] pb-3">Operational Assignments</h4>

                                {/* Fleet-linked driver (from OlaCars system) */}
                                {(() => {
                                    const linked = linkedDataMap[selectedTrackVehicle.imei];
                                    const linkedDriver = linked?.driver;
                                    const linkedVehicle = linked?.fleetVehicle;
                                    return (
                                        <>
                                            {linkedDriver ? (
                                                <div className="p-3.5 rounded-2xl border space-y-2.5" style={{ background: 'rgba(200,230,0,0.04)', borderColor: 'rgba(200,230,0,0.2)' }}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-[#C8E600]">Fleet System Driver</span>
                                                        {linkedVehicle && (
                                                            <button
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    const vId = typeof linkedVehicle._id === 'object' ? (linkedVehicle._id.$oid || linkedVehicle._id._id || String(linkedVehicle._id)) : linkedVehicle._id;
                                                                    navigate(`/admin/financial-admin/vehicles/${vId}`); 
                                                                }}
                                                                className="flex items-center gap-1 text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                                            >
                                                                <ExternalLink size={10} /> View Vehicle
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-xl bg-[#C8E600]/10 text-[#C8E600] flex items-center justify-center font-black text-sm border border-[#C8E600]/20 flex-shrink-0">
                                                            {linkedDriver.personalInfo?.fullName?.charAt(0)?.toUpperCase() || 'D'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm text-white">{linkedDriver.personalInfo?.fullName}</div>
                                                            <div className="text-[10px] font-mono text-[var(--text-dim)]">{linkedDriver.personalInfo?.phone}</div>
                                                            <div className="text-[9px] text-[var(--text-dim)]">{linkedDriver.personalInfo?.email}</div>
                                                        </div>
                                                    </div>
                                                    {linkedVehicle && (
                                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: 'rgba(200,230,0,0.1)' }}>
                                                            <div>
                                                                <span className="text-[9px] text-[var(--text-dim)] font-bold uppercase">Fleet Status</span>
                                                                <div className="text-[10px] font-bold text-white mt-0.5">{linkedVehicle.status}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-[var(--text-dim)] font-bold uppercase">Make/Model</span>
                                                                <div className="text-[10px] font-bold text-white mt-0.5">
                                                                    {linkedVehicle.basicDetails?.make} {linkedVehicle.basicDetails?.model} {linkedVehicle.basicDetails?.year}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : linked ? (
                                                <div className="p-3 rounded-xl border text-xs" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}>
                                                    <div className="text-blue-400 font-bold text-[10px] uppercase mb-1">Fleet Matched · No Driver Assigned</div>
                                                    <div className="text-[var(--text-dim)] text-[10px]">
                                                        {linkedVehicle?.basicDetails?.make} {linkedVehicle?.basicDetails?.model} — {linkedVehicle?.status}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </>
                                    );
                                })()}

                                <div className="space-y-3.5 text-xs">
                                    <div className="flex items-center justify-between border-b border-[var(--border-main)]/20 pb-2">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)] flex items-center gap-1"><User size={12} /> GPS Driver (Tracksolid)</span>
                                        <span className="font-bold text-white">{selectedTrackVehicle.driverName || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-[var(--border-main)]/20 pb-2">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)] flex items-center gap-1"><Phone size={12} /> Driver Phone</span>
                                        <span className="font-mono font-bold text-white">{selectedTrackVehicle.driverPhone || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border(--border-main)/20 pb-2">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)]">Plate Registration</span>
                                        <span className="font-bold text-white">{selectedTrackVehicle.vehicleNumber || 'Pending'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)]">VIN / Frame Reference</span>
                                        <span className="font-mono font-bold text-white">{selectedTrackVehicle.carFrame || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Service and expiration settings */}
                            <div className="p-6 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm space-y-4">
                                <h4 className="text-xs font-black uppercase text-[#C8E600] border-b border-[var(--border-main)] pb-3">Billing & Integration Lifecycle</h4>

                                <div className="space-y-3 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)]">Activation Date</span>
                                        <span className="font-bold text-white">{selectedTrackVehicle.activationTime}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)]">Contract Expiration</span>
                                        <span className="font-bold text-white">{selectedTrackVehicle.expiration}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)]">SIM Phone Card</span>
                                        <span className="font-mono font-bold text-white">{selectedTrackVehicle.sim}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-bold text-[var(--text-dim)]">Account Group</span>
                                        <span className="font-bold text-white">{selectedTrackVehicle.deviceGroup}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default GpsVehicles;
