"""Build deploy/worker/course-data.js from data/courses JSON files."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "data" / "courses"
OUTPUT = ROOT / "deploy" / "worker" / "course-data.js"

meta_by_id = {}
lessons_by_course = {}

for course_dir in sorted(CONTENT_DIR.iterdir(), key=lambda p: p.name):
    course_file = course_dir / "course.json"
    if not course_file.exists():
        continue
    meta = json.loads(course_file.read_text(encoding="utf-8"))
    meta_by_id[meta["id"]] = meta
    if meta["status"] != "published":
        continue
    lesson_dir = course_dir / "lessons"
    lessons = {}
    for lesson_file in sorted(lesson_dir.glob("*.json")):
        lesson = json.loads(lesson_file.read_text(encoding="utf-8"))
        lessons[lesson["id"]] = lesson
    lessons_by_course[meta["id"]] = lessons

data = {"meta": meta_by_id, "lessons": lessons_by_course}
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
OUTPUT.write_text(
    "// 自动生成：python deploy/build_worker_data.py\n"
    "export const COURSE_DATA = "
    + payload
    + ";\n",
    encoding="utf-8",
)
print(f"wrote {OUTPUT} ({len(payload)} bytes)")
