/* 纯静态模式：课程数据与判分在浏览器内完成，进度保存在 localStorage。 */

import { COURSE_DATA } from "./course-data.js";

const PROGRESS_KEY = "quantlab-static-progress-v1";
const PASS_THRESHOLD = 60;

function emptyProgress() {
  return { lessons: {}, mastered: [] };
}

function readProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {
    // fall through
  }
  return emptyProgress();
}

function writeProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function metaList() {
  return Object.values(COURSE_DATA.meta).sort((a, b) => a.level - b.level);
}

function getMeta(courseId) {
  return COURSE_DATA.meta[courseId] || null;
}

function getLesson(courseId, lessonId) {
  return (COURSE_DATA.lessons[courseId] || {})[lessonId] || null;
}

function stripSecrets(lesson) {
  const copy = structuredClone(lesson);
  for (const kind of ["interactive_exercises", "quiz"]) {
    copy[kind] = (copy[kind] || []).map((question) => {
      const clean = { ...question };
      delete clean.answer;
      delete clean.tolerance;
      return clean;
    });
  }
  return copy;
}

function courseItem(meta, progress) {
  if (meta.status !== "published") {
    return {
      id: meta.id,
      title: meta.title,
      short_title: meta.short_title || meta.title,
      level: meta.level,
      status: meta.status,
      description: meta.description,
      prerequisites: meta.prerequisites || [],
      planned_topics: meta.planned_topics || [],
      lesson_count: 0,
      completed_lessons: 0,
      progress_percent: 0,
    };
  }
  const lessons = COURSE_DATA.lessons[meta.id] || {};
  const ids = Object.keys(lessons).sort((a, b) => lessons[a].order - lessons[b].order);
  const completed = ids.filter((id) => {
    const row = progress.lessons[id];
    return row && row.status === "passed";
  }).length;
  return {
    id: meta.id,
    title: meta.title,
    short_title: meta.short_title || meta.title,
    level: meta.level,
    status: meta.status,
    description: meta.description,
    prerequisites: meta.prerequisites || [],
    planned_topics: meta.planned_topics || [],
    lesson_count: ids.length,
    completed_lessons: completed,
    progress_percent: ids.length ? Math.round((completed / ids.length) * 1000) / 10 : 0,
  };
}

function progressOverview(progress) {
  const metas = metaList();
  const rows = metas.map((meta) => {
    const item = courseItem(meta, progress);
    return {
      course_id: meta.id,
      title: meta.title,
      status: meta.status,
      lesson_count: item.lesson_count,
      completed_lessons: item.completed_lessons,
      progress_percent: item.progress_percent,
    };
  });
  const completed = rows.reduce((sum, row) => sum + row.completed_lessons, 0);
  const total = rows.reduce((sum, row) => sum + row.lesson_count, 0);
  const attemptedScores = Object.values(progress.lessons).filter((row) => row.attempts > 0);
  return {
    courses: rows,
    course_completion: {
      completed_lessons: completed,
      total_lessons: total,
      percent: total ? Math.round((completed / total) * 1000) / 10 : 0,
    },
    quiz_average: attemptedScores.length
      ? Math.round(
          (attemptedScores.reduce((sum, row) => sum + row.best_score, 0) / attemptedScores.length) *
            10,
        ) / 10
      : null,
    mastered_concepts: progress.mastered.map((item) => item.concept),
    experiments: { status: "planned", completed: 0, total: 0 },
  };
}

function gradeQuestions(questions, answers) {
  if (!questions || !questions.length) return { results: null, score: null };
  const results = questions.map((question) => {
    const submitted = answers ? answers[question.id] : undefined;
    let correct = false;
    if (question.type === "choice") {
      correct = submitted === question.answer;
    } else {
      const submittedNumber = Number(submitted);
      const answerNumber = Number(question.answer);
      correct =
        Number.isFinite(submittedNumber) &&
        Number.isFinite(answerNumber) &&
        Math.abs(submittedNumber - answerNumber) <= Number(question.tolerance || 0);
    }
    return {
      question_id: question.id,
      submitted: submitted === undefined ? null : submitted,
      correct,
      explanation: question.explanation,
    };
  });
  const score =
    Math.round((results.filter((item) => item.correct).length / results.length) * 1000) / 10;
  return { results, score };
}

