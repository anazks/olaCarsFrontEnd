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
