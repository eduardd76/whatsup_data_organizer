import axios from 'axios';
import { AbstractPipeline } from './base';
import { PipelineContext, EnrichedItem, EnrichedItemType, AttachmentKind } from '../types';
import { logger } from '../utils/logger';

/**
 * Pipeline for processing audio files (voice notes)
 */
export class AudioPipeline extends AbstractPipeline {
  name = 'AudioPipeline';

  async process(context: PipelineContext): Promise<EnrichedItem> {
    const { event, traceId } = context;
    const childLogger = logger.child({ traceId });

    childLogger.info('Processing with AudioPipeline');

    const audioAttachment = event.attachments.find((a) => a.kind === AttachmentKind.AUDIO);
    if (!audioAttachment) {
      throw new Error('No audio attachment found');
    }

    // Download audio
    const audioResponse = await axios.get(audioAttachment.url, {
      responseType: 'arraybuffer',
    });
    const audioBuffer = Buffer.from(audioResponse.data);

    // Transcribe audio (placeholder - requires Whisper or similar service)
    let transcript = '';
    try {
      childLogger.info('Transcribing audio...');
      transcript = await this.transcribeAudio(audioBuffer, audioAttachment.mime);
      childLogger.info(`Transcription completed: ${transcript.length} characters`);
    } catch (error) {
      childLogger.warn('Transcription failed:', error);
      transcript = 'Audio transcription not available';
    }

    // Combine with message text
    const fullText = [event.text, transcript].filter(Boolean).join('\n\n');

    // Generate title
    const title = await this.generateTitle(fullText);

    // Generate summary and key points
    const { summary, keyPoints } = await this.generateSummaryAndKeyPoints(fullText);

    // Extract entities
    const entities = await this.extractEntities(fullText);

    // Generate tags
    const tags = await this.generateTags(fullText);
    tags.unshift('Audio', 'Voice Note');

    return {
      title: title.substring(0, 200),
      type: EnrichedItemType.AUDIO,
      summary,
      key_points: keyPoints,
      tags,
      entities,
      transcript: transcript || undefined,
      media_files: [
        {
          s3_url: audioAttachment.url,
          kind: 'audio',
          mime: audioAttachment.mime,
          size: audioAttachment.size || 0,
        },
      ],
      confidence: transcript && transcript !== 'Audio transcription not available' ? 0.85 : 0.5,
      raw_event_id: event.id,
    };
  }

  /**
   * Transcribe audio (placeholder - requires Whisper API or similar)
   */
  private async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    // This is a placeholder. In production, you would use:
    // 1. OpenAI Whisper API
    // 2. AssemblyAI
    // 3. Google Cloud Speech-to-Text
    // 4. Azure Speech Services
    // 5. Local Whisper model

    // For now, throw error to indicate transcription not available
    throw new Error('Audio transcription not implemented - integrate Whisper API');
  }
}
