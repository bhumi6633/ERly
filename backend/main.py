import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import engine, Base
from routers import locations, triage, routing
from routers.care_options import router as care_options_router
from routers import locations, triage, routing, speech_to_text
import models  # noqa: F401 — ensures all models are registered before create_all
import wait_times.models  # noqa: F401 — registers wait time tables before create_all
from wait_times.router import router as wait_times_router

# Create all tables on startup
Base.metadata.create_all(bind=engine)

# CORS: add production frontend URL via env (e.g. https://erly.vercel.app)
_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if os.getenv("FRONTEND_ORIGIN"):
    _origins.append(os.getenv("FRONTEND_ORIGIN").rstrip("/"))

app = FastAPI(
    title="ERly API",
    description="Healthcare triage routing backend for ERly (HackCanada 2026)",
    version="0.1.0",
)


@app.exception_handler(Exception)
def catch_all(request: Request, exc: Exception):
    """Return actual error in body so we can debug 500s."""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc),
            "type": type(exc).__name__,
            "path": str(request.url.path),
        },
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(locations.router)
app.include_router(triage.router)
app.include_router(routing.router)
app.include_router(speech_to_text.router)
app.include_router(wait_times_router)
app.include_router(care_options_router)


@app.get("/")
def root():
    return {
        "service": "ERly API",
        "docs": "/docs",
        "health": "/health",
        "locations": "/locations/",
        "wait_times": "/wait-times/",
        "seed": "/seed?secret=YOUR_SEED_SECRET (set SEED_SECRET in env first)",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "ERly API"}


@app.get("/health/db")
def health_db():
    """Check that the API can reach the database. Returns 200 if DB is up."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected", "detail": str(e)},
        )


@app.get("/seed")
@app.post("/seed")
def run_seed(secret: str = "", reset: bool = False):
    """
    One-time seed for free tier (no Shell). Set SEED_SECRET in Render Environment,
    then open in browser: /seed?secret=YOUR_SECRET  (add &reset=true to wipe and reseed).
    """
    from fastapi.responses import JSONResponse
    expected = os.getenv("SEED_SECRET")
    if not expected:
        return JSONResponse(
            status_code=403,
            content={
                "error": "SEED_SECRET not set",
                "hint": "In Render: erly-api → Environment → Add SEED_SECRET (any string), then call /seed?secret=that_value",
            },
        )
    if not secret or secret != expected:
        return JSONResponse(status_code=403, content={"error": "Invalid or missing secret"})
    try:
        from seed import seed as run_seed_script
        run_seed_script(reset=reset)
        return {"status": "ok", "message": "Seed completed. Check /locations/", "reset": reset}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Seed failed", "detail": str(e)})
