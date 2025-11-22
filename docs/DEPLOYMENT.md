# Deployment Guide

This guide covers deploying WhatsApp Notion Intake to production.

---

## Prerequisites

Before deploying, ensure you have:

- ✅ WhatsApp Business API configured
- ✅ Notion database set up with API key
- ✅ Anthropic API key for AI enrichment
- ✅ PostgreSQL database (or managed service)
- ✅ Redis instance (or managed service)
- ✅ S3-compatible storage (AWS S3, Cloudflare R2, etc.)

---

## Deployment Options

### Option 1: Render (Recommended for Beginners)

**Pros:** Easy setup, free tier available, managed services
**Cons:** Cold starts on free tier

#### Step 1: Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "PostgreSQL"
3. Name: `whatsapp-intake-db`
4. Plan: Free or paid
5. Click "Create Database"
6. Save the "Internal Database URL"

#### Step 2: Create Redis Instance

1. Click "New +" → "Redis"
2. Name: `whatsapp-intake-redis`
3. Plan: Free or paid
4. Click "Create Redis"
5. Save the "Internal Redis URL"

#### Step 3: Deploy Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** whatsapp-intake-server
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Starter ($7/mo) or higher

4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3000

   # From your .env
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_ACCESS_TOKEN=...
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=...
   WHATSAPP_APP_SECRET=...

   NOTION_API_KEY=...
   NOTION_DATABASE_ID=...

   ANTHROPIC_API_KEY=...

   # From Render PostgreSQL
   POSTGRES_HOST=...
   POSTGRES_PORT=...
   POSTGRES_DB=...
   POSTGRES_USER=...
   POSTGRES_PASSWORD=...

   # From Render Redis
   REDIS_HOST=...
   REDIS_PORT=...
   REDIS_PASSWORD=...

   # S3 (use Cloudflare R2 or AWS S3)
   S3_ENDPOINT=...
   S3_BUCKET=...
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   ```

5. Click "Create Web Service"

#### Step 4: Deploy Worker

1. Click "New +" → "Background Worker"
2. Connect same repository
3. Configure:
   - **Name:** whatsapp-intake-worker
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run worker`
   - Add same environment variables as web service

4. Click "Create Background Worker"

#### Step 5: Run Migrations

1. Go to web service shell
2. Run: `npm run migrate`

#### Step 6: Configure WhatsApp Webhook

1. Copy your Render web service URL (e.g., `https://whatsapp-intake-server.onrender.com`)
2. Add `/whatsapp/webhook` to the end
3. Configure in Meta Developer Console

---

### Option 2: Railway

**Pros:** Simple deployment, generous free tier
**Cons:** Limited free resources

#### Quick Deploy

1. Click: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)
2. Connect GitHub repository
3. Add services:
   - PostgreSQL
   - Redis
   - Main app
   - Worker

4. Configure environment variables
5. Deploy!

