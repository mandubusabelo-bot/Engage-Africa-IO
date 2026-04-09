# Engage Africa IO - Complete Setup Guide

## 1. Supabase Database Setup

### Create Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Wait for the database to be provisioned
4. Go to SQL Editor
5. Run the `supabase-schema.sql` file to create all tables

### Get Supabase Credentials
1. Go to Project Settings > API
2. Copy the following:
   - Project URL (SUPABASE_URL)
   - anon/public key (SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_KEY) - for admin operations

## 2. Environment Variables Setup

### Backend (.env)
Create `backend/.env` with:

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# WhatsApp
WHATSAPP_SESSION_PATH=./whatsapp-sessions

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info

# Ntandokazi Product Scraping
NTANDOKAZI_URL=https://your-ntandokazi-site.com
```

### Frontend (.env)
Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:3001/api
```

## 3. WhatsApp Connection Setup

### Initialize WhatsApp
1. Start the backend server: `npm run dev`
2. Open the frontend: http://localhost:5173
3. Go to Settings > WhatsApp Connection
4. Click "Connect WhatsApp"
5. Scan the QR code with your phone's WhatsApp
6. Wait for "Connected" status

### WhatsApp Features
- Auto-reply to messages using AI
- Send messages to customers
- View conversation history
- Product recommendations from Ntandokazi catalog

## 4. Railway Deployment

### Prepare for Deployment
1. Ensure all environment variables are set in Railway
2. Add the following to Railway:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_KEY
   - GEMINI_API_KEY
   - JWT_SECRET
   - NODE_ENV=production

### Deploy
```bash
# Push to GitHub
git add .
git commit -m "Production ready"
git push origin main

# Railway will auto-deploy from GitHub
```

### Railway Configuration
The `railway.toml` and `nixpacks.toml` files are already configured for deployment.

## 5. Product Scraping Setup

### Configure Ntandokazi Integration
1. Set `NTANDOKAZI_URL` in backend/.env
2. The system will automatically scrape products every 24 hours
3. Products are stored in the `products` table
4. AI agents can access product information to help customers

### Manual Product Sync
```bash
# Run from backend directory
npm run sync-products
```

## 6. API Access for Other Apps

### API Endpoints
All endpoints are available at: `https://your-railway-url.railway.app/api`

### Authentication
```javascript
// Login to get token
const response = await fetch('https://your-app.railway.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'your@email.com', password: 'yourpassword' })
});
const { token } = await response.json();

// Use token for authenticated requests
const agents = await fetch('https://your-app.railway.app/api/agents', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Available Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent
- `GET /api/flows` - List flows
- `POST /api/flows` - Create flow
- `GET /api/messages` - List messages
- `POST /api/messages` - Send message
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/whatsapp/status` - WhatsApp status
- `POST /api/whatsapp/initialize` - Connect WhatsApp
- `POST /api/whatsapp/send` - Send WhatsApp message
- `GET /api/analytics` - Get analytics data

## 7. Testing

### Test Backend
```bash
cd backend
npm test
```

### Test WhatsApp Connection
```bash
node test-whatsapp.js
```

### Test Product Scraping
```bash
node test-scraping.js
```

## 8. Troubleshooting

### WhatsApp Not Connecting
- Check if port 3001 is not blocked
- Ensure WhatsApp Web is not open on another device
- Delete `whatsapp-sessions` folder and try again

### Database Connection Issues
- Verify Supabase credentials in .env
- Check if Supabase project is active
- Run the schema SQL again

### Railway Deployment Issues
- Check Railway logs for errors
- Ensure all environment variables are set
- Verify build command in railway.toml

## 9. Production Checklist

- [ ] Supabase database created and schema applied
- [ ] All environment variables set in Railway
- [ ] WhatsApp connected and tested
- [ ] Product scraping working
- [ ] SSL certificate configured
- [ ] Backup strategy in place
- [ ] Monitoring setup (Railway provides this)
- [ ] API rate limiting configured
- [ ] Error logging configured

## 10. Maintenance

### Daily
- Monitor WhatsApp connection status
- Check error logs

### Weekly
- Review analytics
- Update product catalog
- Check agent performance

### Monthly
- Database backup
- Security updates
- Performance optimization
