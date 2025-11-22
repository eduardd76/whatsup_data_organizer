import { z } from 'zod';

// ========================
// ENUMS AND CONSTANTS
// ========================

export enum IntakeSource {
  WHATSAPP = 'whatsapp',
}

export enum AttachmentKind {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export enum EnrichedItemType {
  TEXT = 'text',
  URL = 'url',
  YOUTUBE = 'youtube',
  IMAGE = 'image',
  PDF = 'pdf',
  AUDIO = 'audio',
  VIDEO = 'video',
  MIXED = 'mixed',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY = 'retry',
}

// ========================
// ZOD SCHEMAS
// ========================

export const AttachmentSchema = z.object({
  kind: z.nativeEnum(AttachmentKind),
  mime: z.string(),
  url: z.string().url(),
  sha256: z.string().optional(),
  size: z.number().optional(),
  caption: z.string().optional(),
});

export const IntakeEventSchema = z.object({
  id: z.string().uuid(),
  source: z.nativeEnum(IntakeSource),
  whatsapp_message_id: z.string(),
  from_number: z.string(),
  timestamp: z.string().datetime(),
  text: z.string().optional(),
  attachments: z.array(AttachmentSchema).default([]),
  detected_urls: z.array(z.string().url()).default([]),
  meta: z.record(z.any()).optional(),
});

export const MediaFileSchema = z.object({
  s3_url: z.string().url(),
  kind: z.string(),
  mime: z.string(),
  size: z.number(),
});

export const EntitiesSchema = z.object({
  people: z.array(z.string()).default([]),
  orgs: z.array(z.string()).default([]),
  products: z.array(z.string()).default([]),
  tech: z.array(z.string()).default([]),
});

export const EnrichedItemSchema = z.object({
  title: z.string().max(200),
  type: z.nativeEnum(EnrichedItemType),
  source_url: z.string().url().optional(),
  canonical_url: z.string().url().optional(),
  summary: z.string(),
  key_points: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  entities: EntitiesSchema.default({
    people: [],
    orgs: [],
    products: [],
    tech: [],
  }),
  transcript: z.string().optional(),
  ocr_text: z.string().optional(),
  extracted_text: z.string().optional(),
  media_files: z.array(MediaFileSchema).default([]),
  confidence: z.number().min(0).max(1),
  raw_event_id: z.string().uuid(),
});

// ========================
// TYPESCRIPT TYPES
// ========================

export type Attachment = z.infer<typeof AttachmentSchema>;
export type IntakeEvent = z.infer<typeof IntakeEventSchema>;
export type MediaFile = z.infer<typeof MediaFileSchema>;
export type Entities = z.infer<typeof EntitiesSchema>;
export type EnrichedItem = z.infer<typeof EnrichedItemSchema>;

// ========================
// DATABASE MODELS
// ========================

export interface IntakeEventRecord extends IntakeEvent {
  created_at: Date;
  updated_at: Date;
  processing_status: ProcessingStatus;
  error_message?: string;
  retry_count: number;
}

export interface EnrichedItemRecord extends EnrichedItem {
  id: string;
  created_at: Date;
  updated_at: Date;
  notion_page_id?: string;
}

// ========================
// WHATSAPP WEBHOOK TYPES
// ========================

export interface WhatsAppWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    filename: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: WhatsAppWebhookMessage[];
        statuses?: any[];
      };
      field: string;
    }>;
  }>;
}

// ========================
// PIPELINE TYPES
// ========================

export interface PipelineContext {
  event: IntakeEvent;
  traceId: string;
  timestamp: Date;
}

export interface PipelineResult {
  enrichedItem: EnrichedItem;
  processingTimeMs: number;
  pipelineUsed: string;
}

export interface BasePipeline {
  name: string;
  process(context: PipelineContext): Promise<EnrichedItem>;
}

// ========================
// NOTION TYPES
// ========================

export interface NotionPageProperties {
  Name: { title: Array<{ text: { content: string } }> };
  Type: { select: { name: string } };
  'Source URL'?: { url: string };
  'Canonical URL'?: { url: string };
  Summary: { rich_text: Array<{ text: { content: string } }> };
  'Key Points': { rich_text: Array<{ text: { content: string } }> };
  Tags: { multi_select: Array<{ name: string }> };
  Entities?: { rich_text: Array<{ text: { content: string } }> };
  Transcript?: { rich_text: Array<{ text: { content: string } }> };
  'OCR Text'?: { rich_text: Array<{ text: { content: string } }> };
  'Extracted Text'?: { rich_text: Array<{ text: { content: string } }> };
  Confidence: { number: number };
  'WhatsApp Message ID': { rich_text: Array<{ text: { content: string } }> };
  'Created At': { date: { start: string } };
}
