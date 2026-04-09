# WhatsApp Business API Setup Guide

## Overview
The WhatsApp Business API is the most reliable solution for production environments like Railway. It provides stable, officially supported messaging without browser automation limitations.

## Setup Steps

### 1. Create Meta Business Account
1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Create a business account (or use existing)
3. Verify your business

### 2. Get WhatsApp Business API Access
1. Apply for WhatsApp Business API access through Meta
2. Select your use case (customer service, marketing, etc.)
3. Wait for approval (usually 1-3 business days)

### 3. Configure WhatsApp
1. Create a WhatsApp Business account
2. Add your phone number (must be a business number)
3. Verify the phone number

### 4. Get API Credentials
1. Go to WhatsApp Business Manager
2. Create an app
3. Get:
   - Access Token (permanent or temporary)
   - Phone Number ID
   - Webhook Verify Token

### 5. Configure Environment Variables
Add these to your Railway environment variables:

```bash
# WhatsApp Business API Configuration
WHATSAPP_BUSINESS_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_verify_token
WHATSAPP_WEBHOOK_URL=https://your-app.railway.app/api/whatsapp-business/webhook
```

### 6. Update Backend Routes
Add the new WhatsApp Business routes to your main app:

```typescript
import whatsappBusinessRoutes from './api/routes/whatsappBusiness.js';

app.use('/api/whatsapp-business', whatsappBusinessRoutes);
```

### 7. Configure Webhook
1. In WhatsApp Business Manager, set your webhook URL:
   `https://your-app.railway.app/api/whatsapp-business/webhook`
2. Subscribe to messages webhook field
3. Test the webhook

## Benefits
- **Reliable**: No browser automation issues
- **Scalable**: Official API with rate limits
- **Production Ready**: Designed for business use
- **No Dependencies**: No Puppeteer/Chrome required

## Costs
- Free tier: 1,000 conversations per month
- Paid tiers available for higher volume
- Number rental costs may apply

## Testing
Use the provided test endpoints:
- `POST /api/whatsapp-business/send` - Send test messages
- `GET /api/whatsapp-business/status` - Check connection status

## Migration from WhatsApp Web.js
The new service is designed to be a drop-in replacement:
- Same message handling logic
- Same database integration
- Same AI response generation

## Troubleshooting
- Ensure webhook URL is publicly accessible
- Check that your phone number is verified
- Verify API tokens are correct
- Monitor webhook delivery logs in Meta Business Suite
