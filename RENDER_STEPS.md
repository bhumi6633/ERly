# Exact steps: Deploy ERly API on Render

Do these in order. Your repo must already be on GitHub (with `render.yaml` and the `backend/` folder in the repo).

---

## 1. Open Render and start a Blueprint

1. Go to **https://dashboard.render.com** and log in (or sign up with GitHub).
2. Click **New +** (top right).
3. Click **Blueprint**.

---

## 2. Connect the repo

1. Under **Connect a repository**, click **Connect account** (or pick the account that has your repo).
2. Find **HackCanada2026** (or whatever your repo is named) and click **Connect** next to it.
3. Render will detect `render.yaml`. You should see something like:
   - **erly-db** (PostgreSQL)
   - **erly-api** (Web Service)
4. Leave **Branch** as `main` (or the branch you want to deploy).
5. Click **Apply**.

---

## 3. Wait for the first deploy

1. Render will create **erly-db** first, then **erly-api**.
2. On **erly-api**, it will **Build** then **Start**. Wait until status is **Live** (green). The first build can take a few minutes.
3. **Seed the database once** (tables exist but are empty; Shell is not available on free tier):
   - **erly-api** → **Environment** → **Add Environment Variable**
   - **Key:** `SEED_SECRET`  
   - **Value:** any random string (e.g. `my-secret-seed-123`)
   - Save (wait for redeploy).
   - In your browser open: **https://erly-api.onrender.com/seed?secret=my-secret-seed-123** (use the same value you set).
   - You should see `{"status":"ok","message":"Seed completed. Check /locations/"}`. Then **https://erly-api.onrender.com/locations/** will list all care locations.

---

## 4. Get your API URL

1. In the dashboard, click the **erly-api** service (not the database).
2. At the top you’ll see the service URL, e.g. **https://erly-api.onrender.com**.
3. Copy that URL — this is your **API base URL** for the frontend.
4. Quick check: open **https://erly-api.onrender.com/health** in a browser. You should see: `{"status":"ok","service":"ERly API"}`.

---

## 5. Set CORS so the frontend can call the API

1. Stay on the **erly-api** service.
2. In the left sidebar, click **Environment**.
3. Click **Add Environment Variable**.
4. **Key:** `FRONTEND_ORIGIN`  
   **Value:** your frontend URL, no trailing slash, e.g.:
   - `https://hack-canada-2026.vercel.app`  
   - or `https://your-app.vercel.app`
5. Click **Save Changes**. Render will redeploy once; wait until it’s **Live** again.

---

## 6. (Optional) Use the database from your machine

1. In the dashboard, click **erly-db** (the PostgreSQL service).
2. Open the **Info** or **Connect** tab.
3. Copy **External Database URL** (or **Connection string**).
4. Use that URL in any SQL client (TablePlus, DBeaver, `psql`, etc.) to connect and run queries. Keep this URL secret.

---

## Summary

| What | Where |
|------|--------|
| **Live API** | **https://erly-api.onrender.com** |
| API base URL | **erly-api** → top of page |
| Health check | https://erly-api.onrender.com/health |
| Interactive docs | https://erly-api.onrender.com/docs |
| Set frontend URL for CORS | **erly-api** → **Environment** → `FRONTEND_ORIGIN` |
| DB connection string | **erly-db** → **Info** / **Connect** → External Database URL |

---

## Reseed the production database (optional)

To wipe and refill (e.g. after changing `seed.py`), open in browser:

**https://erly-api.onrender.com/seed?secret=YOUR_SEED_SECRET&reset=true**

(Use the same `SEED_SECRET` you set in Environment.)
