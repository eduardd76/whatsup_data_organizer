# Quick Start Guide

Get your WhatsApp → Notion Intake system running in 15 minutes!

## 📋 Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Docker Desktop installed and running
- [ ] WhatsApp Business Account (or willing to use bridge mode)
- [ ] Notion account
- [ ] Anthropic API key

## 🚀 Setup Steps

### 1. Install Dependencies (2 min)

```bash
npm install
```

### 2. Start Infrastructure (1 min)

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, and MinIO (S3-compatible storage).

### 3. Configure Environment (3 min)

```bash
cp .env.example .env
```

Edit `.env` and fill in these required fields:

```env
# WhatsApp (see docs/WHATSAPP_SETUP.md)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=any_random_string_you_choose
WHATSAPP_APP_SECRET=your_app_secret

# Notion (see docs/NOTION_SETUP.md)
NOTION_API_KEY=secret_xxxxx
NOTION_DATABASE_ID=xxxxx

# AI
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Local dev (already configured for Docker)
REDIS_HOST=localhost
POSTGRES_HOST=localhost
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=whatsapp-intake-media
```

### 4. Set Up Notion Database (5 min)

Follow: **[docs/NOTION_SETUP.md](docs/NOTION_SETUP.md)**

Quick version:
1. Create new database in Notion
2. Add required properties (Name, Type, Summary, etc.)
3. Get database ID from URL
4. Create integration at notion.so/my-integrations
5. Connect integration to database

Test it:
```bash
npm run test:notion
```

### 5. Run Database Migrations (1 min)

```bash
npm run migrate
```

### 6. Start Services (1 min)

Open 2-3 terminals:

```bash
# Terminal 1: Main server
npm run dev

# Terminal 2: Worker
npm run worker

# Terminal 3: Admin UI (optional)
npm run admin
```

### 7. Expose Webhook (2 min)

For local development, use ngrok:

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 8. Configure WhatsApp Webhook (3 min)

Follow: **[docs/WHATSAPP_SETUP.md](docs/WHATSAPP_SETUP.md)**

Quick version:
1. Go to Meta for Developers
2. Your App → WhatsApp → Configuration
3. Edit Webhook
4. URL: `https://your-ngrok-url.ngrok.io/whatsapp/webhook`
5. Verify token: (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in .env)
6. Subscribe to "messages" field

### 9. Test! 🎉

1. Send a message to your WhatsApp Business number
2. Check terminal logs for processing
3. Check Notion database for enriched item
4. Check admin UI at http://localhost:3001

## 📊 What Happens When You Send a Message

```
WhatsApp Message
      ↓
Webhook Receiver (validates signature)
      ↓
Save to Database
      ↓
Enqueue Job (Redis/BullMQ)
      ↓
Worker picks up job
      ↓
Route to appropriate pipeline:
  - Text → AI classification + summarization
  - URL → Fetch + parse + extract
  - YouTube → Metadata + transcript
  - Image → OCR + vision analysis
  - Doc → Text extraction
  - Audio → Transcription
  - Video → Audio extraction + transcription
  - Mixed → Combine multiple pipelines
      ↓
AI Enrichment (Claude):
  - Generate title
  - Create summary
  - Extract key points
  - Identify entities (people, orgs, products, tech)
  - Generate tags
      ↓
Save Enriched Item to Database
      ↓
Write to Notion (upsert page)
      ↓
Done! ✅
```

Time: 30-90 seconds from WhatsApp to Notion

## 🎯 Common Test Cases

### Test 1: Plain Text
Send: `"This is my brilliant startup idea: AI-powered plant watering system"`

Expected:
- Type: text
- Title: AI-powered plant watering system
- Summary: Concise 2-3 sentences
- Tags: startup, idea, AI, etc.

### Test 2: URL
Send: `"https://example.com/article"`

Expected:
- Type: url
- Fetches page content
- Extracts main text
- Summarizes article
- Identifies entities

### Test 3: YouTube
Send: `"https://www.youtube.com/watch?v=dQw4w9WgXcQ"`

Expected:
- Type: youtube
- Video metadata (title, channel)
- Transcript (if available)
- Summary of content

### Test 4: Image
Send: Screenshot of an article

Expected:
- Type: image
- OCR text extraction
- Vision analysis
- If URL found in image, fetches URL too

### Test 5: Mixed
Send: Text + Image + URL

Expected:
- Type: mixed
- Combines all enrichments
- Merged summary and entities

## 🔍 Monitoring

### Admin UI
http://localhost:3001
- Username: admin
- Password: change_me_in_production

Shows:
- Total events processed
- Queue status (waiting, active, failed)
- Recent messages
- Processing status

### Logs
```bash
# Server logs
npm run dev

# Worker logs
npm run worker

# Database
docker-compose logs postgres

# Redis
docker-compose logs redis
```

## 🐛 Troubleshooting

### "Webhook not receiving messages"
- Check ngrok is running
- Verify webhook URL in Meta dashboard
- Check server logs for incoming requests

### "Signature verification failed"
- Verify `WHATSAPP_APP_SECRET` in .env
- Check signature header format

### "Notion unauthorized"
- Verify `NOTION_API_KEY` in .env
- Ensure integration is connected to database
- Run `npm run test:notion`

### "Worker not processing"
- Check worker is running: `npm run worker`
- Check Redis is running: `docker ps`
- Check queue in admin UI

### "Database connection error"
- Check PostgreSQL is running: `docker ps`
- Verify credentials in .env
- Run migrations: `npm run migrate`

## 📚 Next Steps

1. **Customize Pipelines**
   - Edit files in `src/pipelines/`
   - Adjust AI prompts
   - Add custom enrichment logic

2. **Add More Properties**
   - Update Notion database
   - Modify `src/notion/writer.ts`
   - Update types in `src/types/index.ts`

3. **Deploy to Production**
   - See: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
   - Options: Render, Railway, AWS, GCP
   - Configure proper secrets management

4. **Set Up Monitoring**
   - Add Sentry for error tracking
   - Set up alerts for failures
   - Monitor queue depth

## 🎓 Learn More

- [Full Documentation](README.md)
- [WhatsApp Setup](docs/WHATSAPP_SETUP.md)
- [Notion Setup](docs/NOTION_SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)

## 💬 Support

- GitHub Issues: [Report a bug](https://github.com/your-repo/issues)
- Discussions: [Ask questions](https://github.com/your-repo/discussions)

---

**Happy automating! 🚀**
