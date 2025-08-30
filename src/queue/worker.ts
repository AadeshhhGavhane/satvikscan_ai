import { foodValidationQueue } from './config';
import { processFoodValidation, FoodValidationTask } from './processor';

console.log('🚀 Starting food validation worker...');

// Process jobs from the queue
foodValidationQueue.process('food-validation', async (job) => {
  console.log(`📥 Worker received job ${job.id}`);
  
  try {
    const result = await processFoodValidation(job);
    console.log(`✅ Job ${job.id} processed successfully`);
    return result;
  } catch (error) {
    console.error(`💥 Worker error processing job ${job.id}:`, error);
    throw error; // This will trigger the retry mechanism
  }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down worker gracefully...');
  await foodValidationQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down worker gracefully...');
  await foodValidationQueue.close();
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('✅ Food validation worker started successfully');
console.log('📊 Queue status:', {
  name: foodValidationQueue.name,
});

export default foodValidationQueue; 