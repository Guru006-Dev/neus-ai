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


def asgi_get(app: FastAPI, raw_path: str, query: bytes = b"") -> tuple[int, bytes]:
    """Send a GET straight to the ASGI app with an UNNORMALISED path (httpx would normalise ../)."""
    import asyncio
    from urllib.parse import unquote

    async def run():
        sent = []
        scope = {
            "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "GET",
            "scheme": "http", "path": unquote(raw_path), "raw_path": raw_path.encode(),
            "query_string": query, "root_path": "", "headers": [(b"host", b"testserver")],
            "client": ("127.0.0.1", 1), "server": ("testserver", 80),
        }

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(msg):
            sent.append(msg)

        await app(scope, receive, send)
        status = next(m["status"] for m in sent if m["type"] == "http.response.start")
        body = b"".join(m.get("body", b"") for m in sent if m["type"] == "http.response.body")
        return status, body

    return asyncio.run(run())


def test_unnormalised_traversal_never_leaves_dist(tmp_path):
    (tmp_path / "secret.txt").write_text("TOP-SECRET", encoding="utf-8")
    app = FastAPI()
    mount_frontend(app, make_dist(tmp_path))
    for raw in [
        "/dashboard/../secret.txt", "/dashboard/../../secret.txt", "/dashboard/..%2fsecret.txt",
        "/dashboard/%2e%2e%2fsecret.txt", "/dashboard/%2e%2e/secret.txt", "/assets/../secret.txt",
        "/assets/..%2fsecret.txt", "/assets/%2e%2e%2fsecret.txt", "/assets/%2e%2e/secret.txt",
        "/assets/..%5c..%5csecret.txt", "/../secret.txt", "/%2e%2e/secret.txt",
    ]:
        status, body = asgi_get(app, raw)
        assert b"TOP-SECRET" not in body, raw
        assert status == 404 or b"id=root" in body, (raw, status)


def test_root_file_route_ignores_query_params(tmp_path):
    secret = tmp_path / "sentinel.txt"
    secret.write_text("SENTINEL-OUTSIDE", encoding="utf-8")
    dist = make_dist(tmp_path)
    (dist / "inside.txt").write_text("INSIDE", encoding="utf-8")
    app = FastAPI()
    mount_frontend(app, dist)
    c = TestClient(app)
    for q in [f"p={secret}", "p=../sentinel.txt", "p=index.html", "p=inside.txt", "path=" + str(secret)]:
        r = c.get("/favicon.svg?" + q)
        assert r.text == "<svg/>", q
        assert "SENTINEL-OUTSIDE" not in r.text, q


def test_reserved_root_file_names_do_not_shadow_api(tmp_path):
    dist = make_dist(tmp_path)
    for name in ["status", "workflows", "system", "api-key", "analyze", "check-veo", "dashboard"]:
        (dist / name).write_text("SHADOW", encoding="utf-8")
    app = build_like_main(dist)
    c = TestClient(app)
    assert c.get("/system/status").json() == {"ok": True}
    assert c.get("/workflows/x").json() == {"workflow_id": "x"}
    for name in ["status", "workflows", "system", "api-key", "analyze", "check-veo"]:
        assert "SHADOW" not in c.get("/" + name).text, name
    assert "SHADOW" not in c.get("/dashboard").text
    assert c.get("/favicon.svg").text == "<svg/>"


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
