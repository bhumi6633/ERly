import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import locations, triage, routing
import models  # noqa: F401 — ensures all models are registered before create_all

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


@app.get("/health")
def health():
    return {"status": "ok", "service": "ERly API"}
