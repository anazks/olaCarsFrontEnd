# Frontend Onboarding & Assignment Implementation Guide

This guide breaks down the driver onboarding and vehicle assignment process into functional pages for the frontend.

## Page 1: Driver Registration (`DRAFT`)
- **Objective**: Collect basic driver information to start the application.
- **Action**: Call `POST /api/driver`
- **Fields required**:
  - `personalInfo.fullName`
  - `personalInfo.email`
  - `personalInfo.phone`
  - `branch` (The Branch ObjectId)
- **Result**: You'll receive a `driverId`. Save this for subsequent requests.

## Page 2: Document Upload & Detailed Entry
- **Objective**: Upload all required ID and License documents.
- **Action 1**: Call `POST /api/driver/:id/upload-documents` (once for each file or altogether).
- **Multipart Fields**: `photograph`, `idFrontImage`, `idBackImage`, `licenseFront`, `licenseBack`, `backgroundCheckDocument`.
- **Action 2**: Save additional driver data using `PUT /api/driver/:id/progress`.
  - Pass `targetStatus: "PENDING REVIEW"`.
  - Include data like `drivingLicense.licenseNumber` and `drivingLevel.expiryDate`.

> [!IMPORTANT]
> **Wait for all uploads to finish before progressing.** The status change WILL fail if documents are missing from the DB.

## Page 3: Staff Verification (Review)
- **Objective**: Internal staff (Finance/Operation) verifies the driver's info.
- **Action**: Call `PUT /api/driver/:id/progress` with `targetStatus: "VERIFICATION"`.
- **Pre-requisite**: Staff must first set `drivingLicense.verificationStatus` to `VERIFIED` and ensure `backgroundCheckDocument` exists.

## Page 4: Credit Check & Approval
- **Objective**: Perform the credit score assessment.
- **Action**: Call `PUT /api/driver/:id/progress` with `targetStatus: "CREDIT CHECK"`.
- **System Behavior**: The backend automatically generates a score. If the score is < 500, status becomes `REJECTED`. If 500-649, status becomes `MANAGER REVIEW`. If 650+, status becomes `APPROVED`.

## Page 5: Contract Generation & Signing
- **Objective**: Finalize the legal agreement.
- **Action 1**: If status is `APPROVED`, call `PUT /api/driver/:id/progress` with `targetStatus: "CONTRACT PENDING"`.
- **Action 2**: Once the driver signs, upload the signed PDF via `POST /api/driver/:id/upload-documents` using field `signedContract`.
- **Final Action**: Call `PUT /api/driver/:id/progress` with `targetStatus: "ACTIVE"`.

## Page 6: Vehicle Selection & Assignment
- **Objective**: Assign an available car to an `ACTIVE` driver.
- **Step 1**: Fetch available cars via `GET /api/vehicle/available`.
- **Step 2**: On "Confirm Assignment" click, call `POST /api/vehicle/:id/assign/:driverId`.
- **Payload**:
  ```json
  {
    "leaseDuration": 12, // In months
    "monthlyRent": 45000,
    "notes": "Optional lease notes"
  }
  ```
- **Success Outcome**:
  - Vehicle status changes to `ACTIVE — RENTED`.
  - Driver's `currentVehicle` field is updated.
  - A `Lease` record is automatically created in the backend.

---
## Common Field Name Mapping (Check your `FormData`)
- `licenseFront` -> `drivingLicense.frontImage`
- `idFrontImage` -> `identityDocs.idFrontImage`
- `signedContract` -> `contract.signedS3Key`
