# Frontend Integration Guide: Agreement & E-Signatures

This guide provides the workflow and API details for integrating the Agreement system, including dynamic templates and e-signatures.

## 1. Admin Workflow: Agreement Management

### A. Creating Templates with Placeholders
Admins can use `{{TAGS}}` in the TipTap editor to create dynamic contracts.
- **Get Available Tags**: `GET /api/agreements/placeholders`
  - Returns a list of supported tags like `{{DRIVER_NAME}}`, `{{VEHICLE_PLATE}}`, etc.
- **Saving**: Save the HTML raw from TipTap to `POST /api/agreements`.

---

## 2. Driver Workflow: Viewing & Signing

This is the process a driver follows after a car is assigned.

### Step 1: Check if Signature is Required
Before letting the driver proceed, check if they've signed the latest version.
- **Endpoint**: `GET /api/agreements/verify/:driverId/:agreementId`
- **Logic**: If `accepted: false`, redirect the driver to the "Sign Contract" page.

### Step 2: Render the Personalized Contract
Do **not** use the raw template. Fetch the rendered version which has the driver's name and car details already filled in.
- **Endpoint**: `GET /api/agreements/:agreementId/render`
- **Output**: Returns `renderedContent` (HTML) to display in the UI.

### Step 3: Capture Signature & Accept
The driver reviews the rendered HTML and signs.

#### A. Click-wrap (Checkbox)
- **UI**: A simple "I agree to the terms" checkbox.
- **Payload**:
  ```json
  {
    "agreementId": "...",
    "versionId": "...",
    "signatureType": "CLICK_WRAP"
  }
  ```

#### B. Typed Signature
- **UI**: An input field where the driver types their full name.
- **Payload**:
  ```json
  {
    "signatureType": "TYPED",
    "signatureData": "Johnathan Doe"
  }
  ```

#### C. Drawn Signature (Canvas)
- **UI**: A signature pad (canvas).
- **Process**:
  1. Export canvas as a Blob/File.
  2. Send as `multipart/form-data`.
- **Payload (Multipart)**:
  - `agreementId`, `versionId`, `signatureType: DRAWN`
  - `signatureImage`: (The file/blob from the canvas)

- **Submission Endpoint**: `POST /api/agreements/accept`

---

## 3. Implementation Checklist for Frontend

### [ ] Admin Page: Agreement Editor
- Fetch available placeholders and show them in a sidebar for easy copy-paste.
- Integrated TipTap editor for HTML content.

### [ ] Driver Page: Contract Viewer
- Fetch rendered HTML via `/:id/render`.
- Display HTML safely (e.g., `dangerouslySetInnerHTML` in React or similar).

### [ ] Driver Page: Signature Component
- Handle three modes: Checkbox, Typed, or Canvas.
- For Canvas: Use a library like `react-signature-canvas`.
- Convert canvas to File before uploading via `multipart/form-data`.

---

## API Summary Table

| Action | Method | Endpoint | Note |
| :--- | :--- | :--- | :--- |
| **Manage** | POST | `/api/agreements` | Create new template |
| **Discover** | GET | `/api/agreements/placeholders` | List all `{{TAGS}}` |
| **Verify** | GET | `/api/agreements/verify/:uId/:aId` | Check if signed |
| **Render** | GET | `/api/agreements/:id/render` | Get personalized HTML |
| **Sign** | POST | `/api/agreements/accept` | Submit signature (Multipart) |
