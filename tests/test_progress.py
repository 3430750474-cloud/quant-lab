"""SQLite progress semantics."""

from __future__ import annotations

from quantlab.progress.db import ProgressStore


def test_quiz_threshold_and_retake(tmp_path):
    store = ProgressStore(tmp_path / "progress.db")
    store.initialize()
    store.record_quiz_attempt(
        "l1-01", "level-1", quiz_percent=50.0, passed=False, concepts=["股票"]
    )
    row = store.get_lesson_progress("l1-01")
    assert row["status"] == "attempted"
    assert row["best_score"] == 50.0
    assert store.list_mastered_concepts() == []

    store.record_quiz_attempt(
        "l1-01", "level-1", quiz_percent=80.0, passed=True, concepts=["股票", "股东"]
    )
    row = store.get_lesson_progress("l1-01")
    assert row["status"] == "passed"
    assert row["best_score"] == 80.0
    assert row["attempts"] == 2
    concepts = [item["concept"] for item in store.list_mastered_concepts()]
    assert concepts == ["股票", "股东"]

    store.record_quiz_attempt(
        "l1-01", "level-1", quiz_percent=40.0, passed=False, concepts=["股票"]
    )
    row = store.get_lesson_progress("l1-01")
    assert row["status"] == "passed"
    assert row["best_score"] == 80.0
    assert len(store.list_mastered_concepts()) == 2


def test_course_counts(tmp_path):
    store = ProgressStore(tmp_path / "progress.db")
    store.initialize()
    assert store.course_counts("level-1", ["l1-01", "l1-02"]) == {
        "total": 2,
        "completed": 0,
    }
    store.record_quiz_attempt("l1-01", "level-1", 70.0, True, ["股票"])
    assert store.course_counts("level-1", ["l1-01", "l1-02"]) == {
        "total": 2,
        "completed": 1,
    }
