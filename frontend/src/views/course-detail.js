import { api } from "../api.js";
import { escapeHtml, formatPercent, statusChip } from "../helpers.js";

export async function renderCourseDetail(container, courseId) {
  const data = await api(`/api/courses/${encodeURIComponent(courseId)}`);
  const meta = data.meta;
  const lessons = data.lessons || [];
  const plannedTopics = meta.planned_topics || [];
  const html = `
    <div class="crumb"><a href="#/courses">量化课程</a> / ${escapeHtml(meta.title)}</div>
    <section class="lesson-head">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${statusChip(meta.status)}
        ${meta.prerequisites?.length ? `<span class="chip chip-not-started">先修：${escapeHtml(meta.prerequisites.join("、"))}</span>` : ""}
      </div>
      <h1>${escapeHtml(meta.title)}</h1>
      <p>${escapeHtml(meta.description)}</p>
    </section>
    ${
      meta.status === "planned"
        ? `
          <section>
            <h2 class="section-title">规划主题</h2>
            ${
              plannedTopics.length
                ? `<div class="level-list">${plannedTopics
                    .map(
                      (topic, index) => `
                        <div class="level-card">
                          <div>
                            <h2>${String(index + 1).padStart(2, "0")} · ${escapeHtml(topic)}</h2>
                            <p>该级别课程将在后续里程碑补充正式内容。</p>
                          </div>
                          ${statusChip("planned")}
                        </div>
                      `,
                    )
                    .join("")}</div>`
                : `<div class="empty-state">课程大纲整理中。</div>`
            }
          </section>
        `
        : `
          <section>
            <h2 class="section-title">课程内容</h2>
            <div class="level-list">
              ${lessons
                .map(
                  (lesson) => `
                    <a class="level-card" href="#/courses/${encodeURIComponent(meta.id)}/lessons/${encodeURIComponent(lesson.id)}">
                      <div>
                        <h2>${String(lesson.order).padStart(2, "0")} · ${escapeHtml(lesson.title)}</h2>
                        <p>${escapeHtml(lesson.concepts.join("、"))}</p>
                      </div>
                      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                        ${statusChip(lesson.status, lesson.best_score)}
                        <span class="chip chip-not-started">${lesson.quiz_count} 道测验</span>
                      </div>
                      <div style="grid-column:1/-1;font-size:13px;color:var(--muted)">
                        互动练习 ${lesson.exercise_count} 道 · 最好成绩 ${formatPercent(lesson.best_score)}
                      </div>
                    </a>
                  `,
                )
                .join("")}
            </div>
          </section>
        `
    }
  `;
  container.innerHTML = html;
}
