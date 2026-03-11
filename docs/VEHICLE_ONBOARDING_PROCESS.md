# Vehicle Onboarding Process

This document outlines the step-by-step vehicle onboarding process within the Ola Cars system, including the specific actions, required documents, and role-based approvals for each stage.

---

## Process Overview

The onboarding journey progresses through a series of "gates." Each stage must be completed and approved before moving to the next.

| Stage | Status | Role(s) | Key Requirements |
|:---:|:---|:---|:---|
| **1** | **PENDING ENTRY** | Ops, BM, CM | Basic Specs + Document Upload |
| **2** | **DOCUMENTS REVIEW** | Ops, BM+ | Registration & Legal Verifications |
| **3** | **INSURANCE VERIFICATION** | Ops, Finance, BM+ | Policy details & Importation data |
| **4** | **INSPECTION REQUIRED** | Ops, BM+ | 23-item technical checklist |
| **5** | **ACCOUNTING SETUP** | Finance, Admin | Depreciation & Residual Value |
| **6** | **GPS ACTIVATION** | Ops, BM+ | Geofencing & Alert configuration |
| **7** | **BRANCH MANAGER APPROVAL** | **Branch Manager / CM** | Final authority review |
| **8** | **ACTIVE — AVAILABLE** | BM, Admin | Live in fleet |

---

## Detailed Stages

### 1. Vehicle Entry (`PENDING ENTRY`)
*   **Action**: Initialize the vehicle record and upload all physical documents.
*   **Data Required**: Make, Model, Year, VIN (Unique), Category, Fuel Type, Transmission, Engine Capacity, etc.
*   **Document Uploads**: 
    *   Purchase Receipt
    *   Registration Certificate
    *   Road Tax Disc
    *   Number Plates (Front/Rear)
    *   Roadworthiness Certificate
    *   Insurance Policy Doc
    *   Inspection Photos (Min 6 Exterior + Odometer)

### 2. Legal Documents Review (`DOCUMENTS REVIEW`)
*   **Action**: A secondary check of the uploaded legal paperwork.
*   **Data Entry**: Registration Number, Registration Expiry, Road Tax Expiry, Roadworthiness Expiry.
*   **Approval**: Confirms the vehicle is legally allowed on the road.

### 3. Insurance Verification (`INSURANCE VERIFICATION`)
*   **Action**: Validate the insurance coverage for the vehicle.
*   **Data Entry**: Provider Name, Policy Number, Coverage Dates, Premium & Excess Amounts.
*   **Importation (Optional)**: If the vehicle is imported, customs declaration and shipping references must be provided here.

### 4. Technical Inspection (`INSPECTION REQUIRED`)
*   **Action**: A thorough 23-point inspection covering engine, fluids, tires, lights, and safety systems.
*   **Gate**: 
    *   **Pass**: Moves to Accounting.
    *   **Fail**: Moves to `INSPECTION FAILED` → `REPAIR IN PROGRESS`. Once repairs are done, it returns to `INSPECTION REQUIRED` for re-check.

### 5. Accounting Setup (`ACCOUNTING SETUP`)
*   **Action**: Financial team configures the asset for book-keeping.
*   **Data Entry**: Depreciation Method (Straight-Line or Reducing Balance), Useful life in years, and Residual value.

### 6. GPS Activation (`GPS ACTIVATION`)
*   **Action**: Configure the tracking and telemetry settings.
*   **Data Entry**: Geofence zone assignment, Speed limit thresholds, Idle time alerts, and Mileage sync frequency.

### 7. Branch Manager Approval (`BRANCH MANAGER APPROVAL`)
*   **Action**: The ultimate "Quality Gate."
*   **Role Restrict**: **Only Branch Managers or Country Managers** can perform this action. 
*   **Gate**: Review all previous stages for compliance and accuracy.

### 8. Final Activation (`ACTIVE — AVAILABLE`)
*   **Status Change**: The vehicle status is set to `ACTIVE — AVAILABLE`.
*   **Result**: The vehicle is now visible in the fleet and available for rental or booking.

---

## Lifecycle States (Post-Onboarding)

Once active, a vehicle may cycle through these states:
*   **ACTIVE — RENTED**: System-set when a customer books the vehicle.
*   **ACTIVE — MAINTENANCE**: Pulled for routine service or emergency repairs.
*   **SUSPENDED**: Emergency hold (e.g., accident or legal dispute).
*   **TRANSFER PENDING**: Moving from one branch to another.
*   **RETIRED**: Permanent terminal state (Sold or Scrapped).
