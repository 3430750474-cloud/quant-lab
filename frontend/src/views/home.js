import { api } from "../api.js";
import { escapeHtml, formatPercent, progressBar } from "../helpers.js";

const modules = [
  {
    code: "01",
    title: "量化课程",
    route: "#/courses",
    kind: "ready",
    detail: "Level 1-2 完整教学，从股票基础进入量化基础。",
  },
  {
    code: "02",
    title: "数据实验室",
    route: "#/roadmap",
    kind: "soon",
    detail: "M2：行情数据、筛选、排序与绘图。",
  },
  {
    code: "03",
    title: "策略实验室",
    route: "#/roadmap",
    kind: "soon",
    detail: "M3：双均线、动量与均值回归策略。",
  },
  {
    code: "04",
    title: "回测中心",
    route: "#/roadmap",
    kind: "soon",
    detail: "M4：成本、滑点与可追溯回测结果。",
  },
  {
    code: "05",
    title: "AI 研究助手",
    route: "#/roadmap",
    kind: "soon",
    detail: "M5：课程与研究记录驱动的实验助手。",
  },
  {
    code: "06",
    title: "学习进度",
    route: "#/progress",
    kind: "ready",
    detail: "课程完成度、测验成绩与已掌握概念。",
  },
];

export async function renderHome(container) {
  const [courseData, progressData] = await Promise.all([
    api("/api/courses"),
    api("/api/progress"),
  ]);
  const completion = progressData.course_completion || {};
  const published = (courseData.courses || []).filter(
    (course) => course.status === "published",
  );
  const masteredCount = (progressData.mastered_concepts || []).length;
  const html = `
    <section class="home-head">
      <div class="home-eyebrow">QUANT LAB</div>
      <h1>从零学习量化交易</h1>
      <p>课程、公式、代码与测验围绕同一个目标：把每一个投资观点转成可计算、可验证、可解释的量化流程。</p>
      <div class="progress-line" style="margin-top:16px;max-width:520px">
        <span class="progress-track"><span class="progress-fill" style="width:${completion.percent ?? 0}%"></span></span>
        <span class="chip chip-percent">${formatPercent(completion.percent)}</span>
      </div>
      <div style="color:var(--muted);font-size:14px;margin-top:8px">
        ${published.length} 门已发布课程 · ${completion.completed_lessons ?? 0}/${completion.total_lessons ?? 0} 节完成 · ${masteredCount} 个概念已掌握
      </div>
    </section>
    <section>
      <h2 class="section-title">平台模块</h2>
      <div class="module-grid">
        ${modules
          .map(
            (mod) => `
              <a class="module-card ${mod.kind === "soon" ? "soon" : "ready"}" href="${mod.route}">
                <span class="module-number">${mod.code}${mod.kind === "soon" ? " · 后续开放" : ""}</span>
                <h2>${escapeHtml(mod.title)}</h2>
                <p>${escapeHtml(mod.detail)}</p>
                <span class="module-meta">${mod.kind === "soon" ? "进入路线图查看规划" : "进入模块"}</span>
              </a>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
  container.innerHTML = html;
}
