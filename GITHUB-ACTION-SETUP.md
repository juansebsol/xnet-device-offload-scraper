# 🔧 GitHub Action Integration Setup

## 🎯 **What This Does:**

Your `/api/trigger-scrape` endpoint now triggers a GitHub Action instead of trying to scrape directly in Vercel. This solves the Playwright browser issues and gives you better scraping capabilities.

## 🔑 **Required Environment Variables:**

### **In Vercel (API Environment):**
```bash
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPOSITORY=your-username/xnet-device-offload-scraper
```

### **In GitHub (Repository Secrets):**
```bash
OKTA_START_URL=your_okta_url
OKTA_EMAIL=your_email
OKTA_PASSWORD=your_password
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🚀 **How to Set Up:**

### **1. Create GitHub Personal Access Token (Minimal Permissions):**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Give it a name like "Vercel API Action Trigger - XNET Device Scrape"
4. **Select ONLY these scopes:**
   - ✅ `repo:status` (read commit status)
   - ✅ `public_repo` (access public repositories)
   - ✅ `workflow` (trigger workflows)
5. **DON'T select:**
   - ❌ `repo` (full repository access - too broad!)
   - ❌ `delete_repo` (dangerous!)
   - ❌ `admin:org` (organization access)
6. Copy the token

### **2. Add to Vercel Environment:**
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add:
   - `GITHUB_TOKEN` = your GitHub token
   - `GITHUB_REPOSITORY` = your repository name (e.g., `username/xnet-device-offload-scraper`)

### **3. Verify GitHub Workflow:**
Your workflow `device-offload-scraper.yml` already has the `repository_dispatch` trigger:
```yaml
repository_dispatch:
  types: [device-offload-scrape]
```

## 🔄 **How It Works Now:**

1. **User calls** `/api/trigger-scrape` with NAS ID
2. **API triggers** GitHub Action via `repository_dispatch`
3. **GitHub Action runs** your scraper with full browser support
4. **Scraper updates** Supabase database
5. **User can check** progress in GitHub Actions tab

## 🧪 **Testing:**

1. **Set up environment variables** in Vercel
2. **Use the UI**: `utils/trigger-scrape-ui.html`
3. **Check GitHub Actions** tab for progress
4. **Verify data** in Supabase via your existing API endpoints

## 🎉 **You're All Set!**

Your API is now a lightweight trigger, and GitHub Actions handle the heavy scraping work with full browser support!
