import api from './api';

export interface GpsVehicle {
    imei: string;
    deviceName: string;
    mcType: string;
    mcTypeUseScope: string;
    sim: string;
    expiration: string;
    activationTime: string;
    reMark: string;
    vehicleName: string | null;
    vehicleIcon: string;
    vehicleNumber: string;
    vehicleModels: string;
    carFrame: string;
    driverName: string;
    driverPhone: string;
    enabledFlag: number;
    engineNumber: string;
    status: string;
    deviceGroupId: string;
    deviceGroup: string;
}

export interface GpsLocation {
    imei: string;
    lat: number;
    lng: number;
    posType: string;
    speed: number;
    gpsTime: string;
    hbTime: string;
    accStatus: number;
    status: number;
    direction?: number;
    electQuantity?: number;
    locDesc?: string;
}

export const getGpsVehiclesList = async (): Promise<GpsVehicle[]> => {
    const response = await api.get('/api/gps/vehicles');
    return response.data.data;
};

export const getGpsLocationsList = async (imeis?: string): Promise<GpsLocation[]> => {
    const params = imeis ? { imeis } : {};
    const response = await api.get('/api/gps/locations', { params });
    return response.data.data;
};

export const getDeviceLiveStreamingUrl = async (imei: string): Promise<string> => {
    const response = await api.get('/api/gps/live-stream', { params: { imei } });
    return response.data.data;
};

export const getDeviceMediaEventUrl = async (imei: string): Promise<string> => {
    const response = await api.get('/api/gps/media-event', { params: { imei } });
    return response.data.data;
};

export interface GpsMileage {
    imei: string;
    startTime: string;
    endTime: string;
    elapsed: number;
    distance: number;
    avgSpeed: number;
    totalMileage: number;
}

export interface GpsNotification {
    _id?: string;
    imei: string;
    deviceName?: string;
    msgType: string;
    alarmType?: string;
    alarmName?: string;
    lat?: number;
    lng?: number;
    speed?: number;
    avgSpeed?: number;
    totalMileage?: number;
    alarmTime?: string;
    receivedAt?: string;
}

export const getGpsTripsReport = async (imei: string, startTime: string, endTime: string, startRow?: number): Promise<any[]> => {
    const params = { imei, startTime, endTime, startRow: startRow || 1 };
    const response = await api.get('/api/gps/trips-report', { params });
    return response.data.data;
};

export const getGpsMileageList = async (imeis: string, startTime?: string, endTime?: string): Promise<GpsMileage[]> => {
    try {
        const imeiArray = imeis.split(',').map(i => i.trim()).filter(Boolean);
        if (imeiArray.length === 0) return [];

        // Batch IMEIs into chunks of 20 per HTTP GET request to avoid URI too long and server timeouts
        const chunkSize = 20;
        const chunks: string[][] = [];
        for (let i = 0; i < imeiArray.length; i += chunkSize) {
            chunks.push(imeiArray.slice(i, i + chunkSize));
        }

        const results = await Promise.all(
            chunks.map(async (chunk) => {
                try {
                    const params = { imeis: chunk.join(','), startTime, endTime };
                    const response = await api.get('/api/gps/mileage', { params });
                    return (response.data && Array.isArray(response.data.data)) ? response.data.data : [];
                } catch (err) {
                    console.warn('[GPS Service] Mileage chunk fetch error:', err);
                    return chunk.map(imei => ({
                        imei,
                        startTime: startTime || '',
                        endTime: endTime || '',
                        elapsed: 0,
                        distance: 0,
                        avgSpeed: 0,
                        totalMileage: 0
                    }));
                }
            })
        );

        return results.flat();
    } catch (err) {
        console.error('[GPS Service] getGpsMileageList failed:', err);
        return [];
    }
};

export const getGpsNotificationsList = async (imei?: string, limit?: number): Promise<GpsNotification[]> => {
    const params = { imei, limit };
    const response = await api.get('/api/gps/notifications', { params });
    return response.data.data;
};

export interface GpsObdData {
    imei: string;
    dataReportTime: string;
    odometerReading?: string;
    deviceAccumulatedMileage?: string;
    remainingFuel?: string | null;
    remainingFuelPercentage?: string;
    coolantTemperature?: string;
    vehicleBatterVoltage?: string;
    currentRPM?: string;
    currentSpeed?: string;
    vin?: string;
}

export const getGpsObdData = async (imei: string, startTime?: string, endTime?: string): Promise<any> => {
    const params = { imei, startTime, endTime };
    const response = await api.get('/api/gps/obd', { params });
    console.log("[GPS Service] getGpsObdData RESPONSE:", response.data);
    return response.data.data || response.data;
};


/**
 * Find GPS device matching a fleet vehicle by VIN (carFrame) or plate (vehicleNumber).
 * Primary match: GPS carFrame === fleet basicDetails.vin
 * Secondary match: GPS vehicleNumber === fleet legalDocs.registrationNumber
 */
export const findGpsDeviceByVehicle = (
    gpsVehicles: GpsVehicle[],
    vin?: string,
    plateNumber?: string
): GpsVehicle | undefined => {
    if (!gpsVehicles.length) return undefined;

    const vinUpper = vin?.toUpperCase().trim();
    const plateUpper = plateNumber?.toUpperCase().trim();

    return gpsVehicles.find(g => {
        const gVin = g.carFrame?.toUpperCase().trim();
        const gPlate = g.vehicleNumber?.toUpperCase().trim();

        return (
            (gVin && vinUpper && gVin === vinUpper) ||
            (gPlate && plateUpper && gPlate === plateUpper) ||
            (gVin && plateUpper && gVin === plateUpper) ||
            (gPlate && vinUpper && gPlate === vinUpper)
        );
    });
};

export interface FleetSummaryRow {
    imei: string;
    device: string;
    group: string;
    vehicleNumber?: string;
    customerName?: string;
    driverName?: string;
    driverStatus?: string;
    distance: number;
    maxSpeed: number;
    engineHoursSeconds: number;
    engineHoursFormatted: string;
    fuelConsumed: number;
    startDate: string;
    odometerStart: number;
    odometerEnd: number;
    averageSpeed: number;
    tripCount: number;
}

export interface FleetSummaryTotals {
    totalDevices: number;
    totalDistance: number;
    totalFuel: number;
    averageSpeed: number;
    totalEngineHoursSeconds: number;
    totalEngineHoursFormatted: string;
}

export interface FleetSummaryReportData {
    summaryRows: FleetSummaryRow[];
    totals: FleetSummaryTotals;
}

export const getFleetSummaryReport = async (params: {
    imeis?: string;
    group?: string;
    startTime?: string;
    endTime?: string;
    reportType?: string;
}): Promise<FleetSummaryReportData> => {
    const response = await api.get('/api/gps/fleet-summary-report', { params });
    return response.data.data;
};
