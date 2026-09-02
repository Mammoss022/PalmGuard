"""Dev convenience: seed disease_classes into an already-migrated database.

Run after `alembic upgrade head`:
    python scripts/seed_data.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app.db.base  # noqa: E402,F401 — registers all models so relationships resolve
from app.db.seed import seed_disease_classes  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_disease_classes(db)
        print("Seeded disease_classes.")
    finally:
        db.close()
