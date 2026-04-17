# PayFast Integration & Contact Auto-Update - Complete Implementation

## ✅ Implementation Status: COMPLETE

**Commit:** `43db974` - feat: PayFast integration and contact auto-update

---

## 📋 Overview

This implementation adds full PayFast payment gateway integration and automatic contact information updates to the Engage Africa platform. The system uses a redirect-based payment model with pending orders and webhook confirmation.

---

## 🗄️ Database Changes

### Migration File
`database/migrations/add_contact_fields_and_orders.sql`

### New Tables

#### 1. **orders** table
Stores all order information for PayFast transactions:

```sql
- id (UUID, primary key)
- order_ref (VARCHAR, unique) - e.g., ORD-XXXXXXXX
- conversation_id, contact_id, agent_id (references)
- contact_name, contact_email, contact_phone
- delivery_address (JSONB) - {street, city, province, postalCode, country, notes}
- items (JSONB) - [{productId, productName, qty, price, sku}]
- total_amount (DECIMAL), currency (VARCHAR, default 'ZAR')
- status (VARCHAR) - 'awaiting_payment' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'dispatched' | 'completed'
- payment_id, payment_status, payfast_signature
- paid_at, dispatched_at, completed_at, expires_at, created_at, updated_at
- tracking_number, courier, estimated_delivery_date
- notes, dispatch_notes, customer_notes
```

### Extended Tables

#### 2. **contacts** table - New fields
```sql
- email (TEXT)
- alternative_phone (TEXT)
- street_address, city, province, postal_code, country (TEXT)
- delivery_notes (TEXT)
- auto_updated_fields (JSONB) - tracks which fields were auto-updated
- last_auto_update (TIMESTAMPTZ)
```

#### 3. **agents** table - New fields
```sql
-- Auto-update settings
- auto_update_contact_email (BOOLEAN, default: true)
- auto_update_contact_phone (BOOLEAN, default: true)
- auto_update_contact_address (BOOLEAN, default: true)

-- Payment settings
- payment_link_template (TEXT)
- order_confirmed_template (TEXT)
- payment_failed_template (TEXT)
- order_expiry_minutes (INTEGER, default: 30)
- allow_resend_payment_link (BOOLEAN, default: true)
```

---

## 🌐 Next.js Site Routes (Intandokazi Herbal Products)

### 1. **Prepare Order** - `/api/agent/orders/prepare`
**POST** - Called by agent BEFORE sending payment link

**Request:**
```json
{
  "contactName": "John Doe",
  "contactPhone": "0712345678",
  "contactEmail": "john@example.com",
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Cape Town",
    "province": "Western Cape",
    "postalCode": "8001"
  },
  "items": [
    { "productId": "...", "productName": "...", "qty": 2, "price": 150.00 }
  ],
  "totalAmount": 300.00,
  "conversationId": "...",
  "contactId": "...",
  "agentId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "ORD-ABC12345",
  "paymentUrl": "https://sandbox.payfast.co.za/eng/process?...",
  "totalAmount": 300.00,
  "expiresAt": "2026-04-17T20:30:00Z"
}
```

### 2. **PayFast Notify** - `/api/payfast/notify`
**POST** - PayFast ITN (Instant Transaction Notification) webhook

**Security Checks:**
1. ✅ Signature validation (MD5 hash)
2. ✅ Amount verification
3. ✅ IP whitelist (PayFast IPs only)
4. ✅ Payment status validation

**Actions on Success:**
- Updates order status to 'paid'
- Sends dispatch email (TODO: implement email service)
- Notifies engagement platform via webhook
- Returns HTTP 200 to PayFast

### 3. **Success Page** - `/order/success?orderId=...`
- Polls order status every 3 seconds
- Shows confirmation when payment is verified
- Displays order details and delivery info

### 4. **Cancelled Page** - `/order/cancelled?orderId=...`
- Shows cancellation message
- Keeps order pending for 24 hours
- Allows customer to resume order

### 5. **Order Status** - `/api/orders/[orderId]`
**GET** - Check order status (used by success page polling)

---

## 🤖 Engagement Platform Routes

### Payment Webhook Receiver
**POST** `/api/v1/agent/payment-confirmed`

**Headers:** `x-agent-secret: [AGENT_API_SECRET]`

**Request:**
```json
{
  "event": "payment_confirmed" | "payment_failed",
  "orderId": "ORD-ABC12345",
  "conversationId": "...",
  "contactId": "...",
  "contactName": "John Doe",
  "totalAmount": 300.00,
  "paymentStatus": "COMPLETE" | "FAILED" | "CANCELLED",
  "items": [...],
  "deliveryAddress": {...}
}
```

**Actions:**
- Adds system message to conversation
- Sends confirmation/failure message to customer via WhatsApp
- Auto-updates contact fields if enabled
- Stores pending order ID for retry if failed

---

## 🎨 Agent Settings - Commerce & Payments Tab

### Contact Auto-Update Section
- ✅ Auto-update email addresses (toggle)
- ✅ Auto-update phone numbers (toggle)
- ✅ Auto-update delivery addresses (toggle)

### Payment & Order Settings
- **Payment link expiry** (5-120 minutes, default: 30)
- **Allow payment link resend** (toggle, default: ON)
- **Payment link message template** (textarea with variables)
- **Order confirmed message template** (textarea with variables)
- **Payment failed message template** (textarea with variables)

