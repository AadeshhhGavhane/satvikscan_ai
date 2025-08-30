import Queue from 'bull';
import Redis from 'ioredis';

// Redis connection configuration
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Queue configuration
export const queueConfig = {
  // Maximum number of jobs that can be processed concurrently
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
  
  // Job processing timeout (30 minutes)
  timeout: 30 * 60 * 1000,
  
  // Retry configuration
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  
  // Remove completed jobs after 24 hours
  removeOnComplete: 24 * 60 * 60 * 1000,
  
  // Remove failed jobs after 7 days
  removeOnFail: 7 * 24 * 60 * 60 * 1000,
};

// Create the main food validation queue
export const foodValidationQueue = new Queue('food-validation', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: queueConfig.attempts,
    backoff: queueConfig.backoff,
    removeOnComplete: queueConfig.removeOnComplete,
    removeOnFail: queueConfig.removeOnFail,
  },
});

// Queue event handlers for monitoring
foodValidationQueue.on('error', (error: Error) => {
  console.error('❌ Queue error:', error);
});

foodValidationQueue.on('waiting', (jobId: string | number) => {
  console.log('⏳ Job waiting:', jobId);
});

foodValidationQueue.on('active', (job: Queue.Job) => {
  console.log('🔄 Job started:', job.id, 'Processing:', job.data.foodName || 'Unknown food');
});

foodValidationQueue.on('completed', (job: Queue.Job, result: any) => {
  console.log('✅ Job completed:', job.id, 'Result size:', JSON.stringify(result).length);
});

foodValidationQueue.on('failed', (job: Queue.Job, error: Error) => {
  console.error('💥 Job failed:', job.id, 'Error:', error.message);
});

export default foodValidationQueue; 