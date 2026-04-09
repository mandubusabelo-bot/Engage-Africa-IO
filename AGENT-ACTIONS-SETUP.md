# 🤖 AI Agent Actions - Setup Guide

## Overview

Your Engage Africa IO platform now supports **AI Agent Actions** similar to Respond.io. These are automated actions that AI agents can perform during conversations.

---

## 🎯 Available Actions

### 1. **Close Conversations**
- AI Agent can close conversations based on your guidelines
- **When to use**: Contact confirms issue is resolved, no further help required
- **Example**: "If the Contact confirms their issue is resolved and no further help is required, close conversation."

### 2. **Assign to Agent or Team**
- AI Agent can assign conversations to human agents, other AI agents, or teams
- **When to use**: Issue can't be resolved using knowledge source, contact requests a human
- **Example**: "If the issue can't be resolved using the Knowledge source → assign to anyone in the workspace."

### 3. **Update Lifecycle Stages**
- AI Agent can update a Contact's Lifecycle Stage based on the conversation
- **When to use**: Contact makes a purchase, shows buying intent, becomes inactive
- **Stages**: Lead → Prospect → Customer → Churned

### 4. **Update Contact Fields**
- AI Agent can automatically update Contact fields based on conversation
- **When to use**: Contact provides email, name, phone number, or other information
- **Example**: "If the contact provides an email, name, or phone number"

---

## 📊 Database Schema

### New Tables Created:

#### **contacts**
```sql
- id (UUID)
- user_id (UUID)
- phone (VARCHAR)
- email (VARCHAR)
- name (VARCHAR)
- lifecycle_stage (VARCHAR) - lead, prospect, customer, churned
- custom_fields (JSONB)
- tags (TEXT[])
- created_at, updated_at
```

#### **teams**
```sql
- id (UUID)
- user_id (UUID)
- name (VARCHAR)
- description (TEXT)
- members (JSONB) - Array of user IDs
- created_at, updated_at
```

#### **agent_actions**
```sql
- id (UUID)
- agent_id (UUID)
- action_type (VARCHAR) - close_conversation, assign_to_agent, assign_to_team, update_lifecycle, update_contact_fields
- enabled (BOOLEAN)
- conditions (JSONB) - When should this action trigger
- action_config (JSONB) - What should the action do
- priority (INTEGER)
- created_at, updated_at
```

#### **conversation_assignments**
```sql
- id (UUID)
- conversation_id (UUID)
- assigned_to_type (VARCHAR) - agent, team, human
- assigned_to_id (UUID)
- assigned_by (VARCHAR) - ai, manual
- assigned_at (TIMESTAMP)
- status (VARCHAR) - active, completed, transferred
```

#### **conversations** (updated)
```sql
Added fields:
- status (VARCHAR) - open, closed, assigned
- closed_at (TIMESTAMP)
- closed_by (VARCHAR) - ai, human, system
- closure_reason (TEXT)
```

---

## 🚀 Setup Instructions

### Step 1: Run the SQL Schema

1. Go to your Supabase dashboard: https://oaeirdgffwodkbcstdfh.supabase.co
2. Click **SQL Editor**
3. Open the file: `supabase-agent-actions-schema.sql`
4. Copy and paste the entire SQL into the editor
5. Click **Run**

This will create:
- ✅ `contacts` table
- ✅ `teams` table
- ✅ `agent_actions` table
- ✅ `conversation_assignments` table
- ✅ Updates to `conversations` table
- ✅ Sample data for testing

### Step 2: Verify Tables Created

In Supabase, go to **Table Editor** and verify you see:
- contacts
- teams
- agent_actions
- conversation_assignments

### Step 3: Backend is Ready

The backend has been updated with:
- ✅ Database methods for all actions
- ✅ API routes at `/api/actions`
- ✅ Automatic restart with new routes

---

## 🔌 API Endpoints

### Agent Actions
```
GET    /api/actions/agent/:agentId    - Get all actions for an agent
POST   /api/actions                   - Create new action
PUT    /api/actions/:id               - Update action
DELETE /api/actions/:id               - Delete action
```

### Contacts
```
GET    /api/actions/contacts          - Get all contacts
POST   /api/actions/contacts          - Create contact
PUT    /api/actions/contacts/:id      - Update contact
```

