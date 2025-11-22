import { AbstractPipeline } from './base';
import { PipelineContext, EnrichedItem, EnrichedItemType, AttachmentKind, Entities } from '../types';
import { logger } from '../utils/logger';
import { isYouTubeUrl } from '../utils/url';
import { TextPipeline } from './text-pipeline';
import { UrlPipeline } from './url-pipeline';
import { YouTubePipeline } from './youtube-pipeline';
import { ImagePipeline } from './image-pipeline';
import { DocPipeline } from './doc-pipeline';
import { AudioPipeline } from './audio-pipeline';
import { VideoPipeline } from './video-pipeline';

/**
 * Pipeline for processing mixed content (text + attachments + URLs)
 */
export class MixedPipeline extends AbstractPipeline {
  name = 'MixedPipeline';

  async process(context: PipelineContext): Promise<EnrichedItem> {
    const { event, traceId } = context;
    const childLogger = logger.child({ traceId });

    childLogger.info('Processing with MixedPipeline');

    const results: EnrichedItem[] = [];

    // Process each component
    const hasYouTube = event.detected_urls.some((url) => isYouTubeUrl(url));
    const hasRegularUrls = event.detected_urls.some((url) => !isYouTubeUrl(url));
    const hasImages = event.attachments.some((a) => a.kind === AttachmentKind.IMAGE);
    const hasDocs = event.attachments.some((a) => a.kind === AttachmentKind.DOCUMENT);
    const hasAudio = event.attachments.some((a) => a.kind === AttachmentKind.AUDIO);
    const hasVideo = event.attachments.some((a) => a.kind === AttachmentKind.VIDEO);

    // Process YouTube if present
    if (hasYouTube) {
      try {
        const pipeline = new YouTubePipeline();
        const result = await pipeline.process(context);
        results.push(result);
      } catch (error) {
        childLogger.warn('YouTube processing failed:', error);
      }
    }

    // Process URLs if present
    if (hasRegularUrls) {
      try {
        const pipeline = new UrlPipeline();
        const result = await pipeline.process(context);
        results.push(result);
      } catch (error) {
        childLogger.warn('URL processing failed:', error);
      }
    }

    // Process images
    if (hasImages) {
      try {
        const pipeline = new ImagePipeline();
        const result = await pipeline.process(context);
        results.push(result);
      } catch (error) {
        childLogger.warn('Image processing failed:', error);
      }
    }

    // Process documents
    if (hasDocs) {
      try {
        const pipeline = new DocPipeline();
        const result = await pipeline.process(context);
        results.push(result);
      } catch (error) {
        childLogger.warn('Document processing failed:', error);
      }
    }

    // Process audio
    if (hasAudio) {
      try {
        const pipeline = new AudioPipeline();
        const result = await pipeline.process(context);
        results.push(result);
      } catch (error) {
        childLogger.warn('Audio processing failed:', error);
      }
    }

    // Process video
    if (hasVideo) {
      try {
        const pipeline = new VideoPipeline();
        const result = await pipeline.process(context);
        results.push(result);
      } catch (error) {
        childLogger.warn('Video processing failed:', error);
      }
    }

    // Process text if present and no other results
    if (event.text && results.length === 0) {
      try {
        const pipeline = new TextPipeline();
        const result = await pipeline.process(context);
        results.push(result);
      } catch (error) {
        childLogger.warn('Text processing failed:', error);
      }
    }

    // Merge results
    if (results.length === 0) {
      throw new Error('All pipeline processing failed');
    }

    return this.mergeResults(results, event.id);
  }

  /**
   * Merge multiple enriched items into one
   */
  private mergeResults(results: EnrichedItem[], eventId: string): EnrichedItem {
    // Choose the best title (longest or most confident)
    const title =
      results.reduce((best, item) =>
        item.confidence > best.confidence || item.title.length > best.title.length ? item : best
      ).title;

    // Merge summaries
    const summary = results
      .map((r) => r.summary)
      .filter(Boolean)
      .join('\n\n');

    // Merge key points (deduplicate)
    const keyPoints = [...new Set(results.flatMap((r) => r.key_points))];

    // Merge tags (deduplicate)
    const tags = [...new Set(results.flatMap((r) => r.tags))];

    // Merge entities (deduplicate)
    const entities: Entities = {
      people: [...new Set(results.flatMap((r) => r.entities.people))],
      orgs: [...new Set(results.flatMap((r) => r.entities.orgs))],
      products: [...new Set(results.flatMap((r) => r.entities.products))],
      tech: [...new Set(results.flatMap((r) => r.entities.tech))],
    };

    // Collect all media files
    const mediaFiles = results.flatMap((r) => r.media_files);

    // Use first source/canonical URL
    const sourceUrl = results.find((r) => r.source_url)?.source_url;
    const canonicalUrl = results.find((r) => r.canonical_url)?.canonical_url;

    // Combine transcripts and OCR text
    const transcript = results
      .map((r) => r.transcript)
      .filter(Boolean)
      .join('\n\n');
    const ocrText = results
      .map((r) => r.ocr_text)
      .filter(Boolean)
      .join('\n\n');
    const extractedText = results
      .map((r) => r.extracted_text)
      .filter(Boolean)
      .join('\n\n');

    // Average confidence
    const confidence =
      results.reduce((sum, item) => sum + item.confidence, 0) / results.length;

    return {
      title,
      type: EnrichedItemType.MIXED,
      source_url: sourceUrl,
      canonical_url: canonicalUrl,
      summary,
      key_points: keyPoints,
      tags,
      entities,
      transcript: transcript || undefined,
      ocr_text: ocrText || undefined,
      extracted_text: extractedText || undefined,
      media_files: mediaFiles,
      confidence,
      raw_event_id: eventId,
    };
  }
}
