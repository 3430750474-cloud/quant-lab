"""Deterministic scoring for structured course questions."""

from __future__ import annotations

from .models import Lesson, Question


PASS_THRESHOLD = 60.0


def _as_number(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def grade_question(question: Question, submitted) -> dict:
    if question.type == "choice":
        correct = submitted == question.answer
    else:
        numeric_submitted = _as_number(submitted)
        numeric_answer = _as_number(question.answer)
        correct = (
            numeric_submitted is not None
            and numeric_answer is not None
            and abs(numeric_submitted - numeric_answer) <= question.tolerance
        )
    return {
        "question_id": question.id,
        "submitted": submitted,
        "correct": bool(correct),
        "explanation": question.explanation,
    }


def grade_questions(questions: list[Question], answers: dict) -> tuple[list[dict], float | None]:
    if not questions:
        return [], None
    results = [
        grade_question(question, answers.get(question.id))
        for question in questions
    ]
    score = round(sum(1 for r in results if r["correct"]) / len(results) * 100, 1)
    return results, score


def grade_submission(lesson: Lesson, exercise_answers: dict, quiz_answers: dict) -> dict:
    exercise_results, exercise_score = grade_questions(
        lesson.interactive_exercises, exercise_answers
    )
    quiz_results, quiz_score = grade_questions(lesson.quiz, quiz_answers)
    passed = quiz_score is not None and quiz_score >= PASS_THRESHOLD
    return {
        "exercise_results": exercise_results or None,
        "exercise_score": exercise_score,
        "quiz_results": quiz_results or None,
        "quiz_score": quiz_score,
        "passed": passed if quiz_score is not None else None,
    }
