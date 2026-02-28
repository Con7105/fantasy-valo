# Fantasy Valorant Web App

Browser version of the Fantasy Valorant app. Events, match list, fantasy roster, and settings. No Bracket/pickems.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173 (or the URL Vite prints).

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host.

## Deploy on Vercel

**Important:** You must set **Root Directory** to `web`. The app’s API proxy lives in `web/api/` and is only deployed when the project root is `web`. If you use the repo root, you’ll get **Server error (HTTP 404)** and no events (e.g. Masters Santiago) will load.

**Option A – Deploy from this folder (easiest)**

1. Push your project to GitHub (if you haven’t already).
2. Go to [vercel.com](https://vercel.com) and sign in (GitHub is fine).
3. Click **Add New… → Project** and import your GitHub repo.
4. Set **Root Directory** to `web`: Project Settings → General → **Root Directory** → Edit → enter `web` → Save.
5. Leave **Build Command** as `npm run build` and **Output Directory** as `dist` (the `web/vercel.json` already sets these).
6. Click **Deploy**. When it finishes, use the generated URL (e.g. `your-project.vercel.app`).

**If you already deployed and see "Server error (HTTP 404)" or "No events":**
1. Ensure **Root Directory** is `web` (Settings → General).
2. Ensure `vercel.json` in `web` includes the **rewrites** entry so `/api/*` is not rewritten to the SPA (see `web/vercel.json`). Then redeploy.

**Option B – Deploy with Vercel CLI**

1. Install and log in: `npm i -g vercel` then `vercel login`.
2. From the repo root: `cd web && vercel` (follow prompts; first time it will link a new project).
3. For production: `cd web && vercel --prod`.

Share the deployed URL with friends; no auth. If the VLR API is blocked by CORS in the browser, add a small serverless proxy that forwards to `https://vlrggapi.vercel.app`.

## Deploy on Netlify

Import the repo, set **Base directory** to `web`, **Build command** to `npm run build`, **Publish directory** to `web/dist`.

## Data

- Selected event and API base URL are stored in **localStorage** (per device/browser).
- Fantasy roster is stored per event in localStorage.
