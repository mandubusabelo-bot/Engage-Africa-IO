-- Seed Agents and Flows for Engage Africa IO
-- Run this in Supabase SQL Editor to populate your database

-- Insert 3 default AI agents
INSERT INTO agents (
  id,
  user_id,
  name,
  description,
  instructions,
  personality,
  language,
  status,
  message_count,
  response_rate,
  created_at,
  updated_at
) VALUES
-- Customer Support Bot
(
  gen_random_uuid(),
  '37760c55-f426-4cc8-89b8-0828ae08c311', -- Replace with your user_id from users table
  'Customer Support Bot',
  'AI-powered customer support agent that handles inquiries and resolves issues',
  'You are a professional customer support agent. Your role is to:
1. Be friendly, empathetic, and patient with all customers
2. Listen carefully to understand customer issues
3. Provide clear, helpful solutions and explanations
4. Escalate complex issues to human agents when necessary
5. Maintain a positive and professional tone
6. Follow company policies and procedures
7. Document all interactions accurately
8. Always prioritize customer satisfaction

You should respond in a conversational, helpful manner and never make promises you cannot keep.',
  'professional',
  'english',
  'active',
  0,
  95,
  NOW(),
  NOW()
),
-- Sales Assistant
(
  gen_random_uuid(),
  '37760c55-f426-4cc8-89b8-0828ae08c311', -- Replace with your user_id
  'Sales Assistant',
  'AI sales agent that helps customers find the right products and drives conversions',
  'You are an expert sales assistant. Your role is to:
1. Understand customer needs and requirements
2. Recommend the most suitable products or services
3. Handle objections professionally and persuasively
4. Build rapport and trust with potential customers
5. Highlight key benefits and value propositions
6. Guide customers through the buying process
7. Follow up appropriately without being pushy
8. Track and report sales activities

You should be enthusiastic, knowledgeable, and customer-focused while maintaining professional sales ethics.',
  'enthusiastic',
  'english',
  'active',
  0,
  90,
  NOW(),
  NOW()
),
-- Product Finder
(
  gen_random_uuid(),
  '37760c55-f426-4cc8-89b8-0828ae08c311', -- Replace with your user_id
  'Product Finder',
  'AI product discovery agent that helps customers find products based on their needs',
  'You are a product discovery specialist. Your role is to:
1. Analyze customer requirements and preferences
2. Search and recommend relevant products
3. Compare features and benefits of different options
4. Provide detailed product information and specifications
5. Consider budget constraints and value for money
6. Check product availability and delivery options
7. Suggest alternatives if exact matches aren''t available
8. Help customers make informed purchasing decisions

You should be thorough, analytical, and focused on finding the best match for customer needs.',
  'analytical',
  'english',
  'active',
  0,
  92,
  NOW(),
  NOW()
);

-- Insert knowledge base items for Customer Support Bot
WITH customer_support_bot AS (
  SELECT id FROM agents WHERE name = 'Customer Support Bot' LIMIT 1
)
INSERT INTO knowledge_base (
  id,
  agent_id,
  title,
  content,
  file_type,
  metadata,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM customer_support_bot),
  'Customer Support Guidelines',
  'CUSTOMER SUPPORT GUIDELINES

1. GREETING PROTOCOL
   - Always greet customers warmly and professionally
   - Use customer name when available
   - Ask open-ended questions to understand needs

2. ISSUE RESOLUTION PROCESS
   - Listen actively without interrupting
   - Acknowledge customer concerns
   - Provide clear step-by-step solutions
   - Confirm understanding before proceeding

3. ESCALATION PROCEDURES
   - Identify when to escalate to human agent
   - Provide clear handover information
   - Document all previous attempts

4. COMMUNICATION STANDARDS
   - Use simple, clear language
   - Avoid technical jargon
   - Be empathetic and patient
   - Maintain positive tone',
  'text/plain',
  '{"source": "internal", "category": "guidelines"}'::jsonb,
  NOW(),
  NOW()
UNION ALL
SELECT
  gen_random_uuid(),
  (SELECT id FROM customer_support_bot),
  'Common Issues and Solutions',
  'COMMON ISSUES AND SOLUTIONS

LOGIN PROBLEMS:
- Forgot password: Use "Forgot Password" link
- Account locked: Contact support team
- Two-factor issues: Check backup codes

BILLING QUESTIONS:
- Invoice requests: Send to billing@company.com
- Payment issues: Check payment method
- Refund requests: Process within 5-7 business days

TECHNICAL ISSUES:
- Slow performance: Clear cache and cookies
- Connection problems: Check internet connection
- Feature not working: Try different browser',
  'text/plain',
  '{"source": "internal", "category": "troubleshooting"}'::jsonb,
  NOW(),
  NOW();

-- Insert knowledge base items for Sales Assistant
WITH sales_assistant AS (
  SELECT id FROM agents WHERE name = 'Sales Assistant' LIMIT 1
)
INSERT INTO knowledge_base (
  id,
  agent_id,
  title,
  content,
  file_type,
  metadata,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM sales_assistant),
  'Sales Playbook',
  'SALES PLAYBOOK

