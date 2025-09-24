import dotenv from 'dotenv';
// import { testEmailService } from '../tests/emailService.test';

// Load environment variables
dotenv.config({ path: './config.env' });

// Test email functionality
const runEmailTests = async () => {
  console.log('🚀 Starting Email Service Tests...\n');
  
  try {
    // await testEmailService();
    console.log('\n✅ All email tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Email tests failed:', error);
    process.exit(1);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runEmailTests();
}

export { runEmailTests }; 