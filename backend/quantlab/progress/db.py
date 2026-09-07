"""SQLite persistence for single-user learning progress."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class ProgressStore:
    def __init__(self, db_path: Path):
        self.db_path = db_path

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def initialize(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS lesson_progress (
                    lesson_id TEXT PRIMARY KEY,
                    course_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    best_score REAL NOT NULL DEFAULT 0,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    first_passed_at TEXT,
                    last_attempt_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS mastered_concepts (
                    concept TEXT NOT NULL,
                    lesson_id TEXT NOT NULL,
                    mastered_at TEXT NOT NULL,
                    PRIMARY KEY (concept, lesson_id)
                )
                """
            )

    def record_quiz_attempt(
        self,
        lesson_id: str,
        course_id: str,
        quiz_percent: float,
        passed: bool,
        concepts: list[str],
    ) -> None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM lesson_progress WHERE lesson_id = ?",
                (lesson_id,),
            ).fetchone()
            now = utc_now_iso()
            previous_best = float(row["best_score"]) if row else 0.0
            best = max(previous_best, quiz_percent)
            attempts = int(row["attempts"]) + 1 if row else 1
            status = "passed" if passed else "attempted"
            first_passed = row["first_passed_at"] if row else None
            if passed and first_passed is None:
                first_passed = now
            connection.execute(
                """
                INSERT INTO lesson_progress (
                    lesson_id, course_id, status, best_score, attempts,
                    first_passed_at, last_attempt_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(lesson_id) DO UPDATE SET
                    course_id = excluded.course_id,
                    status = CASE
                        WHEN excluded.status = 'passed' OR lesson_progress.status = 'passed'
                        THEN 'passed'
                        ELSE excluded.status
                    END,
                    best_score = excluded.best_score,
                    attempts = excluded.attempts,
                    first_passed_at = COALESCE(lesson_progress.first_passed_at, excluded.first_passed_at),
                    last_attempt_at = excluded.last_attempt_at
                """,
                (lesson_id, course_id, status, best, attempts, first_passed, now),
            )
            if passed:
                connection.executemany(
                    """
                    INSERT OR IGNORE INTO mastered_concepts (concept, lesson_id, mastered_at)
                    VALUES (?, ?, ?)
                    """,
                    [(concept, lesson_id, now) for concept in concepts],
                )

    def get_lesson_progress(self, lesson_id: str) -> dict | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM lesson_progress WHERE lesson_id = ?",
                (lesson_id,),
            ).fetchone()
            return dict(row) if row else None

    def get_all_lesson_progress(self) -> dict[str, dict]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM lesson_progress").fetchall()
            return {row["lesson_id"]: dict(row) for row in rows}

    def course_counts(self, course_id: str, lesson_ids: list[str]) -> dict:
        with self._connect() as connection:
            completed = 0
            for lesson_id in lesson_ids:
                row = connection.execute(
                    "SELECT status FROM lesson_progress WHERE lesson_id = ? AND status = 'passed'",
                    (lesson_id,),
                ).fetchone()
                if row:
                    completed += 1
        return {"total": len(lesson_ids), "completed": completed}

    def list_mastered_concepts(self) -> list[dict]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT concept, lesson_id, mastered_at FROM mastered_concepts ORDER BY mastered_at"
            ).fetchall()
            return [dict(row) for row in rows]
