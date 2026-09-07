"""HTTP routes for Quant Lab M1."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from quantlab.config import CONTENT_DIR, get_db_path
from quantlab.courses.loader import (
    CourseNotFoundError,
    CourseRepository,
    LessonNotFoundError,
)
from quantlab.courses.models import to_public_lesson
from quantlab.courses.scoring import grade_submission
from quantlab.progress.db import ProgressStore


router = APIRouter(prefix="/api")
repo = CourseRepository(CONTENT_DIR)


def get_store() -> ProgressStore:
    store = ProgressStore(get_db_path())
    store.initialize()
    return store


def _course_item(meta, store: ProgressStore) -> dict:
    if meta.status == "published":
        lessons = repo.get_course(meta.id).lessons
        counts = store.course_counts(meta.id, [lesson.id for lesson in lessons])
    else:
        counts = {"total": 0, "completed": 0}
    pct = round(counts["completed"] / counts["total"] * 100, 1) if counts["total"] else 0.0
    return {
        "id": meta.id,
        "title": meta.title,
        "short_title": meta.short_title or meta.title,
        "level": meta.level,
        "status": meta.status,
        "description": meta.description,
        "prerequisites": meta.prerequisites,
        "planned_topics": meta.planned_topics,
        "lesson_count": counts["total"],
        "completed_lessons": counts["completed"],
        "progress_percent": pct,
    }


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "project": "quant-lab", "milestone": "M1"}


@router.get("/courses")
def list_courses(store: ProgressStore = Depends(get_store)) -> dict:
    courses = [_course_item(meta, store) for meta in repo.list_courses()]
    return {"courses": courses}


@router.get("/courses/{course_id}")
def course_detail(course_id: str, store: ProgressStore = Depends(get_store)) -> dict:
    try:
        course = repo.get_course(course_id)
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=404, detail="课程不存在") from exc
    lesson_items = []
    for lesson in course.lessons:
        progress = store.get_lesson_progress(lesson.id) or {}
        lesson_items.append(
            {
                "id": lesson.id,
                "title": lesson.title,
                "order": lesson.order,
                "concepts": lesson.concepts,
                "quiz_count": len(lesson.quiz),
                "exercise_count": len(lesson.interactive_exercises),
                "status": progress.get("status", "not_started"),
                "best_score": progress.get("best_score", 0),
            }
        )
    return {
        "meta": course.meta.model_dump(),
        "lessons": lesson_items,
    }


@router.get("/courses/{course_id}/lessons/{lesson_id}")
def lesson_content(
    course_id: str,
    lesson_id: str,
    store: ProgressStore = Depends(get_store),
) -> dict:
    try:
        lesson = repo.get_lesson(course_id, lesson_id)
    except LessonNotFoundError as exc:
        raise HTTPException(status_code=404, detail="课程或课程内容不存在") from exc
    public = to_public_lesson(lesson)
    progress = store.get_lesson_progress(lesson_id)
    return {
        "lesson": public,
        "progress": progress,
    }


class SubmissionRequest(BaseModel):
    exercise_answers: dict[str, str | int | float | None] = Field(default_factory=dict)
    quiz_answers: dict[str, str | int | float | None] = Field(default_factory=dict)


@router.post("/courses/{course_id}/lessons/{lesson_id}/submissions")
def submit_lesson(
    course_id: str,
    lesson_id: str,
    payload: SubmissionRequest,
    store: ProgressStore = Depends(get_store),
) -> dict:
    try:
        lesson = repo.get_lesson(course_id, lesson_id)
    except LessonNotFoundError as exc:
        raise HTTPException(status_code=404, detail="课程或课程内容不存在") from exc
    grade = grade_submission(lesson, payload.exercise_answers, payload.quiz_answers)
    response = dict(grade)
    response["new_concepts"] = []
    if grade["quiz_score"] is not None:
        store.record_quiz_attempt(
            lesson_id=lesson.id,
            course_id=lesson.course_id,
            quiz_percent=grade["quiz_score"],
            passed=bool(grade["passed"]),
            concepts=lesson.concepts,
        )
        if grade["passed"]:
            response["new_concepts"] = lesson.concepts
    return response


@router.get("/progress")
def progress_overview(store: ProgressStore = Depends(get_store)) -> dict:
    metas = repo.list_courses()
    published = [meta for meta in metas if meta.status == "published"]
    all_progress = store.get_all_lesson_progress()
    mastered = store.list_mastered_concepts()
    attempted_scores = [
        row["best_score"]
        for row in all_progress.values()
        if row["attempts"] > 0
    ]
    completed_total = 0
    published_total = 0
    course_rows = []
    for meta in metas:
        item = _course_item(meta, store)
        course_rows.append(
            {
                "course_id": meta.id,
                "title": meta.title,
                "status": meta.status,
                "lesson_count": item["lesson_count"],
                "completed_lessons": item["completed_lessons"],
                "progress_percent": item["progress_percent"],
            }
        )
        completed_total += item["completed_lessons"]
        published_total += item["lesson_count"]
    return {
        "courses": course_rows,
        "course_completion": {
            "completed_lessons": completed_total,
            "total_lessons": published_total,
            "percent": round(completed_total / published_total * 100, 1)
            if published_total
            else 0.0,
        },
        "quiz_average": round(sum(attempted_scores) / len(attempted_scores), 1)
        if attempted_scores
        else None,
        "mastered_concepts": [row["concept"] for row in mastered],
        "experiments": {
            "status": "planned",
            "completed": 0,
            "total": 0,
        },
    }
