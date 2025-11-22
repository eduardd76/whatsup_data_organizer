import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { verifyWhatsAppSignature } from '../utils/crypto';
import { extractUrls } from '../utils/url';
import {
  IntakeEvent,
  IntakeSource,
  AttachmentKind,
  WhatsAppWebhookPayload,
  WhatsAppWebhookMessage,
} from '../types';
import { database } from '../storage/database';
import { downloadWhatsAppMedia } from './whatsapp-media';
import { enqueueProcessingJob } from '../queue/producer';

const router = Router();

/**
 * Webhook verification endpoint (GET)
 * WhatsApp will call this to verify the webhook
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsappWebhookVerifyToken) {
    logger.info('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * Webhook receiver endpoint (POST)
 * WhatsApp will send messages here
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const traceId = nanoid();
  const childLogger = logger.child({ traceId });

  try {
    // Verify signature if app secret is configured
    if (config.whatsappAppSecret) {
      const signature = req.headers['x-hub-signature-256'] as string;
      const rawBody = JSON.stringify(req.body);

      if (!signature || !verifyWhatsAppSignature(rawBody, signature, config.whatsappAppSecret)) {
        childLogger.warn('Invalid webhook signature');
        return res.sendStatus(403);
      }
    }

    const payload: WhatsAppWebhookPayload = req.body;

    // Quick acknowledgment
    res.sendStatus(200);

    // Process webhook payload asynchronously
    await processWhatsAppWebhook(payload, traceId);
  } catch (error) {
    childLogger.error('Error processing webhook:', error);
    // Still return 200 to avoid retries from WhatsApp
    res.sendStatus(200);
  }
});

/**
 * Process WhatsApp webhook payload
 */
async function processWhatsAppWebhook(
  payload: WhatsAppWebhookPayload,
  traceId: string
): Promise<void> {
  const childLogger = logger.child({ traceId });

  try {
    if (!payload.entry || payload.entry.length === 0) {
      childLogger.warn('No entries in webhook payload');
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (!change.value.messages || change.value.messages.length === 0) {
          continue;
        }

        for (const message of change.value.messages) {
          await processWhatsAppMessage(message, change.value.metadata, traceId);
        }
      }
    }
  } catch (error) {
    childLogger.error('Error processing WhatsApp webhook:', error);
  }
}

/**
 * Process individual WhatsApp message
 */
async function processWhatsAppMessage(
  message: WhatsAppWebhookMessage,
  metadata: any,
  traceId: string
): Promise<void> {
  const childLogger = logger.child({ traceId });

  try {
    // Check for duplicate
    const existing = await database.getIntakeEventByWhatsAppId(message.id);
    if (existing) {
      childLogger.info(`Message already processed: ${message.id}`);
      return;
    }

    // Build IntakeEvent
    const intakeEvent: IntakeEvent = {
      id: crypto.randomUUID(),
      source: IntakeSource.WHATSAPP,
      whatsapp_message_id: message.id,
      from_number: message.from,
      timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
      text: undefined,
      attachments: [],
      detected_urls: [],
      meta: {
        message,
        metadata,
      },
    };

    // Extract text
    if (message.type === 'text' && message.text) {
      intakeEvent.text = message.text.body;
      intakeEvent.detected_urls = extractUrls(message.text.body);
    }

    // Process attachments
    if (message.type === 'image' && message.image) {
      const mediaData = await downloadWhatsAppMedia(message.image.id, traceId);
      intakeEvent.attachments.push({
        kind: AttachmentKind.IMAGE,
        mime: message.image.mime_type,
        url: mediaData.s3Url,
        sha256: message.image.sha256,
        size: mediaData.size,
        caption: message.image.caption,
      });
      if (message.image.caption) {
        intakeEvent.text = (intakeEvent.text || '') + '\n' + message.image.caption;
        const captionUrls = extractUrls(message.image.caption);
        intakeEvent.detected_urls.push(...captionUrls);
      }
    }

    if (message.type === 'audio' && message.audio) {
      const mediaData = await downloadWhatsAppMedia(message.audio.id, traceId);
      intakeEvent.attachments.push({
        kind: AttachmentKind.AUDIO,
        mime: message.audio.mime_type,
        url: mediaData.s3Url,
        sha256: message.audio.sha256,
        size: mediaData.size,
      });
    }

    if (message.type === 'video' && message.video) {
      const mediaData = await downloadWhatsAppMedia(message.video.id, traceId);
      intakeEvent.attachments.push({
        kind: AttachmentKind.VIDEO,
        mime: message.video.mime_type,
        url: mediaData.s3Url,
        sha256: message.video.sha256,
        size: mediaData.size,
        caption: message.video.caption,
      });
      if (message.video.caption) {
        intakeEvent.text = (intakeEvent.text || '') + '\n' + message.video.caption;
        const captionUrls = extractUrls(message.video.caption);
        intakeEvent.detected_urls.push(...captionUrls);
      }
    }

    if (message.type === 'document' && message.document) {
      const mediaData = await downloadWhatsAppMedia(message.document.id, traceId);
      intakeEvent.attachments.push({
        kind: AttachmentKind.DOCUMENT,
        mime: message.document.mime_type,
        url: mediaData.s3Url,
        sha256: message.document.sha256,
        size: mediaData.size,
        caption: message.document.caption,
      });
      if (message.document.caption) {
        intakeEvent.text = (intakeEvent.text || '') + '\n' + message.document.caption;
        const captionUrls = extractUrls(message.document.caption);
        intakeEvent.detected_urls.push(...captionUrls);
      }
    }

    // Deduplicate URLs
    intakeEvent.detected_urls = [...new Set(intakeEvent.detected_urls)];

    // Save to database
    await database.createIntakeEvent(intakeEvent);
    childLogger.info(`Intake event created: ${intakeEvent.id}`);

    // Enqueue processing job
    await enqueueProcessingJob(intakeEvent.id, traceId);
    childLogger.info(`Processing job enqueued for event: ${intakeEvent.id}`);
  } catch (error) {
    childLogger.error('Error processing WhatsApp message:', error);
    throw error;
  }
}

export default router;
