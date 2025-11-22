import { Client } from '@notionhq/client';
import { config, validateConfig } from '../src/config';
import { logger } from '../src/utils/logger';
import { getRequiredDatabaseProperties } from '../src/notion/writer';

/**
 * Test script to verify Notion configuration
 */
async function testNotionConnection() {
  try {
    console.log('🔍 Testing Notion Connection...\n');

    // Validate config
    validateConfig();
    console.log('✅ Configuration validated\n');

    // Initialize Notion client
    const notion = new Client({
      auth: config.notionApiKey,
    });

    // Test 1: Get current user
    console.log('Test 1: Verifying API key...');
    const user = await notion.users.me({});
    console.log(`✅ API key valid - User: ${(user as any).name || 'Bot'}\n`);

    // Test 2: Get database
    console.log('Test 2: Accessing database...');
    const database = await notion.databases.retrieve({
      database_id: config.notionDatabaseId,
    });
    console.log(`✅ Database accessible - Title: ${(database as any).title?.[0]?.plain_text || 'Untitled'}\n`);

    // Test 3: Check properties
    console.log('Test 3: Checking database properties...');
    const requiredProps = await getRequiredDatabaseProperties();
    const dbProps = (database as any).properties;

    console.log('Required properties:');
    requiredProps.forEach((prop) => {
      const propName = prop.split(' (')[0];
      const exists = propName in dbProps;
      console.log(`  ${exists ? '✅' : '❌'} ${prop}`);
    });
    console.log('');

    // Test 4: Try to create a test page
    console.log('Test 4: Creating test page...');
    const testPage = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: config.notionDatabaseId,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: 'Test Entry - Setup Verification',
              },
            },
          ],
        },
        Type: {
          select: {
            name: 'text',
          },
        },
        Summary: {
          rich_text: [
            {
              text: {
                content: 'This is a test entry created during setup. You can delete it.',
              },
            },
          ],
        },
        'Key Points': {
          rich_text: [
            {
              text: {
                content: '• Test point 1\n• Test point 2',
              },
            },
          ],
        },
        Tags: {
          multi_select: [{ name: 'test' }, { name: 'setup' }],
        },
        Confidence: {
          number: 0.99,
        },
        'WhatsApp Message ID': {
          rich_text: [
            {
              text: {
                content: `test_${Date.now()}`,
              },
            },
          ],
        },
        'Created At': {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
    });

    console.log(`✅ Test page created: ${testPage.id}`);
    console.log(`   View at: ${testPage.url}\n`);

    console.log('========================================');
    console.log('✅ All tests passed!');
    console.log('========================================');
    console.log('');
    console.log('Your Notion integration is working correctly.');
    console.log('You can now start processing WhatsApp messages.');
    console.log('');
    console.log('Note: You can delete the test page from your Notion database.');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error testing Notion connection:\n');

    if (error instanceof Error) {
      console.error(error.message);

      if (error.message.includes('unauthorized')) {
        console.error('\nPossible causes:');
        console.error('  1. Invalid API key');
        console.error('  2. Integration not connected to database');
        console.error('\nSolutions:');
        console.error('  1. Verify NOTION_API_KEY in .env');
        console.error('  2. Open database → ... → Add connections → Select your integration');
      } else if (error.message.includes('not found')) {
        console.error('\nPossible causes:');
        console.error('  1. Invalid database ID');
        console.error('  2. Database was deleted');
        console.error('\nSolutions:');
        console.error('  1. Verify NOTION_DATABASE_ID in .env');
        console.error('  2. Check database still exists in Notion');
      } else if (error.message.includes('property')) {
        console.error('\nPossible causes:');
        console.error('  1. Missing required database property');
        console.error('\nSolutions:');
        console.error('  1. Check docs/NOTION_SETUP.md for required properties');
        console.error('  2. Add missing properties to your database');
      }
    }

    console.error('\nFor detailed setup instructions, see: docs/NOTION_SETUP.md\n');
    process.exit(1);
  }
}

// Run test
testNotionConnection();
