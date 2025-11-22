import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  IntakeEvent,
  EnrichedItem,
  IntakeEventRecord,
  EnrichedItemRecord,
  ProcessingStatus,
} from '../types';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.postgresHost,
      port: config.postgresPort,
      database: config.postgresDb,
      user: config.postgresUser,
      password: config.postgresPassword,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error:', err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      logger.info('Database connected successfully');
      client.release();
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection closed');
  }

  // ========================
  // INTAKE EVENTS
  // ========================

  async createIntakeEvent(event: IntakeEvent): Promise<IntakeEventRecord> {
    const query = `
      INSERT INTO intake_events (
        id, source, whatsapp_message_id, from_number, timestamp,
        text, attachments, detected_urls, meta, processing_status, retry_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      event.id,
      event.source,
      event.whatsapp_message_id,
      event.from_number,
      event.timestamp,
      event.text || null,
      JSON.stringify(event.attachments),
      JSON.stringify(event.detected_urls),
      JSON.stringify(event.meta || {}),
      ProcessingStatus.PENDING,
      0,
    ];

    const result = await this.pool.query(query, values);
    return this.parseIntakeEventRecord(result.rows[0]);
  }

  async getIntakeEventById(id: string): Promise<IntakeEventRecord | null> {
    const query = 'SELECT * FROM intake_events WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseIntakeEventRecord(result.rows[0]);
  }

  async getIntakeEventByWhatsAppId(whatsappMessageId: string): Promise<IntakeEventRecord | null> {
    const query = 'SELECT * FROM intake_events WHERE whatsapp_message_id = $1';
    const result = await this.pool.query(query, [whatsappMessageId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseIntakeEventRecord(result.rows[0]);
  }

  async updateIntakeEventStatus(
    id: string,
    status: ProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    const query = `
      UPDATE intake_events
      SET processing_status = $1, error_message = $2, updated_at = NOW()
      WHERE id = $3
    `;
    await this.pool.query(query, [status, errorMessage || null, id]);
  }

  async incrementRetryCount(id: string): Promise<number> {
    const query = `
      UPDATE intake_events
      SET retry_count = retry_count + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING retry_count
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0].retry_count;
  }

  async listIntakeEvents(limit = 100, offset = 0): Promise<IntakeEventRecord[]> {
    const query = `
      SELECT * FROM intake_events
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, [limit, offset]);
    return result.rows.map((row) => this.parseIntakeEventRecord(row));
  }

  // ========================
  // ENRICHED ITEMS
  // ========================

  async createEnrichedItem(
    item: EnrichedItem,
    eventId: string
  ): Promise<EnrichedItemRecord> {
    const query = `
      INSERT INTO enriched_items (
        id, title, type, source_url, canonical_url, summary, key_points,
        tags, entities, transcript, ocr_text, extracted_text, media_files,
        confidence, raw_event_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const id = crypto.randomUUID();
    const values = [
      id,
      item.title,
      item.type,
      item.source_url || null,
      item.canonical_url || null,
      item.summary,
      JSON.stringify(item.key_points),
      JSON.stringify(item.tags),
      JSON.stringify(item.entities),
      item.transcript || null,
      item.ocr_text || null,
      item.extracted_text || null,
      JSON.stringify(item.media_files),
      item.confidence,
      eventId,
    ];

    const result = await this.pool.query(query, values);
    return this.parseEnrichedItemRecord(result.rows[0]);
  }

  async getEnrichedItemById(id: string): Promise<EnrichedItemRecord | null> {
    const query = 'SELECT * FROM enriched_items WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseEnrichedItemRecord(result.rows[0]);
  }

  async getEnrichedItemByEventId(eventId: string): Promise<EnrichedItemRecord | null> {
    const query = 'SELECT * FROM enriched_items WHERE raw_event_id = $1';
    const result = await this.pool.query(query, [eventId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseEnrichedItemRecord(result.rows[0]);
  }

  async updateEnrichedItemNotionPageId(id: string, notionPageId: string): Promise<void> {
    const query = `
      UPDATE enriched_items
      SET notion_page_id = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await this.pool.query(query, [notionPageId, id]);
  }

  async listEnrichedItems(limit = 100, offset = 0): Promise<EnrichedItemRecord[]> {
    const query = `
      SELECT * FROM enriched_items
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, [limit, offset]);
    return result.rows.map((row) => this.parseEnrichedItemRecord(row));
  }

  // ========================
  // HELPER METHODS
  // ========================

  private parseIntakeEventRecord(row: any): IntakeEventRecord {
    return {
      id: row.id,
      source: row.source,
      whatsapp_message_id: row.whatsapp_message_id,
      from_number: row.from_number,
      timestamp: row.timestamp,
      text: row.text,
      attachments: JSON.parse(row.attachments || '[]'),
      detected_urls: JSON.parse(row.detected_urls || '[]'),
      meta: JSON.parse(row.meta || '{}'),
      created_at: row.created_at,
      updated_at: row.updated_at,
      processing_status: row.processing_status,
      error_message: row.error_message,
      retry_count: row.retry_count,
    };
  }

  private parseEnrichedItemRecord(row: any): EnrichedItemRecord {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      source_url: row.source_url,
      canonical_url: row.canonical_url,
      summary: row.summary,
      key_points: JSON.parse(row.key_points || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      entities: JSON.parse(row.entities || '{"people":[],"orgs":[],"products":[],"tech":[]}'),
      transcript: row.transcript,
      ocr_text: row.ocr_text,
      extracted_text: row.extracted_text,
      media_files: JSON.parse(row.media_files || '[]'),
      confidence: row.confidence,
      raw_event_id: row.raw_event_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      notion_page_id: row.notion_page_id,
    };
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }
}

export const database = new Database();
