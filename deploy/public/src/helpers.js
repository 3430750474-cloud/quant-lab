export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatPercent(value) {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${Number(value).toFixed(1)}%`;
}

export function statusChip(status, score = null) {
  if (status === "passed") {
    return `<span class="chip chip-passed">已通过</span>`;
  }
  if (status === "attempted") {
    return `<span class="chip chip-attempted">已作答 · ${formatPercent(score)}</span>`;
  }
  if (status === "published") {
    return `<span class="chip chip-published">已发布</span>`;
  }
  if (status === "planned") {
    return `<span class="chip chip-planned">规划中</span>`;
  }
  return `<span class="chip chip-not-started">未开始</span>`;
}

export function progressBar(percent) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  return `
    <div class="progress-line">
      <span class="progress-track"><span class="progress-fill" style="width:${safe}%"></span></span>
      <span class="chip chip-percent">${formatPercent(safe)}</span>
    </div>
  `;
}
