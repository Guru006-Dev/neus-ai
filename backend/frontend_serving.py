"""Serve the built NEXUS frontend (frontend/dist) from FastAPI: landing at /, dashboard at /dashboard/*."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


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
        if f.is_file() and f.name != "index.html":
            app.add_api_route(f"/{f.name}", (lambda p=f: FileResponse(p)), methods=["GET"], include_in_schema=False)
    return True
