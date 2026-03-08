# ERly — HackCanada 2026

Canadian emergency healthcare routing: describe symptoms → AI triage → nearby facilities with wait times.

---

## Running the app locally (frontend + backend)

Follow these steps once per machine (or after cloning).

### 1. Prerequisites

- **Node.js** 18+ and **npm** (or pnpm/yarn)
- **Python** 3.10+
-  **Auth0** account for login; **Mapbox** account for map; **Eleven Labs** for voice

---

### 2. Backend

```bash
cd backend
```

Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (copy from below or from your team). **Minimum for basic run:**

```env
# Optional: leave unset to use SQLite (default). Set for Postgres (e.g. production).
# DATABASE_URL=postgresql://user:pass@host/dbname

# Voice (STT + TTS) — get key at https://elevenlabs.io
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# AI triage (Backboard) — optional; without it some triage features may be limited
# BACKBOARD_API_KEY=your_key
# BACKBOARD_ASSISTANT_ID=your_assistant_id

# Optional: image analysis for injury photos
# GEMINI_API_KEY=your_gemini_key
```

**Optional: seed the database** (Toronto-area locations + wait time data):

```bash
python seed.py
# or wipe and reseed:
python seed.py --reset
```

Start the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be at **http://localhost:8000** (docs: http://localhost:8000/docs).

---

### 3. Frontend

Open a **new terminal** and leave the backend running in the first.

```bash
cd frontend
npm install
```

Create a `.env.local` (or `.env`) in `frontend/`:

```env
# Required: backend URL when running locally
NEXT_PUBLIC_API_URL=http://localhost:8000

# Required for map and directions
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token

# Optional: Supabase (if you use it for data)
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Auth0 for login (app works without; login button may be hidden)
# NEXT_PUBLIC_AUTH0_DOMAIN=your_tenant.auth0.com
# NEXT_PUBLIC_AUTH0_CLIENT_ID=your_client_id
```

Start the dev server:

```bash
npm run dev
```

Frontend will be at **http://localhost:3000**.

---

### 4. Use the app

1. Open **http://localhost:3000** in your browser.
2. Go to the map (e.g. “Find care” or `/map`).
3. Describe symptoms (text or voice if `ELEVENLABS_API_KEY` is set).
4. Get triage + nearby facilities; use “Listen to summary” for TTS if Eleven Labs is configured.

---

## Env reference

| Where    | Variable                      | Required for local | Notes                                      |
|----------|-------------------------------|--------------------|--------------------------------------------|
| Backend  | `DATABASE_URL`                | No                 | Omit = SQLite in `./hackcanada.db`         |
| Backend  | `ELEVENLABS_API_KEY`         | For voice          | STT (symptoms by voice). Free tier can be disabled (VPN/abuse detection); paid plan avoids this. |
| Backend  | `BACKBOARD_API_KEY`          | For full triage    | AI triage engine                           |
| Backend  | `BACKBOARD_ASSISTANT_ID`     | With Backboard     |                                            |
| Backend  | `GEMINI_API_KEY`             | No                 | Image analysis for injury photos           |
| Frontend | `NEXT_PUBLIC_API_URL`        | Yes                | `http://localhost:8000` for local backend  |
| Frontend | `NEXT_PUBLIC_MAPBOX_TOKEN`   | Yes for map        | Mapbox public token                        |
| Frontend | `NEXT_PUBLIC_AUTH0_*`        | No                 | Login; app runs without                    |

**Why does ElevenLabs say “Unusual activity / Free Tier disabled”?**  
Their systems can block free-tier usage when they detect VPN/proxy, shared IPs (e.g. campus or office), or usage patterns they flag. It’s not a bug in this app. You can still use the app by **typing** your symptoms. To use voice again you’d need a paid ElevenLabs plan or a different network/account.

---

## One-time setup summary

```bash
# Terminal 1 — backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Add backend/.env (at least ELEVENLABS_API_KEY for voice)
python seed.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — frontend
cd frontend
npm install
# Add frontend/.env with NEXT_PUBLIC_API_URL=http://localhost:8000 and NEXT_PUBLIC_MAPBOX_TOKEN
npm run dev
```

Then open **http://localhost:3000**.
