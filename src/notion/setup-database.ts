/**
 * Guide for setting up Notion database
 *
 * This file provides instructions for creating the required Notion database
 */

export const NOTION_DATABASE_SETUP_GUIDE = `
# Notion Database Setup Guide

## Step 1: Create a New Database

1. Open Notion and navigate to the workspace where you want to create the database
2. Click "+ New page" or use the "/" command
3. Select "Database" → "Table - Inline"
4. Name it "WhatsApp Intake" or your preferred name

## Step 2: Add Required Properties

Add the following properties to your database:

### Core Properties

1. **Name** (Title) - Already exists by default
   - This will store the title of each intake item

2. **Type** (Select)
   - Options: text, url, youtube, image, pdf, audio, video, mixed
   - Color-code them for easy visual distinction

3. **Summary** (Text - Rich text)
   - Will contain AI-generated summary

4. **Key Points** (Text - Rich text)
   - Will contain bullet points of main takeaways

5. **Tags** (Multi-select)
   - Auto-populated with relevant tags

6. **Confidence** (Number)
   - Format: Number
   - Range: 0 to 1 (represents AI confidence)

7. **WhatsApp Message ID** (Text - Rich text)
   - Used for deduplication
   - Should be unique for each message

8. **Created At** (Date)
   - Records when the item was created

### Optional Properties (URLs and Content)

9. **Source URL** (URL)
   - Original URL if the message contained one

10. **Canonical URL** (URL)
    - Cleaned/canonical version of the URL

11. **Entities** (Text - Rich text)
    - Extracted entities (people, orgs, products, tech)

12. **Transcript** (Text - Rich text)
    - For audio/video content

13. **OCR Text** (Text - Rich text)
    - Text extracted from images

14. **Extracted Text** (Text - Rich text)
    - Text extracted from documents

## Step 3: Get Database ID

1. Open your database as a full page
2. Copy the URL from your browser
3. The database ID is the 32-character string in the URL:
   https://www.notion.so/workspace/[DATABASE_ID]?v=...

4. Copy the DATABASE_ID and add it to your .env file:
   NOTION_DATABASE_ID=your_database_id_here

## Step 4: Get Notion API Key

1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Give it a name (e.g., "WhatsApp Intake Bot")
4. Select the workspace
5. Set capabilities:
   - Read content
   - Update content
   - Insert content
6. Click "Submit" to create the integration
7. Copy the "Internal Integration Token"
8. Add it to your .env file:
   NOTION_API_KEY=secret_xxxxxxxxxxxxx

## Step 5: Share Database with Integration

1. Open your database in Notion
2. Click "..." (three dots) in the top right
3. Scroll down and click "Add connections"
4. Find and select your integration
5. Click "Confirm"

## Step 6: Test Connection

Run the test command to verify everything is set up correctly:

\`\`\`bash
npm run test:notion
\`\`\`

## Database Views (Optional but Recommended)

Create different views to organize your intake items:

### View 1: By Type
- Group by: Type
- Sort by: Created At (Descending)

### View 2: Recent Items
- Filter: Created At is within the past week
- Sort by: Created At (Descending)

### View 3: High Confidence
- Filter: Confidence > 0.8
- Sort by: Confidence (Descending)

### View 4: YouTube Videos
- Filter: Type is YouTube
- Sort by: Created At (Descending)

### View 5: Articles & URLs
- Filter: Type is URL or Type is Mixed
- Sort by: Created At (Descending)

## Tips

- Use the Tags property to filter and organize content by topic
- Create templates for different content types
- Set up automations to notify you of high-value content
- Use the Confidence score to prioritize review
`;

export function printSetupGuide(): void {
  console.log(NOTION_DATABASE_SETUP_GUIDE);
}

if (require.main === module) {
  printSetupGuide();
}
