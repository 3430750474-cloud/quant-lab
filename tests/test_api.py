"""API behavior for M1."""

from __future__ import annotations

import json

from quantlab.courses.loader import CourseRepository


def test_health(api_client):
    response = api_client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_course_list_and_progress_overview(api_client):
    response = api_client.get("/api/courses")
    assert response.status_code == 200
    courses = response.json()["courses"]
    assert len(courses) == 9
    published = [course for course in courses if course["status"] == "published"]
    assert [course["level"] for course in published] == [1, 2]
    assert all(course["lesson_count"] == 10 for course in published)

    progress = api_client.get("/api/progress").json()
    assert progress["course_completion"]["total_lessons"] == 20
    assert progress["experiments"] == {"status": "planned", "completed": 0, "total": 0}


def test_course_detail_has_lesson_shell(api_client):
    response = api_client.get("/api/courses/level-1")
    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["status"] == "published"
    assert len(payload["lessons"]) == 10


def test_lesson_endpoint_does_not_leak_answers(api_client, repository):
    response = api_client.get("/api/courses/level-1/lessons/l1-01")
    assert response.status_code == 200
    payload = response.json()
    assert '"answer"' not in json.dumps(payload, ensure_ascii=False)
    assert payload["lesson"]["quiz"]


def _wrong_answers(lesson):
    answers = {}
    for question in lesson.quiz:
        if question.type == "choice":
            answers[question.id] = (question.answer + 1) % len(question.options)
        else:
            answers[question.id] = float(question.answer) + 10.0
    return answers


def _right_answers(lesson):
    return {question.id: question.answer for question in lesson.quiz}


def test_submission_failure_then_pass_updates_progress(api_client, repository):
    lesson = repository.get_lesson("level-1", "l1-01")
    url = "/api/courses/level-1/lessons/l1-01/submissions"
    wrong = api_client.post(
        url,
        json={"exercise_answers": {}, "quiz_answers": _wrong_answers(lesson)},
    ).json()
    assert wrong["passed"] is False
    assert wrong["quiz_score"] < 60

    right = api_client.post(
        url,
        json={"exercise_answers": {}, "quiz_answers": _right_answers(lesson)},
    ).json()
    assert right["passed"] is True
    assert right["quiz_score"] == 100.0
    assert set(right["new_concepts"]) == set(lesson.concepts)

    progress = api_client.get("/api/progress").json()
    assert progress["course_completion"]["completed_lessons"] == 1
    assert set(progress["mastered_concepts"]) == set(lesson.concepts)

    detail = api_client.get("/api/courses/level-1").json()
    first = detail["lessons"][0]
    assert first["status"] == "passed"
    assert first["best_score"] == 100.0
