import fetch from 'node-fetch';

async function checkData() {
    try {
        const vehiclesRes = await fetch('http://localhost:5000/api/vehicle?limit=100');
        const vehicles = await vehiclesRes.json();
        
        const driversRes = await fetch('http://localhost:5000/api/driver?limit=100');
        const drivers = await driversRes.json();
        
        const gpsVehiclesRes = await fetch('http://localhost:5000/api/gps/vehicles');
        const gpsVehicles = await gpsVehiclesRes.json();
        
        console.log("GPS Vehicle Samples:");
        gpsVehicles.data.slice(0, 3).forEach(g => {
            console.log(`IMEI: ${g.imei}, Plate(vehicleNumber): ${g.vehicleNumber}, VIN(carFrame): ${g.carFrame}`);
        });
        
        console.log("\nFleet Vehicle Samples:");
        vehicles.data.slice(0, 3).forEach(v => {
            console.log(`ID: ${v._id}, VIN: ${v.basicDetails?.vin}, Plate: ${v.legalDocs?.registrationNumber}`);
        });
        
        console.log("\nDriver Samples:");
        drivers.data.slice(0, 3).forEach(d => {
            console.log(`ID: ${d._id}, Name: ${d.personalInfo?.fullName}, currentVehicle:`, typeof d.currentVehicle === 'object' ? JSON.stringify(d.currentVehicle) : d.currentVehicle);
        });

    } catch (e) {
        console.error(e);
    }
}
checkData();
