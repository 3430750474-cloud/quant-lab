import { COURSE_DATA } from "./course-data.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const KV_KEY = "quantlab-progress-v1";
const PASS_THRESHOLD = 60;
const memoryProgress = { lessons: {}, mastered: [] };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign(
      {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
      CORS,
    ),
  });
}

function notFound() {
  return json({ detail: "课程或课程内容不存在" }, 404);
}

function metaList() {
  return Object.values(COURSE_DATA.meta).sort((a, b) => a.level - b.level);
}

function getMeta(courseId) {
  return COURSE_DATA.meta[courseId] || null;
}

function getLesson(courseId, lessonId) {
  const lesson = (COURSE_DATA.lessons[courseId] || {})[lessonId] || null;
  if (!lesson || lesson.status === "planned") return null;
  return lesson;
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

function cloneProgress(source) {
  return structuredClone(source);
}

async function loadProgress(env) {
  if (env && env.QUANTLAB_KV) {
    try {
      const raw = await env.QUANTLAB_KV.get(KV_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {
      // fall through to memory copy
    }
  }
  return cloneProgress(memoryProgress);
}

async function saveProgress(env, progress) {
  const snapshot = cloneProgress(progress);
  Object.assign(memoryProgress, snapshot);
  if (env && env.QUANTLAB_KV) {
    await env.QUANTLAB_KV.put(KV_KEY, JSON.stringify(snapshot));
  }
  return snapshot;
}

function nowIso() {
  return new Date().toISOString().slice(0, 19) + "Z";
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

function gradeSubmission(lesson, exerciseAnswers, quizAnswers) {
  const exercise = gradeQuestions(lesson.interactive_exercises || [], exerciseAnswers);
  const quiz = gradeQuestions(lesson.quiz || [], quizAnswers);
  const passed = quiz.score === null ? null : quiz.score >= PASS_THRESHOLD;
  return {
    exercise_results: exercise.results,
    exercise_score: exercise.score,
    quiz_results: quiz.results,
    quiz_score: quiz.score,
    passed,
  };
}

function recordAttempt(progress, lesson, quizScore, passed) {
  const now = nowIso();
  const previous = progress.lessons[lesson.id] || {
    status: "attempted",
    best_score: 0,
    attempts: 0,
    first_passed_at: null,
  };
  const best = Math.max(previous.best_score || 0, quizScore);
  const next = {
    lesson_id: lesson.id,
    course_id: lesson.course_id,
    status: passed || previous.status === "passed" ? "passed" : "attempted",
    best_score: best,
    attempts: (previous.attempts || 0) + 1,
    first_passed_at: passed && !previous.first_passed_at ? now : previous.first_passed_at || null,
    last_attempt_at: now,
  };
  progress.lessons[lesson.id] = next;
  if (passed) {
    for (const concept of lesson.concepts || []) {
      if (!progress.mastered.some((item) => item.concept === concept)) {
        progress.mastered.push({ concept, lesson_id: lesson.id, mastered_at: now });
      }
    }
  }
  return progress;
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

function lessonSummary(lesson, progress) {
  const row = progress.lessons[lesson.id] || {
    status: "not_started",
    best_score: 0,
  };
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
  const attemptedScores = Object.values(progress.lessons).filter((row) => row.attempts > 0);
  return {
    courses: rows,
    course_completion: {
      completed_lessons: rows.reduce((sum, row) => sum + row.completed_lessons, 0),
      total_lessons: rows.reduce((sum, row) => sum + row.lesson_count, 0),
      percent: 0,
    },
    quiz_average: attemptedScores.length
      ? Math.round((attemptedScores.reduce((sum, row) => sum + row.best_score, 0) / attemptedScores.length) * 10) / 10
      : null,
    mastered_concepts: progress.mastered.map((item) => item.concept),
    experiments: { status: "planned", completed: 0, total: 0 },
  };
}

async function handleGet(url, pathSegments, env) {
  if (url.pathname === "/api/health") {
    return json({ status: "ok", project: "quant-lab", milestone: "M1" });
  }
  if (url.pathname === "/api/courses") {
    const progress = await loadProgress(env);
    return json({
      courses: metaList().map((meta) => courseItem(meta, progress)),
    });
  }
  if (url.pathname === "/api/progress") {
    const progress = await loadProgress(env);
    const overview = progressOverview(progress);
    const completed = overview.course_completion.completed_lessons;
    const total = overview.course_completion.total_lessons;
    overview.course_completion.percent = total
      ? Math.round((completed / total) * 1000) / 10
      : 0;
    return json(overview);
  }
  if (pathSegments[0] === "courses" && pathSegments.length === 2) {
    const meta = getMeta(pathSegments[1]);
    if (!meta) return notFound();
    const progress = await loadProgress(env);
    const lessons = meta.status === "published"
      ? Object.values(COURSE_DATA.lessons[meta.id] || {})
          .sort((a, b) => a.order - b.order)
          .map((lesson) => lessonSummary(lesson, progress))
      : [];
    return json({ meta, lessons });
  }
  if (pathSegments[0] === "courses" && pathSegments.length === 4 && pathSegments[2] === "lessons") {
    const lesson = getLesson(pathSegments[1], pathSegments[3]);
    if (!lesson) return notFound();
    const progress = await loadProgress(env);
    return json({
      lesson: stripSecrets(lesson),
      progress: progress.lessons[lesson.id] || null,
    });
  }
  return json({ error: "not found" }, 404);
}

async function handlePost(url, pathSegments, request, env) {
  if (
    !(
      pathSegments[0] === "courses" &&
      pathSegments.length === 5 &&
      pathSegments[2] === "lessons" &&
      pathSegments[4] === "submissions"
    )
  ) {
    return json({ error: "not found" }, 404);
  }
  const lesson = getLesson(pathSegments[1], pathSegments[3]);
  if (!lesson) return notFound();
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    payload = {};
  }
  const grade = gradeSubmission(
    lesson,
    payload.exercise_answers || {},
    payload.quiz_answers || {},
  );
  const response = { ...grade, new_concepts: [] };
  if (grade.quiz_score !== null) {
    const progress = await loadProgress(env);
    recordAttempt(progress, lesson, grade.quiz_score, Boolean(grade.passed));
    await saveProgress(env, progress);
    if (grade.passed) {
      response.new_concepts = lesson.concepts || [];
    }
  }
  return json(response);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response("", { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean).slice(1);
    try {
      if (request.method === "GET") {
        return await handleGet(url, pathSegments, env);
      }
      if (request.method === "POST") {
        return await handlePost(url, pathSegments, request, env);
      }
      return json({ error: "method not allowed" }, 405);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  },
};
