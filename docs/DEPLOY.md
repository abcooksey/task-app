# Deployment Guide

## Prerequisites

- Node.js 18+
- A Supabase project
- A Vercel account (or Netlify)

## 1. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

You should see "Success. No rows returned." confirming the tables were created.

## 2. Configure Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from: Supabase Dashboard → Settings → API

## 3. Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173

## 4. Deploy to Vercel

### Option A: Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option B: Via Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click Deploy

## 5. Configure Supabase Auth

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to your Vercel deployment URL (e.g., `https://homestead.vercel.app`)
3. Add the same URL to **Redirect URLs**

## 6. (Optional) Custom Domain

1. In Vercel, go to your project → Settings → Domains
2. Add your custom domain
3. Update Supabase Auth URLs to match

## Troubleshooting

### "Missing Supabase environment variables"

Make sure your `.env` file exists and contains valid values. In Vercel, check that environment variables are set in the project settings.

### Auth not working / redirect issues

1. Check that your Vercel URL is in Supabase Auth → Redirect URLs
2. Make sure Site URL matches exactly (including https://)

### Tables not found

Run the migration SQL in Supabase SQL Editor. Check for any error messages.
