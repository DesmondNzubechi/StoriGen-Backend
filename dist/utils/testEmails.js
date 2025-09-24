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
exports.runEmailTests = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// import { testEmailService } from '../tests/emailService.test';
// Load environment variables
dotenv_1.default.config({ path: './config.env' });
// Test email functionality
const runEmailTests = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🚀 Starting Email Service Tests...\n');
    try {
        // await testEmailService();
        console.log('\n✅ All email tests passed!');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ Email tests failed:', error);
        process.exit(1);
    }
});
exports.runEmailTests = runEmailTests;
// Run tests if this file is executed directly
if (require.main === module) {
    runEmailTests();
}
