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

**Option A – Deploy from this folder (easiest)**

1. Push your project to GitHub (if you haven’t already).
2. Go to [vercel.com](https://vercel.com) and sign in (GitHub is fine).
3. Click **Add New… → Project** and import your GitHub repo.
4. Set **Root Directory** to `web` (click Edit, enter `web`, confirm).
5. Leave **Build Command** as `npm run build` and **Output Directory** as `dist` (the `web/vercel.json` already sets these).
6. Click **Deploy**. When it finishes, use the generated URL (e.g. `your-project.vercel.app`).

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
