# Frontend Integration Guide: Vehicle Insurance Flow Refactor

The vehicle insurance logic has been refactored to make insurance optional during onboarding and to move per-vehicle details (number, dates, certificate) into the [Vehicle]model.

## 1. Vehicle Onboarding Updates

### Mandatory Bypassing
You no longer need to provide insurance details to move a vehicle towards `ACTIVE` status.
- **Old Flow**: `DOCUMENTS REVIEW` -> `INSURANCE VERIFICATION` -> `INSPECTION REQUIRED`
- **New Flow**: `DOCUMENTS REVIEW` -> `INSPECTION REQUIRED` (Direct transition)

### Optional Insurance During Creation
When calling `POST /api/vehicle`, the `insuranceId` field is now **fully optional**.

---

## 2. Managing Insurance Details (Post-Active)

Insurance can be added after the vehicle is `ACTIVE` (or at any stage) using the unified progress endpoint.

### Update Insurance Data
- **Endpoint**: `PUT /api/vehicle/:id/progress`
- **Body**:
```json
{
  "targetStatus": "ACTIVE — AVAILABLE", // Or the vehicle's current status
  "updateData": {
    "insuranceDetails": {
      "plan": "OBJECT_ID", // From /api/insurance/eligible
      "insuranceNumber": "STRING",
      "fromDate": "DATE",
      "toDate": "DATE"
    }
  }
}
```

### Upload Insurance Certificate
- **Endpoint**: `POST /api/vehicle/:id/upload-documents`
- **Multipart Field**: `insuranceCertificate` (Type: File)
- **Result**: Automatically updates `vehicle.insuranceDetails.certificate`.

---

## 3. Insurance Plan Management

The [Insurance](file:///c:/Users/leno2/Desktop/OlaCarsBackend/Src/modules/Insurance/Controller/InsuranceController.js#156-170) model now represents a "Plan" rather than a single policy.

- **Creation**: `POST /api/insurance` - Fields like `policyNumber`, `startDate`, and `expiryDate` are now **optional** (since they are now mostly stored per-vehicle).
- **Drop-down for Vehicle**: Use `GET /api/insurance/eligible` to fetch available plans for the vehicle to link to.

---

## 4. Key Schema Remapping (Reference)

| Feature | New Path in Vehicle Model | Previous Path / Method |
| :--- | :--- | :--- |
| **Plan Link** | `insuranceDetails.plan` | `insurance (legacy ref)` |
| **Policy Number** | `insuranceDetails.insuranceNumber` | `insurance.policyNumber` |
| **Valid From** | `insuranceDetails.fromDate` | `insurance.startDate` |
| **Valid To** | `insuranceDetails.toDate` | `insurance.expiryDate` |
| **Certificate URL**| `insuranceDetails.certificate` | `insurancePolicy.policyDocument` |
