"""FastAPI application entry point."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from quantlab import __version__
from quantlab.config import PROJECT_ROOT
from quantlab.api.routes import router


def create_app() -> FastAPI:
    application = FastAPI(
        title="Quant Lab API",
        version=__version__,
        description="课程与学习进度 API；量化计算模块按里程碑逐步加入。",
    )
    application.include_router(router)
    frontend_dir = PROJECT_ROOT / "frontend"
    if frontend_dir.exists():
        application.mount(
            "/",
            StaticFiles(directory=frontend_dir, html=True),
            name="frontend",
        )
    return application


app = create_app()
