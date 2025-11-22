# Notion Database Setup Guide

This guide walks you through setting up your Notion database for WhatsApp intake.

---

## Quick Setup

### Step 1: Create Database

1. Open Notion
2. Create a new page
3. Type `/database` and select "Table - Full page"
4. Name it "WhatsApp Intake" (or your preference)

### Step 2: Add Properties

Your database needs these properties:

| Property Name | Type | Description |
|--------------|------|-------------|
| Name | Title | Auto-set (title of intake item) |
| Type | Select | text, url, youtube, image, pdf, audio, video, mixed |
| Summary | Text | AI-generated summary (2-3 sentences) |
| Key Points | Text | Bullet points of main takeaways |
| Tags | Multi-select | Auto-populated relevant tags |
| Confidence | Number | AI confidence score (0-1) |
| WhatsApp Message ID | Text | Unique message identifier |
| Created At | Date | When item was created |
| Source URL | URL | Original URL if message contained one |
| Canonical URL | URL | Cleaned/canonical version of URL |
| Entities | Text | Extracted entities (people, orgs, products, tech) |
| Transcript | Text | For audio/video content |
| OCR Text | Text | Text extracted from images |
| Extracted Text | Text | Text extracted from documents |

### Step 3: Configure Type Property

For the "Type" select property, add these options:

1. Click the "Type" property
2. Add these options (with suggested colors):
   - `text` 🔵 Blue
   - `url` 🟢 Green
   - `youtube` 🔴 Red
   - `image` 🟡 Yellow
   - `pdf` 🟣 Purple
   - `audio` 🟠 Orange
   - `video` 🔴 Pink
   - `mixed` ⚪ Gray

---

## Get Database ID

### Method 1: From URL

1. Open your database as a full page
2. Copy the URL from browser address bar
3. The database ID is the 32-character string:

```
https://www.notion.so/workspace/DATABASE_ID?v=VIEW_ID

Example:
https://www.notion.so/workspace/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6?v=...
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                  This is your DATABASE_ID
```

4. Copy the DATABASE_ID
5. Add to `.env`:
   ```env
   NOTION_DATABASE_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

### Method 2: Share Menu

1. Click "Share" button in top right
2. Copy link
3. Extract ID from URL as above

---

## Get Notion API Key

### Step 1: Create Integration

1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Fill in details:
   - **Name:** WhatsApp Intake Bot
   - **Associated workspace:** Select your workspace
   - **Type:** Internal
4. Under **Capabilities**, ensure these are enabled:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
5. Click "Submit"

### Step 2: Get Secret Token

1. After creating integration, you'll see "Internal Integration Token"
2. Click "Show" and copy the token (starts with `secret_`)
3. Add to `.env`:
   ```env
   NOTION_API_KEY=secret_abc123xyz789...
   ```

⚠️ **Keep this secret!** Never commit it to git or share publicly.

### Step 3: Connect Integration to Database

**This is crucial!** Your integration needs permission to access the database.

1. Open your WhatsApp Intake database
2. Click "..." (three dots) in top right
3. Scroll down to "Connections"
4. Click "+ Add connections"
5. Find and select "WhatsApp Intake Bot" (your integration name)
6. Click "Confirm"

You should now see your integration listed under Connections.

---

## Verify Setup

### Test Connection

Run this command to verify your setup:

```bash
npm run test:notion
```

This will:
1. ✅ Verify API key is valid
2. ✅ Check database ID is accessible
3. ✅ Confirm integration has proper permissions
4. ✅ List database properties

If successful, you'll see:
```
✓ Notion API key valid
✓ Database accessible
✓ Integration has proper permissions
✓ All required properties present
```

### Manual Test

You can also test manually using curl:

```bash
curl -X GET https://api.notion.com/v1/databases/YOUR_DATABASE_ID \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Notion-Version: 2022-06-28"
```

Expected response: JSON with database details.

---

## Database Views (Optional but Recommended)

Create different views to organize your intake items:

### View 1: All Items (Default)

- **Type:** Table
- **Filter:** None
- **Sort:** Created At (Descending)
- **Group:** None

### View 2: By Type

- **Type:** Board
- **Group by:** Type
- **Sort:** Created At (Descending)

This gives you kanban-style boards for each content type.

### View 3: Recent Items

- **Type:** Table
- **Filter:** Created At is within Past week
- **Sort:** Created At (Descending)

### View 4: High Confidence

- **Type:** Table
- **Filter:** Confidence > 0.8
- **Sort:** Confidence (Descending)

Shows only high-quality enrichments.

### View 5: Articles & URLs

- **Type:** Table
- **Filter:** Type is URL OR Type is Mixed
- **Sort:** Created At (Descending)

### View 6: Media Library

- **Type:** Gallery
- **Filter:** Type is Image OR Type is Video
- **Card preview:** Auto
- **Card size:** Medium

Visual gallery of all images and videos.

---

## Database Template (Copy This)

Want to skip manual setup? Duplicate this template:

[🔗 WhatsApp Intake Template](https://notion.so/templates/whatsapp-intake)

1. Click "Duplicate" in top right
2. Template includes all properties and views
3. Get database ID from URL
4. Connect your integration

---

## Advanced Configuration

### Add Relations

Connect to other databases:

**Projects Database:**
- Add "Project" relation property
- Link intake items to projects

**People Database:**
- Add "Mentioned People" relation
- Auto-link based on entity extraction

### Add Formulas

**Reading Time:**
```
if(prop("Type") == "url",
  round(length(prop("Extracted Text")) / 200) + " min read",
  ""
)
```

**Enrichment Quality:**
```
if(prop("Confidence") > 0.8, "High",
  if(prop("Confidence") > 0.6, "Medium", "Low"))
