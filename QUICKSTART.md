# 🚀 Quick Start Guide

Get your Engage Africa IO platform up and running in minutes!

## Step 1: Install Dependencies

```bash
cd engage-africa-unified
npm install
```

This will install all required packages including Next.js, React, Supabase, and UI components.

## Step 2: Set Up Supabase Database

1. Open your Supabase project: https://gjizhfacvjklggxfrxxc.supabase.co
2. Go to **SQL Editor**
3. Copy the entire contents of `database/supabase-schema.sql`
4. Paste and execute in the SQL Editor
5. Verify tables were created successfully

## Step 3: Configure Environment Variables

The `.env.local` file is already configured with your Supabase credentials. Verify it contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://gjizhfacvjklggxfrxxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

## Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Create Your First Account

1. Click "Sign up" on the login page
2. Enter your details
3. You'll be redirected to login
4. Sign in with your credentials
5. Welcome to your dashboard!

## 🎯 What's Next?

### Create Your First AI Agent
- Navigate to the Agents page
- Click "Create Agent"
- Configure personality and instructions
- Upload knowledge base documents

### Connect WhatsApp
- Go to Settings → WhatsApp
- Scan QR code with WhatsApp
- Start receiving messages

### Build Automation Flows
- Visit the Flows page
- Create visual workflows
- Add triggers and actions
- Automate customer interactions

## 📁 Project Structure

```
engage-africa-unified/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard page
│   │   ├── login/        # Login page
│   │   └── register/     # Register page
│   ├── components/       # React components
│   └── lib/              # Utilities and configs
├── database/             # Database schemas
├── public/               # Static assets
└── package.json          # Dependencies
```

## 🔑 Key Features

- ✅ **Unified Architecture**: Single Next.js app (no separate frontend/backend)
- ✅ **Modern UI**: TailwindCSS + shadcn/ui components
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Real-time**: Supabase real-time subscriptions
- ✅ **AI-Powered**: OpenRouter + Gemini integration
- ✅ **Production-Ready**: Optimized for Railway deployment

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
npm run dev
```

### Database Connection Error
- Verify Supabase credentials in `.env.local`
- Check that database schema is deployed
- Ensure RLS policies are configured

### Build Errors
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

## 📚 Documentation

- [Full Deployment Guide](./DEPLOYMENT.md)
- [Database Setup](./database/SETUP.md)
- [Railway Configuration](./railway.toml)

## 🆘 Need Help?

- Check the troubleshooting section in `DEPLOYMENT.md`
- Review Supabase logs for database issues
- Check Railway logs for deployment issues

## 🎉 You're All Set!

Your unified Engage Africa IO platform is ready to transform customer engagement across Africa!
