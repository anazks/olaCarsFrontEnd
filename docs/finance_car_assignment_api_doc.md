# Car Assignment & Vehicle Rental API Documentation

This document outlines the new features implemented to allow Finance Staff to manage vehicle rentals and assign cars to drivers.

## 1. Database Model Changes

### Vehicle Model
- Added `basicDetails.monthlyRent` (Number): The monthly rental price for the vehicle.
- Statuses used:
  - `ACTIVE — AVAILABLE`: Vehicle is ready to be rented.
  - `ACTIVE — RENTED`: Vehicle is currently assigned to a driver.

### Driver Model
- Added `currentVehicle` (ObjectId): Reference to the currently assigned [Vehicle](file:///c:/Users/leno2/Desktop/OlaCarsBackend/Src/modules/Vehicle/Controller/VehicleController.js#11-64).

---

## 2. API Endpoints

### 2.1 Get Available Vehicles
Fetches all vehicles that are available for rental within the logged-in user's branch.

- **URL**: `GET /api/vehicle/available`
- **Access Control**: `FINANCESTAFF`, `BRANCHMANAGER`, `ADMIN`
- **Filtering**:
  - Automatically filters by `status: "ACTIVE — AVAILABLE"`.
  - Automatically filters by `purchaseDetails.branch` (based on the user's token).
- **Supports Pagination/Sort/Search**: Yes, via standard query parameters.

### 2.2 Assign Vehicle to Driver
Assigns an available vehicle to a specific driver.

- **URL**: `POST /api/vehicle/:id/assign/:driverId`
- **Access Control**: `FINANCESTAFF`, `BRANCHMANAGER`, `ADMIN`
- **Logic**:
  1. Validates the vehicle is in `ACTIVE — AVAILABLE` status.
  2. Updates vehicle status to `ACTIVE — RENTED`.
  3. Updates the driver's `currentVehicle` field.
  4. Records the assignment in the `statusHistory` of both the vehicle and the driver for auditing.

---

## 3. Workflow Overview

1. **Finance Staff** logs in.
2. Calls `GET /api/vehicle/available` to see available cars in their branch.
3. Selects a car and a driver.
4. Calls `POST /api/vehicle/:carId/assign/:driverId`.
5. The system handles the state transition and audit trail updates.
