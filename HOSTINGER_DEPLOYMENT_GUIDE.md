# MHTSdigiXR Deployment Guide for Hostinger

## Complete Step-by-Step Instructions for mhtsdigixr.com

---

## IMPORTANT: Hosting Type Required

Your MHTSdigiXR website is a **full-stack Node.js application** with:
- React frontend
- Express.js backend
- PostgreSQL database
- OpenAI API integration

**You need Hostinger VPS Hosting** (not shared hosting) because:
1. Shared hosting doesn't support Node.js backends
2. You need to run a persistent Node.js server
3. Database connections require server-side execution
4. AI API calls need server environment

---

## Step 1: Purchase Hostinger VPS Hosting

1. Go to [Hostinger VPS](https://www.hostinger.com/vps-hosting)
2. Choose a plan (recommended: **KVM 2** or higher)
   - Minimum: 2 GB RAM, 2 CPU cores
   - Recommended: 4 GB RAM, 2 CPU cores
3. Select **Ubuntu 22.04** as Operating System
4. Complete purchase

---

## Step 2: Connect Your Domain (mhtsdigixr.com)

### If domain is registered on Hostinger:
1. Log in to Hostinger hPanel
2. Go to **Domains** → **mhtsdigixr.com**
3. Click **DNS / Nameservers**
4. Add A Record:
   - Type: `A`
   - Name: `@`
   - Points to: `[Your VPS IP Address]`
   - TTL: `14400`
5. Add another A Record for www:
   - Type: `A`
   - Name: `www`
   - Points to: `[Your VPS IP Address]`

### If domain is registered elsewhere:
1. Log in to your domain registrar
2. Update nameservers to point to your VPS IP
3. Or add A records pointing to VPS IP

---

## Step 3: Access Your VPS

1. In Hostinger hPanel, go to **VPS** section
2. Note your VPS details:
   - IP Address
   - Root password
3. Connect via SSH:
   ```bash
   ssh root@YOUR_VPS_IP
   ```
4. Enter root password when prompted

---

## Step 4: Setup VPS Server Environment

Run these commands on your VPS:

### 4.1 Update System
```bash
apt update && apt upgrade -y
```

### 4.2 Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```

### 4.3 Verify Installation
```bash
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### 4.4 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 4.5 Install Nginx (Web Server)
```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

### 4.6 Install PostgreSQL
```bash
apt install postgresql postgresql-contrib -y
systemctl start postgresql
systemctl enable postgresql
```

---

## Step 5: Setup PostgreSQL Database

### 5.1 Create Database and User
```bash
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE mhtsdigix;
CREATE USER mhtsuser WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE mhtsdigix TO mhtsuser;
\c mhtsdigix
GRANT ALL ON SCHEMA public TO mhtsuser;
\q
```

### 5.2 Note Your Database URL
```
DATABASE_URL=postgresql://mhtsuser:YOUR_SECURE_PASSWORD@localhost:5432/mhtsdigix
```

---

## Step 6: Build Your Application (On Replit)

Before deploying, build your application on Replit:

### 6.1 Open Replit Shell and run:
```bash
npm run build
```

### 6.2 Files to Download
After build, download these folders/files:
- `dist/` folder (built application)
- `package.json`
- `package-lock.json`
- `drizzle.config.ts`
- `shared/` folder
- `server/` folder (for migrations)

---

## Step 7: Upload Files to VPS

### 7.1 Create Application Directory
```bash
mkdir -p /var/www/mhtsdigix
cd /var/www/mhtsdigix
```

### 7.2 Upload Files
Use SFTP client (FileZilla, WinSCP) or SCP:
```bash
# From your local machine
scp -r dist/* root@YOUR_VPS_IP:/var/www/mhtsdigix/
scp package.json root@YOUR_VPS_IP:/var/www/mhtsdigix/
scp package-lock.json root@YOUR_VPS_IP:/var/www/mhtsdigix/
scp -r shared root@YOUR_VPS_IP:/var/www/mhtsdigix/
```

### 7.3 Install Dependencies on VPS
```bash
cd /var/www/mhtsdigix
npm install --production
```

---

## Step 8: Configure Environment Variables

### 8.1 Create Environment File
```bash
nano /var/www/mhtsdigix/.env
```

### 8.2 Add These Variables
```env
# Database
DATABASE_URL=postgresql://mhtsuser:YOUR_SECURE_PASSWORD@localhost:5432/mhtsdigix

# Session
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters

# OpenAI API (for Kayal chatbot)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Server
NODE_ENV=production
PORT=5000
```

### 8.3 Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Copy the key and paste in .env file

---

## Step 9: Run Database Migrations

```bash
cd /var/www/mhtsdigix
npm run db:push
```

---

## Step 10: Update Server Code for Production

### 10.1 Modify AI Integration Path
In your server code, update the OpenAI configuration to use standard API:

Create/update `server/openai-config.ts`:
```typescript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

---

## Step 11: Start Application with PM2

### 11.1 Start the Application
```bash
cd /var/www/mhtsdigix
pm2 start dist/index.js --name mhtsdigix
```

### 11.2 Save PM2 Configuration
```bash
pm2 save
pm2 startup
```

### 11.3 Verify Application Running
```bash
pm2 status
pm2 logs mhtsdigix
```

---

## Step 12: Configure Nginx Reverse Proxy

### 12.1 Create Nginx Configuration
```bash
nano /etc/nginx/sites-available/mhtsdigixr.com
```

### 12.2 Add This Configuration
```nginx
server {
    listen 80;
    server_name mhtsdigixr.com www.mhtsdigixr.com;

    location / {
        proxy_pass http://localhost:5000;
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

### 12.3 Enable the Site
```bash
ln -s /etc/nginx/sites-available/mhtsdigixr.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## Step 13: Install SSL Certificate (HTTPS)

### 13.1 Install Certbot
```bash
apt install certbot python3-certbot-nginx -y
```

### 13.2 Get SSL Certificate
```bash
certbot --nginx -d mhtsdigixr.com -d www.mhtsdigixr.com
```

### 13.3 Follow Prompts
- Enter email address
- Agree to terms
- Choose redirect option (recommended: Yes)

### 13.4 Auto-Renewal
```bash
certbot renew --dry-run
```

---

## Step 14: Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## Step 15: Verify Deployment

### 15.1 Check Website
Open browser and visit:
- https://mhtsdigixr.com
- https://www.mhtsdigixr.com

### 15.2 Test All Features
- [ ] Homepage loads correctly
- [ ] All pages navigate properly
- [ ] Contact form works
- [ ] Kayal chatbot responds
- [ ] All service pages display
- [ ] FAQ section works
- [ ] Careers page shows jobs

---

## Troubleshooting

### If website doesn't load:
```bash
# Check if app is running
pm2 status

# View app logs
pm2 logs mhtsdigix --lines 100

# Check nginx status
systemctl status nginx

# View nginx error logs
tail -f /var/log/nginx/error.log
```

### If database errors:
```bash
# Check PostgreSQL status
systemctl status postgresql

# Test database connection
psql -U mhtsuser -d mhtsdigix -h localhost
```

### If AI chatbot doesn't work:
1. Verify OPENAI_API_KEY in .env file
2. Check API key has credits on OpenAI
3. View logs: `pm2 logs mhtsdigix`

### Restart Services:
```bash
# Restart app
pm2 restart mhtsdigix

# Restart nginx
systemctl restart nginx

# Restart database
systemctl restart postgresql
```

---

## Maintenance Commands

### Update Application
```bash
cd /var/www/mhtsdigix
# Upload new files via SFTP
npm install --production
pm2 restart mhtsdigix
```

### View Logs
```bash
pm2 logs mhtsdigix
```

### Monitor Resources
```bash
pm2 monit
```

### Backup Database
```bash
pg_dump -U mhtsuser -d mhtsdigix > backup_$(date +%Y%m%d).sql
```

---

## Cost Summary

| Item | Monthly Cost |
|------|-------------|
| Hostinger VPS (KVM 2) | ~$8-12 |
| Domain (mhtsdigixr.com) | ~$10/year |
| OpenAI API | Pay per use (~$5-20) |
| SSL Certificate | FREE (Let's Encrypt) |

---

## Alternative: Easier Deployment with Replit

If VPS setup seems complex, you can also deploy directly from Replit:

1. Click **Deploy** button in Replit
2. Choose **Reserved VM** deployment
3. Configure custom domain (mhtsdigixr.com)
4. Add domain DNS records as instructed
5. Everything (database, AI) works automatically

**Advantage:** No server management needed, automatic SSL, built-in database.

---

## Support Contacts

- **Hostinger Support:** support.hostinger.com
- **OpenAI Support:** help.openai.com
- **Let's Encrypt:** letsencrypt.org/docs

---

**Document Version:** 1.0
**Last Updated:** February 2026
