"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmailConfiguration = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const emailService_1 = require("../services/emailService");
// Load environment variables
dotenv_1.default.config({ path: './config.env' });
// Test email configuration
const testEmailConfiguration = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🧪 Testing Email Configuration...\n');
    try {
        // Verify email configuration
        const isConfigValid = yield (0, emailService_1.verifyEmailConfig)();
        if (!isConfigValid) {
            console.log('❌ Email configuration is invalid. Please check your settings.');
            return;
        }
        // Test sending a sample email
        console.log('\n📧 Testing email sending...');
        const mockOrder = {
            _id: 'test-order-123',
            items: [
                {
                    name: 'Test Product',
                    quantity: 1,
                    price: 1000,
                }
            ],
            totalAmount: 1000,
            status: 'pending',
            shippingAddress: {
                street: '123 Test Street',
                city: 'Test City',
                state: 'Test State',
                country: 'Nigeria',
                zipCode: '12345'
            },
            createdAt: new Date(),
        };
        const mockUser = {
            fullName: 'Test User',
            email: 'test@example.com'
        };
        yield (0, emailService_1.sendOrderConfirmation)(mockOrder, mockUser);
        console.log('✅ Email test completed successfully!');
    }
    catch (error) {
        console.error('❌ Email test failed:', error);
    }
});
exports.testEmailConfiguration = testEmailConfiguration;
// Run test if this file is executed directly
if (require.main === module) {
    testEmailConfiguration();
}
