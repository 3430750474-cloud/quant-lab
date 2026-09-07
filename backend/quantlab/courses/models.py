"""Pydantic models for course content.

Answer fields belong to this model only for authoring and validation; the API
layer must strip them before returning content to the browser.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class FormulaVariable(BaseModel):
    symbol: str
    meaning: str
    unit: str = ""


class Formula(BaseModel):
    display: str
    variables: list[FormulaVariable] = Field(default_factory=list)


class PythonExample(BaseModel):
    code: str | list[str]
    explanation: str
    output: str = ""

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code_lines(cls, value):
        if isinstance(value, list):
            return "\n".join(value)
        return value


class CommonMistake(BaseModel):
    title: str
    why: str
    avoid: str


class Question(BaseModel):
    id: str
    type: Literal["choice", "numeric"]
    question: str
    options: list[str] | None = None
    answer: str | int | float
    tolerance: float = 0.0
    explanation: str

    @model_validator(mode="after")
    def validate_question_shape(self) -> "Question":
        if self.type == "choice":
            if not self.options or len(self.options) < 2:
                raise ValueError(f"choice question {self.id} needs at least 2 options")
            if not isinstance(self.answer, int) or not 0 <= self.answer < len(self.options):
                raise ValueError(f"choice question {self.id} answer must be a valid option index")
        elif not isinstance(self.answer, (int, float)):
            raise ValueError(f"numeric question {self.id} answer must be a number")
        return self


class Lesson(BaseModel):
    id: str
    course_id: str
    order: int
    title: str
    concepts: list[str]
    simple_explanation: str
    definition: str
    analogy: str
    example: str
    formulas: list[Formula]
    algorithm_steps: list[str]
    python_example: PythonExample
    interactive_exercises: list[Question]
    quiz: list[Question]
    common_mistakes: list[CommonMistake]


class CourseMeta(BaseModel):
    id: str
    title: str
    short_title: str = ""
    level: int
    status: Literal["published", "planned"]
    description: str
    prerequisites: list[str] = Field(default_factory=list)
    planned_topics: list[str] = Field(default_factory=list)


class CourseBundle(BaseModel):
    meta: CourseMeta
    lessons: list[Lesson] = Field(default_factory=list)


QUESTION_SECRET_FIELDS = {"answer", "tolerance"}


def to_public_lesson(lesson: Lesson) -> dict:
    data = lesson.model_dump()
    data["interactive_exercises"] = [
        {k: v for k, v in q.items() if k not in QUESTION_SECRET_FIELDS}
        for q in data["interactive_exercises"]
    ]
    data["quiz"] = [
        {k: v for k, v in q.items() if k not in QUESTION_SECRET_FIELDS}
        for q in data["quiz"]
    ]
    return data
