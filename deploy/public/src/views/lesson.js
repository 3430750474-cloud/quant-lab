import { api } from "../api.js";
import { escapeHtml, formatPercent, statusChip } from "../helpers.js";

function renderQuestions(questions, kind) {
  return questions
    .map((question) => {
      const inputHtml =
        question.type === "choice"
          ? `<ul class="option-list">
              ${question.options
                .map(
                  (option, index) => `
                    <li>
                      <label>
                        <input type="radio" class="answer-option" name="${kind}-${escapeHtml(
                          question.id,
                        )}" data-value="${index}">
                        <span>${escapeHtml(option)}</span>
                      </label>
                    </li>
                  `,
                )
                .join("")}
            </ul>`
          : `<input class="numeric-input" data-qid="${escapeHtml(question.id)}" inputmode="decimal" placeholder="输入数值">`;
      return `
        <div class="question" data-kind="${kind}" data-qid="${escapeHtml(question.id)}" data-type="${question.type}">
          <div class="question-title">${escapeHtml(question.question)}</div>
          ${inputHtml}
          <div class="feedback-area"></div>
        </div>
      `;
    })
    .join("");
}

function collectAnswers(container, kind) {
  const answers = {};
  container
    .querySelectorAll(`.question[data-kind="${kind}"]`)
    .forEach((questionBox) => {
      const qid = questionBox.dataset.qid;
      const type = questionBox.dataset.type;
      if (type === "choice") {
        const selected = questionBox.querySelector(
          `input[type="radio"]:checked`,
        );
        answers[qid] = selected ? Number(selected.dataset.value) : null;
      } else {
        const input = questionBox.querySelector(".numeric-input");
        answers[qid] = input && input.value !== "" ? Number(input.value) : null;
      }
    });
  return answers;
}

function renderFeedback(container, kind, results) {
  const byId = new Map((results || []).map((item) => [item.question_id, item]));
  container
    .querySelectorAll(`.question[data-kind="${kind}"]`)
    .forEach((questionBox) => {
      const result = byId.get(questionBox.dataset.qid);
      const area = questionBox.querySelector(".feedback-area");
      if (!result) {
        area.innerHTML = "";
        return;
      }
      const submitted =
        result.submitted === null || result.submitted === undefined
          ? "未作答"
          : String(result.submitted);
      area.innerHTML = `
        <div class="feedback ${result.correct ? "correct" : "incorrect"}">
          ${result.correct ? "回答正确" : `回答：${escapeHtml(submitted)} · 不正确`}
        </div>
        <div class="feedback">${escapeHtml(result.explanation)}</div>
      `;
    });
}

