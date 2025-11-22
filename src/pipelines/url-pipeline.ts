import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { AbstractPipeline } from './base';
import { PipelineContext, EnrichedItem, EnrichedItemType } from '../types';
import { normalizeUrl } from '../utils/url';
import { logger } from '../utils/logger';

/**
 * Pipeline for processing URLs
 */
export class UrlPipeline extends AbstractPipeline {
  name = 'UrlPipeline';

  async process(context: PipelineContext): Promise<EnrichedItem> {
    const { event, traceId } = context;
    const childLogger = logger.child({ traceId });

    childLogger.info('Processing with UrlPipeline');

    const url = event.detected_urls[0];
    const canonicalUrl = normalizeUrl(url);

    try {
      // Fetch the page
      const response = await axios.get(url, {
        timeout: 30000,
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; WhatsAppNotionIntake/1.0; +https://github.com)',
        },
      });

      const html = response.data;
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      // Extract OpenGraph metadata
      const ogTitle =
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const ogDescription =
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      const ogUrl =
        document.querySelector('meta[property="og:url"]')?.getAttribute('content') || '';

      // Use Readability to extract main content
      const reader = new Readability(document);
      const article = reader.parse();

      const title = ogTitle || article?.title || 'Untitled Page';
      const extractedText = article?.textContent || ogDescription || '';

      // Generate summary and key points from extracted text
      const { summary, keyPoints } = extractedText
        ? await this.generateSummaryAndKeyPoints(extractedText)
        : { summary: ogDescription || 'No content extracted', keyPoints: [] };

      // Extract entities
      const entities = extractedText ? await this.extractEntities(extractedText) : {
        people: [],
        orgs: [],
        products: [],
        tech: [],
      };

      // Generate tags
      const tags = extractedText ? await this.generateTags(extractedText) : [];
      tags.unshift('Article', 'Web Page');

      return {
        title: title.substring(0, 200),
        type: EnrichedItemType.URL,
        source_url: url,
        canonical_url: ogUrl || canonicalUrl,
        summary,
        key_points: keyPoints,
        tags,
        entities,
        extracted_text: extractedText.substring(0, 10000),
        media_files: [],
        confidence: article ? 0.9 : 0.6,
        raw_event_id: event.id,
      };
    } catch (error) {
      childLogger.warn('Failed to fetch URL, using basic metadata:', error);

      // Fallback: use event text as summary
      const summary = event.text || 'Failed to fetch URL content';

      return {
        title: url.substring(0, 100),
        type: EnrichedItemType.URL,
        source_url: url,
        canonical_url: canonicalUrl,
        summary,
        key_points: [],
        tags: ['URL', 'Failed Fetch'],
        entities: {
          people: [],
          orgs: [],
          products: [],
          tech: [],
        },
        media_files: [],
        confidence: 0.3,
        raw_event_id: event.id,
      };
    }
  }
}
