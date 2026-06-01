# Flipp Studios — Netlify Deployment Guide

## Prerequisites

- A [GitHub](https://github.com) account
- A [Netlify](https://netlify.com) account (free tier works)
- All 16 environment variables ready (see `.env.example`)

---

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Name it (e.g., `flipp-studios`)
3. Keep it **Private** (recommended) or **Public**
4. Click **Create repository**

## Step 2: Upload EXPORT Contents

```bash
# In your terminal, navigate to the EXPORT folder
cd EXPORT

# Initialize git and push
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/flipp-studios.git
git branch -M main
git push -u origin main
```

Or upload manually via GitHub's web interface by dragging the files.

> **Do not upload** `node_modules/`, `.next/`, `.env`, or `.env.local`.

## Step 3: Connect Repository to Netlify

1. Log in to [Netlify](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** as your Git provider
4. Authorize Netlify to access your repositories
5. Select the repository you created
6. Netlify auto-detects **Next.js** settings

## Step 4: Configure Environment Variables

Netlify will auto-detect the build settings from `netlify.toml`.  
Before deploying, add all environment variables:

1. In Netlify dashboard, go to **Site settings** → **Environment variables**
2. Click **Add a variable**
3. Add each variable from `.env.example`:

| Variable | Example Value |
|----------|--------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_SENDER_ID` | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123:web:abc` |
| `FIREBASE_PROJECT_ID` | Same as public one |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `NEXT_PUBLIC_VODAFONE_CASH_NUMBER` | `01000000000` |
| `NEXT_PUBLIC_VODAFONE_CASH_HOLDER` | `Flipp Studios` |
| `NEXT_PUBLIC_DISCORD_INVITE` | `https://discord.gg/your-invite` |

> ⚠️ `FIREBASE_PRIVATE_KEY` must include the literal `\n` characters (not actual newlines). Netlify's UI handles this if you paste the full key with line breaks. For the API, use double-escaped `\\n`.

## Step 5: Deploy

1. Click **Deploy**
2. Wait for the build (~2–3 minutes)
3. Netlify assigns a random URL like `random-name-123456.netlify.app`
4. Click the URL to verify

### Set Custom Domain (Optional)

1. In Netlify dashboard: **Domain settings** → **Add custom domain**
2. Enter your domain (e.g., `flippstudios.com`)
3. Update your DNS: add a CNAME record pointing to `random-name-123456.netlify.app`
4. Wait for DNS propagation (5–30 minutes)

## Step 6: Verify the Build

Confirm these pages load correctly:

- `/` — Homepage with product listings
- `/products` — All products page
- `/products/1` — Individual product page
- `/auth/login` — Login page
- `/auth/register` — Registration page
- `/about` — About page
- `/contact` — Contact page
- `/dashboard` — User dashboard (requires login)
- `/admin` — Admin panel (requires admin login)
- Any `/api/*` route (should return JSON or 401 for unauthenticated)

## Post-Deployment Checklist

- [ ] Homepage loads without errors
- [ ] Product pages render correctly
- [ ] Authentication (login/register) works
- [ ] Admin pages accessible for admin users
- [ ] API routes return proper responses
- [ ] Custom domain (if set) redirects correctly
- [ ] SSL certificate active (auto-provisioned by Netlify)
- [ ] No console errors in browser DevTools

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Blank white page | Missing env vars | Check Netlify environment variables |
| API returns 500 | Firebase Admin not configured | Check `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` |
| Images not loading | Missing Supabase credentials | Check `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Auth not working | Wrong Firebase config | Check all `NEXT_PUBLIC_FIREBASE_*` vars match Firebase console |
| Build fails | Missing dependency | Run `npm install` locally to verify deps |
| "Invalid token" | Expired session | Log out and log back in |

---

**Need help?** Check the [Netlify Next.js docs](https://docs.netlify.com/integrations/frameworks/next-js/) or open an issue on your GitHub repository.
