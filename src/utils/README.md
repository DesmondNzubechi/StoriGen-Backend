# Image Upload Functionality

This document describes the global image upload functionality implemented for the UNISHOPPING backend.

## Overview

The image upload system provides:
- Multiple image upload support (up to 10 images)
- Cloudinary integration for cloud storage
- Image optimization and resizing
- Secure file validation
- Support for different upload contexts (products, events, profiles)

## Files Created/Modified

### New Files:
1. `src/utils/multiImageUpload.ts` - Core upload utilities
2. `src/controllers/imageUploadController.ts` - Upload controllers
3. `src/routes/imageUploadRoutes.ts` - Upload routes

### Modified Files:
1. `src/controllers/productController.ts` - Added product-specific image upload functions
2. `src/routes/productRoute.ts` - Added product image upload routes
3. `src/App.ts` - Registered image upload routes

## API Endpoints

### General Image Upload
- `POST /api/v1/upload/upload` - Upload images to any folder
- `DELETE /api/v1/upload/delete` - Delete images by URLs

### Product-Specific Upload
- `POST /api/v1/upload/products` - Upload product images
- `POST /api/v1/products/with-images` - Create product with images
- `PUT /api/v1/products/:id/with-images` - Update product with images
- `DELETE /api/v1/products/:id/images` - Delete specific product images

### Event-Specific Upload
- `POST /api/v1/upload/events` - Upload event images

### Profile Upload
- `POST /api/v1/upload/profile` - Upload profile image

## Usage Examples

### Creating a Product with Images
```javascript
// Frontend example using FormData
const formData = new FormData();
formData.append('name', 'Product Name');
formData.append('description', 'Product Description');
formData.append('price', '99.99');
formData.append('category', 'Electronics');
formData.append('stock', '10');

// Add multiple images
for (let i = 0; i < imageFiles.length; i++) {
  formData.append('images', imageFiles[i]);
}

const response = await fetch('/api/v1/products/with-images', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Updating Product Images
```javascript
const formData = new FormData();
formData.append('name', 'Updated Product Name');
formData.append('keepExistingImages', 'true'); // Keep existing images
// Add new images
for (let i = 0; i < newImageFiles.length; i++) {
  formData.append('images', newImageFiles[i]);
}

const response = await fetch(`/api/v1/products/${productId}/with-images`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Deleting Product Images
```javascript
const response = await fetch(`/api/v1/products/${productId}/images`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageUrls: ['https://cloudinary.com/image1.jpg', 'https://cloudinary.com/image2.jpg']
  })
});
```

## Configuration

### File Limits
- Maximum file size: 5MB per image
- Maximum files: 10 images per upload
- Supported formats: All image formats (jpg, png, gif, webp, etc.)

### Cloudinary Settings
- Images are automatically resized to max 800x800 pixels
- Quality is optimized automatically
- Images are stored in organized folders (products, events, profiles)

### Security
- Only authenticated users can upload images
- Admin role required for product image uploads
- File type validation (images only)
- File size validation

## Error Handling

The system provides comprehensive error handling:
- File size exceeded
- Too many files
- Invalid file type
- Upload failures
- Cloudinary errors

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Images uploaded successfully",
  "data": {
    "count": 3,
    "urls": [
      "https://cloudinary.com/image1.jpg",
      "https://cloudinary.com/image2.jpg",
      "https://cloudinary.com/image3.jpg"
    ],
    "folder": "products"
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "File too large. Maximum size is 5MB per file.",
  "data": null
}
```

## Testing

You can test the image upload functionality using:
- Postman with multipart/form-data
- Frontend form with file input
- cURL commands

Example cURL command:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Test Product" \
  -F "description=Test Description" \
  -F "price=99.99" \
  -F "category=Electronics" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  http://localhost:3000/api/v1/products/with-images
``` 