export async function renderLesson(container, courseId, lessonId) {
  const data = await api(
    `/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
  );
  const lesson = data.lesson;
  const progress = data.progress || {};
  const html = `
    <div class="crumb">
      <a href="#/courses">量化课程</a> /
      <a href="#/courses/${encodeURIComponent(courseId)}">${escapeHtml(
        lesson.course_id === "level-1" ? "Level 1 · 股票基础" : "Level 2 · 量化基础",
      )}</a>
    </div>
    <section class="lesson-head">
      <div class="chips">
        ${statusChip(progress.status, progress.best_score)}
        <span class="chip chip-not-started">测验通过线 ${formatPercent(60)}</span>
      </div>
      <h1>${String(lesson.order).padStart(2, "0")} · ${escapeHtml(lesson.title)}</h1>
      <div class="risk-banner">学习内容不构成投资建议，历史表现不代表未来收益。</div>
    </section>

    <section class="lesson-section" id="simple">
      <h2>一句话解释</h2>
      <p>${escapeHtml(lesson.simple_explanation)}</p>
    </section>

    <section class="lesson-section" id="definition">
      <h2>专业定义</h2>
      <p>${escapeHtml(lesson.definition)}</p>
    </section>

    <section class="lesson-section" id="analogy">
      <h2>类比</h2>
      <p>${escapeHtml(lesson.analogy)}</p>
    </section>

    <section class="lesson-section" id="example">
      <h2>示例</h2>
      <p>${escapeHtml(lesson.example)}</p>
    </section>

    <section class="lesson-section" id="formula">
      <h2>公式</h2>
      ${lesson.formulas
        .map(
          (formula) => `
            <div class="formula-box">${escapeHtml(formula.display)}</div>
            ${
              formula.variables.length
                ? `<table class="variable-table">
                    <thead><tr><th style="width:25%">变量</th><th>含义</th><th style="width:18%">单位</th></tr></thead>
                    <tbody>
                      ${formula.variables
                        .map(
                          (variable) => `
                            <tr>
                              <td><strong>${escapeHtml(variable.symbol)}</strong></td>
                              <td>${escapeHtml(variable.meaning)}</td>
                              <td>${escapeHtml(variable.unit || "—")}</td>
                            </tr>
                          `,
                        )
                        .join("")}
                    </tbody>
                  </table>`
                : ""
            }
          `,
        )
        .join("")}
    </section>

    <section class="lesson-section" id="algorithm">
      <h2>算法步骤</h2>
      <ol class="algorithm-list">
        ${lesson.algorithm_steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
      </ol>
    </section>

    <section class="lesson-section" id="python">
      <h2>Python 示例</h2>
      <pre class="code-block">${escapeHtml(lesson.python_example.code)}</pre>
      <p>${escapeHtml(lesson.python_example.explanation)}</p>
      ${
        lesson.python_example.output
          ? `<p style="font-family:monospace;background:#eef3ef;padding:10px 12px;border-radius:6px">${escapeHtml(
              lesson.python_example.output,
            )}</p>`
          : ""
      }
    </section>

    <section class="lesson-section" id="exercise">
      <h2>互动练习</h2>
      <div class="question-list">${renderQuestions(lesson.interactive_exercises, "exercise")}</div>
      <div class="action-row">
        <button class="btn btn-primary" data-action="check-exercise">检查练习</button>
        <span class="result-area" data-area="exercise"></span>
      </div>
    </section>

    <section class="lesson-section" id="quiz">
      <h2>小测验</h2>
      <div class="question-list">${renderQuestions(lesson.quiz, "quiz")}</div>
      <div class="action-row">
        <button class="btn btn-primary" data-action="submit-quiz">提交小测验</button>
        <span class="result-area" data-area="quiz"></span>
      </div>
    </section>

    <section class="lesson-section" id="mistakes">
      <h2>常见错误</h2>
      <div>
        ${lesson.common_mistakes
          .map(
            (mistake) => `
              <div class="mistake-item">
                <strong>${escapeHtml(mistake.title)}</strong>
                <p style="margin:4px 0">${escapeHtml(mistake.why)}</p>
                <p style="margin:0">${escapeHtml(mistake.avoid)}</p>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>

    <section class="lesson-section" id="concepts">
      <h2>概念清单</h2>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${lesson.concepts
          .map((concept) => `<span class="chip chip-passed">${escapeHtml(concept)}</span>`)
          .join("")}
      </div>
    </section>
  `;
  container.innerHTML = html;

  container
    .querySelector('[data-action="check-exercise"]')
    .addEventListener("click", async () => {
      const button = container.querySelector('[data-action="check-exercise"]');
      button.disabled = true;
      try {
        const exerciseAnswers = collectAnswers(container, "exercise");
        const result = await api(
          `/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/submissions`,
          {
            method: "POST",
            body: JSON.stringify({
              exercise_answers: exerciseAnswers,
              quiz_answers: {},
            }),
          },
        );
        renderFeedback(container, "exercise", result.exercise_results);
        const area = container.querySelector('[data-area="exercise"]');
        area.innerHTML =
          result.exercise_score === null
            ? ""
            : `<span class="chip chip-percent">练习得分 ${formatPercent(result.exercise_score)}</span>`;
      } finally {
        button.disabled = false;
      }
    });

  container
    .querySelector('[data-action="submit-quiz"]')
    .addEventListener("click", async () => {
      const button = container.querySelector('[data-action="submit-quiz"]');
      button.disabled = true;
      try {
        const exerciseAnswers = collectAnswers(container, "exercise");
        const quizAnswers = collectAnswers(container, "quiz");
        const result = await api(
          `/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/submissions`,
          {
            method: "POST",
            body: JSON.stringify({
              exercise_answers: exerciseAnswers,
              quiz_answers: quizAnswers,
            }),
          },
        );
        renderFeedback(container, "quiz", result.quiz_results);
        renderFeedback(container, "exercise", result.exercise_results);
        const area = container.querySelector('[data-area="quiz"]');
        const passed = result.passed;
        const banner =
          passed === null
            ? ""
            : passed
              ? `<div class="result-banner pass">测验通过 · 概念已记录到学习进度</div>`
              : `<div class="result-banner fail">测验未通过 · 得分 ${formatPercent(
                  result.quiz_score,
                )}，可复习后重试</div>`;
        area.innerHTML =
          `<span class="chip chip-percent">测验得分 ${formatPercent(result.quiz_score)}</span>${banner}`;
      } finally {
        button.disabled = false;
      }
    });
}