### Template Variables
- `{{orderId}}` - Order reference number
- `{{paymentUrl}}` - PayFast payment URL
- `{{totalAmount}}` - Total order amount
- `{{items}}` - Order items list
- `{{deliveryAddress.street}}`, `{{deliveryAddress.city}}`, etc.
- `{{estimatedDispatch}}` - Estimated dispatch time

---

## 🔄 Flow Builder - Commerce Nodes

### 1. **Generate Payment** Node
- **Type:** `generate_payment`
- **Icon:** 🛒 ShoppingCart
- **Color:** Emerald
- **Outputs:** Success, Failed
- **Action:** Calls `/api/agent/orders/prepare` to create pending order and payment URL

### 2. **Send Payment Link** Node
- **Type:** `send_payment_link`
- **Icon:** 💬 MessageSquare
- **Color:** Cyan
- **Status:** ⏳ Waiting for payment...
- **Action:** Sends payment link message to customer, then WAITS for webhook

### 3. **Payment Result** Node
- **Type:** `payment_result`
- **Icon:** ▶️ Play (trigger)
- **Color:** Purple
- **Outputs:** Paid, Failed, Cancelled, Expired
- **Action:** Triggered by payment webhook, routes flow based on payment status

---

## 📊 Example Flow

```
[New Conversation]
    ↓
[Greet Customer]
    ↓
[Customer asks about product]
    ↓
[Search Product] → Found
    ↓
[Check Stock] → In Stock
    ↓
[Collect Order Details]
    ↓
[Confirm Order] → Confirmed
    ↓
[Generate Payment] → Success
    ↓
[Send Payment Link]
    ↓
[⏳ WAITING FOR PAYMENT]
    ↓
[Payment Result]
    ├─ Paid → [Send Confirmation] → [Notify Dispatch] → [Close]
    ├─ Failed → [Send Failure Message] → [Offer Retry]
    ├─ Cancelled → [Send Cancellation Message] → [Offer Retry]
    └─ Expired → [Send Expiry Message] → [Offer Retry]
```

---

## 🔐 Environment Variables Required

### Next.js Site (.env.local)
```env
# PayFast
PAYFAST_MERCHANT_ID=your-merchant-id
PAYFAST_MERCHANT_KEY=your-merchant-key
PAYFAST_PASSPHRASE=your-passphrase
PAYFAST_ENVIRONMENT=sandbox  # or 'production'

# Site URLs
NEXT_PUBLIC_SITE_URL=https://your-site.vercel.app

# Agent Platform
AGENT_WEBHOOK_URL=https://your-engagement-platform.com/api/v1/agent/payment-confirmed
AGENT_API_SECRET=shared-secret-key

# Email (for dispatch notifications)
DISPATCH_EMAIL=dispatch@yourcompany.com
```

### Engagement Platform (.env)
```env
AGENT_API_SECRET=shared-secret-key  # Must match Next.js site
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # For WhatsApp API calls
```

---

## 🧪 Testing

### Local Testing with ngrok
```bash
# Expose local Next.js server
ngrok http 3000

# Update notify_url in payment object to ngrok URL
# Use PayFast sandbox credentials
```

### PayFast Sandbox
- **URL:** https://sandbox.payfast.co.za
- **Test Cards:** https://developers.payfast.co.za/docs#testing
- **Merchant Portal:** https://sandbox.payfast.co.za/merchant

### Test Endpoint (Development Only)
`/api/agent/orders/test` - Simulates PayFast ITN for testing

---

## 📝 Next Steps

1. **Run Migration:**
   ```bash
   # In Supabase SQL Editor
   # Execute: database/migrations/add_contact_fields_and_orders.sql
   ```

2. **Configure PayFast:**
   - Sign up for PayFast sandbox account
   - Get merchant credentials
   - Add to .env.local

3. **Set Environment Variables:**
   - Add all required env vars to both platforms
   - Update AGENT_API_SECRET to match

4. **Test Payment Flow:**
   - Create test order via agent
   - Complete payment in sandbox
   - Verify webhook notification
   - Check order status update

5. **Implement Email Service:**
   - Add dispatch email notification
   - Use nodemailer or Resend
   - Send formatted order details to dispatch team

6. **Production Deployment:**
   - Switch PAYFAST_ENVIRONMENT to 'production'
   - Update PayFast merchant credentials
   - Test with real payment (small amount)
   - Monitor logs for issues

---

## 🎯 Features Implemented

✅ Full PayFast payment gateway integration  
✅ Pending order creation and management  
✅ Secure ITN webhook with signature validation  
✅ Payment success/failure/cancellation handling  
✅ Contact auto-update (email, phone, address)  
✅ Customizable payment message templates  
✅ Payment link expiry and resend functionality  
✅ Commerce flow nodes in Flow Builder  
✅ Order status polling on success page  
✅ WhatsApp notification on payment confirmation  
✅ Database migration for orders and contact fields  

---

## 📚 Documentation References

- **PayFast API Docs:** https://developers.payfast.co.za/docs
- **PayFast ITN Guide:** https://developers.payfast.co.za/docs#instant_transaction_notification
- **PayFast Testing:** https://developers.payfast.co.za/docs#testing

---

**Implementation Complete:** April 17, 2026  
**Status:** Ready for testing and deployment
