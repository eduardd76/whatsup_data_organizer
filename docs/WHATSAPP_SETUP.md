# WhatsApp Integration Setup

This guide covers both MODE A (Official/Compliant) and MODE B (Personal Bridge) setups.

---

## MODE A: Official WhatsApp Cloud API (Recommended)

✅ **Compliant with WhatsApp ToS**
✅ **Production-ready**
✅ **Webhook-based**

### Prerequisites

- Facebook Business Manager account
- WhatsApp Business Account
- Phone number for WhatsApp Business (cannot be your personal number)

### Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Business" as app type
4. Fill in app details:
   - App name: "WhatsApp Notion Intake"
   - Contact email: your email
5. Click "Create App"

### Step 2: Add WhatsApp Product

1. In your app dashboard, find "WhatsApp" product
2. Click "Set Up"
3. This will take you to the WhatsApp setup page

### Step 3: Get Test Number (Optional)

Meta provides a test phone number for development:

1. In WhatsApp > Getting Started
2. You'll see a test number
3. Add your personal number as a recipient
4. Send a test message from the interface

### Step 4: Set Up Business Phone Number

For production, you need your own phone number:

1. Go to WhatsApp > API Setup
2. Click "Add Phone Number"
3. Follow the verification process
4. Port your number or get a new one

**Important:** This number CANNOT be used on WhatsApp consumer app.

### Step 5: Get Credentials

You need 4 credentials:

#### 1. Phone Number ID

1. Go to WhatsApp > API Setup
2. Find "Phone Number ID" (looks like: `123456789012345`)
3. Copy it → `.env` as `WHATSAPP_PHONE_NUMBER_ID`

#### 2. Business Account ID

1. Go to WhatsApp > API Setup
2. Find "WhatsApp Business Account ID"
3. Copy it → `.env` as `WHATSAPP_BUSINESS_ACCOUNT_ID`

#### 3. Access Token

**Temporary Token (for testing):**
1. Go to WhatsApp > API Setup
2. Click "Generate Token"
3. Copy it → `.env` as `WHATSAPP_ACCESS_TOKEN`

