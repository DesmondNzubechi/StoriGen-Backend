"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContactForm = exports.bulkContactValidationRules = exports.contactAssignmentValidationRules = exports.contactUpdateValidationRules = exports.contactFormValidationRules = exports.productSearchValidationRules = exports.forgotPasswordValidationRules = exports.updateProfileValidationRules = exports.useCouponValidationRules = exports.couponValidationRules = exports.verifyPaymentValidationRules = exports.createPaymentValidationRules = exports.addToWishlistValidationRules = exports.updateReviewValidationRules = exports.createReviewValidationRules = exports.shippingAddressValidationRules = exports.orderItemValidationRules = exports.createOrderValidationRules = exports.updatePaymentStatusValidationRules = exports.updateOrderStatusValidationRules = exports.resetPasswordValidationRules = exports.changePasswordValidationRules = exports.updateMeValidationRules = exports.loginValidationRules = exports.registerValidationRules = exports.updateUserValidationRules = exports.createUserValidationRules = exports.userRoleValidationRules = exports.validateCouponRules = exports.couponValidationRulesForUpdate = exports.productValidationRules = exports.validateRequestBody = void 0;
const appError_1 = require("../errors/appError");
// Email validation function
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
// Password confirmation validation function
const validatePasswordConfirmation = (password, confirmPassword) => {
    return password === confirmPassword;
};
// File upload validation function
const validateFileUpload = (value, body, req) => {
    console.log('=== validateFileUpload DEBUG ===');
    console.log('req.files:', req.files);
    console.log('req.files type:', typeof req.files);
    console.log('req.files length:', req.files ? req.files.length : 'undefined');
    const files = req.files;
    const hasFiles = files && files.length > 0;
    console.log('hasFiles:', hasFiles);
    console.log('=== END validateFileUpload DEBUG ===');
    return hasFiles;
};
const validateRequestBody = (rules) => {
    return (req, res, next) => {
        const { body } = req;
        // Debug: Log the request body to see what's being received
        console.log('=== VALIDATION DEBUG ===');
        console.log('Request body:', JSON.stringify(body, null, 2));
        console.log('Request files:', req.files ? `${req.files.length} files` : 'No files');
        // Validate each field
        for (const rule of rules) {
            const { field, required, type, minLength, maxLength, min, max, enum: enumValues, customValidation, customMessage } = rule;
            // Special handling for file upload fields (like 'images')
            if (field === 'images' && customValidation) {
                console.log(`Checking file upload field "${field}":`, {
                    files: req.files ? `${req.files.length} files` : 'No files',
                    required
                });
                if (required && (!req.files || req.files.length === 0)) {
                    const errorMessage = customMessage || `${field} is required`;
                    console.log(`❌ File upload field "${field}" is required but missing. Error:`, errorMessage);
                    return next(new appError_1.AppError(errorMessage, 400));
                }
                // If files are present and required, validation passes
                console.log(`✅ File upload field "${field}" validation passed`);
                continue; // Skip regular validation for file upload fields
            }
            // Check if field is missing (only undefined or null, not empty string)
            const isFieldMissing = body[field] === undefined || body[field] === null;
            // Debug: Log field check
            console.log(`Checking field "${field}":`, {
                value: body[field],
                isFieldMissing,
                required,
                type: typeof body[field],
                actualType: type
            });
            if (required && isFieldMissing) {
                const errorMessage = customMessage || `${field} is required`;
                console.log(`❌ Field "${field}" is required but missing. Error:`, errorMessage);
                return next(new appError_1.AppError(errorMessage, 400));
            }
            // Skip validation if field is not provided and not required
            if (isFieldMissing) {
                continue;
            }
            // Type validation
            if (type) {
                const value = body[field];
                let isValidType = false;
                switch (type) {
                    case 'string':
                        isValidType = typeof value === 'string';
                        break;
                    case 'number':
                        // For multipart form data, numbers come as strings, so we need to convert them
                        if (typeof value === 'string') {
                            const numValue = parseFloat(value);
                            isValidType = !isNaN(numValue);
                            // Update the body with the converted number
                            if (isValidType) {
                                body[field] = numValue;
                            }
                        }
                        else {
                            isValidType = typeof value === 'number' && !isNaN(value);
                        }
                        break;
                    case 'boolean':
                        isValidType = typeof value === 'boolean';
                        break;
                    case 'array':
                        isValidType = Array.isArray(value);
                        break;
                    case 'object':
                        isValidType = typeof value === 'object' && !Array.isArray(value) && value !== null;
                        break;
                }
                if (!isValidType) {
                    const errorMessage = customMessage || `${field} must be a ${type}`;
                    console.log(`❌ Field "${field}" has invalid type. Error:`, errorMessage);
                    return next(new appError_1.AppError(errorMessage, 400));
                }
            }
            // String length validation
            if (type === 'string' && typeof body[field] === 'string') {
                if (minLength && body[field].length < minLength) {
                    const errorMessage = customMessage || `${field} must be at least ${minLength} characters long`;
                    console.log(`❌ Field "${field}" is too short. Error:`, errorMessage);
                    return next(new appError_1.AppError(errorMessage, 400));
                }
                if (maxLength && body[field].length > maxLength) {
                    const errorMessage = customMessage || `${field} must be no more than ${maxLength} characters long`;
                    console.log(`❌ Field "${field}" is too long. Error:`, errorMessage);
                    return next(new appError_1.AppError(errorMessage, 400));
                }
            }
            // Number range validation
            if (type === 'number' && typeof body[field] === 'number') {
                if (min !== undefined && body[field] < min) {
                    const errorMessage = customMessage || `${field} must be at least ${min}`;
                    console.log(`❌ Field "${field}" is below minimum. Error:`, errorMessage);
                    return next(new appError_1.AppError(errorMessage, 400));
                }
                if (max !== undefined && body[field] > max) {
                    const errorMessage = customMessage || `${field} must be no more than ${max}`;
                    console.log(`❌ Field "${field}" is above maximum. Error:`, errorMessage);
                    return next(new appError_1.AppError(errorMessage, 400));
                }
            }
            // Enum validation
            if (enumValues && !enumValues.includes(body[field])) {
                const errorMessage = customMessage || `${field} must be one of: ${enumValues.join(', ')}`;
                console.log(`❌ Field "${field}" has invalid enum value. Error:`, errorMessage);
                return next(new appError_1.AppError(errorMessage, 400));
            }
            // Custom validation
            if (customValidation && !customValidation(body[field], body, req)) {
                const errorMessage = customMessage || `${field} is invalid`;
                console.log(`❌ Field "${field}" failed custom validation. Error:`, errorMessage);
                return next(new appError_1.AppError(errorMessage, 400));
            }
        }
        console.log('✅ Validation passed for all fields');
        console.log('=== END VALIDATION DEBUG ===');
        next();
    };
};
exports.validateRequestBody = validateRequestBody;
// Predefined validation rules for common use cases
exports.productValidationRules = [
    { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 100, customMessage: 'Product name is required' },
    { field: 'description', required: true, type: 'string', minLength: 1, maxLength: 1000, customMessage: 'Product description is required' },
    { field: 'price', required: true, type: 'number', min: 0, customMessage: 'Product price is required' },
    { field: 'category', required: true, type: 'string', minLength: 1, maxLength: 50, customMessage: 'Product category is required' },
    { field: 'stock', required: true, type: 'number', min: 0, customMessage: 'Product stock is required' },
    { field: 'images', required: true, customValidation: validateFileUpload, customMessage: 'At least one product image is required' },
    { field: 'featured' },
    { field: 'discount', type: 'number', min: 0, max: 100, customMessage: 'Discount must be between 0 and 100 percent' },
];
exports.couponValidationRulesForUpdate = [
    { field: 'code', type: 'string', minLength: 1, maxLength: 20 },
    { field: 'type', type: 'string', enum: ['percentage', 'fixed'] },
    { field: 'value', type: 'number', min: 0 },
    { field: 'minPurchase', type: 'number', min: 0 },
    { field: 'maxDiscount', type: 'number', min: 0 },
    { field: 'startDate', type: 'string' },
    { field: 'endDate', type: 'string' },
    { field: 'usageLimit', type: 'number', min: 1 },
    { field: 'isActive', type: 'boolean' },
];
exports.validateCouponRules = [
    { field: 'code', required: true, type: 'string', minLength: 1 },
    { field: 'amount', required: true, type: 'number', min: 0 },
];
exports.userRoleValidationRules = [
    { field: 'role', required: true, type: 'string', enum: ['user', 'admin'] },
];
// User creation validation rules
exports.createUserValidationRules = [
    { field: 'fullName', required: true, type: 'string', minLength: 2, maxLength: 50, customMessage: 'Full name is required and must be between 2 and 50 characters' },
    { field: 'email', required: true, type: 'string', minLength: 5, maxLength: 100, customMessage: 'Email is required and must be between 5 and 100 characters' },
    { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 100, customMessage: 'Password is required and must be at least 6 characters long' },
    { field: 'confirmPassword', required: true, type: 'string', minLength: 6, maxLength: 100, customMessage: 'Password confirmation is required and must be at least 6 characters long' },
    { field: 'role', type: 'string', enum: ['user', 'admin'] },
];
// User update validation rules
exports.updateUserValidationRules = [
    { field: 'fullName', type: 'string', minLength: 2, maxLength: 50 },
    { field: 'email', type: 'string', minLength: 5, maxLength: 100 },
];
// Authentication validation rules
exports.registerValidationRules = [
    { field: 'fullName', required: true, type: 'string', minLength: 2, maxLength: 50, customMessage: 'Full name is required' },
    { field: 'email', required: true, type: 'string', minLength: 5, maxLength: 100, customValidation: (value) => isValidEmail(value), customMessage: 'Please provide a valid email address' },
    { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 100, customMessage: 'Password is required' },
    { field: 'confirmPassword', required: true, type: 'string', minLength: 6, maxLength: 100, customValidation: (value, body) => validatePasswordConfirmation(body.password, value), customMessage: 'Password and confirm password must match' },
];
exports.loginValidationRules = [
    { field: 'email', required: true, type: 'string', minLength: 5, maxLength: 100, customValidation: (value) => isValidEmail(value), customMessage: 'Please provide a valid email address' },
    { field: 'password', required: true, type: 'string', minLength: 1, customMessage: 'Password is required' },
];
exports.updateMeValidationRules = [
    { field: 'newEmail', required: true, type: 'string', minLength: 5, maxLength: 100 },
    { field: 'newFullName', required: true, type: 'string', minLength: 2, maxLength: 50 },
];
// Password change validation rules
exports.changePasswordValidationRules = [
    { field: 'currentPassword', required: true, type: 'string', minLength: 1 },
    { field: 'newPassword', required: true, type: 'string', minLength: 6, maxLength: 100 },
];
// Password reset validation rules
exports.resetPasswordValidationRules = [
    { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 100 },
    { field: 'confirmPassword', required: true, type: 'string', minLength: 6, maxLength: 100 },
];
// Order status update validation rules
exports.updateOrderStatusValidationRules = [
    { field: 'status', required: true, type: 'string', enum: ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'], customMessage: 'Order status is required and must be one of: pending, processing, shipped, delivered, cancelled' },
];
// Payment status update validation rules
exports.updatePaymentStatusValidationRules = [
    { field: 'status', required: true, type: 'string', enum: ['pending', 'completed', 'Confirmed', 'failed', 'refunded'], customMessage: 'Payment status is required and must be one of: pending, completed, failed, refunded' },
];
// Order creation validation rules
exports.createOrderValidationRules = [
    { field: 'items', required: true, type: 'array', customMessage: 'Order items are required' },
    { field: 'shippingAddress', required: true, type: 'object', customMessage: 'Shipping address is required' },
    { field: 'paymentMethod', required: true, type: 'string', enum: ['credit_card', 'paystack', 'bank_transfer'], customMessage: 'Payment method is required' },
    { field: 'shippingMethod', required: true, type: 'string', minLength: 1, customMessage: 'Shipping method is required' },
];
// Order item validation rules
exports.orderItemValidationRules = [
    { field: 'product', required: true, type: 'string', minLength: 1, customMessage: 'Product ID is required' },
    { field: 'quantity', required: true, type: 'number', min: 1, customMessage: 'Quantity is required and must be at least 1' },
    { field: 'price', required: true, type: 'number', min: 0, customMessage: 'Price is required and must be a positive number' },
];
// Shipping address validation rules
exports.shippingAddressValidationRules = [
    { field: 'street', required: true, type: 'string', minLength: 5, maxLength: 200, customMessage: 'Street address is required and must be between 5 and 200 characters' },
    { field: 'city', required: true, type: 'string', minLength: 2, maxLength: 100, customMessage: 'City is required and must be between 2 and 100 characters' },
    { field: 'state', required: true, type: 'string', minLength: 2, maxLength: 100, customMessage: 'State is required and must be between 2 and 100 characters' },
    { field: 'country', required: true, type: 'string', minLength: 2, maxLength: 100, customMessage: 'Country is required and must be between 2 and 100 characters' },
    { field: 'zipCode', required: true, type: 'string', minLength: 3, maxLength: 20, customMessage: 'Zip code is required and must be between 3 and 20 characters' },
];
// Review creation validation rules (enhanced)
exports.createReviewValidationRules = [
    { field: 'productId', required: true, type: 'string', minLength: 1, customMessage: 'Product ID is required' },
    { field: 'rating', required: true, type: 'number', min: 1, max: 5, customMessage: 'Rating is required' },
    { field: 'title', required: true, type: 'string', minLength: 3, maxLength: 100, customMessage: 'Review title is required' },
    { field: 'comment', required: true, type: 'string', minLength: 10, maxLength: 1000, customMessage: 'Review comment is required' },
];
// Review update validation rules
exports.updateReviewValidationRules = [
    { field: 'rating', type: 'number', min: 1, max: 5, customMessage: 'Rating must be between 1 and 5' },
    { field: 'title', type: 'string', minLength: 3, maxLength: 100, customMessage: 'Review title must be between 3 and 100 characters' },
    { field: 'comment', type: 'string', minLength: 10, maxLength: 1000, customMessage: 'Review comment must be between 10 and 1000 characters' },
];
// Wishlist validation rules
exports.addToWishlistValidationRules = [
    { field: 'productId', required: true, type: 'string', minLength: 1, customMessage: 'Product ID is required' },
];
// Payment validation rules
exports.createPaymentValidationRules = [
    { field: 'orderId', required: true, type: 'string', minLength: 1, customMessage: 'Order ID is required' },
    { field: 'amount', required: true, type: 'number', min: 0, customMessage: 'Payment amount is required and must be a positive number' },
    { field: 'paymentMethod', required: true, type: 'string', enum: ['credit_card', 'paypal', 'bank_transfer'], customMessage: 'Payment method is required and must be one of: credit_card, paypal, bank_transfer' },
    { field: 'currency', type: 'string', enum: ['NGN', 'USD', 'EUR', 'GBP'], customMessage: 'Currency must be one of: NGN, USD, EUR, GBP' },
];
// Payment verification validation rules
exports.verifyPaymentValidationRules = [
    { field: 'reference', required: true, type: 'string', minLength: 1, customMessage: 'Payment reference is required' },
];
// Coupon validation rules (enhanced)
exports.couponValidationRules = [
    { field: 'code', required: true, type: 'string', minLength: 3, maxLength: 20, customMessage: 'Coupon code is required and must be between 3 and 20 characters' },
    { field: 'type', required: true, type: 'string', enum: ['percentage', 'fixed'], customMessage: 'Coupon type is required and must be either percentage or fixed' },
    { field: 'value', required: true, type: 'number', min: 0, customMessage: 'Coupon value is required and must be a positive number' },
    { field: 'minPurchase', type: 'number', min: 0, customMessage: 'Minimum purchase amount must be a positive number' },
    { field: 'maxDiscount', type: 'number', min: 0, customMessage: 'Maximum discount must be a positive number' },
    { field: 'startDate', required: true, type: 'string', customMessage: 'Start date is required' },
    { field: 'endDate', required: true, type: 'string', customMessage: 'End date is required' },
    { field: 'usageLimit', type: 'number', min: 1, customMessage: 'Usage limit must be at least 1' },
    { field: 'isActive', type: 'boolean' },
];
// Coupon usage validation rules
exports.useCouponValidationRules = [
    { field: 'code', required: true, type: 'string', minLength: 1, customMessage: 'Coupon code is required' },
    { field: 'amount', required: true, type: 'number', min: 0, customMessage: 'Purchase amount is required and must be a positive number' },
];
// User profile update validation rules
exports.updateProfileValidationRules = [
    { field: 'fullName', type: 'string', minLength: 2, maxLength: 50, customMessage: 'Full name must be between 2 and 50 characters' },
    { field: 'email', type: 'string', minLength: 5, maxLength: 100, customValidation: (value) => isValidEmail(value), customMessage: 'Please provide a valid email address' },
    { field: 'phone', type: 'string', minLength: 10, maxLength: 15, customMessage: 'Phone number must be between 10 and 15 characters' },
    { field: 'address', type: 'string', minLength: 10, maxLength: 200, customMessage: 'Address must be between 10 and 200 characters' },
];
// Password reset request validation rules
exports.forgotPasswordValidationRules = [
    { field: 'email', required: true, type: 'string', minLength: 5, maxLength: 100, customValidation: (value) => isValidEmail(value), customMessage: 'Please provide a valid email address' },
];
// Product search/filter validation rules
exports.productSearchValidationRules = [
    { field: 'search', type: 'string', minLength: 1, maxLength: 100, customMessage: 'Search term must be between 1 and 100 characters' },
    { field: 'category', type: 'string', minLength: 1, maxLength: 50, customMessage: 'Category must be between 1 and 50 characters' },
    { field: 'minPrice', type: 'number', min: 0, customMessage: 'Minimum price must be a positive number' },
    { field: 'maxPrice', type: 'number', min: 0, customMessage: 'Maximum price must be a positive number' },
    { field: 'rating', type: 'number', min: 1, max: 5, customMessage: 'Rating filter must be between 1 and 5' },
    { field: 'featured', type: 'boolean' },
    { field: 'sortBy', type: 'string', enum: ['price', 'name', 'rating', 'createdAt'], customMessage: 'Sort by must be one of: price, name, rating, createdAt' },
    { field: 'sortOrder', type: 'string', enum: ['asc', 'desc'], customMessage: 'Sort order must be either asc or desc' },
    { field: 'page', type: 'number', min: 1, customMessage: 'Page number must be at least 1' },
    { field: 'limit', type: 'number', min: 1, max: 100, customMessage: 'Limit must be between 1 and 100' },
];
// Contact form validation rules
exports.contactFormValidationRules = [
    { field: 'name', required: true, type: 'string', minLength: 2, maxLength: 100, customMessage: 'Name is required and must be between 2 and 100 characters' },
    { field: 'email', required: true, type: 'string', minLength: 5, maxLength: 100, customValidation: (value) => isValidEmail(value), customMessage: 'Please provide a valid email address' },
    { field: 'phone', type: 'string', minLength: 10, maxLength: 20, customMessage: 'Phone number must be between 10 and 20 characters' },
    { field: 'subject', required: true, type: 'string', minLength: 5, maxLength: 200, customMessage: 'Subject is required and must be between 5 and 200 characters' },
    { field: 'message', required: true, type: 'string', minLength: 10, maxLength: 2000, customMessage: 'Message is required and must be between 10 and 2000 characters' },
    { field: 'category', type: 'string', enum: ['general', 'support', 'sales', 'complaint', 'suggestion', 'technical'], customMessage: 'Category must be one of: general, support, sales, complaint, suggestion, technical' },
    { field: 'source', type: 'string', enum: ['website', 'mobile', 'email', 'phone'], customMessage: 'Source must be one of: website, mobile, email, phone' },
];
// Contact update validation rules (Admin only)
exports.contactUpdateValidationRules = [
    { field: 'status', type: 'string', enum: ['new', 'in_progress', 'resolved', 'closed'], customMessage: 'Status must be one of: new, in_progress, resolved, closed' },
    { field: 'priority', type: 'string', enum: ['low', 'medium', 'high', 'urgent'], customMessage: 'Priority must be one of: low, medium, high, urgent' },
    { field: 'assignedTo', type: 'string', minLength: 1, customMessage: 'Assigned user ID must be provided' },
    { field: 'response', type: 'string', minLength: 1, maxLength: 2000, customMessage: 'Response must be between 1 and 2000 characters' },
    { field: 'tags', type: 'array', customMessage: 'Tags must be an array' },
    { field: 'isRead', type: 'boolean' },
];
// Contact assignment validation rules
exports.contactAssignmentValidationRules = [
    { field: 'assignedTo', required: true, type: 'string', minLength: 1, customMessage: 'Assigned user ID is required' },
];
// Bulk contact operations validation rules
exports.bulkContactValidationRules = [
    { field: 'contactIds', required: true, type: 'array', customMessage: 'Contact IDs array is required' },
    { field: 'updateData', type: 'object', customMessage: 'Update data must be an object' },
];
// Contact form validation middleware
exports.validateContactForm = (0, exports.validateRequestBody)(exports.contactFormValidationRules);
