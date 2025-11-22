import { Client } from '@notionhq/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { EnrichedItem } from '../types';

const notion = new Client({
  auth: config.notionApiKey,
});

/**
 * Write enriched item to Notion database
 */
export async function writeToNotion(
  item: EnrichedItem,
  whatsappMessageId: string
): Promise<string> {
  try {
    // Check if page already exists
    const existingPage = await findPageByWhatsAppMessageId(whatsappMessageId);

    if (existingPage) {
      // Update existing page
      logger.info(`Updating existing Notion page: ${existingPage}`);
      await updateNotionPage(existingPage, item);
      return existingPage;
    } else {
      // Create new page
      logger.info('Creating new Notion page');
      const pageId = await createNotionPage(item, whatsappMessageId);
      return pageId;
    }
  } catch (error) {
    logger.error('Failed to write to Notion:', error);
    throw error;
  }
}

/**
 * Find page by WhatsApp Message ID
 */
async function findPageByWhatsAppMessageId(whatsappMessageId: string): Promise<string | null> {
  try {
    const response = await notion.databases.query({
      database_id: config.notionDatabaseId,
      filter: {
        property: 'WhatsApp Message ID',
        rich_text: {
          equals: whatsappMessageId,
        },
      },
    });

    if (response.results.length > 0) {
      return response.results[0].id;
    }

    return null;
  } catch (error) {
    logger.warn('Error searching for existing page:', error);
    return null;
  }
}

/**
 * Create new Notion page
 */
async function createNotionPage(
  item: EnrichedItem,
  whatsappMessageId: string
): Promise<string> {
  const properties = buildNotionProperties(item, whatsappMessageId);

  const response = await notion.pages.create({
    parent: {
      type: 'database_id',
      database_id: config.notionDatabaseId,
    },
    properties,
  });

  logger.info(`Notion page created: ${response.id}`);
  return response.id;
}

/**
 * Update existing Notion page
 */
async function updateNotionPage(pageId: string, item: EnrichedItem): Promise<void> {
  const properties = buildNotionProperties(item, ''); // WhatsApp ID is immutable

  await notion.pages.update({
    page_id: pageId,
    properties: {
      ...properties,
      // Don't update WhatsApp Message ID
      'WhatsApp Message ID': undefined,
    },
  });

  logger.info(`Notion page updated: ${pageId}`);
}

/**
 * Build Notion properties from enriched item
 */
function buildNotionProperties(item: EnrichedItem, whatsappMessageId: string): any {
  const properties: any = {
    Name: {
      title: [
        {
          text: {
            content: item.title.substring(0, 200),
          },
        },
      ],
    },
    Type: {
      select: {
        name: item.type,
      },
    },
    Summary: {
      rich_text: [
        {
          text: {
            content: item.summary.substring(0, 2000),
          },
        },
      ],
    },
    'Key Points': {
      rich_text: [
        {
          text: {
            content: item.key_points.map((point) => `• ${point}`).join('\n').substring(0, 2000),
          },
        },
      ],
    },
    Tags: {
      multi_select: item.tags.slice(0, 20).map((tag) => ({ name: tag.substring(0, 100) })),
    },
    Confidence: {
      number: Math.round(item.confidence * 100) / 100,
    },
    'Created At': {
      date: {
        start: new Date().toISOString(),
      },
    },
  };

  // Add WhatsApp Message ID if provided
  if (whatsappMessageId) {
    properties['WhatsApp Message ID'] = {
      rich_text: [
        {
          text: {
            content: whatsappMessageId,
          },
        },
      ],
    };
  }

  // Add Source URL if present
  if (item.source_url) {
    properties['Source URL'] = {
      url: item.source_url,
    };
  }

  // Add Canonical URL if present
  if (item.canonical_url) {
    properties['Canonical URL'] = {
      url: item.canonical_url,
    };
  }

  // Add entities as JSON string
  if (item.entities) {
    const entitiesText = Object.entries(item.entities)
      .filter(([_, values]) => values.length > 0)
      .map(([key, values]) => `${key}: ${values.join(', ')}`)
      .join('\n');

    if (entitiesText) {
      properties['Entities'] = {
        rich_text: [
          {
            text: {
              content: entitiesText.substring(0, 2000),
            },
          },
        ],
      };
    }
  }

  // Add transcript if present
  if (item.transcript) {
    properties['Transcript'] = {
      rich_text: [
        {
          text: {
            content: item.transcript.substring(0, 2000),
          },
        },
      ],
    };
  }

  // Add OCR text if present
  if (item.ocr_text) {
    properties['OCR Text'] = {
      rich_text: [
        {
          text: {
            content: item.ocr_text.substring(0, 2000),
          },
        },
      ],
    };
  }

  // Add extracted text if present
  if (item.extracted_text) {
    properties['Extracted Text'] = {
      rich_text: [
        {
          text: {
            content: item.extracted_text.substring(0, 2000),
          },
        },
      ],
    };
  }

  return properties;
}

/**
 * Initialize Notion database with required properties
 * This function helps users set up their database correctly
 */
export async function getRequiredDatabaseProperties(): Promise<string[]> {
  return [
    'Name (Title)',
    'Type (Select)',
    'Source URL (URL)',
    'Canonical URL (URL)',
    'Summary (Rich Text)',
    'Key Points (Rich Text)',
    'Tags (Multi-select)',
    'Entities (Rich Text)',
    'Transcript (Rich Text)',
    'OCR Text (Rich Text)',
    'Extracted Text (Rich Text)',
    'Confidence (Number)',
    'WhatsApp Message ID (Rich Text)',
    'Created At (Date)',
  ];
}
