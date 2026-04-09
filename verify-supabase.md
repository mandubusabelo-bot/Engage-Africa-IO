# Verify Supabase Schema

## Quick Check in Supabase Dashboard

1. **Go to your Supabase project:** https://oaeirdgffwodkbcstdfh.supabase.co

2. **Click "Table Editor" in the left sidebar**

3. **You should see these tables:**
   - ✅ users
   - ✅ agents
   - ✅ flows
   - ✅ templates
   - ✅ messages
   - ✅ knowledge_base
   - ✅ whatsapp_sessions
   - ✅ analytics
   - ✅ conversations
   - ✅ products

## If Tables Are Missing

Run this in SQL Editor:
- Open **SQL Editor** in left sidebar
- Copy and paste the entire `supabase-schema-clean.sql` file
- Click **Run** button

## Get Your API Keys

1. Click **Project Settings** (gear icon at bottom left)
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL:** `https://oaeirdgffwodkbcstdfh.supabase.co` ✅ (already have this)
   - **anon public key:** Copy this (long string starting with `eyJ...`)
   - **service_role key:** Copy this (another long string starting with `eyJ...`)

## Update Backend .env

Replace these lines in `backend/.env`:

```env
SUPABASE_ANON_KEY=paste_your_anon_key_here
SUPABASE_SERVICE_KEY=paste_your_service_role_key_here
```

## Test Connection

After adding keys, restart backend and run:

```bash
node check-supabase-tables.js
```

This will show which tables exist and how many rows each has.
