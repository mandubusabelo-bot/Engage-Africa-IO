# Engage Africa IO

Production-grade AI-powered customer engagement platform for African businesses with ManyChat-style interface.

## Features

- 🤖 AI-Powered Chatbot with Google Gemini
- 💬 WhatsApp Business Integration
- 📊 Real-time Analytics Dashboard
- 👥 Multi-Agent Management
- 📚 Knowledge Base Management
- 🔐 Secure Authentication & Authorization
- 🎨 Modern ManyChat-style UI
- 📱 Responsive Design
- 🚀 Production-Ready Architecture

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast builds
- TailwindCSS for styling
- Shadcn/ui components
- React Query for data fetching
- React Router for navigation
- Recharts for analytics

### Backend
- Node.js with Express
- WhatsApp Web.js for WhatsApp integration
- Google Gemini AI for intelligent responses
- Supabase for database
- JWT authentication
- Rate limiting & security

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Run development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

See `backend/.env.example` for required environment variables.

## Deployment

This app is configured for Railway deployment with automatic builds.

## License

MIT
