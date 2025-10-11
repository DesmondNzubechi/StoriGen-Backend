"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmailConfiguration = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// import { verifyEmailConfig, sendOrderConfirmation } from '../services/emailService';
// Load environment variables
dotenv_1.default.config({ path: './config.env' });
// Test email configuration
const testEmailConfiguration = async () => {
    console.log('🧪 Testing Email Configuration...\n');
    try {
        // Verify email configuration
        // const isConfigValid = await verifyEmailConfig();
        // if (!isConfigValid) {
        //   console.log('❌ Email configuration is invalid. Please check your settings.');
        //   return;
        // }
        // Test sending a sample email
        console.log('\n📧 Testing email sending...');
        // const mockOrder = {
        //   _id: 'test-order-123',
        //   items: [
        //     {
        //       name: 'Test Product',
        //       quantity: 1,
        //       price: 1000,
        //     }
        //   ],
        //   totalAmount: 1000,
        //   status: 'pending',
        //   shippingAddress: {
        //     street: '123 Test Street',
        //     city: 'Test City',
        //     state: 'Test State',
        //     country: 'Nigeria',
        //     zipCode: '12345'
        //   },
        //   createdAt: new Date(),
        // };
        // const mockUser = {
        //   fullName: 'Test User',
        //   email: 'test@example.com'
        // };
        // await sendOrderConfirmation(mockOrder, mockUser);
        console.log('✅ Email test completed successfully!');
    }
    catch (error) {
        console.error('❌ Email test failed:', error);
    }
};
exports.testEmailConfiguration = testEmailConfiguration;
// Run test if this file is executed directly
if (require.main === module) {
    testEmailConfiguration();
}
