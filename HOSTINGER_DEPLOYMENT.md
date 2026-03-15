# MHTSdigiXR — Step-by-Step Hostinger Deployment Guide

This guide takes you from downloading the code to having a live, SSL-secured website on Hostinger. No prior server experience required — every command is shown exactly as you need to type it.

---

## What You Need Before Starting

- A Hostinger account with a **VPS plan** (KVM 1 or higher recommended — the app needs Node.js and PostgreSQL)
- Your domain pointed to Hostinger (or bought from Hostinger)
- A Hostinger email account already created (e.g., `info@mhtsdigixr.com`) — see the SMTP setup guide
- The source code downloaded from Replit

> **Note:** Shared Hosting plans on Hostinger do NOT support Node.js apps. You need a VPS plan.

---

## Part 1 — Download the Source Code from Replit

1. Open your Replit project
2. Click the three-dot menu (⋯) at the top of the file list on the left
3. Click **Download as ZIP**
4. Save the ZIP file to your computer (e.g., `mhtsdigixr.zip`)

---

## Part 2 — Connect to Your Hostinger VPS via SSH

1. Log in to [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Go to **VPS** → select your server → **SSH Access**
3. Note your VPS IP address, username (`root`), and password
4. On your computer, open a terminal (Mac/Linux) or Command Prompt (Windows) and type:

```bash
ssh root@YOUR_VPS_IP_ADDRESS
```

5. Enter your password when asked. You are now inside your server.

---

## Part 3 — Install Node.js 20 and PostgreSQL

Copy and paste these commands one at a time:

```bash
# Update the server
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js is installed
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start PostgreSQL and enable it on boot
systemctl start postgresql
systemctl enable postgresql
```

---

## Part 4 — Create the Database

```bash
# Switch to the postgres user
sudo -u postgres psql

# Inside PostgreSQL, run these commands:
CREATE DATABASE mhtsdigixr;
CREATE USER mhtsuser WITH PASSWORD 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE mhtsdigixr TO mhtsuser;
\q
```

> Replace `YourStrongPassword123!` with a strong password of your choice. Remember it — you'll need it in the next step.

---

## Part 5 — Upload the Source Code

**Option A — Upload via SFTP (easiest)**

1. Download [FileZilla](https://filezilla-project.org/) (free) on your computer
2. Open FileZilla and connect:
   - Host: `sftp://YOUR_VPS_IP_ADDRESS`
   - Username: `root`
   - Password: your VPS password
   - Port: `22`
3. On the right side (VPS), navigate to `/var/www/`
4. On the left side (your computer), find the unzipped project folder
5. Drag the entire project folder to `/var/www/` on the right
6. The folder will appear as `/var/www/mhtsdigixr/`

**Option B — Upload via command line (if you know Git)**

If you pushed your code to GitHub:
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git mhtsdigixr
```

---

## Part 6 — Set Environment Variables

```bash
cd /var/www/mhtsdigixr

# Create the environment file
nano .env
```

Inside the editor, paste the following (replace the values with yours):

```
DATABASE_URL=postgresql://mhtsuser:YourStrongPassword123!@localhost:5432/mhtsdigixr
SESSION_SECRET=AnyLongRandomStringHere_MakeItUnique_AtLeast32Characters
NODE_ENV=production
```

Save and close: press `Ctrl+X`, then `Y`, then `Enter`

---

## Part 7 — Install Dependencies and Set Up the Database

```bash
cd /var/www/mhtsdigixr

# Install all npm packages
npm install

# Push the database schema (creates all tables)
npm run db:push

# The app will auto-seed default data on first start
```

---

## Part 8 — Build the Frontend

```bash
cd /var/www/mhtsdigixr

npm run build
```

This compiles the React frontend into optimised files. It may take 1-2 minutes.

---

## Part 9 — Install PM2 and Start the App

PM2 keeps your app running even if the server restarts.

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
cd /var/www/mhtsdigixr
pm2 start "node dist/server/index.js" --name mhtsdigixr

# Save PM2 so it restarts on server reboot
pm2 save
pm2 startup
```

Copy and run the command that `pm2 startup` prints (it starts with `sudo env PATH=...`).

**Check the app is running:**
```bash
pm2 status
pm2 logs mhtsdigixr
```

---

## Part 10 — Install Nginx as Reverse Proxy

Nginx sits in front of the app and handles web traffic on port 80 and 443.

```bash
# Install Nginx
apt install -y nginx

# Create a config file for your site
nano /etc/nginx/sites-available/mhtsdigixr
```

Paste this configuration (replace `mhtsdigixr.com` with your actual domain):

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

Save and close (Ctrl+X, Y, Enter), then:

```bash
# Enable the site
ln -s /etc/nginx/sites-available/mhtsdigixr /etc/nginx/sites-enabled/

# Test the config
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## Part 11 — Point Your Domain to the VPS

1. Log in to Hostinger and go to **Domains** → your domain → **DNS Zone**
2. Find the `A` record for `@` (root domain) and change its value to your VPS IP address
3. Add another `A` record for `www` pointing to the same VPS IP
4. Click Save. DNS changes can take up to 24 hours but usually update within 1 hour.

---

## Part 12 — Install Free SSL Certificate

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get the SSL certificate (replace with your domain)
certbot --nginx -d mhtsdigixr.com -d www.mhtsdigixr.com
```

Follow the prompts:
- Enter your email address
- Agree to terms (A)
- Choose whether to share email with EFF (your choice)
- Select option **2** to redirect HTTP to HTTPS automatically

Certbot will update your Nginx config automatically and enable SSL.

---

## Part 13 — Verify Everything Works

Open a browser and visit:
- `https://mhtsdigixr.com` — should show the website homepage
- `https://mhtsdigixr.com/accounting/login` — should show the login page

Log in with:
- **Username:** `superadmin`
- **Password:** `admin123`

> **Important:** Change the superadmin password immediately after first login.

---

## Part 14 — Configure Email (Hostinger Mail)

Once logged into the admin panel, go to **Settings → Email / SMTP Settings** and enter:

| Field | Value |
|---|---|
| SMTP Host | `smtp.hostinger.com` |
| Port | `465` |
| SSL/TLS | ON |
| Username | `info@mhtsdigixr.com` (your Hostinger email) |
| Password | Your Hostinger email password |
| Sender Name | `MHTSdigiXR` |
| Sender Email | `info@mhtsdigixr.com` |

Click **Save Email Settings**, then use **Send Test Email** to confirm it works.

---

## Useful Commands for Ongoing Maintenance

```bash
# View live app logs
pm2 logs mhtsdigixr

# Restart the app after changes
pm2 restart mhtsdigixr

# Update the code (if using Git)
cd /var/www/mhtsdigixr
git pull
npm install
npm run build
pm2 restart mhtsdigixr

# Renew SSL certificate (auto-renewed, but run manually if needed)
certbot renew

# Check Nginx status
systemctl status nginx

# Check PostgreSQL status
systemctl status postgresql
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| App not loading | Run `pm2 logs mhtsdigixr` to see error details |
| 502 Bad Gateway | App may have crashed — run `pm2 restart mhtsdigixr` |
| SSL not working | Run `certbot --nginx` again and check domain DNS |
| Database error | Check `DATABASE_URL` in `.env` — verify username/password/database name |
| Emails not sending | Verify SMTP settings in the admin Settings page, check port 465 is not blocked |
| Domain not loading | DNS may still be propagating — wait up to 24 hours |
