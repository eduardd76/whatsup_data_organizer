import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { logger, createChildLogger } from '../utils/logger';
import { database } from '../storage/database';
import { ProcessingStatus } from '../types';
import { routeAndProcessEvent } from '../pipelines/router';
import { writeToNotion } from '../notion/writer';

// Redis connection
const connection = new Redis({
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword,
  db: config.redisDb,
  maxRetriesPerRequest: null,
});

interface JobData {
  eventId: string;
  traceId: string;
}

/**
 * Process intake event job
 */
async function processIntakeEventJob(job: Job<JobData>): Promise<void> {
  const { eventId, traceId } = job.data;
  const childLogger = createChildLogger(traceId);

  try {
    childLogger.info(`Processing job started: ${job.id}`);

    // Get intake event from database
    const event = await database.getIntakeEventById(eventId);
    if (!event) {
      throw new Error(`Intake event not found: ${eventId}`);
    }

    // Check if already processed
    if (event.processing_status === ProcessingStatus.COMPLETED) {
      childLogger.info(`Event already processed: ${eventId}`);
      return;
    }

    // Update status to processing
    await database.updateIntakeEventStatus(eventId, ProcessingStatus.PROCESSING);

    // Route and process through appropriate pipeline
    childLogger.info(`Routing event through pipeline: ${event.whatsapp_message_id}`);
    const result = await routeAndProcessEvent(event, traceId);

    childLogger.info(
      `Pipeline completed in ${result.processingTimeMs}ms using ${result.pipelineUsed}`
    );

    // Save enriched item to database
    const enrichedRecord = await database.createEnrichedItem(result.enrichedItem, eventId);
    childLogger.info(`Enriched item saved: ${enrichedRecord.id}`);

    // Write to Notion
    childLogger.info(`Writing to Notion...`);
    const notionPageId = await writeToNotion(result.enrichedItem, event.whatsapp_message_id);
    childLogger.info(`Notion page created: ${notionPageId}`);

    // Update enriched item with Notion page ID
    await database.updateEnrichedItemNotionPageId(enrichedRecord.id, notionPageId);

    // Update event status to completed
    await database.updateIntakeEventStatus(eventId, ProcessingStatus.COMPLETED);

    childLogger.info(`Job completed successfully: ${job.id}`);
  } catch (error) {
    childLogger.error(`Job failed: ${job.id}`, error);

    // Increment retry count
    const retryCount = await database.incrementRetryCount(eventId);

    if (retryCount >= config.maxRetries) {
      // Mark as failed
      await database.updateIntakeEventStatus(
        eventId,
        ProcessingStatus.FAILED,
        error instanceof Error ? error.message : String(error)
      );
      childLogger.error(`Job permanently failed after ${retryCount} retries`);
    } else {
      // Mark for retry
      await database.updateIntakeEventStatus(
        eventId,
        ProcessingStatus.RETRY,
        error instanceof Error ? error.message : String(error)
      );
      childLogger.warn(`Job will be retried (attempt ${retryCount}/${config.maxRetries})`);
    }

    throw error;
  }
}

/**
 * Create and start the worker
 */
export function createWorker(): Worker {
  const worker = new Worker<JobData>('intake-processing', processIntakeEventJob, {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  worker.on('completed', (job) => {
    logger.info(`Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job failed: ${job?.id}`, err);
  });

  worker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  return worker;
}

// Start worker if this file is run directly
if (require.main === module) {
  (async () => {
    try {
      await database.connect();
      logger.info('Database connected');

      const worker = createWorker();
      logger.info('Worker started and waiting for jobs...');

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, closing worker...');
        await worker.close();
        await database.disconnect();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        logger.info('SIGINT received, closing worker...');
        await worker.close();
        await database.disconnect();
        process.exit(0);
      });
    } catch (error) {
      logger.error('Failed to start worker:', error);
      process.exit(1);
    }
  })();
}
