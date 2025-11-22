import {
  IntakeEventSchema,
  EnrichedItemSchema,
  IntakeSource,
  EnrichedItemType,
} from '../../types';

describe('Type Validation', () => {
  describe('IntakeEventSchema', () => {
    it('should validate valid intake event', () => {
      const validEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        source: IntakeSource.WHATSAPP,
        whatsapp_message_id: 'wamid.test123',
        from_number: '+1234567890',
        timestamp: new Date().toISOString(),
        text: 'Test message',
        attachments: [],
        detected_urls: [],
      };

      const result = IntakeEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidEvent = {
        id: 'not-a-uuid',
        source: IntakeSource.WHATSAPP,
        whatsapp_message_id: 'wamid.test123',
        from_number: '+1234567890',
        timestamp: new Date().toISOString(),
      };

      const result = IntakeEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should reject invalid timestamp', () => {
      const invalidEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        source: IntakeSource.WHATSAPP,
        whatsapp_message_id: 'wamid.test123',
        from_number: '+1234567890',
        timestamp: 'not-a-date',
      };

      const result = IntakeEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('EnrichedItemSchema', () => {
    it('should validate valid enriched item', () => {
      const validItem = {
        title: 'Test Title',
        type: EnrichedItemType.TEXT,
        summary: 'Test summary',
        key_points: ['Point 1', 'Point 2'],
        tags: ['tag1', 'tag2'],
        entities: {
          people: ['John Doe'],
          orgs: ['Acme Corp'],
          products: [],
          tech: [],
        },
        media_files: [],
        confidence: 0.85,
        raw_event_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = EnrichedItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should reject title exceeding max length', () => {
      const invalidItem = {
        title: 'a'.repeat(201),
        type: EnrichedItemType.TEXT,
        summary: 'Test summary',
        confidence: 0.85,
        raw_event_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = EnrichedItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject confidence out of range', () => {
      const invalidItem = {
        title: 'Test',
        type: EnrichedItemType.TEXT,
        summary: 'Test summary',
        confidence: 1.5,
        raw_event_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = EnrichedItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });
});