```

### Add Rollups

If you have relations, create rollups:

**Project Progress:**
- Relation: Project
- Rollup: Count items per project

---

## Notion API Limits

Be aware of rate limits:

- **Rate limit:** 3 requests per second
- **Burst:** Up to 30 requests, then throttled
- **Property limits:**
  - Rich text: 2000 characters per block
  - Multi-select: Max 100 options
  - Relations: Max 100 per property

Our app handles these automatically by:
- Truncating long text to 2000 chars
- Limiting tags to 20 per item
- Implementing retry logic for rate limits

---

## Troubleshooting

### "Could not find database"

**Cause:** Integration not connected to database

**Fix:**
1. Open database
2. Click "..." → "Add connections"
3. Select your integration
4. Confirm

### "Unauthorized"

**Cause:** Invalid API key or wrong workspace

**Fix:**
1. Verify API key in `.env`
2. Regenerate key if needed (in My Integrations)
3. Ensure integration is in correct workspace

### "Property not found"

**Cause:** Property name mismatch

**Fix:**
1. Check property names match exactly (case-sensitive)
2. Required properties:
   - Name (title)
   - Type (select)
   - Summary (rich_text)
   - etc. (see property list above)

### "Rate limit exceeded"

**Cause:** Too many requests

**Fix:**
- App automatically retries with backoff
- If persistent, reduce worker concurrency in `src/queue/worker.ts`:
  ```typescript
  concurrency: 3, // Reduce from 5
  ```

---

## Security Best Practices

### 1. Use Integration Tokens (Not Personal)

❌ Don't use your personal Notion API token
✅ Create a dedicated integration

### 2. Limit Integration Capabilities

Only enable what you need:
- ✅ Read content
- ✅ Update content
- ✅ Insert content
- ❌ Delete content (not needed)

### 3. Rotate Tokens Periodically

1. Create new integration
2. Update `.env` with new token
3. Revoke old integration

### 4. Monitor Access Logs

Check Notion workspace settings:
- Settings & Members → My connections
- Review integration activity

---

## Notion Alternatives

Don't want to use Notion? The architecture supports other databases:

### Airtable

- Similar API
- Edit `src/notion/writer.ts`
- Update properties mapping

### Google Sheets

- Use Google Sheets API
- Simpler but less powerful

### Custom Database

- Edit `src/notion/writer.ts`
- Implement your own storage adapter

---

## Next Steps

After setting up Notion:

1. ✅ Test connection with `npm run test:notion`
2. ✅ Send test message to WhatsApp
3. ✅ Verify item appears in Notion
4. ✅ Customize views and properties
5. ✅ Deploy to production

---

## Additional Resources

- [Notion API Docs](https://developers.notion.com/)
- [Notion API Reference](https://developers.notion.com/reference)
- [Notion Community](https://www.notion.so/help/category/community)
- [Database Properties Guide](https://www.notion.so/help/database-properties)
