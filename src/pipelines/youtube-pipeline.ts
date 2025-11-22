import axios from 'axios';
import { AbstractPipeline } from './base';
import { PipelineContext, EnrichedItem, EnrichedItemType } from '../types';
import { extractYouTubeVideoId, isYouTubeUrl } from '../utils/url';
import { logger } from '../utils/logger';
import { getAICompletion } from '../services/ai';

/**
 * Pipeline for processing YouTube videos
 */
export class YouTubePipeline extends AbstractPipeline {
  name = 'YouTubePipeline';

  async process(context: PipelineContext): Promise<EnrichedItem> {
    const { event, traceId } = context;
    const childLogger = logger.child({ traceId });

    childLogger.info('Processing with YouTubePipeline');

    const youtubeUrl = event.detected_urls.find((url) => isYouTubeUrl(url));
    if (!youtubeUrl) {
      throw new Error('No YouTube URL found');
    }

    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Could not extract YouTube video ID');
    }

    try {
      // Fetch video metadata using oEmbed (no API key required)
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        youtubeUrl
      )}&format=json`;
      const response = await axios.get(oembedUrl);
      const metadata = response.data;

      const title = metadata.title || 'YouTube Video';
      const channelName = metadata.author_name || 'Unknown Channel';

      // Try to fetch transcript (this is a placeholder - you'd need a proper transcript API)
      let transcript = '';
      try {
        transcript = await this.fetchTranscript(videoId);
      } catch {
        childLogger.warn('Could not fetch transcript for video:', videoId);
      }

      // Generate summary and key points
      let summary = `YouTube video by ${channelName}`;
      let keyPoints: string[] = [];

      if (transcript) {
        const result = await this.generateSummaryAndKeyPoints(transcript);
        summary = result.summary;
        keyPoints = result.keyPoints;
      } else if (event.text) {
        // Use message text if no transcript
        const result = await this.generateSummaryAndKeyPoints(event.text);
        summary = result.summary;
        keyPoints = result.keyPoints;
      }

      // Extract entities
      const entities = transcript
        ? await this.extractEntities(transcript)
        : {
            people: [],
            orgs: [],
            products: [],
            tech: [],
          };

      // Generate tags
      const tags = transcript ? await this.generateTags(transcript) : [];
      tags.unshift('YouTube', 'Video');

      return {
        title: title.substring(0, 200),
        type: EnrichedItemType.YOUTUBE,
        source_url: youtubeUrl,
        canonical_url: `https://www.youtube.com/watch?v=${videoId}`,
        summary,
        key_points: keyPoints,
        tags,
        entities,
        transcript: transcript || undefined,
        media_files: [],
        confidence: transcript ? 0.9 : 0.7,
        raw_event_id: event.id,
      };
    } catch (error) {
      childLogger.error('Failed to process YouTube video:', error);

      // Fallback
      return {
        title: 'YouTube Video',
        type: EnrichedItemType.YOUTUBE,
        source_url: youtubeUrl,
        canonical_url: `https://www.youtube.com/watch?v=${videoId}`,
        summary: event.text || 'YouTube video (metadata unavailable)',
        key_points: [],
        tags: ['YouTube', 'Video'],
        entities: {
          people: [],
          orgs: [],
          products: [],
          tech: [],
        },
        media_files: [],
        confidence: 0.5,
        raw_event_id: event.id,
      };
    }
  }

  /**
   * Fetch YouTube transcript (placeholder - requires proper implementation)
   */
  private async fetchTranscript(videoId: string): Promise<string> {
    // This is a placeholder. In production, you would:
    // 1. Use YouTube Data API v3 with captions.download
    // 2. Or use a third-party service like youtube-transcript-api
    // 3. Or use a service like AssemblyAI to transcribe the audio

    // For now, throw error to indicate no transcript available
    throw new Error('Transcript fetching not implemented');
  }
}
