# WhatsApp → Notion Intake

**Auto-classify, enrich, and save ANY WhatsApp message to Notion**

A production-ready intake system that captures messages sent to your WhatsApp (text, screenshots, docs, audio, video, URLs, YouTube links), runs AI-powered enrichment pipelines, and stores clean structured records in Notion.

## 🎯 What It Does

When you send a message to your WhatsApp:

1. **Receives** via webhook (official WhatsApp Cloud API)
2. **Detects** content type (text/URL/YouTube/image/doc/audio/video/mixed)
3. **Enqueues** async processing job
4. **Enriches** through specialized AI pipelines:
   - Text: classification, entities, summary, key points
   - URLs: fetch, parse, extract main content
   - YouTube: metadata, transcript (when available)
   - Images: OCR, vision analysis, URL extraction
   - Docs: PDF/DOCX/PPTX text extraction
   - Audio/Video: transcription (placeholder for Whisper)
   - Mixed: combines multiple enrichments
5. **Writes** structured item to your Notion database

**Result:** Clean, searchable, enriched records in Notion within 30-90 seconds.

---

## 🚀 Quick Start (< 15 minutes)

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for local development)
- WhatsApp Business Account (for MODE A - official API)
- Notion account with API access

### 1. Clone and Install

```bash
git clone <your-repo>
cd whatsapp-notion-intake
npm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (database)
- Redis (queue)
- MinIO (S3-compatible storage)

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# WhatsApp (see docs/WHATSAPP_SETUP.md)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=random_string_you_choose
WHATSAPP_APP_SECRET=your_app_secret

# Notion (see docs/NOTION_SETUP.md)
NOTION_API_KEY=secret_xxxxx
NOTION_DATABASE_ID=xxxxx

# AI
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Local Development
REDIS_HOST=localhost
POSTGRES_HOST=localhost
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

### 4. Run Migrations

```bash
npm run migrate
```

### 5. Start Services

```bash
# Terminal 1: Main webhook server
npm run dev

# Terminal 2: Worker (processes jobs)
npm run worker

# Terminal 3: Admin UI (optional)
npm run admin
```

### 6. Set Up Webhook

Expose your local server (use ngrok or similar):

```bash
ngrok http 3000
```

Configure WhatsApp webhook:
- URL: `https://your-ngrok-url.ngrok.io/whatsapp/webhook`
- Verify token: (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)

### 7. Test It!

Send a message to your WhatsApp Business number. Check:
- Admin UI: http://localhost:3001 (user: admin, password: change_me_in_production)
- Notion database for the enriched record

---

## 📋 Features

### Supported Input Types

- ✅ Plain text
- ✅ URLs (web pages, articles, blogs, tweets)
- ✅ YouTube videos
- ✅ Images & screenshots (OCR + vision analysis)
- ✅ Documents (PDF, DOCX, PPTX)
- ✅ Audio files (voice notes)
- ✅ Video files
- ✅ Mixed content (text + attachments + URLs)

### AI-Powered Enrichment

- **Classification**: Auto-detects content type and intent
- **Summarization**: 2-3 sentence summaries
- **Key Points**: 3-7 bullet points
- **Entity Extraction**: People, organizations, products, technologies
- **Tagging**: Relevant tags/keywords
- **OCR**: Text extraction from images
- **Transcription**: Audio/video to text (requires Whisper integration)

### Reliability

- ✅ Idempotent processing (duplicate detection)
- ✅ Retry with exponential backoff
- ✅ Dead letter queue for failed jobs
- ✅ Structured logging with trace IDs
- ✅ Health checks and monitoring

### Quality

- ✅ TypeScript strict mode
- ✅ Zod validation for all inputs
- ✅ 70%+ test coverage
- ✅ ESLint + Prettier
- ✅ CI/CD with GitHub Actions

---

## 📚 Documentation

- [WhatsApp Setup Guide](docs/WHATSAPP_SETUP.md) - Official API vs Personal Bridge
- [Notion Database Setup](docs/NOTION_SETUP.md) - Database schema & permissions
- [Architecture](docs/ARCHITECTURE.md) - System design & data flow
- [Deployment](docs/DEPLOYMENT.md) - Production deployment guide
- [API Reference](docs/API.md) - Webhook & admin API docs

---

## 🏗️ Architecture

