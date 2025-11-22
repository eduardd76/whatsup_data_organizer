import axios from 'axios';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { AbstractPipeline } from './base';
import { PipelineContext, EnrichedItem, EnrichedItemType, AttachmentKind } from '../types';
import { logger } from '../utils/logger';

/**
 * Pipeline for processing documents (PDF, DOCX, PPTX)
 */
export class DocPipeline extends AbstractPipeline {
  name = 'DocPipeline';

  async process(context: PipelineContext): Promise<EnrichedItem> {
    const { event, traceId } = context;
    const childLogger = logger.child({ traceId });

    childLogger.info('Processing with DocPipeline');

    const docAttachment = event.attachments.find((a) => a.kind === AttachmentKind.DOCUMENT);
    if (!docAttachment) {
      throw new Error('No document attachment found');
    }

    // Download document
    const docResponse = await axios.get(docAttachment.url, {
      responseType: 'arraybuffer',
    });
    const docBuffer = Buffer.from(docResponse.data);

    // Extract text based on MIME type
    let extractedText = '';
    const mime = docAttachment.mime.toLowerCase();

    try {
      if (mime === 'application/pdf') {
        childLogger.info('Extracting text from PDF...');
        const pdfData = await pdfParse(docBuffer);
        extractedText = pdfData.text;
      } else if (
        mime ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mime === 'application/msword'
      ) {
        childLogger.info('Extracting text from DOCX...');
        const result = await mammoth.extractRawText({ buffer: docBuffer });
        extractedText = result.value;
      } else if (
        mime ===
          'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        mime === 'application/vnd.ms-powerpoint'
      ) {
        childLogger.info('Extracting text from PPTX...');
        // For PPTX, we could use a library like officegen or pptx-parser
        // For now, use a simple fallback
        extractedText = 'PowerPoint presentation (text extraction not fully implemented)';
      } else {
        childLogger.warn('Unsupported document type:', mime);
        extractedText = 'Unsupported document type';
      }

      childLogger.info(`Extracted ${extractedText.length} characters from document`);
    } catch (error) {
      childLogger.error('Failed to extract text from document:', error);
      extractedText = 'Failed to extract text from document';
    }

    // Combine with caption/message text
    const fullText = [event.text, docAttachment.caption, extractedText].filter(Boolean).join('\n\n');

    // Generate title
    const title = await this.generateTitle(fullText);

    // Generate summary and key points
    const { summary, keyPoints } = await this.generateSummaryAndKeyPoints(fullText);

    // Extract entities
    const entities = await this.extractEntities(fullText);

    // Generate tags
    const tags = await this.generateTags(fullText);
    tags.unshift('Document', mime.includes('pdf') ? 'PDF' : mime.includes('word') ? 'Word' : 'Presentation');

    return {
      title: title.substring(0, 200),
      type: EnrichedItemType.PDF,
      summary,
      key_points: keyPoints,
      tags,
      entities,
      extracted_text: extractedText.substring(0, 50000),
      media_files: [
        {
          s3_url: docAttachment.url,
          kind: 'document',
          mime: docAttachment.mime,
          size: docAttachment.size || 0,
        },
      ],
      confidence: extractedText.length > 50 ? 0.85 : 0.5,
      raw_event_id: event.id,
    };
  }
}