**Permanent Token (for production):**
1. Go to App Settings > Basic
2. Copy your App ID and App Secret
3. Use System User Token flow (see [Meta docs](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#system-user-access-tokens))

#### 4. App Secret

1. Go to App Settings > Basic
2. Click "Show" next to App Secret
3. Copy it → `.env` as `WHATSAPP_APP_SECRET`

### Step 6: Configure Webhook

1. Deploy your app or use ngrok for local testing:
   ```bash
   ngrok http 3000
   ```

2. Go to WhatsApp > Configuration
3. Click "Edit" next to Webhook
4. Enter webhook URL:
   ```
   https://your-domain.com/whatsapp/webhook
   ```
   Or with ngrok:
   ```
   https://abc123.ngrok.io/whatsapp/webhook
   ```

5. Generate a verify token (random string):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

6. Enter the token in:
   - WhatsApp webhook configuration
   - `.env` as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

7. Click "Verify and Save"

### Step 7: Subscribe to Webhook Fields

1. In WhatsApp > Configuration > Webhook Fields
2. Subscribe to:
   - `messages` (required)
   - `message_status` (optional, for delivery status)

### Step 8: Test

Send a message to your WhatsApp Business number:

1. Save your business number in your phone
2. Open WhatsApp
3. Send a test message
4. Check your logs for webhook receipt
5. Check Notion for the enriched item

---

## MODE B: Personal WhatsApp Bridge (Optional)

⚠️ **WARNING:** This approach uses unofficial methods that may violate WhatsApp Terms of Service. Use at your own risk. Your account may be banned.

### Why Use This?

- You want to use your personal WhatsApp account
- You don't have a business phone number
- You're doing personal R&D

### Option 1: Unipile

[Unipile](https://unipile.com/) provides a unified API for messaging platforms.

1. Sign up at https://unipile.com/
2. Get API key
3. Connect your WhatsApp account
4. Configure `.env`:
   ```env
   WHATSAPP_MODE=bridge
   WHATSAPP_BRIDGE_API_URL=https://api.unipile.com/v1
   WHATSAPP_BRIDGE_API_KEY=your_api_key
   ```

### Option 2: Green-API

[Green-API](https://green-api.com/) provides WhatsApp integration.

1. Sign up at https://green-api.com/
2. Create an instance
3. Get credentials (idInstance, apiTokenInstance)
4. Configure `.env`:
   ```env
   WHATSAPP_MODE=bridge
   WHATSAPP_BRIDGE_API_URL=https://api.green-api.com
   WHATSAPP_BRIDGE_API_KEY=your_instance:your_token
   ```

### Option 3: Self-Hosted with whatsapp-web.js

**Most control, most complexity:**

1. Install whatsapp-web.js:
   ```bash
   npm install whatsapp-web.js qrcode-terminal
   ```

2. Create bridge server (separate from main app)

3. Scan QR code to authenticate

4. Forward messages to main app webhook

**Not recommended for production** due to:
- Instability
- High maintenance
- Account ban risk
- No official support

---

## Webhook Payload Reference

### Message Structure

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "PHONE_NUMBER",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "messages": [{
          "from": "SENDER_PHONE_NUMBER",
          "id": "wamid.XXX",
          "timestamp": "1234567890",
          "type": "text",
          "text": {
            "body": "MESSAGE_TEXT"
          }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

### Media Message Example

```json
{
  "messages": [{
    "from": "SENDER_PHONE_NUMBER",
    "id": "wamid.XXX",
    "timestamp": "1234567890",
    "type": "image",
    "image": {
      "id": "MEDIA_ID",
      "mime_type": "image/jpeg",
      "sha256": "SHA256_HASH",
      "caption": "Optional caption"
    }
  }]
}
```

---

## Security Best Practices

### 1. Signature Verification

Always verify webhook signatures:

```typescript
const signature = req.headers['x-hub-signature-256'];
verifyWhatsAppSignature(payload, signature, appSecret);
```

Our app does this automatically.

### 2. HTTPS Only

Never use HTTP for webhooks. WhatsApp requires HTTPS.

### 3. Rotate Tokens

Rotate access tokens periodically (every 90 days recommended).

### 4. Environment Variables

Never commit credentials. Use environment variables.

### 5. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// Already implemented in our app
limiter: {
  max: 10,
  duration: 1000,
}
```

---

## Troubleshooting

### Webhook Not Receiving Messages

1. **Check webhook URL is accessible:**
   ```bash
   curl https://your-domain.com/whatsapp/webhook
   ```

2. **Verify webhook configuration in Meta dashboard**

3. **Check logs:**
   ```bash
   npm run dev
   # Send test message
   # Look for "Webhook received" in logs
   ```

4. **Test with Meta's test button** (in webhook configuration)

### Signature Verification Fails

1. **Ensure App Secret is correct** in `.env`

2. **Check request body** is not modified before verification

3. **Verify header format:** Should be `sha256=HASH`

### Messages Not Processing

1. **Check worker is running:**
   ```bash
   npm run worker
   ```

2. **Check Redis is accessible:**
   ```bash
   docker ps | grep redis
   ```

3. **Check admin UI** for job status:
   ```
   http://localhost:3001
   ```

### Media Download Fails

1. **Check access token** is valid

2. **Verify media ID** in webhook payload

3. **Check S3/MinIO** is accessible

---

## Cost Estimation

### WhatsApp Cloud API Pricing

**Free Tier:**
- 1,000 conversations/month free
- Conversation = 24-hour window with a user

**Paid:**
- $0.005 - $0.09 per conversation (varies by country)
- Media messages count as conversations

### Bridge Services

**Unipile:**
- Starts at $29/month
- Includes multiple platforms

**Green-API:**
- Starts at $15/month
- WhatsApp only

---

## Next Steps

After setting up WhatsApp:

1. ✅ Test webhook with a message
2. ✅ Set up Notion database ([NOTION_SETUP.md](NOTION_SETUP.md))
3. ✅ Configure AI enrichment
4. ✅ Deploy to production ([DEPLOYMENT.md](DEPLOYMENT.md))

---

## Additional Resources

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Business Help Center](https://business.facebook.com/business/help)
- [WhatsApp API Changelog](https://developers.facebook.com/docs/whatsapp/cloud-api/changelog)
