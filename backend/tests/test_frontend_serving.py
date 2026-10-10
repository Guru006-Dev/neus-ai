import os
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from frontend_serving import mount_frontend  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
REAL_DIST = REPO / "frontend" / "dist"


def make_dist(tmp_path: Path) -> Path:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><div id=root></div>", encoding="utf-8")
    (dist / "assets" / "app-123.js").write_text("console.log(1)", encoding="utf-8")
    (dist / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    return dist


def build_like_main(dist: Path) -> FastAPI:
    """Mimic main.py: mount first, then legacy handlers and API routes."""
    app = FastAPI()
    mounted = mount_frontend(app, dist)

    @app.get("/", response_class=HTMLResponse)
    def legacy_root():
        return "legacy-root"

    @app.get("/dashboard", response_class=HTMLResponse)
    def legacy_dashboard():
        return "legacy-dashboard"

    @app.get("/workflows/{wid}")
    def wf(wid: str):
        return {"workflow_id": wid}

    @app.get("/system/status")
    def status():
        return {"ok": True}

    app.state.mounted = mounted
    return app


def test_serves_spa_routes_assets_and_keeps_api(tmp_path):
    app = FastAPI()
    assert mount_frontend(app, make_dist(tmp_path)) is True

    @app.get("/workflows/{wid}")
    def wf(wid: str):
        return {"workflow_id": wid}

    c = TestClient(app)
    for path in ["/", "/dashboard", "/dashboard/runs/wf-1"]:
        r = c.get(path)
        assert r.status_code == 200 and 'id=root' in r.text, path
    assert c.get("/assets/app-123.js").text == "console.log(1)"
    assert c.get("/favicon.svg").status_code == 200
    assert c.get("/workflows/wf-1").json() == {"workflow_id": "wf-1"}
    assert c.get("/assets/missing.js").status_code == 404


def test_no_build_registers_nothing(tmp_path):
    app = FastAPI()
    assert mount_frontend(app, tmp_path / "nope") is False
    assert TestClient(app).get("/dashboard").status_code == 404


def test_spa_wins_over_legacy_handlers_and_api_untouched(tmp_path):
    app = build_like_main(make_dist(tmp_path))
    assert app.state.mounted is True
    c = TestClient(app)
    for path in ["/", "/dashboard", "/dashboard/runs/wf-x"]:
        r = c.get(path)
        assert 'id=root' in r.text and "legacy" not in r.text, path
    assert c.get("/workflows/x").json() == {"workflow_id": "x"}
    assert c.get("/system/status").json() == {"ok": True}


def test_legacy_handlers_respond_without_build(tmp_path):
    app = build_like_main(tmp_path / "nope")
    assert app.state.mounted is False
    c = TestClient(app)
    assert c.get("/").text == "legacy-root"
    assert c.get("/dashboard").text == "legacy-dashboard"


def test_path_traversal_never_leaves_dist(tmp_path):
    secret = tmp_path / "secret.txt"
    secret.write_text("TOP-SECRET", encoding="utf-8")
    app = FastAPI()
    mount_frontend(app, make_dist(tmp_path))
    c = TestClient(app)
    attempts = [
        "/dashboard/../secret.txt",
        "/dashboard/../../backend/main.py",
        "/dashboard/%2e%2e/%2e%2e/backend/main.py",
        "/dashboard/..%2f..%2fsecret.txt",
        "/assets/../secret.txt",
        "/assets/%2e%2e/secret.txt",
        "/assets/..%2fsecret.txt",
    ]
    for p in attempts:
        r = c.get(p)
        assert "TOP-SECRET" not in r.text, p
        assert "ADIP Orchestrator" not in r.text, p
        assert r.status_code == 404 or "id=root" in r.text, p


@pytest.mark.skipif(not (REAL_DIST / "index.html").is_file(), reason="frontend/dist/index.html not built")
def test_real_main_app_serves_build_and_keeps_api(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "integration.db"))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.syspath_prepend(str(REPO / "backend"))
    sys.modules.pop("main", None)
    import main  # noqa: PLC0415

    try:
        c = TestClient(main.app)
        built = (REAL_DIST / "index.html").read_text(encoding="utf-8")
        for path in ["/", "/dashboard", "/dashboard/runs/wf-x"]:
            r = c.get(path)
            assert r.status_code == 200 and r.text == built, path
        r = c.get("/system/status")
        assert r.status_code == 200 and isinstance(r.json(), dict)
        r = c.get("/workflows/wf-00000000")
        assert r.status_code == 404 and "detail" in r.json()
        r = c.post("/workflows", json={"goal": "g"})
        assert r.status_code == 200 and "workflow_id" in r.json()
    finally:
        stop = getattr(main.orchestrator, "stop", None)
        if callable(stop):
            stop()