LEAD QUALIFICATION CRITERIA:
- Budget: $5,000+ minimum
- Decision maker: Must be able to sign
- Timeline: Within 3 months
- Need: Clear business requirement

PRODUCT KNOWLEDGE:
- Premium Plan: $999/month, Full features
- Professional Plan: $499/month, Core features
- Starter Plan: $99/month, Basic features

OBJECTION HANDLING:
Price: "I understand budget concerns. Let me show you the ROI."
Timing: "When would be better to revisit this?"
Competition: "Let me highlight our unique advantages."

CLOSING TECHNIQUES:
- Assumptive close
- Summary close
- Urgency close
- Question close',
  'text/plain',
  '{"source": "internal", "category": "sales"}'::jsonb,
  NOW(),
  NOW();

-- Insert knowledge base items for Product Finder
WITH product_finder AS (
  SELECT id FROM agents WHERE name = 'Product Finder' LIMIT 1
)
INSERT INTO knowledge_base (
  id,
  agent_id,
  title,
  content,
  file_type,
  metadata,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM product_finder),
  'Product Database',
  'PRODUCT DATABASE

ELECTRONICS:
- Smartphones: iPhone 15, Samsung Galaxy S24, Google Pixel 8
- Laptops: MacBook Pro, Dell XPS, ThinkPad X1
- Tablets: iPad Pro, Surface Pro, Galaxy Tab
- Smartwatches: Apple Watch, Galaxy Watch, Fitbit

HOME & KITCHEN:
- Coffee makers: Nespresso, Keurig, Breville
- Air fryers: Ninja, Philips, Cosori
- Vacuums: Dyson, Shark, Roomba
- Smart home: Amazon Echo, Google Nest, Apple HomeKit

COMPARISON FACTORS:
- Price range: Budget, mid-range, premium
- Quality ratings: 1-5 stars
- Brand reputation: Established vs emerging
- Features: Basic vs advanced
- Warranty: 1-5 years coverage',
  'text/plain',
  '{"source": "internal", "category": "products"}'::jsonb,
  NOW(),
  NOW();

-- Insert sample automation flows
INSERT INTO flows (
  id,
  user_id,
  name,
  description,
  trigger_type,
  nodes,
  edges,
  status,
  created_at,
  updated_at
) VALUES
-- Welcome Message Flow
(
  gen_random_uuid(),
  '37760c55-f426-4cc8-89b8-0828ae08c311', -- Replace with your user_id
  'Welcome New Customers',
  'Automatically send welcome message to new customers',
  'new_contact',
  '[
    {
      "id": "welcome-node",
      "type": "message",
      "data": {
        "message": "Welcome to Engage Africa IO! We are excited to have you. How can we help you today?"
      }
    }
  ]'::jsonb,
  '[]'::jsonb,
  'active',
  NOW(),
  NOW()
),
-- Lead Qualification Flow
(
  gen_random_uuid(),
  '37760c55-f426-4cc8-89b8-0828ae08c311', -- Replace with your user_id
  'Qualify Sales Leads',
  'Automatically qualify and route sales leads',
  'keyword',
  '[
    {
      "id": "tag-node",
      "type": "tag",
      "data": {
        "tags": ["sales_lead", "high_priority"]
      }
    },
    {
      "id": "message-node",
      "type": "message",
      "data": {
        "message": "Great! Let me connect you with our sales team to discuss your needs."
      }
    }
  ]'::jsonb,
  '[
    {
      "id": "edge-1",
      "source": "tag-node",
      "target": "message-node"
    }
  ]'::jsonb,
  'active',
  NOW(),
  NOW()
),
-- Product Inquiry Flow
(
  gen_random_uuid(),
  '37760c55-f426-4cc8-89b8-0828ae08c311', -- Replace with your user_id
  'Product Inquiry Handler',
  'Route product questions to product finder agent',
  'keyword',
  '[
    {
      "id": "inquiry-message-node",
      "type": "message",
      "data": {
        "message": "I can help you find the perfect product! Let me ask you a few questions."
      }
    }
  ]'::jsonb,
  '[]'::jsonb,
  'active',
  NOW(),
  NOW()
),
-- Support Ticket Flow
(
  gen_random_uuid(),
  '37760c55-f426-4cc8-89b8-0828ae08c311', -- Replace with your user_id
  'Create Support Ticket',
  'Automatically create support tickets for issues',
  'keyword',
  '[
    {
      "id": "support-tag-node",
      "type": "tag",
      "data": {
        "tags": ["support_ticket", "needs_attention"]
      }
    },
    {
      "id": "support-message-node",
      "type": "message",
      "data": {
        "message": "I am sorry to hear you are having an issue. Let me help you resolve this."
      }
    }
  ]'::jsonb,
  '[
    {
      "id": "edge-1",
      "source": "support-tag-node",
      "target": "support-message-node"
    }
  ]'::jsonb,
  'active',
  NOW(),
  NOW()
);

-- Verify the data was inserted
SELECT 'Agents created:' as info, COUNT(*) as count FROM agents;
SELECT 'Knowledge base items:' as info, COUNT(*) as count FROM knowledge_base;
SELECT 'Flows created:' as info, COUNT(*) as count FROM flows;
