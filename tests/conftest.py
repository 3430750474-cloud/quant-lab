"""Shared pytest fixtures."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from quantlab.config import CONTENT_DIR  # noqa: E402
from quantlab.courses.loader import CourseRepository  # noqa: E402


@pytest.fixture(scope="session")
def repository() -> CourseRepository:
    return CourseRepository(CONTENT_DIR)


@pytest.fixture()
def api_client(tmp_path, monkeypatch):
    db_path = tmp_path / "quantlab-test.db"
    monkeypatch.setattr("quantlab.api.routes.get_db_path", lambda: db_path)
    from fastapi.testclient import TestClient
    from quantlab.api.main import app

    return TestClient(app)
