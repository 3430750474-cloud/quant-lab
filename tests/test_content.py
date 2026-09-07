"""Curriculum content validation."""

from __future__ import annotations

import re

from quantlab.courses.models import Lesson, to_public_lesson


def test_level_counts_and_status(repository):
    courses = repository.list_courses()
    assert [c.level for c in courses] == list(range(1, 10))
    by_id = {c.id: c for c in courses}
    assert by_id["level-1"].status == "published"
    assert by_id["level-2"].status == "published"
    assert len(repository.get_course("level-1").lessons) == 10
    assert len(repository.get_course("level-2").lessons) == 10
    for level in range(3, 10):
        course = by_id[f"level-{level}"]
        assert course.status == "planned"
        assert course.planned_topics


def test_published_lesson_has_complete_teaching_shape(repository):
    published_ids = [
        meta.id for meta in repository.list_courses() if meta.status == "published"
    ]
    seen_question_ids = set()
    for course_id in published_ids:
        course = repository.get_course(course_id)
        assert [lesson.order for lesson in course.lessons] == list(
            range(1, len(course.lessons) + 1)
        )
        for lesson in course.lessons:
            assert lesson.simple_explanation
            assert lesson.definition
            assert lesson.analogy
            assert lesson.example
            assert lesson.algorithm_steps
            assert lesson.python_example.code
            assert lesson.python_example.explanation
            assert lesson.interactive_exercises
            assert lesson.quiz
            assert lesson.common_mistakes
            assert lesson.concepts
            assert lesson.formulas
            for formula in lesson.formulas:
                assert formula.display
                assert formula.variables
                for variable in formula.variables:
                    assert variable.symbol and variable.meaning
            all_questions = lesson.interactive_exercises + lesson.quiz
            for question in all_questions:
                assert re.match(r"^[a-z0-9-]+-[eq][0-9]+$", question.id), question.id
                assert question.question
                assert question.explanation
                assert question.id not in seen_question_ids
                seen_question_ids.add(question.id)


def test_public_lesson_strips_answers(repository):
    lesson = repository.get_lesson("level-1", "l1-01")
    public = to_public_lesson(lesson)
    blob = str(public)
    assert "answer" not in blob
    assert "tolerance" not in blob
    assert public["id"] == "l1-01"


def test_lesson_identity_consistent(repository):
    lesson: Lesson = repository.get_lesson("level-1", "l1-01")
    assert lesson.course_id == "level-1"
    assert lesson.id == "l1-01"
