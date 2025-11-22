import axios from 'axios';
import Tesseract from 'tesseract.js';
import { AbstractPipeline } from './base';
import { PipelineContext, EnrichedItem, EnrichedItemType, AttachmentKind } from '../types';
import { logger } from '../utils/logger';
import { analyzeImage } from '../services/ai';
import { extractUrls } from '../utils/url';
import { UrlPipeline } from './url-pipeline';

/**
 * Pipeline for processing images and screenshots
 */
export class ImagePipeline extends AbstractPipeline {
  name = 'ImagePipeline';

  async process(context: PipelineContext): Promise<EnrichedItem> {
    const { event, traceId } = context;
    const childLogger = logger.child({ traceId });

    childLogger.info('Processing with ImagePipeline');

    const imageAttachment = event.attachments.find((a) => a.kind === AttachmentKind.IMAGE);
    if (!imageAttachment) {
      throw new Error('No image attachment found');
    }

    // Download image
    const imageResponse = await axios.get(imageAttachment.url, {
      responseType: 'arraybuffer',
    });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Perform OCR
    let ocrText = '';
    try {
      childLogger.info('Performing OCR on image...');
      const ocrResult = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: (m) => childLogger.debug('OCR:', m),
      });
      ocrText = ocrResult.data.text.trim();
      childLogger.info(`OCR completed, extracted ${ocrText.length} characters`);
    } catch (error) {
      childLogger.warn('OCR failed:', error);
    }

    // Analyze image with vision model
    let visionAnalysis = '';
    try {
      childLogger.info('Analyzing image with vision model...');
      visionAnalysis = await analyzeImage(
        imageBuffer,
        `Describe this image in detail. What does it show? What are the key elements?
         If there's text, what does it say? If it's a screenshot, what application or website is it from?`,
        imageAttachment.mime
      );
      childLogger.info('Vision analysis completed');
    } catch (error) {
      childLogger.warn('Vision analysis failed:', error);
    }

    // Check if OCR found any URLs
    const urlsInImage = extractUrls(ocrText);
    let urlEnrichment: EnrichedItem | null = null;

    if (urlsInImage.length > 0) {
      childLogger.info(`Found ${urlsInImage.length} URL(s) in image, enriching...`);
      try {
        const urlPipeline = new UrlPipeline();
        urlEnrichment = await urlPipeline.process({
          ...context,
          event: {
            ...event,
            detected_urls: [urlsInImage[0]],
          },
        });
      } catch (error) {
        childLogger.warn('URL enrichment failed:', error);
      }
    }

    // Combine all text for analysis
    const combinedText =
      [event.text, imageAttachment.caption, visionAnalysis, ocrText].filter(Boolean).join('\n\n') ||
      'Image with no text';

    // Generate title
    const title = urlEnrichment?.title || (await this.generateTitle(combinedText));

    // Generate summary and key points
    const { summary, keyPoints } = await this.generateSummaryAndKeyPoints(combinedText);

    // Extract entities
    const entities = await this.extractEntities(combinedText);

    // Generate tags
    const tags = await this.generateTags(combinedText);
    tags.unshift('Image', 'Screenshot');

    return {
      title: title.substring(0, 200),
      type: EnrichedItemType.IMAGE,
      source_url: urlEnrichment?.source_url,
      canonical_url: urlEnrichment?.canonical_url,
      summary,
      key_points: keyPoints,
      tags,
      entities,
      ocr_text: ocrText || undefined,
      extracted_text: urlEnrichment?.extracted_text,
      media_files: [
        {
          s3_url: imageAttachment.url,
          kind: 'image',
          mime: imageAttachment.mime,
          size: imageAttachment.size || 0,
        },
      ],
      confidence: ocrText || visionAnalysis ? 0.85 : 0.6,
      raw_event_id: event.id,
    };
  }
}
