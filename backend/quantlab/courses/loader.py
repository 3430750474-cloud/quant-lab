"""File-backed course loader with validation."""

from __future__ import annotations

import json
from pathlib import Path

from .models import CourseBundle, CourseMeta, Lesson


class CourseNotFoundError(LookupError):
    pass


class LessonNotFoundError(LookupError):
    pass


def _read_json(path: Path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


class CourseRepository:
    def __init__(self, content_dir: Path):
        self.content_dir = content_dir

    def list_course_ids(self) -> list[str]:
        if not self.content_dir.exists():
            return []
        return sorted(
            (p.name for p in self.content_dir.iterdir() if (p / "course.json").exists()),
            key=lambda cid: self.get_meta(cid).level,
        )

    def get_meta(self, course_id: str) -> CourseMeta:
        path = self.content_dir / course_id / "course.json"
        if not path.exists():
            raise CourseNotFoundError(course_id)
        return CourseMeta.model_validate(_read_json(path))

    def list_courses(self) -> list[CourseMeta]:
        return [self.get_meta(course_id) for course_id in self.list_course_ids()]

    def get_course(self, course_id: str) -> CourseBundle:
        meta = self.get_meta(course_id)
        if meta.status == "planned":
            return CourseBundle(meta=meta, lessons=[])
        lesson_dir = self.content_dir / course_id / "lessons"
        if not lesson_dir.exists():
            return CourseBundle(meta=meta, lessons=[])
        lessons = []
        for path in sorted(lesson_dir.glob("*.json"), key=lambda p: p.stem):
            data = _read_json(path)
            data["id"] = data.get("id", path.stem)
            data["course_id"] = course_id
            lesson = Lesson.model_validate(data)
            if lesson.course_id != course_id or lesson.id != path.stem:
                raise ValueError(
                    f"lesson file {path} id/course_id does not match its path"
                )
            lessons.append(lesson)
        lessons.sort(key=lambda lesson: lesson.order)
        return CourseBundle(meta=meta, lessons=lessons)

    def get_lesson(self, course_id: str, lesson_id: str) -> Lesson:
        meta = self.get_meta(course_id)
        if meta.status != "published":
            raise LessonNotFoundError(lesson_id)
        path = self.content_dir / course_id / "lessons" / f"{lesson_id}.json"
        if not path.exists():
            raise LessonNotFoundError(lesson_id)
        data = _read_json(path)
        data["id"] = lesson_id
        data["course_id"] = course_id
        lesson = Lesson.model_validate(data)
        if lesson.id != lesson_id or lesson.course_id != course_id:
            raise ValueError(f"lesson file {path} has inconsistent identity")
        return lesson


def question_answer_map(lesson: Lesson) -> dict[str, Question]:
    from .models import Question

    return {q.id: q for q in lesson.interactive_exercises + lesson.quiz}
