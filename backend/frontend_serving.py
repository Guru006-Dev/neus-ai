"""Serve the built NEXUS frontend (frontend/dist) from FastAPI: landing at /, dashboard at /dashboard/*."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


# Root-file names that must never be served from dist: they collide with API path segments.
RESERVED_NAMES = frozenset(
    {"workflows", "status", "system", "api-key", "analyze", "check-veo", "dashboard", "assets", "docs", "redoc", "openapi.json"}
)


def _file_route(path: Path):
    # Zero-argument handler: FastAPI must not expose the file path as a query parameter.
    def handler() -> FileResponse:
        return FileResponse(path)

    return handler


def mount_frontend(app: FastAPI, dist: Path) -> bool:
    index = dist / "index.html"
    if not index.is_file():
        return False
    assets = dist / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="frontend-assets")

    def spa() -> FileResponse:
        return FileResponse(index, media_type="text/html")

    for path in ("/", "/dashboard", "/dashboard/{path:path}"):
        app.add_api_route(path, spa, methods=["GET"], include_in_schema=False)
    for f in dist.iterdir():
        if f.is_file() and f.name != "index.html" and f.name.lower() not in RESERVED_NAMES:
            app.add_api_route(f"/{f.name}", _file_route(f), methods=["GET"], include_in_schema=False)
    return True
