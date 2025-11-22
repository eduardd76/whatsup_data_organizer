import { Queue } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import Redis from 'ioredis';

// Redis connection
const connection = new Redis({
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword,
  db: config.redisDb,
  maxRetriesPerRequest: null,
});

// Queue for processing intake events
export const processingQueue = new Queue('intake-processing', {
  connection,
  defaultJobOptions: {
    attempts: config.maxRetries,
    backoff: {
      type: 'exponential',
      delay: config.retryBackoffMs,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

/**
 * Enqueue a processing job for an intake event
 */
export async function enqueueProcessingJob(eventId: string, traceId: string): Promise<void> {
  try {
    await processingQueue.add(
      'process-intake-event',
      {
        eventId,
        traceId,
      },
      {
        jobId: eventId, // Use eventId as jobId for idempotency
        timeout: config.jobTimeoutMs,
      }
    );

    logger.info(`Job enqueued: ${eventId}`, { traceId });
  } catch (error) {
    logger.error(`Failed to enqueue job: ${eventId}`, { error, traceId });
    throw error;
  }
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    processingQueue.getWaitingCount(),
    processingQueue.getActiveCount(),
    processingQueue.getCompletedCount(),
    processingQueue.getFailedCount(),
    processingQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

/**
 * Cleanup old jobs
 */
export async function cleanupJobs() {
  await processingQueue.clean(24 * 3600 * 1000, 1000, 'completed');
  await processingQueue.clean(7 * 24 * 3600 * 1000, 5000, 'failed');
  logger.info('Queue cleanup completed');
}
