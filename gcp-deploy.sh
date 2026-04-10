#!/bin/bash

# GCP Deployment Script for Engage Africa IO
# This script automates the deployment to Google Cloud Platform

set -e

# Configuration
PROJECT_ID="engage-africa-io"
ZONE="us-central1-a"
VM_NAME="engage-africa-vm"
DOMAIN="your-domain.com"  # Replace with your actual domain

echo "=== Engage Africa IO GCP Deployment ==="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "gcloud CLI not found. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable compute.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable run.googleapis.com

# Create VM instance
echo "Creating VM instance..."
gcloud compute instances create $VM_NAME \
    --zone=$ZONE \
    --machine-type=e2-medium \
    --image-family=ubuntu-2004-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=50GB \
    --tags=http-server,https-server \
    --metadata=startup-script='#!/bin/bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chrome for WhatsApp
sudo apt-get update
sudo apt-get install -y google-chrome-stable chromium-browser
sudo apt-get install -y build-essential git nginx certbot python3-certbot-nginx

# Install PM2
sudo npm install -g pm2

# Clone repository
cd /opt
sudo git clone https://github.com/mandubusabelo-bot/Engage-Africa-IO.git
sudo chown -R $USER:$USER /opt/Engage-Africa-IO
cd /opt/Engage-Africa-IO/backend

# Install dependencies
npm install

# Create environment file template
cp .env.example .env
echo "Please edit /opt/Engage-Africa-IO/backend/.env with your configuration"

# Build application
npm run build

# Start with PM2
pm2 start dist/index.js --name "engage-africa"
pm2 startup
pm2 save
'

# Wait for VM to be ready
echo "Waiting for VM to be ready..."
sleep 30

# Create firewall rules
echo "Creating firewall rules..."
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server \
    --description "Allow HTTP traffic"

gcloud compute firewall-rules create allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags https-server \
    --description "Allow HTTPS traffic"

gcloud compute firewall-rules create allow-app \
    --allow tcp:3001 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server \
    --description "Allow application traffic"

# Get VM external IP
VM_IP=$(gcloud compute instances describe $VM_NAME \
    --zone=$ZONE \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "VM created with external IP: $VM_IP"

# Setup Nginx configuration
echo "Setting up Nginx configuration..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command='
sudo tee /etc/nginx/sites-available/engage-africa > /dev/null <<EOF
server {
    listen 80;
    server_name '$DOMAIN';

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/engage-africa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
'

echo "=== Deployment Complete ==="
echo "VM IP: $VM_IP"
echo "Next steps:"
echo "1. SSH into the VM: gcloud compute ssh $VM_NAME --zone=$ZONE"
echo "2. Edit environment file: nano /opt/Engage-Africa-IO/backend/.env"
echo "3. Restart the app: pm2 restart engage-africa"
echo "4. Setup SSL: sudo certbot --nginx -d $DOMAIN"
echo "5. Update your domain DNS to point to: $VM_IP"
