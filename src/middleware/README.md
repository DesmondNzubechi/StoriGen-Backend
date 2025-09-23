# Validation Middleware

This middleware provides comprehensive request body validation for the UNISHOPPING backend API. It checks if required data exists in the request body and returns appropriate error messages when validation fails.

## Features

- **Required field validation**: Ensures required fields are present in the request body
- **Type validation**: Validates data types (string, number, boolean, array, object)
- **Length validation**: Validates string and array lengths
- **Range validation**: Validates number ranges (min/max values)
- **Enum validation**: Validates that values match predefined options
- **Custom validation**: Supports custom validation functions
- **Multiple error messages**: Returns all validation errors in a single response

## Usage

### Basic Usage

```typescript
import { validateRequestBody } from '../middleware/validationMiddleware';

// Define validation rules
const rules = [
  { field: 'name', required: true, type: 'string', minLength: 2 },
  { field: 'email', required: true, type: 'string' },
  { field: 'age', type: 'number', min: 18 },
];

// Apply to route
router.post('/users', validateRequestBody(rules), createUser);
```

### Validation Rules

Each validation rule is an object with the following properties:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `field` | string | The field name in the request body | `'name'` |
| `required` | boolean | Whether the field is required | `true` |
| `type` | string | Data type to validate | `'string'`, `'number'`, `'boolean'`, `'array'`, `'object'` |
| `minLength` | number | Minimum length for strings | `3` |
| `maxLength` | number | Maximum length for strings | `100` |
| `min` | number | Minimum value for numbers | `0` |
| `max` | number | Maximum value for numbers | `100` |
| `enum` | string[] | Allowed values for the field | `['user', 'admin']` |
| `customValidation` | function | Custom validation function | `(value) => value.includes('@')` |
| `customMessage` | string | Custom error message | `'Invalid email format'` |

### Predefined Validation Rules

The middleware includes predefined validation rules for common use cases:

#### Product Validation
```typescript
import { productValidationRules } from '../middleware/validationMiddleware';

router.post('/products', validateRequestBody(productValidationRules), createProduct);
```

#### Coupon Validation
```typescript
import { couponValidationRules } from '../middleware/validationMiddleware';

router.post('/coupons', validateRequestBody(couponValidationRules), createCoupon);
```

#### User Validation
```typescript
import { createUserValidationRules } from '../middleware/validationMiddleware';

router.post('/users', validateRequestBody(createUserValidationRules), createUser);
```

#### Authentication Validation
```typescript
import { registerValidationRules, loginValidationRules } from '../middleware/validationMiddleware';

router.post('/register', validateRequestBody(registerValidationRules), registerUser);
router.post('/login', validateRequestBody(loginValidationRules), loginUser);
```

## Error Response Format

When validation fails, the middleware returns a 400 Bad Request with the following format:

```json
{
  "status": "error",
  "message": "name is required. email must be a string. age must be at least 18",
  "statusCode": 400
}
```

## Examples

### Example 1: User Registration
```typescript
const registerRules = [
  { field: 'fullName', required: true, type: 'string', minLength: 2, maxLength: 50 },
  { field: 'email', required: true, type: 'string', minLength: 5, maxLength: 100 },
  { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 100 },
  { field: 'confirmPassword', required: true, type: 'string', minLength: 6, maxLength: 100 },
];

router.post('/register', validateRequestBody(registerRules), registerUser);
```

### Example 2: Product Update
```typescript
const productUpdateRules = [
  { field: 'name', type: 'string', minLength: 1, maxLength: 100 },
  { field: 'price', type: 'number', min: 0 },
  { field: 'category', type: 'string', enum: ['electronics', 'clothing', 'books'] },
];

router.patch('/products/:id', validateRequestBody(productUpdateRules), updateProduct);
```

### Example 3: Custom Validation
```typescript
const customRules = [
  { 
    field: 'email', 
    required: true, 
    type: 'string',
    customValidation: (value) => value.includes('@') && value.includes('.'),
    customMessage: 'Please provide a valid email address'
  },
];

router.post('/contact', validateRequestBody(customRules), sendContact);
```

## Available Predefined Rules

- `productValidationRules` - For product creation and updates
- `couponValidationRules` - For coupon creation
- `couponValidationRulesForUpdate` - For coupon updates
- `validateCouponRules` - For coupon validation
- `userRoleValidationRules` - For user role updates
- `createUserValidationRules` - For user creation
- `updateUserValidationRules` - For user updates
- `registerValidationRules` - For user registration
- `loginValidationRules` - For user login
- `updateMeValidationRules` - For profile updates
- `changePasswordValidationRules` - For password changes
- `resetPasswordValidationRules` - For password resets
- `forgotPasswordValidationRules` - For forgot password requests
- `createReviewValidationRules` - For product reviews
- `updateOrderStatusValidationRules` - For order status updates
- `updatePaymentStatusValidationRules` - For payment status updates

## Testing

Run the validation middleware tests:

```bash
npm test src/tests/validationMiddleware.test.ts
```

The tests cover various validation scenarios including:
- Required field validation
- Type validation
- Length validation
- Range validation
- Enum validation
- Multiple error handling
- Optional field handling 