```
┌─────────────┐
│  WhatsApp   │
│   Message   │
└──────┬──────┘
       │
       v
┌─────────────────────┐
│  Webhook Receiver   │
│  - Signature verify │
│  - Parse payload    │
│  - Download media   │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│   IntakeEvent DB    │
│   (PostgreSQL)      │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│   Queue (Redis)     │
│   (BullMQ)          │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│  Pipeline Router    │
│  - Detect type      │
│  - Route to pipeline│
└──────┬──────────────┘
       │
       v
┌─────────────────────────────────────────┐
│  Specialized Pipelines                  │
│  - Text / URL / YouTube / Image         │
│  - Doc / Audio / Video / Mixed          │
│  - AI enrichment (Claude)               │
└──────┬──────────────────────────────────┘
       │
       v
┌─────────────────────┐
│  EnrichedItem DB    │
│  (PostgreSQL)       │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│   Notion Writer     │
│  - Upsert page      │
│  - Set properties   │
└─────────────────────┘
```

---

## 🔧 Configuration

### WhatsApp Modes

**MODE A: Official (Recommended)**
- Compliant with WhatsApp ToS
- Requires WhatsApp Business Account
- Webhook-based
- Production-ready

**MODE B: Personal Bridge (Optional)**
- Uses third-party bridge (Unipile, Green-API)
- Can access personal WhatsApp
- ⚠️ ToS risk - use at your own discretion
- See [docs/WHATSAPP_SETUP.md](docs/WHATSAPP_SETUP.md)

### Environment Variables

See [.env.example](.env.example) for all available configuration options.

Key variables:
- `WHATSAPP_MODE`: `official` or `bridge`
- `NOTION_DATABASE_ID`: Your Notion database ID
- `ANTHROPIC_API_KEY`: Claude API key for AI enrichment

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Structure

```
src/__tests__/
├── pipelines/
│   ├── router.test.ts
│   └── text-pipeline.test.ts
├── utils/
│   ├── url.test.ts
│   └── crypto.test.ts
└── types/
    └── validation.test.ts
```

---

## 📦 Deployment

### Docker

```bash
docker build -t whatsapp-notion-intake .
docker run -p 3000:3000 --env-file .env whatsapp-notion-intake
```

### Cloud Platforms

- **Render**: See [docs/DEPLOYMENT.md#render](docs/DEPLOYMENT.md#render)
- **Railway**: See [docs/DEPLOYMENT.md#railway](docs/DEPLOYMENT.md#railway)
- **AWS**: See [docs/DEPLOYMENT.md#aws](docs/DEPLOYMENT.md#aws)
- **Google Cloud**: See [docs/DEPLOYMENT.md#gcp](docs/DEPLOYMENT.md#gcp)

---

## 🛠️ Development

### Project Structure

```
whatsapp-notion-intake/
├── src/
│   ├── admin/              # Admin UI
│   ├── config/             # Configuration
│   ├── ingestion/          # WhatsApp webhook receiver
│   ├── notion/             # Notion API integration
│   ├── pipelines/          # Processing pipelines
│   ├── queue/              # BullMQ workers
│   ├── services/           # AI, HTTP services
│   ├── storage/            # Database & S3
│   ├── types/              # TypeScript types
│   ├── utils/              # Utilities
│   └── index.ts            # Main server
├── docs/                   # Documentation
├── docker-compose.yml      # Local dev stack
├── package.json
└── tsconfig.json
```

### Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npm run worker       # Start worker
npm run admin        # Start admin UI
npm run migrate      # Run database migrations
npm test             # Run tests
npm run lint         # Lint code
npm run format       # Format code
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch
3. Add tests for new features
4. Ensure `npm test` and `npm run lint` pass
5. Submit a PR

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- [Anthropic Claude](https://www.anthropic.com/) - AI enrichment
- [Notion API](https://developers.notion.com/) - Data storage
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) - Message intake
- [BullMQ](https://docs.bullmq.io/) - Job queue
- [Tesseract.js](https://tesseract.projectnaptha.com/) - OCR

---

## ❓ FAQ

**Q: Can I use this with my personal WhatsApp?**
A: Not directly. You need a WhatsApp Business account for MODE A (recommended). MODE B with a third-party bridge is possible but carries ToS risks.

**Q: What AI models are used?**
A: Claude 3.5 Sonnet for text analysis, entity extraction, summarization. Vision model for image analysis.

**Q: How much does it cost to run?**
A: Main costs are:
- Anthropic API (~$0.01-0.05 per message depending on complexity)
- Storage (S3/R2): minimal
- Hosting: $5-20/month for small-scale

**Q: Can I customize the enrichment pipelines?**
A: Yes! Each pipeline is modular. Edit files in `src/pipelines/` to customize prompts, extraction logic, etc.

**Q: Does it support other languages?**
A: Yes, Claude supports 100+ languages. OCR is English by default but Tesseract supports many languages.

---

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)
- Email: support@example.com
