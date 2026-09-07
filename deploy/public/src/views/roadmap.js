import { escapeHtml } from "../helpers.js";

const roadmap = [
  {
    milestone: "M2 · 数据实验室",
    title: "数据实验室",
    body: "提供内置示例 A 股日线数据，支持日期/OHLC/成交额/涨跌幅/换手率筛选、排序、绘图，并计算收益率、均线、波动率与最大回撤。数据路径、计算公式与参数全部展示。",
  },
  {
    milestone: "M3 · 策略实验室",
    title: "策略实验室",
    body: "先实现双均线、动量与均值回归三类策略，按“策略思想 → 数学公式 → 算法 → 代码 → 回测结果”逐层展示。",
  },
  {
    milestone: "M4 · 回测中心",
    title: "回测中心",
    body: "支持初始资金、日期区间、股票池、手续费、滑点与策略参数；输出累计收益、年化收益、最大回撤、夏普、胜率、交易次数、换手率与资金曲线。",
  },
  {
    milestone: "M5 · AI 研究助手",
    title: "AI 研究助手",
    body: "基于课程、实验记录与策略假设提供研究辅助，不生成无法追溯结果的结论。",
  },
];

export async function renderRoadmap(container) {
  const html = `
    <div class="lesson-head">
      <h1 style="margin-top:0">路线图</h1>
      <p style="color:var(--muted)">M1 已交付课程体系与学习进度。以下模块会在各自里程碑中以真实功能开放，不提供占位表单。</p>
    </div>
    <div class="roadmap-list">
      ${roadmap
        .map(
          (item) => `
            <div class="roadmap-card">
              <span class="roadmap-label">${escapeHtml(item.milestone)}</span>
              <h2>${escapeHtml(item.title)}</h2>
              <p>${escapeHtml(item.body)}</p>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
  container.innerHTML = html;
}
