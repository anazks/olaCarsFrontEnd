# Purchase Order Creation API Documentation

This guide explains how to use the updated `POST /api/purchase-order` endpoint to create a Purchase Order and upload item images simultaneously using `multipart/form-data`.

## Endpoint

`POST {{base_url}}/api/purchase-order`

## Headers
- `Authorization`: `Bearer <Your_JWT_Token>`
- *Do not manually set the `Content-Type` header (like `application/json`), let the browser or HTTP client set it automatically to `multipart/form-data` with its auto-generated boundary.*

## Request Body Structure

The request must be sent as `multipart/form-data` using `FormData`. 

### Method: Indexed FormData (Flattened Items)
This is the recommended approach for standard HTML/React forms. Each property of each item is appended individually with an index-based key.

| Field Key | Value Example |
|-----------|---------------|
| `purpose` | "Spare Parts" |
| `branch` | "65f1a2b3c4d5e6f..." |
| `supplier` | "65f1a2b3c4d5e6f..." |
| `items[0][itemName]` | "Brake Pads" |
| `items[0][quantity]` | "4" |
| `items[0][unitPrice]` | "45.0" |
| `items[0][images]` | (Binary File 1) |
| `items[0][images]` | (Binary File 2) |
| `items[1][itemName]` | "Oil Filter" |

#### Frontend code example:
```javascript
const formData = new FormData();
formData.append("purpose", "Spare Parts");
formData.append("branch", branchId);
formData.append("supplier", supplierId);

items.forEach((item, index) => {
    formData.append(`items[${index}][itemName]`, item.itemName);
    formData.append(`items[${index}][quantity]`, String(item.quantity));
    formData.append(`items[${index}][unitPrice]`, String(item.unitPrice));
    
    // Append each image for this item
    if (item.images) {
        item.images.forEach(file => {
            formData.append(`items[${index}][images]`, file);
        });
    }
});

const response = await axios.post('/api/purchase-order', formData);
```

### Alternative Method: JSON Stringified items
You can also send a single stringified JSON field for the items, with images still sent as indexed keys:
1. `formData.append("items", JSON.stringify(itemsArray));`
2. `formData.append("items[0][images]", file);`

---

## Troubleshooting & Important Notes
1. **Multer any()**: The backend uses `upload.any()`. It looks specifically for the `fieldname` matching `items[index][images]`.
2. **File Size**: Max **20MB** per image.
3. **Array Limit**: Max **8 images** per line item.
4. **Data Types**: The backend automatically converts the `quantity` and `unitPrice` strings from FormData into numbers.