See [Railway docs](https://docs.railway.app/) for details.

---

### Option 3: AWS

**Pros:** Full control, scalable, many services
**Cons:** More complex, higher cost

#### Architecture

```
┌─────────────────┐
│   CloudFront    │ (CDN)
└────────┬────────┘
         │
┌────────▼────────┐
│  API Gateway    │ (Optional)
└────────┬────────┘
         │
┌────────▼────────┐
│   ECS/Fargate   │ (Docker containers)
│   - Web Server  │
│   - Worker      │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬─────────┐
    │         │          │         │
┌───▼──┐  ┌──▼──┐  ┌────▼────┐  ┌─▼──┐
│ RDS  │  │Redis│  │   S3    │  │SQS │
│(PG)  │  │Elasti│  │(Media)  │  │(Q) │
└──────┘  └─────┘  └─────────┘  └────┘
```

#### Deployment Steps

1. **Create RDS PostgreSQL:**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier whatsapp-intake-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username admin \
     --master-user-password YOUR_PASSWORD \
     --allocated-storage 20
   ```

2. **Create ElastiCache Redis:**
   ```bash
   aws elasticache create-cache-cluster \
     --cache-cluster-id whatsapp-intake-redis \
     --cache-node-type cache.t3.micro \
     --engine redis \
     --num-cache-nodes 1
   ```

3. **Create S3 Bucket:**
   ```bash
   aws s3 mb s3://whatsapp-intake-media
   ```

4. **Build and Push Docker Image:**
   ```bash
   # Build
   docker build -t whatsapp-intake .

   # Tag for ECR
   docker tag whatsapp-intake:latest \
     123456789.dkr.ecr.us-east-1.amazonaws.com/whatsapp-intake:latest

   # Push
   docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/whatsapp-intake:latest
   ```

5. **Create ECS Task Definition:**
   ```json
   {
     "family": "whatsapp-intake",
     "containerDefinitions": [{
       "name": "web",
       "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/whatsapp-intake:latest",
       "portMappings": [{
         "containerPort": 3000,
         "protocol": "tcp"
       }],
       "environment": [
         {"name": "NODE_ENV", "value": "production"},
         ...
       ]
     }]
   }
   ```

6. **Create ECS Service:**
   ```bash
   aws ecs create-service \
     --cluster whatsapp-intake-cluster \
     --service-name whatsapp-intake-web \
     --task-definition whatsapp-intake \
     --desired-count 2 \
     --launch-type FARGATE
   ```

---

### Option 4: Google Cloud Platform

**Pros:** Good pricing, managed services
**Cons:** Complex billing, learning curve

#### Services Used

- **Cloud Run:** Container hosting (web + worker)
- **Cloud SQL:** PostgreSQL database
- **Memorystore:** Redis
- **Cloud Storage:** Media files
- **Cloud Tasks:** Alternative to BullMQ

#### Deployment

1. **Build container:**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/whatsapp-intake
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy whatsapp-intake-web \
     --image gcr.io/PROJECT_ID/whatsapp-intake \
     --platform managed \
     --region us-central1 \
     --set-env-vars NODE_ENV=production,...
   ```

3. **Deploy worker:**
   ```bash
   gcloud run deploy whatsapp-intake-worker \
     --image gcr.io/PROJECT_ID/whatsapp-intake \
     --command "npm run worker" \
     --platform managed \
     --region us-central1
   ```

---

### Option 5: DigitalOcean App Platform

**Pros:** Simple, affordable, good UX
**Cons:** Limited scaling options

1. Create app from GitHub
2. Add PostgreSQL database
3. Add Redis database
4. Configure environment variables
5. Deploy!

---

## Environment Variables Checklist

Before deploying, ensure all these are set:

### Required

- [ ] `NODE_ENV=production`
- [ ] `WHATSAPP_PHONE_NUMBER_ID`
- [ ] `WHATSAPP_ACCESS_TOKEN`
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- [ ] `WHATSAPP_APP_SECRET`
- [ ] `NOTION_API_KEY`
- [ ] `NOTION_DATABASE_ID`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `POSTGRES_HOST`
- [ ] `POSTGRES_PORT`
- [ ] `POSTGRES_DB`
- [ ] `POSTGRES_USER`
- [ ] `POSTGRES_PASSWORD`
- [ ] `REDIS_HOST`
- [ ] `REDIS_PORT`
- [ ] `S3_ENDPOINT`
- [ ] `S3_BUCKET`
- [ ] `S3_ACCESS_KEY_ID`
- [ ] `S3_SECRET_ACCESS_KEY`

### Optional

- [ ] `REDIS_PASSWORD` (if using managed Redis with auth)
- [ ] `LOG_LEVEL` (default: info)
- [ ] `MAX_RETRIES` (default: 3)
- [ ] `ADMIN_USERNAME` (default: admin)
- [ ] `ADMIN_PASSWORD` (CHANGE THIS!)

---

## Post-Deployment

### 1. Verify Services

```bash
# Health check
curl https://your-domain.com/health

# Expected response:
{"status":"ok","timestamp":"2024-01-15T10:30:00.000Z","service":"whatsapp-notion-intake"}
```

### 2. Test Webhook

Send a test message to your WhatsApp number.

### 3. Monitor Logs

```bash
# Render
render logs <service-name>

# Railway
railway logs

# AWS CloudWatch
aws logs tail /aws/ecs/whatsapp-intake --follow
```

### 4. Set Up Monitoring

**Recommended tools:**
- Sentry (error tracking)
- LogRocket (session replay)
- Datadog (APM)
- Prometheus + Grafana (metrics)

### 5. Configure Alerts

Set up alerts for:
- Server errors (5xx)
- High error rates
- Queue backlog
- Database connection failures

---

## Scaling

### Horizontal Scaling

Increase number of instances:

**Web servers:**
```bash
# Render
# Use dashboard to scale to 2+ instances

# AWS ECS
aws ecs update-service \
  --cluster whatsapp-intake-cluster \
  --service whatsapp-intake-web \
  --desired-count 3
```

**Workers:**
```bash
# Scale workers based on queue depth
# Recommended: 1 worker per 100 messages/hour
```

### Vertical Scaling

Increase instance size:

**Render:**
- Upgrade plan (Starter → Standard → Pro)

**AWS:**
- Change instance type (t3.micro → t3.small → t3.medium)

### Database Scaling

**PostgreSQL:**
- Add read replicas
- Increase storage
- Upgrade instance class

**Redis:**
- Enable clustering
- Add replicas
- Increase memory

---

## Cost Estimation

### Small Scale (< 1000 messages/day)

| Service | Provider | Cost/month |
|---------|----------|------------|
| Web Server | Render Starter | $7 |
| Worker | Render Starter | $7 |
| PostgreSQL | Render | Free - $7 |
| Redis | Render | Free - $5 |
| S3/R2 | Cloudflare | $0 - $5 |
| AI (Anthropic) | Anthropic | $10 - $50 |
| **Total** | | **$24 - $81** |

### Medium Scale (< 10,000 messages/day)

| Service | Provider | Cost/month |
|---------|----------|------------|
| Web Server | Render Standard (2x) | $50 |
| Worker | Render Standard (2x) | $50 |
| PostgreSQL | Managed DB | $25 |
| Redis | Managed Cache | $15 |
| S3/R2 | Object Storage | $10 |
| AI (Anthropic) | Anthropic | $100 - $500 |
| **Total** | | **$250 - $650** |

---

## Security Hardening

### 1. HTTPS Only

Enforce HTTPS for webhooks:
```typescript
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### 2. Rate Limiting

Already implemented in code:
```typescript
limiter: {
  max: 10,
  duration: 1000,
}
```

### 3. Secrets Management

Use secret managers:

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name whatsapp-intake/production \
  --secret-string '{"NOTION_API_KEY":"...","ANTHROPIC_API_KEY":"..."}'
```

**Render:**
- Use environment groups
- Enable secret scanning

### 4. Network Security

- Use VPC for AWS/GCP
- Enable firewall rules
- Whitelist IPs for databases

### 5. Audit Logging

Enable audit logs for:
- Database access
- API calls
- Failed authentication attempts

---

## Backup and Recovery

### Database Backups

**Automated (recommended):**
```bash
# Render: Automatic daily backups
# AWS RDS: Enable automated backups

aws rds modify-db-instance \
  --db-instance-identifier whatsapp-intake-db \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"
```

**Manual:**
```bash
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```

### Restore

```bash
psql -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB < backup.sql
```

### Disaster Recovery

1. **Regular backups:** Daily database + S3 media
2. **Multi-region:** Deploy to 2+ regions
3. **Documentation:** Keep runbooks updated
4. **Testing:** Test recovery quarterly

---

## Troubleshooting

### High Memory Usage

**Cause:** Worker processing large files

**Fix:**
```typescript
// Reduce worker concurrency
concurrency: 2, // From 5
```

### Queue Backlog

**Cause:** Worker can't keep up

**Fix:**
- Scale workers horizontally
- Increase worker resources
- Optimize pipeline code

### Database Connection Errors

**Cause:** Connection pool exhausted

**Fix:**
```typescript
// Increase pool size
new Pool({
  max: 30, // From 20
})
```

### Webhook Timeouts

**Cause:** Processing too slow

**Fix:**
- Return 200 immediately (already done)
- Process asynchronously (already done)
- Check worker is running

---

## Next Steps

After deployment:

1. ✅ Test end-to-end flow
2. ✅ Set up monitoring
3. ✅ Configure alerts
4. ✅ Document runbook
5. ✅ Train team on operations

---

## Support

Need help deploying?

- 📧 Email: support@example.com
- 💬 Discord: [Join server](https://discord.gg/example)
- 📖 Docs: [docs.example.com](https://docs.example.com)
