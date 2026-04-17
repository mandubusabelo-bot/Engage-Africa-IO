-- Migration: Add contact auto-update fields and orders table for PayFast integration
-- Created: 2026-04-17

-- ================================================================
-- PART 1: CONTACT AUTO-UPDATE FIELDS
-- ================================================================

-- Add fields to contacts table for auto-updating from conversations
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS alternative_phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'South Africa';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Add metadata tracking for auto-updates
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS auto_updated_fields JSONB DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_auto_update TIMESTAMPTZ;

-- ================================================================
-- PART 2: AGENT SETTINGS FOR AUTO-UPDATE
-- ================================================================

-- Add agent settings for contact auto-update behavior
ALTER TABLE agents ADD COLUMN IF NOT EXISTS auto_update_contact_email BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS auto_update_contact_phone BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS auto_update_contact_address BOOLEAN DEFAULT true;

-- ================================================================
-- PART 3: ORDERS TABLE FOR PAYFAST INTEGRATION
-- ================================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref VARCHAR(50) UNIQUE NOT NULL, -- e.g. ORD-xxxxxxxx
  conversation_id VARCHAR(255),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  
  -- Contact information (snapshot at time of order)
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50) NOT NULL,
  
  -- Delivery address
  delivery_address JSONB NOT NULL, -- {street, city, province, postalCode, country, notes}
  
  -- Order items
  items JSONB NOT NULL, -- [{productId, productName, qty, price, sku}]
  
  -- Pricing
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',
  
  -- Payment status
  status VARCHAR(50) DEFAULT 'awaiting_payment', 
  -- 'awaiting_payment' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'dispatched' | 'completed'
  
  -- PayFast fields
  payment_id VARCHAR(255), -- PayFast's pf_payment_id
  payment_status VARCHAR(50), -- PayFast's payment_status field
  payfast_signature VARCHAR(255),
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- created_at + expiry minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Dispatch tracking
  tracking_number VARCHAR(255),
  courier VARCHAR(100),
  estimated_delivery_date DATE,
  
  -- Notes
  notes TEXT,
  dispatch_notes TEXT,
  customer_notes TEXT
);

-- Indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_order_ref ON orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_conversation_id ON orders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_orders_contact_id ON orders(contact_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);

-- ================================================================
-- PART 4: PAYMENT SETTINGS FOR AGENTS
-- ================================================================

-- Add payment-related settings to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS payment_link_template TEXT DEFAULT 
'Here is your secure payment link for Order #{{orderId}}:
{{paymentUrl}}

Order summary:
{{#each items}}• {{qty}}x {{productName}} — R{{price}}
{{/each}}

Total: R{{totalAmount}}

This link is valid for 30 minutes. You''ll be redirected back once payment is complete. 🔒 Powered by PayFast.';

ALTER TABLE agents ADD COLUMN IF NOT EXISTS order_confirmed_template TEXT DEFAULT 
'Your payment is confirmed! 🎉

Order #{{orderId}} has been sent to our dispatch team.
Delivery to: {{deliveryAddress.street}}, {{deliveryAddress.city}}

Estimated dispatch: {{estimatedDispatch}}
We''ll be in touch with tracking info. Thank you for your order! 🌿';

ALTER TABLE agents ADD COLUMN IF NOT EXISTS payment_failed_template TEXT DEFAULT 
'It looks like your payment didn''t go through — no worries at all.
Would you like me to send you the payment link again, or would you prefer to pay a different way?';

ALTER TABLE agents ADD COLUMN IF NOT EXISTS order_expiry_minutes INTEGER DEFAULT 30;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS allow_resend_payment_link BOOLEAN DEFAULT true;

-- ================================================================
-- PART 5: TRIGGERS
-- ================================================================

-- Update trigger for orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ================================================================
-- PART 6: DEFAULT DATA
-- ================================================================

-- Update existing agents with default payment templates if they don't have them
UPDATE agents 
SET 
  payment_link_template = COALESCE(payment_link_template, 
    'Here is your secure payment link for Order #{{orderId}}:
{{paymentUrl}}

Order summary:
{{#each items}}• {{qty}}x {{productName}} — R{{price}}
{{/each}}

Total: R{{totalAmount}}

This link is valid for 30 minutes. 🔒 Powered by PayFast.'),
  order_confirmed_template = COALESCE(order_confirmed_template,
    'Your payment is confirmed! 🎉

Order #{{orderId}} has been sent to our dispatch team.
We''ll be in touch with tracking info. Thank you!'),
  payment_failed_template = COALESCE(payment_failed_template,
    'Your payment didn''t go through. Would you like me to send you the payment link again?')
WHERE payment_link_template IS NULL OR order_confirmed_template IS NULL OR payment_failed_template IS NULL;
