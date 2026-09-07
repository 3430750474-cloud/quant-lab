"""FastAPI application entry point."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import Response
from starlette.responses import FileResponse
from starlette.staticfiles import StaticFiles

from quantlab import __version__
from quantlab.config import PROJECT_ROOT
from quantlab.api.routes import router


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except Exception:
            index_path = self.directory / "index.html"
            if index_path.exists():
                return FileResponse(index_path)
            raise


def create_app() -> FastAPI:
    application = FastAPI(
        title="Quant Lab API",
        version=__version__,
        description="课程与学习进度 API；量化计算模块按里程碑逐步加入。",
    )
    application.include_router(router)

    @application.get("/favicon.ico", include_in_schema=False)
    def favicon() -> Response:
        return Response(status_code=204)

    frontend_dir = PROJECT_ROOT / "frontend"
    if frontend_dir.exists():
        application.mount(
            "/",
            SPAStaticFiles(directory=frontend_dir, html=True),
            name="frontend",
        )
    return application


app = create_app()
