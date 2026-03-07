import os
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.engine import Engine

# Local dev: SQLite. Production (e.g. Render): set DATABASE_URL to Postgres.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./hackcanada.db")

# Render and some hosts use postgres://; SQLAlchemy 2 prefers postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Render Postgres requires SSL; add if not already in URL (only for non-local URLs)
_is_sqlite = "sqlite" in DATABASE_URL
if not _is_sqlite and "sslmode" not in DATABASE_URL and ("render.com" in DATABASE_URL or "onrender.com" in DATABASE_URL):
    DATABASE_URL += "?sslmode=require" if "?" not in DATABASE_URL else "&sslmode=require"


def _get_connect_args():
    if _is_sqlite:
        return {"check_same_thread": False}
    return {}


# SQLite-only: enable WAL and foreign keys
@event.listens_for(Engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record):
    if not _is_sqlite:
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


engine = create_engine(DATABASE_URL, connect_args=_get_connect_args())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
