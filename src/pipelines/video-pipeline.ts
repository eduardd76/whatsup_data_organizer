import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';
import { AbstractPipeline } from './base';
import { PipelineContext, EnrichedItem, EnrichedItemType, AttachmentKind } from '../types';
import { logger } from '../utils/logger';

// Set ffmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * Pipeline for processing video files
 */
export class VideoPipeline extends AbstractPipeline {
  name = 'VideoPipeline';

  async process(context: PipelineContext): Promise<EnrichedItem> {
    const { event, traceId } = context;
    const childLogger = logger.child({ traceId });

    childLogger.info('Processing with VideoPipeline');

    const videoAttachment = event.attachments.find((a) => a.kind === AttachmentKind.VIDEO);
    if (!videoAttachment) {
      throw new Error('No video attachment found');
    }

    // Download video
    const videoResponse = await axios.get(videoAttachment.url, {
      responseType: 'arraybuffer',
    });
    const videoBuffer = Buffer.from(videoResponse.data);

    // Extract audio and transcribe
    let transcript = '';
    try {
      childLogger.info('Extracting audio from video...');
      const audioBuffer = await this.extractAudio(videoBuffer, traceId);

      childLogger.info('Transcribing video audio...');
      transcript = await this.transcribeAudio(audioBuffer);
      childLogger.info(`Transcription completed: ${transcript.length} characters`);
    } catch (error) {
      childLogger.warn('Video transcription failed:', error);
      transcript = 'Video transcription not available';
    }

    // Combine with caption/message text
    const fullText = [event.text, videoAttachment.caption, transcript].filter(Boolean).join('\n\n');

    // Generate title
    const title = await this.generateTitle(fullText);

    // Generate summary and key points
    const { summary, keyPoints } = await this.generateSummaryAndKeyPoints(fullText);

    // Extract entities
    const entities = await this.extractEntities(fullText);

    // Generate tags
    const tags = await this.generateTags(fullText);
    tags.unshift('Video');

    return {
      title: title.substring(0, 200),
      type: EnrichedItemType.VIDEO,
      summary,
      key_points: keyPoints,
      tags,
      entities,
      transcript: transcript || undefined,
      media_files: [
        {
          s3_url: videoAttachment.url,
          kind: 'video',
          mime: videoAttachment.mime,
          size: videoAttachment.size || 0,
        },
      ],
      confidence: transcript && transcript !== 'Video transcription not available' ? 0.8 : 0.5,
      raw_event_id: event.id,
    };
  }

  /**
   * Extract audio track from video
   */
  private async extractAudio(videoBuffer: Buffer, traceId: string): Promise<Buffer> {
    const tempDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tempDir, { recursive: true });

    const inputPath = path.join(tempDir, `${traceId}_video_input.mp4`);
    const outputPath = path.join(tempDir, `${traceId}_audio_output.mp3`);

    try {
      // Write video buffer to temp file
      await fs.writeFile(inputPath, videoBuffer);

      // Extract audio using ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .noVideo()
          .audioCodec('libmp3lame')
          .toFormat('mp3')
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(outputPath);
      });

      // Read extracted audio
      const audioBuffer = await fs.readFile(outputPath);

      return audioBuffer;
    } finally {
      // Cleanup temp files
      try {
        await fs.unlink(inputPath);
        await fs.unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Transcribe audio (placeholder - requires Whisper API or similar)
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    // This is a placeholder. In production, you would use:
    // 1. OpenAI Whisper API
    // 2. AssemblyAI
    // 3. Google Cloud Speech-to-Text
    // 4. Azure Speech Services

    // For now, throw error to indicate transcription not available
    throw new Error('Audio transcription not implemented - integrate Whisper API');
  }
}