function recordAttempt(progress, lesson, quizScore, passed) {
  const now = new Date().toISOString().slice(0, 19) + "Z";
  const previous = progress.lessons[lesson.id] || {
    status: "attempted",
    best_score: 0,
    attempts: 0,
    first_passed_at: null,
  };
  progress.lessons[lesson.id] = {
    lesson_id: lesson.id,
    course_id: lesson.course_id,
    status: passed || previous.status === "passed" ? "passed" : "attempted",
    best_score: Math.max(previous.best_score || 0, quizScore),
    attempts: (previous.attempts || 0) + 1,
    first_passed_at:
      passed && !previous.first_passed_at ? now : previous.first_passed_at || null,
    last_attempt_at: now,
  };
  if (passed) {
    for (const concept of lesson.concepts || []) {
      if (!progress.mastered.some((item) => item.concept === concept)) {
        progress.mastered.push({ concept, lesson_id: lesson.id, mastered_at: now });
      }
    }
  }
}

function lessonSummary(lesson, progress) {
  const row = progress.lessons[lesson.id] || { status: "not_started", best_score: 0 };
  return {
    id: lesson.id,
    title: lesson.title,
    order: lesson.order,
    concepts: lesson.concepts || [],
    quiz_count: (lesson.quiz || []).length,
    exercise_count: (lesson.interactive_exercises || []).length,
    status: row.status,
    best_score: row.best_score,
  };
}

async function handleGet(url, progress) {
  const pathSegments = url.pathname.split("/").filter(Boolean);
  if (url.pathname === "/api/health") {
    return { status: "ok", project: "quant-lab", milestone: "M1", mode: "static" };
  }
  if (url.pathname === "/api/courses") {
    return { courses: metaList().map((meta) => courseItem(meta, progress)) };
  }
  if (url.pathname === "/api/progress") {
    return progressOverview(progress);
  }
  if (pathSegments[0] === "api" && pathSegments[1] === "courses" && pathSegments.length === 3) {
    const meta = getMeta(pathSegments[2]);
    if (!meta) throw new Error("课程不存在");
    const lessons =
      meta.status === "published"
        ? Object.values(COURSE_DATA.lessons[meta.id] || {})
            .sort((a, b) => a.order - b.order)
            .map((lesson) => lessonSummary(lesson, progress))
        : [];
    return { meta, lessons };
  }
  if (
    pathSegments[0] === "api" &&
    pathSegments[1] === "courses" &&
    pathSegments[3] === "lessons" &&
    pathSegments.length === 5
  ) {
    const lesson = getLesson(pathSegments[2], pathSegments[4]);
    if (!lesson) throw new Error("课程或课程内容不存在");
    return {
      lesson: stripSecrets(lesson),
      progress: progress.lessons[lesson.id] || null,
    };
  }
  throw new Error("接口不存在");
}

async function handlePost(url, options, progress) {
  const pathSegments = url.pathname.split("/").filter(Boolean);
  if (
    !(
      pathSegments[0] === "api" &&
      pathSegments[1] === "courses" &&
      pathSegments[3] === "lessons" &&
      pathSegments[5] === "submissions"
    )
  ) {
    throw new Error("接口不存在");
  }
  const lesson = getLesson(pathSegments[2], pathSegments[4]);
  if (!lesson) throw new Error("课程或课程内容不存在");
  const payload = JSON.parse(options.body || "{}");
  const exercise = gradeQuestions(lesson.interactive_exercises || [], payload.exercise_answers || {});
  const quiz = gradeQuestions(lesson.quiz || [], payload.quiz_answers || {});
  const passed = quiz.score === null ? null : quiz.score >= PASS_THRESHOLD;
  const result = {
    exercise_results: exercise.results,
    exercise_score: exercise.score,
    quiz_results: quiz.results,
    quiz_score: quiz.score,
    passed,
    new_concepts: [],
  };
  if (quiz.score !== null) {
    recordAttempt(progress, lesson, quiz.score, Boolean(passed));
    writeProgress(progress);
    if (passed) result.new_concepts = lesson.concepts || [];
  }
  return result;
}

export async function staticApi(path, options = {}) {
  const url = new URL(path, window.location.href);
  const progress = readProgress();
  const isPost = (options.method || "GET").toUpperCase() === "POST";
  return isPost ? handlePost(url, options, progress) : handleGet(url, progress);
}
