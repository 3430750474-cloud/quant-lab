# Quant Lab 架构说明

## 目录职责

- `frontend/`：原生 HTML/CSS/JS 教学界面，通过 `/api` 获取内容与进度。
- `backend/quantlab/`：Python FastAPI 服务端。
  - `api/`：HTTP 路由。
  - `courses/`：课程加载、内容校验、题目判分。
  - `progress/`：SQLite 学习进度。
  - `data/ indicators/ strategies/ backtest/ analysis/`：M2-M5 逐步加入的数据、指标、策略、回测与分析层，M1 不实现。
- `data/courses/`：课程 JSON 内容源；`data/market/` 留给后续示例行情。
- `tests/`：内容、判分、API、SQLite 测试。
- `strategies/ backtests/ research/`：M3-M5 的策略登记、回测产物与研究记录目录。

## M1 接口

- `GET /api/health`
- `GET /api/courses`
- `GET /api/courses/{course_id}`
- `GET /api/courses/{course_id}/lessons/{lesson_id}`
- `POST /api/courses/{course_id}/lessons/{lesson_id}/submissions`
- `GET /api/progress`

题目答案与 tolerance 仅存在于内容源与后端，`GET` 课程内容接口会剔除答案键。

## 进度语义

- 测验满分 100，成绩 `>= 60` 视为通过。
- 通过后写入 `lesson_progress` 并解锁该课概念到 `mastered_concepts`。
- 已掌握概念不会因后续低分或重考被清除；重考只更新最好成绩。

## 防风险原则

M1 无行情回测功能；课程内容不包含任何“历史收益预示未来收益”的表述。首页与课程页统一保留风险提示，后续回测里程碑在此基础上增加数据来源、参数、成本与滑点说明。
