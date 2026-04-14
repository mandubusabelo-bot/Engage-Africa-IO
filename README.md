# Engage Africa IO - Unified Platform

Production-grade AI-powered customer engagement platform for African businesses, built with Next.js 14.

## 🚀 Features

- **Unified Architecture**: Single Next.js application with API routes and frontend
- **AI-Powered Agents**: Multi-model AI support (OpenRouter, Gemini)
- **WhatsApp Integration**: WhatsApp Web.js and Business API support
- **Knowledge Base**: Document upload and AI-powered responses
- **Flow Builder**: Visual workflow creation
- **Analytics Dashboard**: Real-time metrics and insights
- **Supabase Backend**: PostgreSQL database with real-time capabilities

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenRouter, Google Gemini
- **Deployment**: Railway
- **Authentication**: JWT + Supabase Auth

## 📦 Installation

```bash
npm install
```

## 🔧 Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

## 🏃 Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Build

```bash
npm run build
npm start
```

## 🚢 Railway Deployment

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Railway Service IDs
- Main Service: `baa48aee-e1b1-45ac-b828-978b92bcf4ac`
- Secondary: `40b690ba-a64d-45d1-b0ef-b5f262d6727c`

## 📝 License

MIT