### Teams
```
GET    /api/actions/teams             - Get all teams
POST   /api/actions/teams             - Create team
```

### Execute Actions
```
POST   /api/actions/execute/close-conversation
POST   /api/actions/execute/assign-conversation
POST   /api/actions/execute/update-lifecycle
```

---

## 💡 How It Works

### Example: Close Conversation Action

1. **Agent Configuration**:
```json
{
  "action_type": "close_conversation",
  "enabled": true,
  "conditions": {
    "rules": [
      "Contact confirms issue is resolved",
      "No further help required"
    ]
  },
  "action_config": {
    "closure_reason": "Issue resolved by AI"
  }
}
```

2. **During Conversation**:
   - AI detects customer says "Thanks, that solved my problem!"
   - AI checks action conditions
   - If conditions match, AI executes the action
   - Conversation is marked as closed in database

### Example: Assign to Team Action

1. **Agent Configuration**:
```json
{
  "action_type": "assign_to_team",
  "enabled": true,
  "conditions": {
    "rules": [
      "Issue cannot be resolved using Knowledge source",
      "Contact requests a human"
    ]
  },
  "action_config": {
    "team_name": "Customer Support"
  }
}
```

2. **During Conversation**:
   - AI tries to help but can't find answer in knowledge base
   - AI checks action conditions
   - If conditions match, AI assigns to "Customer Support" team
   - Human agents in team are notified

### Example: Update Contact Fields

1. **Agent Configuration**:
```json
{
  "action_type": "update_contact_fields",
  "enabled": true,
  "conditions": {
    "rules": [
      "Contact provides email, name, or phone number"
    ]
  },
  "action_config": {
    "fields": ["email", "name", "phone"]
  }
}
```

2. **During Conversation**:
   - Customer says "My email is john@example.com"
   - AI extracts the email
   - AI updates contact record in database
   - Contact profile is enriched automatically

---

## 🎨 Frontend Integration (Coming Next)

The frontend UI will include:

1. **Actions Tab in Agent Configuration**
   - Toggle each action on/off
   - Configure conditions for each action
   - Set action parameters

2. **Contacts Page**
   - View all contacts
   - See lifecycle stages
   - Update contact information
   - View contact history

3. **Teams Page**
   - Create and manage teams
   - Add team members
   - View team assignments

4. **Conversation Management**
   - See conversation status (open/closed/assigned)
   - View who closed conversations
   - See assignment history

---

## 📝 Sample Data Included

The schema includes sample data:

**Sample Contact**:
- Phone: +27123456789
- Email: customer@example.com
- Name: John Doe
- Lifecycle: Lead
- Custom fields: Company, Source

**Sample Team**:
- Name: Customer Support
- Description: Main customer support team

**Sample Actions** (for first agent):
1. Close conversation when issue resolved
2. Assign to team when AI can't help
3. Update contact fields when info provided
4. Update lifecycle when customer makes purchase

---

## ✅ Testing

### Test Close Conversation:
```bash
POST http://localhost:3001/api/actions/execute/close-conversation
{
  "conversationId": "your-conversation-id",
  "reason": "Issue resolved by AI"
}
```

### Test Assign Conversation:
```bash
POST http://localhost:3001/api/actions/execute/assign-conversation
{
  "conversationId": "your-conversation-id",
  "assignedToType": "team",
  "assignedToId": "team-id"
}
```

### Test Update Lifecycle:
```bash
POST http://localhost:3001/api/actions/execute/update-lifecycle
{
  "contactId": "contact-id",
  "newStage": "customer"
}
```

---

## 🔐 Security

All endpoints require authentication:
- Bearer token required
- User ID automatically attached to records
- RLS policies can be added for additional security

---

## 🎯 Next Steps

1. **Run the SQL schema** in Supabase
2. **Verify tables created** in Table Editor
3. **Backend will auto-restart** with new routes
4. **Test API endpoints** using the examples above
5. **Frontend UI** will be added next for visual configuration

---

## 📞 Support

All database tables, API routes, and backend logic are ready. The system can now:
- ✅ Store agent actions
- ✅ Manage contacts with lifecycle stages
- ✅ Create and manage teams
- ✅ Close conversations automatically
- ✅ Assign conversations to agents/teams
- ✅ Update contact information
- ✅ Track conversation status

**Your AI agents now have the power to take automated actions! 🚀**
