import assert from "node:assert/strict";
import worker from "./index.js";
import { COURSE_DATA } from "./course-data.js";

async function call(path, options) {
  const request = new Request(`https://example.test${path}`, options);
  return worker.fetch(request, {});
}

const health = await call("/api/health");
assert.equal(health.status, 200);
assert.equal((await health.json()).status, "ok");

const courses = await (await call("/api/courses")).json();
assert.equal(courses.courses.length, 9);
assert.equal(courses.courses.filter((c) => c.status === "published").length, 2);

const lessonResponse = await call("/api/courses/level-1/lessons/l1-01");
assert.equal(lessonResponse.status, 200);
const lessonPayload = await lessonResponse.json();
const raw = JSON.stringify(lessonPayload);
assert.equal(raw.includes('"answer"'), false);
assert.equal(raw.includes('"tolerance"'), false);

const firstCourse = await (await call("/api/courses/level-1")).json();
const firstLessonId = firstCourse.lessons[0].id;
const gradeUrl = `/api/courses/level-1/lessons/${firstLessonId}/submissions`;
const gradeResult = await (
  await call(gradeUrl, {
    method: "POST",
    body: JSON.stringify({ exercise_answers: {}, quiz_answers: {} }),
  })
).json();
assert.equal(gradeResult.quiz_score, 0);

const progress = await (await call("/api/progress")).json();
assert.equal(progress.experiments.status, "planned");

const lessonData = COURSE_DATA.lessons["level-1"]["l1-01"];
const rightAnswers = Object.fromEntries(
  lessonData.quiz.map((question) => [question.id, question.answer]),
);
const passed = await (
  await call(gradeUrl, {
    method: "POST",
    body: JSON.stringify({ exercise_answers: {}, quiz_answers: rightAnswers }),
  })
).json();
assert.equal(passed.passed, true);
assert.equal(passed.quiz_score, 100);

const progressAfter = await (await call("/api/progress")).json();
assert.equal(progressAfter.course_completion.completed_lessons, 1);
assert.equal(progressAfter.mastered_concepts.length, lessonData.concepts.length);
console.log("worker smoke ok", { courses: courses.courses.length, lesson: lessonPayload.lesson.id });
