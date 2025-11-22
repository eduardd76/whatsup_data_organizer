import {
  IntakeEvent,
  PipelineContext,
  PipelineResult,
  EnrichedItemType,
  AttachmentKind,
} from '../types';
import { isYouTubeUrl } from '../utils/url';
import { logger } from '../utils/logger';

// Import pipelines
import { TextPipeline } from './text-pipeline';
import { UrlPipeline } from './url-pipeline';
import { YouTubePipeline } from './youtube-pipeline';
import { ImagePipeline } from './image-pipeline';
import { DocPipeline } from './doc-pipeline';
import { AudioPipeline } from './audio-pipeline';
import { VideoPipeline } from './video-pipeline';
import { MixedPipeline } from './mixed-pipeline';

// Initialize pipelines
const textPipeline = new TextPipeline();
const urlPipeline = new UrlPipeline();
const youtubePipeline = new YouTubePipeline();
const imagePipeline = new ImagePipeline();
const docPipeline = new DocPipeline();
const audioPipeline = new AudioPipeline();
const videoPipeline = new VideoPipeline();
const mixedPipeline = new MixedPipeline();

/**
 * Route intake event to appropriate pipeline and process
 */
export async function routeAndProcessEvent(
  event: IntakeEvent,
  traceId: string
): Promise<PipelineResult> {
  const context: PipelineContext = {
    event,
    traceId,
    timestamp: new Date(),
  };

  const childLogger = logger.child({ traceId });
  const startTime = Date.now();

  // Determine which pipeline to use
  let pipeline;
  let pipelineName: string;

  const hasText = !!event.text && event.text.trim().length > 0;
  const hasUrls = event.detected_urls.length > 0;
  const hasAttachments = event.attachments.length > 0;
  const hasYouTube = hasUrls && event.detected_urls.some((url) => isYouTubeUrl(url));

  const imageAttachments = event.attachments.filter((a) => a.kind === AttachmentKind.IMAGE);
  const audioAttachments = event.attachments.filter((a) => a.kind === AttachmentKind.AUDIO);
  const videoAttachments = event.attachments.filter((a) => a.kind === AttachmentKind.VIDEO);
  const docAttachments = event.attachments.filter((a) => a.kind === AttachmentKind.DOCUMENT);

  // Router logic (priority order)
  if (hasYouTube) {
    pipeline = youtubePipeline;
    pipelineName = 'YouTubePipeline';
  } else if (hasAttachments && hasUrls) {
    pipeline = mixedPipeline;
    pipelineName = 'MixedPipeline';
  } else if (hasAttachments && hasText) {
    pipeline = mixedPipeline;
    pipelineName = 'MixedPipeline';
  } else if (hasUrls && !hasAttachments) {
    pipeline = urlPipeline;
    pipelineName = 'UrlPipeline';
  } else if (docAttachments.length > 0) {
    pipeline = docPipeline;
    pipelineName = 'DocPipeline';
  } else if (imageAttachments.length > 0) {
    pipeline = imagePipeline;
    pipelineName = 'ImagePipeline';
  } else if (audioAttachments.length > 0) {
    pipeline = audioPipeline;
    pipelineName = 'AudioPipeline';
  } else if (videoAttachments.length > 0) {
    pipeline = videoPipeline;
    pipelineName = 'VideoPipeline';
  } else if (hasText) {
    pipeline = textPipeline;
    pipelineName = 'TextPipeline';
  } else {
    // Fallback to text pipeline
    pipeline = textPipeline;
    pipelineName = 'TextPipeline';
  }

  childLogger.info(`Routing to ${pipelineName}`);

  // Process through pipeline
  const enrichedItem = await pipeline.process(context);

  const processingTimeMs = Date.now() - startTime;

  childLogger.info(`Pipeline completed: ${pipelineName} in ${processingTimeMs}ms`);

  return {
    enrichedItem,
    processingTimeMs,
    pipelineUsed: pipelineName,
  };
}
