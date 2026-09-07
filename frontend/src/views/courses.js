import { api } from "../api.js";
import { escapeHtml, progressBar, statusChip } from "../helpers.js";

export async function renderCourses(container) {
  const data = await api("/api/courses");
  const html = `
    <div class="lesson-head">
      <h1 style="margin-top:0">量化课程</h1>
      <p style="color:var(--muted)">九级学习路径；Level 1-2 已发布正式课程，其余级别进入课程框架阶段。</p>
    </div>
    <div class="level-list">
      ${(data.courses || [])
        .map((course) => {
          const href =
            course.status === "published"
              ? `href="#/courses/${encodeURIComponent(course.id)}"`
              : "";
          return `
            <a class="level-card" ${href}>
              <div>
                <h2>${escapeHtml(course.title)}</h2>
                <p>${escapeHtml(course.description)}</p>
                ${course.prerequisites.length ? `<p style="font-size:13px">先修：${escapeHtml(course.prerequisites.join("、"))}</p>` : ""}
              </div>
              ${statusChip(course.status)}
              ${
                course.status === "published"
                  ? progressBar(course.progress_percent)
                  : `<div style="grid-column:1/-1;font-size:13px;color:var(--muted)">规划主题：${escapeHtml(
                      course.planned_topics?.join("、") || "",
                    )}</div>`
              }
            </a>
          `;
        })
        .join("")}
    </div>
  `;
  container.innerHTML = html;
}
