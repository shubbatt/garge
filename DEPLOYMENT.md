# Ramboo Engineering - DigitalOcean Deployment Guide

## Prerequisites

1. **DigitalOcean Account** - Sign up at [digitalocean.com](https://digitalocean.com)
2. **GitHub Repository** - Push your code to GitHub
3. **doctl CLI** (optional) - For command-line deployments

---

## Method 1: Deploy via DigitalOcean Dashboard (Recommended)

### Step 1: Push Code to GitHub

```bash
cd /Volumes/Backup/Development/ramboo
git init
git add .
git commit -m "Initial commit - Ramboo Engineering GWMS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ramboo.git
git push -u origin main
```

### Step 2: Create App on DigitalOcean

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click **Create App**
3. Select **GitHub** as source
4. Authorize DigitalOcean to access your repository
5. Select the `ramboo` repository and `main` branch
6. DigitalOcean will auto-detect the `.do/app.yaml` configuration

### Step 3: Configure Environment Variables

Add these environment variables in the App settings:

| Variable | Value | Component |
|----------|-------|-----------|
| `JWT_SECRET` | (generate a strong random string) | api |
| `NODE_ENV` | `production` | api |

**Generate a secure JWT secret:**
```bash
openssl rand -hex 32
```

### Step 4: Deploy

1. Review the configuration
2. Click **Create Resources**
3. Wait for build and deployment (5-10 minutes)

### Step 5: Initialize Database

After first deployment, you need to seed the database:

1. Go to your App in DigitalOcean dashboard
2. Click on the `api` component
3. Go to **Console** tab
4. Run: `npm run db:seed`

---

## Method 2: Deploy via doctl CLI

### Install doctl

```bash
# macOS
brew install doctl

# Authenticate
doctl auth init
```

### Deploy

```bash
cd /Volumes/Backup/Development/ramboo
doctl apps create --spec .do/app.yaml
```

---

## Post-Deployment

### Access Your App

After deployment, you'll get URLs like:
- **Frontend**: `https://ramboo-frontend-xxxxx.ondigitalocean.app`
- **API**: `https://ramboo-api-xxxxx.ondigitalocean.app/api`

### Default Login Credentials

- **Email**: admin@ramboo.com
- **Password**: admin123

> ⚠️ **Important**: Change the admin password immediately after first login!

---

## Estimated Costs

| Resource | Size | Monthly Cost |
|----------|------|--------------|
| API (Backend) | basic-xxs | ~$5 |
| Frontend (Static) | - | Free |
| PostgreSQL Database | db-s-dev-database | ~$7 |
| **Total** | | **~$12/month** |

---

## Troubleshooting

### Build Fails
- Check build logs in DigitalOcean dashboard
- Ensure all dependencies are in `package.json`
- Verify Dockerfile syntax

### Database Connection Issues
- Ensure `DATABASE_URL` is correctly set
- Check if database is running (green status)
- Verify Prisma migrations ran successfully

### CORS Errors
- Update `CORS_ORIGIN` in API environment variables
- Set it to your frontend URL

### View Logs
```bash
doctl apps logs <app-id> --component api
```

---

## Updating the App

Push to GitHub and DigitalOcean will automatically redeploy:

```bash
git add .
git commit -m "Your changes"
git push
```

---

## Custom Domain Setup

1. Go to App Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate is automatically provisioned

---

## Local Development with PostgreSQL

If you want to test with PostgreSQL locally before deploying:

```bash
# Run PostgreSQL with Docker
docker run --name ramboo-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ramboo -p 5432:5432 -d postgres:16

# Update .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ramboo?schema=public"

# Run migrations
cd backend
npx prisma migrate dev

# Seed the database
npm run db:seed
```
