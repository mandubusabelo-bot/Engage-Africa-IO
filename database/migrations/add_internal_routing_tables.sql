-- Internal Routing Tables for Intandokazi Herbal
-- Staff notifications, templates, and reply handling

-- 1. Message Templates (Prompts)
CREATE TABLE IF NOT EXISTS internal_prompts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_key         VARCHAR UNIQUE NOT NULL,
  label               VARCHAR NOT NULL,
  description         TEXT,
  template            TEXT NOT NULL,
  available_variables TEXT,
  channel             VARCHAR DEFAULT 'whatsapp',
  -- 'whatsapp'      = sent via Evolution API to staff number
  -- 'conversation'  = sent into the customer conversation
  -- 'internal_note' = private note, customer never sees it
  active              BOOLEAN DEFAULT TRUE,
  updated_at          TIMESTAMP DEFAULT NOW(),
  updated_by          VARCHAR
);

-- Enable RLS
ALTER TABLE internal_prompts ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (adjust per your auth setup)
CREATE POLICY "Allow all" ON internal_prompts FOR ALL USING (true);

-- 2. Internal Staff Registry
CREATE TABLE IF NOT EXISTS internal_staff (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     VARCHAR NOT NULL,
  role     VARCHAR NOT NULL,
  -- 'dispatch' | 'human_agent' | 'disputes'
  number   VARCHAR NOT NULL,
  -- international format: 27XXXXXXXXX
  active   BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE internal_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON internal_staff FOR ALL USING (true);

-- 3. Notification Logs
CREATE TABLE IF NOT EXISTS internal_notification_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_key      VARCHAR,
  role             VARCHAR,
  recipient        VARCHAR,
  rendered_message TEXT,
  conversation_id  UUID REFERENCES conversations(id),
  reference_id     VARCHAR,
  status           VARCHAR,
  -- 'sent' | 'failed'
  error            TEXT,
  sent_at          TIMESTAMP DEFAULT NOW()
);

ALTER TABLE internal_notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON internal_notification_logs FOR ALL USING (true);

-- Seed default prompt templates
-- Only insert if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM internal_prompts LIMIT 1) THEN

    INSERT INTO internal_prompts
      (trigger_key, label, description, template, available_variables, channel)
    VALUES
    (
      'dispatch_new_order',
      'Dispatch — New order (Pop received)',
      'Sent to dispatch WhatsApp when customer sends proof of payment',
      '*NEW ORDER — POP RECEIVED* ✅
*Customer:* {{contact.name}}
*Cell:* {{contact.phone}}

*Order:*
{{order.productName}} x {{order.qty}} — R{{order.price}}
Pep Paxi: R110
*Total: R{{order.totalAmount}}*

*Collection:* {{order.collectionDetails}}
*Name for parcel:* {{order.contactName}}

Received at: {{dispatch.timestamp}}',
      'contact.name, contact.phone, order.productName, order.qty, order.price, order.totalAmount, order.collectionDetails, order.contactName, dispatch.timestamp',
      'whatsapp'
    ),
    (
      'dispatch_pending_order',
      'Dispatch — Pending order (awaiting payment)',
      'Sent to dispatch when customer confirms order and is directed to pay',
      '*PENDING ORDER — AWAITING PAYMENT* ⏳
*Customer:* {{contact.name}}
*Cell:* {{contact.phone}}

*Order:*
{{order.productName}} x {{order.qty}} — R{{order.price}}
Pep Paxi: R110
*Total: R{{order.totalAmount}}*

*Collection:* {{order.collectionDetails}}

Customer directed to: intandokaziherbal.co.za/shop
Waiting for payment or Pop 🌿',
      'contact.name, contact.phone, order.productName, order.qty, order.price, order.totalAmount, order.collectionDetails',
      'whatsapp'
    ),
    (
      'escalation_human',
      'Human Agent — Escalation alert',
      'Sent to human agent WhatsApp when agent cannot help customer',
      '*CUSTOMER NEEDS HELP* 🔴
*Customer:* {{contact.name}}
*Cell:* {{contact.phone}}

*Reason:* {{escalation.reason}}

*Last message:*
"{{escalation.lastMessage}}"

*Conversation ID:* {{conversation.id}}

Please respond directly or open the dashboard and search conversation {{conversation.id}}',
      'contact.name, contact.phone, escalation.reason, escalation.lastMessage, conversation.id',
      'whatsapp'
    ),
    (
      'pop_received_customer',
      'Customer — Pop received confirmation',
      'Sent into customer conversation after Pop is received',
      'Thank you, Pop received ✅
Your order has been sent to our team and will be dispatched within 1–3 business days 🌿',
      '',
      'conversation'
    ),
    (
      'order_dispatched_customer',
      'Customer — Order dispatched notification',
      'Sent into customer conversation when staff replies DISPATCHED',
      'Your order is on its way 📦
Expect delivery within 1–3 business days.
{{#if order.trackingNumber}}Tracking: {{order.trackingNumber}}{{/if}}
Thank you for choosing Intandokazi Herbal 🌿',
      'order.trackingNumber',
      'conversation'
    ),
    (
      'staff_reply_received_ack',
      'Staff — Order acknowledged reply',
      'Sent back to staff when they reply RECEIVED',
      '✅ Got it, order {{order.ref}} noted',
      'order.ref',
      'whatsapp'
    ),
    (
      'staff_reply_dispatched_ack',
      'Staff — Dispatched acknowledgement',
      'Sent back to staff when they reply DISPATCHED',
      '✅ Order {{order.ref}} marked as dispatched. Customer will be notified 🌿',
      'order.ref',
      'whatsapp'
    ),
    (
      'staff_reply_done_ack',
      'Staff — Done acknowledgement',
      'Sent back to staff when they reply DONE',
      '✅ Order {{order.ref}} completed and conversation closed.',
      'order.ref',
      'whatsapp'
    ),
    (
      'escalation_internal_note',
      'Internal note — Escalation logged',
      'Added as private note to conversation when escalated',
      'Escalated to human agent.
Reason: {{escalation.reason}}
WhatsApp notification sent.
Last message: "{{escalation.lastMessage}}"',
      'escalation.reason, escalation.lastMessage',
      'internal_note'
    );

  END IF;
END $$;

-- Seed default staff if empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM internal_staff LIMIT 1) THEN
    
    INSERT INTO internal_staff (name, role, number, active, verified)
    VALUES
      ('Nthona', 'dispatch', '27625842441', true, true),
      ('Human Agent', 'human_agent', '27672239798', true, true);
      -- Add disputes number when available
      
  END IF;
END $$;
