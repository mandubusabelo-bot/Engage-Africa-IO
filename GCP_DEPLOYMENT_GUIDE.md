# Google Cloud Platform Deployment Guide

## Overview
Google Cloud Platform (GCP) provides better support for browser automation like WhatsApp Web.js compared to Railway. This guide will help you deploy your Engage Africa IO application with full WhatsApp functionality.

## Why GCP for WhatsApp Web.js?

### Advantages over Railway:
- **Full Browser Support**: GCP VMs support complete Chrome/Puppeteer functionality
- **Persistent Storage**: Better session management for WhatsApp
- **Custom Configuration**: Full control over system dependencies
- **Scalability**: Easy to upgrade resources as needed
- **Cost Effective**: Pay-as-you-go pricing with free tier

## Deployment Options

### Option 1: Compute Engine VM (Recommended)
Best for WhatsApp Web.js functionality

### Option 2: Cloud Run
Container-based deployment (requires Docker)

### Option 3: Google Kubernetes Engine (GKE)
For advanced scaling needs

---

## Option 1: Compute Engine VM Setup

### 1. Create GCP Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "engage-africa-io"
3. Enable billing (required for VM creation)

### 2. Enable Required APIs
```bash
gcloud services enable compute.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable run.googleapis.com
```

### 3. Create VM Instance
```bash
# Create VM with sufficient resources for WhatsApp
gcloud compute instances create engage-africa-vm \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=ubuntu-2004-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=50GB \
    --tags=http-server,https-server
```

### 4. Configure Firewall Rules
```bash
# Allow HTTP and HTTPS traffic
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server

gcloud compute firewall-rules create allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags https-server

# Allow custom port for your app
gcloud compute firewall-rules create allow-app \
    --allow tcp:3001 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server
```

### 5. Connect to VM and Setup Environment
```bash
# SSH into the VM
gcloud compute ssh engage-africa-vm --zone=us-central1-a

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (latest LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chrome for WhatsApp Web.js
sudo apt-get install -y google-chrome-stable
sudo apt-get install -y chromium-browser

# Install other dependencies
sudo apt-get install -y build-essential git nginx certbot python3-certbot-nginx

# Clone your repository
git clone https://github.com/mandubusabelo-bot/Engage-Africa-IO.git
cd Engage-Africa-IO/backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your actual values
nano .env
```

### 6. Setup Environment Variables
```bash
# Edit .env file
nano .env
```

Add your configuration:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# AI API Keys
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key

# Authentication
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-domain.com

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./whatsapp-sessions

# Logging
LOG_LEVEL=info
```

### 7. Build and Run Application
```bash
# Build the application
npm run build

# Test the application
npm start

# Setup as a service (run in background)
sudo npm install -g pm2
pm2 start dist/index.js --name "engage-africa"
pm2 startup
pm2 save
```

### 8. Setup Nginx Reverse Proxy
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/engage-africa
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/engage-africa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

## Option 2: Cloud Run with Docker

### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

# Install Chrome for WhatsApp
RUN apk add --no-cache chromium \
    && npm install -g pm2

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["pm2-runtime", "start", "dist/index.js"]
```

### 2. Build and Deploy
```bash
# Build the image
gcloud builds submit --tag gcr.io/PROJECT-ID/engage-africa

# Deploy to Cloud Run
gcloud run deploy engage-africa \
    --image gcr.io/PROJECT-ID/engage-africa \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1
```

---

## WhatsApp Web.js Specific Configuration

### VM Chrome Setup
```bash
# Install Chrome with proper dependencies
sudo apt-get install -y \
    google-chrome-stable \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2
```

### WhatsApp Service Configuration
Update your WhatsApp service for GCP:
```typescript
// In whatsapp.ts
this.client = new Client({
  authStrategy: new LocalAuth({ 
    clientId: `user_${userId}`,
    dataPath: '/app/whatsapp-sessions' // Persistent path
  }),
  puppeteer: {
    headless: 'new',
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});
```

---

## Monitoring and Maintenance

### 1. Setup Monitoring
```bash
# Install monitoring tools
sudo npm install -g @pm2/io
pm2 install @pm2/io

# View logs
pm2 logs
pm2 monit
```

### 2. Auto-restart Configuration
```bash
# PM2 will automatically restart crashed apps
# Configure auto-restart on system boot
pm2 startup
pm2 save
```

### 3. Backup WhatsApp Sessions
```bash
# Create backup script
sudo nano /usr/local/bin/backup-whatsapp.sh
```

```bash
#!/bin/bash
tar -czf /backup/whatsapp-sessions-$(date +%Y%m%d).tar.gz /app/whatsapp-sessions/
find /backup -name "whatsapp-sessions-*" -mtime +7 -delete
```

```bash
# Make executable and setup cron
sudo chmod +x /usr/local/bin/backup-whatsapp.sh
echo "0 2 * * * /usr/local/bin/backup-whatsapp.sh" | sudo crontab -
```

---

## Cost Optimization

### Free Tier Usage
- **e2-micro VM**: Free (with sustained use discount)
- **Storage**: 30GB free persistent disk
- **Network**: 1GB free egress per month

### Estimated Monthly Costs
- **e2-medium VM**: ~$25-30/month
- **Additional storage**: ~$0.10/GB-month
- **Network egress**: ~$0.12/GB after free tier

---

## Migration Steps

### From Railway to GCP
1. **Export Data**: Export Supabase data if needed
2. **Update Environment Variables**: Configure GCP-specific settings
3. **DNS Update**: Point domain to GCP VM IP
4. **Test WhatsApp**: Verify WhatsApp Web.js functionality
5. **Cut Over**: Switch traffic from Railway to GCP

### Rollback Plan
- Keep Railway deployment active during migration
- Use DNS to switch back if issues occur
- Monitor both deployments during transition

---

## Troubleshooting

### WhatsApp Issues
```bash
# Check Chrome installation
google-chrome --version

# Test Puppeteer
node -e "const puppeteer = require('puppeteer'); puppeteer.launch().then(browser => console.log('Chrome works')).catch(e => console.error(e))"

# Check WhatsApp logs
pm2 logs engage-africa | grep whatsapp
```

### Common Issues
- **Chrome not found**: Install Chrome or specify executable path
- **Permission denied**: Check file permissions for session directory
- **Memory issues**: Upgrade VM to larger instance type
- **Network blocked**: Check firewall rules

---

## Next Steps

1. **Choose Deployment Option**: VM (recommended) or Cloud Run
2. **Setup GCP Project**: Create project and enable APIs
3. **Deploy Application**: Follow the chosen option's steps
4. **Configure WhatsApp**: Test WhatsApp Web.js functionality
5. **Setup Monitoring**: Configure logging and alerts
6. **Point Domain**: Update DNS to GCP deployment

This setup will give you full WhatsApp Web.js functionality with better reliability than Railway.
