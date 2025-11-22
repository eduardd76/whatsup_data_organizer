import { routeAndProcessEvent } from '../../pipelines/router';
import {
  IntakeEvent,
  IntakeSource,
  AttachmentKind,
  EnrichedItemType,
} from '../../types';

// Mock AI service
jest.mock('../../services/ai', () => ({
  getAICompletion: jest.fn().mockResolvedValue('Mock completion'),
  analyzeImage: jest.fn().mockResolvedValue('Mock image analysis'),
  extractStructuredData: jest.fn().mockImplementation((text, schema) => {
    if (schema.includes('people')) {
      return Promise.resolve({
        people: ['John Doe'],
        orgs: ['Acme Corp'],
        products: [],
        tech: [],
      });
    }
    if (schema.includes('summary')) {
      return Promise.resolve({
        summary: 'Test summary',
        keyPoints: ['Point 1', 'Point 2'],
      });
    }
    return Promise.resolve(['tag1', 'tag2']);
  }),
}));

describe('Pipeline Router', () => {
  it('should route text-only message to TextPipeline', async () => {
    const event: IntakeEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      source: IntakeSource.WHATSAPP,
      whatsapp_message_id: 'wamid.test123',
      from_number: '+1234567890',
      timestamp: new Date().toISOString(),
      text: 'This is a test message',
      attachments: [],
      detected_urls: [],
      meta: {},
    };

    const result = await routeAndProcessEvent(event, 'trace-123');

    expect(result.pipelineUsed).toBe('TextPipeline');
    expect(result.enrichedItem.type).toBe(EnrichedItemType.TEXT);
  });

  it('should route URL message to UrlPipeline', async () => {
    const event: IntakeEvent = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      source: IntakeSource.WHATSAPP,
      whatsapp_message_id: 'wamid.test124',
      from_number: '+1234567890',
      timestamp: new Date().toISOString(),
      text: 'Check this out https://example.com',
      attachments: [],
      detected_urls: ['https://example.com'],
      meta: {},
    };

    const result = await routeAndProcessEvent(event, 'trace-124');

    expect(result.pipelineUsed).toBe('UrlPipeline');
  });

  it('should route YouTube URL to YouTubePipeline', async () => {
    const event: IntakeEvent = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      source: IntakeSource.WHATSAPP,
      whatsapp_message_id: 'wamid.test125',
      from_number: '+1234567890',
      timestamp: new Date().toISOString(),
      text: 'Watch this https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      attachments: [],
      detected_urls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
      meta: {},
    };

    const result = await routeAndProcessEvent(event, 'trace-125');

    expect(result.pipelineUsed).toBe('YouTubePipeline');
    expect(result.enrichedItem.type).toBe(EnrichedItemType.YOUTUBE);
  });

  it('should route image message to ImagePipeline', async () => {
    const event: IntakeEvent = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      source: IntakeSource.WHATSAPP,
      whatsapp_message_id: 'wamid.test126',
      from_number: '+1234567890',
      timestamp: new Date().toISOString(),
      text: undefined,
      attachments: [
        {
          kind: AttachmentKind.IMAGE,
          mime: 'image/jpeg',
          url: 'https://example.com/image.jpg',
          sha256: 'abc123',
          size: 1024,
        },
      ],
      detected_urls: [],
      meta: {},
    };

    const result = await routeAndProcessEvent(event, 'trace-126');

    expect(result.pipelineUsed).toBe('ImagePipeline');
    expect(result.enrichedItem.type).toBe(EnrichedItemType.IMAGE);
  });

  it('should route mixed content to MixedPipeline', async () => {
    const event: IntakeEvent = {
      id: '123e4567-e89b-12d3-a456-426614174004',
      source: IntakeSource.WHATSAPP,
      whatsapp_message_id: 'wamid.test127',
      from_number: '+1234567890',
      timestamp: new Date().toISOString(),
      text: 'Check this https://example.com',
      attachments: [
        {
          kind: AttachmentKind.IMAGE,
          mime: 'image/jpeg',
          url: 'https://example.com/image.jpg',
          sha256: 'abc123',
          size: 1024,
        },
      ],
      detected_urls: ['https://example.com'],
      meta: {},
    };

    const result = await routeAndProcessEvent(event, 'trace-127');

    expect(result.pipelineUsed).toBe('MixedPipeline');
    expect(result.enrichedItem.type).toBe(EnrichedItemType.MIXED);
  });
});
