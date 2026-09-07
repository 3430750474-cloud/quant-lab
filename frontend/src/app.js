import { renderHome } from "./views/home.js";
import { renderCourses } from "./views/courses.js";
import { renderCourseDetail } from "./views/course-detail.js";
import { renderLesson } from "./views/lesson.js";
import { renderProgress } from "./views/progress.js";
import { renderRoadmap } from "./views/roadmap.js";

const container = document.getElementById("app");

function activeNav(path) {
  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === path);
  });
}

async function route() {
  const hash = window.location.hash || "#/";
  const parts = hash
    .slice(2)
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch (_) {
        return part;
      }
    });
  container.innerHTML = `<div class="empty-state">加载中…</div>`;
  try {
    if (parts.length === 0) {
      activeNav("#/");
      await renderHome(container);
      return;
    }
    if (parts[0] === "courses") {
      activeNav("#/courses");
      if (parts.length === 1) {
        await renderCourses(container);
        return;
      }
      if (parts.length === 2) {
        await renderCourseDetail(container, parts[1]);
        return;
      }
      if (parts.length === 4 && parts[2] === "lessons") {
        await renderLesson(container, parts[1], parts[3]);
        return;
      }
    }
    if (parts[0] === "progress") {
      activeNav("#/progress");
      await renderProgress(container);
      return;
    }
    if (parts[0] === "roadmap") {
      activeNav("#/roadmap");
      await renderRoadmap(container);
      return;
    }
    container.innerHTML = `<div class="empty-state">页面不存在</div>`;
  } catch (error) {
    container.innerHTML = `<div class="empty-state">加载失败：${error.message}</div>`;
  }
}

window.addEventListener("hashchange", route);
route();
