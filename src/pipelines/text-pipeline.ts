import { AbstractPipeline } from './base';
import { PipelineContext, EnrichedItem, EnrichedItemType } from '../types';
import { logger } from '../utils/logger';

/**
 * Pipeline for processing plain text messages
 */
export class TextPipeline extends AbstractPipeline {
  name = 'TextPipeline';

  async process(context: PipelineContext): Promise<EnrichedItem> {
    const { event, traceId } = context;
    const childLogger = logger.child({ traceId });

    childLogger.info('Processing with TextPipeline');

    const text = event.text || '[Empty message]';

    // Generate title
    const title = await this.generateTitle(text);

    // Classify intent
    const intent = await this.classifyIntent(text);

    // Generate summary and key points
    const { summary, keyPoints } = await this.generateSummaryAndKeyPoints(text);

    // Extract entities
    const entities = await this.extractEntities(text);

    // Generate tags
    const tags = await this.generateTags(text);
    tags.unshift(intent); // Add intent as first tag

    return {
      title,
      type: EnrichedItemType.TEXT,
      summary,
      key_points: keyPoints,
      tags,
      entities,
      media_files: [],
      confidence: 0.85,
      raw_event_id: event.id,
    };
  }
}
