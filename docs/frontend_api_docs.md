# System Settings API Documentation

The System Settings module allows you to manage global configurations in the backend. It uses a **key-value pair** structure where the value can be a simple type (number, string) or a complex object.

**Base URL:** `/api/system-settings`

---

## 1. List All Settings (Dashboard View)
Retrieves all configurations stored in the database. Useful for building a "Settings Dashboard" in the Admin panel.

- **URL:** `/`
- **Method:** `GET`
- **Auth Required:** Yes
- **Response:**
```json
{
    "success": true,
    "data": [
        { "key": "poApprovalThreshold", "value": 1000 },
        { "key": "anotherSetting", "value": "someValue" }
    ]
}
```

---

## 2. Get Single Setting
Retrieves the current value for a configuration key.

- **URL:** `/:key`
- **Method:** `GET`
- **Auth Required:** Yes (any authenticated user)
- **Path Parameters:**
    - `key`: The name of the setting (e.g., `poApprovalThreshold`)

### Response
```json
{
    "success": true,
    "key": "poApprovalThreshold",
    "value": 1000
}
```

---

## 2. Update Setting
Updates or creates a configuration key.

- **URL:** `/:key`
- **Method:** `PUT`
- **Auth Required:** Yes (**ADMIN only**)
- **Path Parameters:**
    - `key`: The name of the setting to update.

### Request Body
```json
{
    "value": 1500
}
```
*Note: The `value` can be a number, string, boolean, or complex object.*

### Response
```json
{
    "success": true,
    "data": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "key": "poApprovalThreshold",
        "value": 1500,
        "updatedBy": "65f1a2b3c4d5e6f7a8b9c0d2",
        "updatedAt": "2024-03-09T10:00:00.000Z"
    }
}
```

---

## Common Keys
| Key | Type | Description | Default |
| :--- | :--- | :--- | :--- |

---

## Future Extensibility
This API is **fully generic**. If you need to set a new threshold or configuration (e.g., `inventoryAlertLimit`), you **do not need any backend changes**.

Just call:
`PUT /api/system-settings/inventoryAlertLimit` with `{"value": 50}`

The backend will automatically create the key for you.
