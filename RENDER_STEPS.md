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
2. On **erly-api**, it will:
   - **Build**: run `pip install -r requirements.txt` in the `backend/` folder.
   - **Pre-deploy**: run `python seed.py` (seeds the database).
   - **Start**: run `uvicorn main:app --host 0.0.0.0 --port $PORT`.
3. Wait until **erly-api** status is **Live** (green). The first build can take a few minutes.

---

## 4. Get your API URL

1. In the dashboard, click the **erly-api** service (not the database).
2. At the top you’ll see the service URL, e.g. **https://erly-api.onrender.com**.
3. Copy that URL — this is your **API base URL** for the frontend.
4. Quick check: open **https://your-erly-api-url.onrender.com/health** in a browser. You should see: `{"status":"ok","service":"ERly API"}`.

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
| API base URL | **erly-api** → top of page (e.g. `https://erly-api.onrender.com`) |
| Health check | `https://<your-erly-api-url>/health` |
| Set frontend URL for CORS | **erly-api** → **Environment** → `FRONTEND_ORIGIN` |
| DB connection string | **erly-db** → **Info** / **Connect** → External Database URL |

---

## Reseed the production database (optional)

If you want to wipe and refill the production DB (e.g. after changing `seed.py`):

1. **erly-api** → **Shell** tab.
2. Run: `python seed.py --reset`
3. Exit the shell. Data is reseeded.
