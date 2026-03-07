# Deploying ERly API to Render

## One-click (Blueprint)

1. Push this repo to GitHub (ensure `render.yaml` and `backend/` are in the repo).
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect your GitHub repo and select the repo.
4. Render will read `render.yaml` and create:
   - **erly-db** — Free PostgreSQL database (connection string is private to your account).
   - **erly-api** — Web service that runs the FastAPI app and gets `DATABASE_URL` from the database.
5. Click **Apply**. Render builds and deploys. Tables are created on startup. Then **seed once** (free tier has no Shell): in **erly-api** → **Environment**, add `SEED_SECRET` (any string), save; then open **https://erly-api.onrender.com/seed?secret=YOUR_SEED_SECRET** in your browser.

Your API will be at `https://erly-api.onrender.com` (or the URL Render shows).

## After deploy

- **API base URL**: Use the URL Render gives you (e.g. `https://erly-api.onrender.com`) in your frontend.
- **CORS**: In the **erly-api** service → **Environment**, add:
  - `FRONTEND_ORIGIN` = `https://your-frontend.vercel.app` (or your frontend URL).
- **Database**: In the dashboard, open **erly-db** → **Info** to see connection string, database name, and to connect with any SQL client (e.g. TablePlus, DBeaver) if you need to inspect or query data.

## Reseeding production

If you want to wipe and reseed the production DB (e.g. after changing `seed.py`):

1. **Option A** — Render Shell: In **erly-api** → **Shell**, run:
   ```bash
   python seed.py --reset
   ```
2. **Option B** — From your machine (requires Render DB external URL): Copy the **External Database URL** from **erly-db** → **Info**, then:
   ```bash
   cd backend
   DATABASE_URL="postgresql://..." python seed.py --reset
   ```

## Local vs production

- **Local**: No `DATABASE_URL` (or `DATABASE_URL=sqlite:///./hackcanada.db`) → SQLite in `backend/hackcanada.db`.
- **Render**: `DATABASE_URL` is set automatically by the blueprint → PostgreSQL, persistent and queryable from the dashboard or any SQL client.
