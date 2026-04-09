# Backend Connection Guide

## Current Status

### ✅ What's Working
- Backend server running on port 3001
- Frontend server running on port 5173
- All API routes configured
- Database service with Supabase support
- WhatsApp service with QR code generation
- Product scraping service ready

### ⚠️ What Needs Configuration

#### 1. Supabase Database Setup Required

**Steps to Connect:**

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Wait for provisioning

2. **Run Database Schema**
   - Open SQL Editor in Supabase
   - Copy contents of `supabase-schema.sql`
   - Execute the SQL to create all tables

3. **Get Credentials**
   - Go to Project Settings > API
   - Copy:
     - Project URL
     - anon/public key
     - service_role key

4. **Update Backend .env**
   ```env
   SUPABASE_URL=your_project_url_here
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_KEY=your_service_role_key_here
   ```

5. **Restart Backend**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

#### 2. Frontend API Connection

**Update Frontend .env:**
```env
VITE_API_URL=http://localhost:3001/api
```

**Then update frontend code to use API:**

The frontend currently uses mock data. To connect to backend:

1. Create `frontend/src/services/api.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getToken = () => localStorage.getItem('token');

export const api = {
  // Agents
  async getAgents() {
    const res = await fetch(`${API_URL}/agents`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  },
  
  async createAgent(data: any) {
    const res = await fetch(`${API_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  
  async updateAgent(id: string, data: any) {
    const res = await fetch(`${API_URL}/agents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  
  async deleteAgent(id: string) {
    const res = await fetch(`${API_URL}/agents/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  },
  
  // Similar methods for flows, templates, messages, etc.
};
```

2. Update pages to use the API service instead of local state

#### 3. WhatsApp QR Code Connection

**Backend is ready!** Just need to:

1. Add WhatsApp connection page in Settings
2. Call `/api/whatsapp/initialize` endpoint
3. Display QR code from response
4. Show connection status

**Example Frontend Code:**
```typescript
const connectWhatsApp = async () => {
  const response = await fetch('http://localhost:3001/api/whatsapp/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const { data } = await response.json();
  setQrCode(data.qrCode); // Display this as <img src={qrCode} />
};
```

#### 4. Product Scraping from Ntandokazi

**Configure in backend/.env:**
```env
NTANDOKAZI_URL=https://your-ntandokazi-site.com
```

**Run scraper:**
```bash
cd backend
node -e "import('./src/services/scraper.js').then(m => m.scraperService.scrapeProducts())"
```

**Or set up automatic scraping** (add to backend/src/index.ts):
```typescript
import { scraperService } from './services/scraper.js';

// Scrape products every 24 hours
setInterval(async () => {
  await scraperService.scrapeProducts();
}, 24 * 60 * 60 * 1000);
```

#### 5. Railway Deployment

**Environment Variables to Set in Railway:**
```
NODE_ENV=production
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
GEMINI_API_KEY=your_gemini_key
JWT_SECRET=your_production_jwt_secret
CORS_ORIGIN=https://your-frontend-url.com
NTANDOKAZI_URL=https://your-ntandokazi-site.com
```

**Deploy:**
```bash
git add .
git commit -m "Production ready with backend connections"
git push origin main
```

Railway will auto-deploy from your GitHub repository.

## Testing Backend Connections

### Test Agent CRUD
```bash
# Create agent
curl -X POST http://localhost:3001/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Agent","description":"Test","personality":"professional","language":"english"}'

# Get agents
curl http://localhost:3001/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update agent
curl -X PUT http://localhost:3001/api/agents/AGENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'

# Delete agent
curl -X DELETE http://localhost:3001/api/agents/AGENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test WhatsApp
```bash
# Initialize WhatsApp
curl -X POST http://localhost:3001/api/whatsapp/initialize \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check status
curl http://localhost:3001/api/whatsapp/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

1. ✅ Set up Supabase database (run schema SQL)
2. ✅ Add Supabase credentials to backend/.env
3. ⏳ Create frontend API service layer
4. ⏳ Connect frontend pages to backend APIs
5. ⏳ Add WhatsApp QR code UI in Settings
6. ⏳ Configure product scraping URL
7. ⏳ Test all CRUD operations
8. ⏳ Deploy to Railway

## Quick Start Checklist

- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Supabase credentials in backend/.env
- [ ] Backend restarted with new credentials
- [ ] Frontend API service created
- [ ] Frontend pages connected to backend
- [ ] WhatsApp QR code page added
- [ ] Product scraping configured
- [ ] All features tested locally
- [ ] Environment variables set in Railway
- [ ] Deployed to production
