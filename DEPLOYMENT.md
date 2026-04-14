# Engage Africa IO - Deployment Guide

## 🚀 Railway Deployment

This guide will help you deploy your unified Engage Africa IO application to Railway.

### Prerequisites

- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- Supabase project (already configured)

### Step 1: Prepare Your Supabase Database

1. Go to your Supabase project: https://gjizhfacvjklggxfrxxc.supabase.co
2. Navigate to **SQL Editor**
3. Run the schema file located at `database/supabase-schema.sql`
4. Follow the instructions in `database/SETUP.md` for storage bucket setup

### Step 2: Push to GitHub

```bash
cd engage-africa-unified

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Unified Engage Africa IO v3.0"

# Add your GitHub repository
git remote add origin https://github.com/mandubusabelo-bot/Engage-Africa-IO.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Railway

#### Option A: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link baa48aee-e1b1-45ac-b828-978b92bcf4ac

# Deploy
railway up
```

#### Option B: Using Railway Dashboard

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click on your existing project or create new one
3. Click "New" → "GitHub Repo"
4. Select `mandubusabelo-bot/Engage-Africa-IO`
5. Railway will automatically detect Next.js and deploy

### Step 4: Configure Environment Variables

In Railway dashboard, go to your service → **Variables** and add:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gjizhfacvjklggxfrxxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaXpoZmFjdmprbGdneGZyeHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjQ3NDIsImV4cCI6MjA5MTc0MDc0Mn0.ggfzB7r8ZTRILW5b87yxcm3894GJ-mCWtNwEA_AXMrg
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaXpoZmFjdmprbGdneGZyeHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE2NDc0MiwiZXhwIjoyMDkxNzQwNzQyfQ.8DTqai2mHyAVS57StnJVXqYVE_tJ99QUreBO2Je9_L8

# AI Configuration
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=openai/gpt-3.5-turbo
GEMINI_API_KEY=AIzaSyA7smjd3T6mVoWDWqkLqM3X30YMspf2CH8

# Authentication
JWT_SECRET=FQLwy/jiEFuUxrTIU3chrnKYFIgeWPIigCEuXmXbkJXXHBNFUpTf2LlHBJyH1eD9urTPE9O9KTZWdSRigDh1OA==
JWT_EXPIRES_IN=7d

# WhatsApp (Optional - configure later)
WHATSAPP_SESSION_PATH=./whatsapp-sessions
WHATSAPP_QR_TIMEOUT_MS=300000
WHATSAPP_HEADLESS=true

# Production Settings
NODE_ENV=production
LOG_LEVEL=info
```

### Step 5: Verify Deployment

1. Railway will provide you with a URL (e.g., `https://your-app.up.railway.app`)
2. Visit the URL to verify the deployment
3. Check `/api/health` endpoint for health status
4. Try logging in with your Supabase credentials

### Railway Service IDs

Your existing Railway services:
- **Main Service**: `baa48aee-e1b1-45ac-b828-978b92bcf4ac`
- **Secondary Service**: `40b690ba-a64d-45d1-b0ef-b5f262d6727c`

## 🔧 Local Development

### Installation

```bash
cd engage-africa-unified
npm install
```

### Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📝 Post-Deployment Checklist

- [ ] Database schema deployed to Supabase
- [ ] Storage bucket created and configured
- [ ] Environment variables set in Railway
- [ ] Application deployed and accessible
- [ ] Health endpoint responding
- [ ] Login/Register working
- [ ] Dashboard accessible

## 🐛 Troubleshooting

### Build Fails

- Check that all environment variables are set
- Verify Node.js version (>=18.0.0)
- Check build logs in Railway dashboard

### Database Connection Issues

- Verify Supabase URL and keys
- Check RLS policies are configured
- Ensure database schema is deployed

### Application Not Loading

- Check Railway logs for errors
- Verify environment variables
- Check health endpoint: `/api/health`

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

## 🎉 Success!

Your unified Engage Africa IO platform is now deployed and ready to use!

Next steps:
1. Create your first AI agent
2. Configure WhatsApp integration
3. Upload knowledge base documents
4. Start engaging with customers
