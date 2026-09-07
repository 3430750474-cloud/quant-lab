"""Runtime paths and environment configuration."""

from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = PROJECT_ROOT / "data" / "courses"
DEFAULT_DB_PATH = PROJECT_ROOT / "backend" / "runtime" / "quantlab.db"


def get_db_path() -> Path:
    override = os.environ.get("QUANTLAB_DB_PATH")
    if override:
        return Path(override).expanduser().resolve()
    return DEFAULT_DB_PATH
