import { api } from "../api.js";
import { escapeHtml, formatPercent, progressBar, statusChip } from "../helpers.js";

export async function renderProgress(container) {
  const data = await api("/api/progress");
  const completion = data.course_completion || {};
  const mastered = data.mastered_concepts || [];
  const quizAverage = data.quiz_average;
  const html = `
    <div class="lesson-head">
      <h1 style="margin-top:0">学习进度</h1>
    </div>
    <section class="progress-grid">
      <div class="progress-stat">
        <span>课程完成度</span>
        <strong>${formatPercent(completion.percent)}</strong>
        <span>${completion.completed_lessons ?? 0} / ${completion.total_lessons ?? 0} 节课</span>
      </div>
      <div class="progress-stat">
        <span>测验平均分</span>
        <strong>${quizAverage === null ? "—" : formatPercent(quizAverage)}</strong>
        <span>按已提交课程的最好成绩计算</span>
      </div>
      <div class="progress-stat">
        <span>已掌握概念</span>
        <strong>${mastered.length}</strong>
        <span>通过对应课程测验后记录</span>
      </div>
    </section>
    <section style="margin-bottom:26px">
      <h2 class="section-title">各课程进度</h2>
      <div class="level-list">
        ${(data.courses || [])
          .map(
            (course) => `
              <div class="level-card">
                <div>
                  <h2>${escapeHtml(course.title)}</h2>
                  <p>${course.completed_lessons}/${course.lesson_count} 节完成</p>
                </div>
                ${statusChip(course.status)}
                ${progressBar(course.progress_percent)}
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
    <section>
      <h2 class="section-title">已掌握概念</h2>
      ${
        mastered.length
          ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${mastered
              .map((concept) => `<span class="chip chip-passed">${escapeHtml(concept)}</span>`)
              .join("")}</div>`
          : `<div class="empty-state">完成并通过第一节测验后，概念会出现在这里。</div>`
      }
    </section>
  `;
  container.innerHTML = html;
